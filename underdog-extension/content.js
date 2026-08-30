// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = [{"name": "Jahmyr Gibbs", "aliases": ["Jahmyr Gibbs", "J. Gibbs"], "pos": "RB", "team": "DET"}, {"name": "Bijan Robinson", "aliases": ["B. Robinson", "Bijan Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Ja'Marr Chase", "aliases": ["Ja'Marr Chase", "J. Chase", "JaMarr Chase"], "pos": "WR", "team": "CIN"}, {"name": "Puka Nacua", "aliases": ["Puka Nacua", "P. Nacua"], "pos": "WR", "team": "LAR"}, {"name": "Jaxon Smith-Njigba", "aliases": ["Jaxon Smith-Njigba", "J. Smith-Njigba"], "pos": "WR", "team": "SEA"}, {"name": "Christian McCaffrey", "aliases": ["Christian McCaffrey", "C. McCaffrey"], "pos": "RB", "team": "SF"}, {"name": "Amon-Ra St. Brown", "aliases": ["Amon-Ra St Brown", "A. St. Brown", "Amon-Ra St. Brown"], "pos": "WR", "team": "DET"}, {"name": "Jonathan Taylor", "aliases": ["Jonathan Taylor", "J. Taylor"], "pos": "RB", "team": "IND"}, {"name": "James Cook", "aliases": ["James Cook", "J. Cook"], "pos": "RB", "team": "BUF"}, {"name": "CeeDee Lamb", "aliases": ["CeeDee Lamb", "C. Lamb"], "pos": "WR", "team": "DAL"}, {"name": "Justin Jefferson", "aliases": ["Justin Jefferson", "J. Jefferson"], "pos": "WR", "team": "MIN"}, {"name": "Saquon Barkley", "aliases": ["S. Barkley", "Saquon Barkley"], "pos": "RB", "team": "PHI"}, {"name": "Kenneth Walker III", "aliases": ["Kenneth Walker III", "Kenneth Walker", "K. Walker", "K. Walker III"], "pos": "RB", "team": "KC"}, {"name": "Chase Brown", "aliases": ["Chase Brown", "C. Brown"], "pos": "RB", "team": "CIN"}, {"name": "Omarion Hampton", "aliases": ["Omarion Hampton", "O. Hampton"], "pos": "RB", "team": "LAC"}, {"name": "De'Von Achane", "aliases": ["D. Achane", "De'Von Achane", "DeVon Achane"], "pos": "RB", "team": "MIA"}, {"name": "Derrick Henry", "aliases": ["D. Henry", "Derrick Henry"], "pos": "RB", "team": "BAL"}, {"name": "Ashton Jeanty", "aliases": ["Ashton Jeanty", "A. Jeanty"], "pos": "RB", "team": "LV"}, {"name": "A.J. Brown", "aliases": ["AJ Brown", "A.J. Brown", "A. Brown"], "pos": "WR", "team": "NE"}, {"name": "Brock Bowers", "aliases": ["Brock Bowers", "B. Bowers"], "pos": "TE", "team": "LV"}, {"name": "Nico Collins", "aliases": ["N. Collins", "Nico Collins"], "pos": "WR", "team": "HOU"}, {"name": "Drake London", "aliases": ["Drake London", "D. London"], "pos": "WR", "team": "ATL"}, {"name": "Malik Nabers", "aliases": ["M. Nabers", "Malik Nabers"], "pos": "WR", "team": "NYG"}, {"name": "George Pickens", "aliases": ["G. Pickens", "George Pickens"], "pos": "WR", "team": "DAL"}, {"name": "Chris Olave", "aliases": ["Chris Olave", "C. Olave"], "pos": "WR", "team": "NO"}, {"name": "Rashee Rice", "aliases": ["R. Rice", "Rashee Rice"], "pos": "WR", "team": "KC"}, {"name": "DeVonta Smith", "aliases": ["D. Smith", "DeVonta Smith"], "pos": "WR", "team": "PHI"}, {"name": "Trey McBride", "aliases": ["Trey McBride", "T. McBride"], "pos": "TE", "team": "ARI"}, {"name": "Jeremiyah Love", "aliases": ["J. Love", "Jeremiyah Love"], "pos": "RB", "team": "ARI"}, {"name": "Kyren Williams", "aliases": ["K. Williams", "Kyren Williams"], "pos": "RB", "team": "LAR"}, {"name": "Zay Flowers", "aliases": ["Z. Flowers", "Zay Flowers"], "pos": "WR", "team": "BAL"}, {"name": "Breece Hall", "aliases": ["B. Hall", "Breece Hall"], "pos": "RB", "team": "NYJ"}, {"name": "Javonte Williams", "aliases": ["Javonte Williams", "J. Williams"], "pos": "RB", "team": "DAL"}, {"name": "Ladd McConkey", "aliases": ["Ladd McConkey", "L. McConkey"], "pos": "WR", "team": "LAC"}, {"name": "Tee Higgins", "aliases": ["T. Higgins", "Tee Higgins"], "pos": "WR", "team": "CIN"}, {"name": "Emeka Egbuka", "aliases": ["Emeka Egbuka", "E. Egbuka"], "pos": "WR", "team": "TB"}, {"name": "Josh Allen", "aliases": ["J. Allen", "Josh Allen"], "pos": "QB", "team": "BUF"}, {"name": "Jaylen Waddle", "aliases": ["J. Waddle", "Jaylen Waddle"], "pos": "WR", "team": "DEN"}, {"name": "Garrett Wilson", "aliases": ["Garrett Wilson", "G. Wilson"], "pos": "WR", "team": "NYJ"}, {"name": "Travis Etienne", "aliases": ["T. Etienne", "Travis Etienne"], "pos": "RB", "team": "NO"}, {"name": "Tetairoa McMillan", "aliases": ["Tetairoa McMillan", "T. McMillan"], "pos": "WR", "team": "CAR"}, {"name": "Josh Jacobs", "aliases": ["Josh Jacobs", "J. Jacobs"], "pos": "RB", "team": "GB"}, {"name": "Colston Loveland", "aliases": ["C. Loveland", "Colston Loveland"], "pos": "TE", "team": "CHI"}, {"name": "D'Andre Swift", "aliases": ["D. Swift", "D'Andre Swift", "DAndre Swift"], "pos": "RB", "team": "CHI"}, {"name": "Luther Burden III", "aliases": ["Luther Burden", "Luther Burden III", "L. Burden", "L. Burden III"], "pos": "WR", "team": "CHI"}, {"name": "Cam Skattebo", "aliases": ["Cam Skattebo", "C. Skattebo"], "pos": "RB", "team": "NYG"}, {"name": "David Montgomery", "aliases": ["David Montgomery", "D. Montgomery"], "pos": "RB", "team": "HOU"}, {"name": "Terry McLaurin", "aliases": ["Terry McLaurin", "T. McLaurin"], "pos": "WR", "team": "WAS"}, {"name": "Bhayshul Tuten", "aliases": ["Bhayshul Tuten", "B. Tuten"], "pos": "RB", "team": "JAX"}, {"name": "Jameson Williams", "aliases": ["Jameson Williams", "J. Williams"], "pos": "WR", "team": "DET"}, {"name": "Davante Adams", "aliases": ["D. Adams", "Davante Adams"], "pos": "WR", "team": "LAR"}, {"name": "Mike Evans", "aliases": ["Mike Evans", "M. Evans"], "pos": "WR", "team": "SF"}, {"name": "DJ Moore", "aliases": ["D. Moore", "DJ Moore"], "pos": "WR", "team": "BUF"}, {"name": "Bucky Irving", "aliases": ["Bucky Irving", "B. Irving"], "pos": "RB", "team": "TB"}, {"name": "Quinshon Judkins", "aliases": ["Quinshon Judkins", "Q. Judkins"], "pos": "RB", "team": "CLE"}, {"name": "Parker Washington", "aliases": ["P. Washington", "Parker Washington"], "pos": "WR", "team": "JAX"}, {"name": "Lamar Jackson", "aliases": ["Lamar Jackson", "L. Jackson"], "pos": "QB", "team": "BAL"}, {"name": "Christian Watson", "aliases": ["Christian Watson", "C. Watson"], "pos": "WR", "team": "GB"}, {"name": "Rome Odunze", "aliases": ["R. Odunze", "Rome Odunze"], "pos": "WR", "team": "CHI"}, {"name": "Jadarian Price", "aliases": ["Jadarian Price", "J. Price"], "pos": "RB", "team": "SEA"}, {"name": "TreVeyon Henderson", "aliases": ["TreVeyon Henderson", "T. Henderson"], "pos": "RB", "team": "NE"}, {"name": "Carnell Tate", "aliases": ["C. Tate", "Carnell Tate"], "pos": "WR", "team": "TEN"}, {"name": "Tyler Warren", "aliases": ["T. Warren", "Tyler Warren"], "pos": "TE", "team": "IND"}, {"name": "Brian Thomas Jr.", "aliases": ["B. Thomas Jr.", "Brian Thomas Jr", "B. Thomas", "Brian Thomas Jr.", "Brian Thomas"], "pos": "WR", "team": "JAX"}, {"name": "Marvin Harrison Jr.", "aliases": ["M. Harrison", "Marvin Harrison Jr", "Marvin Harrison Jr.", "M. Harrison Jr.", "Marvin Harrison"], "pos": "WR", "team": "ARI"}, {"name": "Drake Maye", "aliases": ["Drake Maye", "D. Maye"], "pos": "QB", "team": "NE"}, {"name": "Rhamondre Stevenson", "aliases": ["Rhamondre Stevenson", "R. Stevenson"], "pos": "RB", "team": "NE"}, {"name": "Joe Burrow", "aliases": ["Joe Burrow", "J. Burrow"], "pos": "QB", "team": "CIN"}, {"name": "Jayden Daniels", "aliases": ["Jayden Daniels", "J. Daniels"], "pos": "QB", "team": "WAS"}, {"name": "Jaylen Warren", "aliases": ["J. Warren", "Jaylen Warren"], "pos": "RB", "team": "PIT"}, {"name": "Jalen Hurts", "aliases": ["Jalen Hurts", "J. Hurts"], "pos": "QB", "team": "PHI"}, {"name": "Caleb Williams", "aliases": ["C. Williams", "Caleb Williams"], "pos": "QB", "team": "CHI"}, {"name": "DK Metcalf", "aliases": ["D. Metcalf", "DK Metcalf"], "pos": "WR", "team": "PIT"}, {"name": "Quentin Johnston", "aliases": ["Quentin Johnston", "Q. Johnston"], "pos": "WR", "team": "LAC"}, {"name": "Jonathon Brooks", "aliases": ["J. Brooks", "Jonathon Brooks"], "pos": "RB", "team": "CAR"}, {"name": "Tucker Kraft", "aliases": ["Tucker Kraft", "T. Kraft"], "pos": "TE", "team": "GB"}, {"name": "Tony Pollard", "aliases": ["T. Pollard", "Tony Pollard"], "pos": "RB", "team": "TEN"}, {"name": "Jayden Reed", "aliases": ["Jayden Reed", "J. Reed"], "pos": "WR", "team": "GB"}, {"name": "Dak Prescott", "aliases": ["Dak Prescott", "D. Prescott"], "pos": "QB", "team": "DAL"}, {"name": "Makai Lemon", "aliases": ["Makai Lemon", "M. Lemon"], "pos": "WR", "team": "PHI"}, {"name": "Courtland Sutton", "aliases": ["Courtland Sutton", "C. Sutton"], "pos": "WR", "team": "DEN"}, {"name": "Josh Downs", "aliases": ["J. Downs", "Josh Downs"], "pos": "WR", "team": "IND"}, {"name": "Rico Dowdle", "aliases": ["R. Dowdle", "Rico Dowdle"], "pos": "RB", "team": "PIT"}, {"name": "Justin Herbert", "aliases": ["Justin Herbert", "J. Herbert"], "pos": "QB", "team": "LAC"}, {"name": "Chris Godwin Jr.", "aliases": ["C. Godwin", "C. Godwin Jr.", "Chris Godwin Jr", "Chris Godwin", "Chris Godwin Jr."], "pos": "WR", "team": "TB"}, {"name": "Trevor Lawrence", "aliases": ["T. Lawrence", "Trevor Lawrence"], "pos": "QB", "team": "JAX"}, {"name": "Blake Corum", "aliases": ["Blake Corum", "B. Corum"], "pos": "RB", "team": "LAR"}, {"name": "RJ Harvey", "aliases": ["R. Harvey", "RJ Harvey"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Addison", "aliases": ["Jordan Addison", "J. Addison"], "pos": "WR", "team": "MIN"}, {"name": "Michael Wilson", "aliases": ["M. Wilson", "Michael Wilson"], "pos": "WR", "team": "ARI"}, {"name": "Sam LaPorta", "aliases": ["Sam LaPorta", "S. LaPorta"], "pos": "TE", "team": "DET"}, {"name": "Stefon Diggs", "aliases": ["Stefon Diggs", "S. Diggs"], "pos": "WR", "team": "WAS"}, {"name": "Jordyn Tyson", "aliases": ["Jordyn Tyson", "J. Tyson"], "pos": "WR", "team": "NO"}, {"name": "Alec Pierce", "aliases": ["Alec Pierce", "A. Pierce"], "pos": "WR", "team": "IND"}, {"name": "J.K. Dobbins", "aliases": ["J. Dobbins", "J.K. Dobbins", "JK Dobbins"], "pos": "RB", "team": "DEN"}, {"name": "Jordan Mason", "aliases": ["J. Mason", "Jordan Mason"], "pos": "RB", "team": "MIN"}, {"name": "Patrick Mahomes", "aliases": ["Patrick Mahomes", "P. Mahomes"], "pos": "QB", "team": "KC"}, {"name": "Chuba Hubbard", "aliases": ["C. Hubbard", "Chuba Hubbard"], "pos": "RB", "team": "CAR"}, {"name": "Jacory Croskey-Merritt", "aliases": ["Jacory Croskey-Merritt", "J. Croskey-Merritt"], "pos": "RB", "team": "WAS"}, {"name": "Matthew Golden", "aliases": ["Matthew Golden", "M. Golden"], "pos": "WR", "team": "GB"}, {"name": "Michael Pittman", "aliases": ["Michael Pittman", "M. Pittman"], "pos": "WR", "team": "PIT"}, {"name": "Kyle Pitts", "aliases": ["K. Pitts", "Kyle Pitts"], "pos": "TE", "team": "ATL"}, {"name": "Brock Purdy", "aliases": ["B. Purdy", "Brock Purdy"], "pos": "QB", "team": "SF"}, {"name": "Jaxson Dart", "aliases": ["J. Dart", "Jaxson Dart"], "pos": "QB", "team": "NYG"}, {"name": "Harold Fannin Jr.", "aliases": ["Harold Fannin Jr.", "Harold Fannin Jr", "H. Fannin Jr.", "H. Fannin", "Harold Fannin"], "pos": "TE", "team": "CLE"}, {"name": "Bo Nix", "aliases": ["Bo Nix", "B. Nix"], "pos": "QB", "team": "DEN"}, {"name": "Xavier Worthy", "aliases": ["Xavier Worthy", "X. Worthy"], "pos": "WR", "team": "KC"}, {"name": "Kyle Monangai", "aliases": ["Kyle Monangai", "K. Monangai"], "pos": "RB", "team": "CHI"}, {"name": "Kenny Gainwell", "aliases": ["Kenny Gainwell", "K. Gainwell"], "pos": "RB", "team": "TB"}, {"name": "De'Zhaun Stribling", "aliases": ["DeZhaun Stribling", "De'Zhaun Stribling", "D. Stribling"], "pos": "WR", "team": "SF"}, {"name": "Matthew Stafford", "aliases": ["M. Stafford", "Matthew Stafford"], "pos": "QB", "team": "LAR"}, {"name": "KC Concepcion", "aliases": ["KC Concepcion", "K. Concepcion"], "pos": "WR", "team": "CLE"}, {"name": "George Kittle", "aliases": ["George Kittle", "G. Kittle"], "pos": "TE", "team": "SF"}, {"name": "Jared Goff", "aliases": ["J. Goff", "Jared Goff"], "pos": "QB", "team": "DET"}, {"name": "Wan'Dale Robinson", "aliases": ["Wan'Dale Robinson", "WanDale Robinson", "W. Robinson"], "pos": "WR", "team": "TEN"}, {"name": "Kyler Murray", "aliases": ["Kyler Murray", "K. Murray"], "pos": "QB", "team": "MIN"}, {"name": "Jordan Love", "aliases": ["J. Love", "Jordan Love"], "pos": "QB", "team": "GB"}, {"name": "Romeo Doubs", "aliases": ["R. Doubs", "Romeo Doubs"], "pos": "WR", "team": "NE"}, {"name": "Rachaad White", "aliases": ["Rachaad White", "R. White"], "pos": "RB", "team": "WAS"}, {"name": "Dalton Kincaid", "aliases": ["D. Kincaid", "Dalton Kincaid"], "pos": "TE", "team": "BUF"}, {"name": "Jakobi Meyers", "aliases": ["J. Meyers", "Jakobi Meyers"], "pos": "WR", "team": "JAX"}, {"name": "Baker Mayfield", "aliases": ["B. Mayfield", "Baker Mayfield"], "pos": "QB", "team": "TB"}, {"name": "Travis Kelce", "aliases": ["Travis Kelce", "T. Kelce"], "pos": "TE", "team": "KC"}, {"name": "Chris Rodriguez Jr.", "aliases": ["Chris Rodriguez Jr", "C. Rodriguez Jr.", "Chris Rodriguez", "Chris Rodriguez Jr.", "C. Rodriguez"], "pos": "RB", "team": "JAX"}, {"name": "Isaiah Likely", "aliases": ["I. Likely", "Isaiah Likely"], "pos": "TE", "team": "NYG"}, {"name": "Tyler Shough", "aliases": ["Tyler Shough", "T. Shough"], "pos": "QB", "team": "NO"}, {"name": "Deebo Samuel Sr.", "aliases": ["Deebo Samuel Sr", "Deebo Samuel", "D. Samuel Sr.", "D. Samuel", "Deebo Samuel Sr."], "pos": "WR", "team": "SF"}, {"name": "Aaron Jones", "aliases": ["Aaron Jones", "A. Jones"], "pos": "RB", "team": "MIN"}, {"name": "Jalen Coker", "aliases": ["J. Coker", "Jalen Coker"], "pos": "WR", "team": "CAR"}, {"name": "Keaton Mitchell", "aliases": ["Keaton Mitchell", "K. Mitchell"], "pos": "RB", "team": "LAC"}, {"name": "Khalil Shakir", "aliases": ["K. Shakir", "Khalil Shakir"], "pos": "WR", "team": "BUF"}, {"name": "Dallas Goedert", "aliases": ["Dallas Goedert", "D. Goedert"], "pos": "TE", "team": "PHI"}, {"name": "Mark Andrews", "aliases": ["M. Andrews", "Mark Andrews"], "pos": "TE", "team": "BAL"}, {"name": "Malik Willis", "aliases": ["Malik Willis", "M. Willis"], "pos": "QB", "team": "MIA"}, {"name": "Rashid Shaheed", "aliases": ["R. Shaheed", "Rashid Shaheed"], "pos": "WR", "team": "SEA"}, {"name": "Jake Ferguson", "aliases": ["Jake Ferguson", "J. Ferguson"], "pos": "TE", "team": "DAL"}, {"name": "Woody Marks", "aliases": ["Woody Marks", "W. Marks"], "pos": "RB", "team": "HOU"}, {"name": "Tyler Allgeier", "aliases": ["T. Allgeier", "Tyler Allgeier"], "pos": "RB", "team": "ARI"}, {"name": "Denzel Boston", "aliases": ["D. Boston", "Denzel Boston"], "pos": "WR", "team": "CLE"}, {"name": "Juwan Johnson", "aliases": ["Juwan Johnson", "J. Johnson"], "pos": "TE", "team": "NO"}, {"name": "Sam Darnold", "aliases": ["Sam Darnold", "S. Darnold"], "pos": "QB", "team": "SEA"}, {"name": "Mike Washington Jr.", "aliases": ["Mike Washington Jr", "Mike Washington Jr.", "M. Washington Jr.", "Mike Washington", "M. Washington"], "pos": "RB", "team": "LV"}, {"name": "Jonah Coleman", "aliases": ["Jonah Coleman", "J. Coleman"], "pos": "RB", "team": "DEN"}, {"name": "Daniel Jones", "aliases": ["D. Jones", "Daniel Jones"], "pos": "QB", "team": "IND"}, {"name": "C.J. Stroud", "aliases": ["C. Stroud", "CJ Stroud", "C.J. Stroud"], "pos": "QB", "team": "HOU"}, {"name": "Chig Okonkwo", "aliases": ["Chig Okonkwo", "C. Okonkwo"], "pos": "TE", "team": "WAS"}, {"name": "MarShawn Lloyd", "aliases": ["MarShawn Lloyd", "M. Lloyd"], "pos": "RB", "team": "GB"}, {"name": "Brenton Strange", "aliases": ["Brenton Strange", "B. Strange"], "pos": "TE", "team": "JAX"}, {"name": "Jalen Nailor", "aliases": ["Jalen Nailor", "J. Nailor"], "pos": "WR", "team": "LV"}, {"name": "Tre Tucker", "aliases": ["T. Tucker", "Tre Tucker"], "pos": "WR", "team": "LV"}, {"name": "Ja'Kobi Lane", "aliases": ["Ja'Kobi Lane", "J. Lane", "JaKobi Lane"], "pos": "WR", "team": "BAL"}, {"name": "Tank Bigsby", "aliases": ["T. Bigsby", "Tank Bigsby"], "pos": "RB", "team": "PHI"}, {"name": "Tyrone Tracy Jr.", "aliases": ["T. Tracy", "T. Tracy Jr.", "Tyrone Tracy Jr.", "Tyrone Tracy Jr", "Tyrone Tracy"], "pos": "RB", "team": "NYG"}, {"name": "Hunter Henry", "aliases": ["Hunter Henry", "H. Henry"], "pos": "TE", "team": "NE"}, {"name": "Keenan Allen", "aliases": ["Keenan Allen", "K. Allen"], "pos": "WR", "team": "IND"}, {"name": "Tyjae Spears", "aliases": ["Tyjae Spears", "T. Spears"], "pos": "RB", "team": "TEN"}, {"name": "Jalen McMillan", "aliases": ["Jalen McMillan", "J. McMillan"], "pos": "WR", "team": "TB"}, {"name": "Cam Ward", "aliases": ["Cam Ward", "C. Ward"], "pos": "QB", "team": "TEN"}, {"name": "Terrance Ferguson", "aliases": ["Terrance Ferguson", "T. Ferguson"], "pos": "TE", "team": "LAR"}, {"name": "Travis Hunter", "aliases": ["Travis Hunter", "T. Hunter"], "pos": "WR", "team": "JAX"}, {"name": "Dontayvion Wicks", "aliases": ["D. Wicks", "Dontayvion Wicks"], "pos": "WR", "team": "PHI"}, {"name": "Tre Harris", "aliases": ["Tre Harris", "T. Harris"], "pos": "WR", "team": "LAC"}, {"name": "Dalton Schultz", "aliases": ["D. Schultz", "Dalton Schultz"], "pos": "TE", "team": "HOU"}, {"name": "Zach Charbonnet", "aliases": ["Zach Charbonnet", "Z. Charbonnet"], "pos": "RB", "team": "SEA"}, {"name": "Cyrus Allen", "aliases": ["Cyrus Allen", "C. Allen"], "pos": "WR", "team": "KC"}, {"name": "Bryce Young", "aliases": ["Bryce Young", "B. Young"], "pos": "QB", "team": "CAR"}, {"name": "T.J. Hockenson", "aliases": ["T. Hockenson", "TJ Hockenson", "T.J. Hockenson"], "pos": "TE", "team": "MIN"}, {"name": "Ryan Flournoy", "aliases": ["R. Flournoy", "Ryan Flournoy"], "pos": "WR", "team": "DAL"}, {"name": "Adonai Mitchell", "aliases": ["Adonai Mitchell", "A. Mitchell"], "pos": "WR", "team": "NYJ"}, {"name": "Omar Cooper Jr.", "aliases": ["Omar Cooper Jr", "O. Cooper", "Omar Cooper", "O. Cooper Jr.", "Omar Cooper Jr."], "pos": "WR", "team": "NYJ"}, {"name": "Dylan Sampson", "aliases": ["Dylan Sampson", "D. Sampson"], "pos": "RB", "team": "CLE"}, {"name": "Pat Bryant", "aliases": ["Pat Bryant", "P. Bryant"], "pos": "WR", "team": "DEN"}, {"name": "Jauan Jennings", "aliases": ["J. Jennings", "Jauan Jennings"], "pos": "WR", "team": "MIN"}, {"name": "Malik Washington", "aliases": ["Malik Washington", "M. Washington"], "pos": "WR", "team": "MIA"}, {"name": "AJ Barner", "aliases": ["AJ Barner", "A. Barner"], "pos": "TE", "team": "SEA"}, {"name": "Caleb Douglas", "aliases": ["Caleb Douglas", "C. Douglas"], "pos": "WR", "team": "MIA"}, {"name": "Jaydon Blue", "aliases": ["J. Blue", "Jaydon Blue"], "pos": "RB", "team": "DAL"}, {"name": "Kenyon Sadiq", "aliases": ["Kenyon Sadiq", "K. Sadiq"], "pos": "TE", "team": "NYJ"}, {"name": "Tank Dell", "aliases": ["Tank Dell", "T. Dell"], "pos": "WR", "team": "HOU"}, {"name": "Aaron Rodgers", "aliases": ["A. Rodgers", "Aaron Rodgers"], "pos": "QB", "team": "PIT"}, {"name": "Kayshon Boutte", "aliases": ["K. Boutte", "Kayshon Boutte"], "pos": "WR", "team": "HOU"}, {"name": "Brian Robinson", "aliases": ["Brian Robinson", "B. Robinson"], "pos": "RB", "team": "ATL"}, {"name": "Alvin Kamara", "aliases": ["A. Kamara", "Alvin Kamara"], "pos": "RB", "team": "NO"}, {"name": "Braelon Allen", "aliases": ["B. Allen", "Braelon Allen"], "pos": "RB", "team": "NYJ"}, {"name": "Devaughn Vele", "aliases": ["D. Vele", "Devaughn Vele"], "pos": "WR", "team": "NO"}, {"name": "Ray Davis", "aliases": ["Ray Davis", "R. Davis"], "pos": "RB", "team": "BUF"}, {"name": "Isiah Pacheco", "aliases": ["I. Pacheco", "Isiah Pacheco"], "pos": "RB", "team": "DET"}, {"name": "Fernando Mendoza", "aliases": ["Fernando Mendoza", "F. Mendoza"], "pos": "QB", "team": "LV"}, {"name": "Greg Dulcich", "aliases": ["Greg Dulcich", "G. Dulcich"], "pos": "TE", "team": "MIA"}, {"name": "Oronde Gadsden II", "aliases": ["Oronde Gadsden", "O. Gadsden", "O. Gadsden II", "Oronde Gadsden II"], "pos": "TE", "team": "LAC"}, {"name": "Emmett Johnson", "aliases": ["Emmett Johnson", "E. Johnson"], "pos": "RB", "team": "KC"}, {"name": "Geno Smith", "aliases": ["Geno Smith", "G. Smith"], "pos": "QB", "team": "NYJ"}, {"name": "Kaelon Black", "aliases": ["Kaelon Black", "K. Black"], "pos": "RB", "team": "SF"}, {"name": "Malachi Fields", "aliases": ["Malachi Fields", "M. Fields"], "pos": "WR", "team": "NYG"}, {"name": "Cade Otton", "aliases": ["Cade Otton", "C. Otton"], "pos": "TE", "team": "TB"}, {"name": "Zachariah Branch", "aliases": ["Z. Branch", "Zachariah Branch"], "pos": "WR", "team": "ATL"}, {"name": "Gunnar Helm", "aliases": ["Gunnar Helm", "G. Helm"], "pos": "TE", "team": "TEN"}, {"name": "Pat Freiermuth", "aliases": ["P. Freiermuth", "Pat Freiermuth"], "pos": "TE", "team": "PIT"}, {"name": "Jacoby Brissett", "aliases": ["Jacoby Brissett", "J. Brissett"], "pos": "QB", "team": "ARI"}, {"name": "Jaylin Noel", "aliases": ["J. Noel", "Jaylin Noel"], "pos": "WR", "team": "HOU"}, {"name": "Ted Hurst III", "aliases": ["T. Hurst III", "T. Hurst", "Ted Hurst", "Ted Hurst III"], "pos": "WR", "team": "TB"}, {"name": "Isaac TeSlaa", "aliases": ["Isaac TeSlaa", "I. TeSlaa"], "pos": "WR", "team": "DET"}, {"name": "Chris Bell", "aliases": ["Chris Bell", "C. Bell"], "pos": "WR", "team": "MIA"}, {"name": "Jerry Jeudy", "aliases": ["Jerry Jeudy", "J. Jeudy"], "pos": "WR", "team": "CLE"}, {"name": "Calvin Ridley", "aliases": ["C. Ridley", "Calvin Ridley"], "pos": "WR", "team": "TEN"}, {"name": "Najee Harris", "aliases": ["N. Harris", "Najee Harris"], "pos": "RB", "team": "NYG"}, {"name": "Germie Bernard", "aliases": ["Germie Bernard", "G. Bernard"], "pos": "WR", "team": "PIT"}, {"name": "Sean Tucker", "aliases": ["Sean Tucker", "S. Tucker"], "pos": "RB", "team": "TB"}, {"name": "David Njoku", "aliases": ["David Njoku", "D. Njoku"], "pos": "TE", "team": "LAC"}, {"name": "Kimani Vidal", "aliases": ["Kimani Vidal", "K. Vidal"], "pos": "RB", "team": "LAC"}, {"name": "Charlie Kolar", "aliases": ["C. Kolar", "Charlie Kolar"], "pos": "TE", "team": "LAC"}, {"name": "Rashod Bateman", "aliases": ["Rashod Bateman", "R. Bateman"], "pos": "WR", "team": "BAL"}, {"name": "Cooper Kupp", "aliases": ["C. Kupp", "Cooper Kupp"], "pos": "WR", "team": "SEA"}, {"name": "Colby Parkinson", "aliases": ["C. Parkinson", "Colby Parkinson"], "pos": "TE", "team": "LAR"}, {"name": "Kaytron Allen", "aliases": ["K. Allen", "Kaytron Allen"], "pos": "RB", "team": "WAS"}, {"name": "Michael Penix Jr.", "aliases": ["M. Penix Jr.", "M. Penix", "Michael Penix Jr.", "Michael Penix", "Michael Penix Jr"], "pos": "QB", "team": "ATL"}, {"name": "Evan Engram", "aliases": ["Evan Engram", "E. Engram"], "pos": "TE", "team": "DEN"}, {"name": "Justice Hill", "aliases": ["Justice Hill", "J. Hill"], "pos": "RB", "team": "BAL"}, {"name": "Samaje Perine", "aliases": ["Samaje Perine", "S. Perine"], "pos": "RB", "team": "CIN"}, {"name": "Tua Tagovailoa", "aliases": ["Tua Tagovailoa", "T. Tagovailoa"], "pos": "QB", "team": "ATL"}, {"name": "George Holani", "aliases": ["G. Holani", "George Holani"], "pos": "RB", "team": "SEA"}, {"name": "Michael Mayer", "aliases": ["M. Mayer", "Michael Mayer"], "pos": "TE", "team": "LV"}, {"name": "Mike Gesicki", "aliases": ["Mike Gesicki", "M. Gesicki"], "pos": "TE", "team": "CIN"}, {"name": "Jordan James", "aliases": ["Jordan James", "J. James"], "pos": "RB", "team": "SF"}, {"name": "Antonio Williams", "aliases": ["A. Williams", "Antonio Williams"], "pos": "WR", "team": "WAS"}, {"name": "Tyquan Thornton", "aliases": ["T. Thornton", "Tyquan Thornton"], "pos": "WR", "team": "KC"}, {"name": "Deshaun Watson", "aliases": ["Deshaun Watson", "D. Watson"], "pos": "QB", "team": "CLE"}, {"name": "Andrei Iosivas", "aliases": ["Andrei Iosivas", "A. Iosivas"], "pos": "WR", "team": "CIN"}, {"name": "Troy Franklin", "aliases": ["Troy Franklin", "T. Franklin"], "pos": "WR", "team": "DEN"}, {"name": "Darnell Mooney", "aliases": ["Darnell Mooney", "D. Mooney"], "pos": "WR", "team": "NYG"}, {"name": "Jack Bech", "aliases": ["J. Bech", "Jack Bech"], "pos": "WR", "team": "LV"}, {"name": "Demond Claiborne", "aliases": ["D. Claiborne", "Demond Claiborne"], "pos": "RB", "team": "MIN"}, {"name": "James Conner", "aliases": ["J. Conner", "James Conner"], "pos": "RB", "team": "ARI"}, {"name": "Bryce Lance", "aliases": ["Bryce Lance", "B. Lance"], "pos": "WR", "team": "NO"}, {"name": "Kirk Cousins", "aliases": ["Kirk Cousins", "K. Cousins"], "pos": "QB", "team": "LV"}, {"name": "Darius Slayton", "aliases": ["Darius Slayton", "D. Slayton"], "pos": "WR", "team": "NYG"}, {"name": "Zavion Thomas", "aliases": ["Z. Thomas", "Zavion Thomas"], "pos": "WR", "team": "CHI"}, {"name": "Colbie Young", "aliases": ["Colbie Young", "C. Young"], "pos": "WR", "team": "CIN"}, {"name": "Jahan Dotson", "aliases": ["Jahan Dotson", "J. Dotson"], "pos": "WR", "team": "ATL"}, {"name": "Emanuel Wilson", "aliases": ["Emanuel Wilson", "E. Wilson"], "pos": "RB", "team": "SEA"}, {"name": "Malik Benson", "aliases": ["Malik Benson", "M. Benson"], "pos": "WR", "team": "LV"}, {"name": "Ty Johnson", "aliases": ["T. Johnson", "Ty Johnson"], "pos": "RB", "team": "BUF"}, {"name": "Chris Brooks", "aliases": ["Chris Brooks", "C. Brooks"], "pos": "RB", "team": "GB"}];
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
