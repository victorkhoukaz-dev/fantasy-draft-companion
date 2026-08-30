// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = [{"name": "Jahmyr Gibbs", "aliases": ["J. Gibbs", "Jahmyr Gibbs"], "pos": "RB", "team": "DET"}, {"name": "Bijan Robinson", "aliases": ["Bijan Robinson", "B. Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Ja'Marr Chase", "aliases": ["Ja'Marr Chase", "JaMarr Chase", "J. Chase"], "pos": "WR", "team": "CIN"}, {"name": "Puka Nacua", "aliases": ["P. Nacua", "Puka Nacua"], "pos": "WR", "team": "LAR"}, {"name": "Jaxon Smith-Njigba", "aliases": ["J. Smith-Njigba", "Jaxon Smith-Njigba"], "pos": "WR", "team": "SEA"}, {"name": "Christian McCaffrey", "aliases": ["C. McCaffrey", "Christian McCaffrey"], "pos": "RB", "team": "SF"}, {"name": "Amon-Ra St. Brown", "aliases": ["Amon-Ra St. Brown", "Amon-Ra St Brown", "A. St. Brown"], "pos": "WR", "team": "DET"}, {"name": "Jonathan Taylor", "aliases": ["Jonathan Taylor", "J. Taylor"], "pos": "RB", "team": "IND"}, {"name": "James Cook", "aliases": ["James Cook", "J. Cook"], "pos": "RB", "team": "BUF"}, {"name": "CeeDee Lamb", "aliases": ["C. Lamb", "CeeDee Lamb"], "pos": "WR", "team": "DAL"}, {"name": "Justin Jefferson", "aliases": ["J. Jefferson", "Justin Jefferson"], "pos": "WR", "team": "MIN"}, {"name": "Saquon Barkley", "aliases": ["Saquon Barkley", "S. Barkley"], "pos": "RB", "team": "PHI"}, {"name": "Kenneth Walker III", "aliases": ["K. Walker", "K. Walker III", "Kenneth Walker III", "Kenneth Walker"], "pos": "RB", "team": "KC"}, {"name": "Chase Brown", "aliases": ["C. Brown", "Chase Brown"], "pos": "RB", "team": "CIN"}, {"name": "Omarion Hampton", "aliases": ["O. Hampton", "Omarion Hampton"], "pos": "RB", "team": "LAC"}, {"name": "De'Von Achane", "aliases": ["D. Achane", "De'Von Achane", "DeVon Achane"], "pos": "RB", "team": "MIA"}, {"name": "Derrick Henry", "aliases": ["D. Henry", "Derrick Henry"], "pos": "RB", "team": "BAL"}, {"name": "Ashton Jeanty", "aliases": ["A. Jeanty", "Ashton Jeanty"], "pos": "RB", "team": "LV"}, {"name": "A.J. Brown", "aliases": ["A.J. Brown", "AJ Brown", "A. Brown"], "pos": "WR", "team": "NE"}, {"name": "Brock Bowers", "aliases": ["B. Bowers", "Brock Bowers"], "pos": "TE", "team": "LV"}, {"name": "Nico Collins", "aliases": ["Nico Collins", "N. Collins"], "pos": "WR", "team": "HOU"}, {"name": "Drake London", "aliases": ["D. London", "Drake London"], "pos": "WR", "team": "ATL"}, {"name": "Malik Nabers", "aliases": ["M. Nabers", "Malik Nabers"], "pos": "WR", "team": "NYG"}, {"name": "George Pickens", "aliases": ["George Pickens", "G. Pickens"], "pos": "WR", "team": "DAL"}, {"name": "Chris Olave", "aliases": ["Chris Olave", "C. Olave"], "pos": "WR", "team": "NO"}, {"name": "Rashee Rice", "aliases": ["Rashee Rice", "R. Rice"], "pos": "WR", "team": "KC"}, {"name": "DeVonta Smith", "aliases": ["D. Smith", "DeVonta Smith"], "pos": "WR", "team": "PHI"}, {"name": "Trey McBride", "aliases": ["Trey McBride", "T. McBride"], "pos": "TE", "team": "ARI"}, {"name": "Jeremiyah Love", "aliases": ["Jeremiyah Love", "J. Love"], "pos": "RB", "team": "ARI"}, {"name": "Kyren Williams", "aliases": ["Kyren Williams", "K. Williams"], "pos": "RB", "team": "LAR"}, {"name": "Zay Flowers", "aliases": ["Zay Flowers", "Z. Flowers"], "pos": "WR", "team": "BAL"}, {"name": "Breece Hall", "aliases": ["B. Hall", "Breece Hall"], "pos": "RB", "team": "NYJ"}, {"name": "Javonte Williams", "aliases": ["Javonte Williams", "J. Williams"], "pos": "RB", "team": "DAL"}, {"name": "Ladd McConkey", "aliases": ["Ladd McConkey", "L. McConkey"], "pos": "WR", "team": "LAC"}, {"name": "Tee Higgins", "aliases": ["T. Higgins", "Tee Higgins"], "pos": "WR", "team": "CIN"}, {"name": "Emeka Egbuka", "aliases": ["Emeka Egbuka", "E. Egbuka"], "pos": "WR", "team": "TB"}, {"name": "Josh Allen", "aliases": ["J. Allen", "Josh Allen"], "pos": "QB", "team": "BUF"}, {"name": "Jaylen Waddle", "aliases": ["Jaylen Waddle", "J. Waddle"], "pos": "WR", "team": "DEN"}, {"name": "Garrett Wilson", "aliases": ["G. Wilson", "Garrett Wilson"], "pos": "WR", "team": "NYJ"}, {"name": "Travis Etienne", "aliases": ["Travis Etienne", "T. Etienne"], "pos": "RB", "team": "NO"}, {"name": "Tetairoa McMillan", "aliases": ["Tetairoa McMillan", "T. McMillan"], "pos": "WR", "team": "CAR"}, {"name": "Josh Jacobs", "aliases": ["J. Jacobs", "Josh Jacobs"], "pos": "RB", "team": "GB"}, {"name": "Colston Loveland", "aliases": ["Colston Loveland", "C. Loveland"], "pos": "TE", "team": "CHI"}, {"name": "D'Andre Swift", "aliases": ["DAndre Swift", "D'Andre Swift", "D. Swift"], "pos": "RB", "team": "CHI"}, {"name": "Luther Burden III", "aliases": ["L. Burden", "Luther Burden III", "L. Burden III", "Luther Burden"], "pos": "WR", "team": "CHI"}, {"name": "Cam Skattebo", "aliases": ["C. Skattebo", "Cam Skattebo"], "pos": "RB", "team": "NYG"}, {"name": "David Montgomery", "aliases": ["David Montgomery", "D. Montgomery"], "pos": "RB", "team": "HOU"}, {"name": "Terry McLaurin", "aliases": ["T. McLaurin", "Terry McLaurin"], "pos": "WR", "team": "WAS"}, {"name": "Bhayshul Tuten", "aliases": ["Bhayshul Tuten", "B. Tuten"], "pos": "RB", "team": "JAX"}, {"name": "Jameson Williams", "aliases": ["J. Williams", "Jameson Williams"], "pos": "WR", "team": "DET"}, {"name": "Davante Adams", "aliases": ["Davante Adams", "D. Adams"], "pos": "WR", "team": "LAR"}, {"name": "Mike Evans", "aliases": ["Mike Evans", "M. Evans"], "pos": "WR", "team": "SF"}, {"name": "DJ Moore", "aliases": ["DJ Moore", "D. Moore"], "pos": "WR", "team": "BUF"}, {"name": "Bucky Irving", "aliases": ["B. Irving", "Bucky Irving"], "pos": "RB", "team": "TB"}, {"name": "Quinshon Judkins", "aliases": ["Q. Judkins", "Quinshon Judkins"], "pos": "RB", "team": "CLE"}, {"name": "Parker Washington", "aliases": ["P. Washington", "Parker Washington"], "pos": "WR", "team": "JAX"}, {"name": "Lamar Jackson", "aliases": ["L. Jackson", "Lamar Jackson"], "pos": "QB", "team": "BAL"}, {"name": "Christian Watson", "aliases": ["Christian Watson", "C. Watson"], "pos": "WR", "team": "GB"}, {"name": "Rome Odunze", "aliases": ["Rome Odunze", "R. Odunze"], "pos": "WR", "team": "CHI"}, {"name": "Jadarian Price", "aliases": ["J. Price", "Jadarian Price"], "pos": "RB", "team": "SEA"}, {"name": "TreVeyon Henderson", "aliases": ["T. Henderson", "TreVeyon Henderson"], "pos": "RB", "team": "NE"}, {"name": "Carnell Tate", "aliases": ["C. Tate", "Carnell Tate"], "pos": "WR", "team": "TEN"}, {"name": "Tyler Warren", "aliases": ["T. Warren", "Tyler Warren"], "pos": "TE", "team": "IND"}, {"name": "Brian Thomas Jr.", "aliases": ["B. Thomas", "Brian Thomas Jr", "B. Thomas Jr.", "Brian Thomas", "Brian Thomas Jr."], "pos": "WR", "team": "JAX"}, {"name": "Marvin Harrison Jr.", "aliases": ["M. Harrison Jr.", "Marvin Harrison", "Marvin Harrison Jr", "Marvin Harrison Jr.", "M. Harrison"], "pos": "WR", "team": "ARI"}, {"name": "Drake Maye", "aliases": ["Drake Maye", "D. Maye"], "pos": "QB", "team": "NE"}, {"name": "Rhamondre Stevenson", "aliases": ["R. Stevenson", "Rhamondre Stevenson"], "pos": "RB", "team": "NE"}, {"name": "Joe Burrow", "aliases": ["J. Burrow", "Joe Burrow"], "pos": "QB", "team": "CIN"}, {"name": "Jayden Daniels", "aliases": ["Jayden Daniels", "J. Daniels"], "pos": "QB", "team": "WAS"}, {"name": "Jaylen Warren", "aliases": ["J. Warren", "Jaylen Warren"], "pos": "RB", "team": "PIT"}, {"name": "Jalen Hurts", "aliases": ["J. Hurts", "Jalen Hurts"], "pos": "QB", "team": "PHI"}, {"name": "Caleb Williams", "aliases": ["C. Williams", "Caleb Williams"], "pos": "QB", "team": "CHI"}, {"name": "DK Metcalf", "aliases": ["D. Metcalf", "DK Metcalf"], "pos": "WR", "team": "PIT"}, {"name": "Quentin Johnston", "aliases": ["Q. Johnston", "Quentin Johnston"], "pos": "WR", "team": "LAC"}, {"name": "Jonathon Brooks", "aliases": ["Jonathon Brooks", "J. Brooks"], "pos": "RB", "team": "CAR"}, {"name": "Tucker Kraft", "aliases": ["Tucker Kraft", "T. Kraft"], "pos": "TE", "team": "GB"}, {"name": "Tony Pollard", "aliases": ["Tony Pollard", "T. Pollard"], "pos": "RB", "team": "TEN"}, {"name": "Jayden Reed", "aliases": ["Jayden Reed", "J. Reed"], "pos": "WR", "team": "GB"}, {"name": "Dak Prescott", "aliases": ["Dak Prescott", "D. Prescott"], "pos": "QB", "team": "DAL"}, {"name": "Makai Lemon", "aliases": ["M. Lemon", "Makai Lemon"], "pos": "WR", "team": "PHI"}, {"name": "Courtland Sutton", "aliases": ["Courtland Sutton", "C. Sutton"], "pos": "WR", "team": "DEN"}, {"name": "Josh Downs", "aliases": ["J. Downs", "Josh Downs"], "pos": "WR", "team": "IND"}, {"name": "Rico Dowdle", "aliases": ["R. Dowdle", "Rico Dowdle"], "pos": "RB", "team": "PIT"}, {"name": "Justin Herbert", "aliases": ["Justin Herbert", "J. Herbert"], "pos": "QB", "team": "LAC"}, {"name": "Chris Godwin Jr.", "aliases": ["Chris Godwin Jr", "C. Godwin", "Chris Godwin Jr.", "Chris Godwin", "C. Godwin Jr."], "pos": "WR", "team": "TB"}, {"name": "Trevor Lawrence", "aliases": ["T. Lawrence", "Trevor Lawrence"], "pos": "QB", "team": "JAX"}, {"name": "Blake Corum", "aliases": ["B. Corum", "Blake Corum"], "pos": "RB", "team": "LAR"}, {"name": "RJ Harvey", "aliases": ["RJ Harvey", "R. Harvey"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Addison", "aliases": ["J. Addison", "Jordan Addison"], "pos": "WR", "team": "MIN"}, {"name": "Michael Wilson", "aliases": ["M. Wilson", "Michael Wilson"], "pos": "WR", "team": "ARI"}, {"name": "Sam LaPorta", "aliases": ["S. LaPorta", "Sam LaPorta"], "pos": "TE", "team": "DET"}, {"name": "Stefon Diggs", "aliases": ["Stefon Diggs", "S. Diggs"], "pos": "WR", "team": "WAS"}, {"name": "Jordyn Tyson", "aliases": ["Jordyn Tyson", "J. Tyson"], "pos": "WR", "team": "NO"}, {"name": "Alec Pierce", "aliases": ["Alec Pierce", "A. Pierce"], "pos": "WR", "team": "IND"}, {"name": "J.K. Dobbins", "aliases": ["J.K. Dobbins", "J. Dobbins", "JK Dobbins"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Mason", "aliases": ["Jordan Mason", "J. Mason"], "pos": "RB", "team": "MIN"}, {"name": "Patrick Mahomes", "aliases": ["P. Mahomes", "Patrick Mahomes"], "pos": "QB", "team": "KC"}, {"name": "Chuba Hubbard", "aliases": ["C. Hubbard", "Chuba Hubbard"], "pos": "RB", "team": "CAR"}, {"name": "Jacory Croskey-Merritt", "aliases": ["Jacory Croskey-Merritt", "J. Croskey-Merritt"], "pos": "RB", "team": "WAS"}, {"name": "Matthew Golden", "aliases": ["M. Golden", "Matthew Golden"], "pos": "WR", "team": "GB"}, {"name": "Michael Pittman", "aliases": ["M. Pittman", "Michael Pittman"], "pos": "WR", "team": "PIT"}, {"name": "Kyle Pitts", "aliases": ["K. Pitts", "Kyle Pitts"], "pos": "TE", "team": "ATL"}, {"name": "Brock Purdy", "aliases": ["B. Purdy", "Brock Purdy"], "pos": "QB", "team": "SF"}, {"name": "Jaxson Dart", "aliases": ["Jaxson Dart", "J. Dart"], "pos": "QB", "team": "NYG"}, {"name": "Harold Fannin Jr.", "aliases": ["Harold Fannin Jr", "Harold Fannin Jr.", "H. Fannin", "H. Fannin Jr.", "Harold Fannin"], "pos": "TE", "team": "CLE"}, {"name": "Bo Nix", "aliases": ["B. Nix", "Bo Nix"], "pos": "QB", "team": "DEN"}, {"name": "Xavier Worthy", "aliases": ["X. Worthy", "Xavier Worthy"], "pos": "WR", "team": "KC"}, {"name": "Kyle Monangai", "aliases": ["Kyle Monangai", "K. Monangai"], "pos": "RB", "team": "CHI"}, {"name": "Kenny Gainwell", "aliases": ["K. Gainwell", "Kenny Gainwell"], "pos": "RB", "team": "TB"}, {"name": "De'Zhaun Stribling", "aliases": ["D. Stribling", "DeZhaun Stribling", "De'Zhaun Stribling"], "pos": "WR", "team": "SF"}, {"name": "Matthew Stafford", "aliases": ["Matthew Stafford", "M. Stafford"], "pos": "QB", "team": "LAR"}, {"name": "KC Concepcion", "aliases": ["K. Concepcion", "KC Concepcion"], "pos": "WR", "team": "CLE"}, {"name": "George Kittle", "aliases": ["G. Kittle", "George Kittle"], "pos": "TE", "team": "SF"}, {"name": "Jared Goff", "aliases": ["J. Goff", "Jared Goff"], "pos": "QB", "team": "DET"}, {"name": "Wan'Dale Robinson", "aliases": ["Wan'Dale Robinson", "W. Robinson", "WanDale Robinson"], "pos": "WR", "team": "TEN"}, {"name": "Kyler Murray", "aliases": ["Kyler Murray", "K. Murray"], "pos": "QB", "team": "MIN"}, {"name": "Jordan Love", "aliases": ["J. Love", "Jordan Love"], "pos": "QB", "team": "GB"}, {"name": "Romeo Doubs", "aliases": ["R. Doubs", "Romeo Doubs"], "pos": "WR", "team": "NE"}, {"name": "Rachaad White", "aliases": ["R. White", "Rachaad White"], "pos": "RB", "team": "WAS"}, {"name": "Dalton Kincaid", "aliases": ["D. Kincaid", "Dalton Kincaid"], "pos": "TE", "team": "BUF"}, {"name": "Jakobi Meyers", "aliases": ["J. Meyers", "Jakobi Meyers"], "pos": "WR", "team": "JAX"}, {"name": "Baker Mayfield", "aliases": ["Baker Mayfield", "B. Mayfield"], "pos": "QB", "team": "TB"}, {"name": "Travis Kelce", "aliases": ["Travis Kelce", "T. Kelce"], "pos": "TE", "team": "KC"}, {"name": "Chris Rodriguez Jr.", "aliases": ["Chris Rodriguez Jr", "C. Rodriguez", "Chris Rodriguez", "Chris Rodriguez Jr.", "C. Rodriguez Jr."], "pos": "RB", "team": "JAX"}, {"name": "Isaiah Likely", "aliases": ["I. Likely", "Isaiah Likely"], "pos": "TE", "team": "NYG"}, {"name": "Tyler Shough", "aliases": ["Tyler Shough", "T. Shough"], "pos": "QB", "team": "NO"}, {"name": "Deebo Samuel Sr.", "aliases": ["Deebo Samuel Sr", "Deebo Samuel", "D. Samuel Sr.", "Deebo Samuel Sr.", "D. Samuel"], "pos": "WR", "team": "SF"}, {"name": "Aaron Jones", "aliases": ["Aaron Jones", "A. Jones"], "pos": "RB", "team": "MIN"}, {"name": "Jalen Coker", "aliases": ["Jalen Coker", "J. Coker"], "pos": "WR", "team": "CAR"}, {"name": "Keaton Mitchell", "aliases": ["Keaton Mitchell", "K. Mitchell"], "pos": "RB", "team": "LAC"}, {"name": "Khalil Shakir", "aliases": ["K. Shakir", "Khalil Shakir"], "pos": "WR", "team": "BUF"}, {"name": "Dallas Goedert", "aliases": ["Dallas Goedert", "D. Goedert"], "pos": "TE", "team": "PHI"}, {"name": "Mark Andrews", "aliases": ["Mark Andrews", "M. Andrews"], "pos": "TE", "team": "BAL"}, {"name": "Malik Willis", "aliases": ["Malik Willis", "M. Willis"], "pos": "QB", "team": "MIA"}, {"name": "Rashid Shaheed", "aliases": ["R. Shaheed", "Rashid Shaheed"], "pos": "WR", "team": "SEA"}, {"name": "Jake Ferguson", "aliases": ["J. Ferguson", "Jake Ferguson"], "pos": "TE", "team": "DAL"}, {"name": "Woody Marks", "aliases": ["Woody Marks", "W. Marks"], "pos": "RB", "team": "HOU"}, {"name": "Tyler Allgeier", "aliases": ["T. Allgeier", "Tyler Allgeier"], "pos": "RB", "team": "ARI"}, {"name": "Denzel Boston", "aliases": ["D. Boston", "Denzel Boston"], "pos": "WR", "team": "CLE"}, {"name": "Juwan Johnson", "aliases": ["J. Johnson", "Juwan Johnson"], "pos": "TE", "team": "NO"}, {"name": "Sam Darnold", "aliases": ["S. Darnold", "Sam Darnold"], "pos": "QB", "team": "SEA"}, {"name": "Mike Washington Jr.", "aliases": ["M. Washington Jr.", "Mike Washington", "Mike Washington Jr.", "Mike Washington Jr", "M. Washington"], "pos": "RB", "team": "LV"}, {"name": "Jonah Coleman", "aliases": ["J. Coleman", "Jonah Coleman"], "pos": "RB", "team": "DEN"}, {"name": "Daniel Jones", "aliases": ["Daniel Jones", "D. Jones"], "pos": "QB", "team": "IND"}, {"name": "C.J. Stroud", "aliases": ["C.J. Stroud", "CJ Stroud", "C. Stroud"], "pos": "QB", "team": "HOU"}, {"name": "Chig Okonkwo", "aliases": ["Chig Okonkwo", "C. Okonkwo"], "pos": "TE", "team": "WAS"}, {"name": "MarShawn Lloyd", "aliases": ["MarShawn Lloyd", "M. Lloyd"], "pos": "RB", "team": "GB"}, {"name": "Brenton Strange", "aliases": ["Brenton Strange", "B. Strange"], "pos": "TE", "team": "JAX"}, {"name": "Jalen Nailor", "aliases": ["J. Nailor", "Jalen Nailor"], "pos": "WR", "team": "LV"}, {"name": "Tre Tucker", "aliases": ["Tre Tucker", "T. Tucker"], "pos": "WR", "team": "LV"}, {"name": "Ja'Kobi Lane", "aliases": ["JaKobi Lane", "Ja'Kobi Lane", "J. Lane"], "pos": "WR", "team": "BAL"}, {"name": "Tank Bigsby", "aliases": ["T. Bigsby", "Tank Bigsby"], "pos": "RB", "team": "PHI"}, {"name": "Tyrone Tracy Jr.", "aliases": ["Tyrone Tracy Jr", "Tyrone Tracy", "T. Tracy", "T. Tracy Jr.", "Tyrone Tracy Jr."], "pos": "RB", "team": "NYG"}, {"name": "Hunter Henry", "aliases": ["Hunter Henry", "H. Henry"], "pos": "TE", "team": "NE"}, {"name": "Keenan Allen", "aliases": ["Keenan Allen", "K. Allen"], "pos": "WR", "team": "IND"}, {"name": "Tyjae Spears", "aliases": ["Tyjae Spears", "T. Spears"], "pos": "RB", "team": "TEN"}, {"name": "Jalen McMillan", "aliases": ["J. McMillan", "Jalen McMillan"], "pos": "WR", "team": "TB"}, {"name": "Cam Ward", "aliases": ["C. Ward", "Cam Ward"], "pos": "QB", "team": "TEN"}, {"name": "Terrance Ferguson", "aliases": ["T. Ferguson", "Terrance Ferguson"], "pos": "TE", "team": "LAR"}, {"name": "Travis Hunter", "aliases": ["T. Hunter", "Travis Hunter"], "pos": "WR", "team": "JAX"}, {"name": "Dontayvion Wicks", "aliases": ["Dontayvion Wicks", "D. Wicks"], "pos": "WR", "team": "PHI"}, {"name": "Tre Harris", "aliases": ["Tre Harris", "T. Harris"], "pos": "WR", "team": "LAC"}, {"name": "Dalton Schultz", "aliases": ["Dalton Schultz", "D. Schultz"], "pos": "TE", "team": "HOU"}, {"name": "Zach Charbonnet", "aliases": ["Z. Charbonnet", "Zach Charbonnet"], "pos": "RB", "team": "SEA"}, {"name": "Cyrus Allen", "aliases": ["Cyrus Allen", "C. Allen"], "pos": "WR", "team": "KC"}, {"name": "Bryce Young", "aliases": ["B. Young", "Bryce Young"], "pos": "QB", "team": "CAR"}, {"name": "T.J. Hockenson", "aliases": ["TJ Hockenson", "T.J. Hockenson", "T. Hockenson"], "pos": "TE", "team": "MIN"}, {"name": "Ryan Flournoy", "aliases": ["R. Flournoy", "Ryan Flournoy"], "pos": "WR", "team": "DAL"}, {"name": "Adonai Mitchell", "aliases": ["Adonai Mitchell", "A. Mitchell"], "pos": "WR", "team": "NYJ"}, {"name": "Omar Cooper Jr.", "aliases": ["Omar Cooper", "O. Cooper", "O. Cooper Jr.", "Omar Cooper Jr", "Omar Cooper Jr."], "pos": "WR", "team": "NYJ"}, {"name": "Dylan Sampson", "aliases": ["Dylan Sampson", "D. Sampson"], "pos": "RB", "team": "CLE"}, {"name": "Pat Bryant", "aliases": ["P. Bryant", "Pat Bryant"], "pos": "WR", "team": "DEN"}, {"name": "Jauan Jennings", "aliases": ["J. Jennings", "Jauan Jennings"], "pos": "WR", "team": "MIN"}, {"name": "Malik Washington", "aliases": ["Malik Washington", "M. Washington"], "pos": "WR", "team": "MIA"}, {"name": "AJ Barner", "aliases": ["AJ Barner", "A. Barner"], "pos": "TE", "team": "SEA"}, {"name": "Caleb Douglas", "aliases": ["C. Douglas", "Caleb Douglas"], "pos": "WR", "team": "MIA"}, {"name": "Jaydon Blue", "aliases": ["Jaydon Blue", "J. Blue"], "pos": "RB", "team": "DAL"}, {"name": "Kenyon Sadiq", "aliases": ["K. Sadiq", "Kenyon Sadiq"], "pos": "TE", "team": "NYJ"}, {"name": "Tank Dell", "aliases": ["T. Dell", "Tank Dell"], "pos": "WR", "team": "HOU"}, {"name": "Aaron Rodgers", "aliases": ["A. Rodgers", "Aaron Rodgers"], "pos": "QB", "team": "PIT"}, {"name": "Kayshon Boutte", "aliases": ["K. Boutte", "Kayshon Boutte"], "pos": "WR", "team": "HOU"}, {"name": "Brian Robinson", "aliases": ["B. Robinson", "Brian Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Alvin Kamara", "aliases": ["Alvin Kamara", "A. Kamara"], "pos": "RB", "team": "NO"}, {"name": "Braelon Allen", "aliases": ["Braelon Allen", "B. Allen"], "pos": "RB", "team": "NYJ"}, {"name": "Devaughn Vele", "aliases": ["Devaughn Vele", "D. Vele"], "pos": "WR", "team": "NO"}, {"name": "Ray Davis", "aliases": ["Ray Davis", "R. Davis"], "pos": "RB", "team": "BUF"}, {"name": "Isiah Pacheco", "aliases": ["I. Pacheco", "Isiah Pacheco"], "pos": "RB", "team": "DET"}, {"name": "Fernando Mendoza", "aliases": ["Fernando Mendoza", "F. Mendoza"], "pos": "QB", "team": "LV"}, {"name": "Greg Dulcich", "aliases": ["Greg Dulcich", "G. Dulcich"], "pos": "TE", "team": "MIA"}, {"name": "Oronde Gadsden II", "aliases": ["O. Gadsden II", "O. Gadsden", "Oronde Gadsden II", "Oronde Gadsden"], "pos": "TE", "team": "LAC"}, {"name": "Emmett Johnson", "aliases": ["Emmett Johnson", "E. Johnson"], "pos": "RB", "team": "KC"}, {"name": "Geno Smith", "aliases": ["G. Smith", "Geno Smith"], "pos": "QB", "team": "NYJ"}, {"name": "Kaelon Black", "aliases": ["K. Black", "Kaelon Black"], "pos": "RB", "team": "SF"}, {"name": "Malachi Fields", "aliases": ["Malachi Fields", "M. Fields"], "pos": "WR", "team": "NYG"}, {"name": "Cade Otton", "aliases": ["C. Otton", "Cade Otton"], "pos": "TE", "team": "TB"}, {"name": "Zachariah Branch", "aliases": ["Zachariah Branch", "Z. Branch"], "pos": "WR", "team": "ATL"}, {"name": "Gunnar Helm", "aliases": ["Gunnar Helm", "G. Helm"], "pos": "TE", "team": "TEN"}, {"name": "Pat Freiermuth", "aliases": ["Pat Freiermuth", "P. Freiermuth"], "pos": "TE", "team": "PIT"}, {"name": "Jacoby Brissett", "aliases": ["J. Brissett", "Jacoby Brissett"], "pos": "QB", "team": "ARI"}, {"name": "Jaylin Noel", "aliases": ["J. Noel", "Jaylin Noel"], "pos": "WR", "team": "HOU"}, {"name": "Ted Hurst III", "aliases": ["T. Hurst", "T. Hurst III", "Ted Hurst", "Ted Hurst III"], "pos": "WR", "team": "TB"}, {"name": "Isaac TeSlaa", "aliases": ["I. TeSlaa", "Isaac TeSlaa"], "pos": "WR", "team": "DET"}, {"name": "Chris Bell", "aliases": ["Chris Bell", "C. Bell"], "pos": "WR", "team": "MIA"}, {"name": "Jerry Jeudy", "aliases": ["Jerry Jeudy", "J. Jeudy"], "pos": "WR", "team": "CLE"}, {"name": "Calvin Ridley", "aliases": ["C. Ridley", "Calvin Ridley"], "pos": "WR", "team": "TEN"}, {"name": "Najee Harris", "aliases": ["N. Harris", "Najee Harris"], "pos": "RB", "team": "NYG"}, {"name": "Germie Bernard", "aliases": ["Germie Bernard", "G. Bernard"], "pos": "WR", "team": "PIT"}, {"name": "Sean Tucker", "aliases": ["Sean Tucker", "S. Tucker"], "pos": "RB", "team": "TB"}, {"name": "David Njoku", "aliases": ["D. Njoku", "David Njoku"], "pos": "TE", "team": "LAC"}, {"name": "Kimani Vidal", "aliases": ["K. Vidal", "Kimani Vidal"], "pos": "RB", "team": "LAC"}, {"name": "Charlie Kolar", "aliases": ["Charlie Kolar", "C. Kolar"], "pos": "TE", "team": "LAC"}, {"name": "Rashod Bateman", "aliases": ["Rashod Bateman", "R. Bateman"], "pos": "WR", "team": "BAL"}, {"name": "Cooper Kupp", "aliases": ["C. Kupp", "Cooper Kupp"], "pos": "WR", "team": "SEA"}, {"name": "Colby Parkinson", "aliases": ["Colby Parkinson", "C. Parkinson"], "pos": "TE", "team": "LAR"}, {"name": "Kaytron Allen", "aliases": ["Kaytron Allen", "K. Allen"], "pos": "RB", "team": "WAS"}, {"name": "Michael Penix Jr.", "aliases": ["M. Penix Jr.", "Michael Penix", "Michael Penix Jr.", "M. Penix", "Michael Penix Jr"], "pos": "QB", "team": "ATL"}, {"name": "Evan Engram", "aliases": ["Evan Engram", "E. Engram"], "pos": "TE", "team": "DEN"}, {"name": "Justice Hill", "aliases": ["Justice Hill", "J. Hill"], "pos": "RB", "team": "BAL"}, {"name": "Samaje Perine", "aliases": ["Samaje Perine", "S. Perine"], "pos": "RB", "team": "CIN"}, {"name": "Tua Tagovailoa", "aliases": ["Tua Tagovailoa", "T. Tagovailoa"], "pos": "QB", "team": "ATL"}, {"name": "George Holani", "aliases": ["George Holani", "G. Holani"], "pos": "RB", "team": "SEA"}, {"name": "Michael Mayer", "aliases": ["M. Mayer", "Michael Mayer"], "pos": "TE", "team": "LV"}, {"name": "Mike Gesicki", "aliases": ["M. Gesicki", "Mike Gesicki"], "pos": "TE", "team": "CIN"}, {"name": "Jordan James", "aliases": ["Jordan James", "J. James"], "pos": "RB", "team": "SF"}, {"name": "Antonio Williams", "aliases": ["A. Williams", "Antonio Williams"], "pos": "WR", "team": "WAS"}, {"name": "Tyquan Thornton", "aliases": ["Tyquan Thornton", "T. Thornton"], "pos": "WR", "team": "KC"}, {"name": "Deshaun Watson", "aliases": ["Deshaun Watson", "D. Watson"], "pos": "QB", "team": "CLE"}, {"name": "Andrei Iosivas", "aliases": ["Andrei Iosivas", "A. Iosivas"], "pos": "WR", "team": "CIN"}, {"name": "Troy Franklin", "aliases": ["Troy Franklin", "T. Franklin"], "pos": "WR", "team": "DEN"}, {"name": "Darnell Mooney", "aliases": ["D. Mooney", "Darnell Mooney"], "pos": "WR", "team": "NYG"}, {"name": "Jack Bech", "aliases": ["J. Bech", "Jack Bech"], "pos": "WR", "team": "LV"}, {"name": "Demond Claiborne", "aliases": ["D. Claiborne", "Demond Claiborne"], "pos": "RB", "team": "MIN"}, {"name": "James Conner", "aliases": ["James Conner", "J. Conner"], "pos": "RB", "team": "ARI"}, {"name": "Bryce Lance", "aliases": ["B. Lance", "Bryce Lance"], "pos": "WR", "team": "NO"}, {"name": "Kirk Cousins", "aliases": ["Kirk Cousins", "K. Cousins"], "pos": "QB", "team": "LV"}, {"name": "Darius Slayton", "aliases": ["Darius Slayton", "D. Slayton"], "pos": "WR", "team": "NYG"}, {"name": "Zavion Thomas", "aliases": ["Z. Thomas", "Zavion Thomas"], "pos": "WR", "team": "CHI"}, {"name": "Colbie Young", "aliases": ["C. Young", "Colbie Young"], "pos": "WR", "team": "CIN"}, {"name": "Jahan Dotson", "aliases": ["J. Dotson", "Jahan Dotson"], "pos": "WR", "team": "ATL"}, {"name": "Emanuel Wilson", "aliases": ["E. Wilson", "Emanuel Wilson"], "pos": "RB", "team": "SEA"}, {"name": "Malik Benson", "aliases": ["M. Benson", "Malik Benson"], "pos": "WR", "team": "LV"}, {"name": "Ty Johnson", "aliases": ["Ty Johnson", "T. Johnson"], "pos": "RB", "team": "BUF"}, {"name": "Chris Brooks", "aliases": ["C. Brooks", "Chris Brooks"], "pos": "RB", "team": "GB"}];
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
    syncStatusEl.title = 'Click to inspect detected picks';
    
    syncStatusEl.addEventListener('click', () => {
      const picks = parseDraftPicks();
      const username = getLoggedInUsername();
      console.log('[FantasyPoints Relay] Username detected:', username);
      console.log('[FantasyPoints Relay] Current Detected Picks (' + picks.length + '):', picks);
      if (picks.length > 0) console.table(picks);
    });

    document.body.appendChild(syncStatusEl);
  }

  function getDraftId() {
    const match = window.location.pathname.match(/\/drafts?\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : 'underdog-draft';
  }

  function normalize(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function getLoggedInUsername() {
    try {
      const userNav = document.querySelector('[data-testid*="user"], [class*="UserMenu"], [class*="user-menu"], [class*="Header_username"], [class*="ProfileButton"], [aria-label*="Account"], [aria-label*="Profile"]');
      if (userNav) {
        const text = (userNav.innerText || userNav.getAttribute('aria-label') || '').trim();
        if (text && text.length > 1 && !text.includes('Sign') && !text.includes('Log')) {
          return text.replace(/Account/i, '').replace(/Profile/i, '').trim().toLowerCase();
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('user') || k.includes('auth') || k.includes('session') || k.includes('profile'))) {
          try {
            const val = JSON.parse(localStorage.getItem(k));
            if (val && val.username) return val.username.toLowerCase();
            if (val && val.user && val.user.username) return val.user.username.toLowerCase();
            if (val && val.handle) return val.handle.toLowerCase();
          } catch(e) {}
        }
      }
    } catch(e) {}
    return null;
  }

  function isInsideAvailableQueue(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const cls = (typeof cur.className === 'string' ? cur.className : '').toLowerCase();
      const id = (cur.id || '').toLowerCase();
      const testId = (cur.getAttribute && cur.getAttribute('data-testid') || '').toLowerCase();
      
      if (
        cls.includes('playerlist') || cls.includes('player-list') || cls.includes('available-player') ||
        testId.includes('player-list') || testId.includes('available-players') || testId.includes('draft-queue') ||
        id.includes('player-list') || id.includes('draft-queue')
      ) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  function isUserElement(el, username) {
    if (!el) return false;
    let cur = el;
    let depth = 0;
    while (cur && cur !== document.body && depth < 8) {
      const text = (cur.innerText || cur.textContent || '');
      const cls = (typeof cur.className === 'string' ? cur.className : '').toLowerCase();
      const testId = (cur.getAttribute && cur.getAttribute('data-testid') || '').toLowerCase();
      const aria = (cur.getAttribute && cur.getAttribute('aria-label') || '').toLowerCase();

      if (
        text.includes('(You)') || text.includes('(YOU)') ||
        cls.includes('user-pick') || cls.includes('mypick') || cls.includes('is-user') ||
        cls.includes('isuser') || cls.includes('my-team') ||
        testId.includes('my-pick') || testId.includes('user-pick') ||
        aria.includes('my team')
      ) {
        return true;
      }

      if (username && username.length > 2) {
        if (text.toLowerCase().includes(username) || cls.includes(username)) {
          return true;
        }
      }

      cur = cur.parentElement;
      depth++;
    }
    return false;
  }

  function parseDraftPicks() {
    try {
      const picks = [];
      const seenKeys = new Set();
      const username = getLoggedInUsername();
      
      // Target board cells, completed pick rows, and pick cards across the entire room
      const allElements = document.querySelectorAll('*');

      allElements.forEach(el => {
        if (isInsideAvailableQueue(el)) return;
        if (el.children.length > 8) return;

        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 200) return;

        const normText = normalize(text);

        for (let i = 0; i < KNOWN_PLAYERS.length; i++) {
          const kp = KNOWN_PLAYERS[i];
          const matched = kp.aliases.some(alias => {
            const normAlias = normalize(alias);
            return normText.includes(normAlias);
          });

          if (matched) {
            const key = normalize(kp.name);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              
              const isUser = isUserElement(el, username);

              picks.push({
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: Boolean(isUser)
              });
            }
            break;
          }
        }
      });

      return picks;
    } catch (err) {
      console.warn('[FantasyPoints Relay] parse error:', err);
      return [];
    }
  }

  function sendPicks(picks, draftId) {
    const payload = {
      type: 'UNDERDOG_PICKS_SYNC',
      draft_id: draftId,
      picks: picks,
      timestamp: Date.now()
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(payload);
      } catch(e) {}
    }

    try {
      const channel = new BroadcastChannel('underdog-sync');
      channel.postMessage(payload);
    } catch(e) {}

    window.postMessage(payload, '*');
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
          const userPicksCount = picks.filter(p => p.is_user).length;
          syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks' + (userPicksCount > 0 ? ', ' + userPicksCount + ' mine' : '') + ')</span>';
          syncStatusEl.style.borderColor = '#10b981';
        } else {
          syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Relay Ready</span>';
          syncStatusEl.style.borderColor = '#f59e0b';
        }
      }

      if (picks.length !== lastPicksCount && picks.length > 0) {
        lastPicksCount = picks.length;
        console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks to Companion...', picks);
        sendPicks(picks, draftId);
      }
    } catch (err) {
      console.warn('[FantasyPoints Relay] tick error:', err);
    }
  }

  setInterval(tick, 800);
  setTimeout(tick, 500);

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'REQUEST_UNDERDOG_SYNC') {
        lastPicksCount = -1;
        tick();
      }
    });
  }
})();
