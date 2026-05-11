const { useState, useEffect, useRef } = React;

const API_BASE = "http://127.0.0.1:5000";
const MAX_INITIAL = 5;

const CATEGORIES = [
  { icon: "🔥", label: "Top Headlines",  query: "top news in India" },
  { icon: "🏏", label: "Sports",         query: "latest sports news in India" },
  { icon: "📈", label: "Business",       query: "latest business news in India" },
  { icon: "💻", label: "Technology",     query: "latest technology news in India" },
  { icon: "🎬", label: "Entertainment",  query: "latest entertainment and movies news in India" },
  { icon: "🏥", label: "Health",         query: "latest health news in India" },
  { icon: "🔬", label: "Science",        query: "latest science news in India" },
  { icon: "📚", label: "Education",      query: "latest education and exam news in India" },
];

const QUICK_CHIPS = [
  { icon: "🏏", label: "Cricket today",  query: "What's happening in cricket today?" },
  { icon: "💻", label: "Tech news",      query: "Latest tech news in India" },
  { icon: "📈", label: "Markets",        query: "Business headlines today" },
  { icon: "🎬", label: "Bollywood",      query: "Bollywood entertainment news" },
];

// ─── Typing Dots ────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="typing-indicator">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
  );
}

// ─── News Card ───────────────────────────────────────────────────
function NewsCard({ article, index, onSummary }) {
  const icons = ["📰", "🗞️", "📡", "📻", "🔔"];
  const [imgError, setImgError] = useState(false);

  const pubDate = article.pubDate ? new Date(article.pubDate) : null;
  const dateStr = pubDate && !isNaN(pubDate)
    ? pubDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "";

  return (
    <div className="news-card">
      {/* Image */}
      {article.image && !imgError ? (
        <img
          src={article.image}
          className="card-image"
          alt={article.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="card-image-placeholder">{icons[index % icons.length]}</div>
      )}

      {/* Body */}
      <div className="card-body">
        <div className="card-title">{article.title || "No title"}</div>
        {article.summary && (
          <div className="card-summary">{article.summary}</div>
        )}
        <div className="card-meta">
          {article.source && <span className="card-source">{article.source.toUpperCase()}</span>}
          {dateStr && <span>{dateStr}</span>}
        </div>
        <div className="card-actions">
          <button className="card-btn btn-summary" onClick={() => onSummary(article)}>
            Summary
          </button>
          {article.link && (
            <a className="card-btn btn-link" href={article.link} target="_blank" rel="noopener noreferrer">
              Read →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bot Message ─────────────────────────────────────────────────
function BotMessage({ data, onSummary }) {
  const [showAll, setShowAll] = useState(false);

  if (data.message) {
    return (
      <div className="msg-bubble bot">
        <div className="no-results">⚠️ {data.message}</div>
      </div>
    );
  }

  if (!data.articles || data.articles.length === 0) {
    return (
      <div className="msg-bubble bot">
        <div className="no-results">No results found. Try a different query.</div>
      </div>
    );
  }

  const visible = showAll ? data.articles : data.articles.slice(0, MAX_INITIAL);
  const remaining = data.articles.length - MAX_INITIAL;

  return (
    <div className="msg-bubble bot">
      <div className="news-headline">{data.headline || "Here are the latest news"}</div>
      <div className="news-cards">
        {visible.map((article, i) => (
          <NewsCard key={i} article={article} index={i} onSummary={onSummary} />
        ))}
      </div>
      {!showAll && remaining > 0 && (
        <button className="show-more-btn" onClick={() => setShowAll(true)}>
          Show {remaining} more articles
        </button>
      )}
    </div>
  );
}

// ─── Summary Drawer ──────────────────────────────────────────────
function SummaryDrawer({ article, onClose, globalLang }) {
  const [lang, setLang] = useState(globalLang);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(null); // null = loading
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!article) return;
    setLang(globalLang);
    setTitle(article.title || "");
    setLink(article.link || "");
    setContent(null);
    fetchSummary(article, globalLang);
  }, [article]);

  async function fetchSummary(art, language) {
    setContent(null);
    try {
      const res = await fetch(`${API_BASE}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: art.title, summary: art.summary, link: art.link, language }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      setContent(data.summary || "Summary not available.");
    } catch {
      setContent("Unable to load summary. Please try again.");
    }
  }

  function switchLang(l) {
    if (l === lang) return;
    setLang(l);
    fetchSummary(article, l);
  }

  // Parse summary text into JSX
  function renderContent(text) {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const t = line.trim();
      if (!t) return null;
      if (t.endsWith(":")) return <div key={i} className="section-label">{t}</div>;
      if (t.startsWith("•")) return <li key={i}>{t.slice(1).trim()}</li>;
      return <p key={i}>{t}</p>;
    });
  }

  return (
    <div className={`summary-overlay ${article ? "visible" : ""}`} onClick={(e) => e.target.classList.contains("summary-overlay") && onClose()}>
      <div className="summary-drawer">
        <div className="drawer-header">
          <h3>Article Summary</h3>
          <div className="drawer-actions">
            <div className="lang-buttons small">
              <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => switchLang("en")}>EN</button>
              <button className={`lang-btn ${lang === "hi" ? "active" : ""}`} onClick={() => switchLang("hi")}>हि</button>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="drawer-body">
          <h4 className="drawer-title">{title}</h4>
          <div className="drawer-content">
            {content === null ? <TypingDots /> : renderContent(content)}
          </div>
          {link && (
            <a className="read-more-btn" href={link} target="_blank" rel="noopener noreferrer">
              Read full article →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────
function WelcomeCard({ onQuery }) {
  return (
    <div className="welcome-card">
      <div className="welcome-icon">⚡</div>
      <h2 className="welcome-title">Welcome to FlashFeed</h2>
      <p className="welcome-sub">Your AI-powered news assistant. Ask me anything!</p>
      <div className="quick-chips">
        {QUICK_CHIPS.map((c) => (
          <button key={c.query} className="quick-chip" onClick={() => onQuery(c.query)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
function App() {
  const [messages, setMessages] = useState([]); // { role: 'user'|'bot', text?, data?, loading? }
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("en");
  const [activeCategory, setActiveCategory] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [summaryArticle, setSummaryArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(queryOverride) {
    if (isLoading) return;
    const query = (queryOverride || input).trim();
    if (!query) return;

    setInput("");
    setIsLoading(true);
    setSidebarOpen(false);

    // Add user message + bot loading placeholder
    setMessages((prev) => [
      ...prev,
      { role: "user", text: query },
      { role: "bot", loading: true },
    ]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language: lang }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m, i) => i === prev.length - 1 ? { role: "bot", data } : m)
      );
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: "bot", data: { message: "Unable to fetch news. Make sure the Flask server is running at localhost:5000" } }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleCategoryClick(cat, idx) {
    setActiveCategory(idx);
    sendMessage(cat.query);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">FlashFeed</span>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Categories</p>
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.query}
              className={`nav-chip ${activeCategory === idx ? "active" : ""}`}
              onClick={() => handleCategoryClick(cat, idx)}
            >
              <span className="chip-icon">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="lang-toggle">
            <span className="lang-label">Language</span>
            <div className="lang-buttons">
              <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>EN</button>
              <button className={`lang-btn ${lang === "hi" ? "active" : ""}`} onClick={() => setLang("hi")}>हि</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay show" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Area ── */}
      <div className="main-area">

        {/* Mobile Header */}
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span className="brand-name">⚡ FlashFeed</span>
          <div className="mobile-lang">
            <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>EN</button>
            <button className={`lang-btn ${lang === "hi" ? "active" : ""}`} onClick={() => setLang("hi")}>हि</button>
          </div>
        </header>

        {/* Chat Box */}
        <section className="chat-box" ref={chatRef}>
          {messages.length === 0 && <WelcomeCard onQuery={sendMessage} />}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.role === "user" ? "user-row" : ""}`}>
              <div className={`msg-avatar ${msg.role}`}>{msg.role === "user" ? "You" : "AI"}</div>
              {msg.role === "user" ? (
                <div className="msg-bubble user">{msg.text}</div>
              ) : msg.loading ? (
                <div className="msg-bubble bot"><TypingDots /></div>
              ) : (
                <BotMessage data={msg.data} onSummary={setSummaryArticle} />
              )}
            </div>
          ))}
        </section>

        {/* Input Bar */}
        <div className="input-bar">
          <div className="input-wrap">
            <input
              type="text"
              placeholder="Ask about any news topic…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <button className="send-btn" disabled={isLoading} onClick={() => sendMessage()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="input-hint">Press <kbd>Enter</kbd> to send</p>
        </div>
      </div>

      {/* Summary Drawer */}
      {summaryArticle && (
        <SummaryDrawer
          article={summaryArticle}
          onClose={() => setSummaryArticle(null)}
          globalLang={lang}
        />
      )}
    </div>
  );
}

// ─── Mount ───────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
