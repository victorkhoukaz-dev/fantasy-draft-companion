// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = [{"name": "Jahmyr Gibbs", "aliases": ["Jahmyr Gibbs", "J. Gibbs"], "pos": "RB", "team": "DET"}, {"name": "Bijan Robinson", "aliases": ["B. Robinson", "Bijan Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Ja'Marr Chase", "aliases": ["JaMarr Chase", "Ja'Marr Chase", "J. Chase"], "pos": "WR", "team": "CIN"}, {"name": "Puka Nacua", "aliases": ["P. Nacua", "Puka Nacua"], "pos": "WR", "team": "LAR"}, {"name": "Jaxon Smith-Njigba", "aliases": ["Jaxon Smith-Njigba", "J. Smith-Njigba"], "pos": "WR", "team": "SEA"}, {"name": "Christian McCaffrey", "aliases": ["Christian McCaffrey", "C. McCaffrey"], "pos": "RB", "team": "SF"}, {"name": "Amon-Ra St. Brown", "aliases": ["Amon-Ra St Brown", "A. St. Brown", "Amon-Ra St. Brown"], "pos": "WR", "team": "DET"}, {"name": "Jonathan Taylor", "aliases": ["Jonathan Taylor", "J. Taylor"], "pos": "RB", "team": "IND"}, {"name": "James Cook", "aliases": ["James Cook", "J. Cook"], "pos": "RB", "team": "BUF"}, {"name": "CeeDee Lamb", "aliases": ["CeeDee Lamb", "C. Lamb"], "pos": "WR", "team": "DAL"}, {"name": "Justin Jefferson", "aliases": ["Justin Jefferson", "J. Jefferson"], "pos": "WR", "team": "MIN"}, {"name": "Saquon Barkley", "aliases": ["S. Barkley", "Saquon Barkley"], "pos": "RB", "team": "PHI"}, {"name": "Kenneth Walker III", "aliases": ["K. Walker III", "Kenneth Walker", "Kenneth Walker III", "K. Walker"], "pos": "RB", "team": "KC"}, {"name": "Chase Brown", "aliases": ["Chase Brown", "C. Brown"], "pos": "RB", "team": "CIN"}, {"name": "Omarion Hampton", "aliases": ["Omarion Hampton", "O. Hampton"], "pos": "RB", "team": "LAC"}, {"name": "De'Von Achane", "aliases": ["D. Achane", "De'Von Achane", "DeVon Achane"], "pos": "RB", "team": "MIA"}, {"name": "Derrick Henry", "aliases": ["D. Henry", "Derrick Henry"], "pos": "RB", "team": "BAL"}, {"name": "Ashton Jeanty", "aliases": ["A. Jeanty", "Ashton Jeanty"], "pos": "RB", "team": "LV"}, {"name": "A.J. Brown", "aliases": ["A. Brown", "A.J. Brown", "AJ Brown"], "pos": "WR", "team": "NE"}, {"name": "Brock Bowers", "aliases": ["Brock Bowers", "B. Bowers"], "pos": "TE", "team": "LV"}, {"name": "Nico Collins", "aliases": ["N. Collins", "Nico Collins"], "pos": "WR", "team": "HOU"}, {"name": "Drake London", "aliases": ["Drake London", "D. London"], "pos": "WR", "team": "ATL"}, {"name": "Malik Nabers", "aliases": ["M. Nabers", "Malik Nabers"], "pos": "WR", "team": "NYG"}, {"name": "George Pickens", "aliases": ["George Pickens", "G. Pickens"], "pos": "WR", "team": "DAL"}, {"name": "Chris Olave", "aliases": ["Chris Olave", "C. Olave"], "pos": "WR", "team": "NO"}, {"name": "Rashee Rice", "aliases": ["R. Rice", "Rashee Rice"], "pos": "WR", "team": "KC"}, {"name": "DeVonta Smith", "aliases": ["D. Smith", "DeVonta Smith"], "pos": "WR", "team": "PHI"}, {"name": "Trey McBride", "aliases": ["Trey McBride", "T. McBride"], "pos": "TE", "team": "ARI"}, {"name": "Jeremiyah Love", "aliases": ["J. Love", "Jeremiyah Love"], "pos": "RB", "team": "ARI"}, {"name": "Kyren Williams", "aliases": ["Kyren Williams", "K. Williams"], "pos": "RB", "team": "LAR"}, {"name": "Zay Flowers", "aliases": ["Zay Flowers", "Z. Flowers"], "pos": "WR", "team": "BAL"}, {"name": "Breece Hall", "aliases": ["B. Hall", "Breece Hall"], "pos": "RB", "team": "NYJ"}, {"name": "Javonte Williams", "aliases": ["Javonte Williams", "J. Williams"], "pos": "RB", "team": "DAL"}, {"name": "Ladd McConkey", "aliases": ["L. McConkey", "Ladd McConkey"], "pos": "WR", "team": "LAC"}, {"name": "Tee Higgins", "aliases": ["T. Higgins", "Tee Higgins"], "pos": "WR", "team": "CIN"}, {"name": "Emeka Egbuka", "aliases": ["Emeka Egbuka", "E. Egbuka"], "pos": "WR", "team": "TB"}, {"name": "Josh Allen", "aliases": ["J. Allen", "Josh Allen"], "pos": "QB", "team": "BUF"}, {"name": "Jaylen Waddle", "aliases": ["J. Waddle", "Jaylen Waddle"], "pos": "WR", "team": "DEN"}, {"name": "Garrett Wilson", "aliases": ["G. Wilson", "Garrett Wilson"], "pos": "WR", "team": "NYJ"}, {"name": "Travis Etienne", "aliases": ["T. Etienne", "Travis Etienne"], "pos": "RB", "team": "NO"}, {"name": "Tetairoa McMillan", "aliases": ["Tetairoa McMillan", "T. McMillan"], "pos": "WR", "team": "CAR"}, {"name": "Josh Jacobs", "aliases": ["Josh Jacobs", "J. Jacobs"], "pos": "RB", "team": "GB"}, {"name": "Colston Loveland", "aliases": ["C. Loveland", "Colston Loveland"], "pos": "TE", "team": "CHI"}, {"name": "D'Andre Swift", "aliases": ["D. Swift", "DAndre Swift", "D'Andre Swift"], "pos": "RB", "team": "CHI"}, {"name": "Luther Burden III", "aliases": ["Luther Burden", "L. Burden", "Luther Burden III", "L. Burden III"], "pos": "WR", "team": "CHI"}, {"name": "Cam Skattebo", "aliases": ["Cam Skattebo", "C. Skattebo"], "pos": "RB", "team": "NYG"}, {"name": "David Montgomery", "aliases": ["D. Montgomery", "David Montgomery"], "pos": "RB", "team": "HOU"}, {"name": "Terry McLaurin", "aliases": ["T. McLaurin", "Terry McLaurin"], "pos": "WR", "team": "WAS"}, {"name": "Bhayshul Tuten", "aliases": ["B. Tuten", "Bhayshul Tuten"], "pos": "RB", "team": "JAX"}, {"name": "Jameson Williams", "aliases": ["Jameson Williams", "J. Williams"], "pos": "WR", "team": "DET"}, {"name": "Davante Adams", "aliases": ["Davante Adams", "D. Adams"], "pos": "WR", "team": "LAR"}, {"name": "Mike Evans", "aliases": ["M. Evans", "Mike Evans"], "pos": "WR", "team": "SF"}, {"name": "DJ Moore", "aliases": ["D. Moore", "DJ Moore"], "pos": "WR", "team": "BUF"}, {"name": "Bucky Irving", "aliases": ["B. Irving", "Bucky Irving"], "pos": "RB", "team": "TB"}, {"name": "Quinshon Judkins", "aliases": ["Q. Judkins", "Quinshon Judkins"], "pos": "RB", "team": "CLE"}, {"name": "Parker Washington", "aliases": ["Parker Washington", "P. Washington"], "pos": "WR", "team": "JAX"}, {"name": "Lamar Jackson", "aliases": ["L. Jackson", "Lamar Jackson"], "pos": "QB", "team": "BAL"}, {"name": "Christian Watson", "aliases": ["Christian Watson", "C. Watson"], "pos": "WR", "team": "GB"}, {"name": "Rome Odunze", "aliases": ["Rome Odunze", "R. Odunze"], "pos": "WR", "team": "CHI"}, {"name": "Jadarian Price", "aliases": ["J. Price", "Jadarian Price"], "pos": "RB", "team": "SEA"}, {"name": "TreVeyon Henderson", "aliases": ["T. Henderson", "TreVeyon Henderson"], "pos": "RB", "team": "NE"}, {"name": "Carnell Tate", "aliases": ["C. Tate", "Carnell Tate"], "pos": "WR", "team": "TEN"}, {"name": "Tyler Warren", "aliases": ["Tyler Warren", "T. Warren"], "pos": "TE", "team": "IND"}, {"name": "Brian Thomas Jr.", "aliases": ["Brian Thomas Jr.", "B. Thomas", "Brian Thomas Jr", "Brian Thomas", "B. Thomas Jr."], "pos": "WR", "team": "JAX"}, {"name": "Marvin Harrison Jr.", "aliases": ["Marvin Harrison Jr.", "Marvin Harrison Jr", "Marvin Harrison", "M. Harrison Jr.", "M. Harrison"], "pos": "WR", "team": "ARI"}, {"name": "Drake Maye", "aliases": ["D. Maye", "Drake Maye"], "pos": "QB", "team": "NE"}, {"name": "Rhamondre Stevenson", "aliases": ["R. Stevenson", "Rhamondre Stevenson"], "pos": "RB", "team": "NE"}, {"name": "Joe Burrow", "aliases": ["J. Burrow", "Joe Burrow"], "pos": "QB", "team": "CIN"}, {"name": "Jayden Daniels", "aliases": ["J. Daniels", "Jayden Daniels"], "pos": "QB", "team": "WAS"}, {"name": "Jaylen Warren", "aliases": ["Jaylen Warren", "J. Warren"], "pos": "RB", "team": "PIT"}, {"name": "Jalen Hurts", "aliases": ["J. Hurts", "Jalen Hurts"], "pos": "QB", "team": "PHI"}, {"name": "Caleb Williams", "aliases": ["Caleb Williams", "C. Williams"], "pos": "QB", "team": "CHI"}, {"name": "DK Metcalf", "aliases": ["DK Metcalf", "D. Metcalf"], "pos": "WR", "team": "PIT"}, {"name": "Quentin Johnston", "aliases": ["Q. Johnston", "Quentin Johnston"], "pos": "WR", "team": "LAC"}, {"name": "Jonathon Brooks", "aliases": ["J. Brooks", "Jonathon Brooks"], "pos": "RB", "team": "CAR"}, {"name": "Tucker Kraft", "aliases": ["Tucker Kraft", "T. Kraft"], "pos": "TE", "team": "GB"}, {"name": "Tony Pollard", "aliases": ["T. Pollard", "Tony Pollard"], "pos": "RB", "team": "TEN"}, {"name": "Jayden Reed", "aliases": ["Jayden Reed", "J. Reed"], "pos": "WR", "team": "GB"}, {"name": "Dak Prescott", "aliases": ["Dak Prescott", "D. Prescott"], "pos": "QB", "team": "DAL"}, {"name": "Makai Lemon", "aliases": ["M. Lemon", "Makai Lemon"], "pos": "WR", "team": "PHI"}, {"name": "Courtland Sutton", "aliases": ["C. Sutton", "Courtland Sutton"], "pos": "WR", "team": "DEN"}, {"name": "Josh Downs", "aliases": ["J. Downs", "Josh Downs"], "pos": "WR", "team": "IND"}, {"name": "Rico Dowdle", "aliases": ["Rico Dowdle", "R. Dowdle"], "pos": "RB", "team": "PIT"}, {"name": "Justin Herbert", "aliases": ["J. Herbert", "Justin Herbert"], "pos": "QB", "team": "LAC"}, {"name": "Chris Godwin Jr.", "aliases": ["C. Godwin", "Chris Godwin Jr.", "Chris Godwin Jr", "Chris Godwin", "C. Godwin Jr."], "pos": "WR", "team": "TB"}, {"name": "Trevor Lawrence", "aliases": ["T. Lawrence", "Trevor Lawrence"], "pos": "QB", "team": "JAX"}, {"name": "Blake Corum", "aliases": ["B. Corum", "Blake Corum"], "pos": "RB", "team": "LAR"}, {"name": "RJ Harvey", "aliases": ["R. Harvey", "RJ Harvey"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Addison", "aliases": ["J. Addison", "Jordan Addison"], "pos": "WR", "team": "MIN"}, {"name": "Michael Wilson", "aliases": ["M. Wilson", "Michael Wilson"], "pos": "WR", "team": "ARI"}, {"name": "Sam LaPorta", "aliases": ["S. LaPorta", "Sam LaPorta"], "pos": "TE", "team": "DET"}, {"name": "Stefon Diggs", "aliases": ["Stefon Diggs", "S. Diggs"], "pos": "WR", "team": "WAS"}, {"name": "Jordyn Tyson", "aliases": ["J. Tyson", "Jordyn Tyson"], "pos": "WR", "team": "NO"}, {"name": "Alec Pierce", "aliases": ["A. Pierce", "Alec Pierce"], "pos": "WR", "team": "IND"}, {"name": "J.K. Dobbins", "aliases": ["J. Dobbins", "JK Dobbins", "J.K. Dobbins"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Mason", "aliases": ["J. Mason", "Jordan Mason"], "pos": "RB", "team": "MIN"}, {"name": "Patrick Mahomes", "aliases": ["Patrick Mahomes", "P. Mahomes"], "pos": "QB", "team": "KC"}, {"name": "Chuba Hubbard", "aliases": ["Chuba Hubbard", "C. Hubbard"], "pos": "RB", "team": "CAR"}, {"name": "Jacory Croskey-Merritt", "aliases": ["Jacory Croskey-Merritt", "J. Croskey-Merritt"], "pos": "RB", "team": "WAS"}, {"name": "Matthew Golden", "aliases": ["M. Golden", "Matthew Golden"], "pos": "WR", "team": "GB"}, {"name": "Michael Pittman", "aliases": ["M. Pittman", "Michael Pittman"], "pos": "WR", "team": "PIT"}, {"name": "Kyle Pitts", "aliases": ["K. Pitts", "Kyle Pitts"], "pos": "TE", "team": "ATL"}, {"name": "Brock Purdy", "aliases": ["Brock Purdy", "B. Purdy"], "pos": "QB", "team": "SF"}, {"name": "Jaxson Dart", "aliases": ["Jaxson Dart", "J. Dart"], "pos": "QB", "team": "NYG"}, {"name": "Harold Fannin Jr.", "aliases": ["H. Fannin Jr.", "Harold Fannin", "H. Fannin", "Harold Fannin Jr.", "Harold Fannin Jr"], "pos": "TE", "team": "CLE"}, {"name": "Bo Nix", "aliases": ["B. Nix", "Bo Nix"], "pos": "QB", "team": "DEN"}, {"name": "Xavier Worthy", "aliases": ["Xavier Worthy", "X. Worthy"], "pos": "WR", "team": "KC"}, {"name": "Kyle Monangai", "aliases": ["Kyle Monangai", "K. Monangai"], "pos": "RB", "team": "CHI"}, {"name": "Kenny Gainwell", "aliases": ["Kenny Gainwell", "K. Gainwell"], "pos": "RB", "team": "TB"}, {"name": "De'Zhaun Stribling", "aliases": ["D. Stribling", "De'Zhaun Stribling", "DeZhaun Stribling"], "pos": "WR", "team": "SF"}, {"name": "Matthew Stafford", "aliases": ["M. Stafford", "Matthew Stafford"], "pos": "QB", "team": "LAR"}, {"name": "KC Concepcion", "aliases": ["K. Concepcion", "KC Concepcion"], "pos": "WR", "team": "CLE"}, {"name": "George Kittle", "aliases": ["G. Kittle", "George Kittle"], "pos": "TE", "team": "SF"}, {"name": "Jared Goff", "aliases": ["J. Goff", "Jared Goff"], "pos": "QB", "team": "DET"}, {"name": "Wan'Dale Robinson", "aliases": ["Wan'Dale Robinson", "W. Robinson", "WanDale Robinson"], "pos": "WR", "team": "TEN"}, {"name": "Kyler Murray", "aliases": ["Kyler Murray", "K. Murray"], "pos": "QB", "team": "MIN"}, {"name": "Jordan Love", "aliases": ["J. Love", "Jordan Love"], "pos": "QB", "team": "GB"}, {"name": "Romeo Doubs", "aliases": ["Romeo Doubs", "R. Doubs"], "pos": "WR", "team": "NE"}, {"name": "Rachaad White", "aliases": ["Rachaad White", "R. White"], "pos": "RB", "team": "WAS"}, {"name": "Dalton Kincaid", "aliases": ["D. Kincaid", "Dalton Kincaid"], "pos": "TE", "team": "BUF"}, {"name": "Jakobi Meyers", "aliases": ["J. Meyers", "Jakobi Meyers"], "pos": "WR", "team": "JAX"}, {"name": "Baker Mayfield", "aliases": ["Baker Mayfield", "B. Mayfield"], "pos": "QB", "team": "TB"}, {"name": "Travis Kelce", "aliases": ["T. Kelce", "Travis Kelce"], "pos": "TE", "team": "KC"}, {"name": "Chris Rodriguez Jr.", "aliases": ["C. Rodriguez Jr.", "C. Rodriguez", "Chris Rodriguez", "Chris Rodriguez Jr", "Chris Rodriguez Jr."], "pos": "RB", "team": "JAX"}, {"name": "Isaiah Likely", "aliases": ["I. Likely", "Isaiah Likely"], "pos": "TE", "team": "NYG"}, {"name": "Tyler Shough", "aliases": ["T. Shough", "Tyler Shough"], "pos": "QB", "team": "NO"}, {"name": "Deebo Samuel Sr.", "aliases": ["Deebo Samuel Sr.", "Deebo Samuel Sr", "D. Samuel Sr.", "D. Samuel", "Deebo Samuel"], "pos": "WR", "team": "SF"}, {"name": "Aaron Jones", "aliases": ["Aaron Jones", "A. Jones"], "pos": "RB", "team": "MIN"}, {"name": "Jalen Coker", "aliases": ["Jalen Coker", "J. Coker"], "pos": "WR", "team": "CAR"}, {"name": "Keaton Mitchell", "aliases": ["K. Mitchell", "Keaton Mitchell"], "pos": "RB", "team": "LAC"}, {"name": "Khalil Shakir", "aliases": ["Khalil Shakir", "K. Shakir"], "pos": "WR", "team": "BUF"}, {"name": "Dallas Goedert", "aliases": ["Dallas Goedert", "D. Goedert"], "pos": "TE", "team": "PHI"}, {"name": "Mark Andrews", "aliases": ["Mark Andrews", "M. Andrews"], "pos": "TE", "team": "BAL"}, {"name": "Malik Willis", "aliases": ["Malik Willis", "M. Willis"], "pos": "QB", "team": "MIA"}, {"name": "Rashid Shaheed", "aliases": ["R. Shaheed", "Rashid Shaheed"], "pos": "WR", "team": "SEA"}, {"name": "Jake Ferguson", "aliases": ["Jake Ferguson", "J. Ferguson"], "pos": "TE", "team": "DAL"}, {"name": "Woody Marks", "aliases": ["W. Marks", "Woody Marks"], "pos": "RB", "team": "HOU"}, {"name": "Tyler Allgeier", "aliases": ["T. Allgeier", "Tyler Allgeier"], "pos": "RB", "team": "ARI"}, {"name": "Denzel Boston", "aliases": ["Denzel Boston", "D. Boston"], "pos": "WR", "team": "CLE"}, {"name": "Juwan Johnson", "aliases": ["J. Johnson", "Juwan Johnson"], "pos": "TE", "team": "NO"}, {"name": "Sam Darnold", "aliases": ["S. Darnold", "Sam Darnold"], "pos": "QB", "team": "SEA"}, {"name": "Mike Washington Jr.", "aliases": ["Mike Washington", "M. Washington", "Mike Washington Jr", "M. Washington Jr.", "Mike Washington Jr."], "pos": "RB", "team": "LV"}, {"name": "Jonah Coleman", "aliases": ["Jonah Coleman", "J. Coleman"], "pos": "RB", "team": "DEN"}, {"name": "Daniel Jones", "aliases": ["Daniel Jones", "D. Jones"], "pos": "QB", "team": "IND"}, {"name": "C.J. Stroud", "aliases": ["CJ Stroud", "C.J. Stroud", "C. Stroud"], "pos": "QB", "team": "HOU"}, {"name": "Chig Okonkwo", "aliases": ["C. Okonkwo", "Chig Okonkwo"], "pos": "TE", "team": "WAS"}, {"name": "MarShawn Lloyd", "aliases": ["MarShawn Lloyd", "M. Lloyd"], "pos": "RB", "team": "GB"}, {"name": "Brenton Strange", "aliases": ["Brenton Strange", "B. Strange"], "pos": "TE", "team": "JAX"}, {"name": "Jalen Nailor", "aliases": ["Jalen Nailor", "J. Nailor"], "pos": "WR", "team": "LV"}, {"name": "Tre Tucker", "aliases": ["T. Tucker", "Tre Tucker"], "pos": "WR", "team": "LV"}, {"name": "Ja'Kobi Lane", "aliases": ["J. Lane", "JaKobi Lane", "Ja'Kobi Lane"], "pos": "WR", "team": "BAL"}, {"name": "Tank Bigsby", "aliases": ["T. Bigsby", "Tank Bigsby"], "pos": "RB", "team": "PHI"}, {"name": "Tyrone Tracy Jr.", "aliases": ["Tyrone Tracy", "T. Tracy", "Tyrone Tracy Jr", "Tyrone Tracy Jr.", "T. Tracy Jr."], "pos": "RB", "team": "NYG"}, {"name": "Hunter Henry", "aliases": ["H. Henry", "Hunter Henry"], "pos": "TE", "team": "NE"}, {"name": "Keenan Allen", "aliases": ["K. Allen", "Keenan Allen"], "pos": "WR", "team": "IND"}, {"name": "Tyjae Spears", "aliases": ["T. Spears", "Tyjae Spears"], "pos": "RB", "team": "TEN"}, {"name": "Jalen McMillan", "aliases": ["J. McMillan", "Jalen McMillan"], "pos": "WR", "team": "TB"}, {"name": "Cam Ward", "aliases": ["Cam Ward", "C. Ward"], "pos": "QB", "team": "TEN"}, {"name": "Terrance Ferguson", "aliases": ["T. Ferguson", "Terrance Ferguson"], "pos": "TE", "team": "LAR"}, {"name": "Travis Hunter", "aliases": ["T. Hunter", "Travis Hunter"], "pos": "WR", "team": "JAX"}, {"name": "Dontayvion Wicks", "aliases": ["D. Wicks", "Dontayvion Wicks"], "pos": "WR", "team": "PHI"}, {"name": "Tre Harris", "aliases": ["Tre Harris", "T. Harris"], "pos": "WR", "team": "LAC"}, {"name": "Dalton Schultz", "aliases": ["Dalton Schultz", "D. Schultz"], "pos": "TE", "team": "HOU"}, {"name": "Zach Charbonnet", "aliases": ["Zach Charbonnet", "Z. Charbonnet"], "pos": "RB", "team": "SEA"}, {"name": "Cyrus Allen", "aliases": ["Cyrus Allen", "C. Allen"], "pos": "WR", "team": "KC"}, {"name": "Bryce Young", "aliases": ["Bryce Young", "B. Young"], "pos": "QB", "team": "CAR"}, {"name": "T.J. Hockenson", "aliases": ["T.J. Hockenson", "T. Hockenson", "TJ Hockenson"], "pos": "TE", "team": "MIN"}, {"name": "Ryan Flournoy", "aliases": ["R. Flournoy", "Ryan Flournoy"], "pos": "WR", "team": "DAL"}, {"name": "Adonai Mitchell", "aliases": ["Adonai Mitchell", "A. Mitchell"], "pos": "WR", "team": "NYJ"}, {"name": "Omar Cooper Jr.", "aliases": ["O. Cooper Jr.", "O. Cooper", "Omar Cooper Jr.", "Omar Cooper Jr", "Omar Cooper"], "pos": "WR", "team": "NYJ"}, {"name": "Dylan Sampson", "aliases": ["D. Sampson", "Dylan Sampson"], "pos": "RB", "team": "CLE"}, {"name": "Pat Bryant", "aliases": ["Pat Bryant", "P. Bryant"], "pos": "WR", "team": "DEN"}, {"name": "Jauan Jennings", "aliases": ["J. Jennings", "Jauan Jennings"], "pos": "WR", "team": "MIN"}, {"name": "Malik Washington", "aliases": ["Malik Washington", "M. Washington"], "pos": "WR", "team": "MIA"}, {"name": "AJ Barner", "aliases": ["A. Barner", "AJ Barner"], "pos": "TE", "team": "SEA"}, {"name": "Caleb Douglas", "aliases": ["Caleb Douglas", "C. Douglas"], "pos": "WR", "team": "MIA"}, {"name": "Jaydon Blue", "aliases": ["Jaydon Blue", "J. Blue"], "pos": "RB", "team": "DAL"}, {"name": "Kenyon Sadiq", "aliases": ["K. Sadiq", "Kenyon Sadiq"], "pos": "TE", "team": "NYJ"}, {"name": "Tank Dell", "aliases": ["Tank Dell", "T. Dell"], "pos": "WR", "team": "HOU"}, {"name": "Aaron Rodgers", "aliases": ["A. Rodgers", "Aaron Rodgers"], "pos": "QB", "team": "PIT"}, {"name": "Kayshon Boutte", "aliases": ["Kayshon Boutte", "K. Boutte"], "pos": "WR", "team": "HOU"}, {"name": "Brian Robinson", "aliases": ["B. Robinson", "Brian Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Alvin Kamara", "aliases": ["Alvin Kamara", "A. Kamara"], "pos": "RB", "team": "NO"}, {"name": "Braelon Allen", "aliases": ["B. Allen", "Braelon Allen"], "pos": "RB", "team": "NYJ"}, {"name": "Devaughn Vele", "aliases": ["Devaughn Vele", "D. Vele"], "pos": "WR", "team": "NO"}, {"name": "Ray Davis", "aliases": ["R. Davis", "Ray Davis"], "pos": "RB", "team": "BUF"}, {"name": "Isiah Pacheco", "aliases": ["Isiah Pacheco", "I. Pacheco"], "pos": "RB", "team": "DET"}, {"name": "Fernando Mendoza", "aliases": ["F. Mendoza", "Fernando Mendoza"], "pos": "QB", "team": "LV"}, {"name": "Greg Dulcich", "aliases": ["G. Dulcich", "Greg Dulcich"], "pos": "TE", "team": "MIA"}, {"name": "Oronde Gadsden II", "aliases": ["Oronde Gadsden", "Oronde Gadsden II", "O. Gadsden II", "O. Gadsden"], "pos": "TE", "team": "LAC"}, {"name": "Emmett Johnson", "aliases": ["Emmett Johnson", "E. Johnson"], "pos": "RB", "team": "KC"}, {"name": "Geno Smith", "aliases": ["Geno Smith", "G. Smith"], "pos": "QB", "team": "NYJ"}, {"name": "Kaelon Black", "aliases": ["K. Black", "Kaelon Black"], "pos": "RB", "team": "SF"}, {"name": "Malachi Fields", "aliases": ["M. Fields", "Malachi Fields"], "pos": "WR", "team": "NYG"}, {"name": "Cade Otton", "aliases": ["Cade Otton", "C. Otton"], "pos": "TE", "team": "TB"}, {"name": "Zachariah Branch", "aliases": ["Z. Branch", "Zachariah Branch"], "pos": "WR", "team": "ATL"}, {"name": "Gunnar Helm", "aliases": ["Gunnar Helm", "G. Helm"], "pos": "TE", "team": "TEN"}, {"name": "Pat Freiermuth", "aliases": ["Pat Freiermuth", "P. Freiermuth"], "pos": "TE", "team": "PIT"}, {"name": "Jacoby Brissett", "aliases": ["Jacoby Brissett", "J. Brissett"], "pos": "QB", "team": "ARI"}, {"name": "Jaylin Noel", "aliases": ["J. Noel", "Jaylin Noel"], "pos": "WR", "team": "HOU"}, {"name": "Ted Hurst III", "aliases": ["T. Hurst III", "T. Hurst", "Ted Hurst", "Ted Hurst III"], "pos": "WR", "team": "TB"}, {"name": "Isaac TeSlaa", "aliases": ["I. TeSlaa", "Isaac TeSlaa"], "pos": "WR", "team": "DET"}, {"name": "Chris Bell", "aliases": ["C. Bell", "Chris Bell"], "pos": "WR", "team": "MIA"}, {"name": "Jerry Jeudy", "aliases": ["Jerry Jeudy", "J. Jeudy"], "pos": "WR", "team": "CLE"}, {"name": "Calvin Ridley", "aliases": ["C. Ridley", "Calvin Ridley"], "pos": "WR", "team": "TEN"}, {"name": "Najee Harris", "aliases": ["Najee Harris", "N. Harris"], "pos": "RB", "team": "NYG"}, {"name": "Germie Bernard", "aliases": ["G. Bernard", "Germie Bernard"], "pos": "WR", "team": "PIT"}, {"name": "Sean Tucker", "aliases": ["S. Tucker", "Sean Tucker"], "pos": "RB", "team": "TB"}, {"name": "David Njoku", "aliases": ["D. Njoku", "David Njoku"], "pos": "TE", "team": "LAC"}, {"name": "Kimani Vidal", "aliases": ["K. Vidal", "Kimani Vidal"], "pos": "RB", "team": "LAC"}, {"name": "Charlie Kolar", "aliases": ["C. Kolar", "Charlie Kolar"], "pos": "TE", "team": "LAC"}, {"name": "Rashod Bateman", "aliases": ["Rashod Bateman", "R. Bateman"], "pos": "WR", "team": "BAL"}, {"name": "Cooper Kupp", "aliases": ["C. Kupp", "Cooper Kupp"], "pos": "WR", "team": "SEA"}, {"name": "Colby Parkinson", "aliases": ["C. Parkinson", "Colby Parkinson"], "pos": "TE", "team": "LAR"}, {"name": "Kaytron Allen", "aliases": ["Kaytron Allen", "K. Allen"], "pos": "RB", "team": "WAS"}, {"name": "Michael Penix Jr.", "aliases": ["Michael Penix", "Michael Penix Jr.", "Michael Penix Jr", "M. Penix", "M. Penix Jr."], "pos": "QB", "team": "ATL"}, {"name": "Evan Engram", "aliases": ["E. Engram", "Evan Engram"], "pos": "TE", "team": "DEN"}, {"name": "Justice Hill", "aliases": ["J. Hill", "Justice Hill"], "pos": "RB", "team": "BAL"}, {"name": "Samaje Perine", "aliases": ["Samaje Perine", "S. Perine"], "pos": "RB", "team": "CIN"}, {"name": "Tua Tagovailoa", "aliases": ["Tua Tagovailoa", "T. Tagovailoa"], "pos": "QB", "team": "ATL"}, {"name": "George Holani", "aliases": ["George Holani", "G. Holani"], "pos": "RB", "team": "SEA"}, {"name": "Michael Mayer", "aliases": ["M. Mayer", "Michael Mayer"], "pos": "TE", "team": "LV"}, {"name": "Mike Gesicki", "aliases": ["M. Gesicki", "Mike Gesicki"], "pos": "TE", "team": "CIN"}, {"name": "Jordan James", "aliases": ["Jordan James", "J. James"], "pos": "RB", "team": "SF"}, {"name": "Antonio Williams", "aliases": ["Antonio Williams", "A. Williams"], "pos": "WR", "team": "WAS"}, {"name": "Tyquan Thornton", "aliases": ["Tyquan Thornton", "T. Thornton"], "pos": "WR", "team": "KC"}, {"name": "Deshaun Watson", "aliases": ["Deshaun Watson", "D. Watson"], "pos": "QB", "team": "CLE"}, {"name": "Andrei Iosivas", "aliases": ["Andrei Iosivas", "A. Iosivas"], "pos": "WR", "team": "CIN"}, {"name": "Troy Franklin", "aliases": ["Troy Franklin", "T. Franklin"], "pos": "WR", "team": "DEN"}, {"name": "Darnell Mooney", "aliases": ["Darnell Mooney", "D. Mooney"], "pos": "WR", "team": "NYG"}, {"name": "Jack Bech", "aliases": ["J. Bech", "Jack Bech"], "pos": "WR", "team": "LV"}, {"name": "Demond Claiborne", "aliases": ["Demond Claiborne", "D. Claiborne"], "pos": "RB", "team": "MIN"}, {"name": "James Conner", "aliases": ["James Conner", "J. Conner"], "pos": "RB", "team": "ARI"}, {"name": "Bryce Lance", "aliases": ["B. Lance", "Bryce Lance"], "pos": "WR", "team": "NO"}, {"name": "Kirk Cousins", "aliases": ["Kirk Cousins", "K. Cousins"], "pos": "QB", "team": "LV"}, {"name": "Darius Slayton", "aliases": ["D. Slayton", "Darius Slayton"], "pos": "WR", "team": "NYG"}, {"name": "Zavion Thomas", "aliases": ["Zavion Thomas", "Z. Thomas"], "pos": "WR", "team": "CHI"}, {"name": "Colbie Young", "aliases": ["C. Young", "Colbie Young"], "pos": "WR", "team": "CIN"}, {"name": "Jahan Dotson", "aliases": ["Jahan Dotson", "J. Dotson"], "pos": "WR", "team": "ATL"}, {"name": "Emanuel Wilson", "aliases": ["Emanuel Wilson", "E. Wilson"], "pos": "RB", "team": "SEA"}, {"name": "Malik Benson", "aliases": ["M. Benson", "Malik Benson"], "pos": "WR", "team": "LV"}, {"name": "Ty Johnson", "aliases": ["T. Johnson", "Ty Johnson"], "pos": "RB", "team": "BUF"}, {"name": "Chris Brooks", "aliases": ["Chris Brooks", "C. Brooks"], "pos": "RB", "team": "GB"}];
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
      const aria = (cur.getAttribute && cur.getAttribute('aria-label') || '').toLowerCase();
      
      if (
        cls.includes('queue') || cls.includes('playerlist') || cls.includes('player-list') || 
        cls.includes('available') || cls.includes('rankings') || cls.includes('ranking') ||
        cls.includes('search') || cls.includes('drawer') || cls.includes('watch') ||
        cls.includes('favorite') || cls.includes('star') || cls.includes('autopick') ||
        id.includes('queue') || id.includes('player-list') || id.includes('playerlist') ||
        id.includes('available') || id.includes('search') || id.includes('drawer') ||
        testId.includes('queue') || testId.includes('player-list') || testId.includes('playerlist') ||
        testId.includes('available') || testId.includes('search') || testId.includes('draft-queue') ||
        aria.includes('queue') || aria.includes('available') || aria.includes('search') ||
        aria.includes('star') || aria.includes('watch')
      ) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  function isUserElement(el, username) {
    if (!el || isInsideAvailableQueue(el)) return false;
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
