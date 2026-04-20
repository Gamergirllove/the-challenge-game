(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['cori'] = new window.CPU({
    name:       'Cori',
    emoji:      '♟️',
    color:      '#80cbc4',
    tagline:    'The Strategist',
    bio:        'Cori treats every puzzle like a chess match. Methodical, deliberate — and painfully slow. Speed games make her visibly uncomfortable.',
    style:      'strategist',
    strengths:  ['minesweeper', 'patternmatch', 'tessellations', 'tangram', 'gridlock', 'emojisort'],
    weaknesses: ['tapfrenzy', 'reaction', 'jumprope', 'tunneldodge', 'speedsort'],
    variance:   0.14,
    speedFactor: 1.25,
  });
})();
