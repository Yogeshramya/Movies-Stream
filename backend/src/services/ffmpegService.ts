import path from 'path';
import fs from 'fs';
import { ffmpeg } from '../config/ffmpeg';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { Movie, IAudioTrack, ISubtitle } from '../models/Movie';
import { storageProvider, GoogleDriveStorageProvider } from '../storage';
import { emitEvent } from '../sockets/socketHandler';

export interface MediaProbeResult {
  duration: number;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  container: string;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  audioTracks: IAudioTrack[];
  subtitles: ISubtitle[];
  isDirectPlayable: boolean;
  mimeType: string;
}

export class FFmpegService {
  /**
   * Inspect a media file using FFprobe.
   */
  static async probeMedia(filePath: string): Promise<MediaProbeResult> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error(`ffprobe error on ${filePath}:`, err.message);
          reject(err);
          return;
        }

        const format = metadata.format || {};
        const streams = metadata.streams || [];

        const videoStream = streams.find((stream) => stream.codec_type === 'video');
        const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
        const subtitleStreams = streams.filter((stream) => stream.codec_type === 'subtitle');

        if (!videoStream) {
          reject(new Error('No video stream found in uploaded file'));
          return;
        }

        const duration = parseFloat(String(format.duration || videoStream.duration || 0));
        const width = Number(videoStream.width || 0);
        const height = Number(videoStream.height || 0);

        const container =
          String(format.format_name || '')
            .split(',')
            .map((val) => val.trim().toLowerCase())[0] || 'unknown';

        const videoCodec = String(videoStream.codec_name || 'unknown').toLowerCase();
        const audioCodec = String(audioStreams[0]?.codec_name || 'none').toLowerCase();
        const bitrate = parseInt(String(format.bit_rate || videoStream.bit_rate || 0), 10) || 0;

        let fps = 0;
        if (videoStream.r_frame_rate) {
          const parts = String(videoStream.r_frame_rate).split('/');
          if (parts.length === 2 && Number(parts[1]) > 0) {
            fps = Number(parts[0]) / Number(parts[1]);
          } else {
            fps = Number(videoStream.r_frame_rate) || 0;
          }
        }

        let resolution = 'Unknown';
        if (height >= 2100 || width >= 3800) {
          resolution = '4K UHD';
        } else if (height >= 1400 || width >= 2500) {
          resolution = '2K QHD';
        } else if (height >= 1000 || width >= 1900) {
          resolution = '1080p FHD';
        } else if (height >= 700 || width >= 1200) {
          resolution = '720p HD';
        } else if (height >= 450) {
          resolution = '480p SD';
        } else if (height > 0) {
          resolution = `${height}p`;
        }

        const audioTracks: IAudioTrack[] = audioStreams.map((stream, index) => ({
          index: typeof stream.index === 'number' ? stream.index : index,
          language: stream.tags?.language || 'und',
          title: stream.tags?.title || stream.tags?.handler_name || `Audio Track ${index + 1}`,
          codec: stream.codec_name || 'unknown',
          channels: stream.channels || 2,
        }));

        const subtitles: ISubtitle[] = subtitleStreams.map((stream, index) => ({
          language: stream.tags?.language || 'und',
          label: stream.tags?.title || `Subtitle ${index + 1}`,
          filePath: null,
          driveFileId: null,
          format: stream.codec_name || 'unknown',
          embedded: true,
          streamIndex: typeof stream.index === 'number' ? stream.index : null,
        }));

        const compatibleContainer = container === 'mp4' || container === 'mov';
        const compatibleVideo = videoCodec === 'h264' || videoCodec === 'avc1';
        const compatibleAudio = audioStreams.length === 0 || audioCodec === 'aac';

        const isDirectPlayable = compatibleContainer && compatibleVideo && compatibleAudio;
        const mimeType = compatibleContainer ? 'video/mp4' : 'application/octet-stream';

        logger.ffmpeg(
          `Probed ${path.basename(filePath)}: ${container} / ${videoCodec} / ${audioCodec} / ${resolution} / direct=${isDirectPlayable}`
        );

        resolve({
          duration,
          width,
          height,
          resolution,
          fps,
          container,
          videoCodec,
          audioCodec,
          bitrate,
          audioTracks,
          subtitles,
          isDirectPlayable,
          mimeType,
        });
      });
    });
  }

  /**
   * Transcode unsupported source to browser-compatible MP4 (H.264 + AAC).
   * Uses ultrafast stream-copy when possible or multi-threaded ultrafast encoding.
   */
  static async transcodeToMp4(
    inputPath: string,
    outputPath: string,
    probeInfo?: { videoCodec?: string; audioCodec?: string; width?: number; height?: number },
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const isVideoH264 =
        probeInfo?.videoCodec === 'h264' || probeInfo?.videoCodec === 'avc1';

      const cmd = ffmpeg(inputPath);

      if (isVideoH264) {
        // STREAM COPY VIDEO — 15 to 30 SECONDS TOTAL!
        logger.ffmpeg(`[FAST-REMUX] Video is already H.264/AVC. Copying video stream without re-encoding...`);
        cmd.outputOptions([
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-ac', '2',
          '-movflags', '+faststart',
          '-max_muxing_queue_size', '4096',
        ]);
      } else {
        // ULTRAFAST TRANSCODE — 2 to 3 MINUTES
        logger.ffmpeg(`[ULTRAFAST-TRANSCODE] Re-encoding video with ultrafast preset and multi-threading...`);
        const outputOpts = [
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'fastdecode',
          '-threads', '0',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-ac', '2',
          '-max_muxing_queue_size', '4096',
        ];

        // If resolution is larger than 1080p (e.g. 4K), downscale to 1080p using fast bilinear filter
        if (probeInfo?.height && probeInfo.height > 1080) {
          outputOpts.push('-vf', "scale='min(1920,iw)':'-2':flags=fast_bilinear");
        }

        cmd.outputOptions(outputOpts);
      }

      cmd
        .format('mp4')
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.ffmpeg(`FFmpeg transcode command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const percent =
            typeof progress.percent === 'number' ? Math.max(0, Math.min(100, progress.percent)) : 0;
          if (onProgress) {
            onProgress(percent);
          }
        })
        .on('end', () => {
          logger.ffmpeg(`Transcode completed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error(`FFmpeg transcode failed for ${inputPath}:`, error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate video thumbnail.
   */
  static async generateThumbnail(
    filePath: string,
    duration: number,
    outputDestinationPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputFolder = path.dirname(outputDestinationPath);
      const filename = path.basename(outputDestinationPath);

      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      let seekSeconds = 10;
      if (duration > 60) {
        seekSeconds = Math.min(Math.floor(duration * 0.15), 300);
      } else if (duration > 0) {
        seekSeconds = Math.max(1, Math.floor(duration / 2));
      }

      logger.ffmpeg(`Generating thumbnail for ${path.basename(filePath)} at ${seekSeconds}s...`);

      ffmpeg(filePath)
        .screenshots({
          timestamps: [seekSeconds],
          filename,
          folder: outputFolder,
          size: '640x360',
        })
        .on('end', () => resolve(outputDestinationPath))
        .on('error', (err) => {
          logger.warn(`Thumbnail failed at ${seekSeconds}s, trying 1s:`, err.message);
          ffmpeg(filePath)
            .screenshots({
              timestamps: [1],
              filename,
              folder: outputFolder,
              size: '640x360',
            })
            .on('end', () => resolve(outputDestinationPath))
            .on('error', (fallbackErr) => reject(fallbackErr));
        });
    });
  }

  /**
   * Extract embedded subtitles from source media to WebVTT files.
   */
  static async extractEmbeddedSubtitles(
    inputPath: string,
    movieId: string,
    subtitles: ISubtitle[],
    tempSubtitlesDir: string
  ): Promise<ISubtitle[]> {
    if (!fs.existsSync(tempSubtitlesDir)) {
      fs.mkdirSync(tempSubtitlesDir, { recursive: true });
    }

    const updatedSubtitles: ISubtitle[] = [];

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      if (typeof sub.streamIndex !== 'number') {
        updatedSubtitles.push(sub);
        continue;
      }

      const vttFilename = `sub-${movieId}-${sub.language || 'und'}-${i}.vtt`;
      const tempVttPath = path.join(tempSubtitlesDir, vttFilename);

      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions([`-map 0:${sub.streamIndex}`, '-f webvtt'])
            .output(tempVttPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
        });

        if (fs.existsSync(tempVttPath) && fs.statSync(tempVttPath).size > 0) {
          logger.ffmpeg(`Extracted subtitle [${sub.language}] track ${i} for movie ${movieId}`);

          // Upload to storage provider
          const uploadRes = await storageProvider.uploadFile(tempVttPath, vttFilename, {
            folderCategory: 'subtitles',
            movieId,
            mimeType: 'text/vtt; charset=utf-8',
          });

          updatedSubtitles.push({
            ...sub,
            filePath: storageProvider.providerName === 'local' ? uploadRes.storageKey : null,
            driveFileId: uploadRes.driveFileId || null,
            storageKey: uploadRes.storageKey,
            embedded: false,
            format: 'vtt',
          });
        } else {
          updatedSubtitles.push(sub);
        }
      } catch (err: any) {
        logger.warn(`Could not extract subtitle stream ${sub.streamIndex} for ${movieId}:`, err.message);
        updatedSubtitles.push(sub);
      }
    }

    return updatedSubtitles;
  }

  /**
   * Optimized HLS generation without re-encoding video.
   */
  static async generateHls(
    playbackPath: string,
    originalPath: string,
    movieId: string,
    audioTracks: IAudioTrack[],
    tempHlsDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (fs.existsSync(tempHlsDir)) {
      fs.rmSync(tempHlsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempHlsDir, { recursive: true });

    const videoPlaylist = path.join(tempHlsDir, 'video.m3u8');

    // 1. Video HLS (-c:v copy)
    await new Promise<void>((resolve, reject) => {
      logger.ffmpeg(`Creating HLS video stream with -c:v copy for movie ${movieId}`);

      ffmpeg(playbackPath)
        .outputOptions([
          '-map', '0:v:0',
          '-c:v', 'copy',
          '-an',
          '-f', 'hls',
          '-hls_time', '6',
          '-hls_playlist_type', 'vod',
          '-hls_flags', 'independent_segments',
          '-hls_segment_type', 'mpegts',
          '-hls_segment_filename', path.join(tempHlsDir, 'video-%05d.ts'),
        ])
        .output(videoPlaylist)
        .on('progress', (progress) => {
          if (typeof progress.percent === 'number') {
            onProgress?.(Math.min(50, Math.max(0, progress.percent * 0.5)));
          }
        })
        .on('end', () => {
          if (!fs.existsSync(videoPlaylist)) {
            reject(new Error('HLS video playlist was not created'));
            return;
          }
          resolve();
        })
        .on('error', (error) => {
          logger.error('HLS video generation failed:', error.message);
          reject(error);
        })
        .run();
    });

    // 2. Audio HLS (AAC tracks from original source)
    const audioPlaylists: Array<{ playlist: string; track: IAudioTrack; index: number }> = [];

    for (let index = 0; index < audioTracks.length; index++) {
      const track = audioTracks[index];
      const playlistFilename = `audio-${index}.m3u8`;
      const playlistPath = path.join(tempHlsDir, playlistFilename);

      logger.ffmpeg(`Creating HLS audio track ${index + 1}/${audioTracks.length}: ${track.title}`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(originalPath)
          .outputOptions([
            '-map', `0:a:${index}`,
            '-vn',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ac', '2',
            '-ar', '48000',
            '-f', 'hls',
            '-hls_time', '6',
            '-hls_playlist_type', 'vod',
            '-hls_flags', 'independent_segments',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', path.join(tempHlsDir, `audio-${index}-%05d.ts`),
          ])
          .output(playlistPath)
          .on('progress', (progress) => {
            if (typeof progress.percent === 'number') {
              const base = 50 + (index / Math.max(audioTracks.length, 1)) * 45;
              const range = 45 / Math.max(audioTracks.length, 1);
              onProgress?.(Math.min(95, base + (progress.percent / 100) * range));
            }
          })
          .on('end', () => {
            if (!fs.existsSync(playlistPath)) {
              reject(new Error(`Audio playlist was not created: ${playlistFilename}`));
              return;
            }
            resolve();
          })
          .on('error', (error) => {
            logger.error(`HLS audio ${index} failed:`, error.message);
            reject(error);
          })
          .run();
      });

      audioPlaylists.push({ playlist: playlistFilename, track, index });
    }

    // 3. Create Master Playlist
    const masterPath = path.join(tempHlsDir, 'master.m3u8');
    const masterLines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3', ''];

    audioPlaylists.forEach(({ playlist, track, index }) => {
      const language =
        String(track.language || 'und').replace(/[^a-zA-Z0-9-]/g, '') || 'und';
      const name = String(track.title || `Audio ${index + 1}`).replace(/"/g, '');
      const isDefault = index === 0 ? 'YES' : 'NO';

      masterLines.push(
        `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${name}",LANGUAGE="${language}",DEFAULT=${isDefault},AUTOSELECT=${isDefault},URI="${playlist}"`
      );
    });

    masterLines.push('');
    if (audioPlaylists.length > 0) {
      masterLines.push(
        '#EXT-X-STREAM-INF:BANDWIDTH=8000000,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"'
      );
    } else {
      masterLines.push('#EXT-X-STREAM-INF:BANDWIDTH=8000000,CODECS="avc1.640028"');
    }
    masterLines.push('video.m3u8', '');

    fs.writeFileSync(masterPath, masterLines.join('\n'), 'utf8');

    if (!fs.existsSync(masterPath)) {
      throw new Error('HLS master playlist was not created');
    }

    onProgress?.(100);
    logger.ffmpeg(`HLS generation completed: ${masterPath}`);

    return masterPath;
  }

  /**
   * Complete media processing pipeline:
   * Google Drive / Local Storage -> Local Temp -> FFprobe -> Subtitle extraction -> MP4 Transcode -> HLS -> Thumbnail -> Google Drive / Local Storage -> Cleanup.
   */
  static async processMediaInBackground(
    movieId: string,
    initialLocalPath?: string
  ): Promise<void> {
    const tempDir = path.join(ENV.TEMP_PATH, `processing-${movieId}`);
    let localInputPath = initialLocalPath || '';
    let downloadedFromCloud = false;

    try {
      logger.ffmpeg(`[PROCESSING] Starting media processing for movie [${movieId}]...`);

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const movie = await Movie.findById(movieId);
      if (!movie) {
        throw new Error(`Movie ${movieId} not found in database`);
      }

      movie.status = 'processing';
      movie.processingProgress = 5;
      movie.transcodeStatus = 'pending';
      movie.transcodeProgress = 0;
      await movie.save();

      emitEvent('movie:processing', {
        movieId,
        status: 'processing',
        progress: 5,
        message: 'Initializing media analysis...',
      });

      // ------------------------------------------------------------
      // Ensure local copy of original file is available
      // ------------------------------------------------------------
      if (!localInputPath || !fs.existsSync(localInputPath)) {
        logger.ffmpeg(`[PROCESSING] Local file not present. Downloading from storage provider...`);
        const ext = path.extname(movie.filename || movie.originalFilename || '.mp4') || '.mp4';
        localInputPath = path.join(tempDir, `original-${movieId}${ext}`);

        const storageId = movie.originalDriveFileId || movie.originalStorageKey || movie.filePath;
        await storageProvider.downloadToFile(storageId, localInputPath);
        downloadedFromCloud = true;
      }

      // ------------------------------------------------------------
      // STEP 1 — PROBE MEDIA
      // ------------------------------------------------------------
      const probe = await this.probeMedia(localInputPath);

      movie.duration = probe.duration;
      movie.width = probe.width;
      movie.height = probe.height;
      movie.resolution = probe.resolution;
      movie.fps = probe.fps;
      movie.mimeType = probe.mimeType;
      movie.videoCodec = probe.videoCodec;
      movie.audioCodec = probe.audioCodec;
      movie.bitrate = probe.bitrate;
      movie.audioTracks = probe.audioTracks;
      movie.subtitles = probe.subtitles;
      movie.transcodeNeeded = !probe.isDirectPlayable;
      movie.processingProgress = 20;
      await movie.save();

      emitEvent('movie:processing-progress', {
        movieId,
        progress: 20,
        stage: 'metadata',
        message: `Media probed: ${probe.resolution} (${probe.videoCodec}/${probe.audioCodec})`,
      });

      // ------------------------------------------------------------
      // STEP 2 — SUBTITLE EXTRACTION
      // ------------------------------------------------------------
      if (probe.subtitles.length > 0) {
        try {
          const tempSubsDir = path.join(tempDir, 'subtitles');
          const extractedSubs = await this.extractEmbeddedSubtitles(
            localInputPath,
            movieId,
            probe.subtitles,
            tempSubsDir
          );

          movie.subtitles = extractedSubs;
          movie.subtitleDriveFileIds = extractedSubs
            .map((s) => s.driveFileId)
            .filter((id): id is string => Boolean(id));

          await movie.save();
        } catch (subErr: any) {
          logger.warn(`Subtitle extraction warning for ${movieId}:`, subErr.message);
        }
      }

      movie.processingProgress = 30;
      await movie.save();
      emitEvent('movie:processing-progress', {
        movieId,
        progress: 30,
        stage: 'subtitles',
      });

      // ------------------------------------------------------------
      // STEP 3 — PLAYBACK SOURCE & TRANSCODING
      // ------------------------------------------------------------
      let localPlaybackFile = localInputPath;

      if (probe.isDirectPlayable) {
        logger.ffmpeg(`[PROCESSING] Direct playback supported for "${movie.title}". Single-pass uploading to storage...`);
        
        const uploadRes = await storageProvider.uploadFile(
          localInputPath,
          movie.filename || `movie-${movieId}.mp4`,
          {
            folderCategory: 'playback',
            movieId,
            mimeType: 'video/mp4',
          }
        );

        movie.transcodeNeeded = false;
        movie.transcodeStatus = 'not_required';
        movie.transcodeProgress = 100;
        movie.filePath = uploadRes.storageKey;
        movie.playbackPath = uploadRes.storageKey;
        movie.playbackStorageKey = uploadRes.storageKey;
        movie.playbackDriveFileId = uploadRes.driveFileId;
        movie.originalStorageKey = uploadRes.storageKey;
        movie.originalDriveFileId = uploadRes.driveFileId;
        movie.playbackMimeType = 'video/mp4';
        movie.processingProgress = 85;
        await movie.save();

        emitEvent('movie:processing-progress', {
          movieId,
          progress: 85,
          stage: 'playback',
          message: 'Direct playback ready',
        });
      } else {
        logger.ffmpeg(`[PROCESSING] Transcoding required for "${movie.title}" to LG-compatible MP4...`);
        movie.transcodeNeeded = true;
        movie.transcodeStatus = 'processing';
        movie.transcodeProgress = 0;
        await movie.save();

        emitEvent('movie:processing-progress', {
          movieId,
          progress: 35,
          stage: 'transcoding',
          message: 'Converting video to LG-compatible MP4 format',
        });

        const tempTranscodedPath = path.join(tempDir, `playback-${movieId}.mp4`);

        await this.transcodeToMp4(localInputPath, tempTranscodedPath, probe, async (progress) => {
          const currentProcessingProgress = Math.round(35 + progress * 0.45);
          await Movie.updateOne(
            { _id: movieId },
            { $set: { transcodeProgress: progress, processingProgress: currentProcessingProgress } }
          ).catch(() => {});

          emitEvent('movie:processing-progress', {
            movieId,
            progress: currentProcessingProgress,
            transcodeProgress: progress,
            stage: 'transcoding',
          });
        });

        if (!fs.existsSync(tempTranscodedPath) || fs.statSync(tempTranscodedPath).size === 0) {
          throw new Error('Transcoded MP4 file was not created or is empty');
        }

        localPlaybackFile = tempTranscodedPath;

        // Upload transcoded playback file to StorageProvider
        logger.ffmpeg(`[STORAGE:${storageProvider.providerName}] Uploading playback MP4...`);
        const playbackUploadRes = await storageProvider.uploadFile(
          tempTranscodedPath,
          `playback-${movieId}.mp4`,
          {
            folderCategory: 'playback',
            movieId,
            mimeType: 'video/mp4',
          }
        );

        movie.playbackPath = playbackUploadRes.storageKey;
        movie.playbackStorageKey = playbackUploadRes.storageKey;
        movie.playbackDriveFileId = playbackUploadRes.driveFileId;
        movie.playbackMimeType = 'video/mp4';
        movie.transcodeStatus = 'completed';
        movie.transcodeProgress = 100;
        movie.processingProgress = 85;
        await movie.save();

        emitEvent('movie:processing-progress', {
          movieId,
          progress: 85,
          stage: 'transcoding',
          message: 'Faststart MP4 ready',
        });
      }

      // ------------------------------------------------------------
      // STEP 4 — HLS GENERATION (Local mode only to maintain 2-min cloud speed)
      // ------------------------------------------------------------
      if (storageProvider.providerName === 'local') {
        try {
          emitEvent('movie:processing-progress', {
            movieId,
            progress: 88,
            stage: 'hls',
            message: 'Generating local HLS stream',
          });

          const tempHlsDir = path.join(tempDir, 'hls');
          await this.generateHls(
            localPlaybackFile,
            localInputPath,
            movieId,
            probe.audioTracks,
            tempHlsDir
          );

          // Local storage: move files to ENV.HLS_PATH/movieId
          const finalHlsDir = path.join(ENV.HLS_PATH, movieId);
          if (fs.existsSync(finalHlsDir)) {
            fs.rmSync(finalHlsDir, { recursive: true, force: true });
          }
          await fs.promises.mkdir(finalHlsDir, { recursive: true });

          const files = await fs.promises.readdir(tempHlsDir);
          for (const file of files) {
            await fs.promises.copyFile(path.join(tempHlsDir, file), path.join(finalHlsDir, file));
          }

          movie.hlsPath = path.join(finalHlsDir, 'master.m3u8');
          await movie.save();
        } catch (hlsErr: any) {
          logger.warn(`Local HLS generation warning for ${movieId}:`, hlsErr.message);
        }
      }

      // ------------------------------------------------------------
      // STEP 5 — THUMBNAIL GENERATION
      // ------------------------------------------------------------
      const thumbnailFilename = `thumb-${movieId}.jpg`;
      const tempThumbPath = path.join(tempDir, thumbnailFilename);

      try {
        await this.generateThumbnail(localPlaybackFile, probe.duration, tempThumbPath);

        if (fs.existsSync(tempThumbPath)) {
          const thumbUploadRes = await storageProvider.uploadFile(
            tempThumbPath,
            thumbnailFilename,
            {
              folderCategory: 'thumbnails',
              movieId,
              mimeType: 'image/jpeg',
            }
          );

          movie.thumbnailPath = thumbnailFilename;
          movie.thumbnailStorageKey = thumbUploadRes.storageKey;
          movie.thumbnailDriveFileId = thumbUploadRes.driveFileId;
        }
      } catch (thumbErr: any) {
        logger.warn(`Thumbnail generation failed for ${movieId}:`, thumbErr.message);
      }

      // ------------------------------------------------------------
      // STEP 6 — FINAL CLEANUP & READY
      // ------------------------------------------------------------
      movie.status = 'ready';
      movie.processingProgress = 100;
      movie.errorMessage = undefined;
      await movie.save();

      logger.ffmpeg(`[PROCESSING] Movie READY: "${movie.title}" [${movie.resolution}]`);

      emitEvent('movie:ready', movie);
    } catch (err: any) {
      logger.error(`Media processing error for movie [${movieId}]:`, err.message);

      const movie = await Movie.findById(movieId);
      if (movie) {
        movie.status = 'error';
        movie.transcodeStatus = movie.transcodeNeeded ? 'error' : 'not_required';
        movie.errorMessage = err.message || 'Media processing failed';
        await movie.save();

        emitEvent('movie:error', {
          movieId: movie._id,
          status: 'error',
          error: movie.errorMessage,
        });
      }
    } finally {
      // Clean up temporary processing workspace
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        // Also cleanup initial local file if it was in temp and we're using google_drive
        if (initialLocalPath && storageProvider.providerName === 'google_drive' && fs.existsSync(initialLocalPath)) {
          const parentDir = path.dirname(initialLocalPath);
          if (parentDir.includes(ENV.TEMP_PATH)) {
            fs.rmSync(parentDir, { recursive: true, force: true });
          }
        }
      } catch (cleanupErr: any) {
        logger.warn(`Cleanup error for ${movieId}:`, cleanupErr.message);
      }
    }
  }
}