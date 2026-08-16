/**
 * Semantic HTML snapshots for crawlers (injected into #root by api/render.js).
 */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAsOf(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function breadcrumbHtml(crumbs) {
  if (!crumbs?.length) return "";
  const parts = crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    if (last || !c.url) return `<span>${escapeHtml(c.name)}</span>`;
    return `<a href="${escapeHtml(c.url)}">${escapeHtml(c.name)}</a>`;
  });
  return `<nav aria-label="Breadcrumb">${parts.join(" › ")}</nav>`;
}

function listHtml(items) {
  if (!items?.length) return "<p>No ranked items yet.</p>";
  const lis = items
    .map((item) => {
      const href = item.url || "#";
      const extra = [
        item.restaurantName ? `at ${escapeHtml(item.restaurantName)}` : "",
        item.city ? escapeHtml(item.city) : "",
        Number.isFinite(item.score) ? `${item.score}/100` : "",
      ]
        .filter(Boolean)
        .join(" — ");
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(
        item.name
      )}</a>${extra ? ` — ${extra}` : ""}</li>`;
    })
    .join("");
  return `<ol>${lis}</ol>`;
}

function extraLinksHtml(links) {
  if (!links?.length) return "";
  const lis = links
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.name)}</a></li>`
    )
    .join("");
  return `<h2>More rankings</h2><ul>${lis}</ul>`;
}

function methodParagraph(asOf) {
  const dateBit = asOf ? ` As of ${formatAsOf(asOf)}.` : "";
  return `<p>Rankings use blended expert and community scores at the dish level, out of 100.${dateBit} <a href="/scoring-criteria">How scores are calculated</a>.</p>`;
}

function rankingSnapshot({ h1, crumbs, items, asOf, extraLinks }) {
  return [
    breadcrumbHtml(crumbs),
    `<h1>${escapeHtml(h1)}</h1>`,
    methodParagraph(asOf),
    listHtml(items),
    extraLinksHtml(extraLinks),
  ]
    .filter(Boolean)
    .join("\n");
}

function restaurantSnapshot({ restaurant, dishes, asOf }) {
  const address = restaurant.address
    ? [
        restaurant.address.street,
        restaurant.address.city,
        restaurant.address.province,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const cuisine = Array.isArray(restaurant.cuisine)
    ? restaurant.cuisine.join(", ")
    : restaurant.cuisine || "";
  return [
    breadcrumbHtml([
      { name: "Home", url: "/" },
      { name: restaurant.name },
    ]),
    `<h1>${escapeHtml(restaurant.name)}</h1>`,
    address ? `<p>${escapeHtml(address)}</p>` : "",
    cuisine ? `<p>Cuisine: ${escapeHtml(cuisine)}</p>` : "",
    methodParagraph(asOf),
    dishes?.length ? "<h2>Top dishes</h2>" : "",
    listHtml(dishes),
  ]
    .filter(Boolean)
    .join("\n");
}

function cityHubSnapshot({ cityLabel, crumbs, restaurantItems, asOf, extraLinks }) {
  return [
    breadcrumbHtml(crumbs),
    `<h1>Best food in ${escapeHtml(cityLabel)}</h1>`,
    `<p>Dish-level rankings of restaurants and food in ${escapeHtml(
      cityLabel
    )}.</p>`,
    methodParagraph(asOf),
    restaurantItems?.length ? "<h2>Best restaurants</h2>" : "",
    listHtml(restaurantItems),
    extraLinksHtml(extraLinks),
  ]
    .filter(Boolean)
    .join("\n");
}

function wrapRoot(inner) {
  return `<main class="seo-snapshot">${inner}</main>`;
}

module.exports = {
  escapeHtml,
  formatAsOf,
  rankingSnapshot,
  restaurantSnapshot,
  cityHubSnapshot,
  wrapRoot,
};
