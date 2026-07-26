/* =========================================================
   ui.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/ui.js"></script>

   UPDATED behavior:
     - Hand is always shown (with a short pause/message) before
       any bidding overlay appears, regardless of turn order.
     - Tapping a legal card in "me" hand plays it immediately
       (no separate select + Play Card confirmation step).
     - A short tap sound plays on every card tap, generated with
       the Web Audio API (no external audio files/libraries).
   ========================================================= */

const UI = {
  game: null,
  selectedTargetScore: 50,
  selectedHumanBid: 1,
  aiTurnDelay: 700,
  handRevealDelay: 1500,
  _audioCtx: null,

  SUIT_SYMBOLS: {
    Spades: "\u2660",
    Hearts: "\u2665",
    Clubs: "\u2663",
    Diamonds: "\u2666",
  },

  /* =========================================================
     INITIALIZATION
     ========================================================= */
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

    // Play Card button is no longer needed since tapping a card
    // plays it immediately; hide it permanently (id kept intact).
    const playBtn = this.$("play-card-btn");
    if (playBtn) {
      playBtn.classList.add("hidden");
    }

    this._showOverlay("overlay-start");
  },

  /* =========================================================
     GENERIC DOM HELPERS
     ========================================================= */
  $(id) {
    return document.getElementById(id);
  },

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

  _hideOverlay(overlayId) {
    const el = this.$(overlayId);
    if (el) el.classList.add("hidden");
  },

  _showMessage(text) {
    const banner = this.$("message-banner");
    if (banner) banner.textContent = text;
  },

  /* =========================================================
     SOUND: short tap click, generated via Web Audio API
     (no external files, no libraries).
     ========================================================= */
  _playTapSound() {
    try {
      if (!this._audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this._audioCtx = new AudioCtx();
      }
      const ctx = this._audioCtx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio isn't critical to gameplay; fail silently.
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

        const nameInput = this.$("me-name-input");
        const humanName = nameInput && nameInput.value.trim()
          ? nameInput.value.trim()
          : "Me";

        this.game.startNewGame(this.selectedTargetScore);

        const mePlayer = this.game.getPlayerById("me");
        if (mePlayer) {
          mePlayer.name = humanName;
        }

        this._renderTable();
        this._beginBiddingPhase();
      });
    }
  },

  _renderTargetScore() {
    const display = this.$("target-score-display");
    if (display) display.textContent = String(this.selectedTargetScore);
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

  _renderHumanBid() {
    const display = this.$("human-bid-display");
    if (display) display.textContent = String(this.selectedHumanBid);
  },

  _renderHumanBidHandPreview() {
    const container = this.$("human-bid-hand-preview");
    if (!container) return;

    container.innerHTML = "";
    const mePlayer = this.game.getPlayerById("me");
    if (!mePlayer) return;

    mePlayer.hand.forEach((card) => {
      container.appendChild(this._buildCardElement(card, true));
    });
  },

  /* =========================================================
     BIDDING PHASE ORCHESTRATION
     ---------------------------------------------------------
     UPDATED: the full 13-card hand is always rendered and shown
     to the player first, with a short pause and message, BEFORE
     any bidding (AI or human) begins. This guarantees the player
     always sees their cards before deciding a bid, regardless
     of turn order or who deals.
     ========================================================= */
  _beginBiddingPhase() {
    this.selectedHumanBid = 1;
    this._renderHumanBid();
    this._updateInfoBar();

    // Make sure the human's hand is fully rendered and visible
    // before bidding starts.
    this._renderHand("me");
    this._showMessage("Cards dealt! Look at your hand...");

    setTimeout(() => {
      this._continueBiddingPhase();
    }, this.handRevealDelay);
  },

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
  _beginPlayPhase() {
    this._renderTable();
    this._showMessage("Play begins!");
    this._continuePlayPhase();
  },

  _continuePlayPhase() {
    this._updateInfoBar();

    if (this.game.isRoundComplete()) {
      this._endRoundFlow();
      return;
    }

    const currentId = this.game.currentTurnId;
    const currentPlayer = this.game.getPlayerById(currentId);
    if (!currentPlayer) return;

    if (currentPlayer.type === "ai") {
      setTimeout(() => {
        const trickSizeBefore = this.game.currentTrick.length;
        const playedCard = this.game.playAICard(currentId);

        if (playedCard) {
          this._renderTable();

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
      // Human's turn: just re-render the hand so legal cards are
      // highlighted and clickable. Tapping a card plays it directly.
      this._renderHand("me");
    }
  },

  /**
   * UPDATED: tapping a legal card in the human hand now plays it
   * immediately — no separate selection + Play Card confirmation.
   * A short tap sound plays on every tap (legal or not).
   * @param {Card} card - The card that was tapped.
   */
  _onHumanCardTap(card) {
    this._playTapSound();

    const legalCards = this.game.getLegalCards("me");
    const isLegal = legalCards.some((c) => c.id === card.id);
    if (!isLegal) {
      this._showMessage("You must follow the lead suit.");
      return;
    }

    const trickSizeBefore = this.game.currentTrick.length;
    const success = this.game.playCard("me", card);

    if (success) {
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

  /* =========================================================
     ACTION BAR (Sort)
     ========================================================= */
  _wireActionBar() {
    const sortBtn = this.$("sort-hand-btn");

    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        const mePlayer = this.game.getPlayerById("me");
        if (mePlayer) {
          mePlayer.sortHand();
          this._renderHand("me");
        }
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
  _endRoundFlow() {
    const result = this.game.endRound();
    this._renderRoundSummary();
    this._showOverlay("overlay-round-summary");
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

  _renderGameOver(winner) {
    const winnerDisplay = this.$("game-over-winner-display");
    if (winnerDisplay && winner) {
      winnerDisplay.textContent = `Winner: ${winner.name}`;
    }

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
  _renderTable() {
    ["me", "uncle", "brother", "sister"].forEach((seatId) => {
      this._renderHand(seatId);
      this._updateSeatInfo(seatId);
    });
    this._renderTrick();
    this._updateInfoBar();
  },

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
      }

      container.appendChild(cardEl);
    });
  },

  _renderTrick() {
    const slots = {
      me: this.$("trick-slot-me"),
      uncle: this.$("trick-slot-uncle"),
      brother: this.$("trick-slot-brother"),
      sister: this.$("trick-slot-sister"),
    };

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

    const seatEl = this.$(`seat-${seatId}`);
    if (seatEl) {
      if (this.game.currentTurnId === seatId) {
        seatEl.classList.add("active-turn");
      } else {
        seatEl.classList.remove("active-turn");
      }
    }
  },

  _updateInfoBar() {
    const roundNumberEl = this.$("round-number");
    const trumpValueEl = this.$("trump-value");
    const turnValueEl = this.$("turn-value");

    if (roundNumberEl) roundNumberEl.textContent = String(this.game.roundNumber);
    if (trumpValueEl) trumpValueEl.textContent = this.game.trumpSuit;
    if (turnValueEl) {
      const currentPlayer = this.game.getPlayerById(this.game.currentTurnId);
      turnValueEl.textContent = currentPlayer ? currentPlayer.name : "-";
    }

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
