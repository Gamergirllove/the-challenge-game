// scoring.js — Extracted, documented scoring module
// Works in both Node.js (module.exports) and browser (window.Scoring)
'use strict';

// SCORE_META: documents each game's result contract and scoring range
const SCORE_META = {
  memory:        { resultFields: [],                         maxScore: 1000, notes: 'Time-only. 0ms→1000, 150s→0' },
  quickmath:     { resultFields: ['correct','total'],        maxScore: 1000, notes: '8 questions. correct/total*700 + timeBonus(300)' },
  reaction:      { resultFields: ['avgMs'],                  maxScore: 1000, notes: '5 rounds. 100ms avg→967, 3000ms→0' },
  wordscramble:  { resultFields: ['correct','total'],        maxScore: 1000, notes: '6 words. correct/total*700 + timeBonus(300)' },
  colorseq:      { resultFields: ['level'],                  maxScore: 1000, notes: 'Level*100. 10+ levels = 1000' },
  trivia:        { resultFields: ['correct','total'],        maxScore: 1000, notes: '8 questions. correct/total*700 + timeBonus(300)' },
  tessellations: { resultFields: ['correct','total'],        maxScore: 1000, notes: 'correct/total*700 + timeBonus(300)' },
  numberhunt:    { resultFields: [],                         maxScore: 1000, notes: 'Time-only. <15s→1000, 37.5s→0' },
  patternmatch:  { resultFields: ['score','total'],          maxScore: 1000, notes: 'score/total*1000' },
  emojisort:     { resultFields: ['correct','total'],        maxScore: 1000, notes: 'correct/total*700 + timeBonus(300)' },
  curling:       { resultFields: ['score'],                  maxScore: 1000, notes: '5 shots, max 10pts each. score*20' },
  jumprope:      { resultFields: ['hits','misses'],          maxScore: 1000, notes: '20 beats. hits*50. 20 hits = 1000' },
  minesweeper:   { resultFields: ['won','safe'],             maxScore: 1000, notes: '28 safe cells. Won→900+speed. Lost→safe/28*850' },
  tapfrenzy:     { resultFields: ['taps'],                   maxScore: 1000, notes: 'taps*8. 125 taps = 1000' },
  fastfingers:   { resultFields: ['words','errors'],         maxScore: 1000, notes: '5 words. 1000-ms/20-errors*50' },
  gridlock:      { resultFields: ['solved','moves'],         maxScore: 1000, notes: 'Rush Hour. solved: 1000-moves*35+timeBonus' },
  speedsort:     { resultFields: [],                         maxScore: 1000, notes: 'Time-only. <20s→1000, 40s→0' },
  findbomb:      { resultFields: ['found','total'],          maxScore: 1000, notes: '8 rounds. found/total*700 + timeBonus(300)' },
  mathrace:      { resultFields: ['correct','total'],        maxScore: 1000, notes: '10 questions. correct/total*700 + timeBonus(300)' },
  simonextreme:  { resultFields: ['level'],                  maxScore: 1000, notes: 'level*100. 10+ levels = 1000' },
  tangram:       { resultFields: [],                         maxScore: 1000, notes: 'Time-only. 0ms→1000, 200s→0' },
  colormatch:    { resultFields: ['pairs'],                  maxScore: 1000, notes: '18 pairs total. pairs/18*1000' },
  tunneldodge:   { resultFields: ['distance'],               maxScore: 1000, notes: 'distance*4. 250 units = 1000' },
};

function calcScore(type, result, ms) {
  const r = result || {};
  ms = Math.max(0, ms || 0);
  const timeBonus = (max, cap) => Math.max(0, Math.min(max, max - Math.floor(ms / cap)));

  switch (type) {
    case 'memory':
      return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 150)));

    case 'quickmath':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'reaction':
      return Math.max(0, Math.min(1000, 1000 - Math.floor((r.avgMs != null ? r.avgMs : 3000) / 3)));

    case 'wordscramble':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'colorseq':
      return Math.min(1000, (r.level || 0) * 100);

    case 'trivia':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'tessellations':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'numberhunt':
      // FIX: was 1000-ms/5 (0 for anything >5s). Now breakeven at 37.5s.
      return Math.max(0, Math.min(1000, 2500 - Math.floor(ms / 15)));

    case 'patternmatch':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.score || 0) / r.total * 1000));

    case 'emojisort':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'curling':
      return Math.min(1000, (r.score || 0) * 20);

    case 'jumprope':
      return Math.min(1000, (r.hits || 0) * 50);

    case 'minesweeper':
      // 6x6 board, 8 mines = 28 safe cells
      if (r.won) return 900 + Math.max(0, 100 - Math.floor(ms / 1000));
      return Math.min(850, Math.floor((r.safe || 0) / 28 * 850));

    case 'tapfrenzy':
      return Math.min(1000, (r.taps || 0) * 8);

    case 'fastfingers':
      // FIX: was 1000-ms/10 with no error penalty
      return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 20) - (r.errors || 0) * 50));

    case 'gridlock':
      if (!r.solved) return 0;
      return Math.min(1000, Math.max(200, 1000 - (r.moves || 0) * 35) + timeBonus(150, 500));

    case 'speedsort':
      // FIX: was 1000-ms/5 (impossible to score). Now breakeven at 40s.
      return Math.max(0, Math.min(1000, 2000 - Math.floor(ms / 20)));

    case 'findbomb':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor(((r.found || 0) / r.total) * 700) + timeBonus(300, 300));

    case 'mathrace':
      if (!r.total) return 0;
      return Math.min(1000, Math.floor((r.correct / r.total) * 700) + timeBonus(300, 300));

    case 'simonextreme':
      return Math.min(1000, (r.level || 0) * 100);

    case 'tangram':
      return Math.max(0, Math.min(1000, 1000 - Math.floor(ms / 200)));

    case 'colormatch':
      // FIX: was pairs*28 → max 504. 18 pairs total → properly scaled.
      return Math.min(1000, Math.round((r.pairs || 0) / 18 * 1000));

    case 'tunneldodge':
      return Math.min(1000, (r.distance || 0) * 4);

    default:
      return 0;
  }
}

// Dual export: Node.js + browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcScore, SCORE_META };
}
if (typeof window !== 'undefined') {
  window.Scoring = { calcScore, SCORE_META };
}
