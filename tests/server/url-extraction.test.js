/**
 * URL Extraction Tests
 *
 * Note: The extractRecipeFromUrl function is tested indirectly through
 * the API tests. These tests focus on error handling scenarios.
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';

// Mock axios before any other imports
const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({
  get: mockAxiosGet
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('URL Extraction Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Import fresh for each test
  let extractRecipeFromUrl;

  beforeAll(() => {
    // Clear module cache and reimport
    jest.resetModules();

    // Re-apply mocks after reset
    jest.doMock('axios', () => ({
      get: mockAxiosGet
    }));

    jest.doMock('openai', () => {
      return jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }));
    });

    const server = require('../../server');
    extractRecipeFromUrl = server.extractRecipeFromUrl;
  });

  it('should throw error on network failure', async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(extractRecipeFromUrl('https://example.com/recipe'))
      .rejects.toThrow('Failed to fetch URL: Network error');
  });

  it('should throw error on timeout', async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

    await expect(extractRecipeFromUrl('https://example.com/recipe'))
      .rejects.toThrow('Failed to fetch URL');
  });

  it('should handle empty response gracefully', async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    // Should return empty or minimal content without crashing
    expect(typeof result).toBe('string');
  });

  it('should handle malformed HTML gracefully', async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: '<html><body><div class="recipe">Some recipe content here that is long enough</div>'
    });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(typeof result).toBe('string');
  });

  it('should extract content from article elements', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <article>
            This is a great recipe for banana bread. You will need 3 ripe bananas,
            2 cups flour, 1 cup sugar. Mash the bananas, mix ingredients, bake at 350F.
          </article>
        </body>
      </html>
    `;

    mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result).toContain('banana');
  });

  it('should truncate very long content to 8000 characters', async () => {
    const longContent = 'Recipe content. '.repeat(1000);
    mockAxiosGet.mockResolvedValueOnce({
      data: `<html><body><article>${longContent}</article></body></html>`
    });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.length).toBeLessThanOrEqual(8000);
  });

  it('should clean up excessive whitespace', async () => {
    const mockHtml = `
      <html><body><article>
        Recipe    with     lots    of
        whitespace     needs    cleanup.
        More content here to ensure extraction works properly.
      </article></body></html>
    `;

    mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    // Should not have multiple consecutive spaces
    expect(result).not.toMatch(/\s{2,}/);
  });
});
