/* =========================================================
   ui.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/ui.js"></script>
   Must load AFTER deck.js, player.js, ai.js, bid.js, score.js,
   game.js, and BEFORE script.js.

   This file contains ONLY UI logic: DOM rendering, overlay
   show/hide, event wiring, and turn-by-turn orchestration that
   calls into the GameManager (from game.js) to advance the
   actual game state.

   Every element id referenced below already exists in index.html.

   This file does NOT contain:
     - Card/deck data structures (deck.js)
     - Player data (player.js)
     - AI decision-making (ai.js)
     - Bid validation rules (bid.js)
     - Score calculation rules (score.js)
     - Core game flow rules (game.js) — ui.js only CALLS into it.
   ========================================================= */


/* =========================================================
   NAMESPACE: UI
   ---------------------------------------------------------
   All UI state and functions are grouped under a single global
   object to avoid polluting the global scope with many loose
   functions/variables.
   ========================================================= */
const UI = {
  /* ---------- Internal state ---------- */
  game: null,               // The single GameManager instance for this session.
  selectedTargetScore: 50,  // Currently selected target score (10-200, step 10).
  selectedHumanBid: 1,      // Currently selected human bid value (1-13).
  selectedCardId: null,     // Id of the card currently selected in "me" hand.
  aiTurnDelay: 700,         // Milliseconds between automated AI actions.

  /* Suit symbols used for rendering card faces. */
  SUIT_SYMBOLS: {
    Spades: "\u2660",
    Hearts: "\u2665",
    Clubs: "\u2663",
    Diamonds: "\u2666",
  },

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  /**
   * Initializes the UI: creates the GameManager instance, wires
   * up all button/element event listeners, and shows the Start
   * overlay. Called once by script.js after the page has loaded.
   */
  init() {
    this.game = new GameManager();
    window.gameManager = this.game;

    this._wireStartOverlay();
    this._wireTargetScoreOverlay();
    this._wireHumanBidOverlay();
    this._wireRoundSummaryOverlay();
    this._wireScoreboardOverlay();
    this._wireGameOverOverlay();
    this._wireActionBar();

    this._showOverlay("overlay-start");
  },

  /* =========================================================
     GENERIC DOM HELPERS
     ========================================================= */

  /**
   * Shortcut for document.getElementById.
   * @param {string} id - The element id to look up.
   * @returns {HTMLElement|null} The matching element.
   */
  $(id) {
    return document.getElementById(id);
  },

  /**
   * Shows the overlay with the given id and hides all other
   * overlays, so only one overlay is ever visible at a time.
   * @param {string} overlayId - The id of the overlay to show.
   */
  _showOverlay(overlayId) {
    const overlayIds = [
      "overlay-start",
      "overlay-target-score",
      "overlay-human-bid",
      "overlay-round-summary",
      "overlay-scoreboard",
      "overlay-game-over",
    ];

    overlayIds.forEach((id) => {
      const el = this.$(id);
      if (!el) return;
      if (id === overlayId) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  },

  /**
   * Hides the overlay with the given id.
   * @param {string} overlayId - The id of the overlay to hide.
   */
  _hideOverlay(overlayId) {
    const el = this.$(overlayId);
    if (el) {
      el.classList.add("hidden");
    }
  },

  /**
   * Displays a short message in the center message banner.
   * @param {string} text - The message to display.
   */
  _showMessage(text) {
    const banner = this.$("message-banner");
    if (banner) {
      banner.textContent = text;
    }
  },

  /* =========================================================
     OVERLAY 1: START GAME
     ========================================================= */

  _wireStartOverlay() {
    const startBtn = this.$("start-game-btn");
    const continueBtn = this.$("start-continue-btn");

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        this._hideOverlay("overlay-start");
        this._showOverlay("overlay-target-score");
      });
    }

    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        this._showMessage("No saved game found.");
      });
    }
  },

  /* =========================================================
     OVERLAY 2: TARGET SCORE
     ========================================================= */

  _wireTargetScoreOverlay() {
    const decreaseBtn = this.$("target-score-decrease-btn");
    const increaseBtn = this.$("target-score-increase-btn");
    const dealBtn = this.$("deal-cards-btn");

    this._renderTargetScore();

    if (decreaseBtn) {
      decreaseBtn.addEventListener("click", () => {
        if (this.selectedTargetScore > 10) {
          this.selectedTargetScore -= 10;
          this._renderTargetScore();
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener("click", () => {
        if (this.selectedTargetScore < 200) {
          this.selectedTargetScore += 10;
          this._renderTargetScore();
        }
      });
    }

    if (dealBtn) {
      dealBtn.addEventListener("click", () => {
        this._hideOverlay("overlay-target-score");

        // Capture the human player's chosen name, if any.
        const nameInput = this.$("me-name-input");
        const humanName = nameInput && nameInput.value.trim()
          ? nameInput.value.trim()
          : "Me";

        this.game.startNewGame(this.selectedTargetScore);

        // Apply the custom human name after players are created.
        const mePlayer = this.game.getPlayerById("me");
        if (mePlayer) {
          mePlayer.name = humanName;
        }

        this._renderTable();
        this._beginBiddingPhase();
      });
    }
  },

  /**
   * Updates the target score number shown on screen.
   */
  _renderTargetScore() {
    const display = this.$("target-score-display");
    if (display) {
      display.textContent = String(this.selectedTargetScore);
    }
  },

  /* =========================================================
     OVERLAY 3: HUMAN BID
     ========================================================= */

  _wireHumanBidOverlay() {
    const decreaseBtn = this.$("human-bid-decrease-btn");
    const increaseBtn = this.$("human-bid-increase-btn");
    const confirmBtn = this.$("human-bid-confirm-btn");

    if (decreaseBtn) {
      decreaseBtn.addEventListener("click", () => {
        if (this.selectedHumanBid > 1) {
          this.selectedHumanBid -= 1;
          this._renderHumanBid();
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener("click", () => {
        if (this.selectedHumanBid < 13) {
          this.selectedHumanBid += 1;
          this._renderHumanBid();
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        this.game.submitBid("me", this.selectedHumanBid);
        this._hideOverlay("overlay-human-bid");
        this._updateSeatInfo("me");
        this._continueBiddingPhase();
      });
    }
  },

  /**
   * Updates the human bid number shown on screen.
   */
  _renderHumanBid() {
    const display = this.$("human-bid-display");
    if (display) {
      display.textContent = String(this.selectedHumanBid);
    }
  },

  /**
   * Populates the small hand preview shown on the bid overlay
   * with the human player's current 13 cards (face up, read-only).
   */
  _renderHumanBidHandPreview() {
    const container = this.$("human-bid-hand-preview");
    if (!container) return;

    container.innerHTML = "";
    const mePlayer = this.game.getPlayerById("me");
    if (!mePlayer) return;

    mePlayer.hand.forEach((card) => {
      container.appendChild(this._buildCardElement(card, false));
    });
  },

  /* =========================================================
     BIDDING PHASE ORCHESTRATION
     ========================================================= */

  /**
   * Starts the bidding phase for the current round: resets the
   * human bid selector, then begins processing bidders one by
   * one in turn order (AI bids automatically with a short delay,
   * human bidding pauses to show the bid overlay).
   */
  _beginBiddingPhase() {
    this.selectedHumanBid = 1;
    this._renderHumanBid();
    this._updateInfoBar();
    this._continueBiddingPhase();
  },

  /**
   * Processes the next bidder in turn order. If bidding is
   * already complete, moves on to the card-play phase. If the
   * current bidder is an AI, submits its bid automatically after
   * a short delay for a natural pace. If the current bidder is
   * the human player, shows the bid overlay and waits.
   */
  _continueBiddingPhase() {
    if (this.game.isBiddingComplete()) {
      this._beginPlayPhase();
      return;
    }

    const currentBidder = this.game.bidManager.getCurrentBidder();
    if (!currentBidder) {
      this._beginPlayPhase();
      return;
    }

    this._updateInfoBar();

    if (currentBidder.type === "ai") {
      this._showMessage(`${currentBidder.name} is bidding...`);
      setTimeout(() => {
        this.game.submitAIBid(currentBidder.id);
        this._updateSeatInfo(currentBidder.id);
        this._continueBiddingPhase();
      }, this.aiTurnDelay);
    } else {
      this._renderHumanBidHandPreview();
      this._showOverlay("overlay-human-bid");
    }
  },

  /* =========================================================
     CARD PLAY PHASE
     ========================================================= */

  /**
   * Begins the card-play phase after bidding is complete: renders
   * all hands face-up/face-down as appropriate, clears trick
   * state visuals, and starts processing turns.
   */
  _beginPlayPhase() {
    this._renderTable();
    this._showMessage("Play begins!");
    this._continuePlayPhase();
  },

  /**
   * Processes the current turn during card play. If it's an AI
   * player's turn, the AI chooses and plays a card automatically
   * after a short delay. If it's the human's turn, enables card
   * selection in their hand. If the round has ended, shows the
   * round summary. If a trick just completed, briefly pauses so
   * the player can see the trick before it's cleared.
   */
  _continuePlayPhase() {
    this._updateInfoBar();

    if (this.game.isRoundComplete()) {
      this._endRoundFlow();
      return;
    }

    const currentId = this.game.currentTurnId;
    const currentPlayer = this.game.getPlayerById(currentId);
    if (!currentPlayer) {
      return;
    }

    if (currentPlayer.type === "ai") {
      this._setPlayEnabled(false);
      setTimeout(() => {
        const trickSizeBefore = this.game.currentTrick.length;
        const playedCard = this.game.playAICard(currentId);

        if (playedCard) {
          this._renderTable();

          // If the trick just completed (4 cards played), pause
          // briefly on the completed trick before clearing it.
          if (trickSizeBefore === 3) {
            setTimeout(() => {
              this._continuePlayPhase();
            }, this.aiTurnDelay);
          } else {
            this._continuePlayPhase();
          }
        }
      }, this.aiTurnDelay);
    } else {
      // Human's turn: enable clicking on legal cards in "me" hand.
      this._setPlayEnabled(true);
      this._renderHand("me");
    }
  },

  /**
   * Handles the human player selecting a card in their hand.
   * Toggles the "selected" class and enables the Play Card button
   * only if the tapped card is currently legal to play.
   * @param {Card} card - The card that was tapped.
   */
  _onHumanCardTap(card) {
    const legalCards = this.game.getLegalCards("me");
    const isLegal = legalCards.some((c) => c.id === card.id);
    if (!isLegal) {
      this._showMessage("You must follow the lead suit.");
      return;
    }

    this.selectedCardId = card.id;
    this._renderHand("me");

    const playBtn = this.$("play-card-btn");
    if (playBtn) {
      playBtn.disabled = false;
    }
  },

  /**
   * Confirms and plays the currently selected human card.
   */
  _playSelectedHumanCard() {
    if (!this.selectedCardId) {
      return;
    }

    const mePlayer = this.game.getPlayerById("me");
    const card = mePlayer.hand.find((c) => c.id === this.selectedCardId);
    if (!card) {
      return;
    }

    const trickSizeBefore = this.game.currentTrick.length;
    const success = this.game.playCard("me", card);

    if (success) {
      this.selectedCardId = null;
      this._setPlayEnabled(false);
      this._renderTable();

      if (trickSizeBefore === 3) {
        setTimeout(() => {
          this._continuePlayPhase();
        }, this.aiTurnDelay);
      } else {
        this._continuePlayPhase();
      }
    }
  },

  /**
   * Enables or disables the human "Play Card" and "Sort" controls,
   * and clears any current card selection when disabling.
   * @param {boolean} enabled - Whether human play controls should
   *                              be interactive right now.
   */
  _setPlayEnabled(enabled) {
    const playBtn = this.$("play-card-btn");
    if (playBtn) {
      playBtn.disabled = !enabled;
    }
    if (!enabled) {
      this.selectedCardId = null;
    }
  },

  /* =========================================================
     ACTION BAR (Sort / Play)
     ========================================================= */

  _wireActionBar() {
    const sortBtn = this.$("sort-hand-btn");
    const playBtn = this.$("play-card-btn");

    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        const mePlayer = this.game.getPlayerById("me");
        if (mePlayer) {
          mePlayer.sortHand();
          this._renderHand("me");
        }
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        this._playSelectedHumanCard();
      });
    }

    const scoreboardOpenBtn = this.$("scoreboard-open-btn");
    if (scoreboardOpenBtn) {
      scoreboardOpenBtn.addEventListener("click", () => {
        this._renderScoreboard();
        this._showOverlay("overlay-scoreboard");
      });
    }
  },

  /* =========================================================
     ROUND END / ROUND SUMMARY
     ========================================================= */

  /**
   * Called once all 13 tricks of a round have been played. Ends
   * the round via GameManager (applying scores), then shows the
   * Round Summary overlay with the results.
   */
  _endRoundFlow() {
    const result = this.game.endRound();
    this._renderRoundSummary();
    this._showOverlay("overlay-round-summary");

    // Store whether this round ended the game, for the Continue
    // button handler to check afterward.
    this._lastRoundResult = result;
  },

  _wireRoundSummaryOverlay() {
    const continueBtn = this.$("round-summary-continue-btn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        this._hideOverlay("overlay-round-summary");

        if (this._lastRoundResult && this._lastRoundResult.isGameOver) {
          this._renderGameOver(this._lastRoundResult.winner);
          this._showOverlay("overlay-game-over");
        } else {
          this.game.dealNewRound();
          this._renderTable();
          this._beginBiddingPhase();
        }
      });
    }
  },

  /**
   * Fills in the round summary table with each player's bid,
   * tricks won, and round score.
   */
  _renderRoundSummary() {
    const seats = ["me", "uncle", "brother", "sister"];

    seats.forEach((seatId) => {
      const player = this.game.getPlayerById(seatId);
      if (!player) return;

      const nameCell = this.$(`round-summary-name-${seatId}`);
      const bidCell = this.$(`round-summary-bid-${seatId}`);
      const tricksCell = this.$(`round-summary-tricks-${seatId}`);
      const scoreCell = this.$(`round-summary-score-${seatId}`);

      if (nameCell) nameCell.textContent = player.name;
      if (bidCell) bidCell.textContent = String(player.bid);
      if (tricksCell) tricksCell.textContent = String(player.tricksWon);
      if (scoreCell) scoreCell.textContent = String(player.roundScore);
    });
  },

  /* =========================================================
     SCOREBOARD OVERLAY
     ========================================================= */

  _wireScoreboardOverlay() {
    const closeBtn = this.$("scoreboard-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this._hideOverlay("overlay-scoreboard");
      });
    }
  },

  /**
   * Fills in the scoreboard table with each player's current
   * total score, ranked highest to lowest.
   */
  _renderScoreboard() {
    const targetDisplay = this.$("scoreboard-target-display");
    if (targetDisplay) {
      targetDisplay.textContent = `Target: ${this.game.scoreManager.targetScore}`;
    }

    const seats = ["me", "uncle", "brother", "sister"];
    seats.forEach((seatId) => {
      const player = this.game.getPlayerById(seatId);
      if (!player) return;

      const nameCell = this.$(`scoreboard-name-${seatId}`);
      const scoreCell = this.$(`scoreboard-score-${seatId}`);

      if (nameCell) nameCell.textContent = player.name;
      if (scoreCell) scoreCell.textContent = String(player.totalScore);
    });
  },

  /* =========================================================
     GAME OVER OVERLAY
     ========================================================= */

  _wireGameOverOverlay() {
    const restartBtn = this.$("game-over-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        this._hideOverlay("overlay-game-over");
        this._showOverlay("overlay-start");
      });
    }
  },

  /**
   * Fills in the game-over table and winner display.
   * @param {Player} winner - The player who won the game.
   */
  _renderGameOver(winner) {
    const winnerDisplay = this.$("game-over-winner-display");
    if (winnerDisplay && winner) {
      winnerDisplay.textContent = `Winner: ${winner.name}`;
    }

    const ranked = this.game.getRankedPlayers();
    const seats = ["me", "uncle", "brother", "sister"];

    seats.forEach((seatId) => {
      const player = this.game.getPlayerById(seatId);
      if (!player) return;

      const nameCell = this.$(`game-over-name-${seatId}`);
      const scoreCell = this.$(`game-over-score-${seatId}`);

      if (nameCell) nameCell.textContent = player.name;
      if (scoreCell) scoreCell.textContent = String(player.totalScore);
    });
  },

  /* =========================================================
     TABLE RENDERING (hands, trick, info bar)
     ========================================================= */

  /**
   * Renders the entire table: all 4 hands, the current trick, and
   * the info bar (round/trump/turn indicators).
   */
  _renderTable() {
    ["me", "uncle", "brother", "sister"].forEach((seatId) => {
      this._renderHand(seatId);
      this._updateSeatInfo(seatId);
    });
    this._renderTrick();
    this._updateInfoBar();
  },

  /**
   * Renders a single seat's hand into its `.hand` container.
   * The human ("me") hand shows full card faces and is clickable;
   * AI hands show face-down card backs (styled via CSS).
   * @param {string} seatId - "me", "uncle", "brother", or "sister".
   */
  _renderHand(seatId) {
    const container = this.$(`${seatId}-hand`);
    const player = this.game.getPlayerById(seatId);
    if (!container || !player) return;

    container.innerHTML = "";

    const legalCards = seatId === "me" ? this.game.getLegalCards("me") : [];
    const isHumanTurn = seatId === "me" && this.game.currentTurnId === "me";

    player.hand.forEach((card) => {
      const faceUp = seatId === "me";
      const cardEl = this._buildCardElement(card, faceUp);

      if (seatId === "me") {
        const isLegal = legalCards.some((c) => c.id === card.id);

        if (isHumanTurn && isLegal) {
          cardEl.classList.add("playable");
          cardEl.addEventListener("click", () => this._onHumanCardTap(card));
        } else {
          cardEl.classList.add("disabled");
        }

        if (this.selectedCardId === card.id) {
          cardEl.classList.add("selected");
        }
      }

      container.appendChild(cardEl);
    });
  },

  /**
   * Renders the current trick's played cards into the 4 trick
   * slots in the center of the table.
   */
  _renderTrick() {
    const slots = {
      me: this.$("trick-slot-me"),
      uncle: this.$("trick-slot-uncle"),
      brother: this.$("trick-slot-brother"),
      sister: this.$("trick-slot-sister"),
    };

    // Clear all slots first.
    Object.values(slots).forEach((slot) => {
      if (slot) slot.innerHTML = "";
    });

    this.game.currentTrick.forEach((entry) => {
      const slot = slots[entry.playerId];
      if (slot) {
        slot.appendChild(this._buildCardElement(entry.card, true));
      }
    });
  },

  /**
   * Builds a DOM element representing a single playing card.
   * @param {Card} card - The card to render.
   * @param {boolean} faceUp - Whether to show the rank/suit face
   *                             (true) or leave it blank for CSS
   *                             face-down styling (false).
   * @returns {HTMLElement} The constructed card element.
   */
  _buildCardElement(card, faceUp) {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.cardId = card.id;

    if (faceUp) {
      const rankEl = document.createElement("span");
      rankEl.className = "rank";
      rankEl.textContent = card.rank;

      const suitEl = document.createElement("span");
      suitEl.className = "suit";
      suitEl.textContent = this.SUIT_SYMBOLS[card.suit] || card.suit;

      const colorClass = card.isRed() ? "red" : "black";
      cardEl.classList.add(colorClass);

      cardEl.appendChild(rankEl);
      cardEl.appendChild(suitEl);
    }

    return cardEl;
  },

  /**
   * Updates a seat's bid and tricks-won display labels.
   * @param {string} seatId - "me", "uncle", "brother", or "sister".
   */
  _updateSeatInfo(seatId) {
    const player = this.game.getPlayerById(seatId);
    if (!player) return;

    const bidDisplay = this.$(`${seatId}-bid-display`);
    const tricksDisplay = this.$(`${seatId}-tricks-display`);
    const nameDisplay = this.$(`${seatId}-name`);

    if (bidDisplay) {
      bidDisplay.textContent = `Bid: ${player.bid === null ? "-" : player.bid}`;
    }
    if (tricksDisplay) {
      tricksDisplay.textContent = `Tricks: ${player.tricksWon}`;
    }
    if (nameDisplay) {
      nameDisplay.textContent = player.name;
    }

    // Highlight the seat visually if it's currently their turn.
    const seatEl = this.$(`seat-${seatId}`);
    if (seatEl) {
      if (this.game.currentTurnId === seatId) {
        seatEl.classList.add("active-turn");
      } else {
        seatEl.classList.remove("active-turn");
      }
    }
  },

  /**
   * Updates the top info bar: round number, trump suit, and whose
   * turn it currently is.
   */
  _updateInfoBar() {
    const roundNumberEl = this.$("round-number");
    const trumpValueEl = this.$("trump-value");
    const turnValueEl = this.$("turn-value");

    if (roundNumberEl) {
      roundNumberEl.textContent = String(this.game.roundNumber);
    }
    if (trumpValueEl) {
      trumpValueEl.textContent = this.game.trumpSuit;
    }
    if (turnValueEl) {
      const currentPlayer = this.game.getPlayerById(this.game.currentTurnId);
      turnValueEl.textContent = currentPlayer ? currentPlayer.name : "-";
    }

    // Refresh active-turn highlighting on all seats.
    ["me", "uncle", "brother", "sister"].forEach((seatId) => {
      const seatEl = this.$(`seat-${seatId}`);
      if (seatEl) {
        if (this.game.currentTurnId === seatId) {
          seatEl.classList.add("active-turn");
        } else {
          seatEl.classList.remove("active-turn");
        }
      }
    });
  },
};

window.UI = UI;
