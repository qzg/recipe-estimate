# Recipe Cost Estimator

A mobile-first web application that helps home bakers and food entrepreneurs estimate recipe costs including ingredients, packaging, and labor.

## Features

- **Multiple Input Methods:**
  - Take a photo of a recipe
  - Upload an image of a recipe
  - Type or paste recipe text
  - Enter a URL to a recipe website

- **Comprehensive Cost Analysis:**
  - Ingredient costs with package pricing
  - Packaging materials
  - Labor costs based on preparation time
  - Regional pricing based on zip code

- **Pricing Recommendations:**
  - Cost per serving
  - Suggested markup
  - Recommended selling price

## Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser

## Usage

1. Enter your zip code for accurate local pricing
2. Choose an input method:
   - **Photo**: Take or upload a picture of your recipe
   - **Type**: Enter your recipe manually
   - **URL**: Paste a link to an online recipe
3. Click "Estimate Costs" to generate a detailed breakdown
4. Review the cost analysis including:
   - Ingredient costs with package details
   - Packaging recommendations
   - Labor time and costs
   - Recommended pricing with markup

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **AI**: OpenAI GPT-4o for image processing and cost estimation
- **Web Scraping**: Cheerio for recipe extraction from URLs

## API Endpoints

- `POST /api/process-image` - Process recipe from uploaded image
- `POST /api/process-text` - Process typed recipe text
- `POST /api/process-url` - Extract and process recipe from URL
- `GET /api/health` - Health check endpoint

## License

MIT
