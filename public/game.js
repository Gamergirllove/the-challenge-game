// ============================================================
//  GAME.JS — Client-side game logic
// ============================================================

const socket = io();

// ── State ──────────────────────────────────────────────────
let myId        = null;
let myName      = '';
let roomCode    = '';
let isHost      = false;
let isSpectator = false;
let gameState   = null;
let timerMax    = 0;

// ── Elements ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Screen Management ──────────────────────────────────────
function showScreen(id) {
  if (isSpectator && id !== 'screen-spectator' && id !== 'screen-game-over') return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── Toast ──────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show ${type ? 'toast-' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Timer Bar ──────────────────────────────────────────────
function showTimerBar(total) {
  timerMax = total;
  $('timer-bar').style.display = 'block';
  updateTimerBar(total);
}
function hideTimerBar() { $('timer-bar').style.display = 'none'; }
function updateTimerBar(remaining) {
  const pct = timerMax > 0 ? (remaining / timerMax) * 100 : 0;
  const fill = $('timer-bar-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('urgent', pct < 20);
}
function setTimerVal(elId, val) {
  const el = $(elId); if (!el) return;
  el.textContent = val;
  const ring = el.closest('.timer-ring');
  if (ring) ring.classList.toggle('timer-urgent', val <= 10);
}

// ── Landing ────────────────────────────────────────────────
$('btn-create').addEventListener('click', () => {
  const name = $('landing-name').value.trim();
  if (!name) return showError('Enter your name first!');
  socket.emit('room:create', { name });
});
$('btn-join').addEventListener('click', () => {
  const name = $('landing-name').value.trim();
  const code = $('landing-code').value.trim().toUpperCase();
  if (!name) return showError('Enter your name first!');
  if (!code || code.length < 4) return showError('Enter a valid room code!');
  socket.emit('room:join', { name, code });
});
$('landing-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-join').click(); });
$('landing-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') { if ($('landing-code').value.trim()) $('btn-join').click(); else $('btn-create').click(); }
});
function showError(msg) {
  $('landing-error').textContent = msg;
  setTimeout(() => { $('landing-error').textContent = ''; }, 3000);
}

// ── Copy code ──────────────────────────────────────────────
$('btn-copy-code').addEventListener('click', () => {
  navigator.clipboard?.writeText(roomCode);
  toast('Room code copied! 📋', 'success');
});

// ── Start / Play Again ─────────────────────────────────────
$('btn-start').addEventListener('click', () => socket.emit('game:start'));
$('btn-play-again').addEventListener('click', () => location.reload());

// ── Elimination choice ─────────────────────────────────────
$('btn-spectate').addEventListener('click', () => {
  isSpectator = true;
  socket.emit('spectate:join');
  $('elim-choice-modal').style.display = 'none';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-spectator').classList.add('active');
});
$('btn-leave-game').addEventListener('click', () => {
  socket.emit('game:leave');
  location.reload();
});

// ── Chat ───────────────────────────────────────────────────
function setupChat(inputId, sendId) {
  const input = $(inputId), btn = $(sendId);
  if (!input || !btn) return;
  const send = () => { const t = input.value.trim(); if (!t) return; socket.emit('chat:send', { text: t }); input.value = ''; };
  btn.onclick = send;
  input.onkeydown = e => { if (e.key === 'Enter') send(); };
}
setupChat('chat-input', 'chat-send');
setupChat('vote-chat-input', 'vote-chat-send');

function appendChat(panelId, msg) {
  const panel = $(panelId); if (!panel) return;
  const isMe = msg.playerId === myId;
  const div = document.createElement('div');
  div.className = `chat-msg${isMe ? ' mine' : ''} anim-slide-in`;
  if (msg.isSystem) {
    div.innerHTML = `<div class="chat-msg-bubble system-msg">${msg.text}</div>`;
  } else {
    const bubbleClass = msg.isSpec ? 'chat-msg-bubble spec-msg' : 'chat-msg-bubble';
    const nameLabel = msg.isSpec ? `👁 ${escHtml(msg.playerName)} (spec)` : escHtml(msg.playerName);
    div.innerHTML = `<div class="chat-msg-name">${isMe ? 'YOU' : nameLabel}</div><div class="${bubbleClass}">${escHtml(msg.text)}</div>`;
  }
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}
function syncChatHistory(history) {
  ['chat-messages','vote-chat-messages'].forEach(id => {
    const el = $(id); if (!el) return;
    el.innerHTML = '';
    (history || []).forEach(m => appendChat(id, m));
  });
}

// ── Vote buttons ───────────────────────────────────────────
let myVote = null;
function renderVoteButtons(votable, lastPlaceId) {
  const cont = $('vote-buttons');
  if (!cont) return;
  cont.innerHTML = '';
  if (myId === lastPlaceId) { $('vote-status-msg').textContent = "You're in The Arena — you can't vote."; return; }
  votable.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'vote-btn'; btn.dataset.id = p.id;
    btn.textContent = `⚔ ${p.name}`;
    btn.addEventListener('click', () => {
      if (myVote) return;
      myVote = p.id;
      socket.emit('vote:send', { targetId: p.id });
      cont.querySelectorAll('.vote-btn').forEach(b => b.classList.toggle('voted', b.dataset.id === p.id));
      $('vote-status-msg').textContent = `Voted for ${p.name} ✅`;
    });
    cont.appendChild(btn);
  });
}

// ── Puzzle rendering ───────────────────────────────────────
let puzzleDone = false;
function renderPuzzle(areaId, doneOverlayId, type, puzzleData) {
  puzzleDone = false;
  const area = $(areaId), overlay = $(doneOverlayId);
  if (!area) return;
  area.innerHTML = '';
  if (overlay) overlay.style.display = 'none';
  const renderer = window.Puzzles[type];
  if (!renderer) { area.innerHTML = `<div style="color:var(--muted);font-size:1.2rem">Puzzle: ${type}</div>`; return; }
  renderer(area, puzzleData,
    ({ result, timeMs }) => {
      if (puzzleDone) return;
      puzzleDone = true;
      socket.emit('puzzle:complete', { result, timeMs });
      if (overlay) overlay.style.display = 'flex';
    },
    (score) => {
      // Live progress update
      socket.emit('puzzle:progress', { score });
    }
  );
}

// ── Lobby render ───────────────────────────────────────────
function renderLobby(state) {
  $('lobby-code').textContent = state.code;
  const grid = $('lobby-players');
  if (!grid) return;
  grid.innerHTML = '';
  state.players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card anim-pop-in';
    card.innerHTML = `
      <div class="player-card-name">${escHtml(p.name)}</div>
      ${p.isHost ? `<div class="player-card-badge">⭐ HOST</div>` : ''}
      ${p.id === myId ? `<div class="player-card-badge" style="color:var(--blue)">← YOU</div>` : ''}`;
    grid.appendChild(card);
  });
  const cnt = state.players.length;
  const startBtn = $('btn-start');
  startBtn.style.display = (isHost && cnt >= 5) ? 'block' : 'none';
  $('lobby-status').textContent = cnt < 5
    ? `Waiting for players… (${cnt}/10, need 5 to start)`
    : isHost ? `${cnt}/10 ready — start when you're set!` : `${cnt}/10 players — waiting for host`;
}

// ── Daily results ──────────────────────────────────────────
function renderDailyResults(data) {
  const list = $('daily-results-list'); if (!list) return;
  list.innerHTML = '';
  const rankClass = ['first-place','second-place','third-place'];
  data.results.forEach((p, i) => {
    const cls = p.isLast ? 'last-place' : (rankClass[i] || '');
    const row = document.createElement('div');
    row.className = `result-row ${cls} anim-slide-in`;
    row.style.animationDelay = `${i * 0.07}s`;
    row.innerHTML = `
      <div class="result-rank">${rankIcon(i+1)}</div>
      <div class="result-name">${escHtml(p.name)}</div>
      ${p.id === myId ? `<span class="result-tag tag-you">YOU</span>` : ''}
      ${p.isLast ? `<span class="result-tag tag-arena">ARENA</span>` : ''}
      <div class="result-score">${p.roundScore} pts</div>`;
    list.appendChild(row);
  });
}

// ── Vote results ───────────────────────────────────────────
function renderVoteResults(data) {
  const grid = $('vote-results-grid'); if (!grid) return;
  grid.innerHTML = '';
  data.voteDisplay.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = `vr-row${i === 0 ? ' top-voted' : ''} anim-slide-in`;
    row.style.animationDelay = `${i * 0.1}s`;
    row.innerHTML = `<div class="vr-name">${escHtml(p.name)}</div><div class="vr-skulls">${'💀'.repeat(Math.min(p.votes,8))}</div><div class="vr-votes">${p.votes} vote${p.votes!==1?'s':''}</div>`;
    grid.appendChild(row);
  });
  $('vr-vs-banner').innerHTML = `<span style="color:var(--red)">${escHtml(data.lastPlaceName)}</span> &nbsp;VS&nbsp; <span style="color:var(--red)">${escHtml(data.duelOpponentName)}</span><div style="font-size:.8rem;color:var(--muted);letter-spacing:.3em;margin-top:.4rem">ENTERING THE ARENA</div>`;
}

// ── Arena results ──────────────────────────────────────────
function renderArenaResults(data) {
  const el = $('arena-final-vs'); if (!el) return;
  el.innerHTML = `
    <div class="afv-player ${data.winnerId===data.p1Id?'winner':'loser'}">
      <div class="afv-name">${escHtml(data.p1Name)}</div>
      <div class="afv-score">${data.p1Score} pts</div>
      <div class="afv-badge ${data.winnerId===data.p1Id?'badge-win':'badge-lose'}">${data.winnerId===data.p1Id?'WINNER':'ELIMINATED'}</div>
    </div>
    <div class="afv-vs">VS</div>
    <div class="afv-player ${data.winnerId===data.p2Id?'winner':'loser'}">
      <div class="afv-name">${escHtml(data.p2Name)}</div>
      <div class="afv-score">${data.p2Score} pts</div>
      <div class="afv-badge ${data.winnerId===data.p2Id?'badge-win':'badge-lose'}">${data.winnerId===data.p2Id?'WINNER':'ELIMINATED'}</div>
    </div>`;
  $('arena-winner-announce').textContent = `${data.winnerName} SURVIVES THE ARENA`;
}

// ── Spectator screen update ────────────────────────────────
function updateSpectatorScreen(data) {
  if (!data) return;
  if (data.round) $('spec-round').textContent = `ROUND ${data.round}`;
  if (data.phase) $('spec-phase').textContent = data.phase.replace(/_/g,' ').toUpperCase();

  // Leaderboard
  const lb = $('spec-leaderboard');
  if (lb && data.leaderboard) {
    lb.innerHTML = data.leaderboard.map((p, i) => `
      <div class="spec-lb-row${i===0?' top-rank':''}">
        <div class="spec-lb-rank">${rankIcon(p.rank)}</div>
        <div class="spec-lb-name">${escHtml(p.name)}</div>
        <div class="spec-lb-score">${p.totalScore}</div>
      </div>`).join('');
  }

  // Watch list
  const wl = $('spec-watch-list');
  if (wl && data.players) {
    const prevActive = wl.querySelector('.active')?.dataset?.id;
    wl.innerHTML = data.players.map(p => `
      <button class="spec-watch-btn${p.id===prevActive?' active':''}" data-id="${p.id}">
        <span>👁 ${escHtml(p.name)}</span>
        <span style="color:var(--gold);font-size:.85rem">${p.totalScore}pts</span>
      </button>`).join('');
    wl.querySelectorAll('.spec-watch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wl.querySelectorAll('.spec-watch-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        socket.emit('spectate:watch', { targetId: btn.dataset.id });
        $('spec-watching-label').textContent = `Watching: ${btn.querySelector('span').textContent.replace('👁 ','')}`;
      });
    });
  }

  // History
  const hist = $('spec-history');
  if (hist && data.history) {
    if (!data.history.length) {
      hist.innerHTML = '<div style="color:var(--muted);font-size:.85rem">No arena duels yet…</div>';
    } else {
      hist.innerHTML = [...data.history].reverse().map(h => `
        <div class="spec-hist-row">
          <div class="spec-hist-round">ROUND ${h.round} · ${h.puzzleName||h.puzzle}</div>
          <div>${escHtml(h.p1)} vs ${escHtml(h.p2)}</div>
          <div>
            <span class="spec-hist-winner">✅ ${escHtml(h.winner)}</span> stayed ·
            <span class="spec-hist-elim">💀 ${escHtml(h.loser)}</span> eliminated
          </div>
        </div>`).join('');
    }
  }
}

// ── Arena live score bars ──────────────────────────────────
function updateArenaBars(p1Id, p1Score, p2Id, p2Score) {
  const max = 1000;
  const p1Pct = Math.min(100, (p1Score / max) * 100);
  const p2Pct = Math.min(100, (p2Score / max) * 100);

  // Main arena screen bars
  const b1 = $('alb-p1-bar'), b2 = $('alb-p2-bar');
  const s1 = $('alb-p1-score'), s2 = $('alb-p2-score');
  if (b1) b1.style.width = p1Pct + '%';
  if (s1) s1.textContent = p1Score;
  if (b2) b2.style.width = p2Pct + '%';
  if (s2) s2.textContent = p2Score;

  // Spectator screen
  const specBars = $('spec-arena-bars');
  if (specBars) {
    const p1Name = window._arenaData?.p1Name || 'Player 1';
    const p2Name = window._arenaData?.p2Name || 'Player 2';
    specBars.innerHTML = `
      <div class="spec-alb-row">
        <div class="spec-alb-name">${escHtml(p1Name)}</div>
        <div class="spec-alb-bar-wrap"><div class="spec-alb-fill p1" style="width:${p1Pct}%">${p1Score}</div></div>
      </div>
      <div class="spec-alb-row">
        <div class="spec-alb-name">${escHtml(p2Name)}</div>
        <div class="spec-alb-bar-wrap"><div class="spec-alb-fill p2" style="width:${p2Pct}%">${p2Score}</div></div>
      </div>`;
    $('spec-arena-live').style.display = 'block';
  }

  // Watcher overlay
  const ws = $('arena-watch-status');
  if (ws) {
    const p1Name = window._arenaData?.p1Name || '';
    const p2Name = window._arenaData?.p2Name || '';
    ws.innerHTML = `
      <div style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:.75rem">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
            <span>${escHtml(p1Name)}</span><strong style="color:var(--red)">${p1Score} pts</strong>
          </div>
          <div style="background:var(--dark3);border-radius:20px;height:14px;overflow:hidden">
            <div style="height:100%;background:var(--red);width:${p1Pct}%;transition:width .4s;border-radius:20px"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
            <span>${escHtml(p2Name)}</span><strong style="color:var(--blue)">${p2Score} pts</strong>
          </div>
          <div style="background:var(--dark3);border-radius:20px;height:14px;overflow:hidden">
            <div style="height:100%;background:var(--blue);width:${p2Pct}%;transition:width .4s;border-radius:20px"></div>
          </div>
        </div>
      </div>`;
  }
}

// ── Socket events ──────────────────────────────────────────
socket.on('connect', () => { myId = socket.id; });

socket.on('room:created', ({ code, state }) => {
  roomCode = code; isHost = true;
  myName = state.players.find(p=>p.id===myId)?.name || '';
  gameState = state;
  renderLobby(state);
  showScreen('screen-lobby');
});

socket.on('room:joined', ({ code, state }) => {
  roomCode = code; isHost = false;
  myName = state.players.find(p=>p.id===myId)?.name || '';
  gameState = state;
  renderLobby(state);
  showScreen('screen-lobby');
});

socket.on('room:update', ({ state }) => {
  gameState = state;
  renderLobby(state);
  syncChatHistory(state.chatHistory);
});

socket.on('error', ({ msg }) => {
  toast(msg, 'error');
  showError(msg);
});

// ── PHASE HANDLER ──────────────────────────────────────────
socket.on('game:phase', (data) => {
  if (gameState) gameState.phase = data.phase;
  if (isSpectator) {
    // Spectators only react to arena start/end for live bars
    if (data.phase === 'arena') {
      window._arenaData = { p1Id:data.p1Id, p2Id:data.p2Id, p1Name:data.p1Name, p2Name:data.p2Name };
      $('spec-arena-live').style.display = 'block';
      updateArenaBars(data.p1Id, 0, data.p2Id, 0);
    }
    if (data.phase === 'game_over') {
      $('go-winner').textContent = data.winnerName;
      const elimList = (data.eliminated||[]).map((e,i)=>`${i+1}. ${e.name} (Round ${e.round})`).join(' · ');
      $('go-eliminated').textContent = 'Eliminated: ' + elimList;
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      $('screen-game-over').classList.add('active');
    }
    return;
  }

  hideTimerBar();

  switch (data.phase) {
    case 'daily_intro': {
      $('di-round').textContent = data.round;
      $('di-puzzle-name').textContent = data.puzzleName;
      $('di-count').textContent = data.playerCount;
      $('di-countdown').textContent = '';
      showScreen('screen-daily-intro');
      let c = 4;
      const t = setInterval(() => { $('di-countdown').textContent = c>0?c:'GO!'; c--; if(c<-1) clearInterval(t); }, 1000);
      break;
    }
    case 'daily': {
      $('daily-round').textContent = gameState?.round || '?';
      $('daily-puzzle-label').textContent = data.puzzleType?.toUpperCase() || '';
      $('daily-timer').textContent = data.timeLimit;
      $('daily-progress').textContent = '';
      showScreen('screen-daily');
      showTimerBar(data.timeLimit);
      renderPuzzle('puzzle-area', 'puzzle-done-overlay', data.puzzleType, data.puzzleData);
      break;
    }
    case 'daily_results': {
      $('dr-last-place-msg').textContent = `⚠ ${data.lastPlaceName} finished last — they're in The Arena`;
      $('dr-timer').textContent = '5';
      renderDailyResults(data);
      showScreen('screen-daily-results');
      break;
    }
    case 'discussion': {
      $('disc-timer').textContent = data.timeLeft;
      $('disc-last-name').textContent = data.lastPlaceName;
      $('chat-messages').innerHTML = '';
      if (gameState) {
        syncChatHistory(gameState.chatHistory);
        const list = $('disc-players-list'); if (list) {
          list.innerHTML = '';
          gameState.players.filter(p=>p.id!==data.lastPlaceId).forEach(p => {
            const d = document.createElement('div');
            d.className = 'player-mini';
            d.textContent = (p.id===myId?'→ ':'')+p.name;
            list.appendChild(d);
          });
        }
      }
      showScreen('screen-discussion');
      showTimerBar(data.timeLeft);
      break;
    }
    case 'voting': {
      myVote = null;
      $('vote-timer').textContent = data.timeLeft;
      $('vote-last-name').textContent = data.lastPlaceName;
      $('vote-status-msg').textContent = '';
      $('vote-progress').style.display = 'none';
      renderVoteButtons(data.votable, data.lastPlaceId);
      $('vote-chat-messages').innerHTML = '';
      if (gameState) syncChatHistory(gameState.chatHistory);
      showScreen('screen-voting');
      showTimerBar(data.timeLeft);
      break;
    }
    case 'vote_results': {
      renderVoteResults(data);
      showScreen('screen-vote-results');
      break;
    }
    case 'arena_intro': {
      $('ai-puzzle-name').textContent = data.duelName;
      $('ai-p1').textContent = data.p1Name;
      $('ai-p2').textContent = data.p2Name;
      showScreen('screen-arena-intro');
      break;
    }
    case 'arena': {
      window._arenaData = { p1Id:data.p1Id, p2Id:data.p2Id, p1Name:data.p1Name, p2Name:data.p2Name };
      $('arena-p1-name').textContent = data.p1Name;
      $('arena-p2-name').textContent = data.p2Name;
      $('arena-p1-status').textContent = '⏳';
      $('arena-p2-status').textContent = '⏳';
      $('arena-timer').textContent = data.timeLimit;
      $('alb-p1-name').textContent = data.p1Name;
      $('alb-p2-name').textContent = data.p2Name;
      updateArenaBars(data.p1Id, 0, data.p2Id, 0);
      showScreen('screen-arena');
      showTimerBar(data.timeLimit);
      const amDueling = myId===data.p1Id || myId===data.p2Id;
      $('arena-watch-overlay').style.display = amDueling ? 'none' : 'flex';
      $('arena-done-overlay').style.display = 'none';
      $('arena-puzzle-area').innerHTML = '';
      if (amDueling) {
        renderPuzzle('arena-puzzle-area', 'arena-done-overlay', data.duelType, data.puzzleData);
      } else {
        $('arena-watch-status').innerHTML = `<div>${escHtml(data.p1Name)} vs ${escHtml(data.p2Name)}</div><div style="margin-top:.5rem;font-size:.85rem;color:var(--muted)">Both players are fighting it out…</div>`;
      }
      break;
    }
    case 'arena_results': {
      renderArenaResults(data);
      showScreen('screen-arena-results');
      break;
    }
    case 'elimination': {
      $('elim-name').textContent = data.eliminatedName;
      $('elim-remaining').textContent = `${data.remaining} player${data.remaining!==1?'s':''} remain`;
      showScreen('screen-elimination');
      hideTimerBar();
      break;
    }
    case 'game_over': {
      $('go-winner').textContent = data.winnerName;
      const elimList = (data.eliminated||[]).map((e,i)=>`${i+1}. ${e.name} (Round ${e.round})`).join(' · ');
      $('go-eliminated').textContent = 'Eliminated: ' + elimList;
      showScreen('screen-game-over');
      hideTimerBar();
      break;
    }
  }
});

// ── Timer ──────────────────────────────────────────────────
socket.on('timer', ({ remaining }) => {
  updateTimerBar(remaining);
  if ($('screen-daily')?.classList.contains('active'))       setTimerVal('daily-timer', remaining);
  if ($('screen-discussion')?.classList.contains('active'))  setTimerVal('disc-timer', remaining);
  if ($('screen-voting')?.classList.contains('active'))      setTimerVal('vote-timer', remaining);
  if ($('screen-arena')?.classList.contains('active'))       setTimerVal('arena-timer', remaining);
  if ($('screen-daily-results')?.classList.contains('active')) { const el=$('dr-timer'); if(el) el.textContent=remaining; }
});

// ── Chat ───────────────────────────────────────────────────
socket.on('chat:message', msg => {
  appendChat('chat-messages', msg);
  appendChat('vote-chat-messages', msg);
});

// ── Vote ───────────────────────────────────────────────────
socket.on('vote:confirmed', ({ targetName }) => { toast(`Voted for ${targetName}`, 'success'); });
socket.on('vote:update', ({ count, total }) => {
  $('vote-progress').style.display = 'block';
  $('vote-count').textContent = count;
  $('vote-total').textContent = total;
});

// ── Daily progress ─────────────────────────────────────────
socket.on('daily:progress', ({ done, total }) => {
  const el = $('daily-progress'); if (el) el.textContent = `${done}/${total} done`;
});

// ── Duel progress ──────────────────────────────────────────
socket.on('duel:progress', ({ playerId, playerName }) => {
  if (playerId === myId) return;
  if (window._arenaData) {
    if (playerId === window._arenaData.p1Id) $('arena-p1-status').textContent = '✅';
    else $('arena-p2-status').textContent = '✅';
  }
});

// ── Arena live scores ──────────────────────────────────────
socket.on('arena:live', ({ p1Id, p1Score, p2Id, p2Score }) => {
  updateArenaBars(p1Id, p1Score, p2Id, p2Score);
});

// ── Elimination choice ─────────────────────────────────────
socket.on('elimination:choice', ({ eliminatedName }) => {
  $('ecm-name').textContent = eliminatedName;
  $('elim-choice-modal').style.display = 'flex';
});

// ── Spectator events ───────────────────────────────────────
socket.on('spectator:init', data => {
  $('spec-arena-live').style.display = 'none';
  updateSpectatorScreen(data);
});
socket.on('spectator:update', data => {
  updateSpectatorScreen(data);
  if (data.phase !== 'arena') $('spec-arena-live').style.display = 'none';
});
socket.on('spectator:watching', ({ targetName }) => {
  $('spec-watching-label').textContent = `Watching: ${targetName}`;
});

// ── Player left ────────────────────────────────────────────
socket.on('player:left', ({ name }) => {
  toast(`${name} disconnected`, 'error');
  ['chat-messages','vote-chat-messages'].forEach(id => appendChat(id, { isSystem:true, text:`${name} left the game.` }));
});

// ── Helpers ────────────────────────────────────────────────
function rankIcon(rank) { return rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank; }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
