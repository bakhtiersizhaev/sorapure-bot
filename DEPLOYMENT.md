# Deployment Info

## Railway (Bot)

**Project:** FINAL
**Service:** FINAL
**Environment:** production

### IDs (for CLI)
- Project: `c8ff3314-9fa4-4478-9d0c-1356d62cac48`
- Environment: `8aee059e-a1ee-45ca-b10f-2bc68d58e417`
- Service: `ac0e8a5a-07fa-4fa2-93ea-eecfd5ece847`

### Deploy
```bash
cd d:/projects/sorapure-bot
railway link  # Select: FINAL > production > FINAL
railway variables --set "BOT_TOKEN=your_token_here"
railway up
```

### Environment Variables
```bash
railway variables --set "BOT_TOKEN=xxx"
railway variables --set "SORA_BEARER_TOKEN=xxx"  # optional
railway variables --set "SORA_COOKIES=xxx"       # optional
```

## Vercel (Website)

**Project:** sora2dl-main
**URL:** https://sorapure.vercel.app

### Deploy
```bash
cd d:/projects/sora2dl-main/sora2dl-main
vercel --prod
```

## GitHub Repos

- Bot: https://github.com/bakhtiersizhaev/sorapure-bot
- Website: https://github.com/bakhtiersizhaev/sorapure
