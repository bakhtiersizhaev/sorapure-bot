import 'dotenv/config';
import { Bot, InputFile } from 'grammy';
import { downloadVideo, extractVideoId, getSourceName } from './downloader.js';

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const SORA_TOKEN = process.env.SORA_BEARER_TOKEN || '';
const SORA_COOKIES = process.env.SORA_COOKIES || '';

if (!BOT_TOKEN) {
    console.error('Error: BOT_TOKEN is required in .env file');
    process.exit(1);
}

// Create bot
const bot = new Bot(BOT_TOKEN);

// Escape MarkdownV2 special characters
const escapeMarkdown = (text) => text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

// Messages
const MESSAGES = {
    start: `🎬 *SoraPure Bot*

Скачивай видео из OpenAI Sora2 без водяного знака\\!

*Как использовать:*
Отправь ссылку на видео или код:
• sora\\.chatgpt\\.com/p/s\\_xxxxx
• s\\_xxxxx

—
🌐 Веб: sorapure\\.vercel\\.app
👤 Автор: @bakhtier\\_sizhaev`,

    help: `*Помощь*

Просто отправь мне ссылку на видео из Sora:
sora\\.chatgpt\\.com/p/s\\_xxxxx

Или только код видео:
s\\_xxxxx

Я скачаю видео без водяного знака и отправлю тебе\\!`,

    invalidUrl: '❌ Неверная ссылка\\. Отправь ссылку вида:\nsora\\.chatgpt\\.com/p/s\\_xxxxx',
    downloading: '⏳ Скачиваю видео...',
    error: '❌ Ошибка: ',
};

// Handlers
bot.command('start', async (ctx) => {
    await ctx.reply(MESSAGES.start, { parse_mode: 'MarkdownV2' });
});

bot.command('help', async (ctx) => {
    await ctx.reply(MESSAGES.help, { parse_mode: 'MarkdownV2' });
});

// Handle video URL/code
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    console.log(`📩 Received: "${text}"`);

    const videoId = extractVideoId(text);
    console.log(`🎬 Video ID: ${videoId}`);

    if (!videoId) {
        await ctx.reply(MESSAGES.invalidUrl, { parse_mode: 'MarkdownV2' });
        return;
    }

    // Send "downloading" status
    const statusMsg = await ctx.reply(MESSAGES.downloading);
    console.log(`⏳ Downloading video: ${videoId}`);

    try {
        const result = await downloadVideo(text, {
            token: SORA_TOKEN,
            cookies: SORA_COOKIES,
        });

        console.log(`✅ Downloaded: ${result.filename} (${result.size})`);

        // Delete status message
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

        // Send video
        const caption = `✅ *${escapeMarkdown(result.filename)}*\n📦 Размер: ${escapeMarkdown(result.size)}\n🔗 Источник: ${escapeMarkdown(getSourceName(result.source))}${result.delogoApplied ? '\n🎨 Водяной знак удалён' : ''}`;
        await ctx.replyWithVideo(new InputFile(result.buffer, result.filename), {
            caption,
            parse_mode: 'MarkdownV2',
        });
        console.log(`📤 Video sent!`);
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        // Update status message with error
        await ctx.api
            .editMessageText(ctx.chat.id, statusMsg.message_id, `${MESSAGES.error}${err.message}`)
            .catch(() => {});
    }
});

// Error handler
bot.catch((err) => {
    console.error('Bot error:', err);
});

// Start bot
console.log('🤖 SoraPure Bot starting...');
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} is running!`);
    },
});
