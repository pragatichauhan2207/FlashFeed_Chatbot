// ===== STATE =====
let currentLanguage = "en";
let currentArticle = null;
let currentSummaryLang = "en";
let isLoading = false;

const API_BASE = "http://127.0.0.1:5000";
const MAX_INITIAL = 5;

// ===== DOM HELPERS =====
const $ = (id) => document.getElementById(id);
const chatBox = () => $("chatBox");

function scrollToBottom() {
    const box = chatBox();
    if (box) box.scrollTop = box.scrollHeight;
}

// ===== TOAST =====
function showToast(msg, duration = 3000) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
}

// ===== ADD USER MESSAGE =====
function addUserMessage(text) {
    const row = document.createElement("div");
    row.className = "message-row user-row";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar user";
    avatar.textContent = "You";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble user";
    bubble.textContent = text;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox().appendChild(row);
    scrollToBottom();
}

// ===== TYPING INDICATOR =====
function showTyping() {
    const row = document.createElement("div");
    row.className = "message-row";
    row.id = "typingRow";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar bot";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("div");
        dot.className = "typing-dot";
        indicator.appendChild(dot);
    }

    bubble.appendChild(indicator);
    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox().appendChild(row);
    scrollToBottom();
}

function hideTyping() {
    const row = $("typingRow");
    if (row) row.remove();
}

// ===== RENDER ARTICLE CARD =====
function renderArticleCard(article, index) {
    const card = document.createElement("div");
    card.className = "news-card";

    // Image
    const imgWrap = document.createElement("div");
    if (article.image) {
        const img = document.createElement("img");
        img.src = article.image;
        img.className = "card-image";
        img.alt = article.title;
        img.loading = "lazy";
        img.onerror = () => {
            imgWrap.innerHTML = `<div class="card-image-placeholder">📰</div>`;
        };
        imgWrap.appendChild(img);
    } else {
        const icons = ["📰", "🗞️", "📡", "📻", "🔔"];
        imgWrap.innerHTML = `<div class="card-image-placeholder">${icons[index % icons.length]}</div>`;
    }
    card.appendChild(imgWrap);

    // Body
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = article.title || "No title";
    body.appendChild(title);

    if (article.summary) {
        const summary = document.createElement("div");
        summary.className = "card-summary";
        summary.textContent = article.summary;
        body.appendChild(summary);
    }

    // Meta
    const meta = document.createElement("div");
    meta.className = "card-meta";
    if (article.source) {
        const src = document.createElement("span");
        src.className = "card-source";
        src.textContent = article.source.toUpperCase();
        meta.appendChild(src);
    }
    if (article.pubDate) {
        const date = document.createElement("span");
        const d = new Date(article.pubDate);
        date.textContent = isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        meta.appendChild(date);
    }
    body.appendChild(meta);

    // Actions
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const summaryBtn = document.createElement("button");
    summaryBtn.className = "card-btn btn-summary";
    summaryBtn.textContent = "Summary";
    summaryBtn.addEventListener("click", () => openSummaryDrawer(article));
    actions.appendChild(summaryBtn);

    if (article.link) {
        const linkBtn = document.createElement("a");
        linkBtn.className = "card-btn btn-link";
        linkBtn.href = article.link;
        linkBtn.target = "_blank";
        linkBtn.rel = "noopener noreferrer";
        linkBtn.textContent = "Read →";
        actions.appendChild(linkBtn);
    }

    body.appendChild(actions);
    card.appendChild(body);
    return card;
}

// ===== RENDER BOT RESPONSE =====
function renderBotResponse(data) {
    const row = document.createElement("div");
    row.className = "message-row";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar bot";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";

    if (data.message) {
        const noResult = document.createElement("div");
        noResult.className = "no-results";
        noResult.textContent = data.message;
        bubble.appendChild(noResult);
    } else if (data.articles && data.articles.length > 0) {
        const headline = document.createElement("div");
        headline.className = "news-headline";
        headline.textContent = data.headline || "Here are the latest news";
        bubble.appendChild(headline);

        const cardsWrap = document.createElement("div");
        cardsWrap.className = "news-cards";

        const initialArticles = data.articles.slice(0, MAX_INITIAL);
        const remainingArticles = data.articles.slice(MAX_INITIAL);

        initialArticles.forEach((article, i) => {
            cardsWrap.appendChild(renderArticleCard(article, i));
        });

        bubble.appendChild(cardsWrap);

        if (remainingArticles.length > 0) {
            const moreBtn = document.createElement("button");
            moreBtn.className = "show-more-btn";
            moreBtn.textContent = `Show ${remainingArticles.length} more articles`;
            moreBtn.addEventListener("click", () => {
                remainingArticles.forEach((article, i) => {
                    cardsWrap.appendChild(renderArticleCard(article, MAX_INITIAL + i));
                });
                moreBtn.remove();
                scrollToBottom();
            });
            bubble.appendChild(moreBtn);
        }
    } else {
        bubble.textContent = "No results found. Try a different query.";
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox().appendChild(row);
    scrollToBottom();
}

// ===== SEND MESSAGE =====
async function sendMessage(queryOverride) {
    if (isLoading) return;

    const input = $("userInput");
    const message = (queryOverride || input.value).trim();
    if (!message) return;

    // Clear welcome card if present
    const welcome = document.querySelector(".welcome-card");
    if (welcome) welcome.remove();

    input.value = "";
    addUserMessage(message);
    showTyping();
    isLoading = true;

    const sendBtn = $("sendBtn");
    if (sendBtn) sendBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message, language: currentLanguage }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();

        hideTyping();
        renderBotResponse(data);
    } catch (err) {
        hideTyping();
        const row = document.createElement("div");
        row.className = "message-row";
        const avatar = document.createElement("div");
        avatar.className = "msg-avatar bot";
        avatar.textContent = "AI";
        const bubble = document.createElement("div");
        bubble.className = "msg-bubble bot";
        bubble.innerHTML = `<div class="no-results">⚠️ Unable to fetch news. Make sure the Flask server is running at <strong>localhost:5000</strong></div>`;
        row.appendChild(avatar);
        row.appendChild(bubble);
        chatBox().appendChild(row);
        scrollToBottom();
        console.error("Chat error:", err);
    } finally {
        isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

// ===== SUMMARY DRAWER =====
async function openSummaryDrawer(article) {
    currentArticle = article;
    currentSummaryLang = currentLanguage;

    const overlay = $("summaryOverlay");
    const titleEl = $("summaryTitle");
    const contentEl = $("summaryContent");
    const linkEl = $("summaryLink");

    titleEl.textContent = article.title || "No title";
    contentEl.innerHTML = `<div class="typing-indicator" style="padding:8px 0"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;

    if (article.link) {
        linkEl.href = article.link;
        linkEl.style.display = "inline-flex";
    } else {
        linkEl.style.display = "none";
    }

    overlay.classList.add("visible");
    updateSummaryLangButtons();
    await fetchSummary(article, currentSummaryLang);
}

async function fetchSummary(article, language) {
    const contentEl = $("summaryContent");
    const titleEl = $("summaryTitle");

    try {
        const response = await fetch(`${API_BASE}/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: article.title,
                summary: article.summary,
                link: article.link,
                language,
            }),
        });

        if (!response.ok) throw new Error("Server error");
        const data = await response.json();

        if (data.title) titleEl.textContent = data.title;

        if (data.summary) {
            // Parse formatted summary text into HTML
            let html = "";
            const lines = data.summary.split("\n");
            let inList = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed === "Key Points:" || trimmed === "Additional Details:" || trimmed.endsWith(":")) {
                    if (inList) { html += "</ul>"; inList = false; }
                    html += `<div class="section-label">${escapeHtml(trimmed)}</div>`;
                } else if (trimmed.startsWith("•")) {
                    if (!inList) { html += "<ul>"; inList = true; }
                    html += `<li>${escapeHtml(trimmed.slice(1).trim())}</li>`;
                } else {
                    if (inList) { html += "</ul>"; inList = false; }
                    html += `<p>${escapeHtml(trimmed)}</p>`;
                }
            }
            if (inList) html += "</ul>";
            contentEl.innerHTML = html;
        } else {
            contentEl.textContent = "Summary not available.";
        }
    } catch (err) {
        contentEl.textContent = "Unable to load summary. Please try again.";
        console.error("Summary error:", err);
    }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function closeSummaryDrawer() {
    const overlay = $("summaryOverlay");
    if (overlay) overlay.classList.remove("visible");
}

function updateSummaryLangButtons() {
    const enBtn = $("summaryLangEn");
    const hiBtn = $("summaryLangHi");
    if (enBtn && hiBtn) {
        enBtn.classList.toggle("active", currentSummaryLang === "en");
        hiBtn.classList.toggle("active", currentSummaryLang === "hi");
    }
}

// ===== LANGUAGE =====
function setLanguage(lang, updateSidebar = true) {
    currentLanguage = lang;

    document.querySelectorAll(".lang-btn:not(#summaryLangEn):not(#summaryLangHi)").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    // Enter key
    const input = $("userInput");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Sidebar nav chips
    document.querySelectorAll(".nav-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".nav-chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            const query = chip.dataset.query;
            if (query) sendMessage(query);
            // Close mobile sidebar
            document.querySelector(".sidebar")?.classList.remove("open");
            $("sidebarOverlay")?.classList.remove("show");
        });
    });

    // Quick chips in welcome
    document.querySelectorAll(".quick-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const query = chip.dataset.query;
            if (query) sendMessage(query);
        });
    });

    // Language buttons (sidebar + mobile)
    document.querySelectorAll(".lang-btn:not(#summaryLangEn):not(#summaryLangHi)").forEach((btn) => {
        btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
    });

    // Summary lang buttons
    $("summaryLangEn")?.addEventListener("click", () => {
        if (currentSummaryLang !== "en" && currentArticle) {
            currentSummaryLang = "en";
            updateSummaryLangButtons();
            $("summaryContent").innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            fetchSummary(currentArticle, "en");
        }
    });

    $("summaryLangHi")?.addEventListener("click", () => {
        if (currentSummaryLang !== "hi" && currentArticle) {
            currentSummaryLang = "hi";
            updateSummaryLangButtons();
            $("summaryContent").innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            fetchSummary(currentArticle, "hi");
        }
    });

    // Summary close
    $("summaryClose")?.addEventListener("click", closeSummaryDrawer);
    $("summaryOverlay")?.addEventListener("click", (e) => {
        if (e.target === $("summaryOverlay")) closeSummaryDrawer();
    });

    // Mobile menu
    $("menuBtn")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.toggle("open");
        $("sidebarOverlay")?.classList.toggle("show");
    });

    $("sidebarOverlay")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.remove("open");
        $("sidebarOverlay")?.classList.remove("show");
    });
});
