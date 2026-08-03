/**
 * Weekly: re-check known badge embed URLs. Does not discover new embeds yet —
 * records are created when restaurants register embed targets later.
 */

const BadgeEmbed = require("../../../models/BadgeEmbed");
const SeoAuditResult = require("../../../models/SeoAuditResult");

async function runEmbedCrawl() {
  const embeds = await BadgeEmbed.find({}).limit(500).lean();
  let live = 0;
  let lost = 0;
  const items = [];

  for (const embed of embeds) {
    let isLive = false;
    try {
      const res = await fetch(embed.detectedUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        isLive =
          text.includes("bestfoodapp.com/badge/") ||
          text.includes("Best Food App");
      }
    } catch {
      isLive = false;
    }

    await BadgeEmbed.updateOne(
      { _id: embed._id },
      { isLive, lastSeenAt: isLive ? new Date() : embed.lastSeenAt }
    );

    if (isLive) live += 1;
    else lost += 1;
    items.push({
      restaurantId: embed.restaurantId,
      detectedUrl: embed.detectedUrl,
      isLive,
    });
  }

  const summary = { checked: embeds.length, live, lost };
  await SeoAuditResult.create({
    job: "embedCrawl",
    summary,
    items,
  });
  return summary;
}

module.exports = { runEmbedCrawl };
