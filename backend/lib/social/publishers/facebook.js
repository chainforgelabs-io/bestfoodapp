/**
 * Facebook Page photo publishing (v1).
 *
 * Reuses the same Meta app/token infrastructure as Instagram. You need a Page
 * access token; if only a long-lived USER token is configured, we exchange it
 * for the Page token via /me/accounts at publish time.
 *
 * Env:
 *   FB_PAGE_ID            - target Facebook Page id (required)
 *   FB_PAGE_ACCESS_TOKEN  - Page access token (preferred), OR
 *   META_LONG_LIVED_TOKEN - long-lived user token (fallback; auto-exchanged)
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function resolvePageToken(pageId) {
  const direct = process.env.FB_PAGE_ACCESS_TOKEN;
  if (direct) return direct;

  const userToken = process.env.META_LONG_LIVED_TOKEN;
  if (!userToken) {
    throw new Error("Facebook credentials are not configured");
  }

  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,access_token&access_token=${encodeURIComponent(
      userToken
    )}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch Facebook Page token");
  }
  const page = (data.data || []).find((p) => p.id === pageId);
  if (!page?.access_token) {
    throw new Error("FB_PAGE_ID not found among managed Pages");
  }
  return page.access_token;
}

/** @type {import('../SocialPublisher').SocialPublisher} */
const facebookPublisher = {
  platform: "facebook",

  async publish({ imageUrl, caption }) {
    const pageId = process.env.FB_PAGE_ID;
    if (!pageId) {
      throw new Error("FB_PAGE_ID is not configured");
    }
    const pageToken = await resolvePageToken(pageId);

    const body = new URLSearchParams({
      url: imageUrl,
      caption: caption || "",
      published: "true",
      access_token: pageToken,
    });

    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to publish Facebook photo");
    }

    const postId = data.post_id || data.id;
    const permalink = postId
      ? `https://www.facebook.com/${postId}`
      : null;
    return { postId, permalink };
  },
};

module.exports = facebookPublisher;
