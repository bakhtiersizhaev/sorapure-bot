// SoraPure Bot - SERVICE DISCONTINUED
// December 2025: OpenAI patched all methods

import 'dotenv/config';
import { Bot } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('Error: BOT_TOKEN is required');
    process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ═══════════════════════════════════════════════════════════════
// Shutdown Messages
// ═══════════════════════════════════════════════════════════════

const MESSAGE_RU = `⚠️ SoraPure больше не работает.

🔒 Что произошло?
OpenAI перенесли все видео Sora на защищённые серверы Azure (Microsoft). Теперь система работает так:

• Бесплатные аккаунты — все видео только с водяным знаком
• Платные аккаунты (Pro) — без водяного знака, но только свои собственные видео

API проверяет:
→ is_owner: true + подписка Pro → есть доступ ✅
→ is_owner: false (чужое видео) → водяной знак ❌
→ Бесплатный аккаунт → водяной знак ❌

Мы исследовали все методы — обойти это ограничение на данный момент невозможно.

Если найдём способ — вернём сервис в работу и сообщим!

Спасибо, что пользовались сервисом! 🙏

— @bakhtier_sizhaev | @ai2key`;

const MESSAGE_EN = `⚠️ SoraPure no longer works.

🔒 What happened?
OpenAI moved all Sora videos to protected Azure (Microsoft) servers. Now the system works like this:

• Free accounts — all videos have watermark only
• Paid accounts (Pro) — watermark-free, but only your own videos

API checks:
→ is_owner: true + Pro subscription → access granted ✅
→ is_owner: false (someone's video) → watermarked ❌
→ Free account → watermarked ❌

We've researched all methods — bypassing this restriction is not possible at this time.

If we find a way — we'll bring the service back and let you know!

Thank you for using the service! 🙏

— @bakhtier_sizhaev | @ai2key`;

// ═══════════════════════════════════════════════════════════════
// Language Selection
// ═══════════════════════════════════════════════════════════════

function langKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
                { text: '🇺🇸 English', callback_data: 'lang:en' },
            ],
        ],
    };
}

// ═══════════════════════════════════════════════════════════════
// Handlers - All show shutdown message
// ═══════════════════════════════════════════════════════════════

// /start - Show language selection then shutdown message
bot.command('start', async (ctx) => {
    await ctx.reply('🌐 Choose language / Выберите язык:', {
        reply_markup: langKeyboard()
    });
});

// Language selection callback
bot.callbackQuery(/^lang:(.+)$/, async (ctx) => {
    const lang = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage().catch(() => { });

    if (lang === 'ru') {
        await ctx.reply(MESSAGE_RU);
    } else {
        await ctx.reply(MESSAGE_EN);
    }
});

// /help
bot.command('help', async (ctx) => {
    await ctx.reply('🌐 Choose language / Выберите язык:', {
        reply_markup: langKeyboard()
    });
});

// Any text message - show shutdown message
bot.on('message:text', async (ctx) => {
    // Try to detect Russian
    const text = ctx.message.text;
    const isRussian = /[а-яА-ЯёЁ]/.test(text);

    if (isRussian) {
        await ctx.reply(MESSAGE_RU);
    } else {
        await ctx.reply(MESSAGE_EN);
    }
});

// ═══════════════════════════════════════════════════════════════
// Error Handler & Start
// ═══════════════════════════════════════════════════════════════

bot.catch((err) => {
    console.error('Bot error:', err.message);
});

console.log('🤖 SoraPure Bot starting (SHUTDOWN MODE)...');
bot.start({
    onStart: (botInfo) => {
        console.log(`⚠️ @${botInfo.username} is running in SHUTDOWN MODE`);
    },
});
