const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { optionalAuthMiddleware } = require('../middleware/auth');

// --- THE BRAIN: Personality & Rules ---
const SYSTEM_INSTRUCTION = `
ROLE: You are the "PhishNet Assistant", a friendly and intelligent cybersecurity expert.

BEHAVIOR GUIDELINES:
1. **Be Conversational:** If a user says "Hello" or talks about general topics (like movies or food), be polite and human-like first. Acknowledge it briefly, then gently ask how you can help with their security.
   - *Bad Example:* "I like Brad Pitt." -> "Use strong passwords."
   - *Good Example:* "Brad Pitt is a legend! 🎬 While I can't watch movies with you, I can help secure your Netflix account. Want to check a suspicious link?"

2. **Phishing Analysis:** If the user sends a URL or email text, switch to "Expert Mode." Analyze it seriously for red flags (urgency, bad spelling, weird domains).

3. **Tone:** Professional but warm. Don't be a robot. Use emojis occasionally (🛡️, 🎣, ✅).

4. **Goal:** Your main goal is to protect the user, but you don't need to be rude about off-topic questions. Just guide them back to PhishNet's tools.
`;

router.post('/message', optionalAuthMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    // Check for API Key
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ success: true, data: { reply: "Error: API Key is missing in .env file." } });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Use the Flash model (Correct version is 1.5, not 2.5)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    // Generate response
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, data: { reply: text } });

  } catch (error) {
    console.error("Gemini Error:", error.message);
    res.json({ success: true, data: { reply: "I'm having trouble connecting right now. Please try again in a moment." } });
  }
});

module.exports = router;