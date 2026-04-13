const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================================
// USER PERSISTENCE
// ============================================================
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

function loadDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return { users: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { return { users: {} }; }
}
function saveDB(db) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) { console.error('DB save error:', e); }
}
function hashPw(pw) {
  return crypto.createHash('sha256').update(pw + 'cio_s4lt_2024').digest('hex');
}
function genId() { return crypto.randomBytes(10).toString('hex'); }

// ── REST Auth ────────────────────────────────────────────────
app.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
  const db = loadDB();
  const existing = Object.values(db.users).find(u => u.email === email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const userId = genId();
  db.users[userId] = {
    name: name.trim().slice(0, 20),
    email: email.toLowerCase().trim(),
    passwordHash: hashPw(password),
    wins: 0, totalGames: 0,
    createdAt: new Date().toISOString(),
  };
  saveDB(db);
  const u = db.users[userId];
  res.json({ userId, name: u.name, wins: u.wins, totalGames: u.totalGames });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db = loadDB();
  const entry = Object.entries(db.users).find(([,u]) => u.email === email.toLowerCase().trim());
  if (!entry || entry[1].passwordHash !== hashPw(password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const [userId, u] = entry;
  res.json({ userId, name: u.name, wins: u.wins, totalGames: u.totalGames });
});

app.get('/api/leaderboard', (_req, res) => {
  const db = loadDB();
  const board = Object.entries(db.users)
    .map(([, u]) => ({ name: u.name, wins: u.wins, totalGames: u.totalGames }))
    .sort((a, b) => b.wins - a.wins || b.totalGames - a.totalGames)
    .slice(0, 100);
  res.json(board);
});

function recordWin(userId) {
  if (!userId) return;
  const db = loadDB();
  if (db.users[userId]) { db.users[userId].wins++; saveDB(db); }
}
function recordGame(userId) {
  if (!userId) return;
  const db = loadDB();
  if (db.users[userId]) { db.users[userId].totalGames++; saveDB(db); }
}

// ============================================================
// CONSTANTS
// ============================================================
const MAX_PLAYERS    = 10;
const MIN_PLAYERS    = 5;
const DISCUSSION_SEC = 60;
const VOTING_SEC     = 30;
const DAILY_SEC      = 90;
const DUEL_SEC       = 120;
const INTRO_SEC      = 4;
const RESULTS_SEC    = 5;
const ARENA_INTRO_SEC= 6;
const ELIM_SEC       = 6;

const PHASE = {
  LOBBY:         'lobby',
  DAILY_INTRO:   'daily_intro',
  DAILY:         'daily',
  DAILY_RESULTS: 'daily_results',
  DISCUSSION:    'discussion',
  VOTING:        'voting',
  VOTE_RESULTS:  'vote_results',
  ARENA_INTRO:   'arena_intro',
  ARENA:         'arena',
  ARENA_RESULTS: 'arena_results',
  ELIMINATION:   'elimination',
  GAME_OVER:     'game_over',
};

// Separate pools — daily != arena (10 each)
const DAILY_POOL = [
  'memory',       // Memory Match
  'quickmath',    // Quick Math
  'colorseq',     // Color Sequence
  'wordscramble', // Word Scramble
  'tessellations',// Tessellations
  'patternmatch', // Pattern Match
  'emojisort',    // Emoji Sort
  'curling',      // Curling
  'jumprope',     // Jump Rope
  'minesweeper',  // Minesweeper Light
  'tangram',      // Tangram
  'colormatch',   // Color Match
];
const ARENA_POOL = [
  'trivia',       // Trivia Showdown
  'reaction',     // Reaction Test
  'numberhunt',   // Number Hunt
  'tapfrenzy',    // Tap Frenzy
  'fastfingers',  // Fast Fingers
  'gridlock',     // Grid Lock
  'speedsort',    // Speed Sort
  'findbomb',     // Find the Bomb
  'mathrace',     // Math Race
  'simonextreme', // Simon Extreme (faster color seq)
  'tunneldodge',  // Tunnel Dodge
];

// ============================================================
// PUZZLE DATA
// ============================================================
const EMOJI_SET = ['🔥','⚡','💎','🏆','🎯','💣','🌊','🎲','👑','🦁','🐺','🦊','🐍','🦅','🌟','💰','🎭','⚔️','🏅','🎪'];

const MATH_BANK = [
  {q:'7 × 8',     a:56,  w:[48,54,63]},
  {q:'144 ÷ 12',  a:12,  w:[11,13,14]},
  {q:'15 + 28',   a:43,  w:[41,44,45]},
  {q:'92 − 37',   a:55,  w:[54,56,65]},
  {q:'6 × 9',     a:54,  w:[48,56,63]},
  {q:'√64',       a:8,   w:[6,7,9]},
  {q:'17 × 3',    a:51,  w:[48,52,54]},
  {q:'100 ÷ 4',   a:25,  w:[20,24,26]},
  {q:'13²',       a:169, w:[156,163,172]},
  {q:'48 + 37',   a:85,  w:[83,84,86]},
  {q:'9 × 7',     a:63,  w:[54,62,72]},
  {q:'200 − 143', a:57,  w:[55,58,67]},
  {q:'8 × 8',     a:64,  w:[56,63,72]},
  {q:'121 ÷ 11',  a:11,  w:[9,10,12]},
  {q:'45 + 56',   a:101, w:[99,100,102]},
  {q:'14 × 6',    a:84,  w:[78,80,90]},
  {q:'256 ÷ 16',  a:16,  w:[14,15,18]},
  {q:'√144',      a:12,  w:[10,11,13]},
];

const WORD_BANK = [
  {word:'CHALLENGE', hint:'Social competition'},
  {word:'ALLIANCE',  hint:'Team pact'},
  {word:'STRATEGY',  hint:'Game plan'},
  {word:'BETRAYAL',  hint:'Backstab'},
  {word:'CHAMPION',  hint:'Winner'},
  {word:'ENDURANCE', hint:'Keep going'},
  {word:'ELIMINATE', hint:'Vote off'},
  {word:'VICTORY',   hint:'Winning'},
  {word:'COMPETE',   hint:'Go against'},
  {word:'REVENGE',   hint:'Get back'},
  {word:'SURVIVE',   hint:'Stay alive'},
  {word:'MISSION',   hint:'The task'},
  {word:'DOMINATE',  hint:'Win big'},
  {word:'VETERAN',   hint:'Experienced player'},
  {word:'ROOKIE',    hint:'Newcomer'},
];

const TRIVIA_BANK = [
  {q:'Social deduction games are also called?',       a:'Mafia-style games',     w:['Strategy games','Word games','Card games']},
  {q:'In Battle Royale games, how many players win?', a:'1',                     w:['2','3','5']},
  {q:'Which skill is most key in social games?',      a:'Persuasion',            w:['Speed','Memory','Math']},
  {q:'A player who hides their true role is called?', a:'A wolf in sheep clothing',w:['A rookie','A veteran','A champion']},
  {q:'What does "throwing the comp" mean?',           a:'Losing on purpose',     w:['Winning too fast','Quitting','Voting yourself']},
  {q:'An "alliance" in a game is?',                   a:'A secret agreement',    w:['A scoring bonus','A penalty','A tiebreaker']},
  {q:'"Social capital" in a game means?',             a:'Trust and relationships',w:['Total points','Win streak','Vote count']},
  {q:'First player targeted is often called?',        a:'The weakest link',      w:['The hero','The anchor','The shield']},
  {q:'Winning a tiebreaker is called?',               a:'Clutching up',          w:['Lucky break','Cheating','Sabotage']},
  {q:'A "blindside" in a game means?',                a:'Surprise elimination',  w:['Bonus round','Free pass','Power vote']},
  {q:'What is a "throwaway vote"?',                   a:'A vote that doesnt matter', w:['A super vote','A veto','A penalty']},
  {q:'When all players vote the same it is called?',  a:'A unanimous vote',      w:['A super vote','A sweep','A default']},
  {q:'"Going rogue" in an alliance means?',           a:'Acting independently',  w:['Getting extra votes','Winning immunity','Joining another team']},
  {q:'A "comp beast" is someone who?',                a:'Wins every challenge',  w:['Talks too much','Never votes','Hides all game']},
  {q:'The last two players compete in?',              a:'The Final',             w:['The Duel','The Vote','The Gauntlet']},
];

const COLORS = ['RED','BLUE','GREEN','YELLOW','PURPLE'];
const COLOR_HEX = {RED:'#e74c3c',BLUE:'#3498db',GREEN:'#2ecc71',YELLOW:'#f1c40f',PURPLE:'#9b59b6'};

// Tessellation pattern colors
const TESS_PALETTES = [
  ['#e74c3c','#3498db'],
  ['#e74c3c','#3498db','#2ecc71'],
  ['#e74c3c','#3498db','#2ecc71','#f1c40f'],
  ['#9b59b6','#e67e22'],
  ['#9b59b6','#1abc9c','#e74c3c'],
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function scrambleWord(w) {
  let s; do { s = w.split('').sort(() => Math.random() - 0.5).join(''); } while (s === w); return s;
}

const PUZZLE_NAMES = {
  // Daily
  memory:        '🃏 Memory Match',
  quickmath:     '🔢 Quick Math',
  colorseq:      '🎨 Color Sequence',
  wordscramble:  '🔤 Word Scramble',
  tessellations: '🔷 Tessellations',
  patternmatch:  '🧩 Pattern Match',
  emojisort:     '🗂 Emoji Sort',
  curling:       '🥌 Curling',
  jumprope:      '🪢 Jump Rope',
  minesweeper:   '💣 Minesweeper',
  tangram:       '🔷 Tangram',
  colormatch:    '🎨 Color Match',
  // Arena
  trivia:        '❓ Trivia Showdown',
  reaction:      '⚡ Reaction Test',
  numberhunt:    '🎯 Number Hunt',
  tapfrenzy:     '👆 Tap Frenzy',
  fastfingers:   '⌨ Fast Fingers',
  gridlock:      '🔍 Grid Lock',
  speedsort:     '⬆ Speed Sort',
  findbomb:      '💣 Find the Bomb',
  mathrace:      '🏎 Math Race',
  simonextreme:  '🔴 Simon Extreme',
  tunneldodge:   '🚀 Tunnel Dodge',
};

function makePuzzle(type) {
  switch (type) {
    case 'memory': {
      const pairs = shuffle(EMOJI_SET).slice(0, 6);
      const cards = shuffle([...pairs, ...pairs]).map((e, i) => ({ id: i, emoji: e }));
      return { type, cards, pairs: 6 };
    }
    case 'quickmath': {
      const qs = shuffle(MATH_BANK).slice(0, 8).map(q => ({
        q: q.q, a: q.a, choices: shuffle([q.a, ...q.w])
      }));
      return { type, questions: qs };
    }
    case 'reaction': {
      const delays = Array.from({length:5}, () => Math.floor(Math.random()*3000)+1500);
      return { type, rounds: 5, delays };
    }
    case 'wordscramble': {
      const words = shuffle(WORD_BANK).slice(0, 6).map(w => ({
        word: w.word, hint: w.hint, scrambled: scrambleWord(w.word)
      }));
      return { type, words };
    }
    case 'colorseq': {
      const seq = Array.from({length:15}, () => COLORS[Math.floor(Math.random()*COLORS.length)]);
      return { type, sequence: seq, colors: COLORS, colorHex: COLOR_HEX };
    }
    case 'trivia': {
      const qs = shuffle(TRIVIA_BANK).slice(0, 8).map(q => ({
        q: q.q, a: q.a, choices: shuffle([q.a, ...q.w])
      }));
      return { type, questions: qs };
    }
    case 'tessellations': {
      const patternTypes = ['checker','diagonal','cross','stripes'];
      const pt = patternTypes[Math.floor(Math.random() * patternTypes.length)];
      const palette = shuffle(TESS_PALETTES)[0];
      const numColors = pt === 'checker' ? 2 : pt === 'diagonal' ? 3 : pt === 'cross' ? 4 : 3;
      const colors = palette.slice(0, Math.min(numColors, palette.length));
      const size = 5;
      const grid = [];
      for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
          let idx;
          if      (pt === 'checker')   idx = (r + c) % 2;
          else if (pt === 'diagonal')  idx = (r + c) % 3;
          else if (pt === 'cross')     idx = (r % 2) * 2 + (c % 2);
          else                         idx = r % 3; // stripes
          row.push(idx % colors.length);
        }
        grid.push(row);
      }
      const allCells = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) allCells.push([r, c]);
      const hidden = shuffle(allCells).slice(0, 9);
      return { type, grid, hidden, colors, size };
    }
    case 'numberhunt': {
      const nums = shuffle(Array.from({length: 16}, (_, i) => i + 1));
      return { type, nums };
    }
    // ── DAILY: PATTERN MATCH ──────────────────────────────
    case 'patternmatch': {
      const patColors = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12'];
      const sizes = [3, 4];
      const rounds = Array.from({length:5}, () => {
        const sz = sizes[Math.floor(Math.random()*sizes.length)];
        const density = 0.35 + Math.random()*0.25;
        const pattern = Array.from({length:sz*sz}, ()=>Math.random()<density);
        const color = patColors[Math.floor(Math.random()*patColors.length)];
        return { size:sz, pattern, color };
      });
      return { type, rounds };
    }
    // ── DAILY: EMOJI SORT ─────────────────────────────────
    case 'emojisort': {
      const categories = [
        { name:'Animals',  emoji:'🐾', items:['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨'] },
        { name:'Food',     emoji:'🍽', items:['🍎','🍕','🍔','🌮','🍜','🍣','🍰','🍪','🍩','🥗'] },
        { name:'Sports',   emoji:'🏅', items:['⚽','🏀','🎾','⚾','🏈','🎱','🏊','🚴','🥊','🏋️'] },
        { name:'Nature',   emoji:'🌿', items:['🌺','🌸','🍀','🌵','🌲','🍄','🌈','⭐','🌙','☀️'] },
      ];
      const chosen = shuffle(categories).slice(0, 2);
      const items = [];
      chosen.forEach(cat => {
        shuffle(cat.items).slice(0, 5).forEach(emoji => items.push({ emoji, category: cat.name }));
      });
      return { type, items: shuffle(items), categories: chosen.map(c=>({name:c.name,emoji:c.emoji})) };
    }
    // ── DAILY: CURLING ────────────────────────────────────
    case 'curling': {
      return { type, shots: 5 };
    }
    // ── DAILY: JUMP ROPE ──────────────────────────────────
    case 'jumprope': {
      // Beat intervals in ms (randomized slightly per round, speeds up)
      const baseInterval = 1100;
      const beats = Array.from({length:20}, (_, i) => {
        const speedup = 1 - (i * 0.015); // gets faster
        return Math.max(600, Math.round(baseInterval * speedup));
      });
      return { type, beats, totalJumps: 20 };
    }
    // ── DAILY: MINESWEEPER LIGHT ──────────────────────────
    case 'minesweeper': {
      const W=6, H=6, mines=8;
      const cells = Array.from({length:W*H},()=>({mine:false,revealed:false,count:0}));
      const pos = shuffle([...Array(W*H).keys()]).slice(0,mines);
      pos.forEach(i=>cells[i].mine=true);
      cells.forEach((c,i)=>{
        if(c.mine) return;
        const row=Math.floor(i/W), col=i%W;
        let count=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
          const nr=row+dr,nc=col+dc;
          if(nr>=0&&nr<H&&nc>=0&&nc<W) if(cells[nr*W+nc].mine) count++;
        }
        c.count=count;
      });
      return { type, W, H, cells: cells.map(c=>({mine:c.mine,count:c.count})), mines };
    }
    // ── ARENA: TAP FRENZY ─────────────────────────────────
    case 'tapfrenzy': {
      return { type };
    }
    // ── ARENA: FAST FINGERS ───────────────────────────────
    case 'fastfingers': {
      const wordLists = [
        ['FIRE','WAVE','JUMP','BOLD','CLAN'],
        ['ARENA','VOTED','POWER','ELITE','CHASE'],
        ['RIVAL','CROWN','BRAVE','SURGE','BLAZE'],
      ];
      const words = shuffle(wordLists)[0];
      return { type, words };
    }
    // ── ARENA: GRID LOCK ──────────────────────────────────
    case 'gridlock': {
      const operators = ['+','-','×'];
      const rounds_data = Array.from({length:6}, () => {
        const op = operators[Math.floor(Math.random()*operators.length)];
        let a = Math.floor(Math.random()*9)+2, b = Math.floor(Math.random()*9)+2;
        let target; if(op==='+') target=a+b; else if(op==='-') target=a-b; else target=a*b;
        const answers = [String(target)];
        const distractors = shuffle([target-1,target+1,target-2,target+2,target*2,Math.floor(target/2)].filter(n=>n!==target&&n>0)).slice(0,11).map(String);
        const grid = shuffle([...answers,...distractors]).slice(0,12);
        if(!grid.includes(String(target))) grid[0] = String(target);
        return { target:`${a} ${op} ${b} = ?`, grid: shuffle(grid), answers };
      });
      return { type, rounds: 6, rounds_data };
    }
    // ── ARENA: SPEED SORT ─────────────────────────────────
    case 'speedsort': {
      const items = shuffle(Array.from({length:16},(_,i)=>i+1));
      return { type, items };
    }
    // ── ARENA: FIND THE BOMB ──────────────────────────────
    case 'findbomb': {
      const rounds_data = Array.from({length:8}, () => {
        const size = 4;
        const bombPos = Math.floor(Math.random()*size*size);
        const grid = Array.from({length:size*size},(_,i)=> i===bombPos?'💣': ['😊','🌟','🎈','🎭','🦊','🌺','⚡','🎯'][Math.floor(Math.random()*8)]);
        const hint = `Row ${Math.floor(bombPos/size)+1}`;
        return { grid: shuffle(grid.map((e,i)=>({emoji:e,isBomb:e==='💣'}))), size, hint: `The bomb is in ${hint}` };
      });
      return { type, rounds_data };
    }
    // ── ARENA: MATH RACE ──────────────────────────────────
    case 'mathrace': {
      const qs = shuffle(MATH_BANK).slice(0,10).map(q=>({ q:q.q, a:q.a, choices:shuffle([q.a,...q.w]) }));
      return { type, questions: qs };
    }
    // ── ARENA: SIMON EXTREME (faster color seq) ───────────
    case 'simonextreme': {
      const seq = Array.from({length:20}, ()=>COLORS[Math.floor(Math.random()*COLORS.length)]);
      return { type, sequence:seq, colors:COLORS, colorHex:COLOR_HEX, speed:'fast' };
    }
    // ── DAILY: TANGRAM ────────────────────────────────────
    case 'tangram': {
      const puzzle = Math.floor(Math.random() * 4); // 4 preset shapes
      return { type, puzzle };
    }
    // ── DAILY: COLOR MATCH ────────────────────────────────
    case 'colormatch': {
      const palette = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22'];
      const grid = [];
      palette.forEach((_,ci) => { for(let i=0;i<6;i++) grid.push(ci); });
      return { type, duration: 60000, palette, grid: shuffle(grid) };
    }
    // ── ARENA: TUNNEL DODGE ───────────────────────────────
    case 'tunneldodge': {
      return { type, duration: 45000, seed: Math.floor(Math.random() * 99999) };
    }
  }
}

// ============================================================
// SCORING
// ============================================================
function calcScore(type, result, ms) {
  const timeBonus = (max, cap) => Math.max(0, Math.min(max, max - Math.floor(ms / cap)));
  switch (type) {
    case 'memory':        return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 150)));
    case 'quickmath':     return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'reaction':      return Math.max(0, Math.min(1000, 1000 - Math.floor(result.avgMs / 3)));
    case 'wordscramble':  return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'colorseq':      return Math.min(1000, result.level * 100);
    case 'trivia':        return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'tessellations': return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'numberhunt':    return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 5)));
    case 'patternmatch':  return Math.floor((result.score||0) / (result.total||5) * 1000);
    case 'emojisort':     return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'curling':       return Math.min(1000, (result.score||0) * 20);
    case 'jumprope':      return Math.min(1000, (result.hits||0) * 50);
    case 'minesweeper':   return Math.min(1000, (result.safe||0) * 40 + timeBonus(200, 200));
    case 'tapfrenzy':     return Math.min(1000, (result.taps||0) * 8);
    case 'fastfingers':   return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 10)));
    case 'gridlock':      return Math.floor((result.found/result.total)*700) + timeBonus(300, 300);
    case 'speedsort':     return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 5)));
    case 'findbomb':      return Math.floor((result.found/result.total)*700) + timeBonus(300, 300);
    case 'mathrace':      return Math.floor((result.correct/result.total)*700) + timeBonus(300, 300);
    case 'simonextreme':  return Math.min(1000, (result.level||0) * 100);
    case 'tangram':       return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 200)));
    case 'colormatch':    return Math.min(1000, (result.pairs||0) * 28);
    case 'tunneldodge':   return Math.min(1000, (result.distance||0) * 4);
    default: return 0;
  }
}

// ============================================================
// ROOM MANAGEMENT
// ============================================================
const rooms = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = ''; for (let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)]; return c;
}

function createRoom(hostId, hostName, hostWins=0) {
  let code; do { code = genCode(); } while (rooms[code]);
  rooms[code] = {
    code, host: hostId, phase: PHASE.LOBBY,
    players: {}, spectators: {},
    round: 0,
    puzzleType: null, puzzleData: null,
    duelType: null,   duelData: null,
    lastPlaceId: null, duelOpponentId: null,
    votes: {}, duelResults: {}, liveScores: {},
    chatHistory: [], eliminated: [], roundHistory: [],
    timer: null, tickInterval: null,
  };
  addPlayer(code, hostId, hostName, true, hostWins);
  return code;
}

function addPlayer(code, id, name, isHost=false, wins=0) {
  rooms[code].players[id] = { id, name, isHost, alive:true, totalScore:0, roundScore:0, finished:false, wins };
}

function alive(code) {
  return Object.values(rooms[code]?.players || {}).filter(p => p.alive);
}

function getLeaderboard(code) {
  return alive(code)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({ rank: i+1, id: p.id, name: p.name, totalScore: p.totalScore }));
}

function broadcastSpectatorUpdate(code) {
  const r = rooms[code]; if (!r) return;
  const specIds = Object.keys(r.spectators);
  if (!specIds.length) return;
  const update = {
    leaderboard: getLeaderboard(code),
    history: r.roundHistory,
    players: alive(code).map(p => ({ id:p.id, name:p.name, totalScore:p.totalScore, roundScore:p.roundScore })),
    phase: r.phase,
    round: r.round,
  };
  specIds.forEach(sid => io.to(sid).emit('spectator:update', update));
}

function roomState(code) {
  const r = rooms[code]; if (!r) return null;
  return {
    code: r.code, phase: r.phase, round: r.round, host: r.host,
    players: alive(code).map(p => ({ id:p.id, name:p.name, isHost:p.isHost, totalScore:p.totalScore, wins:p.wins||0 })),
    eliminated: r.eliminated, chatHistory: r.chatHistory.slice(-60),
  };
}

// ============================================================
// TIMER
// ============================================================
function startTimer(code, secs, done) {
  const r = rooms[code]; if (!r) return;
  clearTimer(code);
  let left = secs;
  r.tickInterval = setInterval(() => {
    left--;
    if (rooms[code]) io.to(code).emit('timer', { remaining: left });
    if (left <= 0) { clearInterval(r.tickInterval); r.tickInterval = null; if (rooms[code]) done(); }
  }, 1000);
}

function clearTimer(code) {
  const r = rooms[code]; if (!r) return;
  if (r.tickInterval) { clearInterval(r.tickInterval); r.tickInterval = null; }
}

function setPhase(code, phase, data={}) {
  const r = rooms[code]; if (!r) return;
  r.phase = phase;
  io.to(code).emit('game:phase', { phase, ...data });
}

// ============================================================
// GAME FLOW
// ============================================================
function getRandomPuzzleTypes() {
  // Ensure daily and duel come from different pools
  const daily = shuffle(DAILY_POOL)[0];
  const duel  = shuffle(ARENA_POOL)[0];
  return { daily, duel };
}

function startRound(code) {
  const r = rooms[code]; if (!r) return;
  r.round++;
  const { daily, duel } = getRandomPuzzleTypes();
  r.puzzleType = daily;  r.puzzleData = makePuzzle(daily);
  r.duelType   = duel;   r.duelData   = makePuzzle(duel);
  r.votes = {}; r.duelResults = {}; r.liveScores = {};
  r.lastPlaceId = null; r.duelOpponentId = null;
  alive(code).forEach(p => { p.roundScore=0; p.finished=false; });

  setPhase(code, PHASE.DAILY_INTRO, {
    round: r.round,
    puzzleType: daily,
    puzzleName: PUZZLE_NAMES[daily],
    playerCount: alive(code).length,
  });
  broadcastSpectatorUpdate(code);
  setTimeout(() => { if (rooms[code]?.phase === PHASE.DAILY_INTRO) startDaily(code); }, INTRO_SEC * 1000);
}

function startDaily(code) {
  const r = rooms[code]; if (!r) return;
  setPhase(code, PHASE.DAILY, { puzzleType: r.puzzleType, puzzleData: r.puzzleData, timeLimit: DAILY_SEC });
  startTimer(code, DAILY_SEC, () => endDaily(code));
}

function endDaily(code) {
  const r = rooms[code]; if (!r) return;
  clearTimer(code);
  const pl = alive(code);
  pl.forEach(p => { if (!p.finished) p.roundScore = 0; p.totalScore += p.roundScore; });
  const sorted = [...pl].sort((a,b) => b.roundScore - a.roundScore);
  r.lastPlaceId = sorted[sorted.length-1].id;

  setPhase(code, PHASE.DAILY_RESULTS, {
    results: sorted.map((p,i) => ({ id:p.id, name:p.name, roundScore:p.roundScore, totalScore:p.totalScore, rank:i+1, isLast: p.id===r.lastPlaceId })),
    lastPlaceId: r.lastPlaceId,
    lastPlaceName: r.players[r.lastPlaceId]?.name,
  });
  broadcastSpectatorUpdate(code);
  setTimeout(() => { if (rooms[code]?.phase === PHASE.DAILY_RESULTS) startDiscussion(code); }, RESULTS_SEC * 1000);
}

function startDiscussion(code) {
  const r = rooms[code]; if (!r) return;
  setPhase(code, PHASE.DISCUSSION, {
    lastPlaceId: r.lastPlaceId,
    lastPlaceName: r.players[r.lastPlaceId]?.name,
    timeLeft: DISCUSSION_SEC,
  });
  startTimer(code, DISCUSSION_SEC, () => startVoting(code));
}

function startVoting(code) {
  const r = rooms[code]; if (!r) return;
  clearTimer(code);
  const votable = alive(code).filter(p => p.id !== r.lastPlaceId).map(p => ({ id:p.id, name:p.name }));
  setPhase(code, PHASE.VOTING, {
    lastPlaceId: r.lastPlaceId,
    lastPlaceName: r.players[r.lastPlaceId]?.name,
    votable, timeLeft: VOTING_SEC,
  });
  startTimer(code, VOTING_SEC, () => endVoting(code));
}

function endVoting(code) {
  const r = rooms[code]; if (!r) return;
  clearTimer(code);
  const counts = {};
  Object.values(r.votes).forEach(id => { counts[id] = (counts[id]||0)+1; });
  const others = alive(code).filter(p => p.id !== r.lastPlaceId);
  let max = -1, top = [];
  others.forEach(p => {
    const c = counts[p.id]||0;
    if (c > max) { max=c; top=[p.id]; } else if (c===max) top.push(p.id);
  });
  if (top.length === 0) top = others.map(p=>p.id);
  r.duelOpponentId = top[Math.floor(Math.random()*top.length)];

  const display = others.map(p => ({ id:p.id, name:p.name, votes:counts[p.id]||0 }))
    .sort((a,b) => b.votes - a.votes);

  setPhase(code, PHASE.VOTE_RESULTS, {
    voteDisplay: display,
    duelOpponentId: r.duelOpponentId,
    duelOpponentName: r.players[r.duelOpponentId]?.name,
    lastPlaceId: r.lastPlaceId,
    lastPlaceName: r.players[r.lastPlaceId]?.name,
  });
  setTimeout(() => { if (rooms[code]?.phase === PHASE.VOTE_RESULTS) startArenaIntro(code); }, RESULTS_SEC * 1000);
}

function startArenaIntro(code) {
  const r = rooms[code]; if (!r) return;
  const p1 = r.players[r.lastPlaceId];
  const p2 = r.players[r.duelOpponentId];
  setPhase(code, PHASE.ARENA_INTRO, {
    p1Id:p1.id, p1Name:p1.name,
    p2Id:p2.id, p2Name:p2.name,
    duelType: r.duelType, duelName: PUZZLE_NAMES[r.duelType],
  });
  setTimeout(() => { if (rooms[code]?.phase === PHASE.ARENA_INTRO) startArena(code); }, ARENA_INTRO_SEC * 1000);
}

function startArena(code) {
  const r = rooms[code]; if (!r) return;
  r.duelResults = {}; r.liveScores = {};
  const p1 = r.players[r.lastPlaceId];
  const p2 = r.players[r.duelOpponentId];
  if (p1) p1.finished = false;
  if (p2) p2.finished = false;
  setPhase(code, PHASE.ARENA, {
    p1Id:p1.id, p1Name:p1.name,
    p2Id:p2.id, p2Name:p2.name,
    duelType: r.duelType, puzzleData: r.duelData, timeLimit: DUEL_SEC,
  });
  startTimer(code, DUEL_SEC, () => endArena(code));
  broadcastSpectatorUpdate(code);
}

function endArena(code) {
  const r = rooms[code]; if (!r) return;
  clearTimer(code);
  const s1 = r.duelResults[r.lastPlaceId]?.score  || 0;
  const s2 = r.duelResults[r.duelOpponentId]?.score || 0;
  let winnerId, loserId;
  if (s1 > s2)       { winnerId=r.lastPlaceId;    loserId=r.duelOpponentId; }
  else if (s2 > s1)  { winnerId=r.duelOpponentId; loserId=r.lastPlaceId; }
  else               { const c=Math.random()<0.5; winnerId=c?r.lastPlaceId:r.duelOpponentId; loserId=c?r.duelOpponentId:r.lastPlaceId; }

  // Save to round history
  r.roundHistory.push({
    round: r.round,
    p1: r.players[r.lastPlaceId]?.name,
    p2: r.players[r.duelOpponentId]?.name,
    winner: r.players[winnerId]?.name,
    loser:  r.players[loserId]?.name,
    puzzle: r.duelType,
    puzzleName: PUZZLE_NAMES[r.duelType],
  });

  setPhase(code, PHASE.ARENA_RESULTS, {
    p1Id:r.lastPlaceId,     p1Name:r.players[r.lastPlaceId]?.name,     p1Score:s1,
    p2Id:r.duelOpponentId,  p2Name:r.players[r.duelOpponentId]?.name,  p2Score:s2,
    winnerId, winnerName:r.players[winnerId]?.name,
    loserId,  loserName:r.players[loserId]?.name,
  });
  broadcastSpectatorUpdate(code);
  setTimeout(() => { if (rooms[code]?.phase === PHASE.ARENA_RESULTS) eliminate(code, loserId); }, RESULTS_SEC * 1000);
}

function eliminate(code, playerId) {
  const r = rooms[code]; if (!r) return;
  const p = r.players[playerId]; if (!p) return;
  p.alive = false;
  r.eliminated.push({ id:playerId, name:p.name, round:r.round });

  // Send choice ONLY to the eliminated player's socket
  io.to(playerId).emit('elimination:choice', {
    eliminatedName: p.name,
    round: r.round,
  });

  setPhase(code, PHASE.ELIMINATION, {
    eliminatedId:   playerId,
    eliminatedName: p.name,
    eliminated:     r.eliminated,
    remaining:      alive(code).length,
  });
  broadcastSpectatorUpdate(code);

  setTimeout(() => {
    if (!rooms[code]) return;
    const al = alive(code);
    if (al.length <= 1) {
      const winnerId = al[0]?.id;
      // Record wins & games for all participants
      const allPlayers = Object.keys(r.players);
      allPlayers.forEach(pid => {
        const sock = io.sockets.sockets.get(pid);
        if (sock?.data?.userId) {
          recordGame(sock.data.userId);
          if (pid === winnerId) recordWin(sock.data.userId);
        }
      });
      setPhase(code, PHASE.GAME_OVER, {
        winnerId,
        winnerName: al[0]?.name || 'Nobody',
        eliminated: r.eliminated,
        roundHistory: r.roundHistory,
      });
      broadcastSpectatorUpdate(code);
    } else {
      startRound(code);
    }
  }, ELIM_SEC * 1000);
}

// ============================================================
// SOCKET
// ============================================================
io.on('connection', socket => {

  // Associate logged-in userId with this socket
  socket.on('identify', ({ userId }) => {
    if (!userId) return;
    const db = loadDB();
    if (db.users[userId]) socket.data.userId = userId;
  });

  socket.on('room:create', ({ name }) => {
    if (!name?.trim()) return socket.emit('error', { msg: 'Enter your name' });
    const n = name.trim().slice(0, 20);
    const wins = socket.data.userId ? (loadDB().users[socket.data.userId]?.wins || 0) : 0;
    const code = createRoom(socket.id, n, wins);
    socket.join(code);
    socket.data.code = code;
    socket.data.name = n;
    socket.data.isSpectator = false;
    socket.emit('room:created', { code, state: roomState(code) });
  });

  socket.on('room:join', ({ code, name }) => {
    const upper = code?.toUpperCase().trim();
    const r = rooms[upper];
    if (!r)                                  return socket.emit('error', { msg: 'Room not found. Check the code.' });
    if (r.phase !== PHASE.LOBBY)             return socket.emit('error', { msg: 'Game already in progress.' });
    if (!name?.trim())                       return socket.emit('error', { msg: 'Enter your name.' });
    if (alive(upper).length >= MAX_PLAYERS)  return socket.emit('error', { msg: 'Room is full (10/10).' });
    const n = name.trim().slice(0, 20);
    const wins = socket.data.userId ? (loadDB().users[socket.data.userId]?.wins || 0) : 0;
    addPlayer(upper, socket.id, n, false, wins);
    socket.join(upper);
    socket.data.code = upper;
    socket.data.name = n;
    socket.data.isSpectator = false;
    socket.emit('room:joined', { code: upper, state: roomState(upper) });
    socket.to(upper).emit('room:update', { state: roomState(upper) });
  });

  socket.on('game:start', () => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    if (r.host !== socket.id)        return socket.emit('error', { msg: 'Only the host can start.' });
    if (r.phase !== PHASE.LOBBY)     return;
    if (alive(code).length < MIN_PLAYERS) return socket.emit('error', { msg: `Need at least ${MIN_PLAYERS} players to start.` });
    startRound(code);
  });

  socket.on('puzzle:complete', ({ result, timeMs }) => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    if (r.phase !== PHASE.DAILY && r.phase !== PHASE.ARENA) return;
    const p = r.players[socket.id]; if (!p || p.finished) return;
    if (r.phase === PHASE.ARENA && socket.id !== r.lastPlaceId && socket.id !== r.duelOpponentId) return;

    p.finished = true;
    const type = r.phase === PHASE.ARENA ? r.duelType : r.puzzleType;
    const score = calcScore(type, result || {}, timeMs || 99999);
    p.roundScore = score;

    if (r.phase === PHASE.ARENA) {
      r.duelResults[socket.id] = { score };
      r.liveScores[socket.id] = score;
      io.to(code).emit('duel:progress', { playerId: socket.id, playerName: p.name });
      // Broadcast final live scores
      io.to(code).emit('arena:live', {
        p1Id: r.lastPlaceId,   p1Score: r.liveScores[r.lastPlaceId]   || 0,
        p2Id: r.duelOpponentId, p2Score: r.liveScores[r.duelOpponentId] || 0,
      });
      if (r.duelResults[r.lastPlaceId] && r.duelResults[r.duelOpponentId]) endArena(code);
    } else {
      const al = alive(code);
      const done = al.filter(p2 => p2.finished).length;
      io.to(code).emit('daily:progress', { done, total: al.length });
      if (done === al.length) { clearTimer(code); endDaily(code); }
    }
  });

  // Live score progress during arena puzzle
  socket.on('puzzle:progress', ({ score }) => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    if (r.phase !== PHASE.ARENA) return;
    if (socket.id !== r.lastPlaceId && socket.id !== r.duelOpponentId) return;
    r.liveScores[socket.id] = score;
    io.to(code).emit('arena:live', {
      p1Id: r.lastPlaceId,    p1Score: r.liveScores[r.lastPlaceId]    || 0,
      p2Id: r.duelOpponentId, p2Score: r.liveScores[r.duelOpponentId] || 0,
    });
  });

  socket.on('chat:send', ({ text }) => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    if (r.phase !== PHASE.DISCUSSION && r.phase !== PHASE.VOTING) return;
    if (!text?.trim()) return;
    const p = r.players[socket.id] || r.spectators[socket.id];
    if (!p) return;
    const msg = { id: Date.now()+Math.random(), playerId:socket.id, playerName:p.name, text:text.trim().slice(0,200), ts:Date.now(), isSpec: !!r.spectators[socket.id] };
    r.chatHistory.push(msg);
    io.to(code).emit('chat:message', msg);
  });

  socket.on('vote:send', ({ targetId }) => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    if (r.phase !== PHASE.VOTING) return;
    if (socket.id === r.lastPlaceId) return socket.emit('error', { msg: "You're automatically in the Arena." });
    const target = r.players[targetId];
    if (!target?.alive || targetId === r.lastPlaceId) return;
    r.votes[socket.id] = targetId;
    socket.emit('vote:confirmed', { targetId, targetName: target.name });
    io.to(code).emit('vote:update', { count: Object.keys(r.votes).length, total: alive(code).filter(p=>p.id!==r.lastPlaceId).length });
    if (Object.keys(r.votes).length >= alive(code).filter(p=>p.id!==r.lastPlaceId).length) {
      clearTimer(code); endVoting(code);
    }
  });

  // Spectate choice
  socket.on('spectate:join', () => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    const p = r.players[socket.id];
    if (!p || p.alive) return;
    socket.data.isSpectator = true;
    r.spectators[socket.id] = { id: socket.id, name: p.name, watchingId: null };
    socket.emit('spectator:init', {
      leaderboard: getLeaderboard(code),
      history:     r.roundHistory,
      players:     alive(code).map(pl => ({ id:pl.id, name:pl.name, totalScore:pl.totalScore, roundScore:pl.roundScore })),
      phase:       r.phase,
      round:       r.round,
    });
  });

  socket.on('spectate:watch', ({ targetId }) => {
    const { code } = socket.data;
    const r = rooms[code]; if (!r) return;
    const s = r.spectators[socket.id]; if (!s) return;
    s.watchingId = targetId;
    socket.emit('spectator:watching', { targetId, targetName: r.players[targetId]?.name });
  });

  socket.on('game:leave', () => {
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    const { code } = socket.data || {};
    const r = rooms[code]; if (!r) return;

    // Remove from spectators if spectating
    if (r.spectators[socket.id]) {
      delete r.spectators[socket.id];
      return;
    }

    const p = r.players[socket.id]; if (!p) return;
    if (r.phase === PHASE.LOBBY) {
      delete r.players[socket.id];
      const rem = Object.values(r.players);
      if (!rem.length) { delete rooms[code]; return; }
      if (r.host === socket.id) { r.host = rem[0].id; rem[0].isHost = true; }
      io.to(code).emit('room:update', { state: roomState(code) });
    } else if (p.alive) {
      p.alive = false;
      r.eliminated.push({ id:socket.id, name:p.name, round:r.round, dc:true });
      io.to(code).emit('player:left', { name: p.name });
      const al = alive(code);
      if (al.length <= 1 && r.phase !== PHASE.GAME_OVER) {
        clearTimer(code);
        setPhase(code, PHASE.GAME_OVER, { winnerId:al[0]?.id, winnerName:al[0]?.name||'Nobody', eliminated:r.eliminated });
      }
    }
  });
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Challenge.io running at http://localhost:${PORT}`));
