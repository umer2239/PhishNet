const express = require('express');
const router = express.Router();
const { optionalAuthMiddleware } = require('../middleware/auth');

// Use fetch to call Gemini API directly via REST
let apiKey = null;
let modelName = null;

if (process.env.GEMINI_API_KEY) {
  apiKey = process.env.GEMINI_API_KEY;
  modelName = process.env.GEMINI_MODEL || 'gemini-pro';
  console.log(`✓ Gemini AI configured with model: ${modelName}`);
  console.log(`✓ API will use endpoint: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`);
} else {
  console.warn('⚠️  GEMINI_API_KEY not set. Chatbot will use fallback responses.');
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

// Fallback responses when Gemini AI is not available
// Using smart pattern matching to provide contextual responses


function getFallbackResponse(message) {
  const lowerMsg = message.toLowerCase();

  // Detailed responses based on keywords
  if (/(phishing|phish|scam|fraud|fake|spoof)/i.test(lowerMsg)) {
    return `🎣 **Phishing Explained:**

Phishing is a cyber attack where criminals try to trick you into revealing sensitive information (passwords, credit cards, personal data) by pretending to be a trustworthy source.

**Common phishing tactics:**
• Fake emails from banks/companies
• Suspicious links in messages
• Urgent requests for information
• Lookalike websites (similar URLs)

**PhishNet Protection:**
PhishNet uses AI to analyze URLs and emails, checking for phishing indicators like:
✓ Domain reputation
✓ SSL certificate validity
✓ Content analysis
✓ Known phishing patterns

**Stay Safe:**
1. Never click links from unknown senders
2. Check email addresses carefully
3. Use PhishNet to verify suspicious links
4. Enable 2-factor authentication`;
  }
  
  if (/(url|link|website|check|scan|analyze|verify)/i.test(lowerMsg)) {
    return `🔍 **How to Check URLs with PhishNet:**

**Quick Steps:**
1. Go to PhishNet Dashboard
2. Paste the suspicious URL or email link
3. Click "Analyze URL"
4. View the threat report instantly

**What PhishNet Checks:**
✓ URL reputation (blacklists, databases)
✓ Domain age and registration
✓ SSL/TLS certificate
✓ Content analysis (phishing keywords)
✓ Redirects and obfuscation
✓ Historical threat data

**Confidence Score:**
Each analysis includes:
• **Safe (Green):** Low phishing risk
• **Warning (Yellow):** Suspicious indicators
• **Dangerous (Red):** High phishing risk

Try it now - paste any suspicious link!`;
  }
  
  if (/(feature|what can|help|capability|ability|tool)/i.test(lowerMsg)) {
    return `✨ **PhishNet Features:**

📊 **Dashboard**
• Real-time URL/email scanning
• Instant threat analysis
• AI-powered confidence scoring
• Detailed security reports

📈 **Analytics**
• Scan history & trends
• Threat statistics
• Top threats detected
• Platform insights

🛡️ **Protection**
• Browser extensions available
• Email integration
• Custom security rules
• API access for developers

📱 **Accessibility**
• Web-based interface
• Mobile-friendly
• Easy-to-understand reports
• Quick threat assessment

💡 **Intelligence**
• Machine learning detection
• Regular database updates
• Threat intelligence feeds
• Community reports

What feature interests you?`;
  }
  
  if (/(how to|get started|use|begin|start|tutorial|guide)/i.test(lowerMsg)) {
    return `🚀 **Getting Started with PhishNet:**

**Step 1: Sign Up**
• Create a free account
• Verify your email
• Set up your profile

**Step 2: Dashboard Tour**
• Explore the main interface
• Check available tools
• Review your settings

**Step 3: Your First Scan**
1. Click "Scan URL"
2. Paste suspicious link
3. Wait for analysis
4. Review threat report

**Step 4: Understand Results**
• Threat level (Safe/Warning/Dangerous)
• Confidence percentage
• Detailed indicators
• Recommendations

**Pro Tips:**
✓ Bookmark suspicious links for later
✓ Share reports with others
✓ Set up email alerts
✓ Install browser extension

Start scanning now - what URL would you like to check?`;
  }
  
  if (/(safe|protect|security|security|tip|prevent|avoid)/i.test(lowerMsg)) {
    return `🛡️ **Online Safety Tips:**

**Email Security:**
• Never click links from unknown senders
• Verify sender email address carefully
• Look for spelling mistakes
• Be suspicious of urgent requests
• Hover over links to see real URL

**Website Safety:**
• Check for HTTPS (padlock icon)
• Verify domain spelling
• Don't trust shortened URLs
• Use PhishNet to verify sites
• Look for legitimacy indicators

**Password Safety:**
• Use strong, unique passwords
• Enable 2-factor authentication
• Never share via email
• Change after suspicious activity
• Use password manager

**Account Protection:**
• Update software regularly
• Use antivirus software
• Monitor account activity
• Set recovery options
• Review connected apps

**PhishNet Benefits:**
✓ Verify URLs before clicking
✓ Instant threat detection
✓ AI-powered analysis
✓ Detailed reports
✓ Peace of mind

Need help with anything specific?`;
  }

  if (/(hello|hi|hey|good morning|good evening|greet)/i.test(lowerMsg)) {
    return `👋 **Welcome to PhishNet Assistant!**

I'm here to help you understand and stay safe from phishing attacks. I can answer questions about:

🎣 **Phishing Protection**
- What is phishing and how it works
- How to spot phishing attempts
- Common phishing tactics

🔍 **URL & Email Scanning**
- How to check suspicious links
- Understanding threat reports
- Using PhishNet tools

💡 **Features & Getting Started**
- PhishNet capabilities
- How to set up your account
- Using the dashboard

🛡️ **Online Safety Tips**
- Best practices for email
- Website verification
- Account protection

**Quick Examples:**
• "What is phishing?"
• "How do I scan a URL?"
• "Tell me about PhishNet features"
• "What are phishing red flags?"

What would you like to know?`;
  }

  // Smart generic response that acknowledges the question
  return `🤖 **I'm here to help!**

I can assist you with:
- **Phishing attacks & detection** - How they work and how to stay safe
- **URL scanning & verification** - Check suspicious links with PhishNet
- **Email security** - Identify phishing emails and protect your accounts
- **PhishNet features** - Dashboard, analytics, browser extensions
- **Getting started** - Setting up your account and first scan
- **Online safety tips** - Best practices and security recommendations

Regarding your question about "${message}": This sounds like it might relate to cybersecurity or phishing protection. 

**For more specific help, try asking:**
- "What is phishing?"
- "How do I check if a URL is safe?"
- "What PhishNet features are available?"
- "How do I protect my email?"

How can I assist you today?`;
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

    // Use Gemini AI if available, otherwise use fallback
    if (apiKey) {
      try {
        const prompt = `${SYSTEM_PROMPT}\n\nUser: ${userMessage || 'Please describe this image.'}`;
        
        // Build the API request payload
        const payload = {
          contents: [{
            parts: [
              { text: prompt }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          }
        };
        
        // Add image if present
        if (validatedAttachment?.dataUrl) {
          const base64Data = validatedAttachment.dataUrl.split(',')[1] || validatedAttachment.dataUrl;
          payload.contents[0].parts.push({
            inlineData: {
              mimeType: validatedAttachment.mimeType,
              data: base64Data
            }
          });
        }

        // Ensure model name has 'models/' prefix
        let fullModelName = modelName;
        if (!fullModelName.startsWith('models/')) {
          fullModelName = `models/${modelName}`;
        }

        // Call Gemini API via REST - try different endpoints
        let apiUrl = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${apiKey}`;
        console.log(`Calling Gemini API: ${apiUrl.substring(0, 100)}...`);
        
        let apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // If 404, try with v1 endpoint instead of v1beta
        if (apiResponse.status === 404) {
          console.warn(`v1beta endpoint returned 404, trying v1 endpoint...`);
          apiUrl = `https://generativelanguage.googleapis.com/v1/${fullModelName}:generateContent?key=${apiKey}`;
          apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        const responseText = await apiResponse.text();
        
        if (!apiResponse.ok) {
          console.error(`API returned status ${apiResponse.status}: ${responseText}`);
          throw new Error(`API Error: ${apiResponse.status}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse API response:', responseText);
          throw new Error('Invalid JSON response from API');
        }
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          reply = data.candidates[0].content.parts[0].text.trim();
        } else {
          console.error('Unexpected API response structure:', data);
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        console.error('Gemini API error:', error.message);
        // Fallback to rule-based response on API error
        const fallbackMsg = userMessage || 'Attachment received.';
        reply = validatedAttachment
          ? `${getFallbackResponse(fallbackMsg)}\n\n(Note: AI vision is temporarily unavailable.)`
          : getFallbackResponse(fallbackMsg);
      }
    } else {
      // Use fallback responses
      const fallbackMsg = userMessage || 'Attachment received.';
      reply = validatedAttachment
        ? `${getFallbackResponse(fallbackMsg)}\n\n(Note: AI is not configured. Using fallback responses.)`
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
      aiPowered: !!apiKey,
      model: apiKey ? modelName : 'fallback',
    },
  });
});

module.exports = router;
