# CLAUDE.md - Project Context for AI Assistants

## Project Overview

Recipe Cost Estimator is a mobile-first web application that helps home bakers and food entrepreneurs calculate recipe costs including ingredients, packaging, and labor.

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla HTML, CSS, JavaScript (mobile-first responsive design)
- **AI Model**: OpenAI GPT-5.2 (used for image text extraction and cost estimation)
- **Dependencies**:
  - `openai` - OpenAI API client
  - `multer` - Image upload handling
  - `axios` - HTTP requests for URL fetching
  - `cheerio` - HTML parsing for recipe extraction from URLs

## Project Structure

```
recipe-estimate/
├── server.js           # Express backend, API routes, OpenAI integration
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variable template
├── .gitignore
├── README.md
├── CLAUDE.md           # This file
├── docs/
│   └── user-flow.md    # State flow diagrams
└── public/
    ├── index.html      # Mobile-first UI
    ├── styles.css      # Responsive CSS with dark mode
    └── app.js          # Frontend JavaScript
```

## Key Commands

```bash
npm install    # Install dependencies
npm start      # Start the server on port 3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process-image` | Upload recipe image for processing |
| POST | `/api/process-text` | Submit recipe text for cost estimation |
| POST | `/api/process-url` | Fetch and process recipe from URL |
| GET | `/api/health` | Health check endpoint |

## Environment Variables

Required in `.env`:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000  # optional, defaults to 3000
```

## OpenAI Model Configuration

This project uses **GPT-5.2** for all AI operations:

1. **Image text extraction** (`extractRecipeFromImage` in server.js:62)
   - Uses vision capabilities to read recipe images

2. **Cost estimation** (`generateCostEstimate` in server.js:236)
   - Analyzes recipes and generates detailed cost breakdowns
   - Returns structured JSON with ingredients, packaging, labor, and pricing

## Code Conventions

- ES6+ JavaScript (CommonJS modules in Node.js)
- Mobile-first CSS with CSS custom properties for theming
- Dark mode support via `prefers-color-scheme` media query
- No frontend build step - vanilla JS for simplicity
- Async/await for all asynchronous operations

## Important Notes

- Uploaded images are stored temporarily in `uploads/` and deleted after processing
- Zip code is used for regional pricing estimates (stored in localStorage on client)
- The frontend uses a class-based architecture (`RecipeCostEstimator` in app.js)
- All API responses return JSON with `success` boolean and either `estimate` or `error`
