const request = require('supertest');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';

// Create shared mock function
const mockCreate = jest.fn();

// Mock OpenAI before any imports
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }));
});

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Import app after mocks are set up
const { app } = require('../../server');

// Sample mock responses
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
    }
  ],
  ingredientsSubtotal: 4.25,
  packaging: [
    {
      item: 'Cookie bags',
      quantity: 6,
      unitPrice: 0.25,
      cost: 1.50
    }
  ],
  packagingSubtotal: 1.50,
  labor: {
    prepTime: 20,
    activeTime: 15,
    totalTime: 35,
    suggestedHourlyRate: 20,
    laborCost: 11.67
  },
  laborSubtotal: 11.67,
  totalCost: 17.42,
  costPerServing: 0.73,
  suggestedMarkup: 0.5,
  pricePerServing: 1.09,
  priceForWholeRecipe: 26.13,
  notes: 'Prices based on typical grocery costs in the area.'
};

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockCostEstimate) } }]
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('POST /api/process-text', () => {
    it('should return 400 if no recipe text provided', async () => {
      const response = await request(app)
        .post('/api/process-text')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No recipe text provided');
    });

    it('should return 400 if recipe text is empty string', async () => {
      const response = await request(app)
        .post('/api/process-text')
        .send({ recipeText: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No recipe text provided');
    });

    it('should process recipe text and return cost estimate', async () => {
      const response = await request(app)
        .post('/api/process-text')
        .send({
          recipeText: 'Chocolate Chip Cookies\n2 cups flour\n1 cup butter',
          zipCode: '90210'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('estimate');
      expect(response.body.estimate).toHaveProperty('recipeName');
      expect(response.body.estimate).toHaveProperty('ingredients');
      expect(response.body.estimate).toHaveProperty('totalCost');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use default zip code if not provided', async () => {
      const response = await request(app)
        .post('/api/process-text')
        .send({ recipeText: 'Simple recipe' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return original recipe text in response', async () => {
      const recipeText = 'My favorite cookie recipe';
      const response = await request(app)
        .post('/api/process-text')
        .send({ recipeText })
        .expect(200);

      expect(response.body.recipeText).toBe(recipeText);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const response = await request(app)
        .post('/api/process-text')
        .send({ recipeText: 'Test recipe' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'API rate limit exceeded');
    });
  });

  describe('POST /api/process-url', () => {
    const mockRecipeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test Recipe",
              "recipeIngredient": ["1 cup flour", "2 eggs"],
              "recipeInstructions": [{"text": "Mix ingredients"}, {"text": "Bake"}],
              "recipeYield": "4 servings"
            }
          </script>
        </head>
        <body>
          <article>Recipe content here</article>
        </body>
      </html>
    `;

    beforeEach(() => {
      axios.get.mockResolvedValue({ data: mockRecipeHtml });
    });

    it('should return 400 if no URL provided', async () => {
      const response = await request(app)
        .post('/api/process-url')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No URL provided');
    });

    it('should process URL and return cost estimate', async () => {
      const response = await request(app)
        .post('/api/process-url')
        .send({
          url: 'https://example.com/recipe',
          zipCode: '10001'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('estimate');
      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/recipe',
        expect.objectContaining({
          headers: expect.any(Object),
          timeout: 10000
        })
      );
    });

    it('should handle URL fetch errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .post('/api/process-url')
        .send({ url: 'https://example.com/recipe' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch URL');
    });

    it('should truncate long recipe text in response', async () => {
      const longContent = 'Recipe content '.repeat(500);
      axios.get.mockResolvedValueOnce({
        data: `<html><body><article>${longContent}</article></body></html>`
      });

      const response = await request(app)
        .post('/api/process-url')
        .send({ url: 'https://example.com/recipe' })
        .expect(200);

      expect(response.body.recipeText.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('POST /api/process-image', () => {
    it('should return 400 if no image file provided', async () => {
      const response = await request(app)
        .post('/api/process-image')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No image file provided');
    });
  });
});

describe('Cost Estimate Response Parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle JSON wrapped in markdown code blocks', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '```json\n' + JSON.stringify(mockCostEstimate) + '\n```'
        }
      }]
    });

    const response = await request(app)
      .post('/api/process-text')
      .send({ recipeText: 'Test recipe' })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.estimate).toHaveProperty('recipeName');
  });

  it('should handle plain JSON response', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: { content: JSON.stringify(mockCostEstimate) }
      }]
    });

    const response = await request(app)
      .post('/api/process-text')
      .send({ recipeText: 'Test recipe' })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  it('should handle JSON with surrounding text', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: 'Here is the estimate:\n' + JSON.stringify(mockCostEstimate) + '\nHope this helps!'
        }
      }]
    });

    const response = await request(app)
      .post('/api/process-text')
      .send({ recipeText: 'Test recipe' })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  it('should fail gracefully on unparseable response', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: 'This is not valid JSON at all'
        }
      }]
    });

    const response = await request(app)
      .post('/api/process-text')
      .send({ recipeText: 'Test recipe' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('parse');
  });
});
