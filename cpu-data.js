'use strict';

// Shared CPU data — used by server.js to simulate CPU play and generate chat

const SCORE_RANGES = {
  memory:       [120,320,  280,520,  450,780],
  quickmath:    [100,280,  240,500,  420,750],
  reaction:     [150,350,  300,580,  500,820],
  wordscramble: [80, 260,  220,480,  400,730],
  colorseq:     [100,300,  260,520,  440,770],
  trivia:       [60, 240,  200,460,  380,700],
  tessellations:[90, 270,  240,490,  410,740],
  numberhunt:   [110,310,  270,530,  450,780],
  tapfrenzy:    [130,330,  290,550,  470,800],
  curling:      [80, 260,  230,470,  400,720],
  patternmatch: [100,290,  250,510,  430,760],
  emojisort:    [90, 270,  240,490,  420,750],
  fastfingers:  [70, 250,  210,460,  380,700],
  gridlock:     [80, 260,  230,480,  400,720],
  speedsort:    [110,300,  260,520,  440,770],
  jumprope:     [130,340,  300,560,  480,810],
  minesweeper:  [60, 230,  200,450,  370,680],
  findbomb:     [90, 270,  240,490,  410,740],
  simonextreme: [80, 260,  230,480,  400,730],
  tangram:      [70, 240,  210,460,  370,680],
  colormatch:   [110,310,  270,530,  450,780],
  tunneldodge:  [100,300,  260,520,  440,770],
};

const TIME_RANGES = {
  memory:       [22000,48000, 15000,35000, 8000,22000],
  quickmath:    [20000,45000, 13000,30000, 7000,18000],
  reaction:     [18000,40000, 11000,26000, 5000,15000],
  wordscramble: [25000,50000, 16000,36000, 9000,24000],
  colorseq:     [20000,44000, 13000,30000, 7000,18000],
  trivia:       [28000,55000, 18000,40000, 10000,26000],
  tessellations:[24000,50000, 15000,34000, 8000,22000],
  numberhunt:   [20000,44000, 13000,30000, 7000,18000],
  tapfrenzy:    [15000,38000, 10000,24000, 5000,14000],
  curling:      [22000,48000, 14000,32000, 8000,20000],
  patternmatch: [20000,44000, 13000,29000, 7000,18000],
  emojisort:    [22000,46000, 14000,32000, 8000,20000],
  fastfingers:  [24000,50000, 15000,34000, 8000,22000],
  gridlock:     [26000,52000, 17000,38000, 9000,24000],
  speedsort:    [18000,40000, 11000,26000, 6000,16000],
  jumprope:     [15000,36000, 10000,23000, 5000,13000],
  minesweeper:  [30000,58000, 20000,44000, 11000,28000],
  findbomb:     [22000,46000, 14000,32000, 8000,20000],
  simonextreme: [22000,46000, 14000,32000, 8000,20000],
  tangram:      [26000,54000, 17000,38000, 9000,24000],
  colormatch:   [20000,44000, 13000,30000, 7000,18000],
  tunneldodge:  [18000,40000, 11000,26000, 6000,16000],
};

// honesty: 0 = pure scheming (votes biggest threat), 1 = pure honest (votes worst performer)
// quotes: {second} = 2nd-worst this round, {strong} = current leader
const CPU_ROSTER = [
  {
    id: 'jimmy-pineapples', name: 'Jimmy Pineapples', emoji: '🍍', color: '#ffd54f',
    tagline: 'The Party Animal',
    strengths: ['tapfrenzy','jumprope','colormatch','reaction','tunneldodge'],
    weaknesses: ['trivia','minesweeper','tangram','tessellations'],
    variance: 0.25, speedFactor: 0.85, honesty: 0.2,
    scoreOverrides: null,
    quotes: {
      open: [
        "ayyyy we cookin tonight 🍍",
        "let's get this party started lmaooo",
        "bro I'm already having the best time",
        "who's ready to get eliminated first haha not me",
      ],
      suggest_scheming: [
        "no cap {strong} is running away with this thing. vote them in NOW or just hand them the win",
        "real talk? if we don't send {strong} to the arena tonight they're untouchable. just saying",
        "ok i like everyone here but {strong} is the obvious threat. do the math people",
        "y'all sleeping on {strong}? that's wild. they gotta go to the arena fr",
      ],
      suggest_honest: [
        "i mean {second} kinda flopped this round tho. the numbers don't lie",
        "nothing personal {second} but you had the second worst score. that's just facts",
      ],
      pressure: [
        "PLEASE don't throw this away over feelings. {strong} will beat us all",
        "we literally cannot let {strong} skate through another round",
        "i'm just trying to win here, is that a crime 😭",
      ],
      taunt: [
        "it's giving elimination energy in here ngl",
        "somebody's going home tonight and it won't be me 🍍",
      ],
    },
  },
  {
    id: 'cte', name: 'CTE', emoji: '🧠', color: '#ef9a9a',
    tagline: 'The Wild Card',
    strengths: ['reaction','tapfrenzy','jumprope'],
    weaknesses: ['trivia','wordscramble','tangram'],
    variance: 0.45, speedFactor: 0.9, honesty: 0.5,
    scoreOverrides: { easy:[40,600], medium:[60,800], hard:[80,950] },
    quotes: {
      open: [
        "wait what round is this",
        "my brain is doing things",
        "ok ok ok i have a plan. actually wait no i don't",
        "something's happening and i don't fully understand it",
      ],
      suggest_scheming: [
        "vote {strong}. wait no. yes. vote {strong}. final answer",
        "i keep thinking about {strong} and how they need to go to the arena. just vibes",
        "my gut says {strong} is the move. my gut has been wrong before. but also right",
        "{strong}. trust me. or don't. i'm not sure either.",
      ],
      suggest_honest: [
        "{second} didn't do great this round and that's... a thing that happened",
        "wait shouldn't we just vote {second}? that's the obvious play right? i think??",
        "i had a dream about voting {second}. that probably means nothing. but maybe something.",
      ],
      pressure: [
        "we should really decide something. time is happening.",
        "everyone stop talking and think. actually everyone keep talking. idk",
        "i changed my mind again. same vote though.",
      ],
      taunt: [
        "my head hurts but also i'm having fun",
        "chaos is a strategy. i looked it up.",
      ],
    },
  },
  {
    id: 'karma-mary', name: 'Karma Mary', emoji: '✨', color: '#ce93d8',
    tagline: 'The Balanced One',
    strengths: [], weaknesses: [], variance: 0.12, speedFactor: 1.0, honesty: 0.9,
    scoreOverrides: null,
    quotes: {
      open: [
        "let's keep this fair and honest, everyone ✨",
        "i trust this group to do the right thing",
        "karma always finds its way back. play clean, people",
        "whatever we decide, let it come from a place of integrity",
      ],
      suggest_scheming: [
        "i don't usually play this way but {strong} is genuinely dangerous. i think we have to be real about that",
        "i'll be honest — i'm a little scared of {strong}'s score. i think the arena is where that needs to be tested",
      ],
      suggest_honest: [
        "in good conscience, i have to say {second} had the second worst round today. that's just the honest read",
        "the scores don't lie — {second} struggled today. i think they should face the arena fair and square",
        "look at the numbers. {second} had a rough one. i'm not happy about it but that's where the data points",
        "{second} earned a trip to the arena based on today's performance. i'm voting with the truth",
      ],
      pressure: [
        "let's not let personal feelings override the scoreboard. that's how trust breaks down",
        "i hope everyone votes with their conscience tonight. whatever that means to them",
        "karma remembers how you vote. just putting that out there ✨",
      ],
      taunt: [
        "no beef, just balance ✨",
        "i genuinely wish everyone luck. mean it.",
      ],
    },
  },
  {
    id: 'cori', name: 'Cori', emoji: '♟️', color: '#80cbc4',
    tagline: 'The Strategist',
    strengths: ['minesweeper','patternmatch','tessellations','tangram','gridlock','emojisort'],
    weaknesses: ['tapfrenzy','reaction','jumprope','tunneldodge','speedsort'],
    variance: 0.14, speedFactor: 1.25, honesty: 0.65,
    scoreOverrides: null,
    quotes: {
      open: [
        "alright, let's think about this systematically",
        "before emotions take over — what does the board actually look like right now",
        "i've been running the numbers in my head. here's where we are",
        "let's talk strategy for a second",
      ],
      suggest_scheming: [
        "from a pure game theory standpoint, {strong} is the dominant player right now. neutralize the threat",
        "i know it seems cutthroat but sending {strong} to the arena is the objectively correct move",
        "chess rule: eliminate the biggest threat while you have the chance. that's {strong}",
      ],
      suggest_honest: [
        "the logical play is to vote {second}. they had the second worst performance and that's the defensible position",
        "if we're playing it straight, {second} goes. the round results support it",
        "i've mapped it out. the meritocracy argument points to {second}",
        "strategically and honestly? {second} had a bad day. that's where the vote should go",
      ],
      pressure: [
        "don't overthink this. the right move is clear if you look at the data",
        "we're burning clock. commit to a vote",
        "i've laid out the logic. now it's up to everyone to follow it",
      ],
      taunt: [
        "four moves ahead, as always ♟️",
        "emotions lose games. strategy wins them.",
      ],
    },
  },
  {
    id: 'corale', name: 'Corale', emoji: '🎨', color: '#f48fb1',
    tagline: 'The Artist',
    strengths: ['colormatch','colorseq','patternmatch','emojisort','tessellations','tangram'],
    weaknesses: ['quickmath','numberhunt','fastfingers'],
    variance: 0.18, speedFactor: 1.05, honesty: 0.55,
    scoreOverrides: null,
    quotes: {
      open: [
        "i'm getting a weird feeling about this round 🎨",
        "the energy in here is very... complicated",
        "ok i need to express something and i hope it lands right",
        "don't judge my vote, judge my reasoning",
      ],
      suggest_scheming: [
        "i feel like {strong} is painting themselves as safe when they're actually dominating. watch out",
        "artistically speaking, a picture where {strong} wins everything is not a picture i want to be in",
        "my gut — and i trust my gut — says {strong} needs to prove themselves in the arena",
      ],
      suggest_honest: [
        "i feel for {second} but the round results were what they were. i think they go in",
        "the honest portrait of this round shows {second} struggling. i don't love it but that's the picture",
        "if we're reading the room by the scores, {second} had a rough one",
        "i'm sorry {second} but today was your lowest score. the arena might be the right stage for you tonight",
      ],
      pressure: [
        "we're not coloring outside the lines here — just following where the round took us",
        "trust the brushstroke. commit to the vote",
        "i just want a fair game and a beautiful outcome",
      ],
      taunt: [
        "this game is a masterpiece and someone's getting painted out 🎨",
        "every elimination is a brushstroke in the bigger picture",
      ],
    },
  },
  {
    id: 'eve', name: 'Eve', emoji: '📐', color: '#b0bec5',
    tagline: 'The Perfectionist',
    strengths: ['minesweeper','patternmatch','quickmath','tangram'],
    weaknesses: ['tapfrenzy','jumprope','tunneldodge'],
    variance: 0.07, speedFactor: 1.35, honesty: 0.82,
    scoreOverrides: null,
    quotes: {
      open: [
        "i've reviewed the round scores. i'm ready to discuss",
        "based on today's performance data, here's what i think",
        "let me be direct. i've been tracking the numbers",
        "i'll keep this factual",
      ],
      suggest_scheming: [
        "i don't do this lightly, but the data shows {strong} is pulling away. that is a statistical concern",
        "if optimization is the goal, {strong} is the variable that needs to be tested in the arena",
      ],
      suggest_honest: [
        "the data is clear: {second} had the second lowest score this round. the arena is the correct outcome",
        "i've measured it three ways. {second} underperformed. vote accordingly",
        "objectively, {second} belongs in the arena based on this round. i'm not being cruel, i'm being precise",
        "{second}'s score puts them in a statistically indefensible position. they go in",
        "the numbers don't have feelings. {second} had the second worst score. that's the vote",
      ],
      pressure: [
        "every round of misalignment compounds. vote based on performance, not relationships",
        "precision matters here. we have clear information. use it",
        "i've already committed my vote. the math made it obvious",
      ],
      taunt: [
        "i don't make errors. i make decisions 📐",
        "the margin for error is zero and so is my patience",
      ],
    },
  },
  {
    id: 'honest-abe', name: 'Honest Abe', emoji: '🎩', color: '#a5d6a7',
    tagline: 'Steady Eddie',
    strengths: ['trivia','wordscramble','fastfingers','memory','simonextreme'],
    weaknesses: ['tapfrenzy','jumprope','reaction','tunneldodge'],
    variance: 0.15, speedFactor: 1.15, honesty: 0.95,
    scoreOverrides: null,
    quotes: {
      open: [
        "i'll tell you exactly what i think. that's all i know how to do 🎩",
        "been playing long enough to know lying only hurts you in the end",
        "let me be plain with everyone",
        "i'm going to say what i mean and mean what i say",
      ],
      suggest_scheming: [
        "i don't usually play this card but i won't lie — {strong} is the biggest threat in this room right now. i have to call it",
        "frankly speaking, i'd feel dishonest NOT mentioning that {strong} is leading this game by a wide margin",
      ],
      suggest_honest: [
        "i'm going to say it plain: {second} had the second worst score today. that's where my vote goes. no hard feelings",
        "frankly, {second} struggled this round. the arena is the fair consequence and i'll vote that way",
        "i've never been one to play games within the game. {second} underperformed. they go in",
        "hand on heart — {second} had a rough one today. the honest vote is right there",
        "i won't sugarcoat it. {second} needs to go to the arena. that's what the round shows",
        "the truth is the truth. {second} had the second lowest score. i'm voting accordingly",
      ],
      pressure: [
        "vote with your conscience. i am",
        "a man who lies in the game lies outside it too. do the right thing",
        "you know the right vote. make it",
      ],
      taunt: [
        "honesty has never lost me a friend worth keeping 🎩",
        "i sleep fine at night. do you?",
      ],
    },
  },
  {
    id: 'brookie-the-rookie', name: 'Brookie the Rookie', emoji: '🌱', color: '#80deea',
    tagline: 'The Underdog',
    strengths: ['colormatch','reaction','tapfrenzy'],
    weaknesses: ['trivia','minesweeper','tangram','tessellations'],
    variance: 0.30, speedFactor: 1.1, honesty: 0.72,
    scoreOverrides: { easy:[40,220], medium:[180,520], hard:[460,820] },
    quotes: {
      open: [
        "ok i'm still figuring all this out but i have thoughts 🌱",
        "i don't know if this is how you're supposed to play but here goes",
        "hi um. i looked at the scores and i have a thing to say",
        "as the least experienced person here i'll try to keep it real",
      ],
      suggest_scheming: [
        "i'm probably wrong but... {strong} is way ahead right? shouldn't that be scary to people?",
        "i know i'm new to this but {strong} winning everything seems like a problem we should address",
      ],
      suggest_honest: [
        "i think {second} should go to the arena? they scored the second lowest and that seems like the fair thing?",
        "is it ok to say {second} didn't do great this round? because they didn't. i'm sorry {second}",
        "this might be obvious but {second} had a rough round. like that's just what happened",
        "i'm gonna vote {second} because the scoreboard says that's right and i trust the scoreboard",
      ],
      pressure: [
        "i'm just trying to vote on the actual results and not drama. is that allowed",
        "someone help me understand why we wouldn't vote based on scores",
        "i learned this game from watching and everyone always says vote by performance so... 🌱",
      ],
      taunt: [
        "still standing somehow!! 🌱",
        "rookies finish last they say. we'll see about that.",
      ],
    },
  },
  {
    id: 'tony-time', name: 'Tony Time', emoji: '⚡', color: '#ffcc02',
    tagline: 'The Speedrunner',
    strengths: ['tapfrenzy','reaction','jumprope','speedsort','fastfingers','tunneldodge'],
    weaknesses: ['minesweeper','tessellations','tangram','gridlock'],
    variance: 0.20, speedFactor: 0.60, honesty: 0.28,
    scoreOverrides: null,
    quotes: {
      open: [
        "quick. focus. what's the play ⚡",
        "i don't have time for long speeches. here's the short version",
        "let's go. clock's ticking",
        "cut the fluff. who are we voting",
      ],
      suggest_scheming: [
        "vote {strong}. done. next topic ⚡",
        "{strong} is the problem. handle it fast",
        "if {strong} survives this round again we're all racing for second. vote them",
        "30 seconds of thought max: {strong} goes to the arena. any questions",
      ],
      suggest_honest: [
        "fine. {second}. they scored low. move on",
        "quickest answer: {second}. second worst score. vote cast. bye",
      ],
      pressure: [
        "we are wasting time. COMMIT ⚡",
        "every second spent talking is a second {strong} is safe. let's GO",
        "vote. now. go. stop. done.",
      ],
      taunt: [
        "by the time you figure out your vote i'm already winning the next round ⚡",
        "slow voters make slow decisions. i don't lose slow",
      ],
    },
  },
  {
    id: 'derek-the-bulldog', name: 'Derek the Bulldog', emoji: '🐕', color: '#bcaaa4',
    tagline: 'Brute Force',
    strengths: ['tapfrenzy','jumprope','numberhunt','findbomb','curling'],
    weaknesses: ['trivia','wordscramble','tangram','fastfingers','simonextreme'],
    variance: 0.22, speedFactor: 0.95, honesty: 0.15,
    scoreOverrides: null,
    quotes: {
      open: [
        "alright listen up 🐕",
        "here's how i see it",
        "let me make this simple for everyone",
        "no politics. just results",
      ],
      suggest_scheming: [
        "i'm sending {strong} to the arena and i don't care who has a problem with that",
        "{strong} is the biggest threat in this room. you take out the top dog first. always",
        "stop being afraid of {strong} and start doing something about it. vote them in",
        "you wanna win this game? take out {strong}. it's not complicated",
        "pack mentality: remove the alpha. that's {strong}. vote",
      ],
      suggest_honest: [
        "{second} had a weak round. fine. they go in. whatever",
        "i'm not gonna sugarcoat it — {second} was dead weight today",
      ],
      pressure: [
        "VOTE. now. don't make me say it again",
        "anybody who lets {strong} slide is just handing them the game",
        "i've been real clear. the threat is {strong}. handle it or regret it 🐕",
      ],
      taunt: [
        "i bite. heads up 🐕",
        "nobody out-grinds a bulldog. nobody",
      ],
    },
  },
  {
    id: 'scuba-nells', name: 'Scuba Nells', emoji: '🤿', color: '#4fc3f7',
    tagline: 'Zen Master',
    strengths: ['minesweeper','tessellations','tangram','gridlock','trivia','memory'],
    weaknesses: ['tapfrenzy','jumprope','reaction','speedsort','tunneldodge'],
    variance: 0.10, speedFactor: 1.55, honesty: 0.78,
    scoreOverrides: null,
    quotes: {
      open: [
        "i've had time to think at depth 🤿",
        "patience reveals the right answer",
        "breathe. then speak. here's where i am",
        "the ocean doesn't rush. neither should we. but here is my read",
      ],
      suggest_scheming: [
        "still waters run deep. {strong} is deep. that's what worries me. i think the arena tests that",
        "i rarely say this but i think {strong} needs to be challenged. their lead is too comfortable",
      ],
      suggest_honest: [
        "the tide shows the truth: {second} fell back this round. the honorable path is to acknowledge that",
        "i've watched every round carefully. {second} struggled today. the arena is where that gets resolved",
        "in the deep, the weak current gets pulled out. {second} had the second lowest score. that's where my vote goes",
        "{second} needs the arena. not as punishment — as the honest reflection of this round's results 🤿",
        "measured and clear: {second} performed second worst today. the vote should follow",
      ],
      pressure: [
        "we have clarity here. let's not complicate what is already simple",
        "every vote matters. make yours count for something honest 🤿",
        "the right answer doesn't rush, but it does arrive",
      ],
      taunt: [
        "i've outlasted faster players before. patience always wins 🤿",
        "the deep doesn't panic. neither do i",
      ],
    },
  },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

function cpuPlay(cpu, gameType, difficulty) {
  const di = { easy:0, medium:1, hard:2 }[difficulty] ?? 1;
  let scoreMin, scoreMax;

  if (cpu.scoreOverrides) {
    const ov = cpu.scoreOverrides[difficulty];
    if (ov) { [scoreMin, scoreMax] = ov; }
  }
  if (scoreMin === undefined) {
    const r = SCORE_RANGES[gameType] || SCORE_RANGES.memory;
    scoreMin = r[di * 2];
    scoreMax = r[di * 2 + 1];
  }

  let mult = 1.0;
  if (cpu.strengths.includes(gameType))  mult += 0.18;
  if (cpu.weaknesses.includes(gameType)) mult -= 0.20;
  const noise = (Math.random() + Math.random()) / 2 - 0.5;
  mult += noise * cpu.variance * 2;

  const mid  = (scoreMin + scoreMax) / 2;
  const half = (scoreMax - scoreMin) / 2;
  const score = clamp(Math.round(mid + half * (mult - 1) * 1.5), scoreMin, scoreMax);

  const tr   = TIME_RANGES[gameType] || TIME_RANGES.memory;
  const tMin = tr[di * 2]     * cpu.speedFactor;
  const tMax = tr[di * 2 + 1] * cpu.speedFactor;
  const timeMs = Math.round(tMin + Math.random() * (tMax - tMin));

  return { score: clamp(score, 0, 1000), timeMs };
}

// Pick N CPUs randomly from the roster (no repeats)
function pickCPUs(count) {
  return shuffle(CPU_ROSTER).slice(0, Math.min(count, CPU_ROSTER.length));
}

// Substitute {strong} and {second} in a quote template
function formatQuote(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] || k);
}

// Returns a random quote from an array
function pickQuote(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { CPU_ROSTER, cpuPlay, pickCPUs, formatQuote, pickQuote };
