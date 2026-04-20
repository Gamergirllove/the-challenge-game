window.Puzzles = window.Puzzles || {};

window.Puzzles.curling = function(container, data, onComplete, onProgress) {
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

      orb = { x: W/2, y: H - 60, r: 18 };
      orbVx = 0; orbVy = 0;

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
          const dx = pos.x - orb.x, dy = pos.y - orb.y;
          if (Math.sqrt(dx*dx+dy*dy) < 40) { dragStart = pos; }
        } else {
          brushing = true; brushX = pos.x; brushY = pos.y;
        }
      });

      canvas.addEventListener('pointermove', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched && dragStart) {
          drawFrame(ctx, W, H, target, [], false);
          drawOrb(ctx, orb);
          ctx.save();
          ctx.strokeStyle = 'rgba(255,200,50,.6)';
          ctx.lineWidth = 3; ctx.setLineDash([8,4]);
          ctx.beginPath(); ctx.moveTo(orb.x, orb.y);
          ctx.lineTo(orb.x + (orb.x - pos.x)*0.8, orb.y + (orb.y - pos.y)*0.8);
          ctx.stroke(); ctx.restore();
        } else if (launched && brushing) {
          brushX = pos.x; brushY = pos.y;
          const bx = pos.x - orb.x;
          orbVx += bx * 0.003;
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
        if (orb.x < orb.r) { orb.x = orb.r; orbVx *= -0.7; }
        if (orb.x > W-orb.r) { orb.x = W-orb.r; orbVx *= -0.7; }
        trail.push({x:orb.x,y:orb.y});
        if (trail.length > 30) trail.shift();
        drawFrame(ctx, W, H, target, trail, false);
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
      ctx.fillStyle = '#1a2a1a'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      const ringColors = ['rgba(232,25,44,.5)','rgba(255,255,255,.3)','rgba(232,25,44,.5)','rgba(245,197,24,.7)'];
      target.rings.forEach((r,i) => {
        ctx.beginPath(); ctx.arc(target.x, target.y, r, 0, Math.PI*2);
        ctx.fillStyle = ringColors[i]; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1; ctx.stroke();
      });
      trail.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4*(i/trail.length), 0, Math.PI*2);
        ctx.fillStyle = `rgba(100,200,255,${i/trail.length*0.4})`; ctx.fill();
      });
      if (!settled || trail.length) drawOrb(ctx, orb);
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
};
