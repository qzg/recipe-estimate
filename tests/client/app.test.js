/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('RecipeCostEstimator Client', () => {
  let RecipeCostEstimator;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = fs.readFileSync(
      path.join(__dirname, '../../public/index.html'),
      'utf8'
    );

    // Mock localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn(key => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock fetch
    global.fetch = jest.fn();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();

    // Load the app script
    const appScript = fs.readFileSync(
      path.join(__dirname, '../../public/app.js'),
      'utf8'
    );
    eval(appScript);

    // Initialize app
    RecipeCostEstimator = window.RecipeCostEstimator;
    window.app = new RecipeCostEstimator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with camera tab active', () => {
      expect(window.app.currentTab).toBe('camera');
    });

    it('should load saved zip code from localStorage', () => {
      localStorage.setItem('recipeCostZipCode', '90210');
      window.app.loadSavedZipCode();
      expect(document.getElementById('zipCode').value).toBe('90210');
    });

    it('should bind all required elements', () => {
      expect(window.app.zipCodeInput).toBeTruthy();
      expect(window.app.tabButtons.length).toBe(3);
      expect(window.app.recipeTextArea).toBeTruthy();
      expect(window.app.recipeUrlInput).toBeTruthy();
    });
  });

  describe('Tab Switching', () => {
    it('should switch to text tab', () => {
      window.app.switchTab('text');
      expect(window.app.currentTab).toBe('text');

      const textPanel = document.getElementById('text-panel');
      expect(textPanel.classList.contains('active')).toBe(true);

      const cameraPanel = document.getElementById('camera-panel');
      expect(cameraPanel.classList.contains('active')).toBe(false);
    });

    it('should switch to url tab', () => {
      window.app.switchTab('url');
      expect(window.app.currentTab).toBe('url');

      const urlPanel = document.getElementById('url-panel');
      expect(urlPanel.classList.contains('active')).toBe(true);
    });

    it('should update active tab button', () => {
      window.app.switchTab('text');

      const textBtn = document.querySelector('[data-tab="text"]');
      expect(textBtn.classList.contains('active')).toBe(true);

      const cameraBtn = document.querySelector('[data-tab="camera"]');
      expect(cameraBtn.classList.contains('active')).toBe(false);
    });
  });

  describe('Zip Code Validation', () => {
    it('should return null for invalid zip codes', () => {
      window.app.zipCodeInput.value = '123';
      expect(window.app.getZipCode()).toBeNull();

      window.app.zipCodeInput.value = 'abcde';
      expect(window.app.getZipCode()).toBeNull();

      window.app.zipCodeInput.value = '';
      expect(window.app.getZipCode()).toBeNull();
    });

    it('should return zip code for valid 5-digit codes', () => {
      window.app.zipCodeInput.value = '12345';
      expect(window.app.getZipCode()).toBe('12345');

      window.app.zipCodeInput.value = '90210';
      expect(window.app.getZipCode()).toBe('90210');
    });

    it('should save valid zip code to localStorage', () => {
      window.app.zipCodeInput.value = '10001';
      window.app.saveZipCode();
      expect(localStorage.setItem).toHaveBeenCalledWith('recipeCostZipCode', '10001');
    });

    it('should not save invalid zip code', () => {
      window.app.zipCodeInput.value = 'abc';
      window.app.saveZipCode();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(window.app.isValidUrl('https://example.com')).toBe(true);
      expect(window.app.isValidUrl('http://example.com/recipe')).toBe(true);
      expect(window.app.isValidUrl('https://recipes.example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(window.app.isValidUrl('not a url')).toBe(false);
      expect(window.app.isValidUrl('ftp://example.com')).toBe(false);
      expect(window.app.isValidUrl('')).toBe(false);
      expect(window.app.isValidUrl('example.com')).toBe(false);
    });
  });

  describe('Currency Formatting', () => {
    it('should format numbers as USD currency', () => {
      expect(window.app.formatCurrency(10)).toBe('$10.00');
      expect(window.app.formatCurrency(10.5)).toBe('$10.50');
      expect(window.app.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(window.app.formatCurrency(0.99)).toBe('$0.99');
    });

    it('should handle edge cases', () => {
      expect(window.app.formatCurrency(0)).toBe('$0.00');
      expect(window.app.formatCurrency(NaN)).toBe('$0.00');
      expect(window.app.formatCurrency(null)).toBe('$0.00');
      expect(window.app.formatCurrency(undefined)).toBe('$0.00');
      expect(window.app.formatCurrency('string')).toBe('$0.00');
    });
  });

  describe('Form Reset', () => {
    it('should reset all form fields', () => {
      // Set some values
      window.app.recipeTextArea.value = 'Some recipe text';
      window.app.recipeUrlInput.value = 'https://example.com';
      window.app.resultsSection.style.display = 'block';

      // Reset
      window.app.resetForm();

      expect(window.app.recipeTextArea.value).toBe('');
      expect(window.app.recipeUrlInput.value).toBe('');
      expect(window.app.resultsSection.style.display).toBe('none');
    });

    it('should reset image preview', () => {
      window.app.selectedImage = { name: 'test.jpg' };
      window.app.previewImage.style.display = 'block';
      window.app.cameraPlaceholder.style.display = 'none';

      window.app.resetForm();

      expect(window.app.selectedImage).toBeNull();
      expect(window.app.previewImage.style.display).toBe('none');
    });
  });

  describe('Loading State', () => {
    it('should show loading overlay', () => {
      window.app.showLoading();
      expect(window.app.loadingOverlay.classList.contains('active')).toBe(true);
    });

    it('should hide loading overlay', () => {
      window.app.loadingOverlay.classList.add('active');
      window.app.hideLoading();
      expect(window.app.loadingOverlay.classList.contains('active')).toBe(false);
    });
  });

  describe('Error Display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display error message', () => {
      window.app.showError('Test error message');

      const errorEl = document.querySelector('.error-message');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toBe('Test error message');
    });

    it('should remove error after timeout', () => {
      window.app.showError('Temporary error');

      expect(document.querySelector('.error-message')).toBeTruthy();

      jest.advanceTimersByTime(5000);

      expect(document.querySelector('.error-message')).toBeFalsy();
    });

    it('should replace existing error', () => {
      window.app.showError('First error');
      window.app.showError('Second error');

      const errors = document.querySelectorAll('.error-message');
      expect(errors.length).toBe(1);
      expect(errors[0].textContent).toBe('Second error');
    });
  });

  describe('Results Display', () => {
    const mockEstimate = {
      recipeName: 'Test Recipe',
      servings: 4,
      ingredients: [
        { name: 'Flour', quantity: '2 cups', packageSize: '5 lb', packagePrice: 4.99, cost: 0.50 }
      ],
      ingredientsSubtotal: 0.50,
      packaging: [
        { item: 'Container', quantity: 1, unitPrice: 1.00, cost: 1.00 }
      ],
      packagingSubtotal: 1.00,
      labor: {
        prepTime: 10,
        activeTime: 20,
        totalTime: 30,
        suggestedHourlyRate: 20,
        laborCost: 10.00
      },
      laborSubtotal: 10.00,
      totalCost: 11.50,
      costPerServing: 2.88,
      suggestedMarkup: 0.5,
      pricePerServing: 4.31,
      priceForWholeRecipe: 17.25,
      notes: 'Test notes'
    };

    it('should display recipe name and servings', () => {
      window.app.displayResults(mockEstimate);

      expect(document.getElementById('recipeName').textContent).toBe('Test Recipe');
      expect(document.getElementById('servingsCount').textContent).toBe('4');
    });

    it('should display ingredient costs', () => {
      window.app.displayResults(mockEstimate);

      const ingredientsList = document.getElementById('ingredientsList');
      expect(ingredientsList.innerHTML).toContain('Flour');
      expect(document.getElementById('ingredientsSubtotal').textContent).toBe('$0.50');
    });

    it('should display packaging costs', () => {
      window.app.displayResults(mockEstimate);

      const packagingList = document.getElementById('packagingList');
      expect(packagingList.innerHTML).toContain('Container');
      expect(document.getElementById('packagingSubtotal').textContent).toBe('$1.00');
    });

    it('should display labor details', () => {
      window.app.displayResults(mockEstimate);

      const laborDetails = document.getElementById('laborDetails');
      expect(laborDetails.innerHTML).toContain('30 min');
      expect(document.getElementById('laborSubtotal').textContent).toBe('$10.00');
    });

    it('should display totals and pricing', () => {
      window.app.displayResults(mockEstimate);

      expect(document.getElementById('totalCost').textContent).toBe('$11.50');
      expect(document.getElementById('costPerServing').textContent).toBe('$2.88');
      expect(document.getElementById('suggestedMarkup').textContent).toBe('50%');
      expect(document.getElementById('pricePerServing').textContent).toBe('$4.31');
      expect(document.getElementById('priceWholeRecipe').textContent).toBe('$17.25');
    });

    it('should display notes when present', () => {
      window.app.displayResults(mockEstimate);

      expect(document.getElementById('notesSection').style.display).toBe('block');
      expect(document.getElementById('estimateNotes').textContent).toBe('Test notes');
    });

    it('should hide notes when not present', () => {
      const estimateWithoutNotes = { ...mockEstimate, notes: null };
      window.app.displayResults(estimateWithoutNotes);

      expect(document.getElementById('notesSection').style.display).toBe('none');
    });

    it('should show results section', () => {
      window.app.displayResults(mockEstimate);

      expect(window.app.resultsSection.style.display).toBe('block');
    });
  });

  describe('Section Accordion', () => {
    it('should toggle section expansion', () => {
      const header = document.querySelector('.section-header');
      const content = header.nextElementSibling;

      window.app.toggleSection(header);
      expect(header.classList.contains('expanded')).toBe(true);
      expect(content.classList.contains('expanded')).toBe(true);

      window.app.toggleSection(header);
      expect(header.classList.contains('expanded')).toBe(false);
      expect(content.classList.contains('expanded')).toBe(false);
    });

    it('should close other sections when opening a new one', () => {
      const headers = document.querySelectorAll('.section-header');

      window.app.toggleSection(headers[0]);
      expect(headers[0].classList.contains('expanded')).toBe(true);

      window.app.toggleSection(headers[1]);
      expect(headers[0].classList.contains('expanded')).toBe(false);
      expect(headers[1].classList.contains('expanded')).toBe(true);
    });
  });

  describe('API Calls', () => {
    beforeEach(() => {
      window.app.zipCodeInput.value = '90210';
    });

    it('should call process-text API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          estimate: { recipeName: 'Test' }
        })
      });

      window.app.recipeTextArea.value = 'Test recipe';
      await window.app.processText();

      expect(global.fetch).toHaveBeenCalledWith('/api/process-text', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('should show error when zip code is missing', async () => {
      window.app.zipCodeInput.value = '';
      window.app.recipeTextArea.value = 'Test recipe';

      await window.app.processText();

      const errorEl = document.querySelector('.error-message');
      expect(errorEl.textContent).toBe('Please enter your zip code');
    });

    it('should show error when recipe text is empty', async () => {
      window.app.recipeTextArea.value = '';

      await window.app.processText();

      const errorEl = document.querySelector('.error-message');
      expect(errorEl.textContent).toBe('Please enter a recipe');
    });

    it('should call process-url API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          estimate: { recipeName: 'Test' }
        })
      });

      window.app.recipeUrlInput.value = 'https://example.com/recipe';
      await window.app.processUrl();

      expect(global.fetch).toHaveBeenCalledWith('/api/process-url', expect.objectContaining({
        method: 'POST'
      }));
    });

    it('should validate URL before processing', async () => {
      window.app.recipeUrlInput.value = 'not a valid url';

      await window.app.processUrl();

      const errorEl = document.querySelector('.error-message');
      expect(errorEl.textContent).toBe('Please enter a valid URL');
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      window.app.recipeTextArea.value = 'Test recipe';
      await window.app.processText();

      const errorEl = document.querySelector('.error-message');
      expect(errorEl.textContent).toBe('Server error');
    });
  });
});
