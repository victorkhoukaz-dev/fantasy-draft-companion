// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = [{"name": "Jahmyr Gibbs", "aliases": ["J. Gibbs", "Jahmyr Gibbs"], "pos": "RB", "team": "DET"}, {"name": "Bijan Robinson", "aliases": ["Bijan Robinson", "B. Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Ja'Marr Chase", "aliases": ["Ja'Marr Chase", "JaMarr Chase", "J. Chase"], "pos": "WR", "team": "CIN"}, {"name": "Puka Nacua", "aliases": ["P. Nacua", "Puka Nacua"], "pos": "WR", "team": "LAR"}, {"name": "Jaxon Smith-Njigba", "aliases": ["Jaxon Smith-Njigba", "J. Smith-Njigba"], "pos": "WR", "team": "SEA"}, {"name": "Christian McCaffrey", "aliases": ["C. McCaffrey", "Christian McCaffrey"], "pos": "RB", "team": "SF"}, {"name": "Amon-Ra St. Brown", "aliases": ["A. St. Brown", "Amon-Ra St Brown", "Amon-Ra St. Brown"], "pos": "WR", "team": "DET"}, {"name": "Jonathan Taylor", "aliases": ["Jonathan Taylor", "J. Taylor"], "pos": "RB", "team": "IND"}, {"name": "James Cook", "aliases": ["James Cook", "J. Cook"], "pos": "RB", "team": "BUF"}, {"name": "CeeDee Lamb", "aliases": ["CeeDee Lamb", "C. Lamb"], "pos": "WR", "team": "DAL"}, {"name": "Justin Jefferson", "aliases": ["Justin Jefferson", "J. Jefferson"], "pos": "WR", "team": "MIN"}, {"name": "Saquon Barkley", "aliases": ["Saquon Barkley", "S. Barkley"], "pos": "RB", "team": "PHI"}, {"name": "Kenneth Walker III", "aliases": ["K. Walker III", "Kenneth Walker", "Kenneth Walker III"], "pos": "RB", "team": "KC"}, {"name": "Chase Brown", "aliases": ["C. Brown", "Chase Brown"], "pos": "RB", "team": "CIN"}, {"name": "Omarion Hampton", "aliases": ["O. Hampton", "Omarion Hampton"], "pos": "RB", "team": "LAC"}, {"name": "De'Von Achane", "aliases": ["D. Achane", "DeVon Achane", "De'Von Achane"], "pos": "RB", "team": "MIA"}, {"name": "Derrick Henry", "aliases": ["D. Henry", "Derrick Henry"], "pos": "RB", "team": "BAL"}, {"name": "Ashton Jeanty", "aliases": ["A. Jeanty", "Ashton Jeanty"], "pos": "RB", "team": "LV"}, {"name": "A.J. Brown", "aliases": ["AJ Brown", "A. Brown", "A.J. Brown"], "pos": "WR", "team": "NE"}, {"name": "Brock Bowers", "aliases": ["B. Bowers", "Brock Bowers"], "pos": "TE", "team": "LV"}, {"name": "Nico Collins", "aliases": ["Nico Collins", "N. Collins"], "pos": "WR", "team": "HOU"}, {"name": "Drake London", "aliases": ["D. London", "Drake London"], "pos": "WR", "team": "ATL"}, {"name": "Malik Nabers", "aliases": ["Malik Nabers", "M. Nabers"], "pos": "WR", "team": "NYG"}, {"name": "George Pickens", "aliases": ["G. Pickens", "George Pickens"], "pos": "WR", "team": "DAL"}, {"name": "Chris Olave", "aliases": ["C. Olave", "Chris Olave"], "pos": "WR", "team": "NO"}, {"name": "Rashee Rice", "aliases": ["R. Rice", "Rashee Rice"], "pos": "WR", "team": "KC"}, {"name": "DeVonta Smith", "aliases": ["DeVonta Smith", "D. Smith"], "pos": "WR", "team": "PHI"}, {"name": "Trey McBride", "aliases": ["T. McBride", "Trey McBride"], "pos": "TE", "team": "ARI"}, {"name": "Jeremiyah Love", "aliases": ["Jeremiyah Love", "J. Love"], "pos": "RB", "team": "ARI"}, {"name": "Kyren Williams", "aliases": ["K. Williams", "Kyren Williams"], "pos": "RB", "team": "LAR"}, {"name": "Zay Flowers", "aliases": ["Z. Flowers", "Zay Flowers"], "pos": "WR", "team": "BAL"}, {"name": "Breece Hall", "aliases": ["Breece Hall", "B. Hall"], "pos": "RB", "team": "NYJ"}, {"name": "Javonte Williams", "aliases": ["J. Williams", "Javonte Williams"], "pos": "RB", "team": "DAL"}, {"name": "Ladd McConkey", "aliases": ["L. McConkey", "Ladd McConkey"], "pos": "WR", "team": "LAC"}, {"name": "Tee Higgins", "aliases": ["T. Higgins", "Tee Higgins"], "pos": "WR", "team": "CIN"}, {"name": "Emeka Egbuka", "aliases": ["E. Egbuka", "Emeka Egbuka"], "pos": "WR", "team": "TB"}, {"name": "Josh Allen", "aliases": ["Josh Allen", "J. Allen"], "pos": "QB", "team": "BUF"}, {"name": "Jaylen Waddle", "aliases": ["J. Waddle", "Jaylen Waddle"], "pos": "WR", "team": "DEN"}, {"name": "Garrett Wilson", "aliases": ["Garrett Wilson", "G. Wilson"], "pos": "WR", "team": "NYJ"}, {"name": "Travis Etienne", "aliases": ["Travis Etienne", "T. Etienne"], "pos": "RB", "team": "NO"}, {"name": "Tetairoa McMillan", "aliases": ["T. McMillan", "Tetairoa McMillan"], "pos": "WR", "team": "CAR"}, {"name": "Josh Jacobs", "aliases": ["J. Jacobs", "Josh Jacobs"], "pos": "RB", "team": "GB"}, {"name": "Colston Loveland", "aliases": ["Colston Loveland", "C. Loveland"], "pos": "TE", "team": "CHI"}, {"name": "D'Andre Swift", "aliases": ["D. Swift", "DAndre Swift", "D'Andre Swift"], "pos": "RB", "team": "CHI"}, {"name": "Luther Burden III", "aliases": ["L. Burden III", "Luther Burden III", "Luther Burden"], "pos": "WR", "team": "CHI"}, {"name": "Cam Skattebo", "aliases": ["Cam Skattebo", "C. Skattebo"], "pos": "RB", "team": "NYG"}, {"name": "David Montgomery", "aliases": ["D. Montgomery", "David Montgomery"], "pos": "RB", "team": "HOU"}, {"name": "Terry McLaurin", "aliases": ["T. McLaurin", "Terry McLaurin"], "pos": "WR", "team": "WAS"}, {"name": "Bhayshul Tuten", "aliases": ["B. Tuten", "Bhayshul Tuten"], "pos": "RB", "team": "JAX"}, {"name": "Jameson Williams", "aliases": ["J. Williams", "Jameson Williams"], "pos": "WR", "team": "DET"}, {"name": "Davante Adams", "aliases": ["Davante Adams", "D. Adams"], "pos": "WR", "team": "LAR"}, {"name": "Mike Evans", "aliases": ["Mike Evans", "M. Evans"], "pos": "WR", "team": "SF"}, {"name": "DJ Moore", "aliases": ["DJ Moore", "D. Moore"], "pos": "WR", "team": "BUF"}, {"name": "Bucky Irving", "aliases": ["B. Irving", "Bucky Irving"], "pos": "RB", "team": "TB"}, {"name": "Quinshon Judkins", "aliases": ["Quinshon Judkins", "Q. Judkins"], "pos": "RB", "team": "CLE"}, {"name": "Parker Washington", "aliases": ["P. Washington", "Parker Washington"], "pos": "WR", "team": "JAX"}, {"name": "Lamar Jackson", "aliases": ["L. Jackson", "Lamar Jackson"], "pos": "QB", "team": "BAL"}, {"name": "Christian Watson", "aliases": ["C. Watson", "Christian Watson"], "pos": "WR", "team": "GB"}, {"name": "Rome Odunze", "aliases": ["R. Odunze", "Rome Odunze"], "pos": "WR", "team": "CHI"}, {"name": "Jadarian Price", "aliases": ["J. Price", "Jadarian Price"], "pos": "RB", "team": "SEA"}, {"name": "TreVeyon Henderson", "aliases": ["T. Henderson", "TreVeyon Henderson"], "pos": "RB", "team": "NE"}, {"name": "Carnell Tate", "aliases": ["C. Tate", "Carnell Tate"], "pos": "WR", "team": "TEN"}, {"name": "Tyler Warren", "aliases": ["Tyler Warren", "T. Warren"], "pos": "TE", "team": "IND"}, {"name": "Brian Thomas Jr.", "aliases": ["Brian Thomas Jr", "B. Thomas Jr.", "Brian Thomas Jr.", "Brian Thomas"], "pos": "WR", "team": "JAX"}, {"name": "Marvin Harrison Jr.", "aliases": ["M. Harrison Jr.", "Marvin Harrison", "Marvin Harrison Jr.", "Marvin Harrison Jr"], "pos": "WR", "team": "ARI"}, {"name": "Drake Maye", "aliases": ["D. Maye", "Drake Maye"], "pos": "QB", "team": "NE"}, {"name": "Rhamondre Stevenson", "aliases": ["R. Stevenson", "Rhamondre Stevenson"], "pos": "RB", "team": "NE"}, {"name": "Joe Burrow", "aliases": ["J. Burrow", "Joe Burrow"], "pos": "QB", "team": "CIN"}, {"name": "Jayden Daniels", "aliases": ["J. Daniels", "Jayden Daniels"], "pos": "QB", "team": "WAS"}, {"name": "Jaylen Warren", "aliases": ["J. Warren", "Jaylen Warren"], "pos": "RB", "team": "PIT"}, {"name": "Jalen Hurts", "aliases": ["J. Hurts", "Jalen Hurts"], "pos": "QB", "team": "PHI"}, {"name": "Caleb Williams", "aliases": ["Caleb Williams", "C. Williams"], "pos": "QB", "team": "CHI"}, {"name": "DK Metcalf", "aliases": ["D. Metcalf", "DK Metcalf"], "pos": "WR", "team": "PIT"}, {"name": "Quentin Johnston", "aliases": ["Q. Johnston", "Quentin Johnston"], "pos": "WR", "team": "LAC"}, {"name": "Jonathon Brooks", "aliases": ["J. Brooks", "Jonathon Brooks"], "pos": "RB", "team": "CAR"}, {"name": "Tucker Kraft", "aliases": ["Tucker Kraft", "T. Kraft"], "pos": "TE", "team": "GB"}, {"name": "Tony Pollard", "aliases": ["T. Pollard", "Tony Pollard"], "pos": "RB", "team": "TEN"}, {"name": "Jayden Reed", "aliases": ["J. Reed", "Jayden Reed"], "pos": "WR", "team": "GB"}, {"name": "Dak Prescott", "aliases": ["Dak Prescott", "D. Prescott"], "pos": "QB", "team": "DAL"}, {"name": "Makai Lemon", "aliases": ["Makai Lemon", "M. Lemon"], "pos": "WR", "team": "PHI"}, {"name": "Courtland Sutton", "aliases": ["Courtland Sutton", "C. Sutton"], "pos": "WR", "team": "DEN"}, {"name": "Josh Downs", "aliases": ["Josh Downs", "J. Downs"], "pos": "WR", "team": "IND"}, {"name": "Rico Dowdle", "aliases": ["Rico Dowdle", "R. Dowdle"], "pos": "RB", "team": "PIT"}, {"name": "Justin Herbert", "aliases": ["J. Herbert", "Justin Herbert"], "pos": "QB", "team": "LAC"}, {"name": "Chris Godwin Jr.", "aliases": ["Chris Godwin", "Chris Godwin Jr.", "Chris Godwin Jr", "C. Godwin Jr."], "pos": "WR", "team": "TB"}, {"name": "Trevor Lawrence", "aliases": ["T. Lawrence", "Trevor Lawrence"], "pos": "QB", "team": "JAX"}, {"name": "Blake Corum", "aliases": ["Blake Corum", "B. Corum"], "pos": "RB", "team": "LAR"}, {"name": "RJ Harvey", "aliases": ["RJ Harvey", "R. Harvey"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Addison", "aliases": ["J. Addison", "Jordan Addison"], "pos": "WR", "team": "MIN"}, {"name": "Michael Wilson", "aliases": ["Michael Wilson", "M. Wilson"], "pos": "WR", "team": "ARI"}, {"name": "Sam LaPorta", "aliases": ["S. LaPorta", "Sam LaPorta"], "pos": "TE", "team": "DET"}, {"name": "Stefon Diggs", "aliases": ["Stefon Diggs", "S. Diggs"], "pos": "WR", "team": "WAS"}, {"name": "Jordyn Tyson", "aliases": ["Jordyn Tyson", "J. Tyson"], "pos": "WR", "team": "NO"}, {"name": "Alec Pierce", "aliases": ["Alec Pierce", "A. Pierce"], "pos": "WR", "team": "IND"}, {"name": "J.K. Dobbins", "aliases": ["J. Dobbins", "JK Dobbins", "J.K. Dobbins"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Mason", "aliases": ["J. Mason", "Jordan Mason"], "pos": "RB", "team": "MIN"}, {"name": "Patrick Mahomes", "aliases": ["P. Mahomes", "Patrick Mahomes"], "pos": "QB", "team": "KC"}, {"name": "Chuba Hubbard", "aliases": ["C. Hubbard", "Chuba Hubbard"], "pos": "RB", "team": "CAR"}, {"name": "Jacory Croskey-Merritt", "aliases": ["J. Croskey-Merritt", "Jacory Croskey-Merritt"], "pos": "RB", "team": "WAS"}, {"name": "Matthew Golden", "aliases": ["M. Golden", "Matthew Golden"], "pos": "WR", "team": "GB"}, {"name": "Michael Pittman", "aliases": ["M. Pittman", "Michael Pittman"], "pos": "WR", "team": "PIT"}, {"name": "Kyle Pitts", "aliases": ["K. Pitts", "Kyle Pitts"], "pos": "TE", "team": "ATL"}, {"name": "Brock Purdy", "aliases": ["B. Purdy", "Brock Purdy"], "pos": "QB", "team": "SF"}, {"name": "Jaxson Dart", "aliases": ["J. Dart", "Jaxson Dart"], "pos": "QB", "team": "NYG"}, {"name": "Harold Fannin Jr.", "aliases": ["Harold Fannin", "Harold Fannin Jr", "H. Fannin Jr.", "Harold Fannin Jr."], "pos": "TE", "team": "CLE"}, {"name": "Bo Nix", "aliases": ["B. Nix", "Bo Nix"], "pos": "QB", "team": "DEN"}, {"name": "Xavier Worthy", "aliases": ["X. Worthy", "Xavier Worthy"], "pos": "WR", "team": "KC"}, {"name": "Kyle Monangai", "aliases": ["Kyle Monangai", "K. Monangai"], "pos": "RB", "team": "CHI"}, {"name": "Kenny Gainwell", "aliases": ["Kenny Gainwell", "K. Gainwell"], "pos": "RB", "team": "TB"}, {"name": "De'Zhaun Stribling", "aliases": ["DeZhaun Stribling", "D. Stribling", "De'Zhaun Stribling"], "pos": "WR", "team": "SF"}, {"name": "Matthew Stafford", "aliases": ["Matthew Stafford", "M. Stafford"], "pos": "QB", "team": "LAR"}, {"name": "KC Concepcion", "aliases": ["KC Concepcion", "K. Concepcion"], "pos": "WR", "team": "CLE"}, {"name": "George Kittle", "aliases": ["G. Kittle", "George Kittle"], "pos": "TE", "team": "SF"}, {"name": "Jared Goff", "aliases": ["Jared Goff", "J. Goff"], "pos": "QB", "team": "DET"}, {"name": "Wan'Dale Robinson", "aliases": ["W. Robinson", "Wan'Dale Robinson", "WanDale Robinson"], "pos": "WR", "team": "TEN"}, {"name": "Kyler Murray", "aliases": ["K. Murray", "Kyler Murray"], "pos": "QB", "team": "MIN"}, {"name": "Jordan Love", "aliases": ["Jordan Love", "J. Love"], "pos": "QB", "team": "GB"}, {"name": "Romeo Doubs", "aliases": ["R. Doubs", "Romeo Doubs"], "pos": "WR", "team": "NE"}, {"name": "Rachaad White", "aliases": ["R. White", "Rachaad White"], "pos": "RB", "team": "WAS"}, {"name": "Dalton Kincaid", "aliases": ["D. Kincaid", "Dalton Kincaid"], "pos": "TE", "team": "BUF"}, {"name": "Jakobi Meyers", "aliases": ["Jakobi Meyers", "J. Meyers"], "pos": "WR", "team": "JAX"}, {"name": "Baker Mayfield", "aliases": ["B. Mayfield", "Baker Mayfield"], "pos": "QB", "team": "TB"}, {"name": "Travis Kelce", "aliases": ["Travis Kelce", "T. Kelce"], "pos": "TE", "team": "KC"}, {"name": "Chris Rodriguez Jr.", "aliases": ["C. Rodriguez Jr.", "Chris Rodriguez Jr.", "Chris Rodriguez Jr", "Chris Rodriguez"], "pos": "RB", "team": "JAX"}, {"name": "Isaiah Likely", "aliases": ["Isaiah Likely", "I. Likely"], "pos": "TE", "team": "NYG"}, {"name": "Tyler Shough", "aliases": ["Tyler Shough", "T. Shough"], "pos": "QB", "team": "NO"}, {"name": "Deebo Samuel Sr.", "aliases": ["D. Samuel Sr.", "Deebo Samuel Sr", "Deebo Samuel Sr."], "pos": "WR", "team": "SF"}, {"name": "Aaron Jones", "aliases": ["Aaron Jones", "A. Jones"], "pos": "RB", "team": "MIN"}, {"name": "Jalen Coker", "aliases": ["Jalen Coker", "J. Coker"], "pos": "WR", "team": "CAR"}, {"name": "Keaton Mitchell", "aliases": ["K. Mitchell", "Keaton Mitchell"], "pos": "RB", "team": "LAC"}, {"name": "Khalil Shakir", "aliases": ["Khalil Shakir", "K. Shakir"], "pos": "WR", "team": "BUF"}, {"name": "Dallas Goedert", "aliases": ["Dallas Goedert", "D. Goedert"], "pos": "TE", "team": "PHI"}, {"name": "Mark Andrews", "aliases": ["M. Andrews", "Mark Andrews"], "pos": "TE", "team": "BAL"}, {"name": "Malik Willis", "aliases": ["M. Willis", "Malik Willis"], "pos": "QB", "team": "MIA"}, {"name": "Rashid Shaheed", "aliases": ["Rashid Shaheed", "R. Shaheed"], "pos": "WR", "team": "SEA"}, {"name": "Jake Ferguson", "aliases": ["Jake Ferguson", "J. Ferguson"], "pos": "TE", "team": "DAL"}, {"name": "Woody Marks", "aliases": ["Woody Marks", "W. Marks"], "pos": "RB", "team": "HOU"}, {"name": "Tyler Allgeier", "aliases": ["T. Allgeier", "Tyler Allgeier"], "pos": "RB", "team": "ARI"}, {"name": "Denzel Boston", "aliases": ["D. Boston", "Denzel Boston"], "pos": "WR", "team": "CLE"}, {"name": "Juwan Johnson", "aliases": ["J. Johnson", "Juwan Johnson"], "pos": "TE", "team": "NO"}, {"name": "Sam Darnold", "aliases": ["S. Darnold", "Sam Darnold"], "pos": "QB", "team": "SEA"}, {"name": "Mike Washington Jr.", "aliases": ["Mike Washington Jr.", "Mike Washington Jr", "M. Washington Jr.", "Mike Washington"], "pos": "RB", "team": "LV"}, {"name": "Jonah Coleman", "aliases": ["Jonah Coleman", "J. Coleman"], "pos": "RB", "team": "DEN"}, {"name": "Daniel Jones", "aliases": ["Daniel Jones", "D. Jones"], "pos": "QB", "team": "IND"}, {"name": "C.J. Stroud", "aliases": ["C. Stroud", "C.J. Stroud", "CJ Stroud"], "pos": "QB", "team": "HOU"}, {"name": "Chig Okonkwo", "aliases": ["Chig Okonkwo", "C. Okonkwo"], "pos": "TE", "team": "WAS"}, {"name": "MarShawn Lloyd", "aliases": ["MarShawn Lloyd", "M. Lloyd"], "pos": "RB", "team": "GB"}, {"name": "Brenton Strange", "aliases": ["B. Strange", "Brenton Strange"], "pos": "TE", "team": "JAX"}, {"name": "Jalen Nailor", "aliases": ["Jalen Nailor", "J. Nailor"], "pos": "WR", "team": "LV"}, {"name": "Tre Tucker", "aliases": ["Tre Tucker", "T. Tucker"], "pos": "WR", "team": "LV"}, {"name": "Ja'Kobi Lane", "aliases": ["JaKobi Lane", "J. Lane", "Ja'Kobi Lane"], "pos": "WR", "team": "BAL"}, {"name": "Tank Bigsby", "aliases": ["Tank Bigsby", "T. Bigsby"], "pos": "RB", "team": "PHI"}, {"name": "Tyrone Tracy Jr.", "aliases": ["Tyrone Tracy Jr", "T. Tracy Jr.", "Tyrone Tracy Jr.", "Tyrone Tracy"], "pos": "RB", "team": "NYG"}, {"name": "Hunter Henry", "aliases": ["H. Henry", "Hunter Henry"], "pos": "TE", "team": "NE"}, {"name": "Keenan Allen", "aliases": ["Keenan Allen", "K. Allen"], "pos": "WR", "team": "IND"}, {"name": "Tyjae Spears", "aliases": ["T. Spears", "Tyjae Spears"], "pos": "RB", "team": "TEN"}, {"name": "Jalen McMillan", "aliases": ["Jalen McMillan", "J. McMillan"], "pos": "WR", "team": "TB"}, {"name": "Cam Ward", "aliases": ["C. Ward", "Cam Ward"], "pos": "QB", "team": "TEN"}, {"name": "Terrance Ferguson", "aliases": ["Terrance Ferguson", "T. Ferguson"], "pos": "TE", "team": "LAR"}, {"name": "Travis Hunter", "aliases": ["T. Hunter", "Travis Hunter"], "pos": "WR", "team": "JAX"}, {"name": "Dontayvion Wicks", "aliases": ["D. Wicks", "Dontayvion Wicks"], "pos": "WR", "team": "PHI"}, {"name": "Tre Harris", "aliases": ["Tre Harris", "T. Harris"], "pos": "WR", "team": "LAC"}, {"name": "Dalton Schultz", "aliases": ["D. Schultz", "Dalton Schultz"], "pos": "TE", "team": "HOU"}, {"name": "Zach Charbonnet", "aliases": ["Zach Charbonnet", "Z. Charbonnet"], "pos": "RB", "team": "SEA"}, {"name": "Cyrus Allen", "aliases": ["Cyrus Allen", "C. Allen"], "pos": "WR", "team": "KC"}, {"name": "Bryce Young", "aliases": ["Bryce Young", "B. Young"], "pos": "QB", "team": "CAR"}, {"name": "T.J. Hockenson", "aliases": ["TJ Hockenson", "T.J. Hockenson", "T. Hockenson"], "pos": "TE", "team": "MIN"}, {"name": "Ryan Flournoy", "aliases": ["R. Flournoy", "Ryan Flournoy"], "pos": "WR", "team": "DAL"}, {"name": "Adonai Mitchell", "aliases": ["Adonai Mitchell", "A. Mitchell"], "pos": "WR", "team": "NYJ"}, {"name": "Omar Cooper Jr.", "aliases": ["Omar Cooper Jr", "Omar Cooper", "Omar Cooper Jr.", "O. Cooper Jr."], "pos": "WR", "team": "NYJ"}, {"name": "Dylan Sampson", "aliases": ["D. Sampson", "Dylan Sampson"], "pos": "RB", "team": "CLE"}, {"name": "Pat Bryant", "aliases": ["P. Bryant", "Pat Bryant"], "pos": "WR", "team": "DEN"}, {"name": "Jauan Jennings", "aliases": ["J. Jennings", "Jauan Jennings"], "pos": "WR", "team": "MIN"}, {"name": "Malik Washington", "aliases": ["Malik Washington", "M. Washington"], "pos": "WR", "team": "MIA"}, {"name": "AJ Barner", "aliases": ["AJ Barner", "A. Barner"], "pos": "TE", "team": "SEA"}, {"name": "Caleb Douglas", "aliases": ["C. Douglas", "Caleb Douglas"], "pos": "WR", "team": "MIA"}, {"name": "Jaydon Blue", "aliases": ["J. Blue", "Jaydon Blue"], "pos": "RB", "team": "DAL"}, {"name": "Kenyon Sadiq", "aliases": ["Kenyon Sadiq", "K. Sadiq"], "pos": "TE", "team": "NYJ"}, {"name": "Tank Dell", "aliases": ["Tank Dell", "T. Dell"], "pos": "WR", "team": "HOU"}, {"name": "Aaron Rodgers", "aliases": ["A. Rodgers", "Aaron Rodgers"], "pos": "QB", "team": "PIT"}, {"name": "Kayshon Boutte", "aliases": ["Kayshon Boutte", "K. Boutte"], "pos": "WR", "team": "HOU"}, {"name": "Brian Robinson", "aliases": ["Brian Robinson", "B. Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Alvin Kamara", "aliases": ["Alvin Kamara", "A. Kamara"], "pos": "RB", "team": "NO"}, {"name": "Braelon Allen", "aliases": ["Braelon Allen", "B. Allen"], "pos": "RB", "team": "NYJ"}, {"name": "Devaughn Vele", "aliases": ["D. Vele", "Devaughn Vele"], "pos": "WR", "team": "NO"}, {"name": "Ray Davis", "aliases": ["Ray Davis", "R. Davis"], "pos": "RB", "team": "BUF"}, {"name": "Isiah Pacheco", "aliases": ["Isiah Pacheco", "I. Pacheco"], "pos": "RB", "team": "DET"}, {"name": "Fernando Mendoza", "aliases": ["Fernando Mendoza", "F. Mendoza"], "pos": "QB", "team": "LV"}, {"name": "Greg Dulcich", "aliases": ["G. Dulcich", "Greg Dulcich"], "pos": "TE", "team": "MIA"}, {"name": "Oronde Gadsden II", "aliases": ["Oronde Gadsden", "Oronde Gadsden II", "O. Gadsden II"], "pos": "TE", "team": "LAC"}, {"name": "Emmett Johnson", "aliases": ["E. Johnson", "Emmett Johnson"], "pos": "RB", "team": "KC"}, {"name": "Geno Smith", "aliases": ["Geno Smith", "G. Smith"], "pos": "QB", "team": "NYJ"}, {"name": "Kaelon Black", "aliases": ["K. Black", "Kaelon Black"], "pos": "RB", "team": "SF"}, {"name": "Malachi Fields", "aliases": ["Malachi Fields", "M. Fields"], "pos": "WR", "team": "NYG"}, {"name": "Cade Otton", "aliases": ["C. Otton", "Cade Otton"], "pos": "TE", "team": "TB"}, {"name": "Zachariah Branch", "aliases": ["Z. Branch", "Zachariah Branch"], "pos": "WR", "team": "ATL"}, {"name": "Gunnar Helm", "aliases": ["G. Helm", "Gunnar Helm"], "pos": "TE", "team": "TEN"}, {"name": "Pat Freiermuth", "aliases": ["Pat Freiermuth", "P. Freiermuth"], "pos": "TE", "team": "PIT"}, {"name": "Jacoby Brissett", "aliases": ["Jacoby Brissett", "J. Brissett"], "pos": "QB", "team": "ARI"}, {"name": "Jaylin Noel", "aliases": ["Jaylin Noel", "J. Noel"], "pos": "WR", "team": "HOU"}, {"name": "Ted Hurst III", "aliases": ["T. Hurst III", "Ted Hurst III", "Ted Hurst"], "pos": "WR", "team": "TB"}, {"name": "Isaac TeSlaa", "aliases": ["I. TeSlaa", "Isaac TeSlaa"], "pos": "WR", "team": "DET"}, {"name": "Chris Bell", "aliases": ["C. Bell", "Chris Bell"], "pos": "WR", "team": "MIA"}, {"name": "Jerry Jeudy", "aliases": ["J. Jeudy", "Jerry Jeudy"], "pos": "WR", "team": "CLE"}, {"name": "Calvin Ridley", "aliases": ["C. Ridley", "Calvin Ridley"], "pos": "WR", "team": "TEN"}, {"name": "Najee Harris", "aliases": ["Najee Harris", "N. Harris"], "pos": "RB", "team": "NYG"}, {"name": "Germie Bernard", "aliases": ["Germie Bernard", "G. Bernard"], "pos": "WR", "team": "PIT"}, {"name": "Sean Tucker", "aliases": ["S. Tucker", "Sean Tucker"], "pos": "RB", "team": "TB"}, {"name": "David Njoku", "aliases": ["D. Njoku", "David Njoku"], "pos": "TE", "team": "LAC"}, {"name": "Kimani Vidal", "aliases": ["Kimani Vidal", "K. Vidal"], "pos": "RB", "team": "LAC"}, {"name": "Charlie Kolar", "aliases": ["Charlie Kolar", "C. Kolar"], "pos": "TE", "team": "LAC"}, {"name": "Rashod Bateman", "aliases": ["R. Bateman", "Rashod Bateman"], "pos": "WR", "team": "BAL"}, {"name": "Cooper Kupp", "aliases": ["Cooper Kupp", "C. Kupp"], "pos": "WR", "team": "SEA"}, {"name": "Colby Parkinson", "aliases": ["Colby Parkinson", "C. Parkinson"], "pos": "TE", "team": "LAR"}, {"name": "Kaytron Allen", "aliases": ["Kaytron Allen", "K. Allen"], "pos": "RB", "team": "WAS"}, {"name": "Michael Penix Jr.", "aliases": ["Michael Penix", "Michael Penix Jr.", "Michael Penix Jr", "M. Penix Jr."], "pos": "QB", "team": "ATL"}, {"name": "Evan Engram", "aliases": ["Evan Engram", "E. Engram"], "pos": "TE", "team": "DEN"}, {"name": "Justice Hill", "aliases": ["Justice Hill", "J. Hill"], "pos": "RB", "team": "BAL"}, {"name": "Samaje Perine", "aliases": ["S. Perine", "Samaje Perine"], "pos": "RB", "team": "CIN"}, {"name": "Tua Tagovailoa", "aliases": ["T. Tagovailoa", "Tua Tagovailoa"], "pos": "QB", "team": "ATL"}, {"name": "George Holani", "aliases": ["George Holani", "G. Holani"], "pos": "RB", "team": "SEA"}, {"name": "Michael Mayer", "aliases": ["M. Mayer", "Michael Mayer"], "pos": "TE", "team": "LV"}, {"name": "Mike Gesicki", "aliases": ["Mike Gesicki", "M. Gesicki"], "pos": "TE", "team": "CIN"}, {"name": "Jordan James", "aliases": ["Jordan James", "J. James"], "pos": "RB", "team": "SF"}, {"name": "Antonio Williams", "aliases": ["A. Williams", "Antonio Williams"], "pos": "WR", "team": "WAS"}, {"name": "Tyquan Thornton", "aliases": ["T. Thornton", "Tyquan Thornton"], "pos": "WR", "team": "KC"}, {"name": "Deshaun Watson", "aliases": ["Deshaun Watson", "D. Watson"], "pos": "QB", "team": "CLE"}, {"name": "Andrei Iosivas", "aliases": ["A. Iosivas", "Andrei Iosivas"], "pos": "WR", "team": "CIN"}, {"name": "Troy Franklin", "aliases": ["Troy Franklin", "T. Franklin"], "pos": "WR", "team": "DEN"}, {"name": "Darnell Mooney", "aliases": ["Darnell Mooney", "D. Mooney"], "pos": "WR", "team": "NYG"}, {"name": "Jack Bech", "aliases": ["Jack Bech", "J. Bech"], "pos": "WR", "team": "LV"}, {"name": "Demond Claiborne", "aliases": ["Demond Claiborne", "D. Claiborne"], "pos": "RB", "team": "MIN"}, {"name": "James Conner", "aliases": ["James Conner", "J. Conner"], "pos": "RB", "team": "ARI"}, {"name": "Bryce Lance", "aliases": ["B. Lance", "Bryce Lance"], "pos": "WR", "team": "NO"}, {"name": "Kirk Cousins", "aliases": ["K. Cousins", "Kirk Cousins"], "pos": "QB", "team": "LV"}, {"name": "Darius Slayton", "aliases": ["Darius Slayton", "D. Slayton"], "pos": "WR", "team": "NYG"}, {"name": "Zavion Thomas", "aliases": ["Zavion Thomas", "Z. Thomas"], "pos": "WR", "team": "CHI"}, {"name": "Colbie Young", "aliases": ["C. Young", "Colbie Young"], "pos": "WR", "team": "CIN"}, {"name": "Jahan Dotson", "aliases": ["Jahan Dotson", "J. Dotson"], "pos": "WR", "team": "ATL"}, {"name": "Emanuel Wilson", "aliases": ["E. Wilson", "Emanuel Wilson"], "pos": "RB", "team": "SEA"}, {"name": "Malik Benson", "aliases": ["Malik Benson", "M. Benson"], "pos": "WR", "team": "LV"}, {"name": "Ty Johnson", "aliases": ["Ty Johnson", "T. Johnson"], "pos": "RB", "team": "BUF"}, {"name": "Chris Brooks", "aliases": ["C. Brooks", "Chris Brooks"], "pos": "RB", "team": "GB"}];
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

  function parseDraftPicks() {
    try {
      const picks = [];
      const seenKeys = new Set();
      
      // Strategy 1: Search all elements across the page
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        // Only inspect leaf or small text nodes to avoid matching outer wrapper bodies
        if (el.children.length > 8) return;
        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 180) return;

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
              
              const isUser = text.includes('YOU') || text.includes('My Team') || el.classList.contains('is-user') || el.classList.contains('user-pick') || (el.parentElement && el.parentElement.classList.contains('user-pick'));

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

      // Strategy 2: Scan full page text as fallback
      if (document.body) {
        const fullBodyNorm = normalize(document.body.innerText || '');
        KNOWN_PLAYERS.forEach(kp => {
          const key = normalize(kp.name);
          if (!seenKeys.has(key)) {
            const matched = kp.aliases.some(alias => fullBodyNorm.includes(normalize(alias)));
            if (matched) {
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

  function sendPicks(picks, draftId) {
    const payload = {
      type: 'UNDERDOG_PICKS_SYNC',
      draft_id: draftId,
      picks: picks,
      timestamp: Date.now()
    };

    // 1. Send to Extension Background Service Worker (Cross-Tab Router)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(payload);
      } catch(e) {}
    }

    // 2. BroadcastChannel
    try {
      const channel = new BroadcastChannel('underdog-sync');
      channel.postMessage(payload);
    } catch(e) {}

    // 3. Local postMessage
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
          syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks)</span>';
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

  // Safe 1.5s interval
  setInterval(tick, 1500);
  setTimeout(tick, 1000);

  // Listen for sync ping from companion
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'REQUEST_UNDERDOG_SYNC') {
        lastPicksCount = -1;
        tick();
      }
    });
  }
})();
