// ============================================================
//  PUZZLES.JS — All puzzle renderers
//  Each puzzle calls onComplete({ result, timeMs })
//  Each puzzle calls onProgress(score) for live updates
// ============================================================

window.Puzzles = {

  // ──────────────────────────────────────────────────────────
  // DAILY: MEMORY MATCH
  // ──────────────────────────────────────────────────────────
  memory(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let flipped = [], matched = 0, locked = false;
    const cards = data.cards.map(c => ({ ...c, isFlipped: false, isMatched: false }));
    container.innerHTML = `
      <div class="memory-grid" id="mem-grid"></div>
      <div style="margin-top:1rem;font-size:.9rem;color:var(--muted);letter-spacing:.15em">MATCHED: <span id="mem-matched">0</span> / ${data.pairs}</div>`;
    const grid = container.querySelector('#mem-grid');
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'mem-card';
      el.dataset.idx = i;
      el.innerHTML = `<span class="mem-card-back">❓</span><span class="mem-card-face">${card.emoji}</span>`;
      el.addEventListener('click', () => flip(i, el));
      grid.appendChild(el);
    });
    function flip(i, el) {
      const card = cards[i];
      if (locked || card.isFlipped || card.isMatched) return;
      card.isFlipped = true; el.classList.add('flipped');
      flipped.push({ i, el });
      if (flipped.length === 2) {
        locked = true;
        const [a, b] = flipped;
        if (cards[a.i].emoji === cards[b.i].emoji) {
          cards[a.i].isMatched = cards[b.i].isMatched = true;
          a.el.classList.add('matched'); b.el.classList.add('matched');
          matched++;
          container.querySelector('#mem-matched').textContent = matched;
          if (onProgress) onProgress(Math.floor((matched / data.pairs) * 900));
          flipped = []; locked = false;
          if (matched === data.pairs) onComplete({ result: {}, timeMs: Date.now() - startTime });
        } else {
          setTimeout(() => {
            cards[a.i].isFlipped = cards[b.i].isFlipped = false;
            a.el.classList.remove('flipped'); b.el.classList.remove('flipped');
            flipped = []; locked = false;
          }, 900);
        }
      }
    }
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: QUICK MATH
  // ──────────────────────────────────────────────────────────
  quickmath(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;
    function render() {
      if (qi >= qs.length) { onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime }); return; }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question">${q.q} = ?</div>
          <div class="qa-choices">${q.choices.map(c=>`<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}</div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const isRight = Number(btn.dataset.val) === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(Number(b.dataset.val)===q.a) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/(qs.length))*700));
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: REACTION TEST
  // ──────────────────────────────────────────────────────────
  reaction(container, data, onComplete, onProgress) {
    const times = [];
    let round = 0, waiting = false, waitTimer = null, showTime = null;
    function render() {
      container.innerHTML = `
        <div class="reaction-container">
          <div class="reaction-info">ROUND ${round+1} OF ${data.rounds} — CLICK WHEN RED!</div>
          <div class="reaction-zone waiting" id="rzone"><span>GET READY…</span></div>
          <div class="reaction-times" id="rtimes"></div>
        </div>`;
      startRound();
    }
    function startRound() {
      const zone = container.querySelector('#rzone'); if (!zone) return;
      zone.className = 'reaction-zone waiting'; zone.innerHTML = '<span>⏳ WAIT…</span>';
      waiting = true;
      const delay = data.delays[round] || (Math.random()*3000+1500);
      waitTimer = setTimeout(() => {
        if (!container.querySelector('#rzone')) return;
        const z = container.querySelector('#rzone');
        z.className = 'reaction-zone ready'; z.innerHTML = '<span>⚡ CLICK NOW!</span>';
        waiting = false; showTime = Date.now();
      }, delay);
      zone.addEventListener('click', handleClick, { once: true });
    }
    function handleClick() {
      if (waiting) {
        clearTimeout(waitTimer);
        const zone = container.querySelector('#rzone');
        if (zone) { zone.className = 'reaction-zone clicked-early'; zone.innerHTML = '<span>TOO EARLY! Penalty</span>'; }
        times.push(999); updateTimes();
        setTimeout(() => { round++; if (round < data.rounds) render(); else finish(); }, 1000);
        return;
      }
      const ms = Date.now() - showTime;
      times.push(ms);
      const zone = container.querySelector('#rzone');
      if (zone) { zone.className = 'reaction-zone result'; zone.innerHTML = `<span>⚡ ${ms}ms</span><span style="font-size:1rem;color:var(--muted)">${ratingLabel(ms)}</span>`; }
      updateTimes();
      const valid = times.filter(t=>t!==999);
      const avg = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 999;
      if (onProgress) onProgress(Math.max(0, Math.min(1000, 1000 - Math.floor(avg/3))));
      round++;
      setTimeout(() => { if (round < data.rounds) render(); else finish(); }, 800);
    }
    function updateTimes() {
      const el = container.querySelector('#rtimes'); if (!el) return;
      el.innerHTML = times.map((t,i)=>`<span class="reaction-chip">R${i+1}: ${t===999?'EARLY':t+'ms'}</span>`).join('');
    }
    function ratingLabel(ms) {
      if (ms < 200) return '🔥 LIGHTNING!'; if (ms < 300) return '⚡ FAST'; if (ms < 450) return '👍 GOOD'; if (ms < 600) return '😐 OK'; return '🐢 SLOW';
    }
    function finish() {
      const valid = times.filter(t=>t!==999);
      const avg = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 999;
      onComplete({ result: { avgMs: avg }, timeMs: avg });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: WORD SCRAMBLE
  // ──────────────────────────────────────────────────────────
  wordscramble(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let wi = 0, correct = 0;
    const words = data.words;
    function render() {
      if (wi >= words.length) { onComplete({ result: { correct, total: words.length }, timeMs: Date.now() - startTime }); return; }
      const w = words[wi];
      container.innerHTML = `
        <div class="word-container anim-pop-in">
          <div class="word-progress">WORD ${wi+1} / ${words.length} — ${correct} CORRECT</div>
          <div class="word-scrambled">${w.scrambled}</div>
          <div class="word-hint">HINT: ${w.hint}</div>
          <div class="word-input-row">
            <input class="word-answer-input" id="wanswer" type="text" placeholder="TYPE YOUR ANSWER" autocomplete="off" autocorrect="off" spellcheck="false"/>
            <button class="btn btn-primary word-submit" id="wsubmit">GO</button>
          </div>
          <div class="word-feedback" id="wfeedback"></div>
        </div>`;
      const input = container.querySelector('#wanswer');
      const submit = container.querySelector('#wsubmit');
      input.focus();
      const check = () => {
        const ans = input.value.trim().toUpperCase();
        if (!ans) return;
        const isRight = ans === w.word;
        if (isRight) { correct++; input.classList.add('correct'); container.querySelector('#wfeedback').textContent='✅ CORRECT!'; container.querySelector('#wfeedback').style.color='var(--green)'; }
        else { input.classList.add('wrong'); container.querySelector('#wfeedback').innerHTML=`❌ It was <strong>${w.word}</strong>`; container.querySelector('#wfeedback').style.color='var(--red)'; }
        input.disabled=true; submit.disabled=true;
        if (onProgress) onProgress(Math.floor((correct/words.length)*700));
        setTimeout(() => { wi++; render(); }, isRight ? 500 : 1200);
      };
      submit.addEventListener('click', check);
      input.addEventListener('keydown', e=>{ if(e.key==='Enter') check(); });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: COLOR SEQUENCE (Simon Says)
  // ──────────────────────────────────────────────────────────
  colorseq(container, data, onComplete, onProgress) {
    const colors = data.colors, colorHex = data.colorHex, sequence = data.sequence;
    let level = 1, playerTurn = false, playerIdx = 0, bestLevel = 0;
    function render() {
      container.innerHTML = `
        <div class="color-container">
          <div class="color-level">LEVEL <span id="clevel">${level}</span></div>
          <div class="color-info" id="cinfo">WATCH THE SEQUENCE…</div>
          <div class="color-sequence-display" id="cseq-dots"></div>
          <div class="color-buttons" id="cbtns">${colors.map(c=>`<button class="color-btn" data-color="${c}" style="background:${colorHex[c]}" disabled>${c}</button>`).join('')}</div>
        </div>`;
      container.addEventListener('click', e=>{
        const btn = e.target.closest('.color-btn');
        if (btn && !btn.disabled) handlePlayerClick(btn.dataset.color);
      });
      playSequence();
    }
    function playSequence() {
      playerTurn=false; setInfo('👁 WATCH THE SEQUENCE…'); disableBtns(true); updateDots();
      const seq = sequence.slice(0, level); let i = 0;
      const interval = setInterval(() => {
        if (i>0) unflashAll();
        if (i<seq.length) { flashColor(seq[i]); i++; }
        else { clearInterval(interval); setTimeout(()=>{ unflashAll(); enablePlayerTurn(); }, 400); }
      }, 700);
    }
    function enablePlayerTurn() { playerTurn=true; playerIdx=0; setInfo('🎯 REPEAT THE SEQUENCE!'); disableBtns(false); }
    function handlePlayerClick(color) {
      if (!playerTurn) return;
      const expected = sequence[playerIdx];
      flashColor(color); setTimeout(()=>unflashAll(),200);
      if (color !== expected) { setInfo(`❌ Wrong! Best: Level ${bestLevel}`); disableBtns(true); setTimeout(()=>onComplete({result:{level:bestLevel},timeMs:0}),1500); return; }
      playerIdx++;
      if (playerIdx===level) {
        bestLevel=level; level++;
        if (level>sequence.length) { setInfo('🔥 PERFECT!'); setTimeout(()=>onComplete({result:{level:bestLevel},timeMs:0}),1200); return; }
        if (onProgress) onProgress(Math.min(1000, bestLevel*100));
        setInfo('✅ CORRECT! Next level…'); disableBtns(true); setTimeout(()=>render(),1000);
      }
    }
    function flashColor(color) { const btn=container.querySelector(`[data-color="${color}"]`); if(btn) btn.classList.add('flash'); }
    function unflashAll() { container.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('flash')); }
    function disableBtns(dis) { container.querySelectorAll('.color-btn').forEach(b=>{ b.disabled=dis; b.classList.toggle('disabled',dis); }); }
    function setInfo(txt) { const el=container.querySelector('#cinfo'); if(el) el.textContent=txt; }
    function updateDots() { const el=container.querySelector('#cseq-dots'); if(!el) return; el.innerHTML=sequence.slice(0,level).map((c,i)=>`<div class="color-seq-dot" style="background:${colorHex[c]}"></div>`).join(''); }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: TRIVIA
  // ──────────────────────────────────────────────────────────
  trivia(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;
    function render() {
      if (qi >= qs.length) { onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime }); return; }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">❓ QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question" style="font-size:clamp(1.2rem,3vw,2rem)">${q.q}</div>
          <div class="qa-choices">${q.choices.map(c=>`<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}</div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const isRight = btn.dataset.val === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(b.dataset.val===q.a) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/qs.length)*700));
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: TESSELLATIONS
  // ──────────────────────────────────────────────────────────
  tessellations(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let correct = 0;
    const total = data.hidden.length;
    const hiddenSet = new Set(data.hidden.map(([r,c])=>`${r},${c}`));
    const userGrid = {};
    let selectedColor = null;

    function render() {
      container.innerHTML = `
        <div class="tess-container anim-fade-in">
          <div class="tess-header">
            <div class="tess-title">🔷 TESSELLATIONS</div>
            <div class="tess-sub">Spot the pattern — fill in the missing tiles!</div>
            <div class="tess-progress" id="tess-prog">${correct} / ${total} filled</div>
          </div>
          <div class="tess-grid" id="tess-grid" style="grid-template-columns:repeat(${data.size},1fr)"></div>
          <div class="tess-palette" id="tess-palette">
            ${data.colors.map((c,i)=>`<button class="tess-color-btn" data-idx="${i}" style="background:${c}"></button>`).join('')}
          </div>
          <div class="tess-hint">1️⃣ SELECT A COLOR &nbsp; 2️⃣ CLICK A ? TILE</div>
        </div>`;

      const grid = container.querySelector('#tess-grid');
      for (let r=0; r<data.size; r++) {
        for (let c=0; c<data.size; c++) {
          const cell = document.createElement('div');
          cell.className = 'tess-cell';
          cell.dataset.r = r; cell.dataset.c = c;
          const key = `${r},${c}`;
          if (hiddenSet.has(key) && userGrid[key] === undefined) {
            cell.classList.add('hidden'); cell.textContent = '?';
          } else {
            const idx = userGrid[key] !== undefined ? userGrid[key] : data.grid[r][c];
            cell.style.background = data.colors[idx];
          }
          grid.appendChild(cell);
        }
      }

      container.querySelectorAll('.tess-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = Number(btn.dataset.idx);
          container.querySelectorAll('.tess-color-btn').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });

      grid.addEventListener('click', e => {
        const cell = e.target.closest('.tess-cell');
        if (!cell || !cell.classList.contains('hidden')) return;
        if (selectedColor === null) { cell.classList.add('wrong-flash'); return; }
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const key = `${r},${c}`;
        const answer = data.grid[r][c];
        if (selectedColor === answer) {
          userGrid[key] = selectedColor;
          cell.classList.remove('hidden'); cell.classList.add('correct-fill');
          cell.style.background = data.colors[selectedColor]; cell.textContent = '';
          correct++;
          container.querySelector('#tess-prog').textContent = `${correct} / ${total} filled`;
          if (onProgress) onProgress(Math.floor((correct/total)*700));
          if (correct === total) setTimeout(()=>onComplete({result:{correct,total},timeMs:Date.now()-startTime}),400);
        } else {
          cell.classList.add('wrong-flash');
          setTimeout(()=>cell.classList.remove('wrong-flash'),400);
        }
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: NUMBER HUNT
  // ──────────────────────────────────────────────────────────
  numberhunt(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let nextNum = 1;
    const total = 16;
    container.innerHTML = `
      <div class="hunt-container anim-fade-in">
        <div class="hunt-header">
          <div class="hunt-title">🎯 NUMBER HUNT</div>
          <div class="hunt-sub">Click 1 → 16 in order as fast as possible!</div>
          <div class="hunt-next">FIND: <span id="hunt-next">${nextNum}</span></div>
        </div>
        <div class="hunt-grid" id="hunt-grid">
          ${data.nums.map(n=>`<button class="hunt-btn" data-num="${n}">${n}</button>`).join('')}
        </div>
        <div class="hunt-progress" id="hunt-prog">0 / ${total} found</div>
      </div>`;
    container.querySelector('#hunt-grid').addEventListener('click', e => {
      const btn = e.target.closest('.hunt-btn');
      if (!btn || btn.disabled) return;
      const num = Number(btn.dataset.num);
      if (num === nextNum) {
        btn.classList.add('found'); btn.disabled = true;
        nextNum++;
        const el = container.querySelector('#hunt-next');
        if (el) el.textContent = nextNum <= total ? nextNum : 'DONE!';
        container.querySelector('#hunt-prog').textContent = `${nextNum-1} / ${total} found`;
        if (onProgress) onProgress(Math.floor(((nextNum-1)/total)*900));
        if (nextNum > total) onComplete({ result:{}, timeMs: Date.now()-startTime });
      } else {
        btn.classList.add('wrong-flash');
        setTimeout(()=>btn.classList.remove('wrong-flash'), 300);
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: TAP FRENZY — tap the most times in 30 seconds
  // ──────────────────────────────────────────────────────────
  tapfrenzy(container, data, onComplete, onProgress) {
    const gameSecs = data.timeLimit || 30; let taps = 0, running = false, timeLeft = gameSecs, interval = null;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;max-width:420px">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">👆 TAP FRENZY</div>
        <div style="font-size:.9rem;color:var(--muted);letter-spacing:.15em">TAP AS FAST AS YOU CAN!</div>
        <div style="font-family:var(--font-title);font-size:1.4rem;color:var(--text)">TIME: <span id="tf-time" style="color:var(--red)">${timeLeft}s</span></div>
        <div id="tf-count" style="font-family:var(--font-title);font-size:5rem;color:var(--gold);line-height:1">0</div>
        <button id="tf-btn" style="
          width:200px;height:200px;border-radius:50%;
          background:radial-gradient(circle,var(--red),#800010);
          border:4px solid rgba(255,255,255,.2);
          font-family:var(--font-title);font-size:2rem;letter-spacing:.1em;
          color:#fff;cursor:pointer;user-select:none;
          box-shadow:0 0 30px rgba(232,25,44,.5);
          transition:transform .05s,filter .05s;
          -webkit-tap-highlight-color:transparent;
        ">TAP!</button>
        <div id="tf-result" style="font-size:.9rem;color:var(--muted);letter-spacing:.1em;min-height:1.2em"></div>
      </div>`;

    const btn = container.querySelector('#tf-btn');
    const countEl = container.querySelector('#tf-count');
    const timeEl = container.querySelector('#tf-time');
    const resultEl = container.querySelector('#tf-result');

    function startGame() {
      running = true;
      btn.style.background = 'radial-gradient(circle,#ff4444,#cc0000)';
      interval = setInterval(() => {
        timeLeft--;
        if (timeEl) timeEl.textContent = `${timeLeft}s`;
        if (timeLeft <= 5 && timeEl) timeEl.style.color = 'var(--gold)';
        if (timeLeft <= 0) {
          clearInterval(interval);
          running = false;
          btn.disabled = true;
          btn.style.opacity = '.5';
          const tps = (taps / gameSecs).toFixed(1);
          if (resultEl) resultEl.textContent = `${taps} taps · ${tps} per second`;
          onComplete({ result: { taps }, timeMs: gameSecs * 1000 });
        }
      }, 1000);
    }

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!running) { startGame(); }
      if (!running) return;
      taps++;
      countEl.textContent = taps;
      btn.style.transform = 'scale(.94)';
      btn.style.filter = 'brightness(1.3)';
      if (onProgress) onProgress(Math.min(1000, taps * 8));
      setTimeout(() => { btn.style.transform='scale(1)'; btn.style.filter='brightness(1)'; }, 80);
    });
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: CURLING — swipe to steer an orb to a target
  // ──────────────────────────────────────────────────────────
  curling(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let score = 0, shot = 0, totalShots = data.shots || 5;
    let orb = null, orbVx = 0, orbVy = 0, animId = null;
    let brushing = false, brushX = 0, brushY = 0;
    let launched = false, settled = false;

    function render() {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;width:100%;max-width:480px">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🥌 CURLING</div>
          <div style="display:flex;justify-content:space-between;width:100%;max-width:420px">
            <div style="font-size:.85rem;color:var(--muted)">SHOT <span id="curl-shot">${shot+1}</span> / ${totalShots}</div>
            <div style="font-family:var(--font-title);font-size:1.1rem;color:var(--gold)">SCORE: <span id="curl-score">${score}</span></div>
          </div>
          <canvas id="curl-canvas" width="380" height="480" style="border-radius:12px;background:#1a2a1a;border:2px solid rgba(255,255,255,.1);touch-action:none;cursor:crosshair;max-width:100%"></canvas>
          <div id="curl-hint" style="font-size:.8rem;color:var(--muted);letter-spacing:.15em;text-align:center">CLICK &amp; DRAG to launch the orb · SWIPE in front of it to steer</div>
        </div>`;

      setupShot();
    }

    function setupShot() {
      settled = false; launched = false; brushing = false;
      const canvas = container.querySelector('#curl-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      // Orb start position (bottom center)
      orb = { x: W/2, y: H - 60, r: 18 };
      orbVx = 0; orbVy = 0;

      // Target (bullseye) at top
      const target = { x: W/2 + (Math.random()-.5)*80, y: 80, rings: [50,35,22,12] };

      let dragStart = null;

      drawFrame(ctx, W, H, target, [], true);

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width, scaleY = H / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
      }

      canvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched) {
          // Near orb = start drag to launch
          const dx = pos.x - orb.x, dy = pos.y - orb.y;
          if (Math.sqrt(dx*dx+dy*dy) < 40) { dragStart = pos; }
        } else {
          // Launched = brush in front of orb
          brushing = true; brushX = pos.x; brushY = pos.y;
        }
      });

      canvas.addEventListener('pointermove', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched && dragStart) {
          drawFrame(ctx, W, H, target, [], false);
          drawOrb(ctx, orb);
          // Draw aim arrow
          ctx.save();
          ctx.strokeStyle = 'rgba(255,200,50,.6)';
          ctx.lineWidth = 3; ctx.setLineDash([8,4]);
          ctx.beginPath(); ctx.moveTo(orb.x, orb.y);
          ctx.lineTo(orb.x + (orb.x - pos.x)*0.8, orb.y + (orb.y - pos.y)*0.8);
          ctx.stroke(); ctx.restore();
        } else if (launched && brushing) {
          brushX = pos.x; brushY = pos.y;
          // Brush effect: push orb slightly toward brush position relative to its path
          const bx = pos.x - orb.x;
          orbVx += bx * 0.003;
          // dampen over-steering
          orbVx = Math.max(-3, Math.min(3, orbVx));
        }
      });

      canvas.addEventListener('pointerup', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched && dragStart) {
          const dx = dragStart.x - pos.x;
          const dy = dragStart.y - pos.y;
          const power = Math.min(Math.sqrt(dx*dx+dy*dy), 120) / 120;
          orbVx = dx * 0.06 * power;
          orbVy = dy * 0.1 * power - 1;
          if (Math.abs(orbVy) > 0.5) {
            launched = true;
            container.querySelector('#curl-hint').textContent = 'Swipe LEFT/RIGHT in front of the orb to steer!';
            animate(ctx, W, H, target);
          }
          dragStart = null;
        }
        brushing = false;
      });
    }

    function animate(ctx, W, H, target) {
      if (animId) cancelAnimationFrame(animId);
      const trail = [];
      function step() {
        if (!container.querySelector('#curl-canvas')) return;
        orbVy *= 0.997; orbVx *= 0.99;
        orb.x += orbVx; orb.y += orbVy;
        // Wall bounce
        if (orb.x < orb.r) { orb.x = orb.r; orbVx *= -0.7; }
        if (orb.x > W-orb.r) { orb.x = W-orb.r; orbVx *= -0.7; }
        trail.push({x:orb.x,y:orb.y});
        if (trail.length > 30) trail.shift();
        drawFrame(ctx, W, H, target, trail, false);
        // Check if stopped or out of bounds
        const speed = Math.sqrt(orbVx*orbVx+orbVy*orbVy);
        const offScreen = orb.y < -orb.r || orb.y > H+orb.r;
        if (speed < 0.15 || offScreen) {
          settled = true;
          if (!offScreen) drawOrb(ctx, orb);
          const dist = Math.sqrt((orb.x-target.x)**2+(orb.y-target.y)**2);
          let pts = 0;
          if (dist < target.rings[3]) pts = 10;
          else if (dist < target.rings[2]) pts = 7;
          else if (dist < target.rings[1]) pts = 4;
          else if (dist < target.rings[0]) pts = 1;
          score += pts;
          shot++;
          if (onProgress) onProgress(Math.min(1000, score * 20));
          const scoreEl = container.querySelector('#curl-score');
          if (scoreEl) scoreEl.textContent = score;
          // Flash score
          ctx.save(); ctx.fillStyle = pts>=7?'#f1c40f':pts>=4?'#2ecc71':pts>0?'#3498db':'#e74c3c';
          ctx.font = 'bold 32px Bebas Neue,sans-serif'; ctx.textAlign='center';
          ctx.fillText(pts>0?`+${pts} pts`:'MISS', orb.x, Math.max(40, orb.y-30));
          ctx.restore();
          setTimeout(() => {
            if (shot >= totalShots) {
              onComplete({ result: { score, shots: totalShots }, timeMs: Date.now() - startTime });
            } else {
              const shotEl = container.querySelector('#curl-shot');
              if (shotEl) shotEl.textContent = shot+1;
              setupShot();
            }
          }, 1200);
          return;
        }
        animId = requestAnimationFrame(step);
      }
      step();
    }

    function drawFrame(ctx, W, H, target, trail, showHint) {
      ctx.clearRect(0,0,W,H);
      // Ice surface
      ctx.fillStyle = '#1a2a1a'; ctx.fillRect(0,0,W,H);
      // Lane lines
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      // Target rings
      const ringColors = ['rgba(232,25,44,.5)','rgba(255,255,255,.3)','rgba(232,25,44,.5)','rgba(245,197,24,.7)'];
      target.rings.forEach((r,i) => {
        ctx.beginPath(); ctx.arc(target.x, target.y, r, 0, Math.PI*2);
        ctx.fillStyle = ringColors[i]; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1; ctx.stroke();
      });
      // Trail
      trail.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4*(i/trail.length), 0, Math.PI*2);
        ctx.fillStyle = `rgba(100,200,255,${i/trail.length*0.4})`; ctx.fill();
      });
      // Orb
      if (!settled || trail.length) drawOrb(ctx, orb);
      // Hint arrow if not launched
      if (showHint) {
        ctx.save(); ctx.fillStyle='rgba(255,255,255,.2)'; ctx.font='14px Barlow Condensed,sans-serif';
        ctx.textAlign='center'; ctx.fillText('DRAG to aim & launch',W/2,H-20); ctx.restore();
      }
    }

    function drawOrb(ctx, o) {
      const grad = ctx.createRadialGradient(o.x-5, o.y-5, 2, o.x, o.y, o.r);
      grad.addColorStop(0,'#99ccff'); grad.addColorStop(1,'#2255aa');
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
    }

    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: PATTERN MATCH — memorize and recreate a grid pattern
  // ──────────────────────────────────────────────────────────
  patternmatch(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let round = 0, score = 0;
    const rounds = data.rounds;

    function showPattern() {
      if (round >= rounds.length) {
        onComplete({ result: { score, total: rounds.length }, timeMs: Date.now() - startTime }); return;
      }
      const r = rounds[round];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">ROUND ${round+1}/${rounds.length} — MEMORIZE THIS PATTERN</div>
          <div id="pm-grid" class="pm-grid" style="grid-template-columns:repeat(${r.size},1fr);display:grid;gap:5px"></div>
          <div id="pm-msg" style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold);letter-spacing:.1em"></div>
        </div>`;
      const grid = container.querySelector('#pm-grid');
      r.pattern.forEach(v => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:${v?r.color:'var(--dark3)'};border:2px solid rgba(255,255,255,.1)`;
        grid.appendChild(c);
      });
      // Show for 3 seconds then hide and ask to recreate
      let countdown = 3;
      const msg = container.querySelector('#pm-msg');
      msg.textContent = `Memorize! ${countdown}s`;
      const t = setInterval(() => {
        countdown--;
        if (countdown > 0) { msg.textContent = `Memorize! ${countdown}s`; }
        else { clearInterval(t); askRecreate(r); }
      }, 1000);
    }

    function askRecreate(r) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">CLICK THE CELLS TO RECREATE THE PATTERN</div>
          <div id="pm-input" style="display:grid;grid-template-columns:repeat(${r.size},1fr);gap:5px"></div>
          <button class="btn btn-primary" id="pm-submit" style="width:200px">SUBMIT</button>
          <div id="pm-feedback" style="font-family:var(--font-title);font-size:1.2rem;min-height:1.5rem"></div>
        </div>`;
      const state = new Array(r.size*r.size).fill(false);
      const grid = container.querySelector('#pm-input');
      state.forEach((v,i) => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:var(--dark3);border:2px solid rgba(255,255,255,.1);cursor:pointer;transition:background .15s`;
        c.dataset.i = i;
        c.addEventListener('click', () => {
          state[i] = !state[i];
          c.style.background = state[i] ? r.color : 'var(--dark3)';
        });
        grid.appendChild(c);
      });
      container.querySelector('#pm-submit').addEventListener('click', () => {
        let correct = 0;
        state.forEach((v,i) => { if(v === r.pattern[i]) correct++; });
        const pct = correct / (r.size*r.size);
        const pts = pct === 1 ? 10 : pct >= 0.8 ? 7 : pct >= 0.6 ? 4 : 0;
        score += pts;
        if (onProgress) onProgress(Math.min(1000, score * 15));
        const fb = container.querySelector('#pm-feedback');
        if (fb) { fb.textContent = pts===10?'🔥 PERFECT!':pts>0?`✅ ${Math.round(pct*100)}% correct (+${pts}pts)`:`❌ Wrong pattern (${Math.round(pct*100)}%)`; fb.style.color=pts>=7?'var(--green)':pts>0?'var(--gold)':'var(--red)'; }
        round++;
        setTimeout(showPattern, 1200);
      });
    }

    showPattern();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: EMOJI SORT — drag emojis into the correct category
  // ──────────────────────────────────────────────────────────
  emojisort(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let correct = 0, total = data.items.length;
    const remaining = [...data.items];
    let current = 0;

    function render() {
      if (current >= total) { onComplete({ result:{correct,total}, timeMs:Date.now()-startTime }); return; }
      const item = remaining[current];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;max-width:480px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🗂 EMOJI SORT</div>
          <div style="font-size:.85rem;color:var(--muted)">ITEM ${current+1} / ${total} — ${correct} CORRECT</div>
          <div style="font-size:5rem;margin:.5rem 0">${item.emoji}</div>
          <div style="font-family:var(--font-title);font-size:1.3rem;color:var(--silver);letter-spacing:.1em">Which category?</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;width:100%">
            ${data.categories.map(cat=>`<button class="qa-choice" data-cat="${cat.name}" style="font-size:1.2rem;padding:.8rem">${cat.emoji} ${cat.name}</button>`).join('')}
          </div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = btn.dataset.cat;
          const isRight = chosen === item.category;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(b.dataset.cat===item.category) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/total)*700));
          current++;
          setTimeout(render, isRight?400:900);
        });
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: FAST FINGERS — type a given phrase as fast as possible
  // ──────────────────────────────────────────────────────────
  fastfingers(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let wi = 0, errors = 0;
    const words = data.words;

    function render() {
      if (wi >= words.length) {
        const ms = Date.now() - startTime;
        onComplete({ result: { words: words.length, errors }, timeMs: ms }); return;
      }
      const w = words[wi];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;max-width:500px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">⌨ FAST FINGERS</div>
          <div style="font-size:.85rem;color:var(--muted)">WORD ${wi+1} / ${words.length}</div>
          <div style="font-family:var(--font-title);font-size:clamp(2rem,8vw,4rem);letter-spacing:.25em;color:var(--text);text-align:center">${w}</div>
          <input id="ff-input" class="word-answer-input" type="text" placeholder="Type it here…" autocomplete="off" autocorrect="off" spellcheck="false" style="text-align:center;font-size:1.5rem"/>
          <div id="ff-feedback" style="font-family:var(--font-title);font-size:1.3rem;min-height:1.5rem"></div>
        </div>`;
      const input = container.querySelector('#ff-input');
      input.focus();
      input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        if (val === w) {
          input.classList.add('correct');
          const fb = container.querySelector('#ff-feedback');
          if (fb) fb.textContent='✅';
          if (onProgress) onProgress(Math.floor(((wi+1)/words.length)*700));
          wi++;
          setTimeout(render, 300);
        } else if (val.length >= w.length) {
          errors++;
          input.classList.add('wrong');
          setTimeout(()=>{ input.classList.remove('wrong'); input.value=''; }, 400);
        }
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: RUSH HOUR — slide cars to free the red car
  // ──────────────────────────────────────────────────────────
  gridlock(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const GRID = data.gridSize || 6;
    const EXIT_ROW = data.exitRow !== undefined ? data.exitRow : 2;
    let moves = 0;
    let selected = null;
    let cars = JSON.parse(JSON.stringify(data.cars));

    // Car colour palette (target = red, others = varied)
    const CAR_COLORS = ['#e8192c','#3498db','#2ecc71','#9b59b6','#e67e22','#1abc9c','#e74c3c','#f39c12'];
    function carColor(car) { return car.target ? '#e8192c' : CAR_COLORS[1 + (car.id % (CAR_COLORS.length-1))]; }

    function occupied() {
      const o = {};
      cars.forEach(c => {
        for (let i = 0; i < c.len; i++) {
          const r = c.h ? c.row : c.row + i;
          const col = c.h ? c.col + i : c.col;
          o[r + '_' + col] = c.id;
        }
      });
      return o;
    }

    function maxMove(car, dir) {
      // Returns max steps car can move in direction dir (-1 or +1)
      const occ = occupied();
      let steps = 0;
      for (let s = 1; s <= GRID; s++) {
        let r, col;
        if (car.h) { r = car.row; col = dir > 0 ? car.col + car.len - 1 + s : car.col - s; }
        else       { col = car.col; r = dir > 0 ? car.row + car.len - 1 + s : car.row - s; }
        if (r < 0 || r >= GRID || col < 0 || col >= GRID) break;
        if (occ[r + '_' + col] !== undefined) break;
        steps = s;
      }
      return steps;
    }

    function doMove(car, dir, steps) {
      if (car.h) car.col += dir * steps;
      else       car.row += dir * steps;
      moves += steps;
      if (onProgress) onProgress(Math.min(900, moves * 20));
      checkWin();
      render();
    }

    function checkWin() {
      const t = cars.find(c => c.target);
      if (t && t.h && t.row === EXIT_ROW && t.col + t.len - 1 >= GRID - 1) {
        setTimeout(() => onComplete({ result:{ solved:true, moves }, timeMs:Date.now()-startTime }), 350);
      }
    }

    function render() {
      // Responsive cell size
      const maxW = Math.min(container.clientWidth || 360, 380) - 16;
      const CELL = Math.floor((maxW - 8) / GRID);
      const GAP  = 3;
      const BOARD = CELL * GRID + GAP * (GRID - 1);

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem;width:100%;padding:.4rem 0">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold);letter-spacing:.1em">🚗 RUSH HOUR</div>
          <div style="font-size:.78rem;color:var(--muted);text-align:center;max-width:340px">Slide cars to free the <span style="color:#e8192c;font-weight:700">🔴 red car</span> — get it to the right exit →</div>
          <div style="font-size:.85rem">Moves: <span id="rh-moves" style="color:var(--gold);font-family:var(--font-title)">${moves}</span></div>
          <div style="position:relative" id="rh-wrap">
            <!-- Board -->
            <div id="rh-board" style="
              position:relative;
              width:${BOARD}px;height:${BOARD}px;
              background:#1a1a2e;
              border:2px solid #2a2a4a;
              border-radius:8px;
              overflow:visible;
              flex-shrink:0;
            "></div>
            <!-- Exit marker -->
            <div style="
              position:absolute;
              right:-22px;
              top:${EXIT_ROW*(CELL+GAP) + Math.floor(CELL/2) - 10}px;
              font-size:1.2rem;color:var(--gold);line-height:1
            ">→</div>
          </div>
          <!-- Direction controls -->
          <div id="rh-ctrl" style="display:flex;gap:.5rem;align-items:center;min-height:2.2rem;flex-wrap:wrap;justify-content:center"></div>
          <div id="rh-hint" style="font-size:.75rem;color:var(--muted)">Tap a car to select it</div>
        </div>`;

      const board = container.querySelector('#rh-board');

      // Grid lines
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const cell = document.createElement('div');
          cell.style.cssText = `position:absolute;
            left:${c*(CELL+GAP)}px;top:${r*(CELL+GAP)}px;
            width:${CELL}px;height:${CELL}px;
            background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
            border-radius:3px;`;
          board.appendChild(cell);
        }
      }

      // Cars
      cars.forEach(car => {
        const w = car.h ? car.len * CELL + (car.len-1) * GAP : CELL;
        const h = car.h ? CELL : car.len * CELL + (car.len-1) * GAP;
        const x = car.col * (CELL + GAP);
        const y = car.row * (CELL + GAP);
        const isSel = selected === car.id;
        const bg = carColor(car);

        const div = document.createElement('div');
        div.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:${w}px;height:${h}px;
          background:${bg};
          border:2.5px solid ${isSel ? '#fff' : 'rgba(0,0,0,.35)'};
          border-radius:7px;
          cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          font-size:${CELL > 44 ? '1.2rem' : '1rem'};
          box-shadow:${isSel ? `0 0 0 3px white, 0 0 18px ${bg}99` : `inset 0 2px 0 rgba(255,255,255,.2),0 3px 6px rgba(0,0,0,.5)`};
          transition:box-shadow .12s;
          user-select:none;z-index:2;
        `;
        div.textContent = car.target ? '🔴' : (car.h ? '🚙' : '🚌');
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selected = (selected === car.id) ? null : car.id;
          render();
        });
        board.appendChild(div);
      });

      // Deselect on board click
      board.addEventListener('click', () => { selected = null; render(); });

      renderControls(CELL);
    }

    function renderControls(CELL) {
      const ctrl = container.querySelector('#rh-ctrl');
      const hint = container.querySelector('#rh-hint');
      if (!ctrl) return;
      ctrl.innerHTML = '';
      if (selected === null) { if(hint) hint.textContent = 'Tap a car to select it'; return; }
      const car = cars.find(c => c.id === selected);
      if (!car) return;
      if (hint) hint.textContent = `Moving: ${car.target ? '🔴 RED CAR' : (car.h ? '→ horizontal' : '↕ vertical')}`;

      const dirs = car.h
        ? [{ dir:-1, icon:'◀', label:'LEFT'  }, { dir:+1, icon:'▶', label:'RIGHT' }]
        : [{ dir:-1, icon:'▲', label:'UP'    }, { dir:+1, icon:'▼', label:'DOWN'  }];

      dirs.forEach(({ dir, icon, label }) => {
        const steps = maxMove(car, dir);
        // Show one button per available step, up to maxStep
        if (steps === 0) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.cssText = 'font-size:.8rem;padding:.3rem .7rem;opacity:.25;cursor:default';
          btn.textContent = `${icon} ${label}`;
          btn.disabled = true;
          ctrl.appendChild(btn);
        } else {
          for (let s = 1; s <= steps; s++) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.cssText = `font-size:.8rem;padding:.3rem .7rem`;
            btn.textContent = s === 1 ? `${icon}` : `${icon}${s}`;
            btn.title = `Move ${label} ${s} step${s>1?'s':''}`;
            const _s = s, _dir = dir, _car = car;
            btn.addEventListener('click', () => { doMove(_car, _dir, _s); });
            ctrl.appendChild(btn);
          }
        }
      });
    }

    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: SPEED SORT — click items in ascending/descending order
  // ──────────────────────────────────────────────────────────
  speedsort(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let nextIdx = 0;
    const sorted = [...data.items].sort((a,b)=>a-b);

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">⬆ SPEED SORT</div>
        <div style="font-size:.85rem;color:var(--muted)">Click ALL numbers SMALLEST → LARGEST!</div>
        <div style="font-family:var(--font-title);font-size:1.2rem">NEXT: <span id="ss-next" style="color:var(--red)">${sorted[0]}</span></div>
        <div id="ss-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;width:100%">
          ${data.items.map(n=>`<button class="hunt-btn" data-num="${n}">${n}</button>`).join('')}
        </div>
        <div id="ss-prog" style="font-size:.85rem;color:var(--muted)">${nextIdx} / ${data.items.length}</div>
      </div>`;

    container.querySelector('#ss-grid').addEventListener('click', e=>{
      const btn = e.target.closest('.hunt-btn');
      if(!btn||btn.disabled) return;
      const num = Number(btn.dataset.num);
      if(num===sorted[nextIdx]) {
        btn.classList.add('found'); btn.disabled=true;
        nextIdx++;
        const nextEl=container.querySelector('#ss-next');
        if(nextEl) nextEl.textContent=sorted[nextIdx]||'DONE!';
        container.querySelector('#ss-prog').textContent=`${nextIdx} / ${data.items.length}`;
        if(onProgress) onProgress(Math.floor((nextIdx/data.items.length)*900));
        if(nextIdx>=data.items.length) onComplete({result:{},timeMs:Date.now()-startTime});
      } else {
        btn.classList.add('wrong-flash');
        setTimeout(()=>btn.classList.remove('wrong-flash'),300);
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: JUMP ROPE — press button in rhythm to jump
  // ──────────────────────────────────────────────────────────
  jumprope(container, data, onComplete, onProgress) {
    if (window.Puzzles && window.Puzzles.jumprope) {
      window.Puzzles.jumprope(container, data, onComplete, onProgress);
      return;
    }
    // minimal fallback — real game loaded from puzzles/jumprope.js
  },


  // ──────────────────────────────────────────────────────────
  // DAILY: MINESWEEPER — flag all mines without hitting one
  // ──────────────────────────────────────────────────────────
  minesweeper(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const rows = data.H || data.rows || 6;
    const cols = data.W || data.cols || 6;
    const mineList = [];
    if (data.cells) {
      data.cells.forEach((c,i) => { if(c.mine) mineList.push([Math.floor(i/cols), i%cols]); });
    } else if (data.mines) {
      data.mines.forEach(([r,c]) => mineList.push([r,c]));
    }
    const mineSet = new Set(mineList.map(([r,c])=>`${r},${c}`));
    const revealed = new Set();
    const flagged = new Set();
    let done = false;

    function countAdj(r,c) {
      let n=0;
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
        if(dr===0&&dc===0) continue;
        if(mineSet.has(`${r+dr},${c+dc}`)) n++;
      }
      return n;
    }

    function reveal(r,c) {
      const key=`${r},${c}`;
      if(r<0||r>=rows||c<0||c>=cols||revealed.has(key)||flagged.has(key)) return;
      revealed.add(key);
      if(mineSet.has(key)) {
        done=true;
        render();
        onComplete({result:{won:false,safe:revealed.size},timeMs:Date.now()-startTime});
        return;
      }
      if(countAdj(r,c)===0) {
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
          if(dr!==0||dc!==0) reveal(r+dr,c+dc);
        }
      }
    }

    function render() {
      const safeCells = rows*cols - mineList.length;
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">💣 MINESWEEPER</div>
          <div style="font-size:.8rem;color:var(--muted)">Left-click reveal · Right-click flag mines</div>
          <div id="ms-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;user-select:none"></div>
          <div style="font-size:.85rem;color:var(--muted)">Revealed: <span id="ms-rev">0</span>/${safeCells}</div>
        </div>`;
      const grid = container.querySelector('#ms-grid');
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
        const key=`${r},${c}`;
        const btn=document.createElement('button');
        btn.style.cssText='width:28px;height:28px;font-size:.75rem;border-radius:4px;cursor:pointer;border:none;font-weight:700';
        if(done && mineSet.has(key)) { btn.textContent='💣'; btn.style.background='#c0392b'; }
        else if(revealed.has(key)) {
          const n=countAdj(r,c);
          btn.textContent=n>0?n:'';
          btn.style.background='#2a2a4a';
          btn.style.color=['','#3498db','#2ecc71','#e74c3c','#9b59b6','#e67e22','#1abc9c','#fff','#888'][n]||'#fff';
          btn.disabled=true;
        } else if(flagged.has(key)) {
          btn.textContent='🚩'; btn.style.background='#444';
        } else {
          btn.style.background='#555';
        }
        btn.addEventListener('click',()=>{
          if(done||revealed.has(key)||flagged.has(key)) return;
          reveal(r,c);
          if(!done) {
            const safeCells2=rows*cols-mineList.length;
            container.querySelector('#ms-rev').textContent=revealed.size;
            if(onProgress) onProgress(Math.floor((revealed.size/safeCells2)*900));
            if(revealed.size>=safeCells2) {
              done=true;
              onComplete({result:{won:true,safe:revealed.size},timeMs:Date.now()-startTime});
            }
          }
          render();
        });
        btn.addEventListener('contextmenu',e=>{
          e.preventDefault();
          if(done||revealed.has(key)) return;
          if(flagged.has(key)) flagged.delete(key); else flagged.add(key);
          render();
        });
        grid.appendChild(btn);
      }
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: FIND THE BOMB — multi-round bomb hunt
  // ──────────────────────────────────────────────────────────
  findbomb(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const rounds = data.rounds_data || [];
    let roundIdx = 0, foundCount = 0;

    function renderRound() {
      if(roundIdx >= rounds.length) {
        onComplete({result:{found:foundCount,total:rounds.length},timeMs:Date.now()-startTime});
        return;
      }
      const { grid: cells, size, hint } = rounds[roundIdx];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--red)">💣 FIND THE BOMB!</div>
          <div style="font-size:.8rem;color:var(--muted)">Round ${roundIdx+1}/${rounds.length} · Hint: ${hint}</div>
          <div id="fb-grid" style="display:grid;grid-template-columns:repeat(${size},1fr);gap:.4rem;width:min(320px,90vw)"></div>
          <div id="fb-msg" style="font-family:var(--font-title);font-size:1.1rem;min-height:1.5rem"></div>
        </div>`;
      const gridEl = container.querySelector('#fb-grid');
      cells.forEach(cell => {
        const btn = document.createElement('button');
        btn.style.cssText='padding:.6rem;font-size:1.4rem;border-radius:6px;cursor:pointer;border:none;background:#333';
        btn.textContent='❓';
        btn.addEventListener('click', () => {
          if(btn.disabled) return;
          btn.disabled = true;
          if(cell.isBomb) {
            btn.textContent='💣'; btn.style.background='#c0392b';
            container.querySelector('#fb-msg').textContent='💥 Found it!';
            foundCount++;
            if(onProgress) onProgress(Math.floor((foundCount/rounds.length)*900));
            roundIdx++;
            setTimeout(renderRound, 700);
          } else {
            btn.textContent = cell.emoji; btn.style.background='#2a2a4a';
            container.querySelector('#fb-msg').textContent='❌ Keep looking…';
          }
        });
        gridEl.appendChild(btn);
      });
    }
    renderRound();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: SIMON EXTREME — extended Simon says with more colors
  // ──────────────────────────────────────────────────────────
  simonextreme(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { sequence } = data;
    const colorHex = data.colorHex || {RED:'#e74c3c',BLUE:'#3498db',GREEN:'#2ecc71',YELLOW:'#f1c40f',PURPLE:'#9b59b6'};
    const colorEmoji = {RED:'🔴',BLUE:'🔵',GREEN:'🟢',YELLOW:'🟡',PURPLE:'🟣',
                        R:'🔴',G:'🟢',B:'🔵',Y:'🟡',P:'🟣',O:'🟠'};
    const colorLit = {RED:'#ff8888',BLUE:'#88aaff',GREEN:'#88ff88',YELLOW:'#ffff88',PURPLE:'#dd88ff',
                      R:'#ff6b6b',G:'#55ff99',B:'#5dade2',Y:'#ffee55',P:'#c39bd3',O:'#ff9f4a'};
    const colorNames = data.colors || Object.keys(colorHex);
    const COLORS = colorNames.map(name => ({
      id: name,
      label: colorEmoji[name] || name,
      bg: colorHex[name] || '#666',
      lit: colorLit[name] || '#fff',
    }));
    let step = 0, playerIdx = 0, showing = false;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem">
        <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">🎮 SIMON EXTREME</div>
        <div id="se-msg" style="font-size:.85rem;color:var(--muted)">Watch the sequence…</div>
        <div id="se-step" style="font-family:var(--font-title);font-size:1rem;color:var(--gold)">ROUND 1 / ${sequence.length}</div>
        <div id="se-btns" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;width:min(300px,90vw)"></div>
      </div>`;

    const btnsEl = container.querySelector('#se-btns');
    COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.id = `se-${color.id}`;
      btn.textContent = color.label;
      btn.style.cssText=`font-size:2rem;padding:1rem;border-radius:8px;border:none;cursor:pointer;background:${color.bg};transition:background .1s`;
      btn.addEventListener('click', ()=>{
        if(showing) return;
        if(color.id === sequence[playerIdx]) {
          flash(color.id, true);
          playerIdx++;
          if(playerIdx > step) {
            step++;
            playerIdx = 0;
            if(onProgress) onProgress(Math.floor((step/sequence.length)*900));
            if(step >= sequence.length) {
              onComplete({result:{level:sequence.length},timeMs:Date.now()-startTime});
              return;
            }
            container.querySelector('#se-msg').textContent='✅ Correct! Watch again…';
            container.querySelector('#se-step').textContent=`ROUND ${step+1} / ${sequence.length}`;
            setTimeout(()=>playSequence(), 800);
          }
        } else {
          flash(color.id, false);
          container.querySelector('#se-msg').textContent='❌ Wrong! Watch again…';
          playerIdx = 0;
          setTimeout(()=>playSequence(), 1000);
        }
      });
      btnsEl.appendChild(btn);
    });

    function flash(id, correct) {
      const btn = container.querySelector(`#se-${id}`);
      if(!btn) return;
      const color = COLORS.find(c=>c.id===id);
      btn.style.background = correct ? '#fff' : '#ff0000';
      setTimeout(()=>{ if(btn) btn.style.background = color.bg; }, 200);
    }

    function playSequence() {
      showing = true;
      container.querySelector('#se-msg').textContent='Watch carefully…';
      let i = 0;
      const interval = setInterval(()=>{
        if(i > step) { clearInterval(interval); showing=false; container.querySelector('#se-msg').textContent='Your turn!'; return; }
        const color = COLORS.find(c=>c.id===sequence[i]);
        const btn = container.querySelector(`#se-${sequence[i]}`);
        if(btn) { btn.style.background=color.lit; setTimeout(()=>{ if(btn) btn.style.background=color.bg; }, 350); }
        i++;
      }, 600);
    }

    setTimeout(()=>playSequence(), 500);
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: TANGRAM — drag & rotate pieces to fill silhouette
  // Challenge.io themed: dark bg, neon pieces, gold target
  // ──────────────────────────────────────────────────────────
  tangram(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const CW = 290, CH = 260;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.4rem">
        <div style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold)">🔷 TANGRAM</div>
        <div style="font-size:.75rem;color:var(--muted)">Drag pieces · Double-click or right-click to rotate</div>
        <canvas id="tg-c" width="${CW}" height="${CH}" style="border-radius:8px;background:#0a0a1a;cursor:crosshair;touch-action:none;max-width:100%"></canvas>
        <div id="tg-pct" style="font-family:var(--font-title);font-size:.95rem;color:var(--gold)">0% COVERED</div>
      </div>`;

    const canvas = container.querySelector('#tg-c');
    const ctx = canvas.getContext('2d');
    const S = 50; // unit in pixels

    // 4 target silhouettes (all have area = 8S²)
    const TARGETS = [
      // Square ~141×141 centered
      [[75,60],[216,60],[216,201],[75,201]],
      // Right triangle legs=200
      [[50,220],[250,220],[50,20]],
      // Rectangle 100×200
      [[95,30],[195,30],[195,230],[95,230]],
      // Parallelogram base 200 h 100
      [[40,190],[240,190],[280,90],[80,90]],
    ];
    const target = TARGETS[(data.puzzle||0) % TARGETS.length];

    // Piece vertex templates (relative to centroid)
    const LT=S*2/3, MT=S*Math.SQRT2/3, ST=S/3;
    let pieces = [
      {id:0,color:'#e74c3c',verts:[[-2*LT,-2*LT],[4*LT,-2*LT],[-2*LT,4*LT]],x:40,  y:55, angle:0},
      {id:1,color:'#3498db',verts:[[-2*LT,-2*LT],[4*LT,-2*LT],[-2*LT,4*LT]],x:148, y:55, angle:Math.PI/2},
      {id:2,color:'#2ecc71',verts:[[-2*MT,-2*MT],[4*MT,-2*MT],[-2*MT,4*MT]],x:250, y:55, angle:0},
      {id:3,color:'#f1c40f',verts:[[-2*ST,-2*ST],[4*ST,-2*ST],[-2*ST,4*ST]],x:55,  y:210,angle:0},
      {id:4,color:'#9b59b6',verts:[[-2*ST,-2*ST],[4*ST,-2*ST],[-2*ST,4*ST]],x:130, y:210,angle:Math.PI/2},
      {id:5,color:'#e67e22',verts:[[-S/2,-S/2],[S/2,-S/2],[S/2,S/2],[-S/2,S/2]],x:190,y:215,angle:Math.PI/4},
      {id:6,color:'#1abc9c',verts:[[-S,-S/2],[0,-S/2],[S/2,S/2],[-S/2,S/2]],x:255,y:210,angle:0},
    ];

    let dragging=null, dragOX=0, dragOY=0, solved=false;

    function worldVerts(p) {
      const c=Math.cos(p.angle), s=Math.sin(p.angle);
      return p.verts.map(([vx,vy])=>[p.x+vx*c-vy*s, p.y+vx*s+vy*c]);
    }

    function inPoly(px,py,verts) {
      let inside=false;
      for(let i=0,j=verts.length-1;i<verts.length;j=i++) {
        const [xi,yi]=verts[i],[xj,yj]=verts[j];
        if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
      }
      return inside;
    }

    function draw() {
      ctx.clearRect(0,0,CW,CH);
      // target
      ctx.save();
      ctx.fillStyle='rgba(255,170,0,0.13)';
      ctx.strokeStyle='rgba(255,170,0,0.6)';
      ctx.lineWidth=2;
      ctx.beginPath();
      target.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      // pieces
      pieces.forEach(p=>{
        const wv=worldVerts(p);
        ctx.save();
        ctx.fillStyle=p===dragging?p.color+'aa':p.color;
        ctx.strokeStyle='rgba(255,255,255,0.7)';
        ctx.lineWidth=1.5;
        ctx.shadowColor=p.color; ctx.shadowBlur=p===dragging?12:4;
        ctx.beginPath();
        wv.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    }

    function checkCoverage() {
      if(solved) return;
      // Draw target in pure red on offscreen canvas
      const ofcT=document.createElement('canvas'); ofcT.width=CW; ofcT.height=CH;
      const tctx=ofcT.getContext('2d');
      tctx.fillStyle='#ff0000';
      tctx.beginPath();
      target.forEach(([x,y],i)=>i?tctx.lineTo(x,y):tctx.moveTo(x,y));
      tctx.closePath(); tctx.fill();
      const td=tctx.getImageData(0,0,CW,CH).data;
      let totalTarget=0;
      for(let i=0;i<td.length;i+=4) if(td[i]>200) totalTarget++;
      // Draw target then pieces in black
      tctx.fillStyle='#000000';
      pieces.forEach(p=>{
        const wv=worldVerts(p);
        tctx.beginPath();
        wv.forEach(([x,y],i)=>i?tctx.lineTo(x,y):tctx.moveTo(x,y));
        tctx.closePath(); tctx.fill();
      });
      const d=tctx.getImageData(0,0,CW,CH).data;
      let remaining=0;
      for(let i=0;i<d.length;i+=4) if(d[i]>200) remaining++;
      const pct=totalTarget>0?Math.round((1-remaining/totalTarget)*100):0;
      if(onProgress) onProgress(Math.min(900,pct*9));
      const el=container.querySelector('#tg-pct');
      if(el) el.textContent=`${pct}% COVERED`;
      if(pct>=85&&!solved){ solved=true; onComplete({result:{},timeMs:Date.now()-startTime}); }
    }

    function canvasPos(e) {
      const r=canvas.getBoundingClientRect();
      const sx=CW/r.width, sy=CH/r.height;
      const src=e.touches?e.touches[0]:e;
      return [(src.clientX-r.left)*sx,(src.clientY-r.top)*sy];
    }

    canvas.addEventListener('mousedown',e=>{
      const [mx,my]=canvasPos(e);
      for(let i=pieces.length-1;i>=0;i--) {
        if(inPoly(mx,my,worldVerts(pieces[i]))){
          dragging=pieces[i]; pieces.splice(i,1); pieces.push(dragging);
          dragOX=mx-dragging.x; dragOY=my-dragging.y; draw(); break;
        }
      }
    });
    canvas.addEventListener('mousemove',e=>{
      if(!dragging) return;
      const [mx,my]=canvasPos(e);
      dragging.x=mx-dragOX; dragging.y=my-dragOY; draw();
    });
    canvas.addEventListener('mouseup',()=>{ dragging=null; checkCoverage(); draw(); });
    canvas.addEventListener('dblclick',e=>{
      const [mx,my]=canvasPos(e);
      for(let i=pieces.length-1;i>=0;i--) {
        if(inPoly(mx,my,worldVerts(pieces[i]))){ pieces[i].angle+=Math.PI/4; draw(); checkCoverage(); break; }
      }
    });
    canvas.addEventListener('contextmenu',e=>{
      e.preventDefault();
      const [mx,my]=canvasPos(e);
      for(let i=pieces.length-1;i>=0;i--) {
        if(inPoly(mx,my,worldVerts(pieces[i]))){ pieces[i].angle-=Math.PI/4; draw(); checkCoverage(); break; }
      }
    });
    canvas.addEventListener('touchstart',e=>{
      e.preventDefault();
      const [mx,my]=canvasPos(e);
      for(let i=pieces.length-1;i>=0;i--) {
        if(inPoly(mx,my,worldVerts(pieces[i]))){
          dragging=pieces[i]; pieces.splice(i,1); pieces.push(dragging);
          dragOX=mx-dragging.x; dragOY=my-dragging.y; draw(); break;
        }
      }
    },{passive:false});
    canvas.addEventListener('touchmove',e=>{ e.preventDefault(); if(!dragging)return; const [mx,my]=canvasPos(e); dragging.x=mx-dragOX; dragging.y=my-dragOY; draw(); },{passive:false});
    canvas.addEventListener('touchend',()=>{ dragging=null; checkCoverage(); draw(); });

    draw();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: COLOR MATCH — match color pairs in 60 seconds
  // ──────────────────────────────────────────────────────────
  colormatch(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const duration = data.duration || 60000;
    const palette = data.palette || ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22'];
    const COLS = 6;
    let grid = [...(data.grid||[])];
    if(!grid.length){ for(let c=0;c<palette.length;c++) for(let i=0;i<COLS;i++) grid.push(c); grid=grid.sort(()=>Math.random()-.5); }
    let pairs = 0, selected = -1, locked = false, done = false;

    function render() {
      const remaining = Math.max(0, Math.round((duration - (Date.now()-startTime))/1000));
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem">
          <div style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold)">🎨 COLOR MATCH</div>
          <div style="display:flex;justify-content:space-between;width:280px">
            <span style="font-family:var(--font-title);color:var(--gold)">⏱ ${remaining}s</span>
            <span style="font-family:var(--font-title);color:#2ecc71">✅ ${pairs} pairs</span>
          </div>
          <div id="cm-grid" style="display:grid;grid-template-columns:repeat(${COLS},1fr);gap:4px;width:min(290px,90vw)"></div>
        </div>`;
      const gridEl = container.querySelector('#cm-grid');
      grid.forEach((colorIdx,i) => {
        const cell = document.createElement('div');
        if(colorIdx === -1) { cell.style.cssText='height:40px;border-radius:6px;background:transparent'; }
        else {
          cell.style.cssText=`height:40px;border-radius:6px;cursor:pointer;background:${palette[colorIdx]};transition:transform .1s,box-shadow .1s;${i===selected?'transform:scale(1.15);box-shadow:0 0 12px #fff':''}`;
          cell.addEventListener('click',()=>{
            if(locked||done||grid[i]===-1) return;
            if(selected===-1) { selected=i; render(); return; }
            if(selected===i) { selected=-1; render(); return; }
            if(grid[i]===grid[selected]) {
              // match!
              const a=selected, b=i;
              selected=-1; locked=true;
              grid[a]=-1; grid[b]=-1;
              pairs++;
              if(onProgress) onProgress(Math.min(900, Math.round(pairs/18*900)));
              render();
              locked=false;
              if(grid.every(c=>c===-1)){ done=true; onComplete({result:{pairs},timeMs:Date.now()-startTime}); }
            } else {
              const prev=selected; selected=-1;
              render();
              // flash wrong
              const prevCell=container.querySelector('#cm-grid')?.children[prev];
              const curCell=container.querySelector('#cm-grid')?.children[i];
              if(prevCell) prevCell.style.filter='brightness(2)';
              if(curCell)  curCell.style.filter='brightness(2)';
              setTimeout(()=>render(),400);
            }
          });
        }
        gridEl.appendChild(cell);
      });
    }

    render();
    const tick = setInterval(()=>{ if(done) return; render(); },1000);
    setTimeout(()=>{
      clearInterval(tick);
      if(!done){ done=true; onComplete({result:{pairs},timeMs:Date.now()-startTime}); }
    }, duration);
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: TUNNEL DODGE — 3-lane tunnel, dodge obstacles
  // ──────────────────────────────────────────────────────────
  tunneldodge(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const duration = data.duration || 45000;
    const CW = 300, CH = 240;
    let lane = 1; // 0=left 1=center 2=right
    let distance = 0, alive = true, animId, spawnT = 0;
    const obstacles = []; // {lane, z}
    const SPEED = 0.018, SPAWN_INTERVAL = 55, DEPTH = 40;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem">
        <div style="font-family:var(--font-title);font-size:1.5rem;color:var(--red)">🚀 TUNNEL DODGE</div>
        <div style="font-size:.75rem;color:var(--muted)">← → keys or buttons to dodge!</div>
        <canvas id="td-c" width="${CW}" height="${CH}" style="border-radius:8px;background:#050510;max-width:100%"></canvas>
        <div style="display:flex;gap:.5rem">
          <button id="td-l" class="btn btn-secondary" style="flex:1;font-size:1.2rem">◀</button>
          <button id="td-r" class="btn btn-secondary" style="flex:1;font-size:1.2rem">▶</button>
        </div>
        <div id="td-dist" style="font-family:var(--font-title);color:var(--gold)">0 m</div>
      </div>`;

    const canvas = container.querySelector('#td-c');
    const ctx = canvas.getContext('2d');

    function moveLeft(){ if(lane>0) lane--; }
    function moveRight(){ if(lane<2) lane++; }
    container.querySelector('#td-l').addEventListener('click',moveLeft);
    container.querySelector('#td-r').addEventListener('click',moveRight);
    const onKey = e=>{ if(e.key==='ArrowLeft')moveLeft(); if(e.key==='ArrowRight')moveRight(); };
    document.addEventListener('keydown',onKey);

    // Seeded random for consistent obstacles between players
    let rseed = data.seed || 12345;
    function rand(){ rseed=(rseed*16807+0)%2147483647; return rseed/2147483647; }

    function project(worldZ, laneX) {
      // Perspective projection: z=0 = far, z=1 = near
      const scale = 0.15 + worldZ * 0.85;
      const cx = CW/2, cy = CH*0.45;
      const laneOffset = (laneX - 1) * CW * 0.28;
      const px = cx + laneOffset * scale;
      const py = cy + (worldZ - 0.5) * CH * 0.9;
      return {px, py, scale};
    }

    let frame = 0;
    function loop() {
      if(!alive) return;
      frame++;
      distance++;
      spawnT++;
      if(spawnT >= SPAWN_INTERVAL) {
        spawnT = 0;
        const bl = Math.floor(rand()*3);
        obstacles.push({lane: bl, z: 0});
      }
      // Move obstacles toward player
      for(let i=obstacles.length-1;i>=0;i--) {
        obstacles[i].z += SPEED + distance*0.000008;
        if(obstacles[i].z > 1.05) { obstacles.splice(i,1); continue; }
        // Collision check: z near 1 and same lane
        if(obstacles[i].z > 0.88 && obstacles[i].lane === lane) {
          alive = false;
          ctx.fillStyle='rgba(200,0,0,0.6)';
          ctx.fillRect(0,0,CW,CH);
          ctx.font='bold 28px Bebas Neue,sans-serif';
          ctx.fillStyle='#fff';
          ctx.textAlign='center';
          ctx.fillText('CRASH!', CW/2, CH/2);
          document.removeEventListener('keydown',onKey);
          setTimeout(()=>{ cancelAnimationFrame(animId); onComplete({result:{distance:Math.floor(distance/10)},timeMs:Date.now()-startTime}); },800);
          return;
        }
      }

      // Draw
      ctx.clearRect(0,0,CW,CH);
      // Tunnel walls (perspective lines)
      ctx.strokeStyle='rgba(255,60,60,0.3)';
      ctx.lineWidth=1;
      for(let l=0;l<=3;l++) {
        const fx=(l/3)*CW, tx=CW*0.2+(l/3)*CW*0.6;
        ctx.beginPath(); ctx.moveTo(tx,CH*0.45); ctx.lineTo(fx,CH); ctx.stroke();
      }
      for(let d=0;d<8;d++) {
        const z=((frame*SPEED*60+d*0.15)%1);
        const y=CH*0.45+(z-0.5)*CH*0.9;
        if(y<CH*0.45||y>CH) continue;
        const w=CW*(0.15+z*0.85);
        ctx.strokeStyle=`rgba(255,60,60,${z*0.25})`;
        ctx.beginPath(); ctx.rect(CW/2-w/2, y-2, w, 4); ctx.stroke();
      }
      // Draw obstacles
      obstacles.forEach(ob=>{
        const {px,py,scale}=project(ob.z, ob.lane);
        const sz = 18*scale;
        ctx.fillStyle=`rgba(255,80,80,${0.4+ob.z*0.6})`;
        ctx.strokeStyle='#ff4444';
        ctx.lineWidth=2*scale;
        ctx.beginPath();
        ctx.moveTo(px, py-sz); ctx.lineTo(px+sz*0.8, py+sz*0.5);
        ctx.lineTo(px-sz*0.8, py+sz*0.5); ctx.closePath();
        ctx.fill(); ctx.stroke();
      });
      // Draw player ship
      const playerX = CW*0.17 + lane*CW*0.33;
      const playerY = CH - 30;
      ctx.fillStyle='#e74c3c';
      ctx.shadowColor='#e74c3c'; ctx.shadowBlur=15;
      ctx.beginPath();
      ctx.moveTo(playerX,playerY-18); ctx.lineTo(playerX+14,playerY+10);
      ctx.lineTo(playerX,playerY+4); ctx.lineTo(playerX-14,playerY+10);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0;
      // Lane indicators
      [0,1,2].forEach(l=>{
        const lx=CW*0.17+l*CW*0.33;
        ctx.strokeStyle=l===lane?'rgba(255,170,0,0.6)':'rgba(255,255,255,0.1)';
        ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(lx,CH*0.45); ctx.lineTo(lx,CH-10); ctx.stroke();
      });
      // Distance
      const distEl=container.querySelector('#td-dist');
      if(distEl) distEl.textContent=`${Math.floor(distance/10)} m`;
      if(onProgress) onProgress(Math.min(900,Math.floor(distance/10)*4));

      animId=requestAnimationFrame(loop);
    }
    animId=requestAnimationFrame(loop);

    setTimeout(()=>{
      if(!alive) return;
      alive=false;
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown',onKey);
      onComplete({result:{distance:Math.floor(distance/10)},timeMs:Date.now()-startTime});
    }, duration);
  },

};
