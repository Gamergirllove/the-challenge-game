(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['eve'] = new window.CPU({
    name:       'Eve',
    emoji:      '📐',
    color:      '#b0bec5',
    tagline:    'The Perfectionist',
    bio:        'Eve will not submit until every answer is absolutely correct. Incredibly consistent — but sometimes runs out the clock chasing perfection.',
    style:      'perfectionist',
    strengths:  ['minesweeper', 'patternmatch', 'quickmath', 'tangram'],
    weaknesses: ['tapfrenzy', 'jumprope', 'tunneldodge'],
    variance:   0.07,
    speedFactor: 1.35,
  });
})();
