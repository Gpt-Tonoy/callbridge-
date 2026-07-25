/* =========================================================
   player.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/player.js"></script>

   This file defines the Player class used to represent each
   of the 4 participants in the Call Bridge game (both the
   human player and the 3 AI players).

   This file contains ONLY player data + basic player-related
   utility methods (hand management, bid storage, tricks,
   score storage, round reset).

   It does NOT contain:
     - UI code / DOM manipulation
     - AI decision-making logic
     - Bidding validation rules
     - Scoring calculation rules
     - Trick-winner determination logic
   Those belong in ui.js, ai.js, bid.js, score.js, and game.js.
   ========================================================= */


/* =========================================================
   CLASS: Player
   ---------------------------------------------------------
   Represents a single player at the table (human or AI).

   Properties:
     - id          : unique identifier for this player (e.g. "me", "uncle")
     - name        : display name shown in the UI
     - type        : "human" or "ai"
     - hand        : array of Card objects currently held by the player
     - bid         : the number of tricks this player bid this round (or null)
     - tricksWon   : number of tricks won so far in the current round
     - roundScore  : the score earned in the current/most recent round
     - totalScore  : cumulative score across the whole game
     - isDealer    : boolean flag, true if this player is the current dealer
   ========================================================= */
class Player {
  /**
   * Creates a new Player instance.
   * @param {string} id - Unique identifier for this player (e.g. "me").
   * @param {string} name - Display name for this player (e.g. "Uncle").
   * @param {string} type - Either "human" or "ai".
   */
  constructor(id, name, type) {
    // Unique identifier used internally to reference this player
    // (matches seat ids used elsewhere in the game, e.g. "me", "uncle").
    this.id = id;

    // Display name shown in the UI (can be changed, e.g. custom human name).
    this.name = name;

    // Player type: "human" for the person playing, "ai" for computer players.
    this.type = type;

    // The cards currently held by this player. Populated by Deck.deal().
    this.hand = [];

    // The number of tricks this player bid for the current round.
    // null means "no bid placed yet" for this round.
    this.bid = null;

    // How many tricks this player has won so far in the current round.
    this.tricksWon = 0;

    // The score this player earned in the current/most recent round.
    this.roundScore = 0;

    // The player's cumulative total score across the entire game.
    this.totalScore = 0;

    // Whether this player is the current dealer. Used by game.js to
    // determine deal order and turn order; defaults to false.
    this.isDealer = false;
  }

  /**
   * Adds a single card to this player's hand.
   * @param {Card} card - The card object to add (from deck.js).
   */
  addCard(card) {
    this.hand.push(card);
  }

  /**
   * Removes a specific card from this player's hand, typically
   * after the player plays that card into a trick.
   * Matches cards by their unique `id` property (set in deck.js),
   * so the exact same card instance is removed.
   * @param {Card} card - The card object to remove from the hand.
   * @returns {Card|null} The removed card, or null if it wasn't found.
   */
  removeCard(card) {
    // Find the position of the matching card in the hand array.
    const index = this.hand.findIndex((c) => c.id === card.id);

    // If the card isn't in the hand, there's nothing to remove.
    if (index === -1) {
      return null;
    }

    // Remove exactly one element at the found index and return it.
    const [removedCard] = this.hand.splice(index, 1);
    return removedCard;
  }

  /**
   * Sorts this player's hand in place using the same suit/rank
   * ordering rules defined in deck.js (Deck.sortHand).
   *
   * Made "safe" on purpose: this file must not crash even if
   * deck.js has not been loaded yet, or if Deck.sortHand is
   * missing for some reason. In that case we simply leave the
   * hand order unchanged instead of throwing an error.
   */
  sortHand() {
    // Only attempt to use Deck.sortHand if the global Deck class
    // exists AND it actually has a sortHand function defined.
    if (typeof Deck !== "undefined" && typeof Deck.sortHand === "function") {
      // Deck.sortHand() returns a new sorted array without mutating
      // the array passed to it, so we reassign the sorted result back
      // onto this.hand to update the player's hand order.
      this.hand = Deck.sortHand(this.hand);
    }
    // If Deck.sortHand isn't available, do nothing (fail safely)
    // rather than crashing the whole game.
  }

  /**
   * Stores this player's bid for the current round.
   * @param {number} value - The number of tricks the player is betting
   *                          they will win this round.
   */
  makeBid(value) {
    this.bid = value;
  }

  /**
   * Resets all round-specific data for this player, ready for a new
   * round to begin. Does NOT reset totalScore, since that must persist
   * across the whole game.
   */
  resetRound() {
    // Clear the hand completely; new cards will be dealt for the new round.
    this.hand = [];

    // Clear the previous round's bid so a new bid must be placed.
    this.bid = null;

    // Reset tricks won back to zero for the new round.
    this.tricksWon = 0;

    // Reset this round's score; it will be recalculated once the
    // round finishes (handled by score.js).
    this.roundScore = 0;
  }

  /**
   * Increments this player's trick count by 1. Called whenever this
   * player wins a trick during a round.
   */
  winTrick() {
    this.tricksWon += 1;
  }

  /**
   * Returns this player's current hand of cards.
   * @returns {Card[]} The array of Card objects in the player's hand.
   */
  getHand() {
    return this.hand;
  }

  /**
   * Returns this player's current total score (cumulative across
   * the whole game, not just the current round).
   * @returns {number} The player's total score.
   */
  getScore() {
    return this.totalScore;
  }

  /**
   * Records the score earned for the round that just finished, and
   * adds it onto the player's running total score for the game.
   * The actual point calculation (bid success/failure, bonuses,
   * penalties, etc.) is handled elsewhere, in score.js — this method
   * simply stores the already-calculated result.
   * @param {number} points - The points earned/lost this round.
   */
  addScore(points) {
    // Store this round's score for display (e.g. in the round summary).
    this.roundScore = points;

    // Add this round's points onto the player's cumulative total score.
    this.totalScore += points;
  }

  /**
   * Checks whether this player still has any cards left in hand.
   * Useful for game.js to determine when a round should end
   * (i.e. once all players have played all their cards).
   * @returns {boolean} True if the player has at least one card.
   */
  hasCards() {
    return this.hand.length > 0;
  }

  /**
   * Returns how many cards are currently in this player's hand.
   * Useful for UI display and for validating game state.
   * @returns {number} The number of cards in hand.
   */
  getHandCount() {
    return this.hand.length;
  }

  /**
   * Removes all cards from this player's hand only, without touching
   * any other player data (bid, tricksWon, scores, etc.). Useful when
   * only the hand needs to be emptied without a full round reset.
   */
  clearHand() {
    this.hand = [];
  }

  /**
   * Completely resets this player back to their initial state, as if
   * they were just created — including wiping totalScore. Intended
   * for starting a brand new game from scratch (not just a new round).
   */
  resetGame() {
    // Empty the hand completely.
    this.hand = [];

    // Clear any existing bid.
    this.bid = null;

    // Reset tricks won for the round.
    this.tricksWon = 0;

    // Reset the most recent round's score.
    this.roundScore = 0;

    // Reset the cumulative total score back to zero for a fresh game.
    this.totalScore = 0;

    // This player is no longer marked as dealer until reassigned.
    this.isDealer = false;
  }
}

window.Player = Player;
