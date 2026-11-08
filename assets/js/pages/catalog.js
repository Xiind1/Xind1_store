/* Catalog pages.
   Store.pages.home(): hero with catalog counters, game grid with live search, contact band.
   Store.pages.game(game): game header (count, description, tags, search) and product cards.
   core.js routes here, binds the chrome and applies reveal motion after every render. */
(function () {
  "use strict";

  const S = window.Store;
  if (!S) return;

  const esc = S.esc;
  const ui = S.ui;
  const EXCERPT_LENGTH = 125; // card description length, as in the reference

  // Counter icons (gamepad, cube); stroke styling lives in catalog.css.
  const STAT_ICONS = {
    games:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l3 9a2 2 0 0 1-3 2l-2-2H9l-2 2a2 2 0 0 1-3-2L7 8Z"/><path d="M8 12h4m-2-2v4m6-2h.01"/></svg>',
    products:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
  };

  /* ------------------------------------------------------------ page state */

  // Search queries survive a re-render of the same route (language switch) and reset on navigation.
  const query = { games: "", products: "" };
  let previousHash = null;

  S.beforeRender((prev) => {
    previousHash = prev ? prev.hash : null;
  });

  const sameRoute = () => previousHash === S.current.hash;
  const norm = (value) => String(value || "").trim().toLowerCase();

  /* --------------------------------------------------------------- helpers */

  // "K1" → "K/1": the brand mark shown on cards without an image.
  function splitMark() {
    const chars = Array.from(S.data.settings.brand.mark);
    return chars.length > 1 ? `${chars[0]}/${chars.slice(1).join("")}` : chars.join("");
  }

  // Plain-text card excerpt: link/bold markers dropped, whitespace collapsed, cut like the reference.
  function excerpt(value) {
    const text = S.tr(value)
      .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return Array.from(text).slice(0, EXCERPT_LENGTH).join("");
  }

  // Decorative card image (the name is in the heading); a broken file swaps to the
  // fallback image via core's [data-fallback] handler.
  function image(src, className) {
    const cls = className ? ` class="${className}"` : "";
    return `<img${cls} src="${esc(src)}" alt="" data-fallback>`;
  }

  function tagList(game) {
    const tags = S.trList(game.tags);
    if (!tags.length) return "";
    return `<div class="game-card-meta">${tags.map((tag) => `<span class="game-tag">${esc(tag)}</span>`).join("")}</div>`;
  }

  function searchField(id, label, value) {
    return (
      `${S.icons.search}<input id="${id}" type="search" placeholder="${esc(label)}" aria-label="${esc(label)}"` +
      ` autocomplete="off" spellcheck="false" value="${esc(value)}">`
    );
  }

  /* ------------------------------------------------------------------ home */

  function statItem(icon, n, nounKey) {
    return (
      `<div class="stat-item"><span class="stat-icon">${icon}</span>` +
      `<p><strong>${n}+</strong><span>${esc(S.plural(n, nounKey))}</span></p></div>`
    );
  }

  function heroHtml(gameCount) {
    return (
      `<section class="hero" data-mark="${esc(S.data.settings.brand.mark)}">` +
      `<div>` +
      `<div class="hero-label"><span class="short-line"></span><span class="eyebrow">${esc(ui("home.hero.eyebrow"))}</span></div>` +
      `<h1>${esc(ui("home.hero.title"))}<br><span>${esc(ui("home.hero.accent"))}</span></h1>` +
      `<p class="hero-copy">${esc(ui("home.hero.text"))}</p>` +
      `<div class="hero-actions">` +
      `<a class="btn light" href="#catalog">${esc(ui("home.hero.cta"))} <span class="arrow" aria-hidden="true">↗</span></a>` +
      `<a class="link" href="#guide" data-requires="guide">${esc(ui("home.hero.check"))} →</a>` +
      `</div></div>` +
      `<aside class="catalog-stats">` +
      `<div class="stats-head"><span class="eyebrow">${esc(ui("home.stats.title"))}</span>` +
      `<span class="stats-live"><i aria-hidden="true"></i>${esc(ui("home.stats.live"))}</span></div>` +
      `<div class="stats-grid">` +
      statItem(STAT_ICONS.games, gameCount, "noun.game") +
      statItem(STAT_ICONS.products, S.products().length, "noun.product") +
      `</div></aside></section>`
    );
  }

  function gameCard(game) {
    const cover = S.gameCover(game);
    const count = S.productsOf(game.id).length;
    return (
      `<article class="game-card" data-game-name="${esc(norm(game.name))}"><a href="${esc(S.href.game(game.id))}">` +
      `<div class="game-card-art" data-fallback-host>${cover ? image(cover.url) : ""}<span class="game-art-shade"></span></div>` +
      `<div class="game-card-body"><h3>${esc(game.name)}</h3>${tagList(game)}` +
      `<span>${esc(S.count(count, "noun.product"))} <b aria-hidden="true">→</b></span></div>` +
      `</a></article>`
    );
  }

  function catalogHtml(games) {
    const emptyKey = games.length ? "home.catalog.empty" : "home.catalog.none";
    return (
      `<section class="section catalog-section" id="catalog">` +
      `<div class="catalog-head-compact"><div class="catalog-head-copy">` +
      `<div class="eyebrow">${esc(ui("home.catalog.eyebrow"))}</div>` +
      `<h2>${esc(ui("home.catalog.title"))}</h2><p>${esc(ui("home.catalog.text"))}</p></div>` +
      `<label class="search catalog-search">${searchField("game-search", ui("home.catalog.search"), query.games)}</label></div>` +
      `<div class="game-catalog" id="game-catalog">${games.map(gameCard).join("")}</div>` +
      `<div class="empty" id="game-search-empty"${games.length ? " hidden" : ""}><h3>${esc(ui(emptyKey))}</h3></div>` +
      `</section>`
    );
  }

  // Live filter by game name; the grid keeps its markup, cards are only hidden.
  function filterGames() {
    const main = S.main;
    const q = norm(query.games);
    let shown = 0;
    S.$$("#game-catalog .game-card", main).forEach((card) => {
      const match = (card.dataset.gameName || "").includes(q);
      card.hidden = !match;
      if (match) shown++;
    });
    const empty = S.$("#game-search-empty", main);
    if (empty) empty.hidden = shown > 0;
  }

  S.pages.home = function () {
    if (!sameRoute()) query.games = "";
    const games = S.games();
    S.main.innerHTML =
      heroHtml(games.length) + catalogHtml(games) + `<section class="help help-single">${S.contactBand()}</section>`;
    const input = S.$("#game-search", S.main);
    if (!input) return;
    input.addEventListener("input", () => {
      query.games = input.value;
      filterGames();
    });
    if (query.games) filterGames();
  };

  /* ------------------------------------------------------------- game page */

  function cardCover(product) {
    const { card } = product;
    if (card.image) return image(S.mediaUrl(card.image, true), card.mode === "logo" ? "product-brand-logo" : "");
    const first = product.media.find((m) => m.type === "image");
    if (first) return image(S.mediaUrl(first.url, true));
    return `<div class="cover-grid"></div><span class="cover-type" aria-hidden="true">${esc(splitMark())}</span>`;
  }

  function productCard(product) {
    const soon = S.cardSoon(product);
    const status = soon
      ? `<div class="product-cover-status"><strong>${esc(ui("card.soonBadge"))}</strong><span>${esc(ui("card.soonText"))}</span></div>`
      : "";
    return (
      `<article class="product-card${soon ? " is-soon" : ""}"><a href="${esc(S.href.product(product.id))}">` +
      `<div class="product-cover" data-fallback-host>${cardCover(product)}${status}</div>` +
      `<div class="product-content"><h3>${esc(product.name)}</h3><p>${esc(excerpt(product.description))}</p>` +
      `<div class="card-footer"><span>${esc(ui(soon ? "card.soonFooter" : "card.details"))}</span><span aria-hidden="true">↗</span></div>` +
      `</div></a></article>`
    );
  }

  // Filters by name and lists available cards first (stable order otherwise).
  function renderCards(products, animate) {
    const main = S.main;
    const grid = S.$("#product-grid", main);
    if (!grid) return;
    const q = norm(query.products);
    const list = products
      .filter((p) => norm(p.name).includes(q))
      .sort((a, b) => Number(S.cardSoon(a)) - Number(S.cardSoon(b)));
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty"><h3>${esc(ui("game.empty"))}</h3></div>`;
    const counter = S.$("#catalog-count", main);
    if (counter) counter.textContent = ui("game.shown", { count: list.length });
    if (animate) {
      requestAnimationFrame(() => {
        if (grid.isConnected) S.enhanceMotion(grid);
      });
    }
  }

  S.pages.game = function (game) {
    if (!sameRoute()) query.products = "";
    const products = S.productsOf(game.id);
    const description = S.tr(game.description).trim() || ui("game.defaultDescription", { game: game.name });
    S.main.innerHTML =
      `<section class="game-page">` +
      `<a class="link game-back" href="#catalog">← ${esc(ui("game.back"))}</a>` +
      `<header class="game-page-head"><div class="game-page-copy">` +
      `<span class="eyebrow">${esc(ui("game.eyebrow"))}</span>` +
      `<div class="game-page-title-row"><h1>${esc(game.name)}</h1>` +
      `<span class="game-page-count">${esc(S.count(products.length, "noun.product"))}</span></div>` +
      `<p class="game-page-description">${esc(description)}</p>${tagList(game)}</div>` +
      `<label class="search game-page-search">${searchField("catalog-search", ui("game.search"), query.products)}</label>` +
      `</header>` +
      `<div class="product-grid" id="product-grid"></div>` +
      `<div class="catalog-bottom" id="catalog-count" aria-live="polite"></div>` +
      S.contactBand() +
      `</section>`;
    renderCards(products, false);
    const input = S.$("#catalog-search", S.main);
    if (!input) return;
    input.addEventListener("input", () => {
      query.products = input.value;
      renderCards(products, true);
    });
  };
})();
