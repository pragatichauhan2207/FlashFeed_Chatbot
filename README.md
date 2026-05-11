# ⚡ FlashFeed – AI News Chatbot

A conversational news chatbot powered by **Python Flask** (backend) + **HTML/CSS/JS** (frontend) that fetches live Indian news via the [NewsData.io](https://newsdata.io) API. Supports English & Hindi, article summaries, and category filtering.

---

## 📁 Project Structure

```
FlashFeed/
├── backend/
│   ├── app.py              # Flask API server
│   └── requirements.txt    # Python dependencies
├── html-version/
│   ├── index.html          # Main UI
│   ├── style.css           # Styling (dark theme)
│   └── app.jsx          # Frontend logic
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup (Python Flask)

**Requirements:** Python 3.8+

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server starts at: `http://127.0.0.1:5000`

### 2. Frontend

Open `html-version/index.html` directly in your browser.

> ⚠️ Make sure the Flask server is running before opening the frontend.

---

## 🔑 API Key Setup

Get a free API key from [newsdata.io](https://newsdata.io) and replace the key in `backend/app.py`:

```python
NEWS_API_KEY = "your_api_key_here"
```

---

## ✨ Features

- 🔥 **Live News** – Fetches real-time Indian news from NewsData.io
- 🗂️ **Category Detection** – Automatically detects sports, tech, business, entertainment, health, science, education, politics
- 🌐 **Hindi Support** – Switch between English and Hindi (requires `deep-translator`)
- 📋 **Article Summary** – Slide-in summary drawer with key bullet points
- 📱 **Responsive Design** – Works on mobile and desktop
- ⌨️ **Keyboard Shortcut** – Press `Enter` to send messages

---

## 🛠️ API Endpoints

| Method | Endpoint     | Description                        |
|--------|--------------|------------------------------------|
| POST   | `/chat`      | Get news articles by query         |
| POST   | `/summarize` | Get detailed summary of an article |
| GET    | `/health`    | Server health check                |

### `/chat` Request Body
```json
{
  "query": "latest cricket news",
  "language": "en"
}
```

### `/summarize` Request Body
```json
{
  "title": "Article title",
  "summary": "Article description",
  "link": "https://...",
  "language": "en"
}
```

---

## 📦 Dependencies

### Python
- `flask` – Web framework
- `flask-cors` – Cross-origin support
- `requests` – HTTP client
- `deep-translator` *(optional)* – Hindi translation

### Frontend
- Vanilla HTML, CSS, React.js
- Google Fonts: Syne + DM Sans

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| "Unable to fetch news" error | Ensure `python app.py` is running |
| No articles returned | Check your NewsData.io API key |
| Hindi translation not working | Run `pip install deep-translator` |
| CORS error in browser | Flask-CORS is included; restart the server |

---

## 📄 License

MIT — free to use and modify.
