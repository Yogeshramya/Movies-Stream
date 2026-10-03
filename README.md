# YR STREAM — Local Real-Time Video Streaming Platform

> **Your Personal Video Streaming Server for PC, Mobile, and LG Smart TV over Jio Fiber Wi-Fi.**

YR Stream is a high-performance local video streaming platform engineered for ultra-low latency, seamless seeking, and playback of large 4K / 1080p video files (**up to 5 GB – 10 GB+**) directly on your LG Smart TV's built-in web browser without requiring LG ThinQ, external cloud servers, or unnecessary internet dependency.

---

## 🌟 Architecture & Local Network Topology

```text
                     JIO FIBER ROUTER (Wi-Fi / LAN)
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
          PC / SERVER                         LG SMART TV
        (192.168.x.x)                       (192.168.x.y)
                 │                                 │
     ┌───────────┴───────────┐                     │
     │   YR Stream Backend   │ (Port 5000)         │
     │   YR Stream Frontend  │ (Port 3000) ◄───────┘
     └───────────┬───────────┘
                 │
        ┌────────┴────────┐
        │                 │
    MongoDB         Local Storage (/storage)
   (Metadata)             ├─ /movies (Video files)
                          ├─ /thumbnails
                          ├─ /subtitles
                          ├─ /temp (Chunk uploads)
                          └─ /transcoded
```

---

## 🚀 Key Features

1. **Massive File Support (5 GB - 10 GB+)**: Resumable chunked uploads (10 MB slices) with speed calculation, ETA, pause, resume, and atomic assembly.
2. **True HTTP Range Streaming**: Implements RFC 7233 `206 Partial Content` with `Accept-Ranges: bytes` for zero-buffering seeking without downloading the whole file into RAM.
3. **Automatic FFmpeg / FFprobe Inspection**: Extracts video codec, audio codec, bitrate, duration, resolution, audio channels, and captures high-res snapshot thumbnails.
4. **VLC-Inspired Custom Video Player**:
   - Keyboard controls (`Space` for Play/Pause, `←`/`→` for ±10s seek, `↑`/`↓` for Volume, `M` for Mute, `F` for Fullscreen).
   - OSD buffer indicator and custom timeline.
   - Resume playback modal with saved timestamps.
   - Playback speed controls (0.5x – 2x).
5. **Real-Time WebSockets (Socket.IO)**: Newly uploaded videos appear instantly on all connected screens (PC, Phone, LG TV) without requiring page reloads.
6. **LG Smart TV Mode**:
   - Oversized high-contrast cards for 1080p and 4K displays.
   - Spatial D-pad remote control focus glows (`tv-focusable`).
   - Zero mouse requirement.
7. **Storage & Hardware Dashboard**: Inspects disk drive free space, total movie size, and displays active network interfaces.
8. **Watch History & Favorites**: Auto-saves playback positions every 5 seconds.

---

## 📁 Project Structure

```text
YR-Stream/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Storage, FFmpeg & Env configs
│   │   ├── controllers/     # Movie, Upload, History & System controllers
│   │   ├── middleware/      # CORS & Centralized Error Handlers
│   │   ├── models/          # Movie & WatchHistory Mongoose Models
│   │   ├── routes/          # REST API endpoints
│   │   ├── services/        # Streaming, Chunk Upload & FFmpeg services
│   │   ├── sockets/         # Socket.IO event broadcaster
│   │   ├── utils/           # Logger, File sanitizer & Network IP discovery
│   │   └── server.ts        # Express + HTTP Server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Home (Hero backdrop, Continue Watching, Recently Added)
│   │   ├── movies/          # Movie library with search, sort & filters
│   │   ├── movies/[id]/     # Movie details, technical specs & stream triggers
│   │   ├── watch/[id]/      # Custom VLC-style HTML5 video player
│   │   ├── upload/          # 5GB+ Chunked resumable drag-and-drop uploader
│   │   ├── history/         # Watch history & Continue Watching
│   │   ├── favorites/       # Saved favorites
│   │   ├── tv/              # Dedicated LG Smart TV Mode
│   │   └── settings/        # Disk storage dashboard & LAN IP connection guide
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Socket & TV remote navigation hooks
│   ├── lib/                 # API client, formatters & constants
│   ├── package.json
│   └── tailwind.config.js
│
├── storage/                 # Persistent local media storage
│   ├── movies/
│   ├── thumbnails/
│   ├── subtitles/
│   ├── temp/
│   └── transcoded/
│
├── docker-compose.yml       # Optional Docker deployment
├── start-yrstream.ps1       # 1-Click Windows PowerShell launcher
├── start-yrstream.bat       # 1-Click Windows Batch launcher
└── README.md
```

---

## 💻 Quick Start Guide (Windows)

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Community Server (Installed & running on port `27017`)
- **FFmpeg**: Bundled automatically with `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` fallbacks, or available on system PATH.

### 1. Launch with 1-Click Script
Run `start-yrstream.bat` or run in Windows PowerShell:
```powershell
.\start-yrstream.ps1
```

### 2. Manual Startup
**Backend:**
```powershell
cd backend
npm install
npm run dev
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your PC browser.

---

## 📺 Connecting your LG Smart TV

1. Ensure your PC and LG Smart TV are connected to the same **Jio Fiber Wi-Fi network**.
2. Find your PC's local IP address (printed on the backend startup banner and visible on the **Settings** page, e.g. `192.168.29.100`).
3. Open the **Web Browser** app on your LG TV.
4. Type in:
   ```text
   http://<YOUR_PC_IP>:3000
   ```
   *(e.g., `http://192.168.29.100:3000`)*
5. Click **TV Mode** in the navigation bar for high-contrast, remote-control friendly browsing!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/movies` | Fetch movies with search, filter, and sort |
| `GET` | `/api/movies/:id` | Fetch movie details with metadata |
| `PATCH` | `/api/movies/:id` | Update movie title or favorite status |
| `DELETE` | `/api/movies/:id` | Permanently delete movie and physical files |
| `GET` | `/api/movies/:id/stream` | Stream video with HTTP 206 Range requests |
| `GET` | `/api/movies/:id/thumbnail` | Fetch generated snapshot thumbnail |
| `POST` | `/api/upload/init` | Initialize resumable chunked upload session |
| `POST` | `/api/upload/chunk` | Upload individual binary chunk slice |
| `GET` | `/api/upload/:id/status` | Query uploaded chunks for resume |
| `DELETE` | `/api/upload/:id` | Cancel upload and clean temporary chunks |
| `GET` | `/api/history` | Retrieve watch history for Continue Watching |
| `POST` | `/api/history` | Save playback position (called every 5s) |
| `DELETE` | `/api/history/:movieId` | Clear watch history |
| `GET` | `/api/system/stats` | Disk capacity, total media size, and LAN IPs |

---

## 🔒 Security & Safe File Handling

- **Filename Sanitization**: Cleans malicious traversal characters (`..`, `/`, `\`) and null bytes.
- **Strict Format Whitelisting**: Accepts valid video containers (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.ts`, etc.).
- **Atomic File Assembly**: Temporary slices are assembled safely into final storage and purged immediately.
- **Resource Protection**: Read streams are destroyed automatically when the client or TV disconnects to prevent file descriptor leaks.
#   Y R - S T R E A M  
 