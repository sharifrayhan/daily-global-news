const fetch = require("node-fetch");
const fs = require("fs");

const GEMINI_KEY = process.env.GEMINI_KEY;
const NEWS_FILE = "news.json";

async function fetchNewsFromGemini() {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
Give a concise, factual, reliable summary of the MOST important global news from the last 24 hours.
Format:
- Headline
- 1–2 sentence explanation
- Keep it globally relevant
`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No news today";
}

(async () => {
  try {
    const newsText = await fetchNewsFromGemini();
    const newsData = {
      updatedAt: new Date().toISOString(),
      news: newsText,
    };
    fs.writeFileSync(NEWS_FILE, JSON.stringify(newsData, null, 2));
    console.log("news.json updated successfully!");
  } catch (err) {
    console.error("Failed to fetch news:", err);
  }
})();
