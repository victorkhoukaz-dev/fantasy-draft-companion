import os
import glob
import json
import time
import sys
import io
import logging
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional
from pypdf import PdfReader, PdfWriter

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class PlayerTake(BaseModel):
    player_name: str = Field(description="Full name of the NFL player, e.g., 'Christian McCaffrey'")
    position: str = Field(description="Position: QB, RB, WR, or TE")
    team: str = Field(description="NFL team abbreviation or full name, e.g., 'SF' or 'San Francisco 49ers'")
    author: str = Field(description="Author or analyst who wrote the take, e.g., 'Scott Barrett', 'John Hansen', 'Graham Barfield'")
    stance: str = Field(description="Author stance: Bullish, Bearish, Sleeper, Must-Draft, Breakout, or Avoid")
    target_round_advice: str = Field(description="Target draft round advice e.g. 'Round 6', 'Rounds 7-8', 'Mid-to-Late Rounds'. DO NOT include the word 'Tier' or tier numbers.")
    key_reason: str = Field(description="Core analysis and strategic reasoning for this stance")
    upside_metric: str = Field(description="Key metric, statistic, or projection highlighting ceiling/upside")
    risk_factor: str = Field(description="Primary downside risk, injury history, or efficiency concern")
    fp_overall_rank: Optional[int] = Field(default=None, description="Official overall numerical rank if present in rankings sheet")
    fp_pos_rank: Optional[str] = Field(default=None, description="Official positional rank e.g. 'RB1', 'WR12' if present")

class ArticleExtraction(BaseModel):
    takes: List[PlayerTake] = Field(description="List of player analysis takes extracted from the article")

def get_api_key():
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if key and key != "your_gemini_api_key_here":
        return key.strip()
    
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content and not content.startswith("#"):
                    if "=" in content:
                        parts = content.split("=", 1)
                        val = parts[1].strip().strip('"').strip("'")
                        if val and val != "your_gemini_api_key_here":
                            return val
                    elif len(content) > 10 and content != "your_gemini_api_key_here":
                        return content
        except Exception:
            pass
    return None

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "ingested_manifest.json")

def load_manifest():
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_manifest(manifest):
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def ingest_pdfs(force=False):
    api_key = get_api_key()
    if not api_key:
        logging.error("GEMINI_API_KEY is missing or set to placeholder in .env file.")
        print("\n[!] Please set your GEMINI_API_KEY in the .env file before running ingestion.\n")
        return False

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logging.error("google-genai package is not installed. Please run: pip install -r requirements.txt")
        return False

    client = genai.Client(api_key=api_key)
    raw_dir = os.path.join(os.path.dirname(__file__), "raw_articles")
    pdf_files = glob.glob(os.path.join(raw_dir, "*.pdf"))

    if not pdf_files:
        logging.warning(f"No .pdf files found in directory: {raw_dir}")
        print(f"\n[!] No PDF files found in '{raw_dir}'. Drop FantasyPoints PDFs into this folder and re-run python ingest.py.\n")
        return False

    manifest = load_manifest()
    
    # Filter for new or modified PDF files
    pending_files = []
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        mtime = os.path.getmtime(pdf_path)
        size = os.path.getsize(pdf_path)
        
        if not force and filename in manifest:
            record = manifest[filename]
            if record.get("mtime") == mtime and record.get("size") == size:
                logging.info(f"[Skipped] Already ingested: {filename}")
                continue
        pending_files.append((pdf_path, filename, mtime, size))

    if not pending_files:
        logging.info("All PDFs in raw_articles are up to date! No new files to process.")
        print("\n[✓] All articles are up to date in fantasypoints_db.json!\n")
        return True

    logging.info(f"Found {len(pending_files)} new/updated PDF file(s) to process.")

    all_takes = []
    db_path = os.path.join(os.path.dirname(__file__), "fantasypoints_db.json")

    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                if isinstance(existing_data, list):
                    all_takes = existing_data
                    logging.info(f"Loaded {len(all_takes)} existing takes from fantasypoints_db.json")
        except Exception as e:
            logging.warning(f"Could not parse existing fantasypoints_db.json: {e}")

    extraction_prompt = """
    You are an expert Fantasy Football research analyst examining pages of a FantasyPoints draft guide/article.
    Extract EVERY single player analysis take, author opinion, tier ranking, upside metric, and risk factor mentioned on these pages.
    
    For each player take, strictly extract:
    - player_name: Full name of the player
    - position: Position must be strictly QB, RB, WR, or TE
    - team: Team abbreviation or name
    - author: Author/analyst name who wrote the piece (if unknown, use 'FantasyPoints Staff')
    - stance: Must be strictly one of: Bullish, Bearish, Sleeper, Must-Draft, Breakout, Avoid
    - target_round_advice: Specific target draft round advice (e.g. 'Round 3 Target', 'Rounds 7-8', 'Mid Rounds'). DO NOT include the word 'Tier' or tier numbers.
    - key_reason: Detailed core analytical reason for the stance
    - upside_metric: Specific statistical metric, projection, or efficiency metric showing upside
    - risk_factor: Specific risk factor or downside concern
    """

    models_to_try = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-2.0-flash", "gemini-3.5-flash"]

    for pdf_path, filename, mtime, size in pending_files:
        logging.info(f"Processing PDF: {filename}...")
        file_takes = []

        try:
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            chunk_size = 5
            logging.info(f"-> {filename} has {total_pages} pages. Extracting in {chunk_size}-page chunks...")

            for start_idx in range(0, total_pages, chunk_size):
                end_idx = min(start_idx + chunk_size, total_pages)
                logging.info(f"   Analyzing pages {start_idx + 1} to {end_idx} of {total_pages}...")

                writer = PdfWriter()
                for i in range(start_idx, end_idx):
                    writer.add_page(reader.pages[i])

                chunk_bytes_io = io.BytesIO()
                writer.write(chunk_bytes_io)
                chunk_bytes = chunk_bytes_io.getvalue()

                response = None
                last_err = None
                for model_name in models_to_try:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=[
                                types.Part.from_bytes(data=chunk_bytes, mime_type="application/pdf"),
                                extraction_prompt
                            ],
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                response_schema=ArticleExtraction,
                                temperature=0.1
                            )
                        )
                        if response and response.text:
                            break
                    except Exception as err:
                        last_err = err
                        logging.warning(f"Model {model_name} failed on pages {start_idx+1}-{end_idx}: {err}")

                if response and response.text:
                    try:
                        extracted = json.loads(response.text)
                        takes = extracted.get("takes", [])
                        logging.info(f"   Extracted {len(takes)} take(s) from pages {start_idx+1}-{end_idx}")
                        file_takes.extend(takes)
                    except Exception as parse_err:
                        logging.warning(f"Failed to parse JSON for pages {start_idx+1}-{end_idx}: {parse_err}")
                else:
                    logging.warning(f"No response text received for pages {start_idx+1}-{end_idx}. Error: {last_err}")

                time.sleep(2)  # Pause to respect Free Tier limits

            logging.info(f"Finished {filename}: extracted {len(file_takes)} total player take(s).")
            all_takes.extend(file_takes)

            # Update manifest for this completed file
            manifest[filename] = {
                "mtime": mtime,
                "size": size,
                "take_count": len(file_takes),
                "ingested_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            save_manifest(manifest)

        except Exception as e:
            logging.error(f"Error reading {filename}: {e}")

    # Deduplicate takes based on player_name, author, and key_reason
    unique_takes = []
    seen = set()
    for take in all_takes:
        name = take.get("player_name", "").strip()
        author = take.get("author", "").strip()
        stance = take.get("stance", "").strip()
        reason = take.get("key_reason", "").strip()[:40]
        key = (name.lower(), author.lower(), stance.lower(), reason.lower())
        if key not in seen and name:
            seen.add(key)
            unique_takes.append(take)

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(unique_takes, f, indent=2, ensure_ascii=False)

    logging.info(f"Successfully saved fantasypoints_db.json with {len(unique_takes)} total player takes.")
    print(f"\n[+] Success! Ingestion complete. Database updated: {len(unique_takes)} total player takes.\n")
    return True

def watch_folder():
    raw_dir = os.path.join(os.path.dirname(__file__), "raw_articles")
    print(f"\n[Auto-Watcher Active] Monitoring '{raw_dir}' for new PDFs...")
    print("Simply drop any FantasyPoints PDF into raw_articles/. New files auto-ingest instantly!\n")
    
    while True:
        try:
            pdf_files = glob.glob(os.path.join(raw_dir, "*.pdf"))
            manifest = load_manifest()
            has_new = False

            for pdf_path in pdf_files:
                filename = os.path.basename(pdf_path)
                mtime = os.path.getmtime(pdf_path)
                size = os.path.getsize(pdf_path)

                if filename not in manifest or manifest[filename].get("mtime") != mtime or manifest[filename].get("size") != size:
                    has_new = True
                    break

            if has_new:
                logging.info("Detected new or updated PDF file(s). Triggering auto-ingestion...")
                ingest_pdfs()

        except KeyboardInterrupt:
            print("\n[!] Watcher stopped by user.")
            sys.exit(0)
        except Exception as e:
            logging.error(f"Watcher error: {e}")

        time.sleep(3)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["--watch", "-w", "watch"]:
        watch_folder()
    elif len(sys.argv) > 1 and sys.argv[1] in ["--force", "-f"]:
        ingest_pdfs(force=True)
    else:
        ingest_pdfs()
