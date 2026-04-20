window.Puzzles = window.Puzzles || {};

window.Puzzles.minesweeper = function(container, data, onComplete, onProgress) {
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
          <div style="font-size:.8rem;color:var(--muted)">Tap reveal · Hold to flag mines</div>
          <div id="ms-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;user-select:none"></div>
          <div style="font-size:.85rem;color:var(--muted)">Revealed: <span id="ms-rev">0</span>/${safeCells}</div>
        </div>`;
      const grid = container.querySelector('#ms-grid');
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
        const key=`${r},${c}`;
        const btn=document.createElement('button');
        btn.className='ms-cell';
        btn.style.cssText='width:28px;height:28px;font-size:.75rem;border-radius:4px;cursor:pointer;border:none;font-weight:700;touch-action:manipulation';
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
        // Long-press to flag on touch devices
        let pressTimer = null;
        btn.addEventListener('touchstart', e => {
          pressTimer = setTimeout(() => {
            pressTimer = null;
            e.preventDefault();
            if(done||revealed.has(key)) return;
            if(flagged.has(key)) flagged.delete(key); else flagged.add(key);
            render();
          }, 500);
        }, { passive: true });
        btn.addEventListener('touchend', () => { clearTimeout(pressTimer); pressTimer = null; });
        btn.addEventListener('touchmove', () => { clearTimeout(pressTimer); pressTimer = null; });
        grid.appendChild(btn);
      }
    }
    render();
};
