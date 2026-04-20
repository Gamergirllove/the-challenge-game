window.Puzzles = window.Puzzles || {};

window.Puzzles.jumprope = function(container, data, onComplete, onProgress) {
    const BEATS = 10;
    const PERIOD = data.period || 950;
    const W_PERFECT = 65, W_GOOD = 160, W_OK = 280;
    const SCORE_MAP = { PERFECT: 100, GOOD: 70, OK: 40, MISS: 0 };
    const LABEL_MAP = {
        PERFECT: { text: '🔥 PERFECT!', cls: 'jr-r-perfect' },
        GOOD:    { text: '⚡ GOOD',     cls: 'jr-r-good' },
        OK:      { text: '👍 OK',       cls: 'jr-r-ok' },
        MISS:    { text: '❌ MISS',     cls: 'jr-r-miss' },
    };

    let ropeAngle = 0, lastTs = null, animId;
    let beatHitTime = null, beatRated = true, pendingEarly = null;
    let ratings = [];
    let phase = 'intro';
    let playerLift = 0, jumpVel = 0;

    container.innerHTML = `
        <div class="jr-wrap">
            <div class="jr-header">
                <span class="jr-title">🪢 JUMP ROPE</span>
                <span class="jr-beat" id="jr-beat">WATCH THE ROPE…</span>
            </div>
            <canvas id="jr-canvas" width="340" height="190" style="border-radius:10px"></canvas>
            <div class="jr-rating" id="jr-rating"> </div>
            <div class="jr-dots" id="jr-dots"></div>
            <button id="jr-btn" class="btn btn-primary jr-jump-btn">⬆ JUMP</button>
            <div class="jr-hint" id="jr-hint">Watch the rope swing — tap JUMP when it hits the ground!</div>
        </div>`;

    const canvas = container.querySelector('#jr-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const FLOOR_Y = H - 28;

    function drawStickman(x, lift, color) {
        const by = FLOOR_Y - lift;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, by - 38, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, by - 31); ctx.lineTo(x, by - 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 10, by - 25); ctx.lineTo(x + 10, by - 25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, by - 15); ctx.lineTo(x - 8, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, by - 15); ctx.lineTo(x + 8, by); ctx.stroke();
        ctx.restore();
    }

    function drawScene() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, FLOOR_Y); ctx.lineTo(W - 20, FLOOR_Y); ctx.stroke();

        drawStickman(38, 0, '#555');
        drawStickman(W - 38, 0, '#555');

        const cx = W / 2, cy = FLOOR_Y - 14, rx = 110, ry = 34;
        const angleNorm = ropeAngle % (2 * Math.PI);
        const proximity = Math.min(angleNorm, 2 * Math.PI - angleNorm);
        const atGround = proximity < 0.45;

        ctx.save();
        if (atGround) { ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 18; }
        ctx.strokeStyle = atGround ? '#ff8800' : '#ffaa00';
        ctx.lineWidth = atGround ? 5 : 3;
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.04) {
            const px = cx - rx + rx * 2 * t;
            const py = cy + Math.sin(ropeAngle + t * Math.PI) * ry;
            t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        if (atGround && phase === 'playing') {
            ctx.save();
            ctx.globalAlpha = 0.18 * (1 - proximity / 0.45);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(90, FLOOR_Y - 8, W - 180, 10);
            ctx.restore();
        }

        drawStickman(W / 2, playerLift, phase === 'done' ? '#888' : '#fff');
    }

    function animate(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(ts - lastTs, 50);
        lastTs = ts;

        const prevRev = Math.floor(ropeAngle / (2 * Math.PI));
        ropeAngle += (2 * Math.PI / PERIOD) * dt;
        const newRev = Math.floor(ropeAngle / (2 * Math.PI));

        if (newRev > prevRev) {
            if (phase === 'intro') {
                phase = 'playing';
                setHint('Tap JUMP when the rope hits the ground!');
                setBeat(`BEAT 1 / ${BEATS}`);
            } else if (phase === 'playing') {
                onGroundHit();
            }
        }

        if (jumpVel !== 0 || playerLift > 0) {
            playerLift += jumpVel * (dt / 16.67);
            jumpVel -= 1.1 * (dt / 16.67);
            if (playerLift <= 0) { playerLift = 0; jumpVel = 0; }
        }

        drawScene();
        animId = requestAnimationFrame(animate);
    }

    function onGroundHit() {
        const now = Date.now();

        if (!beatRated) {
            if (pendingEarly !== null && now - pendingEarly <= W_OK) {
                const err = now - pendingEarly;
                pushRating(err <= W_PERFECT ? 'PERFECT' : err <= W_GOOD ? 'GOOD' : 'OK');
            } else {
                pushRating('MISS');
            }
        }
        pendingEarly = null;

        if (ratings.length >= BEATS) { finishGame(); return; }

        beatHitTime = now;
        beatRated = false;
        setBeat(`BEAT ${ratings.length + 1} / ${BEATS}`);
    }

    function handleJump() {
        if (phase === 'done') return;

        if (phase === 'intro') { triggerJump(); return; }

        const now = Date.now();

        if (!beatRated && beatHitTime !== null) {
            const err = now - beatHitTime;
            if (err <= W_OK) {
                beatRated = true;
                pendingEarly = null;
                triggerJump();
                pushRating(err <= W_PERFECT ? 'PERFECT' : err <= W_GOOD ? 'GOOD' : 'OK');
                return;
            }
        }

        pendingEarly = now;
        triggerJump();
    }

    function triggerJump() { jumpVel = 9; }

    function pushRating(r) {
        ratings.push(r);
        const lbl = LABEL_MAP[r];
        const rEl = container.querySelector('#jr-rating');
        if (rEl) { rEl.textContent = lbl.text; rEl.className = 'jr-rating ' + lbl.cls; }
        const dEl = container.querySelector('#jr-dots');
        if (dEl) dEl.innerHTML = ratings.map(x => `<span class="jr-dot jr-dot-${x.toLowerCase()}"></span>`).join('');
        const score = ratings.reduce((s, x) => s + SCORE_MAP[x], 0);
        if (onProgress) onProgress(Math.min(1000, Math.round(score / (BEATS * 100) * 1000)));
        if (ratings.length >= BEATS) finishGame();
    }

    function finishGame() {
        if (phase === 'done') return;
        phase = 'done';
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', keyHandler);
        const hits = ratings.filter(r => r !== 'MISS').length;
        const score = ratings.reduce((s, r) => s + SCORE_MAP[r], 0);
        setBeat(`${hits} / ${BEATS} HITS`);
        setTimeout(() => onComplete({ result: { hits, total: BEATS, score }, timeMs: 0 }), 1800);
    }

    function setBeat(t) { const el = container.querySelector('#jr-beat'); if (el) el.textContent = t; }
    function setHint(t) { const el = container.querySelector('#jr-hint'); if (el) el.textContent = t; }

    function keyHandler(e) { if (e.code === 'Space') { e.preventDefault(); handleJump(); } }
    container.querySelector('#jr-btn').addEventListener('click', handleJump);
    document.addEventListener('keydown', keyHandler);

    animId = requestAnimationFrame(animate);
};
