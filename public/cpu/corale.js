(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['corale'] = new window.CPU({
    name:       'Corale',
    emoji:      '🎨',
    color:      '#f48fb1',
    tagline:    'The Artist',
    bio:        'Corale sees the world in color and patterns. Visual puzzles are her canvas. Numbers and math? That\'s someone else\'s problem.',
    style:      'artist',
    strengths:  ['colormatch', 'colorseq', 'patternmatch', 'emojisort', 'tessellations', 'tangram'],
    weaknesses: ['quickmath', 'numberhunt', 'fastfingers'],
    variance:   0.18,
    speedFactor: 1.05,
  });
})();
