# Rakumi Data — landing page + tracking admin

Static landing page with a few Vercel serverless functions for tracking, and
Upstash Redis (free tier) for storage. There are no npm dependencies.

```
index.html          landing page (inline CSS/JS)
admin/index.html    admin dashboard  → /admin
api/track.js        records page views
api/go.js           /go/mtn|airtel|glo → counts the click, redirects to the offer link
api/config.js       public page data (testimonials, counts, price line)
api/admin/*         login, stats, settings (admin only)
img/                optimised images + og.jpg (WhatsApp/Facebook preview)
scripts/dev.js      local preview server (not deployed)
```



## Run locally

```
npm run dev        # http://localhost:3000  and  http://localhost:3000/admin
```

Locally, stats are kept in memory and reset when you stop the server.

## Deploy to Vercel (free)

1. Push this folder to GitHub, then **Import** it at vercel.com/new.
   Or run `vercel` from this folder. Framework preset: **Other**. No build command.
2. In the project, go to **Storage → Create / Connect → Upstash for Redis** (free plan).
   Connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. Go to **Settings → Environment Variables** and set your own login:
   - `ADMIN_USER` = your username
   - `ADMIN_PASS` = a strong password
   - `ADMIN_SECRET` = any long random string (signs login sessions)
4. **Redeploy** so the variables take effect.
5. Open `https://your-site.vercel.app/admin`, sign in, then paste your MTN, Airtel and Glo offer links under **Campaign settings**.

If you skip step 3, the built-in login is `admin` / `Rakumi@2026` (in `api/_lib/auth.js`).
Change it before you share the site.

## Tracking tips

- Add `?src=facebook`, `?src=tiktok`, `?src=whatsapp` and so on to the links you share.
  The admin dashboard will show visits and clicks per source.
  `utm_source`, `fbclid`, `ttclid` and `gclid` are detected automatically.
- Offer links can contain `{clickid}` and `{source}`. They are filled in on every click,
  so a postback or sub-ID report from your CPA network can be matched to the
  **Click ID** column in the admin.
- Bots and link-preview crawlers (WhatsApp, Facebook) are not counted.
- A button whose network has no link yet sends visitors back to the page with an
  "opens shortly" notice, so no click is lost to a dead link.
# rakumidata
