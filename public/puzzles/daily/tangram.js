window.Puzzles = window.Puzzles || {};

window.Puzzles.tangram = function(container, data, onComplete, onProgress) {
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
    const S = 50;

    const TARGETS = [
      [[75,60],[216,60],[216,201],[75,201]],
      [[50,220],[250,220],[50,20]],
      [[95,30],[195,30],[195,230],[95,230]],
      [[40,190],[240,190],[280,90],[80,90]],
    ];
    const target = TARGETS[(data.puzzle||0) % TARGETS.length];

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
      ctx.save();
      ctx.fillStyle='rgba(255,170,0,0.13)';
      ctx.strokeStyle='rgba(255,170,0,0.6)';
      ctx.lineWidth=2;
      ctx.beginPath();
      target.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
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
      const ofcT=document.createElement('canvas'); ofcT.width=CW; ofcT.height=CH;
      const tctx=ofcT.getContext('2d');
      tctx.fillStyle='#ff0000';
      tctx.beginPath();
      target.forEach(([x,y],i)=>i?tctx.lineTo(x,y):tctx.moveTo(x,y));
      tctx.closePath(); tctx.fill();
      const td=tctx.getImageData(0,0,CW,CH).data;
      let totalTarget=0;
      for(let i=0;i<td.length;i+=4) if(td[i]>200) totalTarget++;
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
};
