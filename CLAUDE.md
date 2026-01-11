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
├── agent-tools.js      # AI agent tool definitions and handlers
├── package.json        # Dependencies and scripts
├── jest.config.js      # Test configuration
├── .env.example        # Environment variable template
├── .gitignore
├── README.md
├── CLAUDE.md           # This file
├── docs/
│   └── user-flow.md    # State flow diagrams
├── tests/
│   ├── setup.js        # Jest setup
│   ├── server/         # Backend API tests
│   ├── client/         # Frontend tests
│   └── fixtures/       # Test fixtures
└── public/
    ├── index.html      # Mobile-first UI
    ├── styles.css      # Responsive CSS with dark mode
    └── app.js          # Frontend JavaScript
```

## Key Commands

```bash
npm install        # Install dependencies
npm start          # Start the server on port 3000
npm test           # Run tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## API Endpoints

### User-Facing API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process-image` | Upload recipe image for processing |
| POST | `/api/process-text` | Submit recipe text for cost estimation |
| POST | `/api/process-url` | Fetch and process recipe from URL |
| GET | `/api/health` | Health check endpoint |

### AI Agent API

The app exposes all UI capabilities as tools that AI agents can invoke programmatically.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/tools` | Get tool definitions (OpenAI/Claude format) |
| POST | `/api/agent/invoke` | Invoke a single tool |
| POST | `/api/agent/batch` | Invoke multiple tools in sequence |
| POST | `/api/agent/quick-estimate` | All-in-one estimation endpoint |

#### Available Agent Tools

| Tool | Description |
|------|-------------|
| `set_zip_code` | Set the user's zip code for regional pricing |
| `set_input_method` | Switch between text, url, or image input |
| `set_recipe_text` | Set recipe text for processing |
| `set_recipe_url` | Set recipe URL for fetching |
| `set_recipe_image` | Set base64-encoded recipe image |
| `estimate_costs` | Process current input and generate estimate |
| `get_session_state` | Get current session state |
| `get_results` | Get the last cost estimate results |
| `reset_session` | Clear all inputs and start fresh |
| `list_available_tools` | List all available tools |

#### Example: Invoke a Tool

```bash
curl -X POST http://localhost:3000/api/agent/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "set_zip_code",
    "parameters": {
      "session_id": "my-session-123",
      "zip_code": "90210"
    }
  }'
```

#### Example: Quick Estimate

```bash
curl -X POST http://localhost:3000/api/agent/quick-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "zipCode": "90210",
    "recipeText": "Chocolate Chip Cookies\n2 cups flour\n1 cup butter..."
  }'
```

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
