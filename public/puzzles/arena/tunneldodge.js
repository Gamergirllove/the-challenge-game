window.Puzzles = window.Puzzles || {};

window.Puzzles.tunneldodge = function(container, data, onComplete, onProgress) {
    const ROUNDS   = 3;
    const TAP_SEC  = 10;
    const myName   = (data.myName  || 'YOU').slice(0, 14);
    const myWins   = data.myWins  || 0;
    const oppName  = (data.oppName || 'OPPONENT').slice(0, 14);
    const oppWins  = data.oppWins || 0;

    // Reuse game.js shirt tier if available, otherwise inline
    function getTier(wins) {
        if (typeof getShirtTier === 'function') return getShirtTier(wins);
        if (wins >= 10) return { fill: 'gradient', stroke: '#b7791f', glow: '#ffd700' };
        if (wins >= 6)  return { fill: '#f1c40f',  stroke: '#c9a20c', glow: '#f1c40f' };
        if (wins >= 3)  return { fill: '#bdc3c7',  stroke: '#8a9399', glow: '#bdc3c7' };
        if (wins >= 1)  return { fill: '#cd7f32',  stroke: '#a0622a', glow: null };
        return               { fill: '#636e72',  stroke: '#555',    glow: null };
    }
    const myTier  = getTier(myWins);
    const oppTier = getTier(oppWins);

    // Canvas shirt path (100×100 viewBox)
    const SHIRT = new Path2D('M18,3 L26,15 Q37,20 50,22 Q63,20 74,15 L82,3 L100,22 L78,34 L78,98 L22,98 L22,34 L0,22 Z');

    // Game state
    let totalTaps = 0, roundTaps = 0, round = 1;
    let phase = 'intro';   // intro|countdown|tapping|rush|impact|reset|finalrush|done
    let phaseMs = 0, countdown = 3, timeLeft = TAP_SEC;

    // Shirt animation (0=left wall, 1=right wall)
    let myFrac = 0, oppFrac = 0;
    let particles = [], flashAlpha = 0, shakeX = 0, shakeY = 0;
    let animId, lastTs = null;

    container.innerHTML = `
        <div class="td-wrap">
            <div class="td-hdr">
                <span class="td-round" id="td-rnd">ROUND 1 / ${ROUNDS}</span>
                <span class="td-clock" id="td-clk"> </span>
            </div>
            <canvas id="td-cv" width="360" height="215" style="border-radius:12px;display:block"></canvas>
            <div class="td-status" id="td-st">GET READY…</div>
            <button id="td-tap" class="btn btn-primary td-tapbtn" disabled>TAP!</button>
            <div class="td-tally" id="td-tally"> </div>
        </div>`;

    const cv  = container.querySelector('#td-cv');
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const CX = W / 2, CY = H * 0.44;
    const SY = H * 0.36;   // shirt centre Y
    const SZ = 58;          // shirt size (px at 100×100 scale)
    const LX = 44, RX = W - 44; // shirt anchor X at rest

    // ── Drawing ──────────────────────────────────────────────

    function drawShirt(cx, cy, sz, tier, name, wins, flip) {
        ctx.save();
        ctx.translate(cx, cy);
        if (flip) ctx.scale(-1, 1);
        const s = sz / 100;
        ctx.scale(s, s);
        ctx.translate(-50, -50);

        if (tier.glow) { ctx.shadowColor = tier.glow; ctx.shadowBlur = 14; }
        if (tier.fill === 'gradient') {
            const g = ctx.createLinearGradient(0, 0, 100, 100);
            g.addColorStop(0, '#fffde7'); g.addColorStop(0.5, '#ffd700'); g.addColorStop(1, '#f57f17');
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = tier.fill;
        }
        ctx.fill(SHIRT);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = tier.stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke(SHIRT);
        // collar
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(26,15); ctx.quadraticCurveTo(37,22,50,24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(74,15); ctx.quadraticCurveTo(63,22,50,24); ctx.stroke();
        // wins badge
        if (wins > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.font = 'bold 18px Bebas Neue,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(Math.min(wins, 99), 50, 65);
        }
        ctx.restore();
        // name label
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px Bebas Neue,sans-serif';
        ctx.letterSpacing = '0.08em';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), cx, cy + sz * 0.6);
        ctx.restore();
    }

    function drawTunnel() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#07071c'); g.addColorStop(1, '#10052a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // perspective lines to vanishing point
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            ctx.strokeStyle = `rgba(110,50,220,${0.1 + t * 0.05})`;
            ctx.beginPath(); ctx.moveTo(t * W, 0);   ctx.lineTo(CX, CY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(t * W, H);   ctx.lineTo(CX, CY); ctx.stroke();
        }
        // horizontal rings
        for (let d = 0; d < 6; d++) {
            const t = d / 5;
            const rw = 36 + t * (W * 0.46), rh = 22 + t * (H * 0.36);
            ctx.strokeStyle = `rgba(110,50,220,${0.08 + t * 0.12})`;
            ctx.lineWidth = 1 + t;
            ctx.beginPath();
            ctx.ellipse(CX, CY, rw, rh, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        // centre glow
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, 65);
        grd.addColorStop(0, 'rgba(130,60,255,0.22)'); grd.addColorStop(1, 'rgba(130,60,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.ellipse(CX, CY, 65, 42, 0, 0, Math.PI * 2); ctx.fill();

        // floor stripe
        ctx.strokeStyle = 'rgba(110,50,220,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H * 0.74); ctx.lineTo(W, H * 0.74); ctx.stroke();
    }

    function drawParticles(dt) {
        particles.forEach(p => {
            p.x += p.vx * dt / 16; p.y += p.vy * dt / 16;
            p.vy += 0.12 * dt / 16;
            p.life -= dt / 900;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
        particles = particles.filter(p => p.life > 0);
    }

    function burst(x, y, col1, col2, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 1,
                r: 2 + Math.random() * 4, col: Math.random() < 0.5 ? col1 : col2, life: 1 });
        }
    }

    // ── Animation loop ───────────────────────────────────────

    function animate(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(ts - lastTs, 50);
        lastTs = ts;
        phaseMs += dt;

        // Shirt position update
        const maxAdv  = W * 0.36;   // max advance from starting edge
        const colX    = CX;         // collision point

        if (phase === 'tapping') {
            const maxTaps = TAP_SEC * 9;
            const adv = Math.min(maxAdv, (roundTaps / maxTaps) * maxAdv * 1.25);
            myFrac  += (adv      - myFrac)  * 0.14;
            oppFrac += (adv * 0.55 - oppFrac) * 0.09;   // opponent fake-retreats
        } else if (phase === 'rush') {
            const t = smoothstep(Math.min(1, phaseMs / 380));
            myFrac  = maxAdv + t * (colX - LX - maxAdv) * 0.96;
            oppFrac = maxAdv * 0.55 + t * (colX - LX - maxAdv * 0.55) * 0.96;
            if (phaseMs >= 380) {
                flashAlpha = 0.9;
                shakeX = 0; shakeY = 0;
                burst(colX, SY, myTier.fill === 'gradient' ? '#ffd700' : myTier.fill,
                                 oppTier.fill === 'gradient' ? '#ffd700' : oppTier.fill, 30);
                phase = 'impact'; phaseMs = 0;
            }
        } else if (phase === 'impact') {
            shakeX = (Math.random()-0.5) * 10 * Math.max(0, 1 - phaseMs/350);
            shakeY = (Math.random()-0.5) * 5  * Math.max(0, 1 - phaseMs/350);
            if (phaseMs > 500) { phase = 'reset'; phaseMs = 0; shakeX=0; shakeY=0; }
        } else if (phase === 'reset') {
            myFrac  += (0 - myFrac)  * 0.12;
            oppFrac += (0 - oppFrac) * 0.10;
            if (phaseMs > 420) startNextRound();
        } else if (phase === 'finalrush') {
            const t = smoothstep(Math.min(1, phaseMs / 650));
            myFrac  = maxAdv + t * (W - LX - maxAdv + 40);  // bust through to far side
            oppFrac = maxAdv * 0.55 - t * maxAdv * 0.7;      // sent flying back
            if (phaseMs > 700) { phase = 'done'; finish(); }
        } else {
            myFrac  += (0 - myFrac)  * 0.09;
            oppFrac += (0 - oppFrac) * 0.09;
        }

        flashAlpha = Math.max(0, flashAlpha - dt * 0.0045);

        ctx.save();
        if (shakeX || shakeY) ctx.translate(shakeX, shakeY);
        drawTunnel();
        drawParticles(dt);
        drawShirt(LX + myFrac,         SY, SZ, myTier,  myName,  myWins,  false);
        drawShirt(RX - oppFrac,        SY, SZ, oppTier, oppName, oppWins, true);
        ctx.restore();

        if (flashAlpha > 0) {
            ctx.save(); ctx.globalAlpha = flashAlpha * 0.55;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
        }

        // Countdown overlay
        if (phase === 'countdown') {
            ctx.save();
            ctx.fillStyle = `rgba(255,255,255,${0.85 - (phaseMs % 1000)/1000 * 0.3})`;
            ctx.font = `bold ${Math.round(64 + Math.sin(phaseMs/120)*4)}px Bebas Neue,sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 24;
            ctx.fillText(countdown, CX, CY + 20);
            ctx.restore();
        }

        animId = requestAnimationFrame(animate);
    }

    function smoothstep(t) { return t * t * (3 - 2 * t); }

    // ── Game logic ───────────────────────────────────────────

    let countdownInterval = null, tapInterval = null;

    function startCountdown() {
        phase = 'countdown'; phaseMs = 0; countdown = 3;
        setBtnOff(); setStatus(''); setRound(`ROUND ${round} / ${ROUNDS}`);
        countdownInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) { clearInterval(countdownInterval); startTapping(); }
        }, 1000);
    }

    function startTapping() {
        phase = 'tapping'; phaseMs = 0; roundTaps = 0; timeLeft = TAP_SEC;
        setBtnOn(); setStatus('TAP AS FAST AS YOU CAN!'); setClock(`${timeLeft}s`);
        tapInterval = setInterval(() => {
            timeLeft--;
            setClock(`${timeLeft}s`);
            if (onProgress) onProgress(Math.min(1000, totalTaps * 5));
            if (timeLeft <= 0) { clearInterval(tapInterval); endRound(); }
        }, 1000);
    }

    function endRound() {
        setBtnOff(); setClock(''); setStatus(`${roundTaps} TAPS!`);
        phaseMs = 0;
        if (round >= ROUNDS) {
            setTimeout(() => { phase = 'finalrush'; phaseMs = 0; setStatus('🔥'); }, 300);
        } else {
            phase = 'rush'; phaseMs = 0;
        }
    }

    function startNextRound() {
        if (phase !== 'reset') return;
        round++;
        startCountdown();
    }

    function finish() {
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', keyDown);
        onComplete({ result: { taps: totalTaps }, timeMs: 0 });
    }

    // ── Controls ─────────────────────────────────────────────

    const tapBtn = container.querySelector('#td-tap');
    tapBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (phase !== 'tapping') return;
        roundTaps++; totalTaps++;
        setTally(`${totalTaps} taps`);
        tapBtn.style.transform = 'scale(0.91)';
        setTimeout(() => tapBtn.style.transform = '', 55);
    });

    function keyDown(e) {
        if (e.code === 'Space') { e.preventDefault(); tapBtn.dispatchEvent(new PointerEvent('pointerdown')); }
    }
    document.addEventListener('keydown', keyDown);

    // ── UI helpers ────────────────────────────────────────────

    function setStatus(t) { const el = container.querySelector('#td-st');    if (el) el.textContent = t; }
    function setClock(t)  { const el = container.querySelector('#td-clk');   if (el) el.textContent = t; }
    function setRound(t)  { const el = container.querySelector('#td-rnd');   if (el) el.textContent = t; }
    function setTally(t)  { const el = container.querySelector('#td-tally'); if (el) el.textContent = t; }
    function setBtnOn()   { tapBtn.disabled = false; tapBtn.classList.add('td-active'); }
    function setBtnOff()  { tapBtn.disabled = true;  tapBtn.classList.remove('td-active'); }

    // ── Start ─────────────────────────────────────────────────

    animId = requestAnimationFrame(animate);
    setTimeout(startCountdown, 700);
};
