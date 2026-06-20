const crypto = require("crypto");

/**
 * Minimal OAuth 1.0a signer for X API v1.1 media upload + v2 tweet create.
 */

function percentEncode(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function oauthHeader(method, url, extraParams, creds) {
  const oauth = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...oauth, ...extraParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(creds.consumerSecret)}&${percentEncode(
    creds.accessTokenSecret
  )}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauth.oauth_signature = signature;

  const header =
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`)
      .join(", ");

  return header;
}

function getXCreds() {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X API credentials are not configured");
  }
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

async function uploadMedia(imageUrl, creds) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch card image for X upload");
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const base64 = buffer.toString("base64");

  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const params = { media_data: base64 };
  const auth = oauthHeader("POST", url, params, creds);

  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.message || "X media upload failed");
  }
  return data.media_id_string;
}

async function createTweet(text, mediaId, creds) {
  const url = "https://api.twitter.com/2/tweets";
  const payload = {
    text,
    media: { media_ids: [mediaId] },
  };

  const auth = oauthHeader("POST", url, {}, creds);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.title || "X tweet creation failed");
  }
  const postId = data.data?.id;
  const permalink = postId
    ? `https://twitter.com/i/web/status/${postId}`
    : null;
  return { postId, permalink };
}

/** @type {import('../SocialPublisher').SocialPublisher} */
const xPublisher = {
  platform: "x",

  async publish({ imageUrl, caption, linkInBody = false }) {
    const creds = getXCreds();
    const mediaId = await uploadMedia(imageUrl, creds);

    // Default: omit link from post body (linkInBody: false per spec).
    let text = caption || "";
    if (!linkInBody && text.includes("bestfoodapp.com")) {
      text = text.replace(/\s*bestfoodapp\.com\s*/gi, " ").trim();
    }

    return createTweet(text, mediaId, creds);
  },
};

module.exports = xPublisher;
