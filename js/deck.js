/* =========================================================
   deck.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="js/deck.js"></script>

   This file defines the core data structures for the card
   deck used in the offline Call Bridge game:

     - Card  : represents a single playing card
     - Deck  : represents a full 52-card deck, with building,
               shuffling, and dealing logic

   This file contains ONLY deck/card data structures.
   It does NOT contain any game rules, bidding logic,
   AI logic, scoring logic, DOM manipulation, or UI code.
   ========================================================= */


/* ---------------------------------------------------------
   CONSTANTS
   ---------------------------------------------------------
   SUITS: the four suits used in a standard deck, listed in
   the exact priority order requested for sorting purposes:
   Spades > Hearts > Clubs > Diamonds.

   RANKS: the thirteen ranks used in a standard deck, listed
   in low-to-high order. Index position in this array is used
   to determine numeric card value (2 is lowest, Ace is highest).
   ----------------------------------------------------------*/

// The four suits, in the fixed sort priority order used throughout the game.
const SUITS = ["Spades", "Hearts", "Clubs", "Diamonds"];

// The thirteen ranks, in low-to-high order.
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];


/* =========================================================
   CLASS: Card
   ---------------------------------------------------------
   Represents a single playing card.

   Properties:
     - suit  : string, one of SUITS ("Spades", "Hearts", "Clubs", "Diamonds")
     - rank  : string, one of RANKS ("2".."10","J","Q","K","A")
     - value : numeric strength of the card (2 = lowest, 14 = Ace/highest)
     - id    : a unique string identifier for this card, e.g. "A-Spades"
   ========================================================= */
class Card {
  /**
   * Creates a new Card instance.
   * @param {string} suit - The suit of the card (must be one of SUITS).
   * @param {string} rank - The rank of the card (must be one of RANKS).
   */
  constructor(suit, rank) {
    // Store the suit exactly as provided (e.g. "Spades").
    this.suit = suit;

    // Store the rank exactly as provided (e.g. "K").
    this.rank = rank;

    // Numeric value of the card, used for comparing card strength.
    // RANKS.indexOf(rank) gives 0 for "2" up to 12 for "A".
    // Adding 2 shifts this so that "2" = 2 and "A" = 14, which matches
    // standard card game conventions (2 is lowest, Ace is highest).
    this.value = RANKS.indexOf(rank) + 2;

    // A unique identifier for this exact card, useful for tracking
    // cards in the UI (e.g. as a DOM element id or data attribute).
    // Example: "A-Spades", "10-Hearts", "2-Clubs".
    this.id = `${rank}-${suit}`;
  }

  /**
   * Returns a short human-readable label for the card,
   * combining rank and the first letter of the suit.
   * Example: "A♠" style label is NOT used here (no symbols required),
   * instead this returns something like "AS", "10H", "QD".
   * @returns {string} Short label for the card.
   */
  shortLabel() {
    // Use the first character of the suit as a short suit code.
    // (S = Spades, H = Hearts, C = Clubs, D = Diamonds)
    const suitCode = this.suit.charAt(0);
    return `${this.rank}${suitCode}`;
  }

  /**
   * Returns a full human-readable description of the card.
   * Example: "Ace of Spades", "10 of Hearts".
   * @returns {string} Full description of the card.
   */
  toString() {
    // Convert single-letter/rank codes into friendlier words for face cards.
    let rankName = this.rank;
    if (this.rank === "J") rankName = "Jack";
    else if (this.rank === "Q") rankName = "Queen";
    else if (this.rank === "K") rankName = "King";
    else if (this.rank === "A") rankName = "Ace";

    return `${rankName} of ${this.suit}`;
  }

  /**
   * Determines whether this card belongs to a red suit
   * (Hearts or Diamonds). Spades and Clubs are black suits.
   * @returns {boolean} True if the card is red, false if black.
   */
  isRed() {
    return this.suit === "Hearts" || this.suit === "Diamonds";
  }
}


/* =========================================================
   CLASS: Deck
   ---------------------------------------------------------
   Represents a standard 52-card deck (no Jokers).

   Responsibilities:
     - build()   : construct all 52 Card objects
     - shuffle() : randomize the order of the cards fairly
                   (Fisher-Yates algorithm)
     - deal()    : distribute 13 cards to each of 4 players,
                   then automatically sort each player's hand
     - reset()   : rebuild and reshuffle the deck from scratch
     - remainingCards() : how many cards are left in the deck
     - draw()    : remove and return the top card of the deck
   ========================================================= */
class Deck {
  /**
   * Creates a new, empty Deck instance.
   * The deck is not automatically built; call build() to
   * populate it with all 52 cards.
   */
  constructor() {
    // Internal array holding all Card objects currently in the deck.
    this.cards = [];
  }

  /**
   * Builds a full standard 52-card deck (no Jokers) by creating
   * one Card object for every combination of suit and rank.
   * Resets/overwrites any existing cards in this deck.
   * @returns {Card[]} The array of 52 newly created Card objects.
   */
  build() {
    // Start with an empty array so repeated calls to build()
    // do not accumulate duplicate cards.
    this.cards = [];

    // Loop over every suit, then every rank within that suit,
    // creating a new Card for each of the 52 combinations.
    for (let s = 0; s < SUITS.length; s++) {
      for (let r = 0; r < RANKS.length; r++) {
        const suit = SUITS[s];
        const rank = RANKS[r];
        this.cards.push(new Card(suit, rank));
      }
    }

    return this.cards;
  }

  /**
   * Shuffles the deck's cards in place using the Fisher-Yates
   * (Knuth) shuffle algorithm. This algorithm guarantees a fair,
   * unbiased random permutation of the array, where every possible
   * ordering of the cards is equally likely.
   * @returns {Card[]} The same array reference, now shuffled.
   */
  shuffle() {
    // Iterate backwards from the last index to the second element.
    for (let i = this.cards.length - 1; i > 0; i--) {
      // Pick a random index j such that 0 <= j <= i.
      const j = Math.floor(Math.random() * (i + 1));

      // Swap the elements at positions i and j.
      // Using array destructuring for a clean, atomic swap.
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    return this.cards;
  }

  /**
   * Deals the deck's cards out to exactly 4 players, giving each
   * player exactly 13 cards (a standard 52-card deck split evenly
   * among 4 players). After dealing, each player's hand is
   * automatically sorted using Deck.sortHand().
   *
   * The `players` parameter is expected to be an array of exactly
   * 4 entries. Each entry may be either:
   *   (a) a plain array, in which case the dealt cards are pushed
   *       directly into that array, or
   *   (b) an object that has (or will receive) a `.hand` array
   *       property, in which case the dealt cards are pushed into
   *       `player.hand`.
   *
   * This flexible handling allows deck.js to remain independent
   * from the exact shape of the Player class defined elsewhere
   * (e.g. in player.js), while still producing correctly sorted,
   * evenly-dealt hands.
   *
   * @param {Array} players - An array of exactly 4 players (arrays
   *                          or objects with a `.hand` array).
   * @returns {Array} The same `players` array, now populated with
   *                  13 sorted cards each.
   */
  deal(players) {
    // Basic safety check: Call Bridge is always played with exactly
    // 4 players. If this condition is not met, dealing cannot proceed
    // correctly, so we stop here rather than deal invalid hands.
    if (!Array.isArray(players) || players.length !== 4) {
      throw new Error("Deck.deal() requires an array of exactly 4 players.");
    }

    // Normalize each player entry into a hand array we can push into.
    // If the entry is already an array, use it directly.
    // If the entry is an object, ensure it has a `.hand` array.
    const hands = players.map((entry) => {
      if (Array.isArray(entry)) {
        return entry;
      }
      if (!Array.isArray(entry.hand)) {
        entry.hand = [];
      }
      return entry.hand;
    });

    // Clear every player's hand before dealing new cards.
    // This prevents duplicate/leftover cards from a previous round
    // from remaining in a player's hand when a new round is dealt.
    for (let p = 0; p < 4; p++) {
      hands[p].length = 0;
    }

if (this.cards.length !== 52) {
    this.reset();
}

    // Deal cards one at a time in round-robin order (the way cards
    // are dealt around a real table), continuing until each of the
    // 4 hands has exactly 13 cards (13 * 4 = 52 total cards).
    let cardIndex = 0;
    const cardsPerPlayer = 13;

    for (let round = 0; round < cardsPerPlayer; round++) {
      for (let p = 0; p < 4; p++) {
        // Take the next card from the top of the deck's card array.
        const card = this.cards[cardIndex];
        cardIndex++;

        // Add the dealt card into the corresponding player's hand.
        hands[p].push(card);
      }
    }

    // After dealing is complete, automatically sort every player's
    // hand into the standard suit/rank order used by this game.
    for (let p = 0; p < 4; p++) {
      const sorted = Deck.sortHand(hands[p]);

      // Replace the hand's contents in place (rather than reassigning
      // the array reference) so that any external references to the
      // original array/object.hand remain valid and up to date.
      hands[p].length = 0;
      for (let i = 0; i < sorted.length; i++) {
        hands[p].push(sorted[i]);
      }
    }

    return players;
  }

  /**
   * Fully resets the deck: clears any existing cards, rebuilds a
   * fresh standard 52-card deck, and shuffles it. Useful at the
   * start of a new round/game to guarantee a clean, randomized deck.
   * @returns {Card[]} The freshly built and shuffled array of cards.
   */
  reset() {
    // Clear out any cards currently in the deck.
    this.cards = [];

    // Rebuild a complete standard 52-card deck.
    this.build();

    // Shuffle the newly built deck using the fair Fisher-Yates algorithm.
    this.shuffle();

    return this.cards;
  }

  /**
   * Returns how many cards currently remain in the deck.
   * Useful for UI display or for checking if the deck is empty
   * before attempting to draw a card.
   * @returns {number} The number of cards left in this.cards.
   */
  remainingCards() {
    return this.cards.length;
  }

  /**
   * Removes and returns the top card of the deck (the card at the
   * front of the this.cards array). If the deck is empty, returns
   * null instead of throwing an error.
   * @returns {Card|null} The drawn card, or null if the deck is empty.
   */
  draw() {
    // If there are no cards left in the deck, there is nothing to draw.
    if (this.cards.length === 0) {
      return null;
    }

    // Remove and return the card at the front of the array
    // (the "top" of the deck).
    return this.cards.shift();
  }

  /**
   * Sorts an array of Card objects into the standard Call Bridge
   * hand order:
   *
   *   1. Primary sort key: suit, in the fixed order
   *      Spades > Hearts > Clubs > Diamonds
   *   2. Secondary sort key: rank, in ascending order
   *      2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A
   *
   * This is implemented as a static method so it can be called
   * either as `Deck.sortHand(someHand)` without needing a Deck
   * instance, or reused internally by deal().
   *
   * @param {Card[]} hand - The array of Card objects to sort.
   * @returns {Card[]} A new array containing the same Card objects,
   *                    sorted into the standard order.
   */
  static sortHand(hand) {
    // Create a shallow copy of the input array so the original
    // array reference passed in is not mutated unexpectedly by sort().
    const copy = hand.slice();

    copy.sort((cardA, cardB) => {
      // Determine each card's suit priority using its position
      // in the SUITS constant (0 = Spades ... 3 = Diamonds).
      const suitDiff = SUITS.indexOf(cardA.suit) - SUITS.indexOf(cardB.suit);

      // If the cards are in different suits, sort by suit priority first.
      if (suitDiff !== 0) {
        return suitDiff;
      }

      // If the cards share the same suit, sort by ascending rank value
      // (2 is lowest, Ace is highest).
      return cardA.value - cardB.value;
    });

    return copy;
  }
      }
