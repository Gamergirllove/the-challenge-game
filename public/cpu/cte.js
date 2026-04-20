(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['cte'] = new window.CPU({
    name:       'CTE',
    emoji:      '🧠',
    color:      '#ef9a9a',
    tagline:    'The Wild Card',
    bio:        'Absolutely unhinged. Some days a genius, some days a disaster. Nobody knows what you\'re gonna get — not even CTE.',
    style:      'chaotic',
    strengths:  ['reaction', 'tapfrenzy', 'jumprope'],
    weaknesses: ['trivia', 'wordscramble', 'tangram'],
    variance:   0.45,
    speedFactor: 0.9,
    scoreOverrides: {
      easy:   [40, 600],
      medium: [60, 800],
      hard:   [80, 950],
    },
  });
})();
