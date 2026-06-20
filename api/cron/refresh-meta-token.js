/**
 * Vercel Cron: refresh Meta long-lived token (~monthly).
 * GET /api/cron/refresh-meta-token
 *
 * Requires META_LONG_LIVED_TOKEN, META_APP_ID, META_APP_SECRET.
 * Updates META_LONG_LIVED_TOKEN in env — on Vercel you must also update
 * the project env var manually or via Vercel API after this runs.
 * This endpoint returns the new token in the response for manual rotation.
 */

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  const token = process.env.META_LONG_LIVED_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!token || !appId || !appSecret) {
    return res.status(503).json({
      message: "Meta token refresh not configured",
      missing: {
        META_LONG_LIVED_TOKEN: !token,
        META_APP_ID: !appId,
        META_APP_SECRET: !appSecret,
      },
    });
  }

  try {
    const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", token);

    const refreshRes = await fetch(url.toString());
    const data = await refreshRes.json();

    if (!refreshRes.ok) {
      return res.status(502).json({
        message: "Meta token refresh failed",
        error: data.error || data,
      });
    }

    return res.json({
      message:
        "Token refreshed. Update META_LONG_LIVED_TOKEN in Vercel env with the new access_token.",
      access_token: data.access_token,
      expires_in: data.expires_in,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("meta token refresh", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
