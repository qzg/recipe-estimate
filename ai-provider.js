/**
 * AI Provider Abstraction Layer
 *
 * Supports multiple AI providers (Gemini, OpenAI) with a unified interface.
 * Default: Gemini 3 Flash
 */

const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

// Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2';

// Gemini 3 specific settings
// Note: Gemini 3 uses thinking_level instead of thinking_budget
// Options: 'minimal', 'low', 'medium', 'high' (default)
const GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low';

/**
 * Initialize AI clients based on available API keys
 */
let geminiClient = null;
let openaiClient = null;

function initializeClients() {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}

/**
 * Get the active AI provider
 */
function getActiveProvider() {
  const provider = AI_PROVIDER.toLowerCase();

  if (provider === 'gemini' && !geminiClient) {
    if (openaiClient) {
      console.warn('Gemini API key not found, falling back to OpenAI');
      return 'openai';
    }
    throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY');
  }

  if (provider === 'openai' && !openaiClient) {
    if (geminiClient) {
      console.warn('OpenAI API key not found, falling back to Gemini');
      return 'gemini';
    }
    throw new Error('No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY');
  }

  return provider;
}

/**
 * Generate content using Gemini
 */
async function generateWithGemini(prompt, systemPrompt = null, options = {}) {
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
  }

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
    config: {
      // Gemini 3 Flash: Keep temperature at 1.0 (changing it may cause issues)
      temperature: 1.0,
      maxOutputTokens: options.maxTokens || 3000,
      // Gemini 3 uses thinking_level instead of thinking_budget
      thinkingConfig: {
        thinkingLevel: GEMINI_THINKING_LEVEL
      }
    }
  });

  return response.text;
}

/**
 * Generate content with image using Gemini
 */
async function generateWithImageGemini(prompt, base64Image, mimeType, options = {}) {
  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      temperature: 1.0,
      maxOutputTokens: options.maxTokens || 2000,
      thinkingConfig: {
        thinkingLevel: GEMINI_THINKING_LEVEL
      }
    }
  });

  return response.text;
}

/**
 * Generate content using OpenAI
 */
async function generateWithOpenAI(prompt, systemPrompt = null, options = {}) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages: messages,
    max_completion_tokens: options.maxTokens || 3000,
    temperature: options.temperature || 0.3
  });

  return response.choices[0].message.content;
}

/**
 * Generate content with image using OpenAI
 */
async function generateWithImageOpenAI(prompt, base64Image, mimeType, options = {}) {
  const response = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_completion_tokens: options.maxTokens || 2000
  });

  return response.choices[0].message.content;
}

/**
 * Unified text generation interface
 */
async function generateContent(prompt, systemPrompt = null, options = {}) {
  initializeClients();
  const provider = getActiveProvider();

  if (provider === 'gemini') {
    return generateWithGemini(prompt, systemPrompt, options);
  } else {
    return generateWithOpenAI(prompt, systemPrompt, options);
  }
}

/**
 * Unified image+text generation interface
 */
async function generateContentWithImage(prompt, base64Image, mimeType, options = {}) {
  initializeClients();
  const provider = getActiveProvider();

  if (provider === 'gemini') {
    return generateWithImageGemini(prompt, base64Image, mimeType, options);
  } else {
    return generateWithImageOpenAI(prompt, base64Image, mimeType, options);
  }
}

/**
 * Get current provider info for debugging/logging
 */
function getProviderInfo() {
  initializeClients();
  const provider = getActiveProvider();

  return {
    provider: provider,
    model: provider === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL,
    configured: {
      gemini: !!geminiClient,
      openai: !!openaiClient
    }
  };
}

module.exports = {
  generateContent,
  generateContentWithImage,
  getProviderInfo,
  getActiveProvider,
  // Export for testing
  initializeClients
};
