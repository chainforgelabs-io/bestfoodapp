/**
 * Instagram Graph API content publishing (v1).
 * Requires IG_BUSINESS_ACCOUNT_ID and META_LONG_LIVED_TOKEN.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function pollContainerStatus(containerId, token, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to poll IG container status");
    }
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error("Instagram media container processing failed");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Instagram media container timed out");
}

/** @type {import('./SocialPublisher').SocialPublisher} */
const instagramPublisher = {
  platform: "instagram",

  async publish({ imageUrl, caption }) {
    const token = process.env.META_LONG_LIVED_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) {
      throw new Error("Instagram credentials are not configured");
    }

    const createBody = new URLSearchParams({
      image_url: imageUrl,
      caption: caption || "",
      access_token: token,
    });

    const createRes = await fetch(`${GRAPH_BASE}/${igId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(createData.error?.message || "Failed to create IG media container");
    }

    const containerId = createData.id;
    await pollContainerStatus(containerId, token);

    const publishBody = new URLSearchParams({
      creation_id: containerId,
      access_token: token,
    });
    const publishRes = await fetch(`${GRAPH_BASE}/${igId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody,
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(publishData.error?.message || "Failed to publish IG media");
    }

    const postId = publishData.id;
    let permalink = null;
    try {
      const permalinkRes = await fetch(
        `${GRAPH_BASE}/${postId}?fields=permalink&access_token=${encodeURIComponent(token)}`
      );
      const permalinkData = await permalinkRes.json();
      if (permalinkRes.ok) permalink = permalinkData.permalink || null;
    } catch {
      permalink = null;
    }

    return { postId, permalink };
  },
};

module.exports = instagramPublisher;
