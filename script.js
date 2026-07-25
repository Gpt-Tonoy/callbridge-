/* =========================================================
   script.js
   ---------------------------------------------------------
   Plain ES6 JavaScript file (NO modules, NO imports/exports).
   Loaded via: <script src="script.js"></script>
   Must load LAST, after deck.js, player.js, ai.js, bid.js,
   score.js, game.js, and ui.js.

   This is the single entry point for the Call Bridge game.
   Its only job is to wait for the DOM to be ready and then
   hand control over to UI.init() (defined in ui.js), which
   sets up the GameManager and wires up all the overlays and
   game flow.

   This file does NOT contain:
     - Any game rules, AI logic, or scoring logic
     - Any DOM rendering logic of its own
     - Any card/deck/player data structures
   All of that lives in the other js/ files; this file simply
   bootstraps the app once the page is ready.
   ========================================================= */

/**
 * Waits for the DOM to be fully parsed and ready, then starts
 * the game UI. Using DOMContentLoaded ensures every element
 * referenced by ui.js (overlays, buttons, seats, etc.) already
 * exists in the document before UI.init() tries to look them up.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Safety check: only start the UI if it was successfully
  // defined by ui.js. This avoids a confusing crash if ui.js
  // failed to load for some reason (e.g. a 404 or cache issue),
  // and instead fails clearly with a helpful console message.
  if (typeof UI !== "undefined" && typeof UI.init === "function") {
    UI.init();
  } else {
    console.error(
      "script.js: UI is not defined. Make sure js/ui.js loaded successfully before script.js."
    );
  }
});
