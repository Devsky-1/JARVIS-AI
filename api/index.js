export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST method."
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
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

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "JARVIS could not generate a response.";

    return res.status(200).json({
      success: true,
      reply
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "JARVIS server error."
    });
  }
}
