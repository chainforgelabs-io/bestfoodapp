# Social Upload — Assets & Account Setup

Operator checklist for card assets and social publishing credentials. Application code lives under `backend/lib/social/` and `backend/routes/social.js`.

## Card assets (required to generate cards)

Provide these before testing card generation.

### 1. `badge.svg` (required)
- The circular score badge
- **Remove** any placeholder text — the app draws the score with chromatic aberration styling
- Transparent background (black in the source file is treated as transparent when compositing)
- Save to: `backend/assets/social/badge.svg`

### 2. `score-font.ttf` (optional)
- **Pacifico Regular** — stylized score number font
- If omitted, the app uses Impact with cyan/red chromatic aberration shadows
- Save to: `backend/assets/social/score-font.ttf`

### 3. `border.png` (optional)
- If the thin full-card frame in your design is part of the template, export it as a 1080x1350 transparent PNG
- Save to: `backend/assets/social/border.png`
- If you skip this, cards render without the outer border

### Layout tuning
After dropping assets in, tune `backend/lib/social/cardLayout.js`:
- `badge.size` (default 300px)
- `badge.marginRight` / `marginTop` (default 48px)
- `score.fontSize` / ratio fields for digit count

---

## Instagram (needed to publish live)

1. Convert the brand Instagram account to **Business** or **Creator**
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

Works in Meta **dev mode** for the brand account — Advanced Access / app review not required for a single-account demo.

---

## X / Twitter (optional)

1. Create a project/app at developer.twitter.com
2. Enable OAuth 1.0a with read + write permissions
3. Generate Access Token & Secret for the brand account
4. Add env vars:

```
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

**Link placement:** By default, `bestfoodapp.com` is stripped from the post body (cheaper; link-in-reply pattern). Caption templates can still mention the site on Instagram.

---

## Optional: Unified API swap (Ayrshare)

If you prefer not to manage Meta/X tokens directly:
- Set `AYRSHARE_API_KEY` and swap the publisher implementation (one-file change in `lib/social/publishers/`)
- IG/X env vars above become unnecessary
