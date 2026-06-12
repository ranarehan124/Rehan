# NeonShare

A complete social media downloader, video-to-audio converter, and AI caption/hashtag assistant. Designed with charcoal, neon yellow, teal, and dark purple styling for a bold digital-first UI.

## What this project includes

- `index.html` — the browser interface with a high-energy brand style.
- `style.css` — charcoal, neon yellow, teal, and purple UI colors.
- `script.js` — frontend logic for downloads, conversion, and AI calls.
- `server.js` — Node.js backend using `yt-dlp`, `ffmpeg-static`, and Groq AI.
- `package.json` — project dependencies and startup command.
- `.env.example` — environment variable template.

## Installation

1. Install Node.js 18+ on Windows
   - Download from https://nodejs.org/en/download/
   - Or install via [nvm-windows](https://github.com/coreybutler/nvm-windows).

2. Open a PowerShell window in the project folder:
   ```powershell
   cd C:\Users\Administrator\Desktop\meri-website
   ```

3. Install Node.js dependencies:
   ```powershell
   npm install
   ```

4. **IMPORTANT:** Install `yt-dlp` (Python tool for media downloading):
   ```powershell
   python -m pip install yt-dlp --upgrade
   ```
   - If this fails, make sure Python 3.7+ is installed and in your PATH.

5. (Optional) Set your Groq API key for AI features:
   - Create a free account at https://console.groq.com/
   - Copy `.env.example` to `.env` and add your API key:
   ```text
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL_NAME=mixtral-8x7b-32768
   PORT=3000
   ```

6. Start the server:
   ```powershell
   npm start
   ```
   Or directly: `node server.js`

7. Open your browser and navigate to: **http://localhost:3000**

## Deploying to Railway

Railway works well for this app because it can run Node.js and install Python dependencies. Use these steps:

1. Create a Railway project and connect your GitHub repo or upload the folder.
2. Set the start command to:
   ```bash
   npm start
   ```
3. Add environment variables in Railway if you need AI features:
   - `GROQ_API_KEY`
   - `GROQ_MODEL_NAME`
   - `PORT`
4. Railway will run `npm install` and then `npm start`.

> Note: `yt-dlp` is installed automatically during `npm install` using the `postinstall` script.

## Supported Platforms

NeonShare can download from **1000+ platforms** via yt-dlp. Here are the most popular:

### ✅ **Confirmed Working**
- **YouTube** — Videos, Shorts, Playlists, Music
- **TikTok** — Videos, Lives, User channels (some extractors may be broken by TikTok)
- **Instagram** — Story, User profiles, Tags (Instagram limits access; may require cookies)
- **Facebook** — Videos, Reels, Pages
- **Reddit** — Videos, GIFs
- **Twitter/X** — Tweets with media
- **Snapchat** — Stories, Videos
- **Threads** — Posts and media
- **Bluesky** — Videos and images
- **Pinterest** — Pins and boards (via generic extractors)
- **Discord** — Server clips and messages with media
- **Rumble** — Videos
- **Vimeo** — Videos
- **Dailymotion** — Videos
- **Twitch** — Streams, VODs, Clips
- **And 1000+ more...**

### Supported Actions
- ✅ Download videos (MP4, MKV, WebM, etc.)
- ✅ Download audio only (MP3, AAC, etc.)
- ✅ Download images/photos
- ✅ Convert video to MP3/AAC
- ✅ Generate captions with AI (requires Groq API key)
- ✅ Generate hashtags with AI (requires Groq API key)
- ✅ Summarize posts with AI (requires Groq API key)

## API Endpoints

### POST `/api/download`
Downloads media from a social media URL.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "type": "video",
  "quality": "best"
}
```

**Response:**
```json
{
  "url": "/tmp/neonshare-video.mp4"
}
```

**Parameters:**
- `url` (required) — Social media URL
- `type` (optional) — `video` | `audio` | `image` (default: `video`)
- `quality` (optional) — `best` | `medium` | `low` (default: `best`)

### POST `/api/convert`
Converts downloaded video to audio (MP3 or AAC).

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp3"
}
```

**Response:**
```json
{
  "url": "/tmp/neonshare-audio.mp3"
}
```

### POST `/api/ai`
Generates AI captions, hashtags, or summaries (requires Groq API key).

**Request:**
```json
{
  "url": "https://www.instagram.com/p/...",
  "goal": "caption"
}
```

**Response:**
```json
{
  "result": "Generated caption text..."
}
```

**Parameters:**
- `goal` — `caption` | `hashtags` | `summary`
   ```

7. Open the UI in your browser:
   ```text
   http://localhost:3000
   ```

## Usage

- **Downloader**: paste a social media URL and choose video, audio, or image output.
- **Converter**: paste a direct video link to convert it to MP3 or AAC.
- **AI Assist**: enter a post URL and create captions, hashtags, or summaries.

## Notes

- The backend uses `yt-dlp` for downloading media and `ffmpeg-static` for conversion.
- The AI dialog is powered by Groq API. If you do not have a `GROQ_API_KEY`, the UI will still allow downloads and conversion.
- For best results, use public post URLs from Instagram, TikTok, YouTube, X, Facebook, and Reddit.

## Troubleshooting

- If `npm install` fails, install Node.js and try again.
- If downloads fail, confirm `yt-dlp` is installed and running from the command line.
- If the AI call fails, verify your `GROQ_API_KEY` and the model name.
