export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Allow browser testing with GET
    const message =
      req.method === "GET"
        ? "Hello JARVIS. Introduce yourself in one short sentence."
        : req.body?.message;

    // Only GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed. Use GET or POST."
      });
    }

    // Validate message
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required."
      });
    }

    // API key check
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    // JARVIS personality
    const systemInstruction = `
You are JARVIS, a highly capable personal AI assistant.

PERSONALITY:
- Be natural, warm, intelligent and helpful.
- Behave like a supportive older-brother-like companion.
- Do NOT say "bhai" in every sentence.
- Use "bhai" only occasionally and naturally when it fits.
- Never sound repetitive, robotic or overly formal.
- You may use light friendly humor when appropriate.
- Never insult, humiliate or threaten the user.

GUIDANCE:
- Help the user step-by-step when they are learning or doing something.
- Assume the user may be a beginner.
- Break complicated tasks into simple steps.
- If the user makes a mistake, clearly explain what went wrong and how to fix it.
- Encourage the user when they make progress.
- If something is dangerous, illegal, or could seriously damage their device/data, warn them before proceeding.
- Never claim that you performed an action unless the application actually performed it.

VOICE STYLE:
- Keep responses natural for spoken conversation.
- Avoid unnecessarily long answers.
- Use simple language when possible.
- If the user asks for detailed instructions, provide them step-by-step.

LANGUAGE:
- Understand Hindi, English and Hinglish.
- Reply in the language/style the user is using unless they ask otherwise.

IDENTITY:
You are JARVIS, the user's personal assistant.
Your goal is to help, teach, guide and support the user.
`;

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    let lastError = null;

    // Try each model
    for (const model of models) {
      // Retry temporary 503/429 errors
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [
                    {
                      text: systemInstruction
                    }
                  ]
                },

                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: message
                      }
                    ]
                  }
                ],

                generationConfig: {
                  maxOutputTokens: 800
                }
              })
            }
          );

          const data = await response.json();

          // Success
          if (response.ok) {
            const reply =
              data.candidates?.[0]?.content?.parts
                ?.map((part) => part.text || "")
                .join("")
                .trim();

            if (!reply) {
              return res.status(502).json({
                success: false,
                error: "Gemini returned an empty response."
              });
            }

            return res.status(200).json({
              success: true,
              model,
              reply
            });
          }

          lastError = {
            model,
            status: response.status,
            data
          };

          // Retry only temporary errors
          if (response.status === 429 || response.status === 500 || response.status === 503) {
            const delay = 1000 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Permanent error: don't keep trying
          break;

        } catch (error) {
          lastError = {
            model,
            error: error.message
          };

          // Retry network/server errors
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Everything failed
    console.error("All Gemini models failed:", lastError);

    return res.status(503).json({
      success: false,
      error: "JARVIS is temporarily unavailable. Please try again shortly.",
      details: lastError
    });

  } catch (error) {
    console.error("JARVIS server error:", error);

    return res.status(500).json({
      success: false,
      error: "JARVIS server error."
    });
  }
}
