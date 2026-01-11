// Mock API responses for testing

const mockCostEstimate = {
  recipeName: 'Chocolate Chip Cookies',
  servings: 24,
  ingredients: [
    {
      name: 'All-purpose flour',
      quantity: '2 1/4 cups',
      packageSize: '5 lb bag',
      packagePrice: 4.99,
      amountUsed: '1/4 of bag',
      cost: 1.25
    },
    {
      name: 'Butter',
      quantity: '1 cup',
      packageSize: '1 lb (4 sticks)',
      packagePrice: 5.99,
      amountUsed: '2 sticks',
      cost: 3.00
    },
    {
      name: 'Granulated sugar',
      quantity: '3/4 cup',
      packageSize: '4 lb bag',
      packagePrice: 3.99,
      amountUsed: '1/8 of bag',
      cost: 0.50
    },
    {
      name: 'Brown sugar',
      quantity: '3/4 cup',
      packageSize: '2 lb bag',
      packagePrice: 3.49,
      amountUsed: '1/4 of bag',
      cost: 0.87
    },
    {
      name: 'Eggs',
      quantity: '2',
      packageSize: '1 dozen',
      packagePrice: 4.29,
      amountUsed: '2 eggs',
      cost: 0.72
    },
    {
      name: 'Vanilla extract',
      quantity: '1 tsp',
      packageSize: '2 oz bottle',
      packagePrice: 6.99,
      amountUsed: '1/12 of bottle',
      cost: 0.58
    },
    {
      name: 'Baking soda',
      quantity: '1 tsp',
      packageSize: '16 oz box',
      packagePrice: 1.49,
      amountUsed: '1/48 of box',
      cost: 0.03
    },
    {
      name: 'Salt',
      quantity: '1 tsp',
      packageSize: '26 oz container',
      packagePrice: 1.29,
      amountUsed: 'negligible',
      cost: 0.02
    },
    {
      name: 'Chocolate chips',
      quantity: '2 cups',
      packageSize: '12 oz bag',
      packagePrice: 3.99,
      amountUsed: '1 bag',
      cost: 3.99
    }
  ],
  ingredientsSubtotal: 10.96,
  packaging: [
    {
      item: 'Cellophane cookie bags',
      quantity: 8,
      unitPrice: 0.15,
      cost: 1.20
    },
    {
      item: 'Twist ties',
      quantity: 8,
      unitPrice: 0.02,
      cost: 0.16
    },
    {
      item: 'Labels/stickers',
      quantity: 8,
      unitPrice: 0.10,
      cost: 0.80
    }
  ],
  packagingSubtotal: 2.16,
  labor: {
    prepTime: 15,
    activeTime: 20,
    totalTime: 35,
    suggestedHourlyRate: 20,
    laborCost: 11.67
  },
  laborSubtotal: 11.67,
  totalCost: 24.79,
  costPerServing: 1.03,
  suggestedMarkup: 0.5,
  pricePerServing: 1.55,
  priceForWholeRecipe: 37.19,
  notes: 'Prices based on typical grocery costs in the 90210 area. Beverly Hills pricing may be slightly higher than national average.'
};

const mockRecipeHtmlWithJsonLd = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Recipe</title>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Recipe",
        "name": "Classic Chocolate Chip Cookies",
        "recipeIngredient": [
          "2 1/4 cups all-purpose flour",
          "1 cup butter, softened",
          "3/4 cup granulated sugar",
          "3/4 cup packed brown sugar",
          "2 large eggs",
          "1 teaspoon vanilla extract",
          "1 teaspoon baking soda",
          "1 teaspoon salt",
          "2 cups chocolate chips"
        ],
        "recipeInstructions": [
          {"@type": "HowToStep", "text": "Preheat oven to 375°F."},
          {"@type": "HowToStep", "text": "Mix flour, baking soda and salt in bowl."},
          {"@type": "HowToStep", "text": "Beat butter, sugars, eggs and vanilla until creamy."},
          {"@type": "HowToStep", "text": "Gradually blend in flour mixture."},
          {"@type": "HowToStep", "text": "Stir in chocolate chips."},
          {"@type": "HowToStep", "text": "Drop rounded tablespoon of dough onto baking sheets."},
          {"@type": "HowToStep", "text": "Bake for 9 to 11 minutes or until golden brown."}
        ],
        "recipeYield": "5 dozen cookies",
        "prepTime": "PT15M",
        "cookTime": "PT11M",
        "totalTime": "PT26M"
      }
    </script>
  </head>
  <body>
    <article class="recipe">
      <h1>Classic Chocolate Chip Cookies</h1>
      <p>The best homemade chocolate chip cookies!</p>
    </article>
  </body>
</html>
`;

const mockRecipeHtmlWithoutJsonLd = `
<!DOCTYPE html>
<html>
  <head>
    <title>Simple Recipe</title>
  </head>
  <body>
    <nav>Navigation menu</nav>
    <article class="recipe-content">
      <h1>Banana Bread</h1>
      <h2>Ingredients</h2>
      <ul>
        <li>3 ripe bananas</li>
        <li>1/3 cup melted butter</li>
        <li>3/4 cup sugar</li>
        <li>1 egg, beaten</li>
        <li>1 teaspoon vanilla</li>
        <li>1 teaspoon baking soda</li>
        <li>Pinch of salt</li>
        <li>1 1/2 cups all-purpose flour</li>
      </ul>
      <h2>Instructions</h2>
      <ol>
        <li>Preheat oven to 350°F</li>
        <li>Mash bananas in a mixing bowl</li>
        <li>Mix in butter, sugar, egg, and vanilla</li>
        <li>Add baking soda and salt</li>
        <li>Mix in flour</li>
        <li>Pour into greased loaf pan</li>
        <li>Bake for 60 minutes</li>
      </ol>
    </article>
    <footer>Footer content</footer>
  </body>
</html>
`;

module.exports = {
  mockCostEstimate,
  mockRecipeHtmlWithJsonLd,
  mockRecipeHtmlWithoutJsonLd
};
