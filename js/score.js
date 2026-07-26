/* =========================================================
   score.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/score.js"></script>
   Must load AFTER player.js, ai.js, and bid.js.

   Scoring rules used here (updated):
     - If tricksWon >= bid (bid made or exceeded):
         base score = bid * 1   (1 point per trick bid, not 10)
         + 0.1 points per extra trick won beyond the bid (bonus)
     - If tricksWon < bid (bid failed):
         score = -(bid * 1)   (full bid value lost as penalty)
   ========================================================= */

class ScoreManager {
  constructor(targetScore) {
    this.targetScore = targetScore;
  }

  calculateRoundScore(player) {
    const bid = player.bid;
    const tricksWon = player.tricksWon;

    if (bid === null || bid === undefined) {
      return 0;
    }

    if (tricksWon >= bid) {
      // 1 point per trick bid (changed from *10 to *1).
      const base = bid * 1;
      const extraTricks = tricksWon - bid;
      const bonus = extraTricks * 0.1;
      return base + bonus;
    }

    // Bid failed: lose points equal to the bid value.
    return -(bid * 1);
  }

  applyRoundScore(player) {
    const roundScore = this.calculateRoundScore(player);
    player.addScore(roundScore);
    return roundScore;
  }

  applyRoundScores(players) {
    const results = {};
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      results[player.id] = this.applyRoundScore(player);
    }
    return results;
  }

  hasReachedTarget(player) {
    return player.totalScore >= this.targetScore;
  }

  getGameWinner(players) {
    let winner = null;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!this.hasReachedTarget(player)) continue;
      if (!winner || player.totalScore > winner.totalScore) {
        winner = player;
      }
    }
    return winner;
  }

  getRankedPlayers(players) {
    return players.slice().sort((a, b) => b.totalScore - a.totalScore);
  }

  setTargetScore(newTarget) {
    this.targetScore = newTarget;
  }
}

window.ScoreManager = ScoreManager;
