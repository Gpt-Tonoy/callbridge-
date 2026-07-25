/* =========================================================
   game.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/game.js"></script>
   Must load AFTER deck.js, player.js, ai.js, bid.js, score.js.

   This file contains the central GameManager class, which ties
   together all the other pieces (Deck, Player, AIPlayer,
   BidManager, ScoreManager) into the actual game flow for
   Call Bridge:
     - setting up a new game (players, target score)
     - dealing a new round
     - running the bidding phase
     - playing tricks (turn order, legal-play checking,
       trick-winner determination)
     - ending a round (scoring) and checking for a game winner

   Trump suit is permanently fixed to Spades, matching the rest
   of this project (deck.js, ai.js).

   This file does NOT contain:
     - UI code / DOM manipulation (that's ui.js)
     - Card/deck data structures (that's deck.js)
     - Player data (that's player.js)
     - AI decision-making (that's ai.js)
     - Bid validation rules (that's bid.js)
     - Score calculation rules (that's score.js)
   ========================================================= */


/* =========================================================
   CONSTANTS
   ---------------------------------------------------------
   TRUMP_SUIT: the permanent trump suit for Call Bridge.
   SEAT_ORDER: fixed clockwise seating order used for turn
   rotation, matching the table layout in index.html
   (Top = Uncle, Right = Sister, Bottom = Me, Left = Brother).
   Clockwise from Me: Me -> Sister -> Uncle -> Brother -> Me.
   ========================================================= */
const TRUMP_SUIT = "Spades";
const SEAT_ORDER = ["me", "sister", "uncle", "brother"];


/* =========================================================
   CLASS: GameManager
   ---------------------------------------------------------
   Central controller for a full game of Call Bridge. Owns the
   Deck, the 4 players (1 human + 3 AI), the BidManager, and
   the ScoreManager, and coordinates the round/trick flow.
   ========================================================= */
class GameManager {
  /**
   * Creates a new GameManager. Players are NOT created here —
   * call startNewGame() to set everything up.
   */
  constructor() {
    // The shared 52-card deck used for dealing each round.
    this.deck = new Deck();

    // The 4 players in the game: 1 human ("me") + 3 AI.
    this.players = [];

    // Manages bidding for the current round.
    this.bidManager = null;

    // Manages scoring and win-condition checks.
    this.scoreManager = null;

    // Current round number (starts at 1).
    this.roundNumber = 1;

    // Fixed trump suit for the whole game.
    this.trumpSuit = TRUMP_SUIT;

    // Id of the current dealer (rotates each round).
    this.dealerId = "me";

    // Cards currently played into the trick in progress.
    // Each entry: { playerId, card }
    this.currentTrick = [];

    // The suit that was led for the trick currently in progress.
    this.leadSuit = null;

    // Id of the player whose turn it currently is to play a card.
    this.currentTurnId = null;

    // Whether the game has been won (target score reached).
    this.isGameOver = false;

    // The winning player once the game ends, or null.
    this.gameWinner = null;
  }

  /**
   * Sets up a brand new game: creates the 4 players (human "me"
   * plus 3 AI players), creates the ScoreManager with the chosen
   * target score, resets round number, and deals the first round.
   * @param {number} targetScore - The score needed to win the game.
   */
  startNewGame(targetScore) {
    // Create the human player and the 3 AI players, matching the
    // fixed seat ids used throughout index.html and style.css.
    this.players = [
      new Player("me", "Me", "human"),
      new AIPlayer("uncle", "Uncle"),
      new AIPlayer("brother", "Brother"),
      new AIPlayer("sister", "Sister"),
    ];

    // Set up score tracking against the chosen target score.
    this.scoreManager = new ScoreManager(targetScore);

    // Set up bid tracking for the players.
    this.bidManager = new BidManager(this.players);

    // Reset game-level state for a fresh game.
    this.roundNumber = 1;
    this.dealerId = "me";
    this.isGameOver = false;
    this.gameWinner = null;

    // Deal the very first round.
    this.dealNewRound();
  }

  /**
   * Deals a brand new round: resets each player's round-specific
   * data, builds/shuffles a fresh deck, deals 13 cards to each
   * player, resets the bidding manager, and sets up the trick
   * state and turn order for the upcoming bidding/play phase.
   */
  dealNewRound() {
    // Clear round-specific data (hand, bid, tricksWon, roundScore)
    // for every player. totalScore is preserved across rounds.
    this.players.forEach((player) => player.resetRound());

    // Build a fresh 52-card deck and shuffle it fairly.
    this.deck.reset();

    // Deal 13 cards to each player (Deck.deal also auto-sorts hands).
    this.deck.deal(this.players);

    // Reset the bidding manager and set the bidding order to start
    // from the player seated to the left of the dealer (clockwise).
    this.bidManager.resetBidding();
    this.bidManager.setBiddingOrder(this._getOrderStartingAfter(this.dealerId));

    // Clear any in-progress trick state from the previous round.
    this.currentTrick = [];
    this.leadSuit = null;

    // The first player to act (bid, then later play) is the one
    // seated after the dealer.
    this.currentTurnId = this._getNextSeatId(this.dealerId);
  }

  /**
   * Records a bid for the given player via the BidManager, and
   * advances the turn to the next player in the bidding order if
   * bidding is not yet complete.
   * @param {string} playerId - The id of the player placing the bid.
   * @param {number} value - The bid value being placed.
   * @returns {boolean} True if the bid was accepted.
   */
  submitBid(playerId, value) {
    const player = this._getPlayer(playerId);
    if (!player) {
      return false;
    }

    const accepted = this.bidManager.placeBid(player, value);
    if (!accepted) {
      return false;
    }

    // Advance the turn pointer to the next bidder, or to the
    // first player to lead a card once bidding is complete.
    if (!this.bidManager.isBiddingComplete()) {
      const nextBidder = this.bidManager.getCurrentBidder();
      this.currentTurnId = nextBidder ? nextBidder.id : this.currentTurnId;
    } else {
      // Bidding is done — play starts with the player seated
      // after the dealer, same as bidding order start.
      this.currentTurnId = this._getNextSeatId(this.dealerId);
    }

    return true;
  }

  /**
   * Checks whether the bidding phase for this round is complete
   * (every player has placed a bid).
   * @returns {boolean} True if all 4 players have bid.
   */
  isBiddingComplete() {
    return this.bidManager.isBiddingComplete();
  }

  /**
   * Has the given AI player calculate and submit its own bid,
   * using AIPlayer.makeAIBid(). Only valid for AI-type players.
   * @param {string} playerId - The id of the AI player to bid.
   * @returns {number|null} The bid value chosen, or null if the
   *                          player isn't a valid AI player.
   */
  submitAIBid(playerId) {
    const player = this._getPlayer(playerId);
    if (!player || typeof player.makeAIBid !== "function") {
      return null;
    }

    const bidValue = player.makeAIBid();
    this.submitBid(playerId, bidValue);
    return bidValue;
  }

  /**
   * Determines which cards in a player's hand are legal to play
   * right now, given the current trick's lead suit (if any).
   * Standard Call Bridge rule: must follow the lead suit if the
   * player holds any cards of that suit; otherwise any card may
   * be played.
   * @param {string} playerId - The id of the player to check.
   * @returns {Card[]} Array of cards from the player's hand that
   *                    are currently legal to play.
   */
  getLegalCards(playerId) {
    const player = this._getPlayer(playerId);
    if (!player) {
      return [];
    }

    // If this player is leading the trick (no lead suit set yet),
    // every card in hand is legal.
    if (!this.leadSuit) {
      return player.hand.slice();
    }

    // Otherwise, the player must follow the lead suit if possible.
    const leadSuitCards = player.hand.filter((card) => card.suit === this.leadSuit);
    if (leadSuitCards.length > 0) {
      return leadSuitCards;
    }

    // Void in the lead suit — any card may be played.
    return player.hand.slice();
  }

  /**
   * Attempts to play the given card on behalf of the given player.
   * Validates that it is this player's turn and that the card is
   * legal to play, then removes it from their hand and adds it to
   * the current trick. If all 4 players have now played, resolves
   * the trick automatically.
   * @param {string} playerId - The id of the player playing a card.
   * @param {Card} card - The card being played.
   * @returns {boolean} True if the card was successfully played.
   */
  playCard(playerId, card) {
    // Only the player whose turn it currently is may play.
    if (this.currentTurnId !== playerId) {
      return false;
    }

    const player = this._getPlayer(playerId);
    if (!player) {
      return false;
    }

    // Validate the card is one of the currently legal cards.
    const legalCards = this.getLegalCards(playerId);
    const isLegal = legalCards.some((c) => c.id === card.id);
    if (!isLegal) {
      return false;
    }

    // Remove the card from the player's hand.
    const playedCard =
      typeof player.playCard === "function"
        ? player.playCard(card)
        : player.removeCard(card);

    if (!playedCard) {
      return false;
    }

    // If this is the first card played in the trick, it sets the
    // lead suit for the rest of the trick.
    if (this.currentTrick.length === 0) {
      this.leadSuit = playedCard.suit;
    }

    // Add the played card to the current trick.
    this.currentTrick.push({ playerId, card: playedCard });

    // If all 4 players have played, resolve the trick.
    if (this.currentTrick.length === 4) {
      this._resolveTrick();
    } else {
      // Otherwise, advance the turn to the next seat clockwise.
      this.currentTurnId = this._getNextSeatId(playerId);
    }

    return true;
  }

  /**
   * Has the given AI player choose and play a card automatically,
   * using AIPlayer.chooseCard(). Only valid for AI-type players
   * whose turn it currently is.
   * @param {string} playerId - The id of the AI player to act.
   * @returns {Card|null} The card that was played, or null if the
   *                        play could not be made.
   */
  playAICard(playerId) {
    const player = this._getPlayer(playerId);
    if (!player || typeof player.chooseCard !== "function") {
      return null;
    }
    if (this.currentTurnId !== playerId) {
      return null;
    }

    const playedCards = this.currentTrick.map((entry) => entry.card);
    const chosenCard = player.chooseCard(playedCards, this.leadSuit);
    if (!chosenCard) {
      return null;
    }

    const success = this.playCard(playerId, chosenCard);
    return success ? chosenCard : null;
  }

  /**
   * Checks whether the current round has finished (every player
   * has played all 13 of their cards).
   * @returns {boolean} True if the round is complete.
   */
  isRoundComplete() {
    return this.players.every((player) => player.hand.length === 0);
  }

  /**
   * Ends the current round: applies round scores for all players
   * via the ScoreManager, checks whether any player has reached the
   * target score, and advances the dealer for the next round.
   * @returns {Object} An object summarizing the round result:
   *                    { scores, winner, isGameOver }
   */
  endRound() {
    const scores = this.scoreManager.applyRoundScores(this.players);
    const winner = this.scoreManager.getGameWinner(this.players);

    if (winner) {
      this.isGameOver = true;
      this.gameWinner = winner;
    }

    // Rotate the dealer to the next seat clockwise for the next round.
    this.dealerId = this._getNextSeatId(this.dealerId);
    this.roundNumber += 1;

    return {
      scores,
      winner,
      isGameOver: this.isGameOver,
    };
  }

  /**
   * Returns the players ranked from highest to lowest total score.
   * Useful for the scoreboard and game-over overlays.
   * @returns {Player[]} Players sorted by totalScore descending.
   */
  getRankedPlayers() {
    return this.scoreManager.getRankedPlayers(this.players);
  }

  /**
   * Returns a specific player by id.
   * @param {string} playerId - The id of the player to find.
   * @returns {Player|undefined} The matching player, if any.
   */
  getPlayerById(playerId) {
    return this._getPlayer(playerId);
  }

  /* ---------------------------------------------------------
     INTERNAL HELPER METHODS
     ---------------------------------------------------------*/

  /**
   * Finds a player by id from the internal players array.
   * @param {string} playerId - The id to search for.
   * @returns {Player|undefined} The matching player, if found.
   */
  _getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId);
  }

  /**
   * Returns the id of the seat that comes immediately after the
   * given seat, moving clockwise according to SEAT_ORDER.
   * @param {string} seatId - The current seat id.
   * @returns {string} The next seat id, clockwise.
   */
  _getNextSeatId(seatId) {
    const index = SEAT_ORDER.indexOf(seatId);
    const nextIndex = (index + 1) % SEAT_ORDER.length;
    return SEAT_ORDER[nextIndex];
  }

  /**
   * Builds a full seating order (4 ids) starting from the seat
   * immediately after the given seat id, moving clockwise. Used
   * to determine bidding order and lead order for a round.
   * @param {string} seatId - The seat to start after (usually the
   *                            dealer).
   * @returns {string[]} Array of 4 player ids in clockwise order.
   */
  _getOrderStartingAfter(seatId) {
    const startIndex = SEAT_ORDER.indexOf(seatId);
    const order = [];

    for (let i = 1; i <= SEAT_ORDER.length; i++) {
      const idx = (startIndex + i) % SEAT_ORDER.length;
      order.push(SEAT_ORDER[idx]);
    }

    return order;
  }

  /**
   * Resolves the current trick once all 4 players have played a
   * card: determines the winner (highest card of the lead suit,
   * unless trumped by a Spade, in which case the highest Spade
   * wins), awards the trick to that player, and resets trick state
   * for the next trick. The winner also leads the next trick.
   */
  _resolveTrick() {
    let winningEntry = null;

    for (let i = 0; i < this.currentTrick.length; i++) {
      const entry = this.currentTrick[i];
      const card = entry.card;
      const isTrump = card.suit === this.trumpSuit;
      const followsLead = card.suit === this.leadSuit;

      if (!winningEntry) {
        winningEntry = entry;
        continue;
      }

      const winningCard = winningEntry.card;
      const winningIsTrump = winningCard.suit === this.trumpSuit;

      if (isTrump && !winningIsTrump) {
        // Any trump beats any non-trump card, regardless of value.
        winningEntry = entry;
      } else if (isTrump && winningIsTrump) {
        // Both trump — higher value wins.
        if (card.value > winningCard.value) {
          winningEntry = entry;
        }
      } else if (!isTrump && !winningIsTrump && followsLead) {
        // Neither is trump — only lead-suit cards can compete for
        // the win; compare values if this card follows the lead suit.
        if (card.value > winningCard.value) {
          winningEntry = entry;
        }
      }
      // A non-trump card that doesn't follow the lead suit can
      // never win the trick, so no comparison is needed for it.
    }

    // Award the trick to the winning player.
    const winner = this._getPlayer(winningEntry.playerId);
    if (winner) {
      winner.winTrick();
    }

    // Reset trick state for the next trick, and the trick winner
    // leads the next trick.
    this.currentTrick = [];
    this.leadSuit = null;
    this.currentTurnId = winningEntry.playerId;
  }
}

window.GameManager = GameManager;


