(function() {
  window.CPUContestants = window.CPUContestants || {};
  window.CPUContestants['brookie-the-rookie'] = new window.CPU({
    name:       'Brookie the Rookie',
    emoji:      '🌱',
    color:      '#80deea',
    tagline:    'The Underdog',
    bio:        'Fresh out the gate and learning fast. Easy mode? Rough. Hard mode? Somehow thriving — turns out the pressure brings out the best in her.',
    style:      'underdog',
    strengths:  ['colormatch', 'reaction', 'tapfrenzy'],
    weaknesses: ['trivia', 'minesweeper', 'tangram', 'tessellations'],
    variance:   0.30,
    speedFactor: 1.1,
    scoreOverrides: {
      easy:   [40,  220],
      medium: [180, 520],
      hard:   [460, 820],
    },
  });
})();
