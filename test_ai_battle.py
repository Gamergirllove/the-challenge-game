"""
CHALLENGE.IO -- Full AI Battle Test (10 AI Players)

- 10 Chrome windows arranged in a 5x2 grid
- 1 AI host (creates the room dynamically)
- 9 AI players with different personalities
- Smart puzzle solvers for every game type
- Strategic voting + contextual chat
- Coordinator dispatches state to all bots
"""
import sys
import io
# Force UTF-8 output on Windows to avoid encoding errors
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import time
import random
import threading
import traceback
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ══════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════
GAME_URL = "https://talented-benevolence-production-5242.up.railway.app"

# Screen: 2560x1440 — 5 columns × 2 rows
SCREEN_W, SCREEN_H = 2560, 1440
COLS, ROWS = 5, 2
WIN_W  = SCREEN_W  // COLS        # 512
WIN_H  = (SCREEN_H - 80) // ROWS  # ~680  (leave space for taskbar)

# 10 AI players with names + personalities
BOTS = [
    # (name, personality)     personalities: "aggressive","clutch","saboteur","analyst","balanced"
    ("TJ Lavin",        "analyst"),    # HOST — reads the room
    ("CT",              "aggressive"), # Pure beast — goes for the throat
    ("Johnny Bananas",  "saboteur"),   # Political player — strategic votes
    ("Wes",             "analyst"),    # Smart, calculates every move
    ("Cara Maria",      "clutch"),     # Clutch under pressure
    ("Laurel",          "aggressive"), # Dominant — aims to crush
    ("Derrick",         "balanced"),   # Steady all-rounder
    ("Aneesa",          "balanced"),   # Consistent performer
    ("Evelyn",          "clutch"),     # Known for late-game surges
    ("Kenny",           "saboteur"),   # Alliance builder, strategic votes
]

# ══════════════════════════════════════════════════════════════
#  COORDINATOR  (shared state between all bots)
# ══════════════════════════════════════════════════════════════
class Coordinator:
    def __init__(self):
        self.room_code   = None
        self.code_ready  = threading.Event()
        self.scores      = {}   # name → score
        self.phase       = None
        self.eliminated  = []
        self.lock        = threading.Lock()
        self.log_lock    = threading.Lock()

    def set_room_code(self, code):
        with self.lock:
            self.room_code = code
        self.code_ready.set()
        self.log("COORDINATOR", f"Room code dispatched → {code}")

    def update_scores(self, name, score):
        with self.lock:
            self.scores[name] = score

    def get_best_vote_target(self, my_name):
        """Return name of highest-scoring player (not self) to vote out."""
        with self.lock:
            candidates = {n: s for n, s in self.scores.items()
                          if n != my_name and n not in self.eliminated}
        if not candidates:
            return None
        return max(candidates, key=candidates.get)

    def log(self, name, msg):
        with self.log_lock:
            tag = f"[{name:<16}]"
            print(f"  {tag} {msg}")

coord = Coordinator()

# ══════════════════════════════════════════════════════════════
#  JAVASCRIPT PUZZLE SOLVERS
#  Each returns JS that auto-plays a puzzle type optimally.
# ══════════════════════════════════════════════════════════════

# Smart memory solver — remembers card positions and matches pairs
JS_MEMORY = """
(function autoMemory() {
    var seen = {};   // emoji → [indices already seen]
    var cards = Array.from(document.querySelectorAll('.mem-card'));
    var step = 0;

    function clickCard(idx) {
        var c = document.querySelectorAll('.mem-card')[idx];
        if (c && !c.classList.contains('matched') && !c.classList.contains('flipped'))
            c.click();
    }

    var iv = setInterval(function() {
        var unmatched = Array.from(document.querySelectorAll('.mem-card:not(.matched)'));
        if (unmatched.length === 0) { clearInterval(iv); return; }

        // Find an unflipped card and click it
        var unflipped = Array.from(document.querySelectorAll('.mem-card:not(.matched):not(.flipped)'));
        if (unflipped.length === 0) return;

        // Collect all visible faces (flipped cards)
        var flipped = Array.from(document.querySelectorAll('.mem-card.flipped:not(.matched)'));

        if (flipped.length === 0) {
            // Click first unflipped to reveal
            unflipped[0].click();
        } else if (flipped.length === 1) {
            var face = flipped[0].querySelector('.mem-card-face');
            var emoji = face ? face.textContent.trim() : '';
            // Look for a known match in previously seen cards
            var match = null;
            unflipped.forEach(function(c, i) {
                var f2 = c.querySelector('.mem-card-face');
                if (f2 && f2.textContent.trim() === emoji && c !== flipped[0]) {
                    match = c;
                }
            });
            if (match) {
                match.click();
            } else {
                // Reveal next unknown
                unflipped[0].click();
            }
        }
        // If 2 are flipped, wait for the lock to release
    }, 700);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Quick Math — find answer by checking which choice renders green after trying one
JS_QUICKMATH = """
(function autoQA() {
    var iv = setInterval(function() {
        // For quickmath: buttons with class qa-choice
        var choices = Array.from(document.querySelectorAll('.qa-choice:not([disabled])'));
        if (choices.length === 0) { clearInterval(iv); return; }

        // Try to extract question and compute answer
        var qEl = document.querySelector('.qa-question, #qm-question, [id*="question"]');
        var answered = false;
        if (qEl) {
            var qText = qEl.textContent.trim().replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            // Try eval to get the correct answer
            try {
                // Handle sqrt
                qText = qText.replace(/√(\\d+)/, 'Math.sqrt($1)');
                var answer = eval(qText);
                choices.forEach(function(c) {
                    if (Math.abs(parseFloat(c.textContent) - answer) < 0.5) {
                        c.click(); answered = true;
                    }
                });
            } catch(e) {}
        }
        if (!answered) choices[0].click();
    }, 600);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Reaction test — MutationObserver + polling to click immediately when signal appears
JS_REACTION = """
(function autoReact() {
    var clicked = 0;
    var targetClass = 'reaction-zone';

    function tryClick() {
        var el = document.querySelector('.reaction-btn, .reaction-zone, #react-btn, [class*="react"]');
        if (el && !el.disabled) { el.click(); clicked++; }
    }

    // Poll aggressively
    var iv = setInterval(tryClick, 80);

    // Also observe DOM for changes
    var obs = new MutationObserver(tryClick);
    var root = document.querySelector('#puzzle-container, #arena-container, .puzzle-area');
    if (root) obs.observe(root, { childList:true, subtree:true, attributes:true });

    setTimeout(function() { clearInterval(iv); obs.disconnect(); }, 40000);
})();
"""

# Number Hunt — click all hunt-btn in ascending order by reading their values
JS_NUMBERHUNT = """
(function autoHunt() {
    var iv = setInterval(function() {
        var btns = Array.from(document.querySelectorAll('.hunt-btn:not(.found):not([disabled])'));
        if (btns.length === 0) { clearInterval(iv); return; }
        // Sort by numeric value and click smallest
        btns.sort(function(a,b){ return parseInt(a.textContent)-parseInt(b.textContent); });
        btns[0].click();
    }, 100);
    setTimeout(function() { clearInterval(iv); }, 40000);
})();
"""

# Tap Frenzy — click the tap button as fast as possible
JS_TAPFRENZY = """
(function autoTap() {
    var btn = document.querySelector('#tap-btn, .tap-btn, button[id*="tap"], [class*="tap-btn"]');
    if (!btn) {
        // find the biggest / only button in the puzzle area
        var btns = document.querySelectorAll('#puzzle-container button, #arena-puzzle button');
        btn = btns[btns.length - 1] || document.querySelector('button');
    }
    if (!btn) return;
    var iv = setInterval(function() {
        try { btn.click(); } catch(e) { clearInterval(iv); }
    }, 28);
    setTimeout(function() { clearInterval(iv); }, 65000);
})();
"""

# Fast Fingers — read the target word and type it immediately
JS_FASTFINGERS = """
(function autoType() {
    var iv = setInterval(function() {
        var wordEl = document.querySelector('#ff-word, .ff-word, [id*="ff-target"], .target-word');
        var input  = document.querySelector('#ff-input, input[id*="ff"], .ff-input');
        if (!wordEl || !input || input.disabled) return;
        var word = wordEl.textContent.trim();
        if (!word) return;
        // Set value
        var nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        nativeInput.set.call(input, word);
        input.dispatchEvent(new Event('input', {bubbles:true}));
        input.dispatchEvent(new Event('change', {bubbles:true}));
        // Press Enter or click submit
        input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
        var submit = document.querySelector('#ff-submit, button[id*="submit"]');
        if (submit) submit.click();
    }, 200);
    setTimeout(function() { clearInterval(iv); }, 60000);
})();
"""

# Word Scramble — get the actual word from the hint and type it
JS_WORDSCRAMBLE = """
(function autoScramble() {
    var iv = setInterval(function() {
        var hint = document.querySelector('.word-hint, [class*="hint"]');
        var input = document.querySelector('.word-answer-input:not([disabled])');
        var submit = document.querySelector('#wsubmit, button[id*="submit"]');
        if (!input || !submit) return;
        if (hint) {
            // Extract the answer word from hint text like "Hint: FIRE"
            var hintText = hint.textContent.replace(/hint[:]/i,'').trim();
            var words = hintText.match(/[A-Z]{3,}/g);
            if (words) {
                input.value = words[words.length-1];
                input.dispatchEvent(new Event('input', {bubbles:true}));
                submit.click();
                return;
            }
        }
        // Fallback: just submit blank to advance
        submit.click();
    }, 800);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Color Sequence — watch the sequence then repeat it exactly
JS_COLORSEQ = """
(function autoColorSeq() {
    // Wait for the "Your turn" state then click buttons
    var iv = setInterval(function() {
        var btns = Array.from(document.querySelectorAll('.color-btn:not(.disabled):not([disabled])'));
        if (btns.length === 0) return;
        // Click a random enabled button (can't easily read sequence)
        btns[Math.floor(Math.random() * btns.length)].click();
    }, 500);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Tessellations — click blank cells using the color pattern
JS_TESSELLATIONS = """
(function autoTess() {
    var iv = setInterval(function() {
        // Click the first blank tessellation cell
        var blanks = document.querySelectorAll('.tess-blank, .tess-cell.blank, [class*="tess"][class*="blank"]');
        if (blanks.length === 0) { clearInterval(iv); return; }
        blanks[0].click();
    }, 300);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Speed Sort — click all numbers in ascending order
JS_SPEEDSORT = """
(function autoSort() {
    var iv = setInterval(function() {
        // Find the next expected number from the display
        var nextEl = document.querySelector('#ss-next');
        var nextNum = nextEl ? parseInt(nextEl.textContent) : null;
        if (nextNum) {
            var btns = Array.from(document.querySelectorAll('.hunt-btn:not([disabled])'));
            var target = btns.find(function(b){ return parseInt(b.dataset.num||b.textContent) === nextNum; });
            if (target) { target.click(); return; }
        }
        // Fallback: click smallest available
        var btns = Array.from(document.querySelectorAll('.hunt-btn:not(.found):not([disabled])'));
        if (btns.length === 0) { clearInterval(iv); return; }
        btns.sort(function(a,b){ return parseInt(a.textContent)-parseInt(b.textContent); });
        btns[0].click();
    }, 120);
    setTimeout(function() { clearInterval(iv); }, 40000);
})();
"""

# Find the Bomb — use the hint to guess correct row, click systematically
JS_FINDBOMB = """
(function autoFindBomb() {
    function findInRound() {
        var hint = document.querySelector('[id*="msg"],[class*="hint"]');
        var hintText = hint ? hint.textContent : '';
        var rowMatch = hintText.match(/Row (\\d+)/i);
        var targetRow = rowMatch ? parseInt(rowMatch[1]) - 1 : -1;
        var grid = document.querySelector('#fb-grid');
        if (!grid) return;
        var btns = Array.from(grid.querySelectorAll('button:not([disabled])'));
        var size = Math.round(Math.sqrt(btns.length));
        if (targetRow >= 0) {
            // Click buttons in the hinted row first
            var rowBtns = btns.filter(function(_, i){ return Math.floor(i/size) === targetRow; });
            if (rowBtns.length > 0) { rowBtns[0].click(); return; }
        }
        if (btns.length > 0) btns[0].click();
    }
    var iv = setInterval(findInRound, 400);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Math Race — compute each answer
JS_MATHRACE = """
(function autoMathRace() {
    var iv = setInterval(function() {
        var qEl = document.querySelector('[style*="3rem"], .math-q, #mr-q');
        if (!qEl) {
            // Try any large text element
            var allBig = Array.from(document.querySelectorAll('[style*="font-size"]'))
                .filter(function(el){ return parseFloat(el.style.fontSize) > 20; });
            if (allBig.length > 0) qEl = allBig[0];
        }
        var choices = Array.from(document.querySelectorAll('#mr-choices button, .btn-secondary:not([disabled])'));
        if (choices.length === 0) return;

        var answered = false;
        if (qEl) {
            var qText = qEl.textContent.trim().replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            try {
                qText = qText.replace(/√(\\d+)/, 'Math.sqrt($1)');
                var answer = eval(qText);
                choices.forEach(function(c) {
                    if (Math.abs(parseFloat(c.textContent) - answer) < 0.5) {
                        c.click(); answered = true;
                    }
                });
            } catch(e) {}
        }
        if (!answered) choices[0].click();
    }, 500);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Simon Extreme — memorize sequence and repeat (simplified: repeat clicks fast)
JS_SIMONEXTREME = """
(function autoSimon() {
    var sequence = [];
    var playerTurn = false;
    var playerIdx = 0;

    // Watch for "Your turn!" message to know when to click
    var msgObs = new MutationObserver(function() {
        var msg = document.querySelector('#se-msg');
        if (msg && msg.textContent.includes('turn')) {
            playerTurn = true; playerIdx = 0;
        }
        if (msg && msg.textContent.includes('Watch')) {
            playerTurn = false; playerIdx = 0;
        }
    });
    var msgEl = document.querySelector('#se-msg');
    if (msgEl) msgObs.observe(msgEl, {childList:true,characterData:true,subtree:true});

    var iv = setInterval(function() {
        if (!playerTurn) return;
        var btns = Array.from(document.querySelectorAll('#se-btns button:not([disabled])'));
        if (btns.length > 0 && playerIdx < btns.length * 3) {
            btns[playerIdx % btns.length].click();
            playerIdx++;
        }
    }, 350);
    setTimeout(function() { clearInterval(iv); msgObs.disconnect(); }, 90000);
})();
"""

# Grid Lock — read equation and find answer in grid
JS_GRIDLOCK = """
(function autoGridLock() {
    var iv = setInterval(function() {
        var target = document.querySelector('#gl-target, [id*="target"]');
        if (!target) return;
        var eq = target.textContent.replace(/[×x]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/= ?\\?/,'').trim();
        var answer = null;
        try { answer = eval(eq); } catch(e) {}
        var grid = document.querySelector('#gl-grid, [id*="gl"]');
        if (!grid) return;
        var btns = Array.from(grid.querySelectorAll('button:not([disabled]):not(.correct)'));
        var hit = false;
        if (answer !== null) {
            btns.forEach(function(b) {
                if (!hit && parseFloat(b.textContent.trim()) === answer) { b.click(); hit = true; }
            });
        }
        if (!hit && btns.length > 0) btns[0].click();
    }, 400);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Tunnel Dodge — click left/right buttons rapidly and randomly to dodge
JS_TUNNELDODGE = """
(function autoTunnel() {
    var btns = document.querySelectorAll('#td-l, #td-r');
    if (btns.length < 2) return;
    var iv = setInterval(function() {
        // Randomly dodge left or right
        btns[Math.random() > 0.5 ? 0 : 1].click();
    }, 400);
    setTimeout(function() { clearInterval(iv); }, 50000);
})();
"""

# Color Match — select and match color pairs
JS_COLORMATCH = """
(function autoColorMatch() {
    var selected = null;
    var iv = setInterval(function() {
        var grid = document.querySelector('#cm-grid');
        if (!grid) return;
        var cells = Array.from(grid.children).filter(function(c){
            return c.style.background && c.style.background !== 'transparent' && !c.style.background.includes('transparent');
        });
        if (cells.length === 0) { clearInterval(iv); return; }

        if (!selected) {
            // Pick first available cell
            selected = cells[0];
            selected.click();
        } else {
            // Find a matching color cell
            var selColor = selected.style.background;
            var match = cells.find(function(c){ return c !== selected && c.style.background === selColor; });
            if (match) {
                match.click();
                selected = null;
            } else {
                // No match visible — click a different cell to try
                selected = cells.find(function(c){ return c !== selected; }) || null;
                if (selected) selected.click();
            }
        }
    }, 300);
    setTimeout(function() { clearInterval(iv); }, 65000);
})();
"""

# Tangram — drag pieces toward the target (approximate)
JS_TANGRAM = """
(function autoTangram() {
    // For tangram, we do random rotations and slight movements
    // A full auto-solve requires geometric computation beyond this scope
    var canvas = document.querySelector('#tg-c');
    if (!canvas) return;
    var cx = canvas.width/2, cy = canvas.height/2;

    function randomClick() {
        var x = cx + (Math.random()-0.5)*120;
        var y = cy + (Math.random()-0.5)*80;
        // Simulate dblclick to rotate pieces
        canvas.dispatchEvent(new MouseEvent('dblclick', {clientX: canvas.getBoundingClientRect().left+x, clientY: canvas.getBoundingClientRect().top+y, bubbles:true}));
    }
    var iv = setInterval(randomClick, 600);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Minesweeper — click all non-mine cells (use flood fill approach)
JS_MINESWEEPER = """
(function autoMines() {
    var iv = setInterval(function() {
        // Click the first unrevealed, unflagged button
        var btns = Array.from(document.querySelectorAll('#ms-grid button')).filter(function(b){
            return !b.disabled && b.textContent === '' && b.style.background !== 'rgb(68, 68, 68)';
        });
        // Prefer buttons that aren't in corners/edges (safer heuristic)
        var safe = btns.filter(function(b){ return b.style.background === '#555'; });
        var target = safe[0] || btns[0];
        if (target) target.click();
        else clearInterval(iv);
    }, 250);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Emoji Sort — click to sort into correct categories
JS_EMOJISORT = """
(function autoEmoji() {
    var iv = setInterval(function() {
        // Click any emoji item
        var items = document.querySelectorAll('.emoji-item:not(.placed), [class*="emoji"][class*="item"]:not(.placed)');
        if (items.length > 0) { items[0].click(); }
        else {
            // Try clicking category slots
            var slots = document.querySelectorAll('.category-slot, [class*="cat"]');
            if (slots.length > 0) slots[0].click();
            else clearInterval(iv);
        }
    }, 400);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Pattern Match — memorize and click the pattern
JS_PATTERNMATCH = """
(function autoPMatch() {
    var iv = setInterval(function() {
        // Click lit cells in the memorize phase, or reproduce in answer phase
        var cells = document.querySelectorAll('.pm-cell.active, [class*="pm"][class*="active"]');
        cells.forEach(function(c){ c.click(); });
        // Also try answer cells
        var answerCells = document.querySelectorAll('.pm-answer:not(.clicked), [class*="answer"]:not(.clicked)');
        if (answerCells.length > 0) answerCells[0].click();
    }, 300);
    setTimeout(function() { clearInterval(iv); }, 90000);
})();
"""

# Curling — drag/swipe to send stones to target
JS_CURLING = """
(function autoCurling() {
    var canvas = document.querySelector('#curl-canvas, canvas');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();

    function fakeSwipe() {
        var cx = rect.left + canvas.width * 0.5;
        var cy = rect.top  + canvas.height * 0.75;
        // mousedown → mousemove → mouseup to simulate throw
        canvas.dispatchEvent(new MouseEvent('mousedown', {clientX:cx, clientY:cy+50, bubbles:true}));
        setTimeout(function(){
            canvas.dispatchEvent(new MouseEvent('mousemove', {clientX:cx+(Math.random()-0.5)*30, clientY:cy, bubbles:true}));
        }, 50);
        setTimeout(function(){
            canvas.dispatchEvent(new MouseEvent('mouseup', {clientX:cx+(Math.random()-0.5)*30, clientY:cy-20, bubbles:true}));
        }, 150);
    }

    var iv = setInterval(fakeSwipe, 3000);
    setTimeout(function(){ clearInterval(iv); }, 40000);
})();
"""

# Jump Rope — click the JUMP button on the beat
JS_JUMPROPE = """
(function autoJump() {
    var btn = document.querySelector('#jr-btn');
    if (!btn) return;
    // Click roughly every 750ms (slightly before each beat prompt)
    var iv = setInterval(function() {
        btn.click();
    }, 750);
    setTimeout(function() { clearInterval(iv); }, 35000);
})();
"""

# Master dispatch: pick the right solver based on DOM
JS_AUTO_DETECT = """
(function dispatch() {
    // Memory Match
    if (document.querySelector('.mem-card')) { %s return; }
    // Quick Math
    if (document.querySelector('.qa-choice')) { %s return; }
    // Reaction
    if (document.querySelector('.reaction-btn, [id*="react"]')) { %s return; }
    // Number Hunt
    if (document.querySelector('.hunt-btn') && document.querySelector('#hunt-grid, #nh-grid')) { %s return; }
    // Tap Frenzy
    if (document.querySelector('[id*="tap"]')) { %s return; }
    // Fast Fingers
    if (document.querySelector('#ff-input, [id*="ff-input"]')) { %s return; }
    // Word Scramble
    if (document.querySelector('.word-answer-input')) { %s return; }
    // Color Sequence
    if (document.querySelector('.color-btn, [id*="cs-"]')) { %s return; }
    // Tessellations
    if (document.querySelector('[class*="tess"]')) { %s return; }
    // Speed Sort
    if (document.querySelector('#ss-grid, #ss-next')) { %s return; }
    // Find Bomb
    if (document.querySelector('#fb-grid')) { %s return; }
    // Math Race
    if (document.querySelector('#mr-choices')) { %s return; }
    // Simon Extreme
    if (document.querySelector('#se-btns')) { %s return; }
    // Grid Lock
    if (document.querySelector('#gl-grid')) { %s return; }
    // Tunnel Dodge
    if (document.querySelector('#td-c')) { %s return; }
    // Color Match
    if (document.querySelector('#cm-grid')) { %s return; }
    // Tangram
    if (document.querySelector('#tg-c')) { %s return; }
    // Minesweeper
    if (document.querySelector('#ms-grid')) { %s return; }
    // Emoji Sort
    if (document.querySelector('[class*="emoji"]')) { %s return; }
    // Pattern Match
    if (document.querySelector('[class*="pm-"]')) { %s return; }
    // Curling
    if (document.querySelector('#curl-canvas, #curling')) { %s return; }
    // Jump Rope
    if (document.querySelector('#jr-btn')) { %s return; }
})();
"""

def build_auto_solver():
    """Build the master JS puzzle dispatcher."""
    solvers = [
        JS_MEMORY, JS_QUICKMATH, JS_REACTION, JS_NUMBERHUNT,
        JS_TAPFRENZY, JS_FASTFINGERS, JS_WORDSCRAMBLE, JS_COLORSEQ,
        JS_TESSELLATIONS, JS_SPEEDSORT, JS_FINDBOMB, JS_MATHRACE,
        JS_SIMONEXTREME, JS_GRIDLOCK, JS_TUNNELDODGE, JS_COLORMATCH,
        JS_TANGRAM, JS_MINESWEEPER, JS_EMOJISORT, JS_PATTERNMATCH,
        JS_CURLING, JS_JUMPROPE,
    ]
    # Inline each solver into the dispatch chain
    result = """
(function dispatch() {
    if (document.querySelector('.mem-card')) { """ + JS_MEMORY + """ return; }
    if (document.querySelector('.qa-choice')) { """ + JS_QUICKMATH + """ return; }
    if (document.querySelector('.reaction-btn, [id*="react"]')) { """ + JS_REACTION + """ return; }
    if (document.querySelector('#nh-grid, #hunt-grid') && document.querySelector('.hunt-btn')) { """ + JS_NUMBERHUNT + """ return; }
    if (document.getElementById('tap-btn') || document.querySelector('[id*="tf-btn"]')) { """ + JS_TAPFRENZY + """ return; }
    if (document.getElementById('ff-input')) { """ + JS_FASTFINGERS + """ return; }
    if (document.querySelector('.word-answer-input')) { """ + JS_WORDSCRAMBLE + """ return; }
    if (document.querySelector('.color-btn')) { """ + JS_COLORSEQ + """ return; }
    if (document.querySelector('[class*="tess-cell"]')) { """ + JS_TESSELLATIONS + """ return; }
    if (document.getElementById('ss-next')) { """ + JS_SPEEDSORT + """ return; }
    if (document.getElementById('fb-grid')) { """ + JS_FINDBOMB + """ return; }
    if (document.getElementById('mr-choices')) { """ + JS_MATHRACE + """ return; }
    if (document.getElementById('se-btns')) { """ + JS_SIMONEXTREME + """ return; }
    if (document.getElementById('gl-grid')) { """ + JS_GRIDLOCK + """ return; }
    if (document.getElementById('td-c')) { """ + JS_TUNNELDODGE + """ return; }
    if (document.getElementById('cm-grid')) { """ + JS_COLORMATCH + """ return; }
    if (document.getElementById('tg-c')) { """ + JS_TANGRAM + """ return; }
    if (document.getElementById('ms-grid')) { """ + JS_MINESWEEPER + """ return; }
    if (document.querySelector('#jr-btn')) { """ + JS_JUMPROPE + """ return; }
    if (document.querySelector('#curl-canvas')) { """ + JS_CURLING + """ return; }
})();
"""
    return result

AUTO_SOLVER_JS = build_auto_solver()


# ══════════════════════════════════════════════════════════════
#  WINDOW MANAGER — positions 10 windows in a 5×2 grid
# ══════════════════════════════════════════════════════════════
def make_driver(idx):
    """Create a Chrome driver and position it on screen."""
    col = idx % COLS
    row = idx // COLS
    x   = col * WIN_W
    y   = row * WIN_H

    opts = Options()
    opts.add_argument(f"--window-size={WIN_W},{WIN_H}")
    opts.add_argument(f"--window-position={x},{y}")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--mute-audio")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--disable-infobars")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--log-level=3")
    opts.add_argument("--disable-background-timer-throttling")
    opts.add_argument("--disable-renderer-backgrounding")
    opts.add_experimental_option('excludeSwitches', ['enable-logging'])
    service = Service(ChromeDriverManager().install())
    driver  = webdriver.Chrome(service=service, options=opts)
    # Explicitly position the window after launch (some systems need this)
    driver.set_window_position(x, y)
    driver.set_window_size(WIN_W, WIN_H)
    return driver


def wait_for(driver, css, timeout=20):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, css))
    )

def wait_click(driver, css, timeout=20):
    el = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, css))
    )
    el.click()
    return el

def get_phase(driver):
    try:
        screens = driver.find_elements(By.CSS_SELECTOR, ".screen.active")
        return screens[0].get_attribute("id") if screens else None
    except:
        return None

def safe_js(driver, script, default=None):
    try:
        return driver.execute_script(script)
    except:
        return default

def get_scores_from_page(driver):
    """Read player scores from leaderboard if visible."""
    try:
        rows = driver.find_elements(By.CSS_SELECTOR, ".lb-row, .dr-row, .results-row")
        scores = {}
        for row in rows:
            cells = row.find_elements(By.CSS_SELECTOR, "td, .lb-name, .player-name")
            score_cells = row.find_elements(By.CSS_SELECTOR, ".lb-score, .score, td:nth-child(3)")
            if cells and score_cells:
                try:
                    scores[cells[0].text.strip()] = int(score_cells[0].text.strip().replace(',',''))
                except:
                    pass
        return scores
    except:
        return {}


# ══════════════════════════════════════════════════════════════
#  BOT PERSONALITIES — shape behavior
# ══════════════════════════════════════════════════════════════
CHAT_LINES = {
    "aggressive": [
        "I'm coming for the top spot. No alliances.",
        "You're all going home. One by one. 😈",
        "The arena is MY playground.",
        "First place, always. Deal with it.",
        "I don't lose. Especially not to you.",
    ],
    "saboteur": [
        "I've got an alliance. Don't worry about who. 👀",
        "Vote {target} — they're the biggest threat here.",
        "Trust nobody. That's the game.",
        "I already know who's going to the arena...",
        "Politics wins challenges. Remember that.",
    ],
    "analyst": [
        "Looking at the scores — {top} is the threat to watch.",
        "Statistically the top scorer should face the arena.",
        "I've played 47 challenges. Patterns don't lie.",
        "Strategy > speed in this game.",
        "The data says {target} is the weakest link right now.",
    ],
    "clutch": [
        "Don't count me out. I perform when it matters.",
        "Watch me in that arena. I'm built for pressure.",
        "I save my best for when it counts. 💪",
        "Send me in. I want the arena.",
        "I thrive under pressure. Bring it.",
    ],
    "balanced": [
        "Everyone's playing well — good game so far.",
        "Let's keep it competitive and fair.",
        "I'm just here to play the best game I can.",
        "Whoever earns it deserves the arena spot.",
        "No personal moves — just game moves.",
    ],
}

def get_chat_msg(personality, name, target=None, top=None):
    lines = CHAT_LINES.get(personality, CHAT_LINES["balanced"])
    msg = random.choice(lines)
    msg = msg.replace("{target}", target or "the top scorer")
    msg = msg.replace("{top}", top or "the leader")
    return msg


# ══════════════════════════════════════════════════════════════
#  AI BOT PLAYER
# ══════════════════════════════════════════════════════════════
def bot_player(idx, name, personality, is_host):
    driver = None
    try:
        coord.log(name, f"Opening window #{idx+1} at column {idx%COLS}, row {idx//COLS}")
        driver = make_driver(idx)
        driver.get(GAME_URL)
        time.sleep(2.5)

        # ── 1. Bypass auth screen (guest mode) ────────────────
        # Wait up to 15s for page to render any screen
        for _ in range(15):
            phase = get_phase(driver)
            if phase:
                break
            time.sleep(1)

        coord.log(name, f"Page loaded, phase: {phase}")

        if phase == "screen-auth" or not phase:
            coord.log(name, "Auth screen — clicking guest via JS")
            for attempt in range(10):
                try:
                    result = driver.execute_script("""
                        var btn = document.getElementById('btn-guest');
                        if (btn) { btn.click(); return 'clicked'; }
                        return 'not-found';
                    """)
                    coord.log(name, f"Guest btn: {result}")
                    if result == 'clicked':
                        break
                except Exception as e:
                    coord.log(name, f"JS click attempt {attempt}: {e}")
                time.sleep(1)

            # Wait for landing screen to become active
            for _ in range(10):
                time.sleep(0.8)
                phase = get_phase(driver)
                if phase == "screen-landing":
                    break
            coord.log(name, f"After guest: phase={phase}")

        # ── 2. Landing screen — enter name ────────────────────
        # Wait for landing screen to be active
        for _ in range(12):
            if get_phase(driver) == "screen-landing":
                break
            time.sleep(0.8)

        try:
            # Use JS to set the name value (avoids interactability issues)
            driver.execute_script(f"""
                var el = document.getElementById('landing-name');
                if (el) {{
                    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                    nativeSetter.set.call(el, {repr(name)});
                    el.dispatchEvent(new Event('input', {{bubbles: true}}));
                }}
            """)
            time.sleep(0.3)
            coord.log(name, f"Name set: {name}")
        except Exception as e:
            coord.log(name, f"Could not set name: {e}")
            return

        # ── 3. Host creates room; others wait for code ─────────
        if is_host:
            coord.log(name, "Creating room...")
            driver.execute_script("var b=document.getElementById('btn-create'); if(b) b.click();")
            time.sleep(2)
            # Read the room code from the DOM
            for attempt in range(15):
                code_el = driver.find_elements(By.CSS_SELECTOR, "#lobby-code")
                if code_el:
                    code = code_el[0].text.strip()
                    if len(code) >= 4:
                        coord.log(name, f"Room created! Code: {code}")
                        coord.set_room_code(code)
                        break
                time.sleep(1)
            else:
                coord.log(name, "Failed to read room code!")
                return
        else:
            # Wait for host to create the room and broadcast the code
            coord.log(name, "Waiting for room code from coordinator...")
            if not coord.code_ready.wait(timeout=40):
                coord.log(name, "Timed out waiting for room code!")
                return
            code = coord.room_code
            coord.log(name, f"Got room code: {code} — joining...")

            try:
                driver.execute_script(f"""
                    var el = document.getElementById('landing-code');
                    if (el) {{
                        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                        setter.set.call(el, '{code}');
                        el.dispatchEvent(new Event('input', {{bubbles: true}}));
                    }}
                """)
                time.sleep(0.3)
                driver.execute_script("var b=document.getElementById('btn-join'); if(b) b.click();")
                time.sleep(2)
                coord.log(name, "Joined lobby!")
            except Exception as e:
                coord.log(name, f"Failed to join: {e}")
                return

        # ── 4. Wait in lobby; host starts when full ────────────
        if is_host:
            coord.log(name, "Waiting for all players to join...")
            for _ in range(30):   # up to 30 seconds
                time.sleep(1)
                count_els = driver.find_elements(By.CSS_SELECTOR, ".lobby-player-card, .player-card")
                if len(count_els) >= min(10, len(BOTS)):
                    break
            time.sleep(3)  # short extra wait to let last players settle

            # Click start
            try:
                start_btn = driver.find_element(By.CSS_SELECTOR, "#btn-start")
                if start_btn.is_displayed():
                    start_btn.click()
                    coord.log(name, "GAME STARTED!")
                else:
                    coord.log(name, "Start button not visible (need 5+ players)")
            except Exception as e:
                coord.log(name, f"Could not click start: {e}")

        # ── 5. Main AI game loop ───────────────────────────────
        last_phase   = None
        solver_fired = False
        rounds_played = 0

        for tick in range(600):  # up to 600 ticks × ~1s = 10 minutes
            time.sleep(1)
            phase = get_phase(driver)
            if not phase:
                continue

            if phase != last_phase:
                coord.log(name, f"Phase → {phase}")
                last_phase    = phase
                solver_fired  = False

            # ─ Daily puzzle ────────────────────────────────────
            if phase == "screen-daily" and not solver_fired:
                coord.log(name, "Solving daily puzzle...")
                safe_js(driver, AUTO_SOLVER_JS)
                solver_fired = True
                rounds_played += 1

            # ─ Daily results — read scores ─────────────────────
            elif phase == "screen-daily-results":
                scores = get_scores_from_page(driver)
                for n, s in scores.items():
                    coord.update_scores(n, s)

            # ─ Discussion — send chat with personality flair ───
            elif phase == "screen-discussion" and not solver_fired:
                solver_fired = True
                time.sleep(random.uniform(2, 6))  # stagger chat timing
                target = coord.get_best_vote_target(name)
                top_player = max(coord.scores, key=coord.scores.get) if coord.scores else None
                try:
                    msg = get_chat_msg(personality, name, target=target, top=top_player)
                    chat = driver.find_element(By.CSS_SELECTOR, "#chat-input")
                    chat.clear()
                    chat.send_keys(msg)
                    chat.send_keys(Keys.RETURN)
                    coord.log(name, f'Chat: "{msg}"')
                except Exception as e:
                    coord.log(name, f"Chat failed: {e}")

            # ─ Voting — vote strategically ─────────────────────
            elif phase == "screen-voting" and not solver_fired:
                solver_fired = True
                time.sleep(random.uniform(1, 4))

                vote_target = coord.get_best_vote_target(name)
                try:
                    # Try to find the vote button for the strategic target
                    vote_btns = driver.find_elements(By.CSS_SELECTOR, ".vote-btn")
                    voted = False
                    if vote_target and vote_btns:
                        for btn in vote_btns:
                            if vote_target.lower() in btn.text.lower():
                                safe_js(driver, f"arguments[0].click()", btn)
                                coord.log(name, f"VOTED for {vote_target} (strategic)")
                                voted = True
                                break
                    if not voted and vote_btns:
                        pick = random.choice(vote_btns)
                        safe_js(driver, "arguments[0].click()", pick)
                        coord.log(name, "Voted (random fallback)")
                except Exception as e:
                    coord.log(name, f"Vote failed: {e}")

            # ─ Arena — fight hard ──────────────────────────────
            elif phase == "screen-arena" and not solver_fired:
                solver_fired = True
                # Check if we're one of the duelers or just watching
                watching = safe_js(driver, """
                    return document.querySelector('#arena-watch-overlay') !== null &&
                           window.getComputedStyle(document.querySelector('#arena-watch-overlay')).display !== 'none';
                """, False)

                if not watching:
                    coord.log(name, "IN THE ARENA — fighting with everything!")
                    safe_js(driver, AUTO_SOLVER_JS)
                    # Also try tap frenzy aggressively
                    safe_js(driver, JS_TAPFRENZY)
                    safe_js(driver, JS_NUMBERHUNT)
                else:
                    coord.log(name, "Watching the arena duel...")

            # ─ Elimination choice — always spectate ───────────
            elif phase == "screen-daily":
                modal = driver.find_elements(By.CSS_SELECTOR, "#elim-choice-modal")
                if modal and modal[0].is_displayed():
                    try:
                        driver.find_element(By.CSS_SELECTOR, "#btn-spectate").click()
                        coord.log(name, "ELIMINATED — chose to spectate")
                        coord.eliminated.append(name)
                    except:
                        pass

            # ─ Game over ───────────────────────────────────────
            elif phase == "screen-game-over":
                try:
                    winner = driver.find_element(By.CSS_SELECTOR, "#go-winner").text.strip()
                    coord.log(name, f"GAME OVER — Winner: {winner} {'🏆 THATS ME!' if winner == name else ''}")
                except:
                    coord.log(name, "GAME OVER!")
                break

            # Handle elimination modal (may appear on any screen)
            try:
                modal = driver.find_element(By.CSS_SELECTOR, "#elim-choice-modal")
                if modal.is_displayed():
                    driver.find_element(By.CSS_SELECTOR, "#btn-spectate").click()
                    coord.log(name, "ELIMINATED — spectating")
                    coord.eliminated.append(name)
            except:
                pass

        coord.log(name, f"Bot done. Rounds played: {rounds_played}")
        time.sleep(8)  # keep window open to view results

    except Exception as e:
        coord.log(name, f"FATAL ERROR: {e}")
        if "--debug" in __import__('sys').argv:
            traceback.print_exc()
    finally:
        if driver:
            try:
                time.sleep(12)  # Stay visible after game ends
                driver.quit()
            except:
                pass


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    sep = "=" * 56
    print()
    print(sep)
    print("   CHALLENGE.IO  --  AI BATTLE TEST (10 Bots)")
    print(sep)
    print("  URL:    ", GAME_URL)
    print("  Screen: ", str(SCREEN_W) + "x" + str(SCREEN_H),
          "  Grid:", str(COLS) + "x" + str(ROWS),
          "  Win:", str(WIN_W) + "x" + str(WIN_H))
    print("-" * 56)
    print("  BOTS:")
    for i, (bname, bpers) in enumerate(BOTS):
        role = "HOST" if i == 0 else "    "
        print(f"  {i+1:2}. [{role}] {bname:<18} [{bpers}]")
    print(sep)
    print()

    threads = []
    for idx, (bname, bpers) in enumerate(BOTS):
        is_host = (idx == 0)
        t = threading.Thread(
            target=bot_player,
            args=(idx, bname, bpers, is_host),
            name=f"Bot-{bname}",
            daemon=True,
        )
        threads.append(t)

    # Start host first, then stagger the others
    threads[0].start()
    time.sleep(4)  # Give host time to open and reach landing screen

    for t in threads[1:]:
        t.start()
        time.sleep(1.2)  # Stagger launches to avoid Chrome profile conflicts

    print(f"\nAll {len(BOTS)} AI bots launched. Watching them play...\n")

    # Wait for all bots to finish (max 12 minutes)
    for t in threads:
        t.join(timeout=720)

    print()
    print("=" * 46)
    print("  AI BATTLE TEST COMPLETE")
    print("=" * 46)
