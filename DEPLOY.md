# Deploying the ErgoNames frontend (Cloudflare Pages)

The mint flow runs entirely in the browser (Nautilus signs there). The app
holds no server secrets; the bot token below is public by design (it ships in
the bundle — the bot API is rate-limited and input-validated to be safe to call
openly).

## Cloudflare Pages setup (one time)
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git →
   select `ergonames/ergonames-nextjs`.
2. Build settings:
   - Framework preset: **Next.js**
   - Build command: `npx @cloudflare/next-on-pages@1`
   - Build output directory: `.vercel/output/static`
   - Node version: set env `NODE_VERSION = 20`
3. Environment variables (Production + Preview):
   - `NEXT_PUBLIC_API_URL = https://api.ergonames.io`
   - `NEXT_PUBLIC_BOT_URL = https://bot.ergonames.io`
   - `NEXT_PUBLIC_BOT_TOKEN = <set NEXT_PUBLIC_BOT_TOKEN in Cloudflare Pages env — do not commit the literal>`
   - `NODE_VERSION = 20`
4. Deploy. Then Custom domains → add `app.ergonames.io` (Cloudflare adds the
   CNAME automatically if the zone is on Cloudflare).

## DNS (ergonames.io zone)
Point these at the Linode so Caddy can issue TLS and the browser can reach the
APIs:
- `api`  A  172.104.33.200
- `bot`  A  172.104.33.200
- `app`  CNAME  <your-pages-project>.pages.dev   (or auto via Pages custom domain)

The mint page lives at `app.ergonames.io/mint`.
