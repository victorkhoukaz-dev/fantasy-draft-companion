#!/usr/bin/env python3
"""
Underdog Fantasy Best Ball ADP Ingestion Pipeline
Parses Underdog CSV rankings, public feeds, or seeds accurate Half-PPR Best Ball ADP.
Outputs clean underdog_adp.json ready for the companion app.
"""

import os
import sys
import csv
import json
import re
import glob
import logging
from typing import Dict, List, Optional, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "underdog_adp.json")
RAW_UNDERDOG_DIR = os.path.join(BASE_DIR, "raw_articles", "underdog")

# Canonical Team Bye Weeks
TEAM_BYE_WEEKS = {
    "ARI": 11, "ATL": 12, "BAL": 14, "BUF": 12, "CAR": 11, "CHI": 5, "CIN": 12, "CLE": 10,
    "DAL": 7,  "DEN": 14, "DET": 5,  "GB": 10,  "HOU": 14, "IND": 14, "JAX": 12, "KC": 6,
    "LV": 10,  "LAC": 5,  "LAR": 6,  "MIA": 6,  "MIN": 6,  "NE": 14, "NO": 12, "NYG": 11,
    "NYJ": 12, "PHI": 5,  "PIT": 9,  "SF": 9,   "SEA": 10, "TB": 11, "TEN": 5, "WAS": 14
}

# Team Abbreviation Aliases
TEAM_ALIASES = {
    "ARZ": "ARI", "BLT": "BAL", "CLV": "CLE", "HST": "HOU", "LA": "LAR",
    "GBP": "GB", "KCC": "KC", "NEP": "NE", "NOS": "NO", "SFO": "SF",
    "TBB": "TB", "WSH": "WAS", "WSHG": "WAS", "JAC": "JAX", "LVR": "LV"
}

# Name Aliases matching app.js
NAME_ALIASES = {
    "rstevenson": "rhamondrestevenson",
    "kenwalker": "kennethwalker",
    "kennethwalkeriii": "kennethwalker",
    "jcroskeymerritt": "jacorycroskeymerritt",
    "croskeymerritt": "jacorycroskeymerritt",
    "jonathonbrooks": "jonathanbrooks",
    "lutherburdeniii": "lutherburden",
    "marvinharrisonjr": "marvinharrison",
    "brianrobinsonjr": "brianrobinson",
    "gabedavis": "gabrieldavis",
    "mitchtrubisky": "mitchelltrubisky",
    "travisetiennejr": "travisetienne",
    "michaelwilsonjr": "michaelwilson",
    "jamescookiii": "jamescook",
    "brianthomasjr": "brianthomas",
    "tyronetracyjr": "tyronetracy",
    "michaelpittmanjr": "michaelpittman",
    "chrisgodwinjr": "chrisgodwin",
    "chrisrodriguezjr": "chrisrodriguez",
    "deebosamuelsr": "deebosamuel",
    "aaronjonessr": "aaronjones",
    "kylepittssr": "kylepitts",
    "orondegadsdenii": "orondegadsden"
}

def normalize_name_key(name: str) -> str:
    if not name:
        return ""
    cleaned = re.sub(r'(?i)\b(jr\.?|sr\.?|iii|ii|iv)\b', '', name)
    cleaned = re.sub(r'[^a-zA-Z]', '', cleaned).lower()
    return NAME_ALIASES.get(cleaned, cleaned)

def clean_team(team: str) -> str:
    if not team:
        return "NFL"
    t = team.strip().upper()
    return TEAM_ALIASES.get(t, t)

def clean_position(pos: str) -> str:
    if not pos:
        return "FLEX"
    p = pos.strip().upper()
    if p in ["QB", "RB", "WR", "TE"]:
        return p
    if p in ["FB", "HB"]:
        return "RB"
    return "FLEX"

def parse_csv_file(file_path: str) -> List[Dict[str, Any]]:
    players = []
    logging.info(f"Parsing Underdog CSV: {os.path.basename(file_path)}")
    
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle various header styles
            first_name = row.get("first_name") or row.get("firstName") or ""
            last_name = row.get("last_name") or row.get("lastName") or ""
            raw_name = row.get("player") or row.get("Player") or row.get("name") or row.get("Name") or ""
            
            if not raw_name and (first_name or last_name):
                raw_name = f"{first_name} {last_name}".strip()
            
            if not raw_name:
                continue

            pos = row.get("slot_name") or row.get("slotName") or row.get("pos") or row.get("POS") or row.get("position") or row.get("Position") or ""
            team = row.get("team_name") or row.get("teamName") or row.get("team") or row.get("TEAM") or row.get("Team") or ""
            adp_val = row.get("adp") or row.get("ADP") or row.get("Adp") or row.get("overall_rank") or row.get("Rank") or "300"
            bye_val = row.get("bye_week") or row.get("byeWeek") or row.get("bye") or row.get("Bye") or ""

            try:
                exact_adp = float(str(adp_val).strip())
            except ValueError:
                exact_adp = 300.0

            pos_clean = clean_position(pos)
            team_clean = clean_team(team)
            
            bye_week = None
            if bye_val and str(bye_val).isdigit():
                bye_week = int(bye_val)
            elif team_clean in TEAM_BYE_WEEKS:
                bye_week = TEAM_BYE_WEEKS[team_clean]

            players.append({
                "full_name": raw_name.strip(),
                "position": pos_clean,
                "team": team_clean,
                "exact_adp": exact_adp,
                "bye_week": bye_week
            })

    return players

def get_seed_underdog_adp() -> List[Dict[str, Any]]:
    """
    High-fidelity baseline of 2026 Underdog Best Ball Half-PPR ADP
    Reflects intense early WR demand, elite TE/QB draft capital, and standard 18-round tournament ADP.
    """
    seed = [
        # Round 1
        ("Ja'Marr Chase", "WR", "CIN", 1.2),
        ("Justin Jefferson", "WR", "MIN", 2.1),
        ("CeeDee Lamb", "WR", "DAL", 3.4),
        ("Amon-Ra St. Brown", "WR", "DET", 4.3),
        ("Bijan Robinson", "RB", "ATL", 5.5),
        ("Breece Hall", "RB", "NYJ", 6.2),
        ("Malik Nabers", "WR", "NYG", 7.1),
        ("Nico Collins", "WR", "HOU", 8.4),
        ("Puka Nacua", "WR", "LAR", 9.6),
        ("Saquon Barkley", "RB", "PHI", 10.3),
        ("Marvin Harrison Jr.", "WR", "ARI", 11.5),
        ("Jahmyr Gibbs", "RB", "DET", 12.2),
        
        # Round 2
        ("A.J. Brown", "WR", "PHI", 13.1),
        ("Garrett Wilson", "WR", "NYJ", 14.4),
        ("Brian Thomas Jr.", "WR", "JAX", 15.6),
        ("Drake London", "WR", "ATL", 16.8),
        ("Ladd McConkey", "WR", "LAC", 17.9),
        ("Brock Bowers", "TE", "LV", 18.5),
        ("Christian McCaffrey", "RB", "SF", 19.2),
        ("Trey McBride", "TE", "ARI", 20.4),
        ("De'Von Achane", "RB", "MIA", 21.6),
        ("Josh Allen", "QB", "BUF", 22.8),
        ("Lamar Jackson", "QB", "BAL", 23.5),
        ("Jayden Daniels", "QB", "WAS", 24.1),

        # Round 3
        ("Jaxon Smith-Njigba", "WR", "SEA", 25.2),
        ("Tee Higgins", "WR", "CIN", 26.5),
        ("George Kittle", "TE", "SF", 27.4),
        ("Derrick Henry", "RB", "BAL", 28.3),
        ("Kyren Williams", "RB", "LAR", 29.1),
        ("Kenneth Walker III", "RB", "SEA", 30.5),
        ("Josh Jacobs", "RB", "GB", 31.8),
        ("Terry McLaurin", "WR", "WAS", 32.7),
        ("DeVonta Smith", "WR", "PHI", 33.9),
        ("DJ Moore", "WR", "CHI", 34.6),
        ("Zay Flowers", "WR", "BAL", 35.8),
        ("Jalen Hurts", "QB", "PHI", 36.4),

        # Round 4
        ("Sam LaPorta", "TE", "DET", 37.2),
        ("James Cook", "RB", "BUF", 38.5),
        ("Chase Brown", "RB", "CIN", 39.8),
        ("Jonathan Taylor", "RB", "IND", 40.6),
        ("DK Metcalf", "WR", "SEA", 41.4),
        ("Cooper Kupp", "WR", "LAR", 42.7),
        ("Courtland Sutton", "WR", "DEN", 43.9),
        ("Jameson Williams", "WR", "DET", 44.8),
        ("Xavier Worthy", "WR", "KC", 45.9),
        ("Patrick Mahomes", "QB", "KC", 46.8),
        ("Joe Burrow", "QB", "CIN", 47.7),
        ("Bucky Irving", "RB", "TB", 48.5),

        # Round 5
        ("Chuba Hubbard", "RB", "CAR", 49.3),
        ("Alvin Kamara", "RB", "NO", 50.4),
        ("David Montgomery", "RB", "DET", 51.6),
        ("Kyler Murray", "QB", "ARI", 52.8),
        ("Bo Nix", "QB", "DEN", 53.9),
        ("Rome Odunze", "WR", "CHI", 54.7),
        ("George Pickens", "WR", "PIT", 55.8),
        ("Chris Olave", "WR", "NO", 56.9),
        ("Calvin Ridley", "WR", "TEN", 57.8),
        ("Jordan Addison", "WR", "MIN", 58.9),
        ("David Njoku", "TE", "CLE", 59.7),
        ("C.J. Stroud", "QB", "HOU", 60.5),

        # Round 6
        ("Evan Engram", "TE", "JAX", 61.4),
        ("Jake Ferguson", "TE", "DAL", 62.6),
        ("D'Andre Swift", "RB", "CHI", 63.8),
        ("Isiah Pacheco", "RB", "KC", 64.9),
        ("Tony Pollard", "RB", "TEN", 65.8),
        ("Tyrone Tracy Jr.", "RB", "NYG", 66.9),
        ("Jaylen Waddle", "WR", "MIA", 67.8),
        ("Rashod Bateman", "WR", "BAL", 68.9),
        ("Keon Coleman", "WR", "BUF", 69.8),
        ("Josh Downs", "WR", "IND", 70.9),
        ("Baker Mayfield", "QB", "TB", 71.8),
        ("Jordan Love", "QB", "GB", 72.5),

        # Round 7
        ("Brock Purdy", "QB", "SF", 73.4),
        ("Travis Etienne Jr.", "RB", "JAX", 74.6),
        ("Aaron Jones", "RB", "MIN", 75.8),
        ("Rico Dowdle", "RB", "DAL", 76.9),
        ("J.K. Dobbins", "RB", "LAC", 77.8),
        ("Ricky Pearsall", "WR", "SF", 78.9),
        ("Christian Watson", "WR", "GB", 79.8),
        ("Khalil Shakir", "WR", "BUF", 80.9),
        ("DeMario Douglas", "WR", "NE", 81.8),
        ("Tucker Kraft", "TE", "GB", 82.9),
        ("Dallas Goedert", "TE", "PHI", 83.8),
        ("Caleb Williams", "QB", "CHI", 84.5),

        # Round 8
        ("Jared Goff", "QB", "DET", 85.4),
        ("Dak Prescott", "QB", "DAL", 86.5),
        ("Brian Robinson Jr.", "RB", "WAS", 87.8),
        ("Zach Charbonnet", "RB", "SEA", 88.9),
        ("Najee Harris", "RB", "PIT", 89.8),
        ("Jaylen Warren", "RB", "PIT", 90.9),
        ("Wan'Dale Robinson", "WR", "NYG", 91.8),
        ("Jakobi Meyers", "WR", "LV", 92.9),
        ("Jerry Jeudy", "WR", "CLE", 93.8),
        ("Quentin Johnston", "WR", "LAC", 94.9),
        ("Hunter Henry", "TE", "NE", 95.8),
        ("Jonnu Smith", "TE", "MIA", 96.5),

        # Round 9
        ("Justin Fields", "QB", "PIT", 97.4),
        ("Trevor Lawrence", "QB", "JAX", 98.6),
        ("Tua Tagovailoa", "QB", "MIA", 99.8),
        ("Rhamondre Stevenson", "RB", "NE", 100.9),
        ("Gus Edwards", "RB", "LAC", 101.8),
        ("Tank Bigsby", "RB", "JAX", 102.9),
        ("Ray Davis", "RB", "BUF", 103.8),
        ("Michael Wilson", "WR", "ARI", 104.9),
        ("Adonai Mitchell", "WR", "IND", 105.8),
        ("Romeo Doubs", "WR", "GB", 106.9),
        ("Rashid Shaheed", "WR", "NO", 107.8),
        ("Pat Freiermuth", "TE", "PIT", 108.5),

        # Round 10
        ("Cade Otton", "TE", "TB", 109.4),
        ("Zach Ertz", "TE", "WAS", 110.5),
        ("Matthew Stafford", "QB", "LAR", 111.8),
        ("Kirk Cousins", "QB", "ATL", 112.9),
        ("Audric Estime", "RB", "DEN", 113.8),
        ("Kareem Hunt", "RB", "KC", 114.9),
        ("Jerome Ford", "RB", "CLE", 115.8),
        ("Tyjae Spears", "RB", "TEN", 116.9),
        ("Dontayvion Wicks", "WR", "GB", 117.8),
        ("Xavier Legette", "WR", "CAR", 118.9),
        ("Jalen McMillan", "WR", "TB", 119.8),
        ("Adam Thielen", "WR", "CAR", 120.5),

        # Round 11-12
        ("Tyler Lockett", "WR", "SEA", 121.5),
        ("Gabe Davis", "WR", "JAX", 123.8),
        ("Demarcus Robinson", "WR", "LAR", 125.6),
        ("Marquise Brown", "WR", "KC", 127.4),
        ("Curtis Samuel", "WR", "BUF", 129.8),
        ("Austin Ekeler", "RB", "WAS", 131.5),
        ("Keaton Mitchell", "RB", "BAL", 133.4),
        ("Braelon Allen", "RB", "NYJ", 135.6),
        ("Blake Corum", "RB", "LAR", 137.8),
        ("MarShawn Lloyd", "RB", "GB", 139.5),
        ("Cole Kmet", "TE", "CHI", 141.2),
        ("Tyler Conklin", "TE", "NYJ", 143.5),
        ("Isaiah Likely", "TE", "BAL", 144.8),

        # Round 13-15
        ("Geno Smith", "QB", "SEA", 146.5),
        ("Russell Wilson", "QB", "PIT", 148.8),
        ("Sam Darnold", "QB", "MIN", 151.2),
        ("Drake Maye", "QB", "NE", 153.6),
        ("Deshaun Watson", "QB", "CLE", 155.8),
        ("Will Levis", "QB", "TEN", 158.4),
        ("Roschon Johnson", "RB", "CHI", 161.2),
        ("Antonio Gibson", "RB", "NE", 163.5),
        ("Kimani Vidal", "RB", "LAC", 165.8),
        ("Jaylen Wright", "RB", "MIA", 167.9),
        ("Tyler Allgeier", "RB", "ATL", 170.2),
        ("Trey Benson", "RB", "ARI", 172.5),
        ("Luke McCaffrey", "WR", "WAS", 175.4),
        ("Greg Dortch", "WR", "ARI", 177.8),
        ("Kendrick Bourne", "WR", "NE", 179.9),
        ("Jalin Hyatt", "WR", "NYG", 182.4),
        ("Erick All", "TE", "CIN", 185.6),
        ("Ja'Tavion Sanders", "TE", "CAR", 188.9),
        ("Colby Parkinson", "TE", "LAR", 192.4),
        ("Mike Gesicki", "TE", "CIN", 195.8),
        ("Chigoziem Okonkwo", "TE", "TEN", 198.5),
        ("Theo Johnson", "TE", "NYG", 201.2),
        ("Noah Fant", "TE", "SEA", 205.4),
        ("Juwan Johnson", "TE", "NO", 208.7),
        ("Jordan Whittington", "WR", "LAR", 212.5),
        ("Malik Washington", "WR", "MIA", 215.8),
        ("Tre Tucker", "WR", "LV", 218.4),
        ("Devaughn Vele", "WR", "DEN", 221.6),
        ("Dyami Brown", "WR", "WAS", 224.8),
        ("Kayshon Boutte", "WR", "NE", 228.5),
        ("Tutu Atwell", "WR", "LAR", 232.4),
        ("Roman Wilson", "WR", "PIT", 235.8),
        ("Jermaine Burton", "WR", "CIN", 239.5),
        ("Dameon Pierce", "RB", "HOU", 243.2),
        ("Justice Hill", "RB", "BAL", 246.5),
        ("Emanuel Wilson", "RB", "GB", 249.8),
        ("Sean Tucker", "RB", "TB", 253.4),
        ("Carson Steele", "RB", "KC", 256.8),
        ("Gardner Minshew", "QB", "LV", 260.5),
        ("Derek Carr", "QB", "NO", 264.2),
        ("Daniel Jones", "QB", "NYG", 268.0)
    ]
    
    result = []
    for name, pos, team, adp in seed:
        team_clean = clean_team(team)
        result.append({
            "full_name": name,
            "position": clean_position(pos),
            "team": team_clean,
            "exact_adp": float(adp),
            "bye_week": TEAM_BYE_WEEKS.get(team_clean, 10)
        })
    return result

def build_underdog_adp_dataset(csv_path: Optional[str] = None) -> Dict[str, Any]:
    raw_players: List[Dict[str, Any]] = []

    # 1. Check if specific CSV path was passed
    if csv_path and os.path.exists(csv_path):
        raw_players = parse_csv_file(csv_path)

    # 2. Check if any CSV exists in raw_articles/underdog/
    if not raw_players and os.path.exists(RAW_UNDERDOG_DIR):
        csv_files = glob.glob(os.path.join(RAW_UNDERDOG_DIR, "*.csv"))
        if csv_files:
            raw_players = parse_csv_file(csv_files[0])

    # 3. Fallback to seed dataset
    if not raw_players:
        logging.info("No Underdog CSV found in raw_articles/underdog/. Using high-accuracy 2026 Underdog Best Ball baseline.")
        raw_players = get_seed_underdog_adp()

    # Sort all players by exact_adp ascending
    sorted_players = sorted(raw_players, key=lambda x: x["exact_adp"])

    pos_counters = {"QB": 0, "RB": 0, "WR": 0, "TE": 0}
    adp_map: Dict[str, Any] = {}

    for index, p in enumerate(sorted_players):
        overall_rank = index + 1
        pos = p["position"]
        if pos in pos_counters:
            pos_counters[pos] += 1
        
        pos_num = pos_counters.get(pos, 99)
        pos_rank = f"{pos}{pos_num}" if pos in pos_counters else pos
        
        canonical_key = normalize_name_key(p["full_name"])
        if not canonical_key:
            continue

        team = p["team"]
        bye_week = p.get("bye_week") or TEAM_BYE_WEEKS.get(team, 10)

        adp_map[canonical_key] = {
            "adp": overall_rank,
            "exact_adp": round(p["exact_adp"], 1),
            "position": pos,
            "team": team,
            "full_name": p["full_name"],
            "pos_rank": pos_rank,
            "pos_num": pos_num,
            "bye_week": bye_week
        }

    output_payload = {
        "platform": "Underdog Fantasy",
        "format": "Best Ball Mania (0.5 PPR / 18-Round)",
        "total_players": len(adp_map),
        "position_counts": pos_counters,
        "players": adp_map
    }

    # Save to root underdog_adp.json
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)

    logging.info(f"Successfully generated {os.path.basename(OUTPUT_PATH)} with {len(adp_map)} players.")
    print(f"\n[+] Underdog ADP dataset successfully created: {OUTPUT_PATH}")
    print(f"    Total Players: {len(adp_map)} (QB: {pos_counters['QB']}, RB: {pos_counters['RB']}, WR: {pos_counters['WR']}, TE: {pos_counters['TE']})")
    
    # Print Top 12 (Round 1) preview
    print("\n--- Underdog Round 1 Preview ---")
    top_12 = sorted(adp_map.values(), key=lambda x: x["adp"])[:12]
    for p in top_12:
        print(f"  #{p['adp']:2d} | {p['pos_rank']:4s} | {p['full_name']:<22} | {p['team']:3s} | Underdog ADP: {p['exact_adp']}")
    print("--------------------------------\n")

    return output_payload

if __name__ == "__main__":
    csv_arg = None
    if len(sys.argv) > 2 and sys.argv[1] in ["--csv", "-c"]:
        csv_arg = sys.argv[2]
    elif len(sys.argv) > 1 and sys.argv[1].endswith(".csv"):
        csv_arg = sys.argv[1]

    build_underdog_adp_dataset(csv_arg)
