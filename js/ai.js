
/* =========================================================
   ai.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/ai.js"></script>
   Must load AFTER player.js so the global Player class exists.
   ========================================================= */

class AIPlayer extends Player {
  /**
   * Creates a new AIPlayer instance.
   * @param {string} id - Unique identifier for this AI player (e.g. "uncle").
   * @param {string} name - Display name for this AI player (e.g. "Uncle").
   */
  constructor(id, name) {
    // Type is always "ai" for AIPlayer, hardcoded here.
    super(id, name, "ai");
  }

  /**
   * Evaluates the overall strength of this AI's current 13-card hand
   * and returns a numeric strength score. Higher scores mean a
   * stronger hand (more high cards, more spades/trump control).
   *
   * Spades are the permanent trump suit in Call Bridge, so spade
   * cards are given extra weight on top of their rank value.
   *
   * @returns {number} A numeric strength score for the current hand.
   */
  evaluateHand() {
    let strength = 0;

    for (let i = 0; i < this.hand.length; i++) {
      const card = this.hand[i];

      // Base points for high-ranking cards.
      if (card.rank === "A") {
        strength += 3; // Ace = strong
      } else if (card.rank === "K") {
        strength += 2; // King = medium
      } else if (card.rank === "Q") {
        strength += 1; // Queen = useful
      }

      // Spades are permanent trump, so every spade is worth extra,
      // on top of any rank bonus it already earned above.
      if (card.suit === "Spades") {
        strength += 1;

        // High trump cards are especially powerful since they can
        // win tricks even when this AI is void in the lead suit.
        if (card.rank === "A" || card.rank === "K" || card.rank === "Q") {
          strength += 1;
        }
      }
    }

    return strength;
  }

  /**
   * Calculates a reasonable bid for this AI player based on the
   * strength of its current hand, then stores it using the
   * inherited makeBid() method from Player.
   *
   * @returns {number} The AI's chosen bid (an integer between 1 and 13).
   */
  makeAIBid() {
    // Get the overall strength score for the current hand.
    const strength = this.evaluateHand();

    // Convert strength into a rough trick estimate. Dividing by 3
    // and rounding keeps the numbers in a sensible range for a
    // 13-card hand.
    let estimatedBid = Math.round(strength / 3);

    // Every hand is likely to win at least one trick.
    if (estimatedBid < 1) {
      estimatedBid = 1;
    }

    // Cap the bid at 13, since a round only has 13 tricks total.
    if (estimatedBid > 13) {
      estimatedBid = 13;
    }

    // Store the calculated bid on the player object using the
    // inherited makeBid() method, then also return it.
    this.makeBid(estimatedBid);
    return estimatedBid;
  }

  /**
   * Decides which card this AI should play, given the cards already
   * played in the current trick and the lead suit for that trick.
   *
   * @param {Card[]} playedCards - Cards already played in this trick.
   * @param {string|null} leadSuit - The suit led this trick, or null
   *                                   if this AI is leading.
   * @returns {Card|null} The chosen card from this AI's hand.
   */
  chooseCard(playedCards, leadSuit) {
    // Safety fallback: nothing to choose if the hand is empty.
    if (this.hand.length === 0) {
      return null;
    }

    // Cards in hand that match the lead suit (must be played if any exist).
    const leadSuitCards = leadSuit
      ? this.hand.filter((card) => card.suit === leadSuit)
      : [];

    // Determine the strongest card currently winning the trick.
    const highestPlayedValue = this._getHighestTrickValue(playedCards, leadSuit);

    // -----------------------------------------------------------
    // CASE 1: AI must follow suit (has at least one lead-suit card).
    // -----------------------------------------------------------
    if (leadSuitCards.length > 0) {
      // Try to find the cheapest lead-suit card that still beats
      // the current best card in the trick.
      const winningCard = this._findCheapestWinningCard(
        leadSuitCards,
        highestPlayedValue,
        leadSuit === "Spades"
      );

      if (winningCard) {
        return winningCard;
      }

      // Can't win by following suit — discard the lowest lead-suit card.
      return this._getLowestCard(leadSuitCards);
    }

    // -----------------------------------------------------------
    // CASE 2: AI has no cards of the lead suit (or is leading).
    // -----------------------------------------------------------

    // If this AI is leading the trick, prefer leading a strong spade
    // to take control, otherwise lead the highest non-spade card.
    if (!leadSuit || playedCards.length === 0) {
      const spadeCards = this.hand.filter((card) => card.suit === "Spades");
      if (spadeCards.length > 0) {
        return this._getHighestCard(spadeCards);
      }
      return this._getHighestCard(this.hand);
    }

    // AI is void in the lead suit — try to trump in with a spade.
    const spadeCards = this.hand.filter((card) => card.suit === "Spades");
    if (spadeCards.length > 0) {
      const winningSpade = this._findCheapestWinningCard(spadeCards, highestPlayedValue, true);
      if (winningSpade) {
        return winningSpade;
      }
      // No spade can beat the current trump already played — discard
      // the lowest spade rather than wasting a strong one.
      return this._getLowestCard(spadeCards);
    }

    // No lead-suit cards and no spades either — this trick cannot be
    // won, so discard the weakest card from any other suit.
    return this._getLowestCard(this.hand);
  }

  /**
   * Removes the given card from this AI's hand (the card it chose to
   * play) and returns it, using the inherited removeCard() method.
   * @param {Card} card - The card this AI is playing.
   * @returns {Card|null} The removed card, or null if it wasn't found.
   */
  playCard(card) {
    return this.removeCard(card);
  }

  /**
   * Determines the highest "effective" value currently winning the
   * trick, taking trump (Spades) into account: any spade played beats
   * any non-spade card, regardless of rank.
   * @param {Card[]} playedCards - Cards already played this trick.
   * @param {string|null} leadSuit - The suit led this trick.
   * @returns {{value:number, isSpade:boolean}} Strength of the
   *          current best card in the trick.
   */
  _getHighestTrickValue(playedCards, leadSuit) {
    let best = { value: 0, isSpade: false };

    if (!playedCards || playedCards.length === 0) {
      return best;
    }

    for (let i = 0; i < playedCards.length; i++) {
      const card = playedCards[i];
      const isSpade = card.suit === "Spades";

      // A spade always beats a non-spade card, regardless of value.
      if (isSpade && !best.isSpade) {
        best = { value: card.value, isSpade: true };
      } else if (isSpade === best.isSpade && card.value > best.value) {
        // Only compare fairly within the same category (trump vs
        // trump, or lead suit vs lead suit).
        if (isSpade || card.suit === leadSuit) {
          best = { value: card.value, isSpade };
        }
      }
    }

    return best;
  }

  /**
   * From a list of candidate cards, finds the cheapest (lowest value)
   * card that would still beat the current best card in the trick.
   * @param {Card[]} candidates - Cards to choose from.
   * @param {{value:number, isSpade:boolean}} highestPlayedValue -
   *                                The current best card in the trick.
   * @param {boolean} candidatesAreTrump - True if all candidates are
   *                                spade (trump) cards.
   * @returns {Card|null} The cheapest winning card, or null if none
   *                       of the candidates can win.
   */
  _findCheapestWinningCard(candidates, highestPlayedValue, candidatesAreTrump) {
    // Sort a copy from lowest to highest value to find the smallest
    // card that still wins.
    const sorted = candidates.slice().sort((a, b) => a.value - b.value);

    for (let i = 0; i < sorted.length; i++) {
      const card = sorted[i];
      const isSpade = candidatesAreTrump || card.suit === "Spades";

      // Trump automatically beats a non-trump current best.
      if (isSpade && !highestPlayedValue.isSpade) {
        return card;
      }

      // Same category comparison (trump vs trump, or suit vs suit).
      if (isSpade === highestPlayedValue.isSpade && card.value > highestPlayedValue.value) {
        return card;
      }
    }

    // None of the candidates can beat the current best card.
    return null;
  }

  /**
   * Returns the highest-value card from a list of cards.
   * @param {Card[]} cards - The cards to search.
   * @returns {Card} The highest-value card.
   */
  _getHighestCard(cards) {
    return cards.reduce((highest, card) => (card.value > highest.value ? card : highest), cards[0]);
  }

  /**
   * Returns the lowest-value card from a list of cards.
   * @param {Card[]} cards - The cards to search.
   * @returns {Card} The lowest-value card.
   */
  _getLowestCard(cards) {
    return cards.reduce((lowest, card) => (card.value < lowest.value ? card : lowest), cards[0]);
  }
}

window.AIPlayer = AIPlayer;



