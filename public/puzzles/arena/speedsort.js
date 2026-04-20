window.Puzzles = window.Puzzles || {};

window.Puzzles.speedsort = function(container, data, onComplete, onProgress) {
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
};
