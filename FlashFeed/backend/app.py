from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re

# Try to import translation library, fall back if not available
try:
    from deep_translator import GoogleTranslator
    TRANSLATION_AVAILABLE = True
except ImportError:
    TRANSLATION_AVAILABLE = False
    print("Warning: deep-translator not installed. Install with: pip install deep-translator")

app = Flask(__name__)
CORS(app)  # allows frontend to talk to backend

# 🔑 Replace with your NewsData.io API key
NEWS_API_KEY = "pub_9a19043a64b345f7b01c608da01217cf"

# Category keywords mapping
CATEGORY_KEYWORDS = {
    "sports": ["cricket", "football", "sports", "match", "ipl", "fifa", "tennis", "hockey", "basketball", "tournament"],
    "business": ["stock", "market", "business", "economy", "finance", "share", "nifty", "sensex", "startup", "invest"],
    "technology": ["ai", "tech", "technology", "software", "app", "cyber", "robot", "digital", "internet", "gadget"],
    "entertainment": ["movie", "film", "entertainment", "bollywood", "celebrity", "actor", "actress", "web series", "ott"],
    "health": ["health", "medical", "fitness", "hospital", "doctor", "disease", "vaccine", "mental", "diet"],
    "education": ["education", "exam", "college", "student", "university", "school", "board", "upsc", "neet"],
    "science": ["science", "space", "nasa", "isro", "research", "discovery", "planet", "climate", "environment"],
    "politics": ["election", "government", "minister", "parliament", "policy", "political", "pm", "cm", "bjp", "congress"],
}

def detect_category(query):
    """Detect news category from user query using keyword matching."""
    query_lower = query.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(word in query_lower for word in keywords):
            return category
    return "top"

def fetch_news(category, language="en", query=None):
    """Fetch news from NewsData.io API."""
    url = "https://newsdata.io/api/1/news"

    category_map = {
        "sports": "sports",
        "business": "business",
        "technology": "technology",
        "entertainment": "entertainment",
        "health": "health",
        "science": "science",
        "politics": "politics",
    }

    params = {
        "apikey": NEWS_API_KEY,
        "country": "in",
        "language": language,
    }

    if category in category_map:
        params["category"] = category_map[category]
    else:
        if query:
            params["q"] = query
        else:
            params["category"] = "top"

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except requests.exceptions.Timeout:
        return []
    except requests.exceptions.RequestException as e:
        print(f"API request error: {e}")
        return []

def create_detailed_summary(title, summary, link=""):
    """Create a detailed summary with bullet points from the basic summary."""
    if not summary:
        return None

    sentences = re.split(r'(?<=[.!?])\s+', summary.strip())
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]

    if not sentences:
        return summary

    detailed_parts = [summary]

    if len(sentences) > 1:
        detailed_parts.append("\n\nKey Points:")
        key_sentences = sentences[1:min(6, len(sentences))]
        for sentence in key_sentences:
            clean_sentence = sentence.strip().rstrip('.!?')
            if len(clean_sentence) > 10:
                detailed_parts.append(f"• {clean_sentence}")

    if len(sentences) > 6:
        detailed_parts.append("\n\nAdditional Details:")
        remaining = sentences[6:min(10, len(sentences))]
        for sentence in remaining:
            clean_sentence = sentence.strip().rstrip('.!?')
            if len(clean_sentence) > 10:
                detailed_parts.append(f"• {clean_sentence}")

    return "\n".join(detailed_parts)

def translate_text(text, target_lang="hi"):
    """Translate text to the target language."""
    if not text or not TRANSLATION_AVAILABLE:
        return text

    try:
        if target_lang == "hi":
            translator = GoogleTranslator(source='auto', target='hi')
            translated = translator.translate(text)
            return translated
        return text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "translation_available": TRANSLATION_AVAILABLE})

@app.route("/chat", methods=["POST"])
def chat():
    """Main chat endpoint to fetch news based on user query."""
    body = request.json or {}
    user_query = (body.get("query") or "").strip()
    language = body.get("language", "en")

    if not user_query:
        return jsonify({"error": "Query cannot be empty"}), 400

    lang_code = "hi" if language.lower().startswith("hi") else "en"
    category = detect_category(user_query)
    news_list = fetch_news(category, language=lang_code, query=user_query)

    if not news_list:
        return jsonify({
            "language": language,
            "category": category,
            "articles": [],
            "message": "Sorry, no news found for this topic right now. Try a different query."
        })

    articles = []
    for news in news_list:
        title = news.get("title") or "No title available"
        description = news.get("description") or news.get("snippet") or ""
        link = news.get("link") or ""
        image_url = (
            news.get("image_url")
            or news.get("image")
            or news.get("thumbnail")
            or ""
        )
        source = news.get("source_id") or news.get("source") or ""
        pub_date = news.get("pubDate") or ""

        articles.append({
            "title": title,
            "summary": description,
            "link": link,
            "image": image_url,
            "source": source,
            "pubDate": pub_date,
        })

    if category == "top":
        headline = "Here are the top headlines for you"
    else:
        headline = f"Here are the latest {category.capitalize()} news"

    return jsonify({
        "language": language,
        "category": category,
        "headline": headline,
        "articles": articles
    })

@app.route("/summarize", methods=["POST"])
def summarize():
    """Get detailed summary of an article in the requested language."""
    body = request.json or {}
    article_title = body.get("title", "")
    article_summary = body.get("summary", "")
    article_link = body.get("link", "")
    language = body.get("language", "en")

    detailed_summary = create_detailed_summary(article_title, article_summary, article_link)

    if not detailed_summary:
        if language == "hi":
            summary_text = "इस लेख के लिए सारांश उपलब्ध नहीं है।"
            translated_title = translate_text(article_title, "hi") if article_title else "शीर्षक उपलब्ध नहीं"
        else:
            summary_text = "Summary not available for this article."
            translated_title = article_title
    else:
        if language == "hi":
            summary_text = translate_text(detailed_summary, "hi")
            translated_title = translate_text(article_title, "hi") if article_title else "No title"
        else:
            summary_text = detailed_summary
            translated_title = article_title

    return jsonify({
        "title": translated_title,
        "summary": summary_text,
        "link": article_link,
        "language": language
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
