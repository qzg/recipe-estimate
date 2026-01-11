/**
 * AI Agent Tools Module
 *
 * Exposes all UI capabilities as programmable tools that an AI agent can invoke.
 * Each tool maps to a user action in the web interface.
 */

const fs = require('fs');
const path = require('path');

// Session state management (in production, use Redis or similar)
const sessions = new Map();

class AgentSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.zipCode = null;
    this.inputMethod = 'text'; // 'text', 'url', 'image'
    this.recipeText = null;
    this.recipeUrl = null;
    this.imageBase64 = null;
    this.imageMimeType = null;
    this.lastResult = null;
    this.lastError = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  update() {
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      zipCode: this.zipCode,
      inputMethod: this.inputMethod,
      hasRecipeText: !!this.recipeText,
      recipeTextPreview: this.recipeText ? this.recipeText.substring(0, 100) + '...' : null,
      recipeUrl: this.recipeUrl,
      hasImage: !!this.imageBase64,
      hasResult: !!this.lastResult,
      lastError: this.lastError,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new AgentSession(sessionId));
  }
  return sessions.get(sessionId);
}

/**
 * Tool Definitions for AI Agents
 * These can be used with OpenAI function calling, Claude tools, etc.
 */
const toolDefinitions = [
  {
    name: 'set_zip_code',
    description: 'Set the user\'s zip code for regional pricing estimates. Must be a valid 5-digit US zip code.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier for tracking state'
        },
        zip_code: {
          type: 'string',
          description: 'A valid 5-digit US zip code (e.g., "90210", "10001")',
          pattern: '^[0-9]{5}$'
        }
      },
      required: ['session_id', 'zip_code']
    }
  },
  {
    name: 'set_input_method',
    description: 'Switch between input methods: text (type recipe), url (paste recipe URL), or image (upload recipe photo)',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        },
        method: {
          type: 'string',
          enum: ['text', 'url', 'image'],
          description: 'The input method to use: text, url, or image'
        }
      },
      required: ['session_id', 'method']
    }
  },
  {
    name: 'set_recipe_text',
    description: 'Set the recipe text when using text input method. Include recipe name, ingredients with quantities, and instructions.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        },
        recipe_text: {
          type: 'string',
          description: 'The full recipe text including name, ingredients, and instructions'
        }
      },
      required: ['session_id', 'recipe_text']
    }
  },
  {
    name: 'set_recipe_url',
    description: 'Set the URL of a recipe page when using URL input method.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        },
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL of the recipe page to fetch and process'
        }
      },
      required: ['session_id', 'url']
    }
  },
  {
    name: 'set_recipe_image',
    description: 'Set a recipe image when using image input method. Provide base64-encoded image data.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        },
        image_base64: {
          type: 'string',
          description: 'Base64-encoded image data (without data URL prefix)'
        },
        mime_type: {
          type: 'string',
          enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          description: 'MIME type of the image',
          default: 'image/jpeg'
        }
      },
      required: ['session_id', 'image_base64']
    }
  },
  {
    name: 'estimate_costs',
    description: 'Process the current input and generate a cost estimate. Requires zip code and appropriate input (text, URL, or image) to be set first.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'get_session_state',
    description: 'Get the current state of the session including what inputs are set and whether results are available.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'get_results',
    description: 'Get the cost estimate results from the last successful estimation.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'reset_session',
    description: 'Clear all inputs and results, starting fresh.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Unique session identifier'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'list_available_tools',
    description: 'List all available tools and their descriptions.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

/**
 * Tool Handlers
 */
const toolHandlers = {
  set_zip_code: async ({ session_id, zip_code }) => {
    if (!/^\d{5}$/.test(zip_code)) {
      return { success: false, error: 'Invalid zip code. Must be 5 digits.' };
    }
    const session = getOrCreateSession(session_id);
    session.zipCode = zip_code;
    session.update();
    return { success: true, message: `Zip code set to ${zip_code}` };
  },

  set_input_method: async ({ session_id, method }) => {
    if (!['text', 'url', 'image'].includes(method)) {
      return { success: false, error: 'Invalid method. Use text, url, or image.' };
    }
    const session = getOrCreateSession(session_id);
    session.inputMethod = method;
    session.update();
    return { success: true, message: `Input method set to ${method}` };
  },

  set_recipe_text: async ({ session_id, recipe_text }) => {
    if (!recipe_text || recipe_text.trim().length === 0) {
      return { success: false, error: 'Recipe text cannot be empty.' };
    }
    const session = getOrCreateSession(session_id);
    session.recipeText = recipe_text;
    session.inputMethod = 'text';
    session.update();
    return {
      success: true,
      message: `Recipe text set (${recipe_text.length} characters)`,
      preview: recipe_text.substring(0, 200)
    };
  },

  set_recipe_url: async ({ session_id, url }) => {
    try {
      new URL(url);
    } catch {
      return { success: false, error: 'Invalid URL format.' };
    }
    const session = getOrCreateSession(session_id);
    session.recipeUrl = url;
    session.inputMethod = 'url';
    session.update();
    return { success: true, message: `Recipe URL set to ${url}` };
  },

  set_recipe_image: async ({ session_id, image_base64, mime_type = 'image/jpeg' }) => {
    if (!image_base64) {
      return { success: false, error: 'Image data is required.' };
    }
    // Validate base64
    try {
      const buffer = Buffer.from(image_base64, 'base64');
      if (buffer.length === 0) {
        return { success: false, error: 'Invalid base64 image data.' };
      }
    } catch {
      return { success: false, error: 'Invalid base64 encoding.' };
    }

    const session = getOrCreateSession(session_id);
    session.imageBase64 = image_base64;
    session.imageMimeType = mime_type;
    session.inputMethod = 'image';
    session.update();
    return {
      success: true,
      message: `Recipe image set (${Math.round(image_base64.length * 0.75 / 1024)} KB)`
    };
  },

  estimate_costs: async ({ session_id }, { processText, processUrl, processImage }) => {
    const session = getOrCreateSession(session_id);

    if (!session.zipCode) {
      return { success: false, error: 'Zip code is required. Use set_zip_code first.' };
    }

    session.lastError = null;
    session.lastResult = null;

    try {
      let result;

      switch (session.inputMethod) {
        case 'text':
          if (!session.recipeText) {
            return { success: false, error: 'Recipe text is required. Use set_recipe_text first.' };
          }
          result = await processText(session.recipeText, session.zipCode);
          break;

        case 'url':
          if (!session.recipeUrl) {
            return { success: false, error: 'Recipe URL is required. Use set_recipe_url first.' };
          }
          result = await processUrl(session.recipeUrl, session.zipCode);
          break;

        case 'image':
          if (!session.imageBase64) {
            return { success: false, error: 'Recipe image is required. Use set_recipe_image first.' };
          }
          result = await processImage(session.imageBase64, session.imageMimeType, session.zipCode);
          break;

        default:
          return { success: false, error: 'Invalid input method.' };
      }

      session.lastResult = result;
      session.update();

      return {
        success: true,
        estimate: result
      };
    } catch (error) {
      session.lastError = error.message;
      session.update();
      return { success: false, error: error.message };
    }
  },

  get_session_state: async ({ session_id }) => {
    const session = getOrCreateSession(session_id);
    return {
      success: true,
      state: session.toJSON()
    };
  },

  get_results: async ({ session_id }) => {
    const session = getOrCreateSession(session_id);
    if (!session.lastResult) {
      return {
        success: false,
        error: 'No results available. Use estimate_costs first.',
        hasError: !!session.lastError,
        lastError: session.lastError
      };
    }
    return {
      success: true,
      estimate: session.lastResult
    };
  },

  reset_session: async ({ session_id }) => {
    sessions.delete(session_id);
    return { success: true, message: 'Session reset successfully.' };
  },

  list_available_tools: async () => {
    return {
      success: true,
      tools: toolDefinitions.map(t => ({
        name: t.name,
        description: t.description,
        parameters: Object.keys(t.parameters.properties || {})
      }))
    };
  }
};

module.exports = {
  toolDefinitions,
  toolHandlers,
  getOrCreateSession,
  sessions,
  AgentSession
};
