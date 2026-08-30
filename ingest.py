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
    stance: str = Field(description="Author stance: Bullish, Bearish, Sleeper, Must-Draft, Breakout, Avoid, Exodia, Hansen 50, or Dirty Thirty")
    target_round_advice: str = Field(description="Target draft round advice e.g. 'Round 6', 'Rounds 7-8', 'Mid-to-Late Rounds'. DO NOT include the word 'Tier' or tier numbers.")
    key_reason: str = Field(description="Core analysis and strategic reasoning for this stance")
    upside_metric: str = Field(description="Key metric, statistic, or projection highlighting ceiling/upside")
    risk_factor: str = Field(description="Primary downside risk, injury history, or efficiency concern")
    fp_overall_rank: Optional[int] = Field(default=None, description="Official overall numerical rank if present in rankings sheet")
    fp_pos_rank: Optional[str] = Field(default=None, description="Official positional rank e.g. 'RB1', 'WR12' if present")
    is_official_ranking: Optional[bool] = Field(default=False, description="Set True ONLY if extracted from a numerical cheat sheet/rankings table PDF")

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

BASE_DIR = os.path.dirname(__file__)
MANIFEST_PATH = os.path.join(BASE_DIR, "ingested_manifest.json")
CORRECTIONS_PATH = os.path.join(BASE_DIR, "manual_corrections.json")

VALID_POSITIONS = {"QB", "RB", "WR", "TE"}
VALID_TEAMS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
    "FA", "NFL", "N/A", "TBD"
}
TEAM_ALIASES = {
    "ARZ": "ARI", "BLT": "BAL", "CLV": "CLE", "HST": "HOU", "LA": "LAR",
    "GBP": "GB", "KCC": "KC", "NEP": "NE", "NOS": "NO", "SFO": "SF",
    "TBB": "TB", "WSH": "WAS", "WSHG": "WAS", "JAC": "JAX", "LVR": "LV"
}

def clean_team_code(team: str) -> str:
    if not team:
        return "NFL"
    t = str(team).strip().upper()
    return TEAM_ALIASES.get(t, t)

CORRECTABLE_FIELDS = {"position", "team"}

def load_manual_corrections():
    if not os.path.exists(CORRECTIONS_PATH):
        return {}

    try:
        with open(CORRECTIONS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValueError("the top level must be a JSON object")
        return {
            name.strip().lower(): values
            for name, values in data.items()
            if not name.startswith("_") and isinstance(values, dict)
        }
    except Exception as e:
        logging.warning(f"Could not load manual_corrections.json: {e}")
        return {}

def apply_manual_corrections(takes):
    corrections = load_manual_corrections()
    applied_count = 0

    for take in takes:
        player_name = str(take.get("player_name", "")).strip()
        player_corrections = corrections.get(player_name.lower())
        if not player_corrections:
            continue

        for field, corrected_value in player_corrections.items():
            if field not in CORRECTABLE_FIELDS:
                logging.warning(f"Ignoring unsupported correction field '{field}' for {player_name}")
                continue
            if take.get(field) != corrected_value:
                logging.info(
                    f"Applied manual correction: {player_name} {field} "
                    f"'{take.get(field)}' -> '{corrected_value}'"
                )
                take[field] = corrected_value
                applied_count += 1

    return applied_count

def validate_takes(takes):
    warnings = []
    positions_by_player = {}

    for index, take in enumerate(takes, start=1):
        player_name = str(take.get("player_name", "")).strip() or "Unknown player"
        position = str(take.get("position", "")).strip()
        team = str(take.get("team", "")).strip()

        if position not in VALID_POSITIONS:
            warnings.append(
                f"Record {index}, {player_name}: position '{position}' must be QB, RB, WR, or TE"
            )

        if team not in VALID_TEAMS:
            warnings.append(
                f"Record {index}, {player_name}: team '{team}' is not a recognized NFL abbreviation"
            )

        positions_by_player.setdefault(player_name.lower(), {"name": player_name, "positions": set()})
        if position:
            positions_by_player[player_name.lower()]["positions"].add(position)

    for player_data in positions_by_player.values():
        valid_player_positions = player_data["positions"] & VALID_POSITIONS
        if len(valid_player_positions) > 1:
            positions = ", ".join(sorted(valid_player_positions))
            warnings.append(
                f"{player_data['name']}: conflicting positions found ({positions})"
            )

    return warnings

def prepare_takes_for_save(takes):
    applied_count = apply_manual_corrections(takes)
    warnings = validate_takes(takes)

    if applied_count:
        logging.info(f"Applied {applied_count} saved manual correction(s).")

    if warnings:
        logging.warning(f"Data validation found {len(warnings)} warning(s):")
        for warning in warnings:
            logging.warning(f"  - {warning}")
        logging.warning(
            "To make durable fixes, edit manual_corrections.json and run: "
            "python ingest.py --validate"
        )
    else:
        logging.info(f"Data validation passed for {len(takes)} record(s).")

    return applied_count, warnings

def get_mode_config(mode="redraft"):
    m = (mode or "redraft").lower().strip()
    if m in ["underdog", "bestball", "bb"]:
        raw_dir = os.path.join(BASE_DIR, "raw_articles", "underdog")
        db_path = os.path.join(BASE_DIR, "underdog_db.json")
        manifest_path = os.path.join(BASE_DIR, "underdog_manifest.json")
        label = "Underdog Best Ball"
        mode_key = "underdog"
    else:
        redraft_dir = os.path.join(BASE_DIR, "raw_articles", "redraft")
        raw_dir = redraft_dir if os.path.exists(redraft_dir) else os.path.join(BASE_DIR, "raw_articles")
        db_path = os.path.join(BASE_DIR, "fantasypoints_db.json")
        manifest_path = os.path.join(BASE_DIR, "ingested_manifest.json")
        label = "Redraft"
        mode_key = "redraft"
    return {
        "mode": mode_key,
        "raw_dir": raw_dir,
        "db_path": db_path,
        "manifest_path": manifest_path,
        "label": label
    }

def validate_existing_database(mode="redraft"):
    cfg = get_mode_config(mode)
    db_path = cfg["db_path"]
    if not os.path.exists(db_path):
        logging.info(f"Database {os.path.basename(db_path)} does not exist yet for {cfg['label']} mode.")
        return True

    try:
        with open(db_path, "r", encoding="utf-8") as f:
            takes = json.load(f)
        if not isinstance(takes, list):
            raise ValueError(f"{os.path.basename(db_path)} must contain a JSON array")
    except Exception as e:
        logging.error(f"Could not validate {os.path.basename(db_path)}: {e}")
        return False

    applied_count, warnings = prepare_takes_for_save(takes)
    if applied_count:
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(takes, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved corrected values to {os.path.basename(db_path)}.")

    return not warnings

def load_manifest(path=None):
    manifest_path = path or MANIFEST_PATH
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_manifest(manifest, path=None):
    manifest_path = path or MANIFEST_PATH
    try:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
    except Exception as e:
        logging.warning(f"Could not save manifest to {manifest_path}: {e}")

import re

def extract_cheat_sheet_pdf(pdf_path):
    filename = os.path.basename(pdf_path)
    reader = PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() for p in reader.pages])

    sections = [
        ('QB', 'QUARTERBACKS', 'RUNNING BACKS'),
        ('RB', 'RUNNING BACKS', 'WIDE RECEIVERS'),
        ('WR', 'WIDE RECEIVERS', 'TIGHT ENDS'),
        ('TE', 'TIGHT ENDS', 'KICKERS')
    ]

    pattern = re.compile(r'(\d{1,3})\s+([A-Z][a-zA-Z0-9\.\'\s\-]+?)\s+([A-Z]{2,3}|FA|-)\s+(\d+|-)\s+([A-Z0-9\-]+)\s+([\d\.]+)\s+([\d\.]+)')

    extracted_takes = []

    for pos_code, start_kw, end_kw in sections:
        s_idx = full_text.find(start_kw)
        e_idx = full_text.find(end_kw)
        sec_text = full_text[s_idx:e_idx] if e_idx != -1 else full_text[s_idx:]
        
        matches = pattern.findall(sec_text)

        for m in matches:
            rank_num = int(m[0])
            player_name = m[1].strip()
            team = m[2].strip()
            fpts_val = float(m[6])

            pos_rank_str = f"{pos_code}{rank_num}"

            take = {
                "player_name": player_name,
                "position": pos_code,
                "team": team if team not in ("-", "") else "NFL",
                "author": "FantasyPoints Staff",
                "stance": "Bullish",
                "fp_pos_rank": pos_rank_str,
                "tier_or_target_round": f"Consensus {pos_rank_str}",
                "target_round_advice": f"Consensus {pos_rank_str}",
                "key_reason": f"Official FantasyPoints Staff Consensus Projection ({fpts_val} FPG/PPR)",
                "upside_metric": f"Projected {fpts_val} PPR points",
                "risk_factor": "None explicit",
                "is_official_ranking": True,
                "source_file": filename
            }
            extracted_takes.append(take)

    logging.info(f"Extracted {len(extracted_takes)} exact positional ranks from cheat sheet {filename}")
    return extracted_takes

def ingest_pdfs(force=False, target_file=None, mode="redraft"):
    cfg = get_mode_config(mode)
    raw_dir = cfg["raw_dir"]
    db_path = cfg["db_path"]
    manifest_path = cfg["manifest_path"]
    mode_label = cfg["label"]

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

    # Gather PDF files for target mode (with fallback for redraft)
    pdf_paths_set = set()
    if cfg["mode"] == "redraft":
        for p in glob.glob(os.path.join(BASE_DIR, "raw_articles", "redraft", "*.pdf")):
            pdf_paths_set.add(p)
        for p in glob.glob(os.path.join(BASE_DIR, "raw_articles", "*.pdf")):
            pdf_paths_set.add(p)
    else:
        for p in glob.glob(os.path.join(raw_dir, "*.pdf")):
            pdf_paths_set.add(p)

    pdf_files = sorted(list(pdf_paths_set))

    if not pdf_files:
        logging.warning(f"No PDF files found for {mode_label} in {raw_dir}")
        print(f"No PDF files found for {mode_label} in {raw_dir}")
        return False

    manifest = load_manifest(manifest_path)
    
    # Filter for target or new/modified PDF files
    pending_files = []
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        mtime = os.path.getmtime(pdf_path)
        size = os.path.getsize(pdf_path)
        
        # Skip generic FP staff noise files
        if is_skipped_file(filename):
            logging.info(f"[Skipped FP Staff Noise]: {filename}")
            continue

        if target_file:
            if filename.lower() == target_file.lower() or target_file.lower() in filename.lower():
                pending_files.append((pdf_path, filename, mtime, size))
            continue

        if not force and filename in manifest:
            record = manifest[filename]
            if record.get("mtime") == mtime and record.get("size") == size:
                logging.info(f"[Skipped] Already ingested: {filename}")
                continue
        pending_files.append((pdf_path, filename, mtime, size))

    all_takes = []

    if not pending_files:
        logging.info(f"No new PDF files to process for {mode_label}. Checking CSV rankings...")
        if os.path.exists(db_path):
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                    if isinstance(existing_data, list):
                        all_takes = [t for t in existing_data if not t.get("source_file", "").endswith(".csv")]
            except Exception as e:
                logging.warning(f"Could not parse existing {os.path.basename(db_path)}: {e}")
    else:
        logging.info(f"[{mode_label}] Found {len(pending_files)} PDF file(s) to process.")
        pending_filenames = {fn for _, fn, _, _ in pending_files}
        if os.path.exists(db_path):
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                    if isinstance(existing_data, list):
                        all_takes = [t for t in existing_data if t.get("source_file") not in pending_filenames and not t.get("source_file", "").endswith(".csv")]
            except Exception as e:
                logging.warning(f"Could not parse existing {os.path.basename(db_path)}: {e}")

    extraction_prompt = """
    You are an expert Fantasy Football research analyst examining pages of a FantasyPoints draft guide/article.
    Extract EVERY single player analysis take, author opinion, tier ranking, upside metric, and risk factor mentioned on these pages.
    
    For each player take, strictly extract:
    - player_name: Full name of the player
    - position: Position must be strictly QB, RB, WR, or TE
    - team: Team abbreviation or name
    - author: Author/analyst name who wrote the piece (if unknown, use 'FantasyPoints Staff')
    - stance: Must be strictly one of: Bullish, Bearish, Sleeper, Must-Draft, Breakout, Avoid, Exodia, Hansen 50, Dirty Thirty, The Twelve, Guru's Guys
      * If this is John Hansen's 'Best Picks' (Guru's Guys) guide, set stance: Guru's Guys.
      * If this is John Hansen's 'The Twelve' section in his Draft Plan, set stance: The Twelve.
    - target_round_advice: Specific target draft round advice (e.g. 'Round 3 Target', 'Rounds 7-8', 'Mid Rounds'). DO NOT include the word 'Tier' or tier numbers.
    - key_reason: Detailed core analytical reason for the stance
    - upside_metric: Specific statistical metric, projection, or efficiency metric showing upside
    - risk_factor: Specific risk factor or downside concern
    - fp_pos_rank: Author's explicit positional rank if present in page or guide (e.g. 'RB1', 'RB12', 'WR4', 'QB6')
    - fp_overall_rank: Author's explicit overall rank number if present
    - is_official_ranking: Set to true ONLY if this page is an official numerical rankings list/table/cheat sheet, NOT an article take.
    """

    models_to_try = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"]

    for pdf_path, filename, mtime, size in pending_files:
        logging.info(f"Processing PDF: {filename}...")
        file_takes = []

        if "cheat-sheet" in filename.lower() or "projections" in filename.lower():
            file_takes = extract_cheat_sheet_pdf(pdf_path)
            all_takes.extend(file_takes)
            manifest[filename] = {"mtime": mtime, "size": size, "takes_count": len(file_takes), "ingested_at": time.time()}
            continue

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
                    for attempt in range(3):
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
                            err_msg = str(err)
                            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                                logging.warning(f"Rate limited (429) on {model_name} (pages {start_idx+1}-{end_idx}). Backing off 6s (attempt {attempt+1}/3)...")
                                time.sleep(6)
                            else:
                                logging.warning(f"Model {model_name} failed on pages {start_idx+1}-{end_idx}: {err}")
                                break
                    if response and response.text:
                        break

                if response and response.text:
                    try:
                        extracted = json.loads(response.text)
                        takes = extracted.get("takes", [])
                        for t in takes:
                            t["source_file"] = filename
                            if "best picks" in filename.lower() and t.get("stance") not in ["The Twelve", "Exodia"]:
                                t["stance"] = "Guru's Guys"
                            elif "draft plan" in filename.lower():
                                kr = str(t.get("key_reason", "")).lower()
                                um = str(t.get("upside_metric", "")).lower()
                                if ("the twelve" in kr or "the twelve" in um) and t.get("stance") != "Exodia":
                                    t["stance"] = "The Twelve"
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
            save_manifest(manifest, manifest_path)

        except Exception as e:
            logging.error(f"Error reading {filename}: {e}")

    # Ingest CSV Rankings files if present
    csv_takes = parse_csv_rankings(raw_dir)
    if csv_takes:
        logging.info(f"Loaded {len(csv_takes)} official ranking takes from CSV files.")
        all_takes.extend(csv_takes)

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

    prepare_takes_for_save(unique_takes)

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(unique_takes, f, indent=2, ensure_ascii=False)

    logging.info(f"Successfully saved {os.path.basename(db_path)} with {len(unique_takes)} total player takes.")
    
    # Auto-synchronize underdog_adp.json and extension dictionary when Underdog mode is ingested
    if mode == "underdog":
        try:
            import subprocess
            subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "ingest_underdog_adp.py")], check=True)
            subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "build_content_js.py")], check=True)
            logging.info("Auto-updated underdog_adp.json and underdog-extension/content.js from CSV!")
        except Exception as e:
            logging.warning(f"Post-ingest script hook warning: {e}")

    print(f"\n[+] Success! [{mode_label}] Ingestion complete. Database updated ({os.path.basename(db_path)}): {len(unique_takes)} total player takes.\n")
    return True

def parse_csv_rankings(raw_dir):
    import csv
    csv_files = glob.glob(os.path.join(raw_dir, "*.csv"))
    csv_takes = []
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        author = "FantasyPoints Staff"
        is_underdog_csv = "underdog" in filename.lower() or "best-ball" in filename.lower()
        
        if "barrett" in filename.lower():
            author = "Scott Barrett"
        elif "hansen" in filename.lower():
            author = "John Hansen"

        try:
            with open(csv_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    clean_row = {k.strip().lower(): v for k, v in row.items() if k}
                    
                    name = clean_row.get("name") or clean_row.get("player") or clean_row.get("player_name") or ""
                    pos = clean_row.get("pos") or clean_row.get("position") or ""
                    team = clean_team_code(clean_row.get("team") or "NFL")
                    
                    rank = clean_row.get("overall") or clean_row.get("rank") or clean_row.get("adp") or ""
                    tier = clean_row.get("tier") or ""
                    exodia = clean_row.get("exodia") or ""
                    target = clean_row.get("target") or ""
                    adp_str = clean_row.get("adp") or ""

                    # Special check: in Best Ball CSV, "position" column holds 'RB1', 'WR2', etc.
                    pos_rank_explicit = ""
                    if "position" in clean_row and clean_row["position"] != pos:
                        pos_rank_explicit = clean_row["position"].strip()

                    if not (rank and name and pos):
                        continue
                    
                    pos = pos.upper().strip()
                    rank_str = str(rank).strip()
                    pos_rank = pos_rank_explicit if pos_rank_explicit else f"{pos}{rank_str}"

                    stance = "Bullish"
                    if str(exodia).lower() in ["true", "1", "exodia", "yes"]:
                        stance = "Exodia"
                    elif author == "John Hansen" and str(target).lower() in ["true", "1", "target", "yes"]:
                        stance = "Hansen 50"
                    elif author == "Scott Barrett" and str(target).lower() in ["true", "1", "target", "yes"]:
                        stance = "Must-Draft"

                    is_top200 = "top-200" in filename.lower() or is_underdog_csv
                    overall_num = int(rank_str) if (is_top200 and rank_str.isdigit()) else None

                    if is_underdog_csv:
                        key_reason = f"Official FantasyPoints Underdog Best Ball Rank #{rank_str} ({pos_rank})"
                        upside_metric = f"Underdog ADP: {adp_str}" if adp_str else f"Best Ball Rank #{rank_str}"
                    else:
                        key_reason = f"Official {author} Top-200 Overall Rank #{rank_str}" if is_top200 else (f"Official {author} positional ranking: {pos_rank} (Tier {tier})" if tier else f"Official {author} positional ranking: {pos_rank}")
                        upside_metric = f"Official {author} Rank #{rank_str}"

                    take = {
                        "player_name": name.strip(),
                        "position": pos,
                        "team": team.strip(),
                        "author": author,
                        "stance": stance,
                        "target_round_advice": f"Tier {tier}" if tier else "",
                        "key_reason": key_reason,
                        "upside_metric": upside_metric,
                        "risk_factor": "",
                        "fp_pos_rank": None if is_top200 and not pos_rank_explicit else pos_rank,
                        "fp_overall_rank": overall_num,
                        "is_official_ranking": True,
                        "source_file": filename
                    }
                    csv_takes.append(take)
        except Exception as e:
            logging.warning(f"Error parsing CSV {filename}: {e}")
    return csv_takes

def is_skipped_file(filename):
    fn = filename.lower()
    return "overvalues" in fn or ("targets" in fn and "ft staff" in fn) or "fp staff" in fn

def watch_folder(mode="all"):
    print("\n[Auto-Watcher Active] 🔍 Monitoring 'raw_articles/redraft/' AND 'raw_articles/underdog/' for new PDFs/CSVs...")
    print("Simply drop any FantasyPoints PDF or CSV into its folder. New files auto-ingest instantly!\n")
    
    modes_to_watch = ["redraft", "underdog"] if mode in ["all", "both"] else [mode]

    while True:
        try:
            for m in modes_to_watch:
                cfg = get_mode_config(m)
                raw_dir = cfg["raw_dir"]
                manifest_path = cfg["manifest_path"]
                mode_label = cfg["label"]

                file_paths_set = set()
                if m == "redraft":
                    for p in glob.glob(os.path.join(BASE_DIR, "raw_articles", "redraft", "*.pdf")):
                        file_paths_set.add(p)
                    for p in glob.glob(os.path.join(BASE_DIR, "raw_articles", "redraft", "*.csv")):
                        file_paths_set.add(p)
                    for p in glob.glob(os.path.join(BASE_DIR, "raw_articles", "*.pdf")):
                        file_paths_set.add(p)
                else:
                    for p in glob.glob(os.path.join(raw_dir, "*.pdf")):
                        file_paths_set.add(p)
                    for p in glob.glob(os.path.join(raw_dir, "*.csv")):
                        file_paths_set.add(p)

                watch_files = sorted(list(file_paths_set))
                manifest = load_manifest(manifest_path)
                has_new = False

                for f_path in watch_files:
                    filename = os.path.basename(f_path)
                    if is_skipped_file(filename):
                        continue
                    mtime = os.path.getmtime(f_path)
                    size = os.path.getsize(f_path)

                    if filename not in manifest or manifest[filename].get("mtime") != mtime or manifest[filename].get("size") != size:
                        has_new = True
                        break

                if has_new:
                    logging.info(f"[{mode_label}] Detected new or updated file(s). Triggering auto-ingestion...")
                    ingest_pdfs(mode=m)

        except KeyboardInterrupt:
            print("\n[!] Watcher stopped by user.")
            sys.exit(0)
        except Exception as e:
            logging.error(f"Watcher error: {e}")

        time.sleep(3)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="FantasyPoints Article Ingestion Pipeline")
    parser.add_argument("--mode", "-m", choices=["redraft", "underdog", "bestball", "bb"], default="redraft", help="Draft mode target (default: redraft)")
    parser.add_argument("--watch", "-w", action="store_true", help="Monitor folder and auto-ingest new PDFs")
    parser.add_argument("--validate", action="store_true", help="Validate existing database without calling Gemini API")
    parser.add_argument("--force", "-f", action="store_true", help="Force re-ingestion of all PDFs")
    parser.add_argument("--file", type=str, default=None, help="Target specific PDF filename to ingest")

    args = parser.parse_args()
    target_mode = "underdog" if args.mode in ["underdog", "bestball", "bb"] else "redraft"

    if args.watch:
        watch_mode = "all" if args.mode == "redraft" else target_mode
        watch_folder(mode=watch_mode)
    elif args.validate:
        validate_existing_database(mode=target_mode)
    elif args.force:
        ingest_pdfs(force=True, mode=target_mode)
    elif args.file:
        ingest_pdfs(target_file=args.file, mode=target_mode)
    else:
        ingest_pdfs(mode=target_mode)
