const NEWS_URL = "https://sharifrayhan.github.io/daily-global-news/news.json";

// Cache duration: 6 hours
const CACHE_DURATION = 6 * 60 * 60 * 1000;

// DOM elements
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const newsContainer = document.getElementById("newsContainer");
const dateDisplay = document.getElementById("dateDisplay");
const updateTime = document.getElementById("updateTime");
const retryBtn = document.getElementById("retryBtn");

// Fetch news from GitHub
async function fetchNews() {
  try {
    // Check cache first
    const cached = localStorage.getItem("newsCache");
    const cacheTime = localStorage.getItem("newsCacheTime");

    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_DURATION) {
        console.log("Using cached news");
        return JSON.parse(cached);
      }
    }

    // Fetch fresh data
    const response = await fetch(NEWS_URL, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache the data
    localStorage.setItem("newsCache", JSON.stringify(data));
    localStorage.setItem("newsCacheTime", Date.now().toString());

    return data;
  } catch (err) {
    console.error("Fetch error:", err);

    // Try to return cached data even if expired
    const cached = localStorage.getItem("newsCache");
    if (cached) {
      console.log("Using expired cache as fallback");
      return JSON.parse(cached);
    }

    throw err;
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format relative time
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Render news stories
function renderNews(data) {
  // Update header
  dateDisplay.textContent = formatDate(data.date);
  updateTime.textContent = `Updated: ${formatRelativeTime(data.updatedAt)}`;

  // Clear container
  newsContainer.innerHTML = "";

  // Render each story
  data.stories.forEach((story, index) => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.setAttribute("data-index", index);

    const categoryClass = `category-${story.category.toLowerCase()}`;
    const urgencyClass = `urgency-${story.urgency}`;

    card.innerHTML = `
      <div class="news-header">
        <div>
          <span class="category-badge ${categoryClass}">${story.category}</span>
          <span class="region-tag">${story.region}</span>
          <span class="urgency-indicator ${urgencyClass}"></span>
        </div>
      </div>
      <h3 class="news-headline">${escapeHtml(story.headline)}</h3>
      <p class="news-summary">${escapeHtml(story.summary)}</p>
    `;

    newsContainer.appendChild(card);
  });

  // Show news container
  loading.classList.add("hidden");
  error.classList.add("hidden");
  newsContainer.classList.remove("hidden");
}

// Show error state
function showError() {
  loading.classList.add("hidden");
  newsContainer.classList.add("hidden");
  error.classList.remove("hidden");
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
async function init() {
  try {
    loading.classList.remove("hidden");
    error.classList.add("hidden");
    newsContainer.classList.add("hidden");

    const data = await fetchNews();

    if (!data || !data.stories || data.stories.length === 0) {
      throw new Error("Invalid data structure");
    }

    renderNews(data);
  } catch (err) {
    console.error("Init error:", err);
    showError();
  }
}

// Event listeners
retryBtn.addEventListener("click", init);

// Run on load
init();
