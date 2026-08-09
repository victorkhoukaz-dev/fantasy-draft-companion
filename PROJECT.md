# 🤖 PROJECT.md — Technical Architecture & Agent Reference Guide

> **This document provides a comprehensive technical breakdown of the Fantasy Football Draft Companion codebase. It is designed to give AI agents and developers full context on the architecture, data schemas, state management, and operational workflows.**

---

## 🎯 Project Overview & Goal

The **Fantasy Football Draft Companion** is a hybrid AI-driven research platform and live draft management system. It bridges offline analytical PDF reports (specifically from *FantasyPoints*) with real-time market draft data (Sleeper PPR ADP) to give fantasy managers a competitive edge during live fantasy drafts.

### Core Objectives
1. **Automated Knowledge Extraction**: Extract structured player insights from unstructured PDF draft guides using multimodal Google Gemini LLMs.
2. **Real-Time Data Synthesis**: Join extracted analyst takes with live Sleeper API market ADP and positional rankings.
3. **Live Draft Execution**: Provide a fast, responsive UI for marking players drafted, monitoring roster depth, tracking bye week overlaps, and conducting head-to-head player comparisons.

---

## 🏗️ System Architecture

The project consists of two core decoupled sub-systems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE (Python)                      │
│                                                                        │
│  [ raw_articles/*.pdf ] ──> PyPDF Chunking ──> Google Gemini API       │
│                                                     │                  │
│  [ ingested_manifest.json ] <── Manifest Hash ──────┴──> Deduplication  │
│                                                              │         │
│                                              fantasypoints_db.json     │
└──────────────────────────────────────────────────────────────┼─────────┘
                                                               │
┌──────────────────────────────────────────────────────────────▼─────────┐
│                        FRONTEND PWA (Vanilla JS)                       │
│                                                                        │
│  fantasypoints_db.json ──┐                                             │
│                          ├──> Canvas / Map Merge ──> Live Board &      │
│  Sleeper Public API ─────┘   (Local Persistence)    Roster Engine      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🐍 Backend Ingestion Engine (`ingest.py`)

### 1. Ingestion Workflow
* **Scanning**: Finds all `.pdf` files in `raw_articles/`.
* **Incremental Manifest Check**: Compares `filename`, file `mtime` (modified time), and `size` against `ingested_manifest.json`. If unchanged, the file is skipped to conserve API quota.
* **PDF Chunking**: Reads PDFs using `pypdf.PdfReader` and breaks them into **5-page chunks** (`io.BytesIO`). This optimizes token limits and prevents context loss during LLM extraction.
* **Structured Generation**: Submits each chunk to Google Gemini using `google-genai` with `response_mime_type="application/json"` and Pydantic schema enforcement.
* **Fallback Hierarchy**: Tries the following LLM models sequentially if rate limit (HTTP 429) or API errors occur:
  1. `gemini-flash-latest`
  2. `gemini-3.6-flash`
  3. `gemini-2.0-flash`
  4. `gemini-3.5-flash`
* **Deduplication**: Deduplicates extracted takes based on `(player_name, author, stance, key_reason[:40])`.
* **Output Persistence**: Atomically writes updated records to `fantasypoints_db.json` and records metadata in `ingested_manifest.json`.

### 2. Pydantic Schemas (`ingest.py`)

```python
class PlayerTake(BaseModel):
    player_name: str           # Full name (e.g., 'Christian McCaffrey')
    position: str              # QB, RB, WR, or TE
    team: str                  # Team abbreviation (e.g., 'SF')
    author: str                # Analyst name (e.g., 'Scott Barrett')
    stance: str                # Must-Draft, Bullish, Bearish, Sleeper, Breakout, Avoid, Exodia, Hansen 50, Dirty Thirty
    target_round_advice: str   # Advice (e.g., 'Round 3 Target', 'Mid Rounds')
    key_reason: str            # Core analytical justification
    upside_metric: str         # Statistic or ceiling metric
    risk_factor: str           # Primary downside or injury concern
    fp_overall_rank: Optional[int] = None
    fp_pos_rank: Optional[str] = None

class ArticleExtraction(BaseModel):
    takes: List[PlayerTake]
```

---

## 💻 Frontend Application (`app.js`, `index.html`, `styles.css`)

### 1. State Management & Data Canonicalization
* **Sleeper API Sync**: Fetches active NFL players (`https://api.sleeper.app/v1/players/nfl`) and regular season projections (`https://api.sleeper.app/projections/nfl/<YEAR>`).
* **Name Normalization & Aliasing**: Maps player names to a canonical lowercase string removing punctuation and spaces. Resolves common name mismatches via `NAME_ALIASES`:
  ```javascript
  const NAME_ALIASES = {
    'jonathonbrooks': 'jonathanbrooks',
    'marvinharrisonjr': 'marvinharrison',
    'kennethwalkeriii': 'kennethwalker',
    'travisetiennejr': 'travisetienne',
    // ...
  };
  ```
* **Grouped Player Map**: Aggregates takes by player so a single player card displays insights from multiple analysts (e.g., Scott Barrett + John Hansen).

### 2. LocalStorage Keys
| Key | Type | Description |
| :--- | :--- | :--- |
| `fp_my_roster` | JSON Array | Array of canonical player names drafted to user's roster |
| `fp_other_drafted` | JSON Array | Array of canonical player names drafted by opponents |
| `fp_starred_players` | JSON Array | Array of canonical player names marked *On Deck* |
| `fp_hide_drafted` | Boolean | Toggle state for hiding drafted players from board |
| `fp_view_mode` | String | `'list'` or `'card'` layout mode |
| `fp_sort_by` | String | `'adp'`, `'pos_rank'`, or `'stance'` |
| `fp_sidebar_collapsed` | Boolean | State of right roster drawer |

### 3. Key UI Components & Interactions
* **Header Bar**: Live Sleeper API status badge, total/active player counters, global search bar, sorting dropdown, position filter chips (`ALL`, `DECK`, `QB`, `RB`, `WR`, `TE`), and analyst filter dropdown.
* **Player Board Grid**: Rendered dynamically via `app.js`. Highlights stance badges with custom CSS gradients, target round advice, consensus metrics, and action buttons (*Draft*, *Taken*, *Star*, *Compare*).
* **Roster Sidebar**: Displays 15 standard lineup slots (`QB1`, `RB1`, `RB2`, `WR1`, `WR2`, `TE1`, `FLEX1`, `FLEX2`, `BENCH1-7`).
  * **Bye Week Overlap Detector**: Warns when multiple starters share identical bye weeks using `TEAM_BYE_WEEKS`.
  * **Positional Need Detector**: Alerts user when starter slots for QB, RB, WR, or TE remain unfilled.
* **Head-to-Head Comparison Bar & Modal**: Floating bottom bar allows picking up to 3 players for side-by-side metric comparison in a responsive overlay modal.

---

## 📂 File Registry & Key Functions

| File | Primary Responsibility | Key Functions / Elements |
| :--- | :--- | :--- |
| [ingest.py](file:///c:/Users/victo/OneDrive/Desktop/FF/ingest.py) | PDF ingest engine & Gemini client | `ingest_pdfs()`, `watch_folder()`, `load_manifest()`, `save_manifest()` |
| [app.js](file:///c:/Users/victo/OneDrive/Desktop/FF/app.js) | Frontend state & rendering engine | `fetchSleeperAdp()`, `processTakesData()`, `renderPlayerBoard()`, `renderSidebarRoster()`, `normalizePlayerName()` |
| [index.html](file:///c:/Users/victo/OneDrive/Desktop/FF/index.html) | Application DOM structure | `#header-sticky`, `#board-area`, `#rosterSidebar`, `#compareModal`, `#playerModal` |
| [styles.css](file:///c:/Users/victo/OneDrive/Desktop/FF/styles.css) | Custom CSS design system | Dark palette (`#090d16`), glassmorphism, responsive grid, modal sheets |
| [start.bat](file:///c:/Users/victo/OneDrive/Desktop/FF/start.bat) | Windows multi-process orchestrator | Launches background ingest watcher and Python `http.server 8080` |
| [fantasypoints_db.json](file:///c:/Users/victo/OneDrive/Desktop/FF/fantasypoints_db.json) | Central player JSON database | Array of `PlayerTake` objects |
| [ingested_manifest.json](file:///c:/Users/victo/OneDrive/Desktop/FF/ingested_manifest.json) | File tracking registry | Map of `filename` -> `{ mtime, size, take_count, ingested_at }` |

---

## ⚡ Developer & Agent Guidelines

When modifying this codebase, adhere to the following rules:

1. **Name Canonicalization Safeguards**:
   * Always route player names through `normalizePlayerName()` before using them as keys in maps or sets.
   * If a new player name mismatch is observed between Sleeper API and FantasyPoints text, add an entry to `NAME_ALIASES` in [app.js](file:///c:/Users/victo/OneDrive/Desktop/FF/app.js#L30).

2. **Gemini API Error Resilience**:
   * Do not alter the Gemini model retry fallback sequence in `ingest.py` without testing against rate limits.
   * Keep the `time.sleep(2)` pause in `ingest.py` between chunks to avoid exceeding free-tier limits.

3. **DOM & UI Performance**:
   * Maintain the event delegation pattern in `app.js` when listening for player card actions to prevent memory leaks with large boards.
   * Keep `styles.css` vanilla; do not introduce Tailwind or unneeded heavy dependencies.

4. **PWA & Mobile Compatibility**:
   * Ensure any new modal or overlay respects safe area insets and high-DPI touch targets on mobile devices.
