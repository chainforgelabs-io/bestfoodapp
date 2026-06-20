# Social Upload — Assets & Account Setup

This guide is for Carson. The coding agent builds the portal infrastructure; these items are supplied/configured on your side.

## When: Card assets (needed to generate cards)

**Provide before testing card generation (Milestone 2 visuals).**

### 1. `badge.png` (required)
- The circular score badge from your Canva design
- **Remove** any placeholder text ("Rating get generated here") — the app draws the score
- Transparent background, high resolution (>=640px square recommended)
- Save to: `backend/assets/social/badge.png`

### 2. `score-font.ttf` (required)
- The stylized font used for the score number in the final design (the `81` look)
- **Not** the Canva placeholder font
- Save to: `backend/assets/social/score-font.ttf`

### 3. `border.png` (optional)
- If the thin full-card frame in your design is part of the template, export it as a 1080x1350 transparent PNG
- Save to: `backend/assets/social/border.png`
- If you skip this, cards render without the outer border

### Layout tuning
After dropping assets in, tune `backend/lib/social/cardLayout.js`:
- `badge.size` (default 300px)
- `badge.marginRight` / `marginTop` (default 48px)
- `score.fontSize` (default 130)

---

## When: Instagram (needed to publish live)

**Set up when the portal UI works and you want real posts.**

1. Convert your brand Instagram account to **Business** or **Creator**
2. Link it to a **Facebook Page**
3. Create a **Meta Developer App** at developers.facebook.com
4. Add Instagram product; request permissions:
   - `instagram_business_basic`
   - `instagram_business_content_publish`
5. Generate a **long-lived access token** (60-day expiry; cron refreshes it)
6. Add these env vars (local `.env` + Vercel project settings):

```
IG_BUSINESS_ACCOUNT_ID=your_ig_business_account_id
META_LONG_LIVED_TOKEN=your_long_lived_token
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

Works in Meta **dev mode** for your own brand account — no Advanced Access / app review needed for v1.

---

## When: X / Twitter (fast-follow)

**Set up when you want X publishing (after Instagram works).**

1. Create a project/app at developer.twitter.com
2. Enable OAuth 1.0a with read + write permissions
3. Generate Access Token & Secret for your brand account
4. Add env vars:

```
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

**Link placement:** By default, `bestfoodapp.com` is stripped from the post body (cheaper; link-in-reply pattern). Caption template can still mention the site in Instagram posts.

---

## Optional: Unified API swap (Ayrshare)

If you prefer not to manage Meta/X tokens yourself:
- Set `AYRSHARE_API_KEY` and swap the publisher implementation (one-file change in `lib/social/publishers/`)
- IG/X env vars above become unnecessary
