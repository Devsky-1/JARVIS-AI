export default async function handler(req, res) {
  try {
    // Browser test
    const message =
      req.method === "GET"
        ? "Hello JARVIS. Introduce yourself in one short sentence."
        : req.body?.message;

    // Only GET and POST are allowed
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

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured."
      });
    }

    // Send request to Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "You are JARVIS, a highly capable personal AI assistant. " +
                  "Be intelligent, concise, helpful, professional, and direct."
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
          ]
        })
      }
    );

    const data = await response.json();

    // Gemini API error
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    // Extract Gemini response
    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "JARVIS could not generate a response.";

    return res.status(200).json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("JARVIS error:", error);

    return res.status(500).json({
      success: false,
      error: "JARVIS server error."
    });
  }
}
