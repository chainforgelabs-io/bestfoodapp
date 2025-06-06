// Standardized options for restaurants and food items

export const RESTAURANT_TYPES = [
  "Fast Food",
  "Fast Casual",
  "Casual Dining",
  "Fine Dining",
  "Cafe / Coffee Shop",
  "Bar / Pub / Tavern",
  "Food Truck / Cart",
  "Buffet",
  "Diner",
];

export const CUISINE_TYPES = [
  // The Americas
  "American (New)",
  "American (Traditional)",
  "BBQ",
  "Cajun & Creole",
  "Caribbean",
  "Latin American",
  "Mexican",
  "South American",

  // European
  "British",
  "Eastern European",
  "French",
  "German",
  "Greek",
  "Italian",
  "Mediterranean",
  "Portuguese",
  "Spanish",

  // Asian
  "Asian",
  "Chinese",
  "Filipino",
  "Indian",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",

  // Middle Eastern & African
  "African",
  "Middle Eastern",
  "Turkish",

  // Global & Fusion
  "Fusion",
  "Gastropub",
  "Seafood",
  "Steakhouse",
  "Vegan / Vegetarian",
];

export const AMBIANCE_OPTIONS = [
  "Family-Friendly",
  "Romantic",
  "Casual",
  "Lively / Noisy",
  "Quiet / Intimate",
  "Trendy / Modern",
  "Upscale / Formal",
  "Cozy",
  "Good for Groups",
  "Outdoor Seating",
];

export const FOOD_CATEGORIES = [
  "Appetizers & Starters",
  "Soups & Salads",
  "Handhelds",
  "Mains / Entrées",
  "Pizza & Flatbreads",
  "Pasta",
  "Sides",
  "Desserts",
  "Drinks (Non-Alcoholic)",
  "Drinks (Alcoholic)",
  "Breakfast & Brunch",
];

export const FOOD_TYPES = {
  "Appetizers & Starters": [
    "Wings",
    "Nachos",
    "Calamari",
    "Bruschetta",
    "Mozzarella Sticks",
    "Spinach Dip",
    "Sliders",
    "Quesadillas",
    "Stuffed Mushrooms",
    "Shrimp Cocktail",
  ],
  "Soups & Salads": [
    "Caesar Salad",
    "House Salad",
    "Greek Salad",
    "Chicken Soup",
    "Tomato Soup",
    "Clam Chowder",
    "French Onion Soup",
    "Minestrone",
    "Cobb Salad",
    "Caprese Salad",
  ],
  "Handhelds": [
    "Burger",
    "Tacos",
    "Burrito",
    "Hot Dog",
    "Sandwich",
    "Wrap",
    "Panini",
    "Sub",
    "Club Sandwich",
    "Grilled Cheese",
  ],
  "Mains / Entrées": [
    "Steak",
    "Fried Rice",
    "Curry",
    "Grilled Chicken",
    "Fish & Chips",
    "Lobster",
    "Pork Chops",
    "Lamb",
    "Salmon",
    "Ribs",
  ],
  "Pizza & Flatbreads": ["Pizza", "Flatbread", "Calzone", "Stromboli"],
  "Pasta": [
    "Spaghetti",
    "Fettuccine",
    "Penne",
    "Lasagna",
    "Ravioli",
    "Gnocchi",
    "Linguine",
    "Carbonara",
  ],
  "Sides": [
    "Fries",
    "Onion Rings",
    "Coleslaw",
    "Garlic Bread",
    "Rice",
    "Mashed Potatoes",
    "Steamed Vegetables",
    "Mac & Cheese",
  ],
  "Desserts": [
    "Churro",
    "Cake",
    "Ice Cream",
    "Cheesecake",
    "Tiramisu",
    "Brownie",
    "Apple Pie",
    "Crème Brûlée",
  ],
  "Drinks (Non-Alcoholic)": [
    "Soda",
    "Juice",
    "Coffee",
    "Tea",
    "Smoothie",
    "Milkshake",
    "Lemonade",
    "Water",
  ],
  "Drinks (Alcoholic)": [
    "Beer",
    "Wine",
    "Cocktail",
    "Whiskey",
    "Vodka",
    "Rum",
    "Tequila",
    "Margarita",
  ],
  "Breakfast & Brunch": [
    "Pancakes",
    "Waffles",
    "French Toast",
    "Eggs Benedict",
    "Omelet",
    "Breakfast Burrito",
    "Bagel",
    "Avocado Toast",
  ],
};

export const FOOD_SUBTYPES = {
  "Burger": [
    "Cheese Burger",
    "Bacon Burger",
    "Veggie Burger",
    "Smash Burger",
    "BBQ Burger",
    "Mushroom Swiss Burger",
    "Turkey Burger",
    "Black Bean Burger",
  ],
  "Tacos": [
    "Beef",
    "Chicken",
    "Fish",
    "Pork (Al Pastor)",
    "Birria",
    "Carnitas",
    "Shrimp",
    "Vegetarian",
  ],
  "Burrito": [
    "Beef",
    "Chicken",
    "Bean & Cheese",
    "Carnitas",
    "California",
    "Breakfast",
    "Veggie",
    "Fish",
  ],
  "Hot Dog": [
    "Classic",
    "Chili Cheese",
    "Chicago Style",
    "New York Style",
    "Corn Dog",
    "Specialty",
  ],
  "Sandwich": [
    "Club",
    "BLT",
    "Philly Cheesesteak",
    "Meatball Sub",
    "Italian",
    "Reuben",
    "Grilled Chicken",
    "Tuna Melt",
  ],
  "Steak": [
    "Filet Mignon",
    "Ribeye",
    "Sirloin",
    "T-Bone",
    "New York Strip",
    "Porterhouse",
    "Flank Steak",
  ],
  "Fried Rice": [
    "Chicken",
    "Beef",
    "Shrimp",
    "Vegetable",
    "Pork",
    "Combination",
  ],
  "Curry": [
    "Red Curry",
    "Green Curry",
    "Panang Curry",
    "Yellow Curry",
    "Thai Curry",
    "Indian Curry",
  ],
  "Pizza": [
    "Cheese",
    "Pepperoni",
    "Deluxe",
    "Margherita",
    "Hawaiian",
    "Meat Lovers",
    "Veggie",
    "BBQ Chicken",
  ],
  "Fries": [
    "Regular",
    "Waffle",
    "Sweet Potato",
    "Curly",
    "Steak Fries",
    "Shoestring",
  ],
  "Churro": [
    "Plain",
    "Filled (Caramel)",
    "Filled (Chocolate)",
    "Cinnamon Sugar",
  ],
  "Cake": [
    "Chocolate",
    "Cheesecake",
    "Carrot Cake",
    "Red Velvet",
    "Vanilla",
    "Strawberry",
  ],
};

export const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Halal",
  "Kosher",
  "Spicy",
  "Low-Carb",
  "Keto-Friendly",
  "Sugar-Free",
  "Organic",
];

export const SIZE_OPTIONS = ["Small", "Medium", "Large", "Extra Large"];

// Information data for tooltips
export const INFO_DATA = {
  // Restaurant Types
  "Fast Food": {
    description: "Quick service with counter ordering",
    examples: "McDonald's, Burger King, Taco Bell, KFC",
    characteristics:
      "• Quick preparation\n• Counter service\n• Usually chain restaurants\n• Budget-friendly pricing",
  },
  "Fast Casual": {
    description: "Higher quality than fast food, counter ordering",
    examples: "Chipotle, Shake Shack, Panera Bread, Five Guys",
    characteristics:
      "• Better quality ingredients\n• Counter service\n• Fresh preparations\n• Mid-range pricing",
  },
  "Casual Dining": {
    description: "Table service in a relaxed atmosphere",
    examples: "Applebee's, Olive Garden, TGI Fridays, Chili's",
    characteristics:
      "• Table service\n• Full menu options\n• Family-friendly\n• Moderate pricing",
  },
  "Fine Dining": {
    description: "High-end service and cuisine",
    examples: "Peter Luger's, French Laundry, Le Bernardin",
    characteristics:
      "• Exceptional service\n• Premium ingredients\n• Formal atmosphere\n• High pricing",
  },
  "Cafe / Coffee Shop": {
    description: "Coffee and light food focus",
    examples: "Starbucks, local coffee shops, Blue Bottle",
    characteristics:
      "• Coffee specialties\n• Light meals & pastries\n• Casual atmosphere\n• Quick service",
  },
  "Bar / Pub / Tavern": {
    description: "Drinks focus with food menu",
    examples: "Sports bars, Irish pubs, local taverns",
    characteristics:
      "• Alcoholic beverages focus\n• Pub food menu\n• Social atmosphere\n• Evening hours",
  },
  "Food Truck / Cart": {
    description: "Mobile food vendor",
    examples: "Taco trucks, ice cream trucks, hot dog carts",
    characteristics:
      "• Mobile service\n• Limited menu\n• Outdoor dining\n• Quick service",
  },
  "Buffet": {
    description: "Self-serve dining with fixed price",
    examples: "Golden Corral, Chinese buffets, Indian buffets",
    characteristics:
      "• All-you-can-eat\n• Self-service\n• Variety of options\n• Fixed pricing",
  },
  "Diner": {
    description: "American comfort food, often 24-hour",
    examples: "Local diners, Denny's, IHOP",
    characteristics:
      "• Classic American fare\n• Counter & booth seating\n• Extended hours\n• Comfort food focus",
  },

  // Food Categories
  "Appetizers & Starters": {
    description: "Small dishes to begin the meal",
    examples: "Wings, nachos, calamari, bruschetta",
    characteristics:
      "• Shared portions\n• Light dishes\n• Meal appetizers\n• Social eating",
  },
  "Soups & Salads": {
    description: "Liquid dishes and fresh vegetable preparations",
    examples: "Caesar salad, chicken soup, minestrone",
    characteristics:
      "• Healthy options\n• Light meals\n• Fresh ingredients\n• Nutritious choices",
  },
  "Handhelds": {
    description: "Foods eaten with hands, portable meals",
    examples: "Burgers, tacos, sandwiches, wraps",
    characteristics:
      "• Portable eating\n• Casual dining\n• Easy to eat\n• Popular lunch options",
  },
  "Mains / Entrées": {
    description: "Primary course of the meal",
    examples: "Steak, grilled chicken, fish & chips",
    characteristics:
      "• Main course\n• Substantial portions\n• Complete meals\n• Center of dining",
  },
  "Pizza & Flatbreads": {
    description: "Baked dough with toppings",
    examples: "Margherita pizza, flatbread, calzone",
    characteristics:
      "• Baked dough base\n• Various toppings\n• Shareable portions\n• Italian origins",
  },
  "Pasta": {
    description: "Italian noodle dishes",
    examples: "Spaghetti, lasagna, fettuccine alfredo",
    characteristics:
      "• Italian cuisine\n• Noodle-based\n• Various sauces\n• Comfort food",
  },
  "Sides": {
    description: "Accompaniments to main dishes",
    examples: "Fries, onion rings, garlic bread",
    characteristics:
      "• Complementary dishes\n• Smaller portions\n• Enhance main meals\n• Shared options",
  },
  "Desserts": {
    description: "Sweet dishes to end the meal",
    examples: "Cake, ice cream, tiramisu, brownies",
    characteristics:
      "• Sweet flavors\n• End of meal\n• Indulgent treats\n• Special occasions",
  },
  "Drinks (Non-Alcoholic)": {
    description: "Beverages without alcohol",
    examples: "Soda, juice, coffee, smoothies",
    characteristics:
      "• No alcohol content\n• Various flavors\n• All-age appropriate\n• Meal accompaniments",
  },
  "Drinks (Alcoholic)": {
    description: "Beverages containing alcohol",
    examples: "Beer, wine, cocktails, spirits",
    characteristics:
      "• Contains alcohol\n• Age restrictions\n• Social beverages\n• Meal pairings",
  },
  "Breakfast & Brunch": {
    description: "Morning and late morning meals",
    examples: "Pancakes, eggs benedict, waffles",
    characteristics:
      "• Morning meals\n• Weekend brunch\n• Traditional breakfast\n• Comfort foods",
  },

  // Ambiance Options
  "Family-Friendly": {
    description: "Welcoming environment for children and families",
    examples: "Kid menus, high chairs, casual atmosphere",
    characteristics:
      "• Children welcome\n• Family amenities\n• Casual environment\n• Accommodating staff",
  },
  "Romantic": {
    description: "Intimate atmosphere for couples",
    examples: "Dim lighting, quiet seating, elegant decor",
    characteristics:
      "• Intimate setting\n• Soft lighting\n• Quiet atmosphere\n• Special occasion dining",
  },
  "Casual": {
    description: "Relaxed, informal dining environment",
    examples: "Come-as-you-are, relaxed dress code",
    characteristics:
      "• Informal atmosphere\n• Relaxed dress code\n• Comfortable setting\n• Easy-going vibe",
  },
  "Lively / Noisy": {
    description: "Energetic atmosphere with background noise",
    examples: "Sports bars, busy restaurants, music venues",
    characteristics:
      "• High energy\n• Background noise\n• Social atmosphere\n• Vibrant environment",
  },
  "Quiet / Intimate": {
    description: "Peaceful environment for conversation",
    examples: "Low music, soft conversations, calm setting",
    characteristics:
      "• Low noise levels\n• Conversation-friendly\n• Peaceful environment\n• Relaxing atmosphere",
  },
  "Trendy / Modern": {
    description: "Contemporary design and current style",
    examples: "Modern decor, current music, stylish design",
    characteristics:
      "• Contemporary style\n• Modern amenities\n• Current trends\n• Stylish environment",
  },
  "Upscale / Formal": {
    description: "Elegant atmosphere with dress expectations",
    examples: "Fine dining, dress codes, formal service",
    characteristics:
      "• Formal atmosphere\n• Dress expectations\n• Premium service\n• Elegant setting",
  },
  "Cozy": {
    description: "Warm, comfortable, home-like feeling",
    examples: "Warm lighting, comfortable seating, intimate spaces",
    characteristics:
      "• Warm atmosphere\n• Comfortable seating\n• Home-like feeling\n• Intimate spaces",
  },
  "Good for Groups": {
    description: "Accommodates large parties and gatherings",
    examples: "Large tables, group menus, spacious seating",
    characteristics:
      "• Large party friendly\n• Spacious layout\n• Group accommodations\n• Social dining",
  },
  "Outdoor Seating": {
    description: "Patio, terrace, or outdoor dining options",
    examples: "Patios, sidewalk seating, garden areas",
    characteristics:
      "• Open-air dining\n• Weather dependent\n• Natural setting\n• Fresh air experience",
  },

  // Dietary Tags
  "Vegetarian": {
    description: "No meat, but may include dairy and eggs",
    examples: "Veggie burgers, salads, pasta primavera",
    characteristics:
      "• No meat or fish\n• May include dairy\n• May include eggs\n• Plant-based focus",
  },
  "Vegan": {
    description: "No animal products whatsoever",
    examples: "Plant-based burgers, dairy-free options",
    characteristics:
      "• No animal products\n• No dairy or eggs\n• Plant-based only\n• Strict dietary choice",
  },
  "Gluten-Free": {
    description: "No wheat, barley, rye, or gluten-containing ingredients",
    examples: "GF bread, rice dishes, corn tortillas",
    characteristics:
      "• No gluten grains\n• Safe for celiac\n• Alternative ingredients\n• Medical necessity",
  },
  "Spicy": {
    description: "Contains hot peppers or spicy seasonings",
    examples: "Hot wings, spicy curry, jalapeño dishes",
    characteristics:
      "• Heat level present\n• Pepper-based heat\n• Bold flavors\n• May vary in intensity",
  },
};
