(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['tony-time'] = new window.CPU({
    name:       'Tony Time',
    emoji:      '⚡',
    color:      '#ffcc02',
    tagline:    'The Speedrunner',
    bio:        'Tony finishes every game like his flight is boarding. Blazing fast, but patience-based puzzles make him rage quit early.',
    style:      'speedrunner',
    strengths:  ['tapfrenzy', 'reaction', 'jumprope', 'speedsort', 'fastfingers', 'tunneldodge'],
    weaknesses: ['minesweeper', 'tessellations', 'tangram', 'gridlock'],
    variance:   0.20,
    speedFactor: 0.60,
  });
})();
