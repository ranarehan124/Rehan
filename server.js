const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const projectRoot = __dirname;
const tempDir = path.join(projectRoot, 'tmp');

fs.mkdirSync(tempDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(projectRoot));
app.use('/tmp', express.static(tempDir));

function findLatestFile(folder, regex) {
  const entries = fs.readdirSync(folder)
    .filter((name) => regex.test(name))
    .map((name) => ({
      name,
      time: fs.statSync(path.join(folder, name)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  return entries.length ? path.join(folder, entries[0].name) : null;
}

function parseJsonOutput(raw) {
  try {
    const trimmed = raw.trim();
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const jsonLine = lines.reverse().find((line) => line.startsWith('{') && line.endsWith('}'));
    return jsonLine ? JSON.parse(jsonLine) : null;
  } catch (err) {
    return null;
  }
}

function getYtDlpPath() {
  const { execSync } = require('child_process');
  const candidates = ['yt-dlp', '/usr/bin/yt-dlp', '/usr/local/bin/yt-dlp'];
  for (const bin of candidates) {
    try {
      execSync(`${bin} --version`, { stdio: 'ignore' });
      return bin;
    } catch (_) {}
  }
  // try which
  try {
    return execSync('which yt-dlp').toString().trim();
  } catch (_) {}
  return null;
}

const YT_DLP_PATH = getYtDlpPath();

function runYtDlpCommand(args) {
  const commandCandidates = YT_DLP_PATH
    ? [[YT_DLP_PATH]]
    : [
        ['yt-dlp'],
        ['python3', '-m', 'yt_dlp'],
        ['python', '-m', 'yt_dlp'],
      ];

  const runCommand = (command, commandArgs) => new Promise((resolve, reject) => {
    const yt = spawn(command, commandArgs, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    yt.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    yt.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    yt.on('error', (error) => reject(error));
    yt.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      }
      resolve(stdout || stderr);
    });
  });

  const processArgs = ['-o', args.output, ...args.extraArgs, args.url];
  let lastError = null;

  return commandCandidates.reduce((promise, candidate) => {
    return promise.catch(async () => {
      const [command, ...baseArgs] = candidate;
      try {
        return await runCommand(command, [...baseArgs, ...processArgs]);
      } catch (error) {
        lastError = error;
        throw error;
      }
    });
  }, Promise.reject(new Error('yt-dlp not found.'))).catch((error) => {
    if (error.code === 'ENOENT' || /not found/.test(error.message)) {
      throw new Error('yt-dlp not found. Install with: python -m pip install yt-dlp and restart the server.');
    }
    throw lastError || error;
  });
}

async function runYtdlp(url, options) {
  const args = {
    output: options.outputTemplate,
    extraArgs: [
      '--no-playlist',
      '--no-warnings',
      '--print-json',
      ...options.extraArgs,
    ],
    url,
  };

  try {
    const output = await runYtDlpCommand(args);
    const metadata = parseJsonOutput(output);
    if (metadata && metadata._filename) {
      return metadata._filename;
    }
  } catch (error) {
    throw error;
  }

  const fileFilter = options.fileRegex;
  const file = findLatestFile(tempDir, fileFilter);
  if (!file) {
    throw new Error('Unable to locate downloaded media file.');
  }

  return file;
}

async function createAiResponse(promptText) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL_NAME || 'mixtral-8x7b-32768';

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Create a free Groq account and add the key to your environment.');
  }

  const url = `https://api.groq.com/openai/v1/chat/completions`;
  const body = {
    model,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.7,
    max_tokens: 180,
    top_p: 0.9,
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = response.data;
  if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0];
    if (choice.message && choice.message.content) {
      return choice.message.content.trim();
    }
  }

  return JSON.stringify(data, null, 2);
}

function buildYtDlpArgs(type, quality) {
  const args = [];
  const qualityMap = {
    best: 'best',
    medium: 'best[height<=720]/best',
    low: 'best[height<=480]/best',
  };

  if (type === 'audio') {
    args.push('-f', 'bestaudio');
    args.push('-x', '--audio-format', 'mp3');
    args.push('--ffmpeg-location', ffmpegPath);
  } else if (type === 'image') {
    args.push('--skip-download', '--write-thumbnail');
  } else {
    args.push('-f', qualityMap[quality] || qualityMap.best);
    args.push('--merge-output-format', 'mp4');
    args.push('--ffmpeg-location', ffmpegPath);
  }

  return args;
}

function runFfmpeg(source, target) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ['-y', '-i', source, '-vn', '-c:a', process.env.CONVERT_CODEC || 'libmp3lame', target], { 
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
    
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
      }
      resolve(target);
    });
  });
}

app.post('/api/download', async (req, res) => {
  try {
    const { url, type = 'video', quality = 'best' } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

const outputTemplate = path.join(tempDir, 'neonshare-%(title)s.%(ext)s');
    const ytdlpArgs = buildYtDlpArgs(type, quality);
    const fileRegex = type === 'image'
      ? /\.(jpg|jpeg|png|webp|gif)$/i
      : type === 'audio'
        ? /\.(mp3|m4a|aac|opus)$/i
        : /\.(mp4|mkv|webm|mov|avi)$/i;

    const downloaded = await runYtdlp(url, {
      outputTemplate,
      extraArgs: ytdlpArgs,
      fileRegex,
    });

    const fileName = path.basename(downloaded);
    return res.json({ url: `/tmp/${encodeURIComponent(fileName)}` });
  } catch (error) {
    console.error('Download error:', error.message || error);
    return res.status(500).json({ error: error.message || 'Download failed.' });
  }
});

app.post('/api/convert', async (req, res) => {
  try {
    const { url, format = 'mp3' } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    const sourceTemplate = path.join(tempDir, 'neonshare-source-%(title)s.%(ext)s');
    const videoArgs = ['-f', 'bestvideo[ext=mp4]+bestaudio/best/best', '--merge-output-format', 'mp4', '--ffmpeg-location', ffmpegPath];
    const sourceFile = await runYtdlp(url, {
      outputTemplate: sourceTemplate,
      extraArgs: ['-f', 'bestvideo[ext=mp4]+bestaudio/best/best', '--merge-output-format', 'mp4', '--ffmpeg-location', ffmpegPath],
      fileRegex: /\.(mp4|mkv|webm|mov|avi)$/i,
    });

    const targetFile = path.join(tempDir, `neonshare-audio-${Date.now()}.${format === 'aac' ? 'aac' : 'mp3'}`);
    await runFfmpeg(sourceFile, targetFile);

    const fileName = path.basename(targetFile);
    return res.json({ url: `/tmp/${encodeURIComponent(fileName)}` });
  } catch (error) {
    console.error('Convert error:', error.message || error);
    return res.status(500).json({ error: error.message || 'Conversion failed.' });
  }
});

app.post('/api/ai', async (req, res) => {
  try {
    const { url, goal } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    const promptMap = {
      caption: `Create a short, energetic social caption for this post URL: ${url}. Include a call-to-action and 4 trendy hashtags.`,
      hashtags: `Generate 8 high-impact hashtags for this social media post URL: ${url}. Use modern branding and athletic/digital creative style.`,
      summary: `Summarize the story of this social media link ${url} in 2-3 sentences with a bold, marketing-forward voice.`,
    };

    const prompt = promptMap[goal] || promptMap.caption;
    const result = await createAiResponse(prompt);
    return res.json({ result });
  } catch (error) {
    console.error('AI error:', error.message || error);
    return res.status(500).json({ error: error.message || 'AI call failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`NeonShare server running on http://localhost:${PORT}`);
});
