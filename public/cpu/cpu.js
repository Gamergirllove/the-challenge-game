// Base CPU contestant class
(function() {
  'use strict';

  // [easy_min, easy_max, med_min, med_max, hard_min, hard_max]
  const SCORE_RANGES = {
    memory:       [120, 320,  280, 520,  450, 780],
    quickmath:    [100, 280,  240, 500,  420, 750],
    reaction:     [150, 350,  300, 580,  500, 820],
    wordscramble: [80,  260,  220, 480,  400, 730],
    colorseq:     [100, 300,  260, 520,  440, 770],
    trivia:       [60,  240,  200, 460,  380, 700],
    tessellations:[90,  270,  240, 490,  410, 740],
    numberhunt:   [110, 310,  270, 530,  450, 780],
    tapfrenzy:    [130, 330,  290, 550,  470, 800],
    curling:      [80,  260,  230, 470,  400, 720],
    patternmatch: [100, 290,  250, 510,  430, 760],
    emojisort:    [90,  270,  240, 490,  420, 750],
    fastfingers:  [70,  250,  210, 460,  380, 700],
    gridlock:     [80,  260,  230, 480,  400, 720],
    speedsort:    [110, 300,  260, 520,  440, 770],
    jumprope:     [130, 340,  300, 560,  480, 810],
    minesweeper:  [60,  230,  200, 450,  370, 680],
    findbomb:     [90,  270,  240, 490,  410, 740],
    simonextreme: [80,  260,  230, 480,  400, 730],
    tangram:      [70,  240,  210, 460,  370, 680],
    colormatch:   [110, 310,  270, 530,  450, 780],
    tunneldodge:  [100, 300,  260, 520,  440, 770],
  };

  // [easy_min, easy_max, med_min, med_max, hard_min, hard_max] in ms
  const TIME_RANGES = {
    memory:       [22000, 48000, 15000, 35000, 8000, 22000],
    quickmath:    [20000, 45000, 13000, 30000, 7000, 18000],
    reaction:     [18000, 40000, 11000, 26000, 5000, 15000],
    wordscramble: [25000, 50000, 16000, 36000, 9000, 24000],
    colorseq:     [20000, 44000, 13000, 30000, 7000, 18000],
    trivia:       [28000, 55000, 18000, 40000, 10000, 26000],
    tessellations:[24000, 50000, 15000, 34000, 8000, 22000],
    numberhunt:   [20000, 44000, 13000, 30000, 7000, 18000],
    tapfrenzy:    [15000, 38000, 10000, 24000, 5000, 14000],
    curling:      [22000, 48000, 14000, 32000, 8000, 20000],
    patternmatch: [20000, 44000, 13000, 29000, 7000, 18000],
    emojisort:    [22000, 46000, 14000, 32000, 8000, 20000],
    fastfingers:  [24000, 50000, 15000, 34000, 8000, 22000],
    gridlock:     [26000, 52000, 17000, 38000, 9000, 24000],
    speedsort:    [18000, 40000, 11000, 26000, 6000, 16000],
    jumprope:     [15000, 36000, 10000, 23000, 5000, 13000],
    minesweeper:  [30000, 58000, 20000, 44000, 11000, 28000],
    findbomb:     [22000, 46000, 14000, 32000, 8000, 20000],
    simonextreme: [22000, 46000, 14000, 32000, 8000, 20000],
    tangram:      [26000, 54000, 17000, 38000, 9000, 24000],
    colormatch:   [20000, 44000, 13000, 30000, 7000, 18000],
    tunneldodge:  [18000, 40000, 11000, 26000, 6000, 16000],
  };

  const DIFF_IDX = { easy: 0, medium: 1, hard: 2 };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  class CPU {
    constructor({ name, emoji, color, bio, style, tagline, strengths, weaknesses, variance, speedFactor, scoreOverrides }) {
      this.name          = name;
      this.emoji         = emoji;
      this.color         = color || '#aaa';
      this.bio           = bio || '';
      this.style         = style || 'balanced';
      this.tagline       = tagline || '';
      this.strengths     = strengths  || [];   // game types CPU is better at
      this.weaknesses    = weaknesses || [];   // game types CPU is worse at
      this.variance      = variance   || 0.18; // how unpredictable (0=robot, 0.5=chaotic)
      this.speedFactor   = speedFactor || 1.0; // >1 = slower, <1 = faster
      this.scoreOverrides = scoreOverrides || {}; // { easy:[min,max], medium:[min,max], hard:[min,max] }
      this._highScores   = {};
    }

    // Returns { score, timeMs }
    play(gameType, difficulty) {
      const diff = difficulty || 'medium';
      const di   = DIFF_IDX[diff] !== undefined ? DIFF_IDX[diff] : 1;

      // Pick score range
      let scoreMin, scoreMax;
      if (this.scoreOverrides[diff]) {
        [scoreMin, scoreMax] = this.scoreOverrides[diff];
      } else {
        const ranges = SCORE_RANGES[gameType] || SCORE_RANGES.memory;
        scoreMin = ranges[di * 2];
        scoreMax = ranges[di * 2 + 1];
      }

      // Strength/weakness multiplier
      let mult = 1.0;
      if (this.strengths.includes(gameType))  mult += 0.18;
      if (this.weaknesses.includes(gameType)) mult -= 0.20;

      // Apply variance (Gaussian-ish via sum of two uniforms)
      const noise = (Math.random() + Math.random()) / 2 - 0.5; // -0.5..0.5
      mult += noise * this.variance * 2;

      // Base score from midpoint, shifted by mult
      const mid    = (scoreMin + scoreMax) / 2;
      const half   = (scoreMax - scoreMin) / 2;
      const score  = clamp(Math.round(mid + half * (mult - 1) * 1.5), scoreMin, scoreMax);

      // Time
      const timeRanges = TIME_RANGES[gameType] || TIME_RANGES.memory;
      const tMin = timeRanges[di * 2]     * this.speedFactor;
      const tMax = timeRanges[di * 2 + 1] * this.speedFactor;
      const timeMs = Math.round(rand(tMin, tMax));

      // Track high score
      if (score > (this._highScores[gameType] || 0)) {
        this._highScores[gameType] = score;
      }

      return { score: clamp(score, 0, 1000), timeMs };
    }

    // Returns array of {timeMs, score} progress checkpoints leading to finalScore
    getProgressSteps(finalScore, totalTimeMs, stepCount) {
      stepCount = stepCount || 5;
      const steps = [];
      for (let i = 1; i <= stepCount; i++) {
        const t = Math.round(totalTimeMs * (i / stepCount));
        // Score builds roughly quadratically, with noise
        const pct   = i / stepCount;
        const noise = (Math.random() - 0.5) * 0.15;
        const s     = clamp(Math.round(finalScore * (pct * pct + noise)), 0, finalScore);
        steps.push({ timeMs: t, score: s });
      }
      steps[steps.length - 1].score = finalScore;
      return steps;
    }

    getHighScore(gameType) { return this._highScores[gameType] || 0; }
    getAllHighScores()      { return Object.assign({}, this._highScores); }

    toPublic() {
      return {
        name:      this.name,
        emoji:     this.emoji,
        color:     this.color,
        bio:       this.bio,
        tagline:   this.tagline,
        style:     this.style,
      };
    }
  }

  window.CPU = CPU;
  window.CPUContestants = window.CPUContestants || {};
})();
