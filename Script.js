// async function sendMessage() {
//     const input = document.getElementById("userInput");
//     const message = input.value.trim();
//     if (message === "") return;

//     addMessage(message, "user-message");
//     input.value = "";

//     try {
//         const response = await fetch("http://127.0.0.1:5000/chat", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ query: message })
//         });

//         const data = await response.json();
//         addBotReply(data.reply);

//     } catch (error) {
//         addMessage("Unable to fetch news at the moment.", "bot-message");
//     }
// }

// function addMessage(text, className) {
//     const chatBox = document.getElementById("chatBox");
//     const messageDiv = document.createElement("div");
//     messageDiv.className = className;
//     messageDiv.innerText = text;
//     chatBox.appendChild(messageDiv);
//     chatBox.scrollTop = chatBox.scrollHeight;
// }

// function addBotReply(replyText) {
//     const chatBox = document.getElementById("chatBox");

//     const container = document.createElement("div");
//     container.className = "bot-message";

//     const blocks = replyText.split(/\n\s*\n/).filter(block => block.trim() !== "");

//     blocks.forEach(block => {
//         const blockDiv = document.createElement("div");
//         blockDiv.className = "bot-block";

//         // Escape HTML to avoid injecting unsafe content
//         let escaped = block
//             .replace(/&/g, "&amp;")
//             .replace(/</g, "&lt;")
//             .replace(/>/g, "&gt;");

//         // Make URLs clickable
//         escaped = escaped.replace(
//             /(https?:\/\/[^\s]+)/g,
//             '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
//         );

//         // Preserve line breaks inside each block
//         blockDiv.innerHTML = escaped.replace(/\n/g, "<br>");

//         container.appendChild(blockDiv);
//     });

//     chatBox.appendChild(container);
//     chatBox.scrollTop = chatBox.scrollHeight;
// }



async function sendMessage() {
    const input = document.getElementById("userInput");
    const languageSelect = document.getElementById("languageSelect");
    const message = input.value.trim();
    if (message === "") return;

    addMessage(message, "user-message");
    input.value = "";

    try {
        const response = await fetch("http://127.0.0.1:5000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: message,
                language: languageSelect ? languageSelect.value : "en"
            })
        });

        const data = await response.json();
        addBotReply(data);
    } catch (error) {
        addMessage("Unable to fetch news at the moment.", "bot-message");
    }
}

function addMessage(text, type) {
    const chatBox = document.getElementById("chatBox");

    const row = document.createElement("div");
    row.className = `message-row ${type}`;

    const avatar = document.createElement("div");
    avatar.className = `message-avatar ${type === "user-message" ? "user" : "bot"}`;
    avatar.textContent = type === "user-message" ? "You" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    if (type === "user-message") {
        row.appendChild(bubble);
        row.appendChild(avatar);
    } else {
        row.appendChild(avatar);
        row.appendChild(bubble);
    }

    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotReply(payload) {
    const chatBox = document.getElementById("chatBox");

    const row = document.createElement("div");
    row.className = "message-row bot-message";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar bot";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const {
        articles = [],
        message = null,
        category = null,
        headline = null
    } = payload || {};

    if (!articles.length && message) {
        const blockDiv = document.createElement("div");
        blockDiv.className = "bot-block";
        blockDiv.textContent = message;
        bubble.appendChild(blockDiv);
    } else {
        const MAX_INITIAL = 5;

        // Top heading like "Here are the top 5 sports news"
        const headingText =
            headline ||
            (category
                ? `Here are the top 5 ${category.charAt(0).toUpperCase() + category.slice(1)} news`
                : "Here are the top 5 news headlines");

        const heading = document.createElement("div");
        heading.className = "bot-block";
        heading.innerHTML = `<strong>📰 ${headingText}</strong>`;
        bubble.appendChild(heading);

        const initialArticles = articles.slice(0, MAX_INITIAL);
        const remainingArticles = articles.slice(MAX_INITIAL);

        const renderArticleBlock = (article, indexOffset) => {
            const blockDiv = document.createElement("div");
            blockDiv.className = "bot-block";

            const safeTitle = (article.title || "No title available")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            const safeSummary = (article.summary || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            let html = `<strong>${indexOffset}. ${safeTitle}</strong>`;

            if (safeSummary) {
                html += `<br><span>${safeSummary}</span>`;
            }

            if (article.image) {
                const safeImage = article.image.replace(/"/g, "&quot;");
                html += `<br><br><a href="${article.link || "#"}" target="_blank" rel="noopener noreferrer">
                    <img src="${safeImage}" alt="Article image" style="max-width:100%; border-radius:8px; display:block;">
                </a>`;
            }

            if (article.link) {
                const safeLink = article.link.replace(/"/g, "&quot;");
                html += `<br><a href="${safeLink}" target="_blank" rel="noopener noreferrer">Read full article</a>`;
            }

            // Add Summarize button
            html += `<br><button class="summarize-button">📄 Summarize</button>`;

            blockDiv.innerHTML = html;
            bubble.appendChild(blockDiv);
            
            // Add click handler for summarize button (after HTML is set)
            const summarizeBtn = blockDiv.querySelector(".summarize-button");
            if (summarizeBtn) {
                summarizeBtn.addEventListener("click", () => {
                    openSummaryPanel(article);
                });
            }
        };

        initialArticles.forEach((article, index) => {
            renderArticleBlock(article, index + 1);
        });

        if (remainingArticles.length) {
            const moreWrapper = document.createElement("div");
            moreWrapper.className = "bot-block";

            const moreButton = document.createElement("button");
            moreButton.textContent = "Show more news";
            moreButton.style.marginTop = "4px";
            moreButton.style.padding = "6px 10px";
            moreButton.style.borderRadius = "999px";
            moreButton.style.border = "none";
            moreButton.style.cursor = "pointer";
            moreButton.style.background =
                "linear-gradient(135deg, #38bdf8, #0ea5e9)";
            moreButton.style.color = "#0b1120";
            moreButton.style.fontSize = "0.8rem";
            moreButton.style.fontWeight = "600";

            moreButton.addEventListener("click", () => {
                remainingArticles.forEach((article, idx) => {
                    renderArticleBlock(article, MAX_INITIAL + idx + 1);
                });
                moreWrapper.remove();
            });

            moreWrapper.textContent = "";
            moreWrapper.appendChild(moreButton);
            bubble.appendChild(moreWrapper);
        }
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("userInput");
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Category chips: pre-fill query and send
    const chips = document.querySelectorAll(".category-chip");
    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const query = chip.getAttribute("data-query");
            if (!query) return;
            input.value = query;
            sendMessage();
        });
    });

    // Global CTA button: fetch generic top headlines
    const globalBtn = document.getElementById("globalNewsButton");
    if (globalBtn) {
        globalBtn.addEventListener("click", () => {
            input.value = "top news in India from all categories";
            sendMessage();
        });
    }

    // Tips overlay open/close
    const tipsToggle = document.getElementById("tipsToggleButton");
    const tipsOverlay = document.getElementById("tipsOverlay");
    const tipsClose = document.getElementById("tipsCloseButton");

    const closeTips = () => {
        if (tipsOverlay) {
            tipsOverlay.classList.remove("visible");
        }
    };

    if (tipsToggle && tipsOverlay) {
        tipsToggle.addEventListener("click", () => {
            tipsOverlay.classList.add("visible");
        });
    }

    if (tipsClose) {
        tipsClose.addEventListener("click", closeTips);
    }

    if (tipsOverlay) {
        tipsOverlay.addEventListener("click", (e) => {
            if (e.target === tipsOverlay) {
                closeTips();
            }
        });
    }

    // Summary panel initialization
    const summaryClose = document.getElementById("summaryCloseButton");
    const summaryOverlay = document.getElementById("summaryOverlay");
    const summaryLangSelect = document.getElementById("summaryLanguageSelect");
    
    if (summaryClose) {
        summaryClose.addEventListener("click", closeSummaryPanel);
    }
    
    if (summaryOverlay) {
        summaryOverlay.addEventListener("click", (e) => {
            if (e.target === summaryOverlay) {
                closeSummaryPanel();
            }
        });
    }
    
    if (summaryLangSelect) {
        summaryLangSelect.addEventListener("change", switchSummaryLanguage);
    }
});

// Summary panel functions
let currentArticle = null;
let currentSummaryLanguage = "en";

async function openSummaryPanel(article) {
    currentArticle = article;
    currentSummaryLanguage = "en";
    
    const summaryOverlay = document.getElementById("summaryOverlay");
    const summaryTitle = document.getElementById("summaryTitle");
    const summaryContent = document.getElementById("summaryContent");
    const summaryLink = document.getElementById("summaryLink");
    
    if (!summaryOverlay || !summaryTitle || !summaryContent) return;
    
    summaryTitle.textContent = article.title || "No title";
    summaryContent.textContent = "Loading summary...";
    
    if (summaryLink && article.link) {
        summaryLink.href = article.link;
        summaryLink.style.display = "inline-block";
    } else if (summaryLink) {
        summaryLink.style.display = "none";
    }
    
    summaryOverlay.classList.add("visible");
    
    // Fetch summary in current language
    await fetchSummary(article, currentSummaryLanguage);
}

async function fetchSummary(article, language) {
    const summaryContent = document.getElementById("summaryContent");
    const summaryTitle = document.getElementById("summaryTitle");
    if (!summaryContent) return;
    
    try {
        const response = await fetch("http://127.0.0.1:5000/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: article.title,
                summary: article.summary,
                link: article.link,
                language: language
            })
        });
        
        const data = await response.json();
        
        // Update title if translated
        if (summaryTitle && data.title) {
            summaryTitle.textContent = data.title;
        }
        
        // Format summary with proper line breaks and bullet points
        if (data.summary) {
            // Convert text to HTML, preserving line breaks and bullet points
            let formattedSummary = data.summary
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n\n/g, "</p><p>")
                .replace(/\n/g, "<br>")
                .replace(/•/g, "•");
            
            // Wrap in paragraphs
            formattedSummary = `<p>${formattedSummary}</p>`;
            
            summaryContent.innerHTML = formattedSummary;
        } else {
            summaryContent.textContent = "Summary not available.";
        }
    } catch (error) {
        summaryContent.textContent = "Unable to load summary at the moment.";
    }
}

function closeSummaryPanel() {
    const summaryOverlay = document.getElementById("summaryOverlay");
    if (summaryOverlay) {
        summaryOverlay.classList.remove("visible");
    }
}

function switchSummaryLanguage() {
    const langSelect = document.getElementById("summaryLanguageSelect");
    const summaryContent = document.getElementById("summaryContent");
    if (!langSelect || !currentArticle) return;
    
    // Show loading state
    if (summaryContent) {
        summaryContent.textContent = "Translating summary...";
    }
    
    currentSummaryLanguage = langSelect.value;
    fetchSummary(currentArticle, currentSummaryLanguage);
}
