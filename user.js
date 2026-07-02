'use strict';

const crypto = require('crypto');

function genId()    { return crypto.randomBytes(10).toString('hex'); }
function hashPw(pw) { return crypto.createHash('sha256').update(pw + 'cio_s4lt_2024').digest('hex'); }

class User {
  constructor({ userId, name, email, passwordHash, wins, totalGames, totalPoints, highScores, winStreak, bestStreak, createdAt }) {
    this.userId       = userId;
    this.name         = name;
    this.email        = email;
    this.passwordHash = passwordHash;
    this.wins         = wins        || 0;
    this.totalGames   = totalGames  || 0;
    this.totalPoints  = totalPoints || 0;
    this.highScores   = highScores  || {};  // { [gameType]: bestScore }
    this.winStreak    = winStreak   || 0;
    this.bestStreak   = bestStreak  || 0;
    this.createdAt    = createdAt   || new Date().toISOString();
  }

  // ── Factory: new registration ─────────────────────────────
  static create(name, email, password) {
    return new User({
      userId:       genId(),
      name:         name.trim().slice(0, 20),
      email:        email.toLowerCase().trim(),
      passwordHash: hashPw(password),
    });
  }

  // ── Factory: load from DB row ────────────────────────────
  static fromDB(userId, data) {
    return new User({ userId, ...data });
  }

  // ── Auth ──────────────────────────────────────────────────
  checkPassword(password) {
    return this.passwordHash === hashPw(password);
  }

  // ── Game stats ────────────────────────────────────────────
  recordWin()  { this.wins++; this.winStreak++; if (this.winStreak > this.bestStreak) this.bestStreak = this.winStreak; }
  recordGame() { this.totalGames++; }

  resetStreak() { this.winStreak = 0; }

  recordPoints(pts) {
    if (pts > 0) this.totalPoints += pts;
  }

  // Returns true if this is a new personal best for the game
  recordHighScore(gameType, score) {
    if (score > (this.highScores[gameType] || 0)) {
      this.highScores[gameType] = score;
      return true;
    }
    return false;
  }

  // ── Serialization ─────────────────────────────────────────
  // Full record written to users.json (includes passwordHash)
  toDB() {
    return {
      name:         this.name,
      email:        this.email,
      passwordHash: this.passwordHash,
      wins:         this.wins,
      totalGames:   this.totalGames,
      totalPoints:  this.totalPoints,
      highScores:   this.highScores,
      winStreak:    this.winStreak,
      bestStreak:   this.bestStreak,
      createdAt:    this.createdAt,
    };
  }

  // Safe payload sent to the client (no passwordHash)
  toPublic() {
    return {
      userId:      this.userId,
      name:        this.name,
      wins:        this.wins,
      totalGames:  this.totalGames,
      totalPoints: this.totalPoints,
      highScores:  this.highScores,
      winStreak:   this.winStreak,
      bestStreak:  this.bestStreak,
    };
  }
}

module.exports = User;
