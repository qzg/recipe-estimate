require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function to extract recipe from image using OpenAI Vision
async function extractRecipeFromImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please extract the complete recipe from this image. Include the recipe name, all ingredients with their quantities, and all instructions. Format it clearly with sections for ingredients and instructions.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 2000
  });

  // Clean up uploaded file
  fs.unlinkSync(imagePath);

  return response.choices[0].message.content;
}

// Helper function to extract recipe from URL
async function extractRecipeFromUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

    // Try to find recipe-specific content
    let recipeContent = '';

    // Look for common recipe schema markup
    const jsonLd = $('script[type="application/ld+json"]').text();
    if (jsonLd) {
      try {
        const schemas = JSON.parse(jsonLd);
        const recipeSchema = Array.isArray(schemas)
          ? schemas.find(s => s['@type'] === 'Recipe')
          : schemas['@type'] === 'Recipe' ? schemas : null;

        if (recipeSchema) {
          recipeContent = `Recipe: ${recipeSchema.name || 'Unknown'}\n\n`;
          if (recipeSchema.recipeIngredient) {
            recipeContent += 'Ingredients:\n' + recipeSchema.recipeIngredient.join('\n') + '\n\n';
          }
          if (recipeSchema.recipeInstructions) {
            recipeContent += 'Instructions:\n';
            if (Array.isArray(recipeSchema.recipeInstructions)) {
              recipeSchema.recipeInstructions.forEach((inst, i) => {
                const text = typeof inst === 'string' ? inst : inst.text;
                recipeContent += `${i + 1}. ${text}\n`;
              });
            } else {
              recipeContent += recipeSchema.recipeInstructions;
            }
          }
          if (recipeSchema.recipeYield) {
            recipeContent += `\nServings: ${recipeSchema.recipeYield}`;
          }
        }
      } catch (e) {
        // JSON parsing failed, continue with text extraction
      }
    }

    // If no structured data, extract main content
    if (!recipeContent) {
      // Try common recipe container selectors
      const selectors = [
        '.recipe-content',
        '.recipe',
        '[itemtype*="Recipe"]',
        'article',
        'main',
        '.post-content',
        '.entry-content'
      ];

      for (const selector of selectors) {
        const content = $(selector).first().text();
        if (content && content.length > 200) {
          recipeContent = content;
          break;
        }
      }

      // Fallback to body text
      if (!recipeContent) {
        recipeContent = $('body').text();
      }
    }

    // Clean up whitespace
    recipeContent = recipeContent.replace(/\s+/g, ' ').trim().substring(0, 8000);

    return recipeContent;
  } catch (error) {
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
}

// Helper function to generate cost estimate using OpenAI
async function generateCostEstimate(recipeText, zipCode) {
  const prompt = `You are a professional cost estimation assistant for home bakers and food entrepreneurs. Analyze the following recipe and provide a detailed cost estimate.

RECIPE:
${recipeText}

USER'S ZIP CODE: ${zipCode}

Please provide a comprehensive cost estimate in the following JSON format. Use realistic prices based on typical grocery costs in the ${zipCode} area. Consider regional price variations.

{
  "recipeName": "Name of the recipe",
  "servings": number,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount needed for recipe",
      "packageSize": "typical store package size",
      "packagePrice": number (price per package),
      "amountUsed": "fraction or amount of package used",
      "cost": number (cost for this recipe)
    }
  ],
  "ingredientsSubtotal": number,
  "packaging": [
    {
      "item": "packaging item name",
      "quantity": number,
      "unitPrice": number,
      "cost": number
    }
  ],
  "packagingSubtotal": number,
  "labor": {
    "prepTime": number (minutes),
    "activeTime": number (minutes),
    "totalTime": number (minutes),
    "suggestedHourlyRate": number,
    "laborCost": number
  },
  "laborSubtotal": number,
  "totalCost": number,
  "costPerServing": number,
  "suggestedMarkup": number (as decimal, e.g., 0.5 for 50%),
  "pricePerServing": number,
  "priceForWholeRecipe": number,
  "notes": "Any relevant notes about the estimate or regional pricing considerations"
}

Important guidelines:
1. Be realistic about ingredient costs - use average grocery store prices for the area
2. Consider that home bakers often buy in smaller quantities
3. Include appropriate packaging for the type of product (containers, bags, labels, etc.)
4. Suggest an hourly rate appropriate for skilled home food production ($15-25/hour typically)
5. Apply a reasonable markup (typically 40-60% for home food businesses)
6. Provide the response ONLY as valid JSON, no additional text`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a professional cost estimation assistant. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 3000,
    temperature: 0.3
  });

  const content = response.choices[0].message.content;

  // Try to parse JSON from response
  try {
    // Remove any markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = jsonMatch[1].trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    // Try to find JSON object in response
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
    }
    throw new Error('Failed to parse cost estimate response');
  }
}

// Routes

// Process image upload
app.post('/api/process-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const zipCode = req.body.zipCode || '10001';
    const recipeText = await extractRecipeFromImage(req.file.path);
    const estimate = await generateCostEstimate(recipeText, zipCode);

    res.json({
      success: true,
      recipeText,
      estimate
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process URL
app.post('/api/process-url', async (req, res) => {
  try {
    const { url, zipCode = '10001' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const recipeContent = await extractRecipeFromUrl(url);
    const estimate = await generateCostEstimate(recipeContent, zipCode);

    res.json({
      success: true,
      recipeText: recipeContent.substring(0, 2000),
      estimate
    });
  } catch (error) {
    console.error('URL processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process text input
app.post('/api/process-text', async (req, res) => {
  try {
    const { recipeText, zipCode = '10001' } = req.body;

    if (!recipeText) {
      return res.status(400).json({ error: 'No recipe text provided' });
    }

    const estimate = await generateCostEstimate(recipeText, zipCode);

    res.json({
      success: true,
      recipeText,
      estimate
    });
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Recipe Cost Estimator running on http://localhost:${PORT}`);
});
