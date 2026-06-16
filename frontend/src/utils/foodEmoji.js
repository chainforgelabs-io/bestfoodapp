const TYPE_EMOJI = [
  { match: /burger|cheeseburger|hamburger/i, emoji: "🍔" },
  { match: /pizza|margherita|pepperoni/i, emoji: "🍕" },
  { match: /taco|burrito|quesadilla|enchilada/i, emoji: "🌮" },
  { match: /sushi|sashimi|nigiri|maki|roll/i, emoji: "🍣" },
  { match: /wing|fried chicken|chicken/i, emoji: "🍗" },
  { match: /fries|fry|poutine/i, emoji: "🍟" },
  { match: /pasta|spaghetti|lasagna|noodle|ramen|pho/i, emoji: "🍝" },
  { match: /sandwich|sub|panini|wrap/i, emoji: "🥪" },
  { match: /salad/i, emoji: "🥗" },
  { match: /soup|stew|chowder/i, emoji: "🍲" },
  { match: /steak|beef|ribeye/i, emoji: "🥩" },
  { match: /seafood|fish|salmon|shrimp|lobster/i, emoji: "🐟" },
  { match: /dessert|cake|cookie|brownie|pie|cheesecake/i, emoji: "🍰" },
  { match: /ice cream|gelato|sundae/i, emoji: "🍨" },
  { match: /breakfast|pancake|waffle|egg|brunch/i, emoji: "🍳" },
  { match: /donut|doughnut|pastry|croissant|bakery/i, emoji: "🥐" },
  { match: /caesar|cocktail|margarita|mojito|negroni|drink|beer|wine/i, emoji: "🍹" },
  { match: /coffee|espresso|latte|tea/i, emoji: "☕" },
  { match: /hot dog|sausage/i, emoji: "🌭" },
  { match: /curry|biryani|tikka|indian/i, emoji: "🍛" },
  { match: /dumpling|gyoza|bao/i, emoji: "🥟" },
  { match: /bowl|poke|bibimbap/i, emoji: "🍱" },
];

/**
 * Returns a food-related emoji for a dish type/category, with a sensible default.
 */
export function getFoodEmoji(type = "", category = "") {
  const haystack = `${type} ${category}`.trim();
  if (!haystack) return "🍽️";

  for (const { match, emoji } of TYPE_EMOJI) {
    if (match.test(haystack)) return emoji;
  }

  return "🍽️";
}
