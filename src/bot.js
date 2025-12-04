// Suppress punycode deprecation warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) return;
    console.warn(warning);
});

import 'dotenv/config';
import { Bot, InputFile } from 'grammy';
import { downloadVideo, extractVideoId } from './downloader.js';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
const SORA_TOKEN = process.env.SORA_BEARER_TOKEN || '';
const SORA_COOKIES = process.env.SORA_COOKIES || '';
const REQUIRED_CHANNEL = '@ai2key';
const CHANNEL_LINK = 'https://t.me/ai2key';

if (!BOT_TOKEN) {
    console.error('Error: BOT_TOKEN is required');
    process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ═══════════════════════════════════════════════════════════════
// User Storage (in-memory)
// ═══════════════════════════════════════════════════════════════

const users = new Map(); // userId -> { lang, onboarded }

function getUser(userId) {
    if (!users.has(userId)) {
        users.set(userId, { lang: null, onboarded: false });
    }
    return users.get(userId);
}

// ═══════════════════════════════════════════════════════════════
// Localization
// ═══════════════════════════════════════════════════════════════

const LANGS = {
    en: { flag: '🇺🇸', name: 'English' },
    ru: { flag: '🇷🇺', name: 'Русский' },
    zh: { flag: '🇨🇳', name: '中文' },
    es: { flag: '🇪🇸', name: 'Español' },
};

const i18n = {
    en: {
        chooseLang: '🌐 Choose your language:',
        subscribeTitle: '📢 Subscribe to continue',
        subscribeText: 'To use the bot, please subscribe to our channel first.',
        subscribeBtn: '📢 Subscribe',
        checkBtn: '✅ Check',
        notSubscribed: '❌ You are not subscribed yet. Please subscribe and try again.',
        welcome: `🎬 *SoraPure*

Download Sora2 videos without watermark\\.

*How to use:*
Send a video link or code:
• sora\\.chatgpt\\.com/p/s\\_xxxxx
• s\\_xxxxx`,
        invalidUrl: '❌ Invalid link\\. Send a Sora video link\\.',
        downloading: '⏳ Downloading...',
        error: '❌ Error: ',
        success: '✅',
        size: 'Size',
        source: 'Source',
        watermarkRemoved: '🎨 Watermark removed',
        author: '—\n👤 Author: @bakhtier\\_sizhaev \\| @ai2key',
        help: `*How to use:*

Send a Sora video link:
sora\\.chatgpt\\.com/p/s\\_xxxxx

Or just the video code:
s\\_xxxxx`,
        langChanged: '✅ Language changed to English',
    },
    ru: {
        chooseLang: '🌐 Выберите язык:',
        subscribeTitle: '📢 Подпишитесь для продолжения',
        subscribeText: 'Чтобы использовать бота, сначала подпишитесь на наш канал.',
        subscribeBtn: '📢 Подписаться',
        checkBtn: '✅ Проверить',
        notSubscribed: '❌ Вы ещё не подписаны. Подпишитесь и попробуйте снова.',
        welcome: `🎬 *SoraPure*

Скачивай видео из Sora2 без водяного знака\\.

*Как использовать:*
Отправь ссылку или код видео:
• sora\\.chatgpt\\.com/p/s\\_xxxxx
• s\\_xxxxx`,
        invalidUrl: '❌ Неверная ссылка\\. Отправь ссылку на видео Sora\\.',
        downloading: '⏳ Скачиваю...',
        error: '❌ Ошибка: ',
        success: '✅',
        size: 'Размер',
        source: 'Источник',
        watermarkRemoved: '🎨 Водяной знак удалён',
        author: '—\n👤 Автор: @bakhtier\\_sizhaev \\| @ai2key',
        help: `*Как использовать:*

Отправь ссылку на видео Sora:
sora\\.chatgpt\\.com/p/s\\_xxxxx

Или только код видео:
s\\_xxxxx`,
        langChanged: '✅ Язык изменён на Русский',
    },
    zh: {
        chooseLang: '🌐 选择语言:',
        subscribeTitle: '📢 订阅以继续',
        subscribeText: '要使用机器人，请先订阅我们的频道。',
        subscribeBtn: '📢 订阅',
        checkBtn: '✅ 检查',
        notSubscribed: '❌ 您尚未订阅。请订阅后重试。',
        welcome: `🎬 *SoraPure*

下载无水印的 Sora2 视频。

*使用方法:*
发送视频链接或代码:
• sora\\.chatgpt\\.com/p/s\\_xxxxx
• s\\_xxxxx`,
        invalidUrl: '❌ 无效链接。请发送 Sora 视频链接。',
        downloading: '⏳ 下载中...',
        error: '❌ 错误: ',
        success: '✅',
        size: '大小',
        source: '来源',
        watermarkRemoved: '🎨 水印已移除',
        author: '—\n👤 作者: @bakhtier\\_sizhaev \\| @ai2key',
        help: `*使用方法:*

发送 Sora 视频链接:
sora\\.chatgpt\\.com/p/s\\_xxxxx

或仅发送视频代码:
s\\_xxxxx`,
        langChanged: '✅ 语言已更改为中文',
    },
    es: {
        chooseLang: '🌐 Elige tu idioma:',
        subscribeTitle: '📢 Suscríbete para continuar',
        subscribeText: 'Para usar el bot, primero suscríbete a nuestro canal.',
        subscribeBtn: '📢 Suscribirse',
        checkBtn: '✅ Verificar',
        notSubscribed: '❌ Aún no estás suscrito. Por favor suscríbete e intenta de nuevo.',
        welcome: `🎬 *SoraPure*

Descarga videos de Sora2 sin marca de agua\\.

*Cómo usar:*
Envía un enlace o código de video:
• sora\\.chatgpt\\.com/p/s\\_xxxxx
• s\\_xxxxx`,
        invalidUrl: '❌ Enlace inválido\\. Envía un enlace de video de Sora\\.',
        downloading: '⏳ Descargando...',
        error: '❌ Error: ',
        success: '✅',
        size: 'Tamaño',
        source: 'Fuente',
        watermarkRemoved: '🎨 Marca de agua eliminada',
        author: '—\n👤 Autor: @bakhtier\\_sizhaev \\| @ai2key',
        help: `*Cómo usar:*

Envía un enlace de video de Sora:
sora\\.chatgpt\\.com/p/s\\_xxxxx

O solo el código del video:
s\\_xxxxx`,
        langChanged: '✅ Idioma cambiado a Español',
    },
};

function t(userId, key) {
    const user = getUser(userId);
    const lang = user.lang || 'en';
    return i18n[lang][key] || i18n.en[key];
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const escapeMarkdown = (text) => text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper - retries a function with delay
async function withRetry(fn, options = {}) {
    const { maxAttempts = 3, delay = 2000, shouldRetry = () => true, label = 'operation' } = options;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            // Check if we should retry this error
            if (!shouldRetry(err)) {
                console.log(`🚫 ${label}: Not retrying - ${err.message}`);
                throw err;
            }

            if (attempt < maxAttempts) {
                console.log(`🔄 ${label}: Attempt ${attempt}/${maxAttempts} failed - ${err.message}. Retrying in ${delay / 1000}s...`);
                await sleep(delay);
            } else {
                console.log(`💥 ${label}: All ${maxAttempts} attempts failed`);
            }
        }
    }
    throw lastError;
}

// Errors that should NOT be retried (permanent failures)
const permanentErrors = [
    'Invalid video URL',
    'Video source unavailable',
    'too large',
    'not found',
];

function shouldRetryError(err) {
    const msg = err.message?.toLowerCase() || '';
    return !permanentErrors.some((pe) => msg.includes(pe.toLowerCase()));
}

async function checkSubscription(ctx) {
    try {
        const member = await ctx.api.getChatMember(REQUIRED_CHANNEL, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// Keyboards
// ═══════════════════════════════════════════════════════════════

function langKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🇺🇸 English', callback_data: 'lang:en' },
                { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
            ],
            [
                { text: '🇨🇳 中文', callback_data: 'lang:zh' },
                { text: '🇪🇸 Español', callback_data: 'lang:es' },
            ],
        ],
    };
}

function subscribeKeyboard(userId) {
    return {
        inline_keyboard: [
            [{ text: t(userId, 'subscribeBtn'), url: CHANNEL_LINK }],
            [{ text: t(userId, 'checkBtn'), callback_data: 'check_sub' }],
        ],
    };
}

// ═══════════════════════════════════════════════════════════════
// Onboarding Flow
// ═══════════════════════════════════════════════════════════════

async function showLanguageSelection(ctx) {
    const text = '🌐 Choose your language / Выберите язык:';
    await ctx.reply(text, { reply_markup: langKeyboard() });
}

async function showSubscriptionRequest(ctx) {
    const userId = ctx.from.id;
    const title = t(userId, 'subscribeTitle');
    const text = t(userId, 'subscribeText');
    await ctx.reply(`*${escapeMarkdown(title)}*\n\n${escapeMarkdown(text)}`, {
        parse_mode: 'MarkdownV2',
        reply_markup: subscribeKeyboard(userId),
    });
}

async function showWelcome(ctx) {
    const userId = ctx.from.id;
    const welcome = t(userId, 'welcome');
    const author = t(userId, 'author');
    await ctx.reply(`${welcome}\n\n${author}`, { parse_mode: 'MarkdownV2' });
}

// ═══════════════════════════════════════════════════════════════
// Handlers
// ═══════════════════════════════════════════════════════════════

// /start - Begin onboarding
bot.command('start', async (ctx) => {
    const user = getUser(ctx.from.id);

    // New user - show language selection
    if (!user.lang) {
        await showLanguageSelection(ctx);
        return;
    }

    // Has language but not subscribed - check and show
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
        await showSubscriptionRequest(ctx);
        return;
    }

    // Fully onboarded - show welcome
    user.onboarded = true;
    await showWelcome(ctx);
});

// /help
bot.command('help', async (ctx) => {
    const user = getUser(ctx.from.id);
    if (!user.onboarded) {
        await ctx.reply('Please complete /start first.');
        return;
    }
    await ctx.reply(t(ctx.from.id, 'help'), { parse_mode: 'MarkdownV2' });
});

// /lang - Change language
bot.command('lang', async (ctx) => {
    await showLanguageSelection(ctx);
});

// Language selection callback
bot.callbackQuery(/^lang:(.+)$/, async (ctx) => {
    const lang = ctx.match[1];
    if (!LANGS[lang]) {
        await ctx.answerCallbackQuery('Invalid language');
        return;
    }

    const user = getUser(ctx.from.id);
    user.lang = lang;

    await ctx.answerCallbackQuery(t(ctx.from.id, 'langChanged'));
    await ctx.deleteMessage().catch(() => {});

    // Check subscription
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
        await showSubscriptionRequest(ctx);
        return;
    }

    // Fully onboarded
    user.onboarded = true;
    await showWelcome(ctx);
});

// Check subscription callback
bot.callbackQuery('check_sub', async (ctx) => {
    const isSubscribed = await checkSubscription(ctx);

    if (!isSubscribed) {
        await ctx.answerCallbackQuery({ text: t(ctx.from.id, 'notSubscribed'), show_alert: true });
        return;
    }

    const user = getUser(ctx.from.id);
    user.onboarded = true;

    await ctx.answerCallbackQuery('✅');
    await ctx.deleteMessage().catch(() => {});
    await showWelcome(ctx);
});

// ═══════════════════════════════════════════════════════════════
// Video Download Handler
// ═══════════════════════════════════════════════════════════════

// Active downloads tracking
const activeDownloads = new Map(); // odId -> { startTime, videoId }

bot.on('message:text', async (ctx) => {
    const user = getUser(ctx.from.id);
    const text = ctx.message.text;
    const userId = ctx.from.id;

    // Not onboarded - redirect to /start
    if (!user.lang) {
        await showLanguageSelection(ctx);
        return;
    }

    // Check subscription
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
        await showSubscriptionRequest(ctx);
        return;
    }

    user.onboarded = true;

    // Extract video ID
    const videoId = extractVideoId(text);
    if (!videoId) {
        await ctx.reply(t(userId, 'invalidUrl'), { parse_mode: 'MarkdownV2' });
        return;
    }

    // Check if user already has active download
    if (activeDownloads.has(userId)) {
        const active = activeDownloads.get(userId);
        const elapsed = Math.round((Date.now() - active.startTime) / 1000);
        console.log(`⚠️ ${userId}: Already downloading ${active.videoId} (${elapsed}s ago)`);
        await ctx.reply('⏳ Please wait, your previous download is still in progress...');
        return;
    }

    // Start download
    const startTime = Date.now();
    activeDownloads.set(userId, { startTime, videoId });

    const statusMsg = await ctx.reply(t(userId, 'downloading'));
    console.log(`⏳ ${userId}: START download ${videoId}`);

    try {
        // Step 1: Download video with retry
        console.log(`📥 ${userId}: Fetching video from CDN...`);

        const result = await withRetry(
            () =>
                downloadVideo(text, {
                    token: SORA_TOKEN,
                    cookies: SORA_COOKIES,
                }),
            {
                maxAttempts: 3,
                delay: 2000,
                shouldRetry: shouldRetryError,
                label: `${userId} CDN`,
            }
        );

        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`📦 ${userId}: Downloaded ${result.filename} (${result.size}) in ${downloadTime}s`);

        // Step 2: Delete status message
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

        // Step 3: Send video to user with retry
        console.log(`📤 ${userId}: Sending video to Telegram...`);
        const sendStartTime = Date.now();

        let caption = `${t(userId, 'success')} *${escapeMarkdown(result.filename)}*`;
        caption += `\n📦 ${t(userId, 'size')}: ${escapeMarkdown(result.size)}`;

        const sentMessage = await withRetry(
            () =>
                ctx.replyWithVideo(new InputFile(result.buffer, result.filename), {
                    caption,
                    parse_mode: 'MarkdownV2',
                }),
            {
                maxAttempts: 2,
                delay: 3000,
                shouldRetry: shouldRetryError,
                label: `${userId} TG Upload`,
            }
        );

        // Step 4: Verify send success
        const sendTime = ((Date.now() - sendStartTime) / 1000).toFixed(1);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (sentMessage && sentMessage.video) {
            console.log(`✅ ${userId}: SENT ${result.filename} | Download: ${downloadTime}s | Upload: ${sendTime}s | Total: ${totalTime}s | TG file_id: ${sentMessage.video.file_id.slice(0, 20)}...`);
        } else {
            console.log(`⚠️ ${userId}: Video sent but no confirmation | Total: ${totalTime}s`);
        }

    } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`❌ ${userId}: FAILED ${videoId} after ${elapsed}s | Error: ${err.message}`);

        // Try to update status message with error
        try {
            await ctx.api.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                `${t(userId, 'error')}${err.message}`
            );
        } catch {
            // If edit fails, send new message
            await ctx.reply(`${t(userId, 'error')}${err.message}`).catch(() => {});
        }
    } finally {
        // Always remove from active downloads
        activeDownloads.delete(userId);
        console.log(`🏁 ${userId}: Download session ended for ${videoId}`);
    }
});

// ═══════════════════════════════════════════════════════════════
// Error Handler & Start
// ═══════════════════════════════════════════════════════════════

bot.catch((err) => {
    console.error('Bot error:', err.message);
});

console.log('🤖 SoraPure Bot starting...');
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ @${botInfo.username} is running`);
    },
});
