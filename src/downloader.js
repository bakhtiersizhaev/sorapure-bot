import axios from 'axios';
import { createWriteStream, existsSync, unlinkSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Configuration
const REQUEST_TIMEOUT = 120000;
const API_TIMEOUT = 30000;
const FFMPEG_TIMEOUT = 120000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Telegram limit

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';

const VIDEO_ID_PATTERN = /(s_[0-9A-Za-z_-]{8,})/;

const DELOGO = { x: 'iw-160', y: 'ih-60', w: 150, h: 50 };

// Endpoints (base64 encoded)
const ENDPOINTS = {
    CDN_PROXY: 'aHR0cHM6Ly9hcGkuc29yYWNkbi53b3JrZXJzLmRldi9kb3dubG9hZC1wcm94eT9pZD0=',
    SORA_API: 'aHR0cHM6Ly9zb3JhLmNoYXRncHQuY29tL2JhY2tlbmQvcHJvamVjdF95L3Bvc3Qv',
    OPENAI_CDN: 'aHR0cHM6Ly9jZG4ub3BlbmFpLmNvbS9NUDQv',
};

export const Source = {
    NONE: -1,
    CDN_PROXY: 1,
    SORA_API: 2,
    OPENAI_CDN: 3,
};

// Helpers
const decode = (s) => Buffer.from(s, 'base64').toString('utf-8');

export const extractVideoId = (url) => url.match(VIDEO_ID_PATTERN)?.[1] || null;

const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const generateHash = () => randomBytes(8).toString('hex');

const safeDelete = (filePath) => {
    try {
        if (existsSync(filePath)) unlinkSync(filePath);
    } catch {
        // Ignore errors
    }
};

// Download strategies
async function fromCdnProxy(videoId, requestId) {
    try {
        const res = await axios({
            url: decode(ENDPOINTS.CDN_PROXY) + videoId,
            method: 'GET',
            responseType: 'stream',
            timeout: REQUEST_TIMEOUT,
            headers: { 'User-Agent': USER_AGENT, 'X-Request-Id': requestId },
        });

        if (res.status === 200 && res.headers['content-type']?.includes('video')) {
            return res;
        }
    } catch {
        // Silent fail, try next method
    }
    return null;
}

async function fromSoraApi(videoId, token, cookies) {
    if (!token) return null;

    try {
        const headers = {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
            Referer: `https://sora.chatgpt.com/p/${videoId}`,
            Origin: 'https://sora.chatgpt.com',
            Authorization: `Bearer ${token}`,
        };
        if (cookies) headers.Cookie = cookies;

        const api = await axios({
            url: decode(ENDPOINTS.SORA_API) + videoId,
            method: 'GET',
            timeout: API_TIMEOUT,
            headers,
        });

        const att = api.data?.post?.attachments?.[0];
        if (!att) return null;

        let videoUrl = att.download_urls?.no_watermark;
        let needsProcessing = false;

        if (!videoUrl) {
            videoUrl = att.downloadable_url || att.download_urls?.watermark || att.encodings?.source?.path;
            needsProcessing = true;
        }

        if (!videoUrl) return null;

        const res = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: REQUEST_TIMEOUT,
            headers: { 'User-Agent': USER_AGENT },
        });

        return res.status === 200 ? { response: res, needsProcessing } : null;
    } catch {
        // Silent fail
    }
    return null;
}

async function fromOpenAiCdn(videoId) {
    try {
        const res = await axios({
            url: `${decode(ENDPOINTS.OPENAI_CDN)}${videoId}.mp4`,
            method: 'GET',
            responseType: 'stream',
            timeout: API_TIMEOUT,
            headers: { 'User-Agent': USER_AGENT },
        });
        return res.status === 200 ? res : null;
    } catch {
        // Silent fail
    }
    return null;
}

// Stream saving
async function saveStream(stream, outputPath) {
    const ws = createWriteStream(outputPath);
    stream.data.pipe(ws);
    return new Promise((resolve, reject) => {
        ws.on('finish', resolve);
        ws.on('error', reject);
    });
}

// FFmpeg watermark removal
async function removeWatermark(input, output) {
    const filter = `delogo=x=${DELOGO.x}:y=${DELOGO.y}:w=${DELOGO.w}:h=${DELOGO.h}`;
    const cmd = `ffmpeg -i "${input}" -vf "${filter}" -c:a copy "${output}" -y`;

    return new Promise((resolve, reject) => {
        exec(cmd, { timeout: FFMPEG_TIMEOUT }, (err) => {
            safeDelete(input);
            if (err) {
                safeDelete(output);
                reject(new Error('FFmpeg processing failed'));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Download video from Sora
 * @param {string} url - Video URL or ID
 * @param {object} options - Optional config
 * @returns {Promise<{buffer: Buffer, filename: string, size: string, source: number, delogoApplied: boolean}>}
 */
export async function downloadVideo(url, options = {}) {
    const { token = '', cookies = '' } = options;

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error('Invalid video URL or code');
    }

    const hash = generateHash();
    const tmpPath = tmpdir();
    const inputPath = join(tmpPath, `${hash}_in.mp4`);
    const outputPath = join(tmpPath, `${hash}_out.mp4`);

    try {
        let stream = null;
        let source = Source.NONE;
        let needsProcessing = false;

        // Try CDN proxy first (no watermark)
        stream = await fromCdnProxy(videoId, hash);
        if (stream) {
            source = Source.CDN_PROXY;
        }

        // Try Sora API
        if (!stream) {
            const result = await fromSoraApi(videoId, token, cookies);
            if (result) {
                stream = result.response;
                source = Source.SORA_API;
                needsProcessing = result.needsProcessing;
            }
        }

        // Try OpenAI CDN
        if (!stream) {
            stream = await fromOpenAiCdn(videoId);
            if (stream) source = Source.OPENAI_CDN;
        }

        if (!stream) {
            throw new Error('Video source unavailable');
        }

        await saveStream(stream, inputPath);

        let buffer;
        if (needsProcessing) {
            await removeWatermark(inputPath, outputPath);
            buffer = readFileSync(outputPath);
            safeDelete(outputPath);
        } else {
            buffer = readFileSync(inputPath);
            safeDelete(inputPath);
        }

        // Check Telegram file size limit
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error(`Video too large for Telegram (${formatSize(buffer.length)} > 50 MB)`);
        }

        return {
            buffer,
            filename: `${videoId}_HD.mp4`,
            size: formatSize(buffer.length),
            source,
            delogoApplied: needsProcessing,
        };
    } catch (err) {
        safeDelete(inputPath);
        safeDelete(outputPath);
        throw err;
    }
}

/**
 * Get source name
 */
export function getSourceName(source) {
    switch (source) {
        case Source.CDN_PROXY:
            return 'CDN Proxy (No Watermark)';
        case Source.SORA_API:
            return 'Sora API';
        case Source.OPENAI_CDN:
            return 'OpenAI CDN';
        default:
            return 'Unknown';
    }
}
