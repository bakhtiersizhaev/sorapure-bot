# SoraPure Bot

Telegram bot for downloading OpenAI Sora2 videos without watermark.

**[@sorapure_bot](https://t.me/sorapure_bot)** — Try it now!

![Before & After](preview.jpg)

## Features

- Download Sora2 videos without watermark
- Multiple fallback sources (CDN Proxy → Sora API → OpenAI CDN)
- Automatic watermark removal via FFmpeg (if needed)
- Simple interface - just send a link

## Installation

```bash
# Clone
git clone https://github.com/bakhtiersizhaev/sorapure-bot.git
cd sorapure-bot

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env and add your BOT_TOKEN

# Run
npm start
```

## Configuration (.env)

```env
# Required: Get token from @BotFather
BOT_TOKEN=your_bot_token_here

# Optional: Sora API credentials (fallback)
SORA_BEARER_TOKEN=
SORA_COOKIES=
```

## Getting Bot Token

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy the token to `.env`

## Usage

Send the bot a Sora video link:

- `https://sora.chatgpt.com/p/s_xxxxx`
- Or just the code: `s_xxxxx`

The bot will download and send the video without watermark.

## Commands

| Command  | Description        |
| -------- | ------------------ |
| `/start` | Welcome message    |
| `/help`  | Usage instructions |

## Project Structure

```
sorapure-bot/
├── src/
│   ├── bot.js          # Main bot logic
│   └── downloader.js   # Video download module
├── .env.example        # Configuration template
├── .gitignore
├── eslint.config.js    # ESLint config
├── .prettierrc         # Prettier config
├── package.json
└── README.md
```

## Requirements

- Node.js 18+
- FFmpeg (optional, for watermark removal fallback)

## Development

```bash
# Run with auto-reload
npm run dev

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

## Related

- [SoraPure Web](https://sorapure.vercel.app) - Web version (live)
- [GitHub: sorapure](https://github.com/bakhtiersizhaev/sorapure) - Web source code

## License

MIT

## Author

**[Bakhtier Sizhaev](https://t.me/bakhtier_sizhaev)** (AI2KEY)
