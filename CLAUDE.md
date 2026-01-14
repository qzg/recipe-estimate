# CLAUDE.md - Project Context for AI Assistants

## Project Overview

Recipe Cost Estimator is a mobile-first web application that helps home bakers and food entrepreneurs calculate recipe costs including ingredients, packaging, and labor.

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla HTML, CSS, JavaScript (mobile-first responsive design)
- **AI Model**: Google Gemini 3 Flash (default) or OpenAI GPT-5.2 (configurable)
- **Dependencies**:
  - `@google/genai` - Google Gemini API client (new unified SDK)
  - `openai` - OpenAI API client (optional fallback)
  - `multer` - Image upload handling
  - `axios` - HTTP requests for URL fetching
  - `cheerio` - HTML parsing for recipe extraction from URLs

## Project Structure

```
recipe-estimate/
├── server.js           # Express backend, API routes, AI integration
├── ai-provider.js      # AI provider abstraction (Gemini/OpenAI)
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
```bash
# AI Provider: 'gemini' (default) or 'openai'
AI_PROVIDER=gemini

# For Gemini (default)
GEMINI_API_KEY=your_gemini_api_key_here

# For OpenAI (optional fallback)
OPENAI_API_KEY=your_openai_api_key_here

# Optional
PORT=3000
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_THINKING_LEVEL=low
OPENAI_MODEL=gpt-5.2
```

## AI Model Configuration

This project defaults to **Google Gemini 3 Flash** (`gemini-3-flash-preview`) with OpenAI as an optional fallback. The AI provider abstraction is in `ai-provider.js`.

### Gemini 3 Flash (Default)

**Model ID**: `gemini-3-flash-preview`

Key characteristics:
- Pro-level intelligence at Flash speed and pricing
- 1M input token context window, 64k output tokens
- $0.50/M input tokens, $3.00/M output tokens

**IMPORTANT - Gemini 3 Differences from Previous Versions:**

1. **Thinking Level Parameter** - Gemini 3 uses `thinkingConfig.thinkingLevel` instead of the deprecated `thinking_budget`. Options are: `minimal`, `low`, `medium`, `high` (default). Do NOT use both parameters in the same request.

2. **Temperature Must Stay at 1.0** - Changing the temperature below 1.0 may cause unexpected behavior like looping or degraded performance. The project keeps temperature at 1.0 for Gemini.

3. **No Image Segmentation** - Native image segmentation is not supported in Gemini 3 Flash. For workloads requiring segmentation, use Gemini 2.5 Flash with thinking off.

4. **New SDK** - Uses the unified `@google/genai` SDK (not the deprecated `@google/generative-ai`).

### OpenAI GPT-5.2 (Fallback)

If `AI_PROVIDER=openai` or Gemini API key is not set, falls back to OpenAI GPT-5.2.

### AI Operations

1. **Image text extraction** (`extractRecipeFromImage` in server.js:51)
   - Uses vision capabilities to read recipe images

2. **Cost estimation** (`generateCostEstimate` in server.js:156)
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
