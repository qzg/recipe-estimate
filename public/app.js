// Recipe Cost Estimator - Frontend Application

class RecipeCostEstimator {
  constructor() {
    this.selectedImage = null;
    this.currentTab = 'camera';
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.loadSavedZipCode();
  }

  bindElements() {
    // Zip code
    this.zipCodeInput = document.getElementById('zipCode');

    // Tabs
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanels = document.querySelectorAll('.tab-panel');

    // Camera/Photo elements
    this.cameraPreview = document.getElementById('cameraPreview');
    this.previewImage = document.getElementById('previewImage');
    this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
    this.takePhotoBtn = document.getElementById('takePhotoBtn');
    this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    this.fileInput = document.getElementById('fileInput');
    this.galleryInput = document.getElementById('galleryInput');
    this.processImageBtn = document.getElementById('processImageBtn');

    // Text elements
    this.recipeTextArea = document.getElementById('recipeText');
    this.processTextBtn = document.getElementById('processTextBtn');

    // URL elements
    this.recipeUrlInput = document.getElementById('recipeUrl');
    this.processUrlBtn = document.getElementById('processUrlBtn');

    // Loading & Results
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.resultsSection = document.getElementById('resultsSection');
    this.newEstimateBtn = document.getElementById('newEstimateBtn');

    // Section headers for accordion
    this.sectionHeaders = document.querySelectorAll('.section-header');
  }

  bindEvents() {
    // Tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Camera/Photo
    this.takePhotoBtn.addEventListener('click', () => this.fileInput.click());
    this.uploadPhotoBtn.addEventListener('click', () => this.galleryInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleImageSelect(e));
    this.galleryInput.addEventListener('change', (e) => this.handleImageSelect(e));
    this.processImageBtn.addEventListener('click', () => this.processImage());

    // Text
    this.processTextBtn.addEventListener('click', () => this.processText());

    // URL
    this.processUrlBtn.addEventListener('click', () => this.processUrl());

    // New Estimate
    this.newEstimateBtn.addEventListener('click', () => this.resetForm());

    // Zip code save
    this.zipCodeInput.addEventListener('change', () => this.saveZipCode());

    // Accordion sections
    this.sectionHeaders.forEach(header => {
      header.addEventListener('click', () => this.toggleSection(header));
    });

    // Enter key handlers
    this.recipeUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.processUrl();
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update panels
    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });
  }

  handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showError('Please select a valid image file');
      return;
    }

    this.selectedImage = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage.src = e.target.result;
      this.previewImage.style.display = 'block';
      this.cameraPlaceholder.style.display = 'none';
      this.processImageBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  async processImage() {
    if (!this.selectedImage) {
      this.showError('Please select an image first');
      return;
    }

    const zipCode = this.getZipCode();
    if (!zipCode) {
      this.showError('Please enter your zip code');
      return;
    }

    this.showLoading();

    try {
      const formData = new FormData();
      formData.append('image', this.selectedImage);
      formData.append('zipCode', zipCode);

      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      this.displayResults(data.estimate);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async processText() {
    const recipeText = this.recipeTextArea.value.trim();

    if (!recipeText) {
      this.showError('Please enter a recipe');
      return;
    }

    const zipCode = this.getZipCode();
    if (!zipCode) {
      this.showError('Please enter your zip code');
      return;
    }

    this.showLoading();

    try {
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeText, zipCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process recipe');
      }

      this.displayResults(data.estimate);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async processUrl() {
    const url = this.recipeUrlInput.value.trim();

    if (!url) {
      this.showError('Please enter a URL');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showError('Please enter a valid URL');
      return;
    }

    const zipCode = this.getZipCode();
    if (!zipCode) {
      this.showError('Please enter your zip code');
      return;
    }

    this.showLoading();

    try {
      const response = await fetch('/api/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, zipCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process URL');
      }

      this.displayResults(data.estimate);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  displayResults(estimate) {
    // Recipe name and servings
    document.getElementById('recipeName').textContent = estimate.recipeName || 'Recipe';
    document.getElementById('servingsCount').textContent = estimate.servings || 'N/A';

    // Ingredients
    this.renderIngredients(estimate.ingredients || []);
    document.getElementById('ingredientsSubtotal').textContent =
      this.formatCurrency(estimate.ingredientsSubtotal);

    // Packaging
    this.renderPackaging(estimate.packaging || []);
    document.getElementById('packagingSubtotal').textContent =
      this.formatCurrency(estimate.packagingSubtotal);

    // Labor
    this.renderLabor(estimate.labor || {});
    document.getElementById('laborSubtotal').textContent =
      this.formatCurrency(estimate.laborSubtotal);

    // Totals
    document.getElementById('totalCost').textContent =
      this.formatCurrency(estimate.totalCost);
    document.getElementById('costPerServing').textContent =
      this.formatCurrency(estimate.costPerServing);
    document.getElementById('suggestedMarkup').textContent =
      `${((estimate.suggestedMarkup || 0) * 100).toFixed(0)}%`;

    // Pricing
    document.getElementById('pricePerServing').textContent =
      this.formatCurrency(estimate.pricePerServing);
    document.getElementById('priceWholeRecipe').textContent =
      this.formatCurrency(estimate.priceForWholeRecipe);

    // Notes
    if (estimate.notes) {
      document.getElementById('estimateNotes').textContent = estimate.notes;
      document.getElementById('notesSection').style.display = 'block';
    } else {
      document.getElementById('notesSection').style.display = 'none';
    }

    // Show results
    this.resultsSection.style.display = 'block';

    // Scroll to results
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Expand first section by default
    const firstHeader = this.sectionHeaders[0];
    if (firstHeader) {
      this.toggleSection(firstHeader, true);
    }
  }

  renderIngredients(ingredients) {
    const container = document.getElementById('ingredientsList');
    container.innerHTML = '';

    if (ingredients.length === 0) {
      container.innerHTML = '<p class="item-info">No ingredients listed</p>';
      return;
    }

    ingredients.forEach(ing => {
      const item = document.createElement('div');
      item.className = 'ingredient-item';
      item.innerHTML = `
        <div class="item-details">
          <div class="item-name">${ing.name}</div>
          <div class="item-info">
            ${ing.quantity} • ${ing.packageSize} @ ${this.formatCurrency(ing.packagePrice)}
          </div>
        </div>
        <div class="item-cost">${this.formatCurrency(ing.cost)}</div>
      `;
      container.appendChild(item);
    });
  }

  renderPackaging(packaging) {
    const container = document.getElementById('packagingList');
    container.innerHTML = '';

    if (packaging.length === 0) {
      container.innerHTML = '<p class="item-info">No packaging items</p>';
      return;
    }

    packaging.forEach(pkg => {
      const item = document.createElement('div');
      item.className = 'packaging-item';
      item.innerHTML = `
        <div class="item-details">
          <div class="item-name">${pkg.item}</div>
          <div class="item-info">
            ${pkg.quantity} × ${this.formatCurrency(pkg.unitPrice)}
          </div>
        </div>
        <div class="item-cost">${this.formatCurrency(pkg.cost)}</div>
      `;
      container.appendChild(item);
    });
  }

  renderLabor(labor) {
    const container = document.getElementById('laborDetails');
    container.innerHTML = `
      <div class="labor-item">
        <span class="label">Prep Time</span>
        <span class="value">${labor.prepTime || 0} min</span>
      </div>
      <div class="labor-item">
        <span class="label">Active Time</span>
        <span class="value">${labor.activeTime || 0} min</span>
      </div>
      <div class="labor-item">
        <span class="label">Total Time</span>
        <span class="value">${labor.totalTime || 0} min</span>
      </div>
      <div class="labor-item">
        <span class="label">Hourly Rate</span>
        <span class="value">${this.formatCurrency(labor.suggestedHourlyRate || 0)}/hr</span>
      </div>
      <div class="labor-item total">
        <span class="label">Labor Cost</span>
        <span class="value">${this.formatCurrency(labor.laborCost || 0)}</span>
      </div>
    `;
  }

  toggleSection(header, forceOpen = false) {
    const sectionContent = header.nextElementSibling;
    const isExpanded = header.classList.contains('expanded');

    if (forceOpen && isExpanded) return;

    // Close all sections first
    this.sectionHeaders.forEach(h => {
      h.classList.remove('expanded');
      h.nextElementSibling.classList.remove('expanded');
    });

    // Open clicked section if it wasn't open
    if (!isExpanded || forceOpen) {
      header.classList.add('expanded');
      sectionContent.classList.add('expanded');
    }
  }

  resetForm() {
    // Reset image
    this.selectedImage = null;
    this.previewImage.src = '';
    this.previewImage.style.display = 'none';
    this.cameraPlaceholder.style.display = 'flex';
    this.processImageBtn.style.display = 'none';
    this.fileInput.value = '';
    this.galleryInput.value = '';

    // Reset text
    this.recipeTextArea.value = '';

    // Reset URL
    this.recipeUrlInput.value = '';

    // Hide results
    this.resultsSection.style.display = 'none';

    // Remove error messages
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(e => e.remove());

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showLoading() {
    this.loadingOverlay.classList.add('active');
  }

  hideLoading() {
    this.loadingOverlay.classList.remove('active');
  }

  showError(message) {
    // Remove existing error
    const existing = document.querySelector('.error-message');
    if (existing) existing.remove();

    // Create error element
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;

    // Insert before results or at end of main content
    const insertBefore = this.resultsSection.style.display !== 'none'
      ? this.resultsSection
      : null;

    const parent = document.querySelector('.main-content');
    if (insertBefore) {
      parent.insertBefore(error, insertBefore);
    } else {
      parent.appendChild(error);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => error.remove(), 5000);

    // Scroll error into view
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getZipCode() {
    const zip = this.zipCodeInput.value.trim();
    return /^\d{5}$/.test(zip) ? zip : null;
  }

  saveZipCode() {
    const zip = this.zipCodeInput.value.trim();
    if (/^\d{5}$/.test(zip)) {
      localStorage.setItem('recipeCostZipCode', zip);
    }
  }

  loadSavedZipCode() {
    const saved = localStorage.getItem('recipeCostZipCode');
    if (saved) {
      this.zipCodeInput.value = saved;
    }
  }

  formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RecipeCostEstimator();
});
