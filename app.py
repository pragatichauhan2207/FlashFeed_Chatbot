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

# 🔹 Simple keyword-based category detection
def detect_category(query):
    query = query.lower()

    if any(word in query for word in ["cricket", "football", "sports", "match"]):
        return "sports"
    if any(word in query for word in ["stock", "market", "business", "economy"]):
        return "business"
    if any(word in query for word in ["ai", "tech", "technology", "software"]):
        return "technology"
    if any(word in query for word in ["movie", "film", "entertainment", "bollywood"]):
        return "entertainment"
    if any(word in query for word in ["health", "medical", "fitness"]):
        return "health"
    if any(word in query for word in ["education", "exam", "college", "student"]):
        return "education"

    return "top"  # default category

# 🔹 Fetch news from NewsData.io
def fetch_news(category, language="en", query=None):
    """
    Fetch top news for a given category / query.

    For categories like sports or entertainment we use the NewsData
    category filter so that results stay within that topic only.
    """
    url = "https://newsdata.io/api/1/news"

    # Map our internal categories to NewsData categories where available
    category_map = {
        "sports": "sports",
        "business": "business",
        "technology": "technology",
        "entertainment": "entertainment",
        "health": "health",
    }

    params = {
        "apikey": NEWS_API_KEY,
        "country": "in",
        "language": language,
    }

    if category in category_map:
        # Strictly filter to this category (e.g. only sports news)
        params["category"] = category_map[category]
        # Optionally, you could still add a free-text query here to narrow further
    else:
        # For non-mapped categories, fall back to keyword search or top news
        if query:
            params["q"] = query
        else:
            params["category"] = "top"

    response = requests.get(url, params=params)
    data = response.json()

    # Return all results that NewsData sends for this page
    return data.get("results", [])  # full list; frontend can decide how many to show

@app.route("/chat", methods=["POST"])
def chat():
    body = request.json or {}
    user_query = body.get("query", "") or ""
    language = body.get("language", "en")  # "en" or "hi"

    # map UI language value to NewsData language code if needed
    lang_code = "hi" if language.lower().startswith("hi") else "en"

    category = detect_category(user_query)
    news_list = fetch_news(category, language=lang_code, query=user_query)

    if not news_list:
        return jsonify({
            "language": language,
            "category": category,
            "articles": [],
            "message": "Sorry, no news found for this topic right now."
        })

    articles = []
    for news in news_list:
        title = news.get("title") or "No title available"
        description = news.get("description") or news.get("snippet") or ""
        link = news.get("link") or ""

        # NewsData fields for image can vary; try common keys
        image_url = (
            news.get("image_url")
            or news.get("image")
            or news.get("thumbnail")
            or ""
        )

        articles.append({
            "title": title,
            "summary": description,
            "link": link,
            "image": image_url,
        })

    # Build a human‑readable headline for the frontend
    if category == "top":
        headline = "Here are the top 5 news headlines"
    else:
        headline = f"Here are the top 5 {category.capitalize()} news"

    return jsonify({
        "language": language,
        "category": category,
        "headline": headline,
        "articles": articles
    })

def create_detailed_summary(title, summary, link=""):
    """
    Create a detailed summary with bullet points from the basic summary.
    This expands the summary to be more comprehensive than the preview.
    """
    if not summary:
        return None
    
    # Split summary into sentences
    sentences = re.split(r'(?<=[.!?])\s+', summary.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return summary
    
    # Create detailed summary with paragraphs and bullet points
    detailed_parts = []
    
    # Main comprehensive summary paragraph (expanded version)
    main_summary = summary
    detailed_parts.append(main_summary)
    
    # Add key points as bullet points (extract important information)
    if len(sentences) > 1:
        detailed_parts.append("\n\nKey Points:")
        # Take important sentences and convert to bullet points
        # Use sentences that contain important keywords or are longer (more informative)
        key_sentences = sentences[1:min(6, len(sentences))]
        for sentence in key_sentences:
            # Clean up sentence for bullet point
            clean_sentence = sentence.strip().rstrip('.!?')
            if len(clean_sentence) > 10:  # Only add meaningful sentences
                detailed_parts.append(f"• {clean_sentence}")
    
    # Add additional important details if available
    if len(sentences) > 6:
        detailed_parts.append("\n\nAdditional Details:")
        remaining = sentences[6:min(10, len(sentences))]
        for sentence in remaining:
            clean_sentence = sentence.strip().rstrip('.!?')
            if len(clean_sentence) > 10:
                detailed_parts.append(f"• {clean_sentence}")
    
    return "\n".join(detailed_parts)

def translate_text(text, target_lang="hi"):
    """
    Translate text to the target language.
    """
    if not text or not TRANSLATION_AVAILABLE:
        return text
    
    try:
        if target_lang == "hi":
            translator = GoogleTranslator(source='en', target='hi')
            translated = translator.translate(text)
            return translated
        else:
            return text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

@app.route("/summarize", methods=["POST"])
def summarize():
    """
    Get detailed summary of an article in the requested language with bullet points.
    """
    body = request.json or {}
    article_title = body.get("title", "")
    article_summary = body.get("summary", "")
    article_link = body.get("link", "")
    language = body.get("language", "en")  # "en" or "hi"

    # Store original title and summary for translation
    original_title = article_title
    original_summary = article_summary

    # Create detailed summary with bullet points (always from English original)
    detailed_summary = create_detailed_summary(article_title, article_summary, article_link)
    
    if not detailed_summary:
        if language == "hi":
            summary_text = "इस लेख के लिए सारांश उपलब्ध नहीं है।"
            translated_title = translate_text(original_title, "hi") if original_title else "शीर्षक उपलब्ध नहीं"
        else:
            summary_text = "Summary not available for this article."
            translated_title = original_title
    else:
        # Translate to Hindi if requested
        if language == "hi":
            summary_text = translate_text(detailed_summary, "hi")
            translated_title = translate_text(original_title, "hi") if original_title else "No title"
        else:
            summary_text = detailed_summary
            translated_title = original_title
    
    return jsonify({
        "title": translated_title,
        "summary": summary_text,
        "link": article_link,
        "language": language
    })

if __name__ == "__main__":
    app.run(debug=True)
