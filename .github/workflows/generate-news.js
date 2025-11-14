import fs from "fs/promises";

const GEMINI_KEY = process.env.GEMINI_KEY;
const NEWS_FILE = "news.json";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;

async function fetchNewsFromGemini() {
  const today = new Date().toISOString().split("T")[0];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Today is ${today}. You are a news curator for a Chrome extension.

Provide exactly 5 of today's most significant global news stories from the last 24 hours.

Selection criteria:
- IMPACT: Affects large numbers of people or has long-term significance
- VERIFICATION: From credible news sources (Reuters, AP, BBC, major outlets)
- DIVERSITY: Mix topics (politics, tech, business, science, health, world events)
- GEOGRAPHY: Maximum 2 stories from same region
- TIMELINESS: Events from last 24 hours only
- BALANCE: Avoid all negative news - include positive developments

For each story provide:
- Headline: Clear, factual, max 80 characters (no clickbait, no questions)
- Summary: 1-2 sentences explaining WHAT happened and WHY it matters (max 150 characters)
- Category: Exactly one of [Politics, Technology, Business, Science, Health, World]
- Region: Exactly one of [Global, US, Europe, Asia, Africa, Americas, Middle East]
- Urgency: One of [breaking, high, medium]

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "date": "${today}",
  "stories": [
    {
      "headline": "string",
      "summary": "string",
      "category": "string",
      "region": "string",
      "urgency": "string"
    }
  ]
}

Ensure exactly 5 stories with good topic and geographic diversity.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) {
    throw new Error("Empty response from Gemini API");
  }

  // Parse the JSON response
  let newsData;
  try {
    newsData = JSON.parse(jsonText);
  } catch (parseError) {
    // Sometimes API returns markdown wrapped JSON, try to extract it
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      newsData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
  }

  // Validate the structure
  if (!newsData.stories || !Array.isArray(newsData.stories)) {
    throw new Error("Invalid news data structure");
  }

  // Add metadata
  return {
    updatedAt: new Date().toISOString(),
    version: "1.0",
    source: "gemini-1.5-flash",
    ...newsData,
  };
}

async function loadPreviousNews() {
  try {
    const content = await fs.readFile(NEWS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log("🔄 Fetching latest global news...");

  try {
    const newsData = await fetchNewsFromGemini();

    // Validate we have stories
    if (newsData.stories.length === 0) {
      throw new Error("No stories returned from API");
    }

    // Save the news
    await fs.writeFile(NEWS_FILE, JSON.stringify(newsData, null, 2));

    console.log("✅ news.json updated successfully!");
    console.log(`📰 ${newsData.stories.length} stories from ${newsData.date}`);
    console.log("\nHeadlines:");
    newsData.stories.forEach((story, i) => {
      console.log(`  ${i + 1}. [${story.category}] ${story.headline}`);
    });
  } catch (error) {
    console.error("❌ Failed to fetch news:", error.message);

    // Try to keep previous news as fallback
    const previousNews = await loadPreviousNews();
    if (previousNews) {
      console.log("⚠️  Using previous news as fallback");
      // Update the timestamp but keep old content
      previousNews.updatedAt = new Date().toISOString();
      previousNews.fallback = true;
      await fs.writeFile(NEWS_FILE, JSON.stringify(previousNews, null, 2));
    } else {
      console.error("💥 No fallback data available");
      process.exit(1);
    }
  }
}

main();
