# 🏈 FantasyPoints Draft Companion

> **A high-performance, mobile-first Progressive Web App (PWA) and AI ingestion engine designed for live Fantasy Football drafts. Integrates expert FantasyPoints analyst insights with real-time Sleeper PPR ADP data.**

---

## 🌟 Key Features

* **🤖 AI-Powered PDF Ingestion**: Automatically parses FantasyPoints articles/draft guides (`.pdf`) using Google Gemini LLMs with structured Pydantic schema enforcement and multi-model fallback chains.
* **📱 Mobile-First PWA**: Fully responsive dark mode UI designed for mobile and desktop, installable as a native-feeling app on iOS and Android home screens.
* **⚡ Live Sleeper ADP Integration**: Syncs live PPR ADP and positional rankings dynamically from Sleeper's public API endpoints.
* **🏈 Live Draft Tracking & Roster Management**: Mark players as *Drafted by Me*, *Drafted by Others*, or *Starred / On Deck*. Automatically updates active roster lineup slots (QB, RB, WR, TE, FLEX, BENCH).
* **🚨 Smart Warnings**: Instant alerts for bye-week overlaps on your roster and positional depth deficiencies during your draft.
* **⚡ Head-to-Head Player Comparison**: Select and compare up to 3 players side-by-side in a dynamic modal breakdown.
* **🔍 Multi-Field Search & Filter**: Search by player name, NFL team, analyst author, or stance (e.g., *Must-Draft*, *Bullish*, *Sleeper*, *Breakout*, *Exodia*, *Avoid*).
* **🔄 Live Auto-Watcher**: Background daemon (`ingest.py --watch`) monitors `raw_articles/` for newly added PDFs and automatically ingests them into the database without restarting the app.
* **🌐 Local Network Sharing**: One-click startup script broadcasts the app on your local Wi-Fi network so you can use your smartphone while drafting on your computer.

---

## 📁 Project Structure

```
FF/
├── index.html              # Main application shell & modal markup
├── styles.css              # Glassmorphism dark-theme CSS design system
├── app.js                  # PWA state management, Sleeper sync, rendering logic
├── ingest.py               # Python AI ingestion script (PDF parsing & Gemini API)
├── start.bat               # Windows 1-click startup script (Watcher + HTTP server)
├── fantasypoints_db.json   # Extracted player takes JSON database
├── ingested_manifest.json  # Ingestion state tracking & file hash registry
├── requirements.txt        # Python package dependencies
├── manifest.json           # Web App PWA Manifest configuration
├── sw.js                   # Service Worker for offline PWA support
├── .env                    # API key configuration file (GEMINI_API_KEY)
└── raw_articles/           # Drop folder for FantasyPoints PDF articles
```

---

## 🛠️ Prerequisites & Installation

### 1. Prerequisites
* **Python 3.10+** installed and added to `PATH`.
* **Google Gemini API Key** (Free tier or paid tier). Get one at [Google AI Studio](https://aistudio.google.com/).

### 2. Installation Steps

1. Clone or download this repository to your local machine.
2. Open a terminal/command prompt in the project root directory (`FF/`).
3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create or edit the `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 🚀 Usage Guide

### One-Click Startup (Windows)
Double-click `start.bat` (or run it from CMD/PowerShell):
```cmd
start.bat
```
`start.bat` will:
1. Launch `ingest.py --watch` in the background to monitor `raw_articles/`.
2. Display your computer's local Wi-Fi IP address for mobile phone access.
3. Automatically launch your default browser to `http://localhost:8080`.
4. Start a local Python HTTP server on port `8080`.

### Manual CLI Launch

#### 1. Ingest PDF Articles into Database
Place your FantasyPoints PDF files into `raw_articles/`, then run:
```bash
# Single-run ingestion
python ingest.py

# Force re-ingest all files regardless of manifest state
python ingest.py --force

# Continuous folder watcher (auto-ingests newly added PDFs)
python ingest.py --watch
```

#### 2. Start Local Web Server
```bash
python -m http.server 8080
```
Open `http://localhost:8080` in your web browser.

---

## 📱 Mobile PWA Setup

You can open the app on your phone (iOS / Android) during live draft sessions:

1. Ensure your phone is connected to the **same Wi-Fi network** as your PC.
2. Look at the IP address printed by `start.bat` (e.g., `http://192.168.1.150:8080`).
3. Open that URL in Chrome (Android) or Safari (iOS).
4. Tap **Add to Home Screen** to install it as a standalone Progressive Web App.

---

## 📊 Database & Data Pipeline

1. **Input**: PDF files dropped into `raw_articles/`.
2. **Chunking & Vision Ingest**: `ingest.py` splits PDFs into 5-page chunks using `pypdf` and submits them to Gemini LLMs via `google-genai`.
3. **Structured Schema**: Extracts player names, positions, teams, authors, stances, target round advice, key reasons, upside metrics, and risk factors into `fantasypoints_db.json`.
4. **Incremental Ingestion**: `ingested_manifest.json` tracks file modification times and sizes to skip unchanged files and save API quota.
5. **Live Enrichment**: `app.js` fetches live Sleeper ADP data upon app load, merging ADP and positional ranks into the FantasyPoints consensus dataset.

---

## 💡 Tech Stack

* **Frontend**: Vanilla HTML5, Modern CSS3 (Variables, Flexbox/Grid, Glassmorphism), ES6 JavaScript.
* **Backend**: Python 3.10+, `google-genai` SDK, `pydantic` v2, `pypdf`, `python-dotenv`.
* **APIs**: Google Gemini (via `google-genai`), Sleeper API (`api.sleeper.app`).
* **PWA**: Service Worker caching, Web App Manifest.
