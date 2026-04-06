// ============================================================
//  GAME.JS — Client-side game logic
// ============================================================

const socket = io();

// ── State ──────────────────────────────────────────────────
let myId       = null;
let myName     = '';
let roomCode   = '';
let isHost     = false;
let gameState  = null;
let timerMax   = 0;
let chatActive = false; // which chat panel is shown

// ── Elements ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Screen Management ──────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  chatActive = id === 'screen-discussion' || id === 'screen-voting';
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

// ── Landing Page ───────────────────────────────────────────
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

$('landing-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('btn-join').click();
});
$('landing-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if ($('landing-code').value.trim()) $('btn-join').click();
    else $('btn-create').click();
  }
});

function showError(msg) {
  $('landing-error').textContent = msg;
  setTimeout(() => { $('landing-error').textContent = ''; }, 3000);
}

// ── Copy room code ─────────────────────────────────────────
$('btn-copy-code').addEventListener('click', () => {
  navigator.clipboard?.writeText(roomCode);
  toast('Room code copied! 📋', 'success');
});

// ── Start game ─────────────────────────────────────────────
$('btn-start').addEventListener('click', () => {
  socket.emit('game:start');
});

// ── Play again ─────────────────────────────────────────────
$('btn-play-again').addEventListener('click', () => {
  location.reload();
});

// ── Chat (discussion) ──────────────────────────────────────
function setupChat(inputId, sendId, messagesId) {
  const input = $(inputId);
  const btn   = $(sendId);
  if (!input || !btn) return;
  const sendMsg = () => {
    const text = input.value.trim();
    if (!text) return;
    socket.emit('chat:send', { text });
    input.value = '';
  };
  btn.onclick = sendMsg;
  input.onkeydown = e => { if (e.key === 'Enter') sendMsg(); };
}
setupChat('chat-input',      'chat-send',      'chat-messages');
setupChat('vote-chat-input', 'vote-chat-send', 'vote-chat-messages');

function appendChat(msgPanelId, msg) {
  const panel = $(msgPanelId);
  if (!panel) return;
  const isMe = msg.playerId === myId;
  const div = document.createElement('div');
  div.className = `chat-msg${isMe ? ' mine' : ''} anim-slide-in`;
  if (msg.isSystem) {
    div.innerHTML = `<div class="chat-msg-bubble system-msg">${msg.text}</div>`;
  } else {
    div.innerHTML = `
      <div class="chat-msg-name">${isMe ? 'YOU' : escHtml(msg.playerName)}</div>
      <div class="chat-msg-bubble">${escHtml(msg.text)}</div>`;
  }
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

function syncChatHistory(history) {
  ['chat-messages','vote-chat-messages'].forEach(id => {
    const el = $(id); if (!el) return;
    el.innerHTML = '';
    history.forEach(m => appendChat(id, m));
  });
}

// ── Vote buttons ───────────────────────────────────────────
let myVote = null;
function renderVoteButtons(votable, lastPlaceId) {
  const container = $('vote-buttons');
  container.innerHTML = '';
  if (myId === lastPlaceId) {
    $('vote-status-msg').textContent = "You're in The Arena — you can't vote.";
    return;
  }
  votable.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'vote-btn';
    btn.dataset.id = p.id;
    btn.textContent = `⚔ ${p.name}`;
    btn.addEventListener('click', () => {
      if (myVote) return;
      myVote = p.id;
      socket.emit('vote:send', { targetId: p.id });
      container.querySelectorAll('.vote-btn').forEach(b => b.classList.toggle('voted', b.dataset.id === p.id));
      $('vote-status-msg').textContent = `Voted for ${p.name} ✅`;
    });
    container.appendChild(btn);
  });
}

// ── Puzzle area ────────────────────────────────────────────
let puzzleDone = false;

function renderPuzzle(areaId, doneOverlayId, type, puzzleData, isDuel) {
  puzzleDone = false;
  const area = $(areaId);
  const overlay = $(doneOverlayId);
  area.innerHTML = '';
  if (overlay) overlay.style.display = 'none';

  const renderer = window.Puzzles[type];
  if (!renderer) { area.innerHTML = `<div style="color:var(--muted);font-size:1.2rem">Puzzle type: ${type}</div>`; return; }

  renderer(area, puzzleData, ({ result, timeMs }) => {
    if (puzzleDone) return;
    puzzleDone = true;
    socket.emit('puzzle:complete', { result, timeMs });
    if (overlay) overlay.style.display = 'flex';
  });
}

// ── Lobby render ───────────────────────────────────────────
function renderLobby(state) {
  $('lobby-code').textContent = state.code;
  const grid = $('lobby-players');
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
  startBtn.style.display = (isHost && cnt >= 3) ? 'block' : 'none';
  $('lobby-status').textContent = cnt < 3
    ? `Waiting for players… (${cnt}/10, need 3 to start)`
    : isHost ? `${cnt}/10 players — you can start!` : `${cnt}/10 players — waiting for host to start`;
}

// ── Results list render ────────────────────────────────────
function renderDailyResults(data) {
  const list = $('daily-results-list');
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

function rankIcon(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
}

// ── Vote results render ────────────────────────────────────
function renderVoteResults(data) {
  const grid = $('vote-results-grid');
  grid.innerHTML = '';
  data.voteDisplay.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = `vr-row${i === 0 ? ' top-voted' : ''} anim-slide-in`;
    row.style.animationDelay = `${i * 0.1}s`;
    row.innerHTML = `
      <div class="vr-name">${escHtml(p.name)}</div>
      <div class="vr-skulls">${'💀'.repeat(Math.min(p.votes, 8))}</div>
      <div class="vr-votes">${p.votes} vote${p.votes !== 1 ? 's' : ''}</div>`;
    grid.appendChild(row);
  });
  $('vr-vs-banner').innerHTML = `
    <span style="color:var(--red)">${escHtml(data.lastPlaceName)}</span>
    &nbsp;VS&nbsp;
    <span style="color:var(--red)">${escHtml(data.duelOpponentName)}</span>
    <div style="font-size:.8rem;color:var(--muted);letter-spacing:.3em;margin-top:.4rem">ENTERING THE ARENA</div>`;
}

// ── Arena results render ───────────────────────────────────
function renderArenaResults(data) {
  $('arena-final-vs').innerHTML = `
    <div class="afv-player ${data.winnerId === data.p1Id ? 'winner' : 'loser'}">
      <div class="afv-name">${escHtml(data.p1Name)}</div>
      <div class="afv-score">${data.p1Score} pts</div>
      <div class="afv-badge ${data.winnerId === data.p1Id ? 'badge-win' : 'badge-lose'}">
        ${data.winnerId === data.p1Id ? 'WINNER' : 'ELIMINATED'}
      </div>
    </div>
    <div class="afv-vs">VS</div>
    <div class="afv-player ${data.winnerId === data.p2Id ? 'winner' : 'loser'}">
      <div class="afv-name">${escHtml(data.p2Name)}</div>
      <div class="afv-score">${data.p2Score} pts</div>
      <div class="afv-badge ${data.winnerId === data.p2Id ? 'badge-win' : 'badge-lose'}">
        ${data.winnerId === data.p2Id ? 'WINNER' : 'ELIMINATED'}
      </div>
    </div>`;
  $('arena-winner-announce').textContent = `${data.winnerName} SURVIVES THE ARENA`;
}

// ── Socket events ──────────────────────────────────────────
socket.on('connect', () => { myId = socket.id; });

socket.on('room:created', ({ code, state }) => {
  roomCode = code; isHost = true; myName = state.players.find(p=>p.id===myId)?.name || '';
  gameState = state;
  renderLobby(state);
  showScreen('screen-lobby');
});

socket.on('room:joined', ({ code, state }) => {
  roomCode = code; isHost = false; myName = state.players.find(p=>p.id===myId)?.name || '';
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
  hideTimerBar();

  switch (data.phase) {

    case 'daily_intro': {
      $('di-round').textContent = data.round;
      $('di-puzzle-name').textContent = data.puzzleName;
      $('di-count').textContent = data.playerCount;
      $('di-countdown').textContent = '';
      showScreen('screen-daily-intro');
      // countdown 4→1
      let c = 4;
      const t = setInterval(() => {
        $('di-countdown').textContent = c > 0 ? c : 'GO!';
        c--;
        if (c < -1) clearInterval(t);
      }, 1000);
      break;
    }

    case 'daily': {
      $('daily-round').textContent = gameState?.round || '?';
      $('daily-puzzle-label').textContent = data.puzzleType?.toUpperCase() || '';
      $('daily-timer').textContent = data.timeLimit;
      $('daily-progress').textContent = '';
      showScreen('screen-daily');
      showTimerBar(data.timeLimit);
      renderPuzzle('puzzle-area', 'puzzle-done-overlay', data.puzzleType, data.puzzleData, false);
      break;
    }

    case 'daily_results': {
      const lp = data.lastPlaceName;
      $('dr-last-place-msg').textContent = `⚠ ${lp} finished last — they're in The Arena`;
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
        // render alive players
        const list = $('disc-players-list');
        list.innerHTML = '';
        gameState.players.filter(p => p.id !== data.lastPlaceId).forEach(p => {
          const d = document.createElement('div');
          d.className = 'player-mini';
          d.textContent = (p.id === myId ? '→ ' : '') + p.name;
          list.appendChild(d);
        });
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
      // sync chat to vote panel too
      const voteMsgs = $('vote-chat-messages');
      voteMsgs.innerHTML = '';
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
      const { p1Id, p1Name, p2Id, p2Name, duelType, puzzleData, timeLimit } = data;
      $('arena-p1-name').textContent = p1Name;
      $('arena-p2-name').textContent = p2Name;
      $('arena-p1-status').textContent = '⏳';
      $('arena-p2-status').textContent = '⏳';
      $('arena-timer').textContent = timeLimit;
      showScreen('screen-arena');
      showTimerBar(timeLimit);

      const amDueling = myId === p1Id || myId === p2Id;
      const watchOverlay = $('arena-watch-overlay');
      const doneOverlay  = $('arena-done-overlay');
      watchOverlay.style.display = amDueling ? 'none' : 'flex';
      doneOverlay.style.display  = 'none';

      if (amDueling) {
        renderPuzzle('arena-puzzle-area', 'arena-done-overlay', duelType, puzzleData, true);
      } else {
        $('arena-watch-status').textContent = `${p1Name} vs ${p2Name}\nBoth are in The Arena…`;
        $('arena-puzzle-area').innerHTML = '';
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
      $('elim-remaining').textContent = `${data.remaining} player${data.remaining !== 1 ? 's' : ''} remain`;
      showScreen('screen-elimination');
      hideTimerBar();
      break;
    }

    case 'game_over': {
      $('go-winner').textContent = data.winnerName;
      const elimList = data.eliminated.map((e,i) => `${i+1}. ${e.name} (Round ${e.round})`).join(' · ');
      $('go-eliminated').textContent = 'Eliminated: ' + elimList;
      showScreen('screen-game-over');
      hideTimerBar();
      break;
    }
  }
});

// ── Timer tick ─────────────────────────────────────────────
socket.on('timer', ({ remaining }) => {
  updateTimerBar(remaining);
  // Update whichever timer is currently visible
  const phase = gameState?.phase || '';
  if (document.getElementById('screen-daily')?.classList.contains('active'))
    setTimerVal('daily-timer', remaining);
  if (document.getElementById('screen-discussion')?.classList.contains('active'))
    setTimerVal('disc-timer', remaining);
  if (document.getElementById('screen-voting')?.classList.contains('active'))
    setTimerVal('vote-timer', remaining);
  if (document.getElementById('screen-arena')?.classList.contains('active'))
    setTimerVal('arena-timer', remaining);
  if (document.getElementById('screen-daily-results')?.classList.contains('active'))
    $('dr-timer').textContent = remaining;
});

// ── Chat messages ───────────────────────────────────────────
socket.on('chat:message', (msg) => {
  appendChat('chat-messages',      msg);
  appendChat('vote-chat-messages', msg);
});

// ── Vote feedback ───────────────────────────────────────────
socket.on('vote:confirmed', ({ targetName }) => {
  toast(`Voted for ${targetName}`, 'success');
});

socket.on('vote:update', ({ count, total }) => {
  $('vote-progress').style.display = 'block';
  $('vote-count').textContent = count;
  $('vote-total').textContent = total;
});

// ── Daily progress ──────────────────────────────────────────
socket.on('daily:progress', ({ done, total }) => {
  $('daily-progress').textContent = `${done}/${total} done`;
});

// ── Duel progress ───────────────────────────────────────────
socket.on('duel:progress', ({ playerId, playerName }) => {
  if (playerId === myId) return; // we already see our own overlay
  // Update arena status icons
  const arenaData = window._arenaData || {};
  if (playerId === arenaData.p1Id) $('arena-p1-status').textContent = '✅';
  else $('arena-p2-status').textContent = '✅';
  $('arena-watch-status').textContent = `${playerName} has finished!\nWaiting for the other player…`;
});

// ── Player left mid-game ────────────────────────────────────
socket.on('player:left', ({ name }) => {
  toast(`${name} disconnected`, 'error');
  appendChat('chat-messages',      { isSystem:true, text:`${name} left the game.` });
  appendChat('vote-chat-messages', { isSystem:true, text:`${name} left the game.` });
});

// ── Utility ────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Store arena players for duel progress tracking
socket.on('game:phase', (data) => {
  if (data.phase === 'arena') {
    window._arenaData = { p1Id: data.p1Id, p2Id: data.p2Id };
  }
  // Keep gameState.phase in sync
  if (gameState) gameState.phase = data.phase;
});
