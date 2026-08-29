// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = [{"name": "Jahmyr Gibbs", "pos": "RB", "team": "DET"}, {"name": "Bijan Robinson", "pos": "RB", "team": "ATL"}, {"name": "Ja'Marr Chase", "pos": "WR", "team": "CIN"}, {"name": "Puka Nacua", "pos": "WR", "team": "LAR"}, {"name": "Jaxon Smith-Njigba", "pos": "WR", "team": "SEA"}, {"name": "Christian McCaffrey", "pos": "RB", "team": "SF"}, {"name": "Amon-Ra St. Brown", "pos": "WR", "team": "DET"}, {"name": "Jonathan Taylor", "pos": "RB", "team": "IND"}, {"name": "James Cook", "pos": "RB", "team": "BUF"}, {"name": "CeeDee Lamb", "pos": "WR", "team": "DAL"}, {"name": "Justin Jefferson", "pos": "WR", "team": "MIN"}, {"name": "Saquon Barkley", "pos": "RB", "team": "PHI"}, {"name": "Kenneth Walker III", "pos": "RB", "team": "KC"}, {"name": "Chase Brown", "pos": "RB", "team": "CIN"}, {"name": "Omarion Hampton", "pos": "RB", "team": "LAC"}, {"name": "De'Von Achane", "pos": "RB", "team": "MIA"}, {"name": "Derrick Henry", "pos": "RB", "team": "BAL"}, {"name": "Ashton Jeanty", "pos": "RB", "team": "LV"}, {"name": "A.J. Brown", "pos": "WR", "team": "NE"}, {"name": "Brock Bowers", "pos": "TE", "team": "LV"}, {"name": "Nico Collins", "pos": "WR", "team": "HOU"}, {"name": "Drake London", "pos": "WR", "team": "ATL"}, {"name": "Malik Nabers", "pos": "WR", "team": "NYG"}, {"name": "George Pickens", "pos": "WR", "team": "DAL"}, {"name": "Chris Olave", "pos": "WR", "team": "NO"}, {"name": "Rashee Rice", "pos": "WR", "team": "KC"}, {"name": "DeVonta Smith", "pos": "WR", "team": "PHI"}, {"name": "Trey McBride", "pos": "TE", "team": "ARI"}, {"name": "Jeremiyah Love", "pos": "RB", "team": "ARI"}, {"name": "Kyren Williams", "pos": "RB", "team": "LAR"}, {"name": "Zay Flowers", "pos": "WR", "team": "BAL"}, {"name": "Breece Hall", "pos": "RB", "team": "NYJ"}, {"name": "Javonte Williams", "pos": "RB", "team": "DAL"}, {"name": "Ladd McConkey", "pos": "WR", "team": "LAC"}, {"name": "Tee Higgins", "pos": "WR", "team": "CIN"}, {"name": "Emeka Egbuka", "pos": "WR", "team": "TB"}, {"name": "Josh Allen", "pos": "QB", "team": "BUF"}, {"name": "Jaylen Waddle", "pos": "WR", "team": "DEN"}, {"name": "Garrett Wilson", "pos": "WR", "team": "NYJ"}, {"name": "Travis Etienne", "pos": "RB", "team": "NO"}, {"name": "Tetairoa McMillan", "pos": "WR", "team": "CAR"}, {"name": "Josh Jacobs", "pos": "RB", "team": "GB"}, {"name": "Colston Loveland", "pos": "TE", "team": "CHI"}, {"name": "D'Andre Swift", "pos": "RB", "team": "CHI"}, {"name": "Luther Burden III", "pos": "WR", "team": "CHI"}, {"name": "Cam Skattebo", "pos": "RB", "team": "NYG"}, {"name": "David Montgomery", "pos": "RB", "team": "HOU"}, {"name": "Terry McLaurin", "pos": "WR", "team": "WAS"}, {"name": "Bhayshul Tuten", "pos": "RB", "team": "JAX"}, {"name": "Jameson Williams", "pos": "WR", "team": "DET"}, {"name": "Davante Adams", "pos": "WR", "team": "LAR"}, {"name": "Mike Evans", "pos": "WR", "team": "SF"}, {"name": "DJ Moore", "pos": "WR", "team": "BUF"}, {"name": "Bucky Irving", "pos": "RB", "team": "TB"}, {"name": "Quinshon Judkins", "pos": "RB", "team": "CLE"}, {"name": "Parker Washington", "pos": "WR", "team": "JAX"}, {"name": "Lamar Jackson", "pos": "QB", "team": "BAL"}, {"name": "Christian Watson", "pos": "WR", "team": "GB"}, {"name": "Rome Odunze", "pos": "WR", "team": "CHI"}, {"name": "Jadarian Price", "pos": "RB", "team": "SEA"}, {"name": "TreVeyon Henderson", "pos": "RB", "team": "NE"}, {"name": "Carnell Tate", "pos": "WR", "team": "TEN"}, {"name": "Tyler Warren", "pos": "TE", "team": "IND"}, {"name": "Brian Thomas Jr.", "pos": "WR", "team": "JAX"}, {"name": "Marvin Harrison Jr.", "pos": "WR", "team": "ARI"}, {"name": "Drake Maye", "pos": "QB", "team": "NE"}, {"name": "Rhamondre Stevenson", "pos": "RB", "team": "NE"}, {"name": "Joe Burrow", "pos": "QB", "team": "CIN"}, {"name": "Jayden Daniels", "pos": "QB", "team": "WAS"}, {"name": "Jaylen Warren", "pos": "RB", "team": "PIT"}, {"name": "Jalen Hurts", "pos": "QB", "team": "PHI"}, {"name": "Caleb Williams", "pos": "QB", "team": "CHI"}, {"name": "DK Metcalf", "pos": "WR", "team": "PIT"}, {"name": "Quentin Johnston", "pos": "WR", "team": "LAC"}, {"name": "Jonathon Brooks", "pos": "RB", "team": "CAR"}, {"name": "Tucker Kraft", "pos": "TE", "team": "GB"}, {"name": "Tony Pollard", "pos": "RB", "team": "TEN"}, {"name": "Jayden Reed", "pos": "WR", "team": "GB"}, {"name": "Dak Prescott", "pos": "QB", "team": "DAL"}, {"name": "Makai Lemon", "pos": "WR", "team": "PHI"}, {"name": "Courtland Sutton", "pos": "WR", "team": "DEN"}, {"name": "Josh Downs", "pos": "WR", "team": "IND"}, {"name": "Rico Dowdle", "pos": "RB", "team": "PIT"}, {"name": "Justin Herbert", "pos": "QB", "team": "LAC"}, {"name": "Chris Godwin Jr.", "pos": "WR", "team": "TB"}, {"name": "Trevor Lawrence", "pos": "QB", "team": "JAX"}, {"name": "Blake Corum", "pos": "RB", "team": "LAR"}, {"name": "RJ Harvey", "pos": "RB", "team": "DEN"}, {"name": "Jordan Addison", "pos": "WR", "team": "MIN"}, {"name": "Michael Wilson", "pos": "WR", "team": "ARI"}, {"name": "Sam LaPorta", "pos": "TE", "team": "DET"}, {"name": "Stefon Diggs", "pos": "WR", "team": "WAS"}, {"name": "Jordyn Tyson", "pos": "WR", "team": "NO"}, {"name": "Alec Pierce", "pos": "WR", "team": "IND"}, {"name": "J.K. Dobbins", "pos": "RB", "team": "DEN"}, {"name": "Jordan Mason", "pos": "RB", "team": "MIN"}, {"name": "Patrick Mahomes", "pos": "QB", "team": "KC"}, {"name": "Chuba Hubbard", "pos": "RB", "team": "CAR"}, {"name": "Jacory Croskey-Merritt", "pos": "RB", "team": "WAS"}, {"name": "Matthew Golden", "pos": "WR", "team": "GB"}, {"name": "Michael Pittman", "pos": "WR", "team": "PIT"}, {"name": "Kyle Pitts", "pos": "TE", "team": "ATL"}, {"name": "Brock Purdy", "pos": "QB", "team": "SF"}, {"name": "Jaxson Dart", "pos": "QB", "team": "NYG"}, {"name": "Harold Fannin Jr.", "pos": "TE", "team": "CLE"}, {"name": "Bo Nix", "pos": "QB", "team": "DEN"}, {"name": "Xavier Worthy", "pos": "WR", "team": "KC"}, {"name": "Kyle Monangai", "pos": "RB", "team": "CHI"}, {"name": "Kenny Gainwell", "pos": "RB", "team": "TB"}, {"name": "De'Zhaun Stribling", "pos": "WR", "team": "SF"}, {"name": "Matthew Stafford", "pos": "QB", "team": "LAR"}, {"name": "KC Concepcion", "pos": "WR", "team": "CLE"}, {"name": "George Kittle", "pos": "TE", "team": "SF"}, {"name": "Jared Goff", "pos": "QB", "team": "DET"}, {"name": "Wan'Dale Robinson", "pos": "WR", "team": "TEN"}, {"name": "Kyler Murray", "pos": "QB", "team": "MIN"}, {"name": "Jordan Love", "pos": "QB", "team": "GB"}, {"name": "Romeo Doubs", "pos": "WR", "team": "NE"}, {"name": "Rachaad White", "pos": "RB", "team": "WAS"}, {"name": "Dalton Kincaid", "pos": "TE", "team": "BUF"}, {"name": "Jakobi Meyers", "pos": "WR", "team": "JAX"}, {"name": "Baker Mayfield", "pos": "QB", "team": "TB"}, {"name": "Travis Kelce", "pos": "TE", "team": "KC"}, {"name": "Chris Rodriguez Jr.", "pos": "RB", "team": "JAX"}, {"name": "Isaiah Likely", "pos": "TE", "team": "NYG"}, {"name": "Tyler Shough", "pos": "QB", "team": "NO"}, {"name": "Deebo Samuel Sr.", "pos": "WR", "team": "SF"}, {"name": "Aaron Jones", "pos": "RB", "team": "MIN"}, {"name": "Jalen Coker", "pos": "WR", "team": "CAR"}, {"name": "Keaton Mitchell", "pos": "RB", "team": "LAC"}, {"name": "Khalil Shakir", "pos": "WR", "team": "BUF"}, {"name": "Dallas Goedert", "pos": "TE", "team": "PHI"}, {"name": "Mark Andrews", "pos": "TE", "team": "BAL"}, {"name": "Malik Willis", "pos": "QB", "team": "MIA"}, {"name": "Rashid Shaheed", "pos": "WR", "team": "SEA"}, {"name": "Jake Ferguson", "pos": "TE", "team": "DAL"}, {"name": "Woody Marks", "pos": "RB", "team": "HOU"}, {"name": "Tyler Allgeier", "pos": "RB", "team": "ARI"}, {"name": "Denzel Boston", "pos": "WR", "team": "CLE"}, {"name": "Juwan Johnson", "pos": "TE", "team": "NO"}, {"name": "Sam Darnold", "pos": "QB", "team": "SEA"}, {"name": "Mike Washington Jr.", "pos": "RB", "team": "LV"}, {"name": "Jonah Coleman", "pos": "RB", "team": "DEN"}, {"name": "Daniel Jones", "pos": "QB", "team": "IND"}, {"name": "C.J. Stroud", "pos": "QB", "team": "HOU"}, {"name": "Chig Okonkwo", "pos": "TE", "team": "WAS"}, {"name": "MarShawn Lloyd", "pos": "RB", "team": "GB"}, {"name": "Brenton Strange", "pos": "TE", "team": "JAX"}, {"name": "Jalen Nailor", "pos": "WR", "team": "LV"}, {"name": "Tre Tucker", "pos": "WR", "team": "LV"}, {"name": "Ja'Kobi Lane", "pos": "WR", "team": "BAL"}, {"name": "Tank Bigsby", "pos": "RB", "team": "PHI"}, {"name": "Tyrone Tracy Jr.", "pos": "RB", "team": "NYG"}, {"name": "Hunter Henry", "pos": "TE", "team": "NE"}, {"name": "Keenan Allen", "pos": "WR", "team": "IND"}, {"name": "Tyjae Spears", "pos": "RB", "team": "TEN"}, {"name": "Jalen McMillan", "pos": "WR", "team": "TB"}, {"name": "Cam Ward", "pos": "QB", "team": "TEN"}, {"name": "Terrance Ferguson", "pos": "TE", "team": "LAR"}, {"name": "Travis Hunter", "pos": "WR", "team": "JAX"}, {"name": "Dontayvion Wicks", "pos": "WR", "team": "PHI"}, {"name": "Tre Harris", "pos": "WR", "team": "LAC"}, {"name": "Dalton Schultz", "pos": "TE", "team": "HOU"}, {"name": "Zach Charbonnet", "pos": "RB", "team": "SEA"}, {"name": "Cyrus Allen", "pos": "WR", "team": "KC"}, {"name": "Bryce Young", "pos": "QB", "team": "CAR"}, {"name": "T.J. Hockenson", "pos": "TE", "team": "MIN"}, {"name": "Ryan Flournoy", "pos": "WR", "team": "DAL"}, {"name": "Adonai Mitchell", "pos": "WR", "team": "NYJ"}, {"name": "Omar Cooper Jr.", "pos": "WR", "team": "NYJ"}, {"name": "Dylan Sampson", "pos": "RB", "team": "CLE"}, {"name": "Pat Bryant", "pos": "WR", "team": "DEN"}, {"name": "Jauan Jennings", "pos": "WR", "team": "MIN"}, {"name": "Malik Washington", "pos": "WR", "team": "MIA"}, {"name": "AJ Barner", "pos": "TE", "team": "SEA"}, {"name": "Caleb Douglas", "pos": "WR", "team": "MIA"}, {"name": "Jaydon Blue", "pos": "RB", "team": "DAL"}, {"name": "Kenyon Sadiq", "pos": "TE", "team": "NYJ"}, {"name": "Tank Dell", "pos": "WR", "team": "HOU"}, {"name": "Aaron Rodgers", "pos": "QB", "team": "PIT"}, {"name": "Kayshon Boutte", "pos": "WR", "team": "HOU"}, {"name": "Brian Robinson", "pos": "RB", "team": "ATL"}, {"name": "Alvin Kamara", "pos": "RB", "team": "NO"}, {"name": "Braelon Allen", "pos": "RB", "team": "NYJ"}, {"name": "Devaughn Vele", "pos": "WR", "team": "NO"}, {"name": "Ray Davis", "pos": "RB", "team": "BUF"}, {"name": "Isiah Pacheco", "pos": "RB", "team": "DET"}, {"name": "Fernando Mendoza", "pos": "QB", "team": "LV"}, {"name": "Greg Dulcich", "pos": "TE", "team": "MIA"}, {"name": "Oronde Gadsden II", "pos": "TE", "team": "LAC"}, {"name": "Emmett Johnson", "pos": "RB", "team": "KC"}, {"name": "Geno Smith", "pos": "QB", "team": "NYJ"}, {"name": "Kaelon Black", "pos": "RB", "team": "SF"}, {"name": "Malachi Fields", "pos": "WR", "team": "NYG"}, {"name": "Cade Otton", "pos": "TE", "team": "TB"}, {"name": "Zachariah Branch", "pos": "WR", "team": "ATL"}, {"name": "Gunnar Helm", "pos": "TE", "team": "TEN"}, {"name": "Pat Freiermuth", "pos": "TE", "team": "PIT"}, {"name": "Jacoby Brissett", "pos": "QB", "team": "ARI"}, {"name": "Jaylin Noel", "pos": "WR", "team": "HOU"}, {"name": "Ted Hurst III", "pos": "WR", "team": "TB"}, {"name": "Isaac TeSlaa", "pos": "WR", "team": "DET"}, {"name": "Chris Bell", "pos": "WR", "team": "MIA"}, {"name": "Jerry Jeudy", "pos": "WR", "team": "CLE"}, {"name": "Calvin Ridley", "pos": "WR", "team": "TEN"}, {"name": "Najee Harris", "pos": "RB", "team": "NYG"}, {"name": "Germie Bernard", "pos": "WR", "team": "PIT"}, {"name": "Sean Tucker", "pos": "RB", "team": "TB"}, {"name": "David Njoku", "pos": "TE", "team": "LAC"}, {"name": "Kimani Vidal", "pos": "RB", "team": "LAC"}, {"name": "Charlie Kolar", "pos": "TE", "team": "LAC"}, {"name": "Rashod Bateman", "pos": "WR", "team": "BAL"}, {"name": "Cooper Kupp", "pos": "WR", "team": "SEA"}, {"name": "Colby Parkinson", "pos": "TE", "team": "LAR"}, {"name": "Kaytron Allen", "pos": "RB", "team": "WAS"}, {"name": "Michael Penix Jr.", "pos": "QB", "team": "ATL"}, {"name": "Evan Engram", "pos": "TE", "team": "DEN"}, {"name": "Justice Hill", "pos": "RB", "team": "BAL"}, {"name": "Samaje Perine", "pos": "RB", "team": "CIN"}, {"name": "Tua Tagovailoa", "pos": "QB", "team": "ATL"}, {"name": "George Holani", "pos": "RB", "team": "SEA"}, {"name": "Michael Mayer", "pos": "TE", "team": "LV"}, {"name": "Mike Gesicki", "pos": "TE", "team": "CIN"}, {"name": "Jordan James", "pos": "RB", "team": "SF"}, {"name": "Antonio Williams", "pos": "WR", "team": "WAS"}, {"name": "Tyquan Thornton", "pos": "WR", "team": "KC"}, {"name": "Deshaun Watson", "pos": "QB", "team": "CLE"}, {"name": "Andrei Iosivas", "pos": "WR", "team": "CIN"}, {"name": "Troy Franklin", "pos": "WR", "team": "DEN"}, {"name": "Darnell Mooney", "pos": "WR", "team": "NYG"}, {"name": "Jack Bech", "pos": "WR", "team": "LV"}, {"name": "Demond Claiborne", "pos": "RB", "team": "MIN"}, {"name": "James Conner", "pos": "RB", "team": "ARI"}, {"name": "Bryce Lance", "pos": "WR", "team": "NO"}, {"name": "Kirk Cousins", "pos": "QB", "team": "LV"}, {"name": "Darius Slayton", "pos": "WR", "team": "NYG"}, {"name": "Zavion Thomas", "pos": "WR", "team": "CHI"}, {"name": "Colbie Young", "pos": "WR", "team": "CIN"}, {"name": "Jahan Dotson", "pos": "WR", "team": "ATL"}, {"name": "Emanuel Wilson", "pos": "RB", "team": "SEA"}, {"name": "Malik Benson", "pos": "WR", "team": "LV"}, {"name": "Ty Johnson", "pos": "RB", "team": "BUF"}, {"name": "Chris Brooks", "pos": "RB", "team": "GB"}];
  const channel = new BroadcastChannel('underdog-sync');
  let lastPicksCount = -1;
  let syncStatusEl = null;

  function initBadge() {
    if (document.getElementById('fp-ud-sync-badge')) {
      syncStatusEl = document.getElementById('fp-ud-sync-badge');
      return;
    }
    if (!document.body) return;

    syncStatusEl = document.createElement('div');
    syncStatusEl.id = 'fp-ud-sync-badge';
    syncStatusEl.style.cssText = 'position: fixed; bottom: 16px; right: 16px; z-index: 9999999; background: #0f172a; border: 1px solid #10b981; color: #6ee7b7; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; transition: all 0.2s ease;';
    syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Active</span>';
    syncStatusEl.title = 'Click to inspect synced picks in Console';
    
    syncStatusEl.addEventListener('click', () => {
      const picks = parseDraftPicks();
      console.log('[FantasyPoints Relay] Current Detected Picks (' + picks.length + '):', picks);
      if (picks.length > 0) console.table(picks);
    });

    document.body.appendChild(syncStatusEl);
  }

  function getDraftId() {
    const match = window.location.pathname.match(/\/drafts?\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : 'underdog-draft';
  }

  function normalizeText(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function parseDraftPicks() {
    try {
      const picks = [];
      const seenKeys = new Set();
      
      // Strategy 1: Search all elements across the page for known player names
      const candidates = document.querySelectorAll(
        '[class*="pick"], [class*="Pick"], [class*="cell"], [class*="Cell"], [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], [class*="player"], [class*="Player"], [data-testid*="pick"], [data-testid*="cell"], tr, li, div'
      );

      candidates.forEach(el => {
        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length > 250) return; // ignore giant containers

        for (let i = 0; i < KNOWN_PLAYERS.length; i++) {
          const kp = KNOWN_PLAYERS[i];
          if (text.includes(kp.name)) {
            const key = normalizeText(kp.name);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              
              const isUser = text.includes('YOU') || text.includes('My Team') || el.classList.contains('is-user') || el.classList.contains('user-pick') || el.querySelector('[class*="user"], [class*="myPick"], [class*="isUser"]') !== null;

              picks.push({
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: isUser
              });
            }
            break;
          }
        }
      });

      // Strategy 2: If few or no picks found via elements, scan whole page text
      if (picks.length === 0 && document.body) {
        const bodyText = document.body.innerText || '';
        KNOWN_PLAYERS.forEach(kp => {
          if (bodyText.includes(kp.name)) {
            const key = normalizeText(kp.name);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              picks.push({
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: false
              });
            }
          }
        });
      }

      return picks;
    } catch (err) {
      console.warn('[FantasyPoints Relay] parse error:', err);
      return [];
    }
  }

  function tick() {
    try {
      if (!syncStatusEl && document.body) {
        initBadge();
      }

      const picks = parseDraftPicks();
      const draftId = getDraftId();

      if (syncStatusEl) {
        if (picks.length > 0) {
          syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks)</span>';
          syncStatusEl.style.borderColor = '#10b981';
        } else {
          syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Relay Ready</span>';
          syncStatusEl.style.borderColor = '#f59e0b';
        }
      }

      if (picks.length !== lastPicksCount && picks.length > 0) {
        lastPicksCount = picks.length;
        console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks to Companion...');
        channel.postMessage({
          type: 'UNDERDOG_PICKS_SYNC',
          draft_id: draftId,
          picks: picks,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.warn('[FantasyPoints Relay] tick error:', err);
    }
  }

  // Safe 1.5s interval
  setInterval(tick, 1500);
  setTimeout(tick, 1200);

  // Listen for sync ping from companion
  channel.onmessage = (e) => {
    if (e.data && e.data.type === 'REQUEST_UNDERDOG_SYNC') {
      lastPicksCount = -1;
      tick();
    }
  };
})();
