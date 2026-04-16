// scoring.test.js — Zero-dependency test runner for scoring.js
// Run with: node scoring.test.js
'use strict';

const { calcScore, SCORE_META } = require('./scoring');

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  PASS: ${description}`);
    passed++;
  } else {
    console.error(`  FAIL: ${description}`);
    failed++;
  }
}

function assertEq(description, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS: ${description} (${actual})`);
    passed++;
  } else {
    console.error(`  FAIL: ${description} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertRange(description, actual, min, max) {
  const ok = actual >= min && actual <= max;
  if (ok) {
    console.log(`  PASS: ${description} (${actual} in [${min}, ${max}])`);
    passed++;
  } else {
    console.error(`  FAIL: ${description} — expected [${min}, ${max}], got ${actual}`);
    failed++;
  }
}

// ============================================================
// GLOBAL INVARIANTS
// ============================================================
console.log('\n=== Global invariants ===');

const allTypes = Object.keys(SCORE_META);
assertEq('SCORE_META has 23 game types', allTypes.length, 23);

// Every type is covered by calcScore and returns a number
for (const type of allTypes) {
  const score = calcScore(type, {}, 0);
  assert(`${type}: calcScore returns a number`, typeof score === 'number');
  assert(`${type}: score >= 0 with empty result`, score >= 0);
  assert(`${type}: score <= 1000 with empty result`, score <= 1000);
}

// No score can exceed 1000 or drop below 0 under any inputs
console.log('\n=== No score can exceed 1000 or go below 0 ===');
const extremeResults = [
  null, undefined, {},
  { correct: 9999, total: 1 },
  { pairs: 99999 },
  { taps: 99999 },
  { hits: 99999 },
  { distance: 99999 },
  { score: 99999 },
  { level: 99999 },
  { safe: 99999, won: true },
  { errors: 0 },
  { avgMs: 0 },
];
for (const type of allTypes) {
  for (const r of extremeResults) {
    for (const ms of [0, 1, 100, 1000, 99999999]) {
      const s = calcScore(type, r, ms);
      assert(`${type} result=${JSON.stringify(r)} ms=${ms}: 0 <= ${s} <= 1000`, s >= 0 && s <= 1000);
    }
  }
}

// ============================================================
// EDGE CASES
// ============================================================
console.log('\n=== Edge cases: null/undefined result, ms=0/undefined ===');

assert('calcScore with result=null does not throw', (() => { try { calcScore('memory', null, 0); return true; } catch(e) { return false; } })());
assert('calcScore with result=undefined does not throw', (() => { try { calcScore('memory', undefined, 0); return true; } catch(e) { return false; } })());
assert('calcScore with ms=undefined does not throw', (() => { try { calcScore('memory', {}, undefined); return true; } catch(e) { return false; } })());
assert('calcScore with ms=null does not throw', (() => { try { calcScore('memory', {}, null); return true; } catch(e) { return false; } })());
assertEq('calcScore with unknown type returns 0', calcScore('notreal', {}, 0), 0);
assertEq('calcScore with ms=0 for memory returns 1000', calcScore('memory', {}, 0), 1000);
assertEq('calcScore with ms=undefined normalizes to 0 for memory', calcScore('memory', {}, undefined), 1000);

// ============================================================
// MEMORY
// ============================================================
console.log('\n=== memory ===');
assertEq('memory: 0ms = 1000', calcScore('memory', {}, 0), 1000);
assertEq('memory: 150000ms = 0', calcScore('memory', {}, 150000), 0);
assertRange('memory: 75000ms = ~500', calcScore('memory', {}, 75000), 490, 510);
assert('memory: ignores result fields', calcScore('memory', { anything: 999 }, 0) === 1000);

// ============================================================
// QUICKMATH
// ============================================================
console.log('\n=== quickmath ===');
assertEq('quickmath: no total returns 0', calcScore('quickmath', {}, 0), 0);
assertEq('quickmath: 8/8 correct at 0ms = 1000', calcScore('quickmath', { correct: 8, total: 8 }, 0), 1000);
assertEq('quickmath: 0/8 correct at 0ms = 300 (timeBonus)', calcScore('quickmath', { correct: 0, total: 8 }, 0), 300);
assertRange('quickmath: 4/8 correct = ~350+timeBonus', calcScore('quickmath', { correct: 4, total: 8 }, 0), 640, 660);

// ============================================================
// REACTION
// ============================================================
console.log('\n=== reaction ===');
assertEq('reaction: 0ms avg = 1000', calcScore('reaction', { avgMs: 0 }, 0), 1000);
// Note: avgMs=0 means 0ms reaction time → 1000 - floor(0/3) = 1000
assertEq('reaction: 3000ms avg = 0', calcScore('reaction', { avgMs: 3000 }, 0), 0);
assertRange('reaction: 100ms avg ≈ 967', calcScore('reaction', { avgMs: 100 }, 0), 960, 970);
assertEq('reaction: missing avgMs defaults to 3000 = 0', calcScore('reaction', {}, 0), 0);

// ============================================================
// WORDSCRAMBLE
// ============================================================
console.log('\n=== wordscramble ===');
assertEq('wordscramble: no total returns 0', calcScore('wordscramble', {}, 0), 0);
assertEq('wordscramble: 6/6 at 0ms = 1000', calcScore('wordscramble', { correct: 6, total: 6 }, 0), 1000);
assertEq('wordscramble: 0/6 at 0ms = 300 (timeBonus)', calcScore('wordscramble', { correct: 0, total: 6 }, 0), 300);

// ============================================================
// COLORSEQ
// ============================================================
console.log('\n=== colorseq ===');
assertEq('colorseq: level 0 = 0', calcScore('colorseq', { level: 0 }, 0), 0);
assertEq('colorseq: level 10 = 1000', calcScore('colorseq', { level: 10 }, 0), 1000);
assertEq('colorseq: level 5 = 500', calcScore('colorseq', { level: 5 }, 0), 500);
assertEq('colorseq: level 20 capped at 1000', calcScore('colorseq', { level: 20 }, 0), 1000);
assertEq('colorseq: missing level = 0', calcScore('colorseq', {}, 0), 0);

// ============================================================
// TRIVIA
// ============================================================
console.log('\n=== trivia ===');
assertEq('trivia: no total returns 0', calcScore('trivia', {}, 0), 0);
assertEq('trivia: 8/8 at 0ms = 1000', calcScore('trivia', { correct: 8, total: 8 }, 0), 1000);
assertEq('trivia: 0/8 at 0ms = 300 (timeBonus)', calcScore('trivia', { correct: 0, total: 8 }, 0), 300);

// ============================================================
// TESSELLATIONS
// ============================================================
console.log('\n=== tessellations ===');
assertEq('tessellations: no total returns 0', calcScore('tessellations', {}, 0), 0);
assertEq('tessellations: all correct at 0ms = 1000', calcScore('tessellations', { correct: 10, total: 10 }, 0), 1000);
assertEq('tessellations: none correct at 0ms = 300 (timeBonus)', calcScore('tessellations', { correct: 0, total: 10 }, 0), 300);

// ============================================================
// NUMBERHUNT — key fixed game
// ============================================================
console.log('\n=== numberhunt (FIXED) ===');
// Old formula: 1000 - ms/5 → at 10000ms → 1000-2000 = 0. At 5000ms → 0.
// New formula: 2500 - ms/15 → at 15000ms → 1000. At 37500ms → 0.
assertEq('numberhunt: 0ms = 1000', calcScore('numberhunt', {}, 0), 1000);
assertEq('numberhunt: 37500ms = 0 (breakeven)', calcScore('numberhunt', {}, 37500), 0);
assertRange('numberhunt: 15000ms = ~1000 (good time)', calcScore('numberhunt', {}, 15000), 900, 1000);
assertRange('numberhunt: 25000ms = ~833 (typical time)', calcScore('numberhunt', {}, 25000), 700, 900);
// OLD formula would give 0 for 10s but new gives positive
assert('numberhunt: 10000ms gives positive score (old formula failed)', calcScore('numberhunt', {}, 10000) > 0);
assert('numberhunt: 30000ms gives positive score (old formula failed)', calcScore('numberhunt', {}, 30000) > 0);

// ============================================================
// PATTERNMATCH
// ============================================================
console.log('\n=== patternmatch ===');
assertEq('patternmatch: no total returns 0', calcScore('patternmatch', {}, 0), 0);
assertEq('patternmatch: score=total=10 = 1000', calcScore('patternmatch', { score: 10, total: 10 }, 0), 1000);
assertEq('patternmatch: score=0 total=10 = 0', calcScore('patternmatch', { score: 0, total: 10 }, 0), 0);
assertRange('patternmatch: score=5 total=10 = 500', calcScore('patternmatch', { score: 5, total: 10 }, 0), 490, 510);

// ============================================================
// EMOJISORT
// ============================================================
console.log('\n=== emojisort ===');
assertEq('emojisort: no total returns 0', calcScore('emojisort', {}, 0), 0);
assertEq('emojisort: all correct at 0ms = 1000', calcScore('emojisort', { correct: 8, total: 8 }, 0), 1000);
assertEq('emojisort: none correct at 0ms = 300 (timeBonus)', calcScore('emojisort', { correct: 0, total: 8 }, 0), 300);

// ============================================================
// CURLING
// ============================================================
console.log('\n=== curling ===');
assertEq('curling: score=0 = 0', calcScore('curling', { score: 0 }, 0), 0);
assertEq('curling: score=50 = 1000', calcScore('curling', { score: 50 }, 0), 1000);
assertEq('curling: score=25 = 500', calcScore('curling', { score: 25 }, 0), 500);
assertEq('curling: missing score = 0', calcScore('curling', {}, 0), 0);

// ============================================================
// JUMPROPE
// ============================================================
console.log('\n=== jumprope ===');
assertEq('jumprope: 0 hits = 0', calcScore('jumprope', { hits: 0 }, 0), 0);
assertEq('jumprope: 20 hits = 1000', calcScore('jumprope', { hits: 20 }, 0), 1000);
assertEq('jumprope: 10 hits = 500', calcScore('jumprope', { hits: 10 }, 0), 500);
assertEq('jumprope: missing hits = 0', calcScore('jumprope', {}, 0), 0);

// ============================================================
// MINESWEEPER — fixed: won/lost distinction
// ============================================================
console.log('\n=== minesweeper (FIXED) ===');
// Won: 900-1000 based on speed
assertRange('minesweeper: won at 0ms = 1000', calcScore('minesweeper', { won: true, safe: 28 }, 0), 999, 1000);
assertRange('minesweeper: won at 1000ms = 999', calcScore('minesweeper', { won: true, safe: 28 }, 1000), 998, 1000);
assertRange('minesweeper: won at 100000ms = 900', calcScore('minesweeper', { won: true, safe: 28 }, 100000), 900, 901);
// Lost: 0-850 based on safe cells
assertEq('minesweeper: lost 0 safe = 0', calcScore('minesweeper', { won: false, safe: 0 }, 0), 0);
assertRange('minesweeper: lost 28 safe = 850', calcScore('minesweeper', { won: false, safe: 28 }, 0), 849, 851);
assertRange('minesweeper: lost 14 safe = ~425', calcScore('minesweeper', { won: false, safe: 14 }, 0), 420, 430);
// Old formula: safe*40 ignored won/lost. New: won gives 900+
assert('minesweeper: won gives >= 900 (old formula ignored won)', calcScore('minesweeper', { won: true, safe: 28 }, 5000) >= 900);

// ============================================================
// TAPFRENZY
// ============================================================
console.log('\n=== tapfrenzy ===');
assertEq('tapfrenzy: 0 taps = 0', calcScore('tapfrenzy', { taps: 0 }, 0), 0);
assertEq('tapfrenzy: 125 taps = 1000', calcScore('tapfrenzy', { taps: 125 }, 0), 1000);
assertEq('tapfrenzy: 63 taps = 504', calcScore('tapfrenzy', { taps: 63 }, 0), 504);
assertEq('tapfrenzy: missing taps = 0', calcScore('tapfrenzy', {}, 0), 0);

// ============================================================
// FASTFINGERS — fixed: was 1000-ms/10, now includes errors
// ============================================================
console.log('\n=== fastfingers (FIXED) ===');
assertEq('fastfingers: 0ms 0 errors = 1000', calcScore('fastfingers', { errors: 0 }, 0), 1000);
assertEq('fastfingers: 0ms 20 errors = 0', calcScore('fastfingers', { errors: 20 }, 0), 0);
assertRange('fastfingers: 5000ms 0 errors = 750', calcScore('fastfingers', { errors: 0 }, 5000), 749, 751);
// Old formula: 1000-ms/10. At 5000ms that's 500. New: 1000-ms/20 = 750.
assert('fastfingers: 5000ms with old formula would be 500, new is 750', calcScore('fastfingers', { errors: 0 }, 5000) > 600);
assertRange('fastfingers: 5000ms 2 errors = 650', calcScore('fastfingers', { errors: 2 }, 5000), 649, 651);
assertEq('fastfingers: 20000ms 0 errors = 0', calcScore('fastfingers', { errors: 0 }, 20000), 0);

// ============================================================
// GRIDLOCK
// ============================================================
console.log('\n=== gridlock ===');
assertEq('gridlock: not solved = 0', calcScore('gridlock', { solved: false, moves: 5 }, 0), 0);
assertEq('gridlock: solved=undefined = 0', calcScore('gridlock', {}, 0), 0);
assertRange('gridlock: solved 0 moves 0ms = ~1150 capped at 1000', calcScore('gridlock', { solved: true, moves: 0 }, 0), 999, 1000);
assertRange('gridlock: solved 10 moves = ~650+timeBonus', calcScore('gridlock', { solved: true, moves: 10 }, 0), 800, 810);

// ============================================================
// SPEEDSORT — key fixed game
// ============================================================
console.log('\n=== speedsort (FIXED) ===');
// Old formula: 1000-ms/5 → at 10000ms → 1000-2000 = 0. At 5000ms → 0.
// New formula: 2000-ms/20 → at 20000ms → 1000. At 40000ms → 0.
assertEq('speedsort: 0ms = 1000', calcScore('speedsort', {}, 0), 1000);
assertEq('speedsort: 40000ms = 0 (breakeven)', calcScore('speedsort', {}, 40000), 0);
assertRange('speedsort: 20000ms = 1000 (fast)', calcScore('speedsort', {}, 20000), 999, 1000);
assertRange('speedsort: 30000ms = ~500', calcScore('speedsort', {}, 30000), 490, 510);
// Old formula gives 0 for 10s, new gives 1000
assert('speedsort: 10000ms gives positive score (old formula failed)', calcScore('speedsort', {}, 10000) > 0);
assert('speedsort: 15000ms gives positive score (old formula failed)', calcScore('speedsort', {}, 15000) > 0);

// ============================================================
// FINDBOMB
// ============================================================
console.log('\n=== findbomb ===');
assertEq('findbomb: no total returns 0', calcScore('findbomb', {}, 0), 0);
assertEq('findbomb: 8/8 at 0ms = 1000', calcScore('findbomb', { found: 8, total: 8 }, 0), 1000);
assertEq('findbomb: 0/8 at 0ms = 300 (timeBonus)', calcScore('findbomb', { found: 0, total: 8 }, 0), 300);

// ============================================================
// MATHRACE
// ============================================================
console.log('\n=== mathrace ===');
assertEq('mathrace: no total returns 0', calcScore('mathrace', {}, 0), 0);
assertEq('mathrace: 10/10 at 0ms = 1000', calcScore('mathrace', { correct: 10, total: 10 }, 0), 1000);
assertEq('mathrace: 0/10 at 0ms = 300 (timeBonus)', calcScore('mathrace', { correct: 0, total: 10 }, 0), 300);

// ============================================================
// SIMONEXTREME
// ============================================================
console.log('\n=== simonextreme ===');
assertEq('simonextreme: level 0 = 0', calcScore('simonextreme', { level: 0 }, 0), 0);
assertEq('simonextreme: level 10 = 1000', calcScore('simonextreme', { level: 10 }, 0), 1000);
assertEq('simonextreme: missing level = 0', calcScore('simonextreme', {}, 0), 0);
assertEq('simonextreme: level 5 = 500', calcScore('simonextreme', { level: 5 }, 0), 500);

// ============================================================
// TANGRAM
// ============================================================
console.log('\n=== tangram ===');
assertEq('tangram: 0ms = 1000', calcScore('tangram', {}, 0), 1000);
assertEq('tangram: 200000ms = 0', calcScore('tangram', {}, 200000), 0);
assertRange('tangram: 100000ms = ~500', calcScore('tangram', {}, 100000), 490, 510);

// ============================================================
// COLORMATCH — key fixed game
// ============================================================
console.log('\n=== colormatch (FIXED) ===');
// Old formula: pairs*28 → 18 pairs = 504, never reaches 1000
// New formula: pairs/18*1000 → 18 pairs = 1000
assertEq('colormatch: 0 pairs = 0', calcScore('colormatch', { pairs: 0 }, 0), 0);
assertEq('colormatch: 18 pairs = 1000', calcScore('colormatch', { pairs: 18 }, 0), 1000);
assertRange('colormatch: 9 pairs = ~500', calcScore('colormatch', { pairs: 9 }, 0), 490, 510);
// Old formula would give 18*28=504 for full board, new gives 1000
assert('colormatch: 18 pairs gives 1000 (old formula gave 504)', calcScore('colormatch', { pairs: 18 }, 0) === 1000);
assert('colormatch: old formula max (504) is now exceeded', calcScore('colormatch', { pairs: 18 }, 0) > 504);
assertEq('colormatch: missing pairs = 0', calcScore('colormatch', {}, 0), 0);

// ============================================================
// TUNNELDODGE
// ============================================================
console.log('\n=== tunneldodge ===');
assertEq('tunneldodge: 0 distance = 0', calcScore('tunneldodge', { distance: 0 }, 0), 0);
assertEq('tunneldodge: 250 distance = 1000', calcScore('tunneldodge', { distance: 250 }, 0), 1000);
assertEq('tunneldodge: 125 distance = 500', calcScore('tunneldodge', { distance: 125 }, 0), 500);
assertEq('tunneldodge: missing distance = 0', calcScore('tunneldodge', {}, 0), 0);

// ============================================================
// SUMMARY
// ============================================================
console.log('\n============================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
