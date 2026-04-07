"""
The Challenge Game - Selenium Test
Opens 10 browser windows, joins all players to room ALEBV6,
starts the game, and auto-plays through puzzles.
"""

import time
import random
import threading
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ── CONFIG ─────────────────────────────────────────────────
GAME_URL  = "https://talented-benevolence-production-5242.up.railway.app"
ROOM_CODE = "Z5B29B"
PLAYERS   = [
    "TJ Lavin",   "CT",        "Johnny Bananas", "Wes",
    "Cara Maria",  "Laurel",    "Derrick",        "Aneesa",
    "Evelyn",      "Kenny"
]
# ──────────────────────────────────────────────────────────

def make_driver(headless=False):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=480,700")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--mute-audio")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--log-level=3")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)

def wait_for(driver, css, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, css))
    )

def wait_click(driver, css, timeout=15):
    el = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, css))
    )
    el.click()
    return el

def get_phase(driver):
    try:
        screens = driver.find_elements(By.CSS_SELECTOR, ".screen.active")
        if screens:
            return screens[0].get_attribute("id")
    except:
        pass
    return None

def auto_play_puzzle(driver, name):
    """Auto-solve whatever puzzle is on screen"""
    phase = get_phase(driver)
    print(f"  [{name}] Phase: {phase}")

    try:
        # Memory match - click all cards
        cards = driver.find_elements(By.CSS_SELECTOR, ".mem-card:not(.matched)")
        if cards:
            print(f"  [{name}] Playing Memory Match")
            for i in range(0, min(len(cards), 12), 2):
                try:
                    driver.execute_script("arguments[0].click()", cards[i])
                    time.sleep(0.4)
                    if i+1 < len(cards):
                        driver.execute_script("arguments[0].click()", cards[i+1])
                    time.sleep(0.8)
                    # re-fetch since DOM changes
                    cards = driver.find_elements(By.CSS_SELECTOR, ".mem-card:not(.matched)")
                except: pass
            return

        # Quick math / trivia - click first choice
        choices = driver.find_elements(By.CSS_SELECTOR, ".qa-choice:not([disabled])")
        if choices:
            print(f"  [{name}] Playing Math/Trivia")
            while True:
                choices = driver.find_elements(By.CSS_SELECTOR, ".qa-choice:not([disabled])")
                if not choices: break
                try:
                    driver.execute_script("arguments[0].click()", choices[0])
                    time.sleep(0.5)
                except: break
            return

        # Reaction test - click the zone repeatedly
        zone = driver.find_elements(By.CSS_SELECTOR, ".reaction-zone")
        if zone:
            print(f"  [{name}] Playing Reaction Test")
            for _ in range(10):
                try:
                    z = driver.find_element(By.CSS_SELECTOR, ".reaction-zone")
                    driver.execute_script("arguments[0].click()", z)
                    time.sleep(0.7)
                    done = driver.find_elements(By.CSS_SELECTOR, "#puzzle-done-overlay[style*='flex'], #arena-done-overlay[style*='flex']")
                    if done: break
                except: break
            return

        # Word scramble - type the hint text or just submit blank
        word_input = driver.find_elements(By.CSS_SELECTOR, ".word-answer-input:not([disabled])")
        if word_input:
            print(f"  [{name}] Playing Word Scramble")
            while True:
                inputs = driver.find_elements(By.CSS_SELECTOR, ".word-answer-input:not([disabled])")
                if not inputs: break
                try:
                    # Get the scrambled word and try unscrambling (just type something)
                    scrambled = driver.find_element(By.CSS_SELECTOR, ".word-scrambled").text.strip()
                    inputs[0].clear()
                    inputs[0].send_keys(scrambled)  # wrong but moves to next
                    btn = driver.find_element(By.CSS_SELECTOR, "#wsubmit")
                    driver.execute_script("arguments[0].click()", btn)
                    time.sleep(1.0)
                except: break
            return

        # Color sequence - click buttons in order
        color_btns = driver.find_elements(By.CSS_SELECTOR, ".color-btn:not(.disabled)")
        if color_btns:
            print(f"  [{name}] Playing Color Sequence")
            for _ in range(20):
                try:
                    btns = driver.find_elements(By.CSS_SELECTOR, ".color-btn:not(.disabled)")
                    if not btns: break
                    driver.execute_script("arguments[0].click()", random.choice(btns))
                    time.sleep(0.4)
                    done = driver.find_elements(By.CSS_SELECTOR, "#puzzle-done-overlay[style*='flex'], #arena-done-overlay[style*='flex']")
                    if done: break
                except: break
            return

    except Exception as e:
        print(f"  [{name}] Puzzle error: {e}")

def player_thread(name, is_host, code):
    driver = None
    try:
        print(f"[{name}] Starting browser...")
        driver = make_driver(headless=False)
        driver.get(GAME_URL)
        time.sleep(2)

        # Enter name
        name_input = wait_for(driver, "#landing-name")
        name_input.clear()
        name_input.send_keys(name)
        time.sleep(0.3)

        # ALL players join the existing room
        code_input = wait_for(driver, "#landing-code")
        code_input.clear()
        code_input.send_keys(code)
        wait_click(driver, "#btn-join")
        time.sleep(2)
        print(f"[{name}] Joined lobby!")

        if is_host:
            # Wait for all others to join, then start if we have host privileges
            print(f"[{name}] Waiting for full lobby...")
            time.sleep(15)
            try:
                start_btn = driver.find_element(By.CSS_SELECTOR, "#btn-start")
                if start_btn.is_displayed():
                    start_btn.click()
                    print(f"[{name}] Started the game!")
                else:
                    print(f"[{name}] Not host - real host must start")
            except Exception as e:
                print(f"[{name}] Start button not found (not host): {e}")

        # ── Main game loop ──────────────────────────────────
        for round_num in range(1, 50):
            time.sleep(3)
            phase = get_phase(driver)
            if not phase:
                continue

            # Daily challenge
            if phase == "screen-daily":
                print(f"[{name}] Round {round_num} — Solving daily puzzle...")
                auto_play_puzzle(driver, name)
                # Wait for done overlay or phase change
                for _ in range(30):
                    time.sleep(1)
                    p = get_phase(driver)
                    if p != "screen-daily":
                        break

            # Discussion — send a chat message
            elif phase == "screen-discussion":
                try:
                    msgs = [
                        f"Send {random.choice([p for p in PLAYERS if p != name])} to the Arena!",
                        "Don't look at me I finished top 3 😤",
                        "We need to vote strategically here",
                        "I'm making an alliance with whoever keeps me safe 👀",
                        "The weak link has to go!",
                    ]
                    chat = driver.find_element(By.CSS_SELECTOR, "#chat-input")
                    chat.clear()
                    chat.send_keys(random.choice(msgs))
                    chat.send_keys(Keys.RETURN)
                    print(f"[{name}] Sent chat message")
                except: pass
                time.sleep(8)

            # Voting
            elif phase == "screen-voting":
                try:
                    vote_btns = driver.find_elements(By.CSS_SELECTOR, ".vote-btn")
                    if vote_btns:
                        pick = random.choice(vote_btns)
                        driver.execute_script("arguments[0].click()", pick)
                        print(f"[{name}] Voted!")
                except: pass
                time.sleep(8)

            # Arena — play if we're one of the duelers
            elif phase == "screen-arena":
                watch = driver.find_elements(By.CSS_SELECTOR, "#arena-watch-overlay[style*='flex']")
                if not watch:
                    print(f"[{name}] IN THE ARENA! Fighting...")
                    auto_play_puzzle(driver, name)
                    for _ in range(40):
                        time.sleep(1)
                        p = get_phase(driver)
                        if p != "screen-arena": break
                else:
                    print(f"[{name}] Watching the arena...")
                    time.sleep(15)

            # Game over
            elif phase == "screen-game-over":
                try:
                    winner = driver.find_element(By.CSS_SELECTOR, "#go-winner").text
                    print(f"[{name}] 🏆 GAME OVER! Winner: {winner}")
                except: pass
                break

            else:
                # Any other phase — just wait
                time.sleep(3)

        print(f"[{name}] Done!")
        time.sleep(10)

    except Exception as e:
        print(f"[{name}] ERROR: {e}")
    finally:
        if driver:
            try: driver.quit()
            except: pass

# ── MAIN ───────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  THE CHALLENGE — Selenium Test (10 Players)")
    print("=" * 55)
    print(f"  Game URL:  {GAME_URL}")
    print(f"  Room Code: {ROOM_CODE}")
    print("=" * 55)

    threads = []

    # Player 1 is host (uses CREATE, not JOIN)
    host_thread = threading.Thread(
        target=player_thread,
        args=(PLAYERS[0], True, ROOM_CODE),
        daemon=True
    )
    threads.append(host_thread)

    # Players 2-10 join with the code
    for i, name in enumerate(PLAYERS[1:], 1):
        t = threading.Thread(
            target=player_thread,
            args=(name, False, ROOM_CODE),
            daemon=True
        )
        threads.append(t)
        time.sleep(0.5)  # stagger launches slightly

    # Start all threads
    print("\nLaunching all 10 browsers...\n")
    for t in threads:
        t.start()
        time.sleep(0.8)

    # Wait for all to finish
    for t in threads:
        t.join(timeout=300)

    print("\nTest complete!")
