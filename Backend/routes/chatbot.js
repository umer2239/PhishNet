const express = require('express');
const router = express.Router();
const { optionalAuthMiddleware } = require('../middleware/auth');

// Initialize OpenAI - will be set after npm install
let openai = null;

try {
  const OpenAI = require('openai');
  
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } else {
    console.warn('⚠️  OPENAI_API_KEY not set. Chatbot will use fallback responses.');
  }
} catch (error) {
  console.warn('⚠️  OpenAI package not installed. Run: npm install openai');
}

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a helpful AI assistant for PhishNet, a phishing protection website. Your role is to:

1. Answer questions about phishing, cybersecurity, and online safety
2. Explain how PhishNet works and its features
3. Guide users on how to check URLs for phishing
4. Provide tips on staying safe online
5. Help users understand threat reports

IMPORTANT RULES:
- Only answer questions related to phishing, cybersecurity, PhishNet features, and online safety
- If asked about unrelated topics, politely redirect to phishing/security topics
- Be concise, friendly, and helpful
- Use emojis occasionally to be engaging
- If you don't know something, admit it honestly

PhishNet Features:
- Real-time URL scanning and phishing detection
- AI-powered threat analysis with confidence scoring
- User dashboard with scan history
- Detailed threat reports
- Browser protection recommendations

Keep responses under 150 words unless detailed explanation is needed.`;

// Fallback responses when OpenAI is not available
const fallbackResponses = {
  greeting: "👋 Hello! I'm your PhishNet assistant. I can help you with phishing protection, URL scanning, and cybersecurity tips. What would you like to know?",
  
  phishing: "🎣 Phishing is when attackers try to steal your personal information by pretending to be someone trustworthy. PhishNet helps detect phishing emails and malicious URLs using AI. Want to learn how to spot phishing attempts?",
  
  urlCheck: "🔍 To check if a URL is safe:\n1. Go to the Dashboard\n2. Paste the suspicious URL\n3. Click 'Analyze URL'\n4. Review the threat report\n\nOur AI analyzes the URL and gives you a safety score!",
  
  features: "✨ PhishNet offers:\n• Real-time URL scanning\n• AI-powered phishing detection\n• Threat confidence scoring\n• Scan history tracking\n• Detailed security reports\n• Browser protection tips\n\nWant to try scanning a URL?",
  
  howTo: "🚀 Getting started:\n1. Sign up for a free account\n2. Access the Dashboard\n3. Paste any suspicious URL or email link\n4. Get instant threat analysis\n5. View detailed reports\n\nIt's that simple! Ready to scan your first URL?",
  
  safety: "🛡️ Stay safe online:\n• Never click suspicious links\n• Check sender email addresses\n• Look for HTTPS in URLs\n• Don't share personal info via email\n• Use PhishNet to verify links\n• Enable 2FA on accounts\n• Keep software updated",
  
  default: "I'm here to help with phishing protection and cybersecurity. I can answer questions about:\n• How to detect phishing\n• Using PhishNet features\n• Staying safe online\n• Understanding threat reports\n\nWhat would you like to know?"
};

function getFallbackResponse(message) {
  const lowerMsg = message.toLowerCase();

  if (/(hello|hi|hey|good morning|good evening)/i.test(lowerMsg)) {
    return fallbackResponses.greeting;
  }
  
  if (/(phishing|phish|scam|fraud|fake)/i.test(lowerMsg)) {
    return fallbackResponses.phishing;
  }
  
  if (/(url|link|website|check|scan|analyze)/i.test(lowerMsg)) {
    return fallbackResponses.urlCheck;
  }
  
  if (/(feature|what can|help|capability)/i.test(lowerMsg)) {
    return fallbackResponses.features;
  }
  
  if (/(how to|get started|use|begin)/i.test(lowerMsg)) {
    return fallbackResponses.howTo;
  }
  
  if (/(safe|protect|security|tip)/i.test(lowerMsg)) {
    return fallbackResponses.safety;
  }

  return fallbackResponses.default;
}

// Attachment validation helpers
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

function normalizeDataUrl({ dataUrl, mimeType }) {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('data:')) return dataUrl;
  if (mimeType && ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return `data:${mimeType};base64,${dataUrl}`;
  }
  return null;
}

function validateAttachment(attachment) {
  if (!attachment) return { isValid: false, message: 'No attachment provided' };
  const { dataUrl, mimeType } = attachment;
  if (!dataUrl || !mimeType) return { isValid: false, message: 'Attachment is missing data or mime type' };
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return { isValid: false, message: 'Only image attachments (png, jpg, jpeg, webp) are allowed' };

  const base64Part = dataUrl.split(',')[1] || dataUrl;
  let byteLength = 0;
  try {
    byteLength = Buffer.from(base64Part, 'base64').length;
  } catch (e) {
    return { isValid: false, message: 'Invalid attachment encoding' };
  }

  if (byteLength > MAX_IMAGE_BYTES) {
    return { isValid: false, message: 'Attachment is too large. Max 2MB.' };
  }

  return { isValid: true, normalizedDataUrl: normalizeDataUrl({ dataUrl, mimeType }) };
}

// POST /api/chatbot/message - Handle chat messages
router.post('/message', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { message = '', attachment } = req.body;
    const userMessage = typeof message === 'string' ? message : String(message || '');

    // Validation
    if (!userMessage && !attachment) {
      return res.status(400).json({
        success: false,
        message: 'Message or attachment is required',
      });
    }

    if (userMessage && userMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long. Please keep it under 500 characters.',
      });
    }

    let validatedAttachment = null;
    if (attachment) {
      const validation = validateAttachment(attachment);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      validatedAttachment = {
        name: attachment.name,
        mimeType: attachment.mimeType,
        dataUrl: validation.normalizedDataUrl,
      };
    }

    let reply;

    // Use OpenAI if available, otherwise use fallback
    if (openai) {
      try {
        const userContent = [];
        if (userMessage) {
          userContent.push({ type: 'text', text: userMessage });
        }
        if (validatedAttachment?.dataUrl) {
          userContent.push({ type: 'image_url', image_url: { url: validatedAttachment.dataUrl } });
        }

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent.length > 0 ? userContent : [{ type: 'text', text: 'Please describe the attachment.' }] }
          ],
          max_tokens: 300,
          temperature: 0.7,
        });

        reply = completion.choices[0].message.content.trim();
      } catch (error) {
        console.error('OpenAI API error:', error.message);
        // Fallback to rule-based response on API error
        const fallbackMsg = userMessage || 'Attachment received.';
        reply = validatedAttachment
          ? `${getFallbackResponse(fallbackMsg)}

(Note: Vision is unavailable right now, so I could not view the attachment.)`
          : getFallbackResponse(fallbackMsg);
      }
    } else {
      // Use fallback responses
      const fallbackMsg = userMessage || 'Attachment received.';
      reply = validatedAttachment
        ? `${getFallbackResponse(fallbackMsg)}

(Note: Vision is unavailable right now, so I could not view the attachment.)`
        : getFallbackResponse(fallbackMsg);
    }

    res.json({
      success: true,
      data: {
        reply,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chatbot/status - Check chatbot status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      aiPowered: !!openai,
      model: openai ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'fallback',
    },
  });
});

module.exports = router;
