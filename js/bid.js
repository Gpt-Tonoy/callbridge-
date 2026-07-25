/* =========================================================
   bid.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/bid.js"></script>
   Must load AFTER player.js and ai.js.

   This file contains ONLY bidding-related rules and validation
   logic for Call Bridge:
     - valid bid range checking (1-13)
     - collecting bids from all 4 players
     - checking whether bidding is complete
     - basic helper queries about bids (highest bidder, totals)

   This file does NOT contain:
     - UI code / DOM manipulation
     - AI hand-strength calculation (that's in ai.js)
     - Score calculation rules (that's in score.js)
     - Game flow control / turn order (that's in game.js)
   ========================================================= */


/* =========================================================
   CONSTANTS
   ---------------------------------------------------------
   MIN_BID / MAX_BID: the legal range for any single bid in
   Call Bridge. A round has exactly 13 tricks, so no player
   can bid less than 1 or more than 13.
   ========================================================= */
const MIN_BID = 1;
const MAX_BID = 13;


/* =========================================================
   CLASS: BidManager
   ---------------------------------------------------------
   Manages the bidding phase for a single round. Tracks which
   of the 4 players have bid, validates each bid against the
   legal range, and provides helper queries once bidding is
   complete.

   This class does NOT decide what a human or AI should bid —
   it only validates and records bids that are handed to it.
   (Human bid choice comes from ui.js; AI bid choice comes from
   AIPlayer.makeAIBid() in ai.js.)
   ========================================================= */
class BidManager {
  /**
   * Creates a new BidManager for a round.
   * @param {Player[]} players - Array of exactly 4 Player (or
   *                              AIPlayer) instances taking part
   *                              in this round's bidding.
   */
  constructor(players) {
    // The 4 players participating in this round's bidding.
    this.players = players;

    // Tracks the order in which players must bid this round
    // (e.g. starting from the player left of the dealer).
    // Stored as an array of player ids.
    this.biddingOrder = players.map((p) => p.id);

    // Index into biddingOrder indicating whose turn it is to bid.
    this.currentBidderIndex = 0;
  }

  /**
   * Checks whether a given bid value is within the legal range
   * for Call Bridge (1 to 13 inclusive).
   * @param {number} value - The bid value to validate.
   * @returns {boolean} True if the bid is a valid integer within range.
   */
  isValidBid(value) {
    return (
      Number.isInteger(value) &&
      value >= MIN_BID &&
      value <= MAX_BID
    );
  }

  /**
   * Sets the bidding order for this round (e.g. starting from the
   * player seated to the left of the current dealer). Resets the
   * current bidder pointer back to the start of the new order.
   * @param {string[]} orderedIds - Array of player ids in the
   *                                  order they should bid.
   */
  setBiddingOrder(orderedIds) {
    this.biddingOrder = orderedIds;
    this.currentBidderIndex = 0;
  }

  /**
   * Returns the Player (or AIPlayer) instance whose turn it is to
   * bid next, based on the current bidding order and index.
   * @returns {Player|null} The next player to bid, or null if
   *                          bidding has already finished.
   */
  getCurrentBidder() {
    if (this.currentBidderIndex >= this.biddingOrder.length) {
      return null;
    }

    const currentId = this.biddingOrder[this.currentBidderIndex];
    return this.players.find((p) => p.id === currentId) || null;
  }

  /**
   * Records a bid for the given player, provided the bid is legal.
   * Uses the player's own makeBid() method (inherited from Player)
   * to actually store the value on the player object. Advances the
   * bidding order to the next player afterward.
   * @param {Player} player - The player placing the bid.
   * @param {number} value - The bid value being placed.
   * @returns {boolean} True if the bid was accepted, false if it
   *                     was rejected as invalid.
   */
  placeBid(player, value) {
    // Reject bids outside the legal 1-13 range.
    if (!this.isValidBid(value)) {
      return false;
    }

    // Store the bid on the player object itself.
    player.makeBid(value);

    // Move on to the next bidder in the order, if this player
    // was indeed the current bidder.
    const currentId = this.biddingOrder[this.currentBidderIndex];
    if (currentId === player.id) {
      this.currentBidderIndex += 1;
    }

    return true;
  }

  /**
   * Checks whether every player in this round has placed a bid.
   * A player is considered to have bid once their `.bid` property
   * is no longer null (see Player.resetRound(), which sets bid
   * back to null at the start of each round).
   * @returns {boolean} True if all 4 players have placed a bid.
   */
  isBiddingComplete() {
    return this.players.every((p) => p.bid !== null && p.bid !== undefined);
  }

  /**
   * Returns the total of all bids placed so far across all players
   * who have already bid. Useful for UI display or for rules that
   * depend on the running total (e.g. informational "total bids so
   * far" display).
   * @returns {number} Sum of all currently placed bids.
   */
  getTotalBids() {
    return this.players.reduce((sum, p) => sum + (p.bid || 0), 0);
  }

  /**
   * Finds and returns the player who placed the highest bid this
   * round. If multiple players tie for the highest bid, the first
   * one found (in player array order) is returned.
   * @returns {Player|null} The highest bidder, or null if no bids
   *                          have been placed yet.
   */
  getHighestBidder() {
    let highest = null;

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.bid === null || player.bid === undefined) {
        continue;
      }
      if (!highest || player.bid > highest.bid) {
        highest = player;
      }
    }

    return highest;
  }

  /**
   * Resets the bidding manager for a brand new round: clears every
   * player's stored bid (via their own resetRound-style bid clear)
   * and resets the current bidder pointer back to the start of the
   * bidding order. Note: this only clears bids, not hands/tricks —
   * full round resets are handled by each Player's resetRound().
   */
  resetBidding() {
    // Clear each player's bid value directly, without touching
    // their hand/tricks/score (those are reset separately by
    // Player.resetRound() as part of the new round setup).
    this.players.forEach((p) => {
      p.bid = null;
    });

    this.currentBidderIndex = 0;
  }
}

window.BidManager = BidManager;
window.MIN_BID = MIN_BID;
window.MAX_BID = MAX_BID;
