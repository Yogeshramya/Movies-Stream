'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  UploadCloud,
  Film,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  X,
  Loader2,
  Zap,
  RefreshCw,
} from 'lucide-react';

import {
  API_BASE_URL,
  CHUNK_SIZE,
} from '../lib/constants';

import { formatBytes } from '../lib/formatters';


// ============================================================
// TYPES
// ============================================================

interface UploadTask {
  file: File;
  title: string;

  uploadId?: string;

  totalChunks: number;

  uploadedChunks: number[];

  uploadedBytes: number;

  progress: number;

  speed: number;

  timeRemaining: number;

  status:
  | 'idle'
  | 'uploading'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'error';

  errorMessage?: string;

  retryCount?: number;
}

interface PersistedUpload {
  uploadId: string;

  filename: string;

  fileSize: number;

  totalChunks: number;

  title: string;

  savedAt: number;
}


// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY =
  'yr-stream-active-upload';

const MAX_RETRIES = 3;

const RETRY_BASE_DELAY = 1000;


// ============================================================
// COMPONENT
// ============================================================

export default function ChunkUploader() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [task, setTask] =
    useState<UploadTask | null>(null);

  const [customTitle, setCustomTitle] =
    useState('');

  const isCancelledRef =
    useRef<boolean>(false);

  const isPausedRef =
    useRef<boolean>(false);

  const uploadRunningRef =
    useRef<boolean>(false);


  // ==========================================================
  // HELPERS
  // ==========================================================

  const updateTask = useCallback(
    (
      updater:
        | Partial<UploadTask>
        | ((prev: UploadTask) => Partial<UploadTask>)
    ) => {
      setTask((prev) => {
        if (!prev) return null;

        const changes =
          typeof updater === 'function'
            ? updater(prev)
            : updater;

        return {
          ...prev,
          ...changes,
        };
      });
    },
    []
  );


  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  const savePersistedUpload = useCallback(
    (data: PersistedUpload) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data)
        );
      } catch {
        // Ignore localStorage failures
      }
    },
    []
  );


  const getPersistedUpload =
    useCallback((): PersistedUpload | null => {
      try {
        const raw =
          localStorage.getItem(
            STORAGE_KEY
          );

        if (!raw) return null;

        const parsed =
          JSON.parse(raw);

        if (
          !parsed ||
          !parsed.uploadId ||
          !parsed.filename ||
          !parsed.fileSize ||
          !parsed.totalChunks
        ) {
          return null;
        }

        return parsed as PersistedUpload;
      } catch {
        return null;
      }
    }, []);


  const clearPersistedUpload =
    useCallback(() => {
      try {
        localStorage.removeItem(
          STORAGE_KEY
        );
      } catch {
        // Ignore
      }
    }, []);


  // ==========================================================
  // RETRY DELAY
  // ==========================================================

  const wait = (
    milliseconds: number
  ) =>
    new Promise<void>((resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    });


  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleSelectFile = useCallback(
    (file: File) => {
      if (!file) return;

      const totalChunks =
        Math.ceil(
          file.size / CHUNK_SIZE
        );

      const extensionIndex =
        file.name.lastIndexOf('.');

      const cleanTitle =
        extensionIndex > 0
          ? file.name.substring(
            0,
            extensionIndex
          )
          : file.name;

      const title =
        cleanTitle
          .replace(/[.\_-]/g, ' ')
          .trim();

      setCustomTitle(title);

      setTask({
        file,

        title,

        totalChunks,

        uploadedChunks: [],

        uploadedBytes: 0,

        progress: 0,

        speed: 0,

        timeRemaining: 0,

        status: 'idle',

        retryCount: 0,
      });
    },
    []
  );


  // ==========================================================
  // DRAG / DROP
  // ==========================================================

  const handleDrop = (
    e: React.DragEvent
  ) => {
    e.preventDefault();

    if (
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      handleSelectFile(
        e.dataTransfer.files[0]
      );
    }
  };


  // ==========================================================
  // GET SERVER UPLOAD STATUS
  // ==========================================================

  const getServerUploadStatus =
    async (
      uploadId: string
    ): Promise<{
      uploadedChunks: number[];
      isComplete?: boolean;
    }> => {
      const response =
        await fetch(
          `${API_BASE_URL}/api/upload/${uploadId}/status`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

      if (response.status === 404) {
        throw new Error(
          'UPLOAD_SESSION_EXPIRED'
        );
      }

      if (!response.ok) {
        throw new Error(
          'Unable to retrieve upload status'
        );
      }

      const data =
        await response.json();

      return {
        uploadedChunks:
          Array.isArray(
            data.uploadedChunks
          )
            ? data.uploadedChunks
            : [],

        isComplete:
          Boolean(data.isComplete),
      };
    };


  // ==========================================================
  // CREATE UPLOAD SESSION
  // ==========================================================

  const initializeUpload =
    async (
      currentTask: UploadTask
    ): Promise<string> => {
      const response =
        await fetch(
          `${API_BASE_URL}/api/upload/init`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              filename:
                currentTask.file.name,

              fileSize:
                currentTask.file.size,

              totalChunks:
                currentTask.totalChunks,

              title:
                customTitle ||
                currentTask.title,
            }),
          }
        );

      if (!response.ok) {
        let message =
          'Failed to initialize upload session';

        try {
          const error =
            await response.json();

          message =
            error.error ||
            error.message ||
            message;
        } catch {
          // Ignore JSON error
        }

        throw new Error(message);
      }

      const data =
        await response.json();

      if (!data.uploadId) {
        throw new Error(
          'Server did not return an upload ID'
        );
      }

      return data.uploadId;
    };


  // ==========================================================
  // UPLOAD SINGLE CHUNK WITH RETRIES
  // ==========================================================

  const uploadChunkWithRetry =
    async (
      uploadId: string,
      chunkIndex: number,
      chunkBlob: Blob
    ): Promise<{
      isComplete: boolean;
      attempts: number;
    }> => {
      let lastError: Error =
        new Error(
          'Chunk upload failed'
        );

      for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
      ) {
        if (
          isCancelledRef.current
        ) {
          throw new Error(
            'UPLOAD_CANCELLED'
          );
        }

        while (
          isPausedRef.current &&
          !isCancelledRef.current
        ) {
          await wait(250);
        }

        if (
          isCancelledRef.current
        ) {
          throw new Error(
            'UPLOAD_CANCELLED'
          );
        }

        try {
          updateTask({
            retryCount:
              attempt > 1
                ? attempt
                : 0,
          });

          const formData =
            new FormData();

          formData.append(
            'chunk',
            chunkBlob
          );

          formData.append(
            'uploadId',
            uploadId
          );

          formData.append(
            'chunkIndex',
            chunkIndex.toString()
          );

          const response =
            await fetch(
              `${API_BASE_URL}/api/upload/chunk`,
              {
                method: 'POST',

                headers: {
                  'x-upload-id':
                    uploadId,

                  'x-chunk-index':
                    chunkIndex.toString(),
                },

                body: formData,
              }
            );

          if (!response.ok) {
            let serverMessage =
              `HTTP ${response.status}`;

            try {
              const error =
                await response.json();

              serverMessage =
                error.error ||
                error.message ||
                serverMessage;
            } catch {
              // Ignore
            }

            throw new Error(
              serverMessage
            );
          }

          const data =
            await response.json();

          return {
            isComplete:
              Boolean(
                data.isComplete
              ),

            attempts: attempt,
          };
        } catch (error: any) {
          lastError =
            error instanceof Error
              ? error
              : new Error(
                String(error)
              );

          if (
            attempt >= MAX_RETRIES
          ) {
            break;
          }

          const delay =
            RETRY_BASE_DELAY *
            Math.pow(
              2,
              attempt - 1
            );

          updateTask({
            errorMessage:
              `Chunk ${chunkIndex + 1
              } failed. ` +
              `Retrying ${attempt}/${MAX_RETRIES}...`,
          });

          await wait(delay);
        }
      }

      throw lastError;
    };


  // ==========================================================
  // START / RESUME UPLOAD
  // ==========================================================

  const startUpload = async () => {
    if (!task) return;

    if (
      uploadRunningRef.current
    ) {
      return;
    }

    uploadRunningRef.current =
      true;

    isCancelledRef.current =
      false;

    isPausedRef.current =
      false;

    let uploadId =
      task.uploadId;

    let uploadedChunks =
      [...task.uploadedChunks];

    try {
      updateTask({
        status: 'uploading',

        errorMessage:
          undefined,

        retryCount: 0,
      });


      // ========================================================
      // 1. Check persisted session
      // ========================================================

      if (!uploadId) {
        const persisted =
          getPersistedUpload();

        if (
          persisted &&
          persisted.filename ===
          task.file.name &&
          persisted.fileSize ===
          task.file.size &&
          persisted.totalChunks ===
          task.totalChunks
        ) {
          uploadId =
            persisted.uploadId;

          updateTask({
            uploadId,
            title:
              persisted.title,
          });

          setCustomTitle(
            persisted.title
          );
        }
      }


      // ========================================================
      // 2. Initialize or recover session
      // ========================================================

      if (!uploadId) {
        uploadId =
          await initializeUpload(
            task
          );

        savePersistedUpload({
          uploadId,

          filename:
            task.file.name,

          fileSize:
            task.file.size,

          totalChunks:
            task.totalChunks,

          title:
            customTitle ||
            task.title,

          savedAt:
            Date.now(),
        });

        updateTask({
          uploadId,
        });
      }


      // ========================================================
      // 3. Ask backend which chunks exist
      // ========================================================

      let serverStatus;

      try {
        serverStatus =
          await getServerUploadStatus(
            uploadId
          );
      } catch (error: any) {
        if (
          error.message ===
          'UPLOAD_SESSION_EXPIRED'
        ) {
          // Old session no longer exists.
          // Create a completely new one.

          clearPersistedUpload();

          uploadId =
            await initializeUpload(
              task
            );

          savePersistedUpload({
            uploadId,

            filename:
              task.file.name,

            fileSize:
              task.file.size,

            totalChunks:
              task.totalChunks,

            title:
              customTitle ||
              task.title,

            savedAt:
              Date.now(),
          });

          updateTask({
            uploadId,
          });

          serverStatus = {
            uploadedChunks: [],
            isComplete: false,
          };
        } else {
          throw error;
        }
      }


      // ========================================================
      // 4. Synchronize local state with server
      // ========================================================

      uploadedChunks =
        Array.from(
          new Set(
            serverStatus.uploadedChunks
          )
        ).sort(
          (a, b) => a - b
        );


      // Calculate actual uploaded bytes.
      // Do NOT use uploadedChunks.length * CHUNK_SIZE
      // because the final chunk can be smaller.

      let uploadedBytes = 0;

      for (
        const chunkIndex
        of uploadedChunks
      ) {
        const start =
          chunkIndex *
          CHUNK_SIZE;

        const end =
          Math.min(
            task.file.size,
            start + CHUNK_SIZE
          );

        uploadedBytes +=
          Math.max(
            0,
            end - start
          );
      }


      const initialProgress =
        Math.min(
          100,
          Math.round(
            (uploadedBytes /
              task.file.size) *
            100
          )
        );


      updateTask({
        uploadedChunks,

        uploadedBytes,

        progress:
          initialProgress,
      });


      // ========================================================
      // Already complete
      // ========================================================

      if (
        serverStatus.isComplete ||
        uploadedChunks.length ===
        task.totalChunks
      ) {
        clearPersistedUpload();

        updateTask({
          uploadedChunks,

          uploadedBytes:
            task.file.size,

          progress: 100,

          status:
            'completed',

          timeRemaining: 0,

          speed: 0,
        });

        return;
      }


      // ========================================================
      // 5. Upload missing chunks
      // ========================================================

      let measurementStart =
        Date.now();

      let measurementBytes =
        uploadedBytes;


      for (
        let i = 0;
        i < task.totalChunks;
        i++
      ) {
        // ------------------------------------------------------
        // Cancellation
        // ------------------------------------------------------

        if (
          isCancelledRef.current
        ) {
          throw new Error(
            'UPLOAD_CANCELLED'
          );
        }


        // ------------------------------------------------------
        // Pause
        // ------------------------------------------------------

        if (
          isPausedRef.current
        ) {
          updateTask({
            status: 'paused',
          });

          return;
        }


        // ------------------------------------------------------
        // Skip server-confirmed chunks
        // ------------------------------------------------------

        if (
          uploadedChunks.includes(i)
        ) {
          continue;
        }


        // ------------------------------------------------------
        // Get chunk from original File
        // ------------------------------------------------------

        const start =
          i * CHUNK_SIZE;

        const end =
          Math.min(
            task.file.size,
            start + CHUNK_SIZE
          );

        const chunkBlob =
          task.file.slice(
            start,
            end
          );

        const chunkSize =
          end - start;


        // ------------------------------------------------------
        // Upload with automatic retry
        // ------------------------------------------------------

        const chunkStart =
          Date.now();

        let result;

        try {
          result =
            await uploadChunkWithRetry(
              uploadId,
              i,
              chunkBlob
            );
        } catch (error: any) {
          if (
            error.message ===
            'UPLOAD_CANCELLED'
          ) {
            throw error;
          }

          throw new Error(
            `Failed to upload chunk ${i + 1
            }/${task.totalChunks}: ${error.message
            }`
          );
        }


        // ------------------------------------------------------
        // Mark chunk uploaded
        // ------------------------------------------------------

        if (
          !uploadedChunks.includes(i)
        ) {
          uploadedChunks.push(i);
        }

        uploadedChunks.sort(
          (a, b) => a - b
        );

        uploadedBytes +=
          chunkSize;


        // ------------------------------------------------------
        // Calculate transfer speed
        // ------------------------------------------------------

        const now =
          Date.now();

        const chunkDuration =
          Math.max(
            0.001,
            (now - chunkStart) /
            1000
          );

        const instantSpeed =
          chunkSize /
          chunkDuration;


        const measurementDuration =
          Math.max(
            0.001,
            (now -
              measurementStart) /
            1000
          );

        const measurementSpeed =
          (uploadedBytes -
            measurementBytes) /
          measurementDuration;


        const speed =
          measurementSpeed > 0
            ? measurementSpeed
            : instantSpeed;


        // Reset measurement window
        if (
          measurementDuration >=
          2
        ) {
          measurementStart =
            now;

          measurementBytes =
            uploadedBytes;
        }


        // ------------------------------------------------------
        // Accurate progress
        // ------------------------------------------------------

        const percent =
          Math.min(
            100,
            Math.round(
              (uploadedBytes /
                task.file.size) *
              100
            )
          );


        // ------------------------------------------------------
        // Accurate ETA
        // ------------------------------------------------------

        const remainingBytes =
          Math.max(
            0,
            task.file.size -
            uploadedBytes
          );

        const eta =
          speed > 0
            ? Math.ceil(
              remainingBytes /
              speed
            )
            : 0;


        // ------------------------------------------------------
        // Update UI
        // ------------------------------------------------------

        updateTask({
          uploadedChunks:
            [...uploadedChunks],

          uploadedBytes,

          progress: percent,

          speed,

          timeRemaining: eta,

          status:
            result.isComplete
              ? 'processing'
              : 'uploading',

          errorMessage:
            undefined,

          retryCount: 0,
        });


        // ------------------------------------------------------
        // Final chunk
        // ------------------------------------------------------

        if (
          result.isComplete
        ) {
          clearPersistedUpload();

          updateTask({
            progress: 100,

            uploadedBytes:
              task.file.size,

            status:
              'completed',

            timeRemaining: 0,

            speed: 0,
          });

          break;
        }
      }

    } catch (error: any) {
      // --------------------------------------------------------
      // Pause / cancel are normal control-flow events
      // --------------------------------------------------------

      if (
        error.message ===
        'UPLOAD_CANCELLED'
      ) {
        return;
      }


      if (
        isPausedRef.current
      ) {
        updateTask({
          status: 'paused',
        });

        return;
      }


      updateTask({
        status: 'error',

        errorMessage:
          error.message ||
          'Upload failed. Please check your network and try again.',
      });

    } finally {
      uploadRunningRef.current =
        false;
    }
  };


  // ==========================================================
  // PAUSE
  // ==========================================================

  const pauseUpload = () => {
    isPausedRef.current =
      true;

    updateTask({
      status: 'paused',
    });
  };


  // ==========================================================
  // CANCEL
  // ==========================================================

  const cancelUpload = async () => {
    isCancelledRef.current =
      true;

    isPausedRef.current =
      false;

    const currentUploadId =
      task?.uploadId;

    if (currentUploadId) {
      try {
        await fetch(
          `${API_BASE_URL}/api/upload/${currentUploadId}`,
          {
            method: 'DELETE',
          }
        );
      } catch {
        // Backend cleanup can fail;
        // local cleanup still happens.
      }
    }

    clearPersistedUpload();

    setTask(null);

    setCustomTitle('');

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }
  };


  // ==========================================================
  // RETRY FAILED UPLOAD
  // ==========================================================

  const retryUpload = () => {
    if (!task) return;

    isPausedRef.current =
      false;

    isCancelledRef.current =
      false;

    startUpload();
  };


  // ==========================================================
  // RECOVER SESSION ON FILE SELECTION
  // ==========================================================

  useEffect(() => {
    if (!task) return;

    const persisted =
      getPersistedUpload();

    if (!persisted) return;

    if (
      persisted.filename !==
      task.file.name ||
      persisted.fileSize !==
      task.file.size ||
      persisted.totalChunks !==
      task.totalChunks
    ) {
      return;
    }

    // We found a possible previous session.
    // Keep it available but don't automatically start
    // uploading until the user presses Start/Resume.

    updateTask({
      uploadId:
        persisted.uploadId,

      title:
        persisted.title,
    });

    setCustomTitle(
      persisted.title
    );
  }, [
    task?.file,
    getPersistedUpload,
    updateTask,
  ]);


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">

      {/* ======================================================
          FILE DROPZONE
      ====================================================== */}

      {!task && (
        <div
          onDragOver={(e) =>
            e.preventDefault()
          }

          onDrop={
            handleDrop
          }

          onClick={() =>
            fileInputRef.current?.click()
          }

          className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-surface-border hover:border-sky-500/60 bg-surface/60 hover:bg-surface-hover/80 transition-all p-12 flex flex-col items-center justify-center text-center shadow-xl hover:shadow-sky-950/20"
        >

          <input
            ref={fileInputRef}

            type="file"

            accept="video/*,.mkv,.mp4,.mov,.avi,.webm,.m4v,.ts"

            onChange={(e) => {
              if (
                e.target.files &&
                e.target.files.length > 0
              ) {
                handleSelectFile(
                  e.target.files[0]
                );
              }
            }}

            className="hidden"
          />

          <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-lg mb-4">
            <UploadCloud className="w-10 h-10" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Upload Movie or Video File
          </h3>

          <p className="text-sm text-zinc-400 max-w-md mb-4">
            Drag & drop your video here,
            or click to browse files.
            Supports large files up to
            10 GB (MKV, MP4, WebM, MOV,
            AVI).
          </p>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
            <Zap className="w-3.5 h-3.5 text-sky-400" />

            <span>
              Chunked & Resumable Transfer
              Optimized for Jio Fiber LAN
            </span>
          </div>
        </div>
      )}


      {/* ======================================================
          ACTIVE UPLOAD CARD
      ====================================================== */}

      {task && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-surface-border shadow-2xl flex flex-col gap-6">

          {/* --------------------------------------------------
              Header
          -------------------------------------------------- */}

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Film className="w-6 h-6" />
              </div>

              <div>

                <input
                  type="text"

                  value={customTitle}

                  disabled={
                    task.status ===
                    'uploading' ||
                    task.status ===
                    'completed'
                  }

                  onChange={(e) =>
                    setCustomTitle(
                      e.target.value
                    )
                  }

                  placeholder="Movie Title"

                  className="font-bold text-lg text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-sky-400 focus:outline-none px-1"
                />

                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {task.file.name}
                  {' • '}
                  {formatBytes(
                    task.file.size
                  )}
                  {' ('}
                  {task.totalChunks}
                  {' chunks)'}
                </p>

              </div>

            </div>


            <button
              onClick={
                cancelUpload
              }

              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"

              title="Cancel Upload"
            >
              <X className="w-5 h-5" />
            </button>

          </div>


          {/* --------------------------------------------------
              Progress
          -------------------------------------------------- */}

          <div className="flex flex-col gap-2">

            <div className="flex items-center justify-between text-sm">

              <span className="font-semibold text-white flex items-center gap-2">

                {task.status ===
                  'uploading' && (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  )}

                {task.status ===
                  'processing' && (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  )}

                {task.status ===
                  'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}

                {task.status ===
                  'error' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}

                {task.status ===
                  'idle' &&
                  'Ready to Upload'}

                {task.status ===
                  'uploading' &&
                  `Uploading... ${task.progress}%`}

                {task.status ===
                  'paused' &&
                  `Upload Paused (${task.progress}%)`}

                {task.status ===
                  'processing' &&
                  'Processing Media with FFmpeg...'}

                {task.status ===
                  'completed' &&
                  'Upload Complete! Ready to stream.'}

                {task.status ===
                  'error' &&
                  'Upload Error'}

              </span>


              <span className="font-mono text-zinc-400 text-xs">

                {formatBytes(
                  task.uploadedBytes
                )}

                {' / '}

                {formatBytes(
                  task.file.size
                )}

              </span>

            </div>


            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">

              <div
                className={`h-full transition-all duration-300 ${task.status ===
                    'completed'
                    ? 'bg-emerald-500'
                    : task.status ===
                      'error'
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                  }`}

                style={{
                  width:
                    `${task.progress}%`,
                }}
              />

            </div>

          </div>


          {/* --------------------------------------------------
              Stats
          -------------------------------------------------- */}

          {(task.status ===
            'uploading' ||
            task.status ===
            'paused') && (

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3 rounded-xl border border-surface-border text-xs">

                <div>
                  <span className="text-zinc-500 block mb-0.5">
                    Transfer Speed
                  </span>

                  <span className="font-mono font-semibold text-sky-400">
                    {formatBytes(
                      task.speed
                    )}
                    /s
                  </span>
                </div>


                <div>
                  <span className="text-zinc-500 block mb-0.5">
                    Time Remaining
                  </span>

                  <span className="font-mono font-semibold text-zinc-200">

                    {task.timeRemaining >
                      60
                      ? `${Math.floor(
                        task.timeRemaining /
                        60
                      )}m ${task.timeRemaining %
                      60
                      }s`
                      : `${task.timeRemaining}s`}

                  </span>
                </div>


                <div>
                  <span className="text-zinc-500 block mb-0.5">
                    Uploaded Chunks
                  </span>

                  <span className="font-mono font-semibold text-zinc-200">
                    {
                      task
                        .uploadedChunks
                        .length
                    }
                    {' / '}
                    {task.totalChunks}
                  </span>
                </div>


                <div>
                  <span className="text-zinc-500 block mb-0.5">
                    Chunk Size
                  </span>

                  <span className="font-mono font-semibold text-zinc-200">
                    {formatBytes(
                      CHUNK_SIZE
                    )}
                  </span>
                </div>

              </div>
            )}


          {/* --------------------------------------------------
              Retry Information
          -------------------------------------------------- */}

          {task.retryCount &&
            task.retryCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-300">

                <RefreshCw className="w-4 h-4" />

                Retrying chunk upload
                {' ('}
                {task.retryCount}
                /{MAX_RETRIES}
                {')...'}

              </div>
            )}


          {/* --------------------------------------------------
              Error
          -------------------------------------------------- */}

          {task.status ===
            'error' &&
            task.errorMessage && (

              <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">

                {task.errorMessage}

              </div>
            )}


          {/* --------------------------------------------------
              Actions
          -------------------------------------------------- */}

          <div className="flex items-center justify-end gap-3 pt-2">

            {/* START */}

            {task.status ===
              'idle' && (

                <button
                  onClick={
                    startUpload
                  }

                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/20 tv-focusable"
                >
                  <UploadCloud className="w-4 h-4" />

                  <span>
                    Start Upload
                  </span>
                </button>
              )}


            {/* UPLOAD */}

            {task.status ===
              'uploading' && (

                <button
                  onClick={
                    pauseUpload
                  }

                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-hover hover:bg-slate-800 text-zinc-200 font-semibold text-sm border border-surface-border active:scale-95 transition-all tv-focusable"
                >
                  <Pause className="w-4 h-4" />

                  <span>
                    Pause
                  </span>
                </button>
              )}


            {/* PAUSED */}

            {task.status ===
              'paused' && (

                <button
                  onClick={
                    startUpload
                  }

                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/20 tv-focusable"
                >
                  <Play className="w-4 h-4" />

                  <span>
                    Resume Upload
                  </span>
                </button>
              )}


            {/* ERROR */}

            {task.status ===
              'error' && (

                <button
                  onClick={
                    retryUpload
                  }

                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/20 tv-focusable"
                >
                  <RefreshCw className="w-4 h-4" />

                  <span>
                    Retry Upload
                  </span>
                </button>
              )}


            {/* COMPLETE */}

            {task.status ===
              'completed' && (

                <button
                  onClick={() =>
                    router.push(
                      '/movies'
                    )
                  }

                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-600/20 tv-focusable"
                >
                  <Film className="w-4 h-4" />

                  <span>
                    Go to Movie Library
                  </span>
                </button>
              )}

          </div>

        </div>
      )}
    </div>
  );
}