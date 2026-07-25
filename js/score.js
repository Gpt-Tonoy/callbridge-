/* =========================================================
   score.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/score.js"></script>
   Must load AFTER player.js, ai.js, and bid.js.

   This file contains ONLY score calculation rules for
   Call Bridge:
     - calculating a single player's round score from their
       bid vs. tricks won
     - applying that score to a player (via addScore())
     - calculating scores for all 4 players at once
     - checking whether any player has reached the target score

   Standard Call Bridge scoring rules used here:
     - If tricksWon >= bid (bid made or exceeded):
         base score = bid * 10
         + 0.1 points per extra trick won beyond the bid (bonus)
     - If tricksWon < bid (bid failed):
         score = -(bid * 10)   (full bid value lost as penalty)

   This file does NOT contain:
     - UI code / DOM manipulation
     - Bidding validation rules (that's in bid.js)
     - AI decision-making logic (that's in ai.js)
     - Game flow control / turn order (that's in game.js)
   ========================================================= */


/* =========================================================
   CLASS: ScoreManager
   ---------------------------------------------------------
   Calculates and applies round scores for all 4 players based
   on standard Call Bridge scoring rules, and checks progress
   toward the game's target score.
   ========================================================= */
class ScoreManager {
  /**
   * Creates a new ScoreManager.
   * @param {number} targetScore - The score a player must reach
   *                                 to win the game (e.g. 50/100/150,
   *                                 or any custom value chosen by
   *                                 the user).
   */
  constructor(targetScore) {
    // The winning target score selected for this game.
    this.targetScore = targetScore;
  }

  /**
   * Calculates the round score for a single player based on their
   * bid and the number of tricks they actually won this round.
   *
   * Scoring rules:
   *   - Bid made exactly or exceeded (tricksWon >= bid):
   *       base = bid * 10
   *       bonus = 0.1 for each trick won beyond the bid
   *       total = base + bonus
   *   - Bid failed (tricksWon < bid):
   *       total = -(bid * 10)
   *
   * @param {Player} player - The player to calculate a score for.
   *                            Uses player.bid and player.tricksWon.
   * @returns {number} The calculated round score for this player.
   */
  calculateRoundScore(player) {
    const bid = player.bid;
    const tricksWon = player.tricksWon;

    // Safety fallback: if no bid was placed (shouldn't normally
    // happen once bidding is complete), treat as zero score.
    if (bid === null || bid === undefined) {
      return 0;
    }

    if (tricksWon >= bid) {
      // Bid successfully made: base points for the bid itself,
      // plus a small bonus for every extra trick won beyond the bid.
      const base = bid * 10;
      const extraTricks = tricksWon - bid;
      const bonus = extraTricks * 0.1;
      return base + bonus;
    }

    // Bid failed: player loses points equal to their full bid value.
    return -(bid * 10);
  }

  /**
   * Calculates and applies the round score for a single player,
   * storing it via the player's own addScore() method (which sets
   * roundScore and adds it onto totalScore).
   * @param {Player} player - The player to score.
   * @returns {number} The round score that was applied.
   */
  applyRoundScore(player) {
    const roundScore = this.calculateRoundScore(player);
    player.addScore(roundScore);
    return roundScore;
  }

  /**
   * Calculates and applies round scores for all 4 players at once,
   * typically called at the end of a round once all 13 tricks have
   * been played.
   * @param {Player[]} players - Array of all 4 players in the game.
   * @returns {Object} A map of player id -> round score applied,
   *                    useful for building a round summary display.
   */
  applyRoundScores(players) {
    const results = {};

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      results[player.id] = this.applyRoundScore(player);
    }

    return results;
  }

  /**
   * Checks whether the given player has reached or exceeded the
   * target score for the game, meaning they have won.
   * @param {Player} player - The player to check.
   * @returns {boolean} True if this player's totalScore has reached
   *                     the target score.
   */
  hasReachedTarget(player) {
    return player.totalScore >= this.targetScore;
  }

  /**
   * Checks all 4 players and returns whichever player (if any) has
   * reached the target score. If more than one player reaches the
   * target in the same round, the player with the highest total
   * score is considered the winner; ties are broken by whoever
   * appears first in the players array.
   * @param {Player[]} players - Array of all 4 players in the game.
   * @returns {Player|null} The winning player, or null if no one
   *                          has reached the target score yet.
   */
  getGameWinner(players) {
    let winner = null;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!this.hasReachedTarget(player)) {
        continue;
      }
      if (!winner || player.totalScore > winner.totalScore) {
        winner = player;
      }
    }

    return winner;
  }

  /**
   * Returns all 4 players sorted from highest to lowest total score.
   * Useful for building the scoreboard / game-over ranking display.
   * @param {Player[]} players - Array of all 4 players in the game.
   * @returns {Player[]} A new array of players sorted by totalScore
   *                      descending (does not mutate the input array).
   */
  getRankedPlayers(players) {
    return players.slice().sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Updates the target score for the game (e.g. if the user changes
   * the target score selector before dealing).
   * @param {number} newTarget - The new target score to use.
   */
  setTargetScore(newTarget) {
    this.targetScore = newTarget;
  }
}

window.ScoreManager = ScoreManager;
