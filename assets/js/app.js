/* Boot: runs after core.js and every page module, so all Store.pages renderers are registered. */
(function () {
  "use strict";
  if (window.Store && typeof window.Store.boot === "function") window.Store.boot();
  else console.error("[Store] core.js did not load — the storefront cannot start.");
})();
