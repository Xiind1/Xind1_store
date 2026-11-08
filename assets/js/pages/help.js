/* Help centre and info pages (Store page module).
     Store.pages.help        #help             hero + search, sticky section nav, guide cards, game → product tree
     Store.pages.helpProduct #help-product=id  one product's articles with an in-page search and optional notice
     Store.pages.prelaunch   #before-launch    data.pages.prelaunch: rich-text blocks with optional images
     Store.pages.guide       #guide            data.pages.guide.steps with collapsible tutorials
     Store.pages.agreement   #agreement        data.pages.agreement: rich text, pending state, source link
   core.js resolves these routes (honouring settings.sections), sets the document titles and
   clears body.help-subnav-stuck on every route; this module keeps that class in sync while scrolling. */
(function () {
  "use strict";

  const Store = window.Store;
  if (!Store) return;
  const { esc, ui, tr, trList } = Store;

  const TREE_SEARCH_DELAY = 110; // ms between typing and re-rendering the help tree
  const PRODUCT_SEARCH_DELAY = 90; // ms between typing and re-rendering a product's articles
  // Article types listed under "Guides and setup" on a product page; all others are "Errors and fixes".
  const GUIDE_TYPES = ["prelaunch", "instruction", "setup"];

  const QUICK_ICONS = {
    prelaunch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6.5V12c0 4.4 2.8 7.2 7.5 9 4.7-1.8 7.5-4.6 7.5-9V6.5L12 3Z"/><path d="M9 12.2 11 14l4-4"/></svg>',
    guide:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    agreement:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
  };

  // Page state that survives re-renders (switching the language re-renders the current page).
  let treeQuery = ""; // help centre search: kept while browsing, so "back" returns to the same results
  let productQuery = ""; // product page search: cleared whenever a product page is entered
  let searchTimer = 0;
  let previousRoute = null; // route shown before the current render (from the beforeRender hook)

  /* ------------------------------------------------------------- helpers */

  // Escaped UI text where "\n" becomes a line break.
  const lines = (text) => esc(text).replace(/\n/g, "<br>");

  // Search key: case-insensitive, "ё" matches "е".
  const fold = (text) => String(text || "").toLowerCase().replace(/ё/g, "е");

  const emptyState = (title, text) =>
    `<div class="help-empty"><div><strong>${esc(title)}</strong><span>${esc(text)}</span></div></div>`;

  const backLink = (href, labelKey) => `<a class="link" href="${href}">← ${esc(ui(labelKey))}</a>`;

  const contact = () => `<div class="detail-footer">${Store.contactBand()}</div>`;

  /* ------------------------------------------------------------ articles */

  let articlesByProduct = null;

  // Articles grouped by product id, in data order (Store.data never changes after load).
  function articlesOf(productId) {
    if (!articlesByProduct) {
      articlesByProduct = new Map();
      for (const article of Store.data.help.articles) {
        if (!article.productId) continue;
        const list = articlesByProduct.get(article.productId);
        if (list) list.push(article);
        else articlesByProduct.set(article.productId, [article]);
      }
    }
    return articlesByProduct.get(productId) || [];
  }

  const searchCache = { ru: new WeakMap(), en: new WeakMap() };

  // Searchable text of an article in the current language, plus its game/product names and keywords.
  function articleText(article, product, game) {
    const cache = searchCache[Store.lang] || searchCache.ru;
    let text = cache.get(article);
    if (text === undefined) {
      text = fold(
        [
          game ? game.name : "",
          product ? product.name : "",
          tr(article.title),
          tr(article.summary),
          tr(article.problem),
          tr(article.solution),
          tr(article.note),
          ...trList(article.steps),
          ...article.keywords,
        ].join(" "),
      );
      cache.set(article, text);
    }
    return text;
  }

  // Accordion card; an article without any body fields becomes a static card.
  function articleCard(article) {
    const title = tr(article.title).trim() || ui("common.untitled");
    const summary = tr(article.summary).trim();
    const note = tr(article.note).trim();
    const steps = trList(article.steps)
      .map((step) => step.trim())
      .filter(Boolean);
    const block = (labelKey, html) =>
      `<div class="help-block"><span class="help-block-label">${esc(ui(labelKey))}</span>${html}</div>`;
    const field = (labelKey, value) => {
      const text = tr(value).trim();
      return text ? block(labelKey, `<p>${Store.richInline(text)}</p>`) : "";
    };
    const body = [
      field("help.article.problem", article.problem),
      field("help.article.solution", article.solution),
      steps.length
        ? block(
            "help.article.steps",
            `<ol class="help-steps">${steps.map((step) => `<li>${Store.richInline(step)}</li>`).join("")}</ol>`,
          )
        : "",
      note ? `<div class="help-note"><b>${esc(ui("help.article.note"))}:</b> ${Store.richInline(note)}</div>` : "",
      article.updated ? `<div class="help-updated">${esc(ui("common.updated"))}: ${esc(article.updated)}</div>` : "",
    ].join("");
    const head =
      `<div><span class="help-type">${esc(ui(`help.type.${article.type}`))}</span><h3>${esc(title)}</h3>` +
      `${summary ? `<p class="help-summary">${Store.richInline(summary)}</p>` : ""}</div>`;
    return body
      ? `<details class="help-card"><summary>${head}<span class="help-toggle" aria-hidden="true">+</span></summary><div class="help-card-body">${body}</div></details>`
      : `<div class="help-card"><div class="help-card-head">${head}</div></div>`;
  }

  /* -------------------------------------------------------- help centre */

  function sectionHead(id, prefix) {
    return (
      `<div class="help-section-head" id="${id}"><div><span class="eyebrow">${esc(ui(`${prefix}.eyebrow`))}</span>` +
      `<h2>${esc(ui(`${prefix}.title`))}</h2></div><p>${esc(ui(`${prefix}.text`))}</p></div>`
    );
  }

  // Cards for the general pages; a page whose section is switched off gets no card.
  function quickCards() {
    const { sections } = Store.data.settings;
    const { pages } = Store.data;
    const cards = [
      { key: "prelaunch", href: "#before-launch", title: tr(pages.prelaunch.title).trim() || ui("prelaunch.title") },
      sections.guide && { key: "guide", href: "#guide", title: ui("help.quick.guide.title") },
      sections.agreement && {
        key: "agreement",
        href: "#agreement",
        title: tr(pages.agreement.title).trim() || ui("nav.agreement"),
      },
    ].filter(Boolean);
    return cards
      .map(
        (card) =>
          `<a class="help-quick-card" href="${card.href}"><span class="help-quick-icon">${QUICK_ICONS[card.key]}</span>` +
          `<span class="help-type">${esc(ui(`help.quick.${card.key}.type`))}</span><h3>${esc(card.title)}</h3>` +
          `<p>${esc(ui(`help.quick.${card.key}.text`))}</p>` +
          `<span class="help-card-arrow">${esc(ui("common.open"))} <b aria-hidden="true">↗</b></span></a>`,
      )
      .join("");
  }

  function gameCover(game) {
    const cover = Store.gameCover(game);
    return cover
      ? `<span class="help-game-cover"><img src="${esc(cover.url)}" alt="" loading="lazy" data-fallback></span>`
      : `<span class="help-game-cover is-empty" aria-hidden="true">${esc(Store.data.settings.brand.mark)}</span>`;
  }

  function productLink(product, index) {
    return (
      `<a class="help-product-link" style="--i:${Math.min(index, 10)}" href="${esc(Store.href.helpProduct(product.id))}">` +
      `${Store.productIcon(product)}<strong>${esc(product.name)}</strong><span class="help-tree-toggle" aria-hidden="true">›</span></a>`
    );
  }

  // Game → product tree. With a query a product stays when its game/product name or any of its
  // articles matches, and every remaining game is opened.
  function treeHtml(query) {
    const games = [];
    for (const game of Store.games()) {
      const links = [];
      for (const product of Store.productsOf(game.id)) {
        const matches =
          !query ||
          fold(`${game.name} ${product.name}`).includes(query) ||
          articlesOf(product.id).some((article) => articleText(article, product, game).includes(query));
        if (matches) links.push(productLink(product, links.length));
      }
      if (!links.length) continue;
      games.push(
        `<details class="help-game"${query ? " open" : ""}><summary>${gameCover(game)}` +
          `<span class="help-game-title"><span class="help-game-kicker">${esc(ui("help.tree.game"))}</span><h3>${esc(game.name)}</h3></span>` +
          `<span class="help-tree-toggle" aria-hidden="true">›</span></summary>` +
          `<div class="help-game-body"><div class="help-products">${links.join("")}</div></div></details>`,
      );
    }
    if (games.length) return `<div class="help-tree">${games.join("")}</div>`;
    return query
      ? emptyState(ui("common.nothingFound"), ui("help.search.empty"))
      : emptyState(ui("help.empty.title"), ui("help.empty.text"));
  }

  function renderTree() {
    const grid = document.getElementById("help-grid");
    if (grid) grid.innerHTML = treeHtml(fold(treeQuery.trim()));
  }

  // Section nav: smooth-scroll to the section and move the highlight to the pressed button.
  function onJump(e) {
    const button = e.target instanceof Element ? e.target.closest("[data-help-jump]") : null;
    const target = button ? document.getElementById(button.dataset.helpJump) : null;
    if (!target) return;
    e.preventDefault();
    Store.$$("[data-help-jump]", e.currentTarget).forEach((b) => b.classList.toggle("is-active", b === button));
    target.scrollIntoView({ behavior: Store.reducedMotion() ? "auto" : "smooth", block: "start" });
  }

  const jumpButton = (id, labelKey, active) =>
    `<button type="button"${active ? ' class="is-active"' : ""} data-help-jump="${id}">${esc(ui(labelKey))}</button>`;

  Store.pages.help = function () {
    const mark = esc(Store.data.settings.brand.mark);
    const main = Store.main;
    main.innerHTML = [
      '<section class="help-page" id="help-top">',
      '<div class="help-hero"><div class="help-hero-content">',
      `<div class="help-hero-kicker"><span class="help-hero-mark">${mark}</span><span>${esc(ui("help.hero.kicker"))}</span></div>`,
      `<h1>${lines(ui("help.title"))}</h1>`,
      `<p>${esc(ui("help.hero.text"))}</p>`,
      `<div class="help-toolbar"><label class="search help-search">${Store.icons.search}`,
      `<input id="help-search" type="search" value="${esc(treeQuery)}" placeholder="${esc(ui("help.search.placeholder"))}"`,
      ` aria-label="${esc(ui("help.search.label"))}" autocomplete="off"></label></div>`,
      `</div><div class="help-hero-orbit" aria-hidden="true"><span>${mark}</span></div></div>`,
      `<div class="help-local-nav-wrap"><nav class="help-local-nav" aria-label="${esc(ui("help.nav.label"))}">`,
      jumpButton("help-top", "help.nav.top", true),
      jumpButton("help-guides", "help.nav.guides"),
      jumpButton("help-errors", "help.nav.errors"),
      "</nav></div>",
      sectionHead("help-guides", "help.guides"),
      `<div class="help-quick-grid">${quickCards()}</div>`,
      sectionHead("help-errors", "help.games"),
      '<div class="help-grid" id="help-grid"></div>',
      contact(),
      "</section>",
    ].join("");

    const input = Store.$("#help-search", main);
    input.addEventListener("input", () => {
      treeQuery = input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderTree, TREE_SEARCH_DELAY);
    });
    Store.$(".help-local-nav", main).addEventListener("click", onJump);
    renderTree();
  };

  /* -------------------------------------------------- product help page */

  // product.helpNotice banner: a link when it has a valid URL, plain block otherwise.
  function noticeHtml(notice) {
    if (!notice) return "";
    const title = tr(notice.title).trim() || ui("help.notice.title");
    const text = tr(notice.text).trim();
    const url = Store.safeUrl(notice.url);
    const inner =
      '<span class="help-notice-icon" aria-hidden="true">?</span>' +
      `<span class="help-notice-copy"><strong>${esc(title)}</strong>${text ? `<small>${esc(text)}</small>` : ""}</span>`;
    return url
      ? `<a class="help-notice" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}<b aria-hidden="true">↗</b></a>`
      : `<div class="help-notice">${inner}</div>`;
  }

  function articleSection(prefix, articles) {
    const body = articles.length
      ? `<div class="help-product-section-list">${articles.map(articleCard).join("")}</div>`
      : `<div class="help-product-section-empty">${esc(ui(`${prefix}.empty`))}</div>`;
    return (
      `<section class="help-product-section"><div class="help-product-section-head"><div><span>${esc(ui(`${prefix}.kicker`))}</span>` +
      `<h2>${esc(ui(`${prefix}.title`))}</h2></div></div>${body}</section>`
    );
  }

  // "Errors and fixes" is always shown (with an empty state); "Guides and setup" only when it has articles.
  function renderResults(product) {
    const target = document.getElementById("help-product-results");
    if (!target) return;
    const query = fold(productQuery.trim());
    const game = Store.game(product.gameId);
    const found = articlesOf(product.id).filter((article) => !query || articleText(article, product, game).includes(query));
    const errors = found.filter((article) => !GUIDE_TYPES.includes(article.type));
    const guides = found.filter((article) => GUIDE_TYPES.includes(article.type));
    const html =
      (errors.length || !query ? articleSection("help.product.errors", errors) : "") +
      (guides.length ? articleSection("help.product.guides", guides) : "");
    target.innerHTML = html || emptyState(ui("common.nothingFound"), ui("help.search.empty"));
    Store.enhanceMotion(target);
  }

  Store.pages.helpProduct = function (product) {
    const rerender = previousRoute && previousRoute.name === "helpProduct" && previousRoute.params.id === product.id;
    if (!rerender) productQuery = "";
    const game = Store.game(product.gameId);
    const main = Store.main;
    main.innerHTML = [
      '<section class="help-product-page"><div class="help-product-page-head">',
      `<div class="help-product-breadcrumb">${backLink("#help", "help.back")}<span aria-hidden="true">•</span>`,
      `<span>${esc(game ? game.name : ui("help.title"))}</span></div>`,
      `<div class="help-product-titleline">${Store.productIcon(product, "is-large")}`,
      `<div><span class="eyebrow">${esc(ui("help.product.eyebrow"))}</span><h1>${esc(product.name)}</h1></div></div>`,
      `<label class="search help-search help-product-search">${Store.icons.search}`,
      `<input id="help-product-search" type="search" value="${esc(productQuery)}" placeholder="${esc(ui("help.product.search.placeholder"))}"`,
      ` aria-label="${esc(ui("help.product.search.label"))}" autocomplete="off"></label>`,
      "</div>",
      noticeHtml(product.helpNotice),
      '<div class="help-product-page-list" id="help-product-results"></div>',
      contact(),
      "</section>",
    ].join("");

    const input = Store.$("#help-product-search", main);
    input.addEventListener("input", () => {
      productQuery = input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderResults(product), PRODUCT_SEARCH_DELAY);
    });
    renderResults(product);
  };

  /* --------------------------------------------------- before-launch page */

  function prelaunchImage(block, title) {
    const img =
      `<img class="general-prelaunch-image${block.imageSize === "small" ? " is-small" : ""}" src="${esc(Store.mediaUrl(block.image, true))}"` +
      ` alt="${esc(title)}" loading="lazy" data-fallback>`;
    const link = Store.safeUrl(block.imageLink);
    return link
      ? `<a class="general-prelaunch-image-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(ui("prelaunch.imageLink", { title }))}">${img}</a>`
      : img;
  }

  // Paragraphs, code blocks and the image are direct children, so the block's grid gap spaces them.
  function prelaunchBlock(block) {
    const title = tr(block.title).trim();
    const lead = tr(block.lead).trim();
    const body = tr(block.body).trim();
    const parts = [
      title ? `<h2>${esc(title)}</h2>` : "",
      // Store.rich emits bare <p> tags (content is escaped), so tagging them is safe.
      lead ? Store.rich(lead).replace(/<p>/g, '<p class="general-prelaunch-lead">') : "",
      body ? Store.rich(body) : "",
      block.image ? prelaunchImage(block, title) : "",
    ].join("");
    return parts ? `<section class="general-prelaunch-block">${parts}</section>` : "";
  }

  Store.pages.prelaunch = function () {
    const page = Store.data.pages.prelaunch;
    const intro = tr(page.intro).trim();
    const final = tr(page.final).trim();
    Store.main.innerHTML = [
      '<section class="help-prelaunch-page"><div class="help-prelaunch-page-head">',
      backLink("#help", "help.back"),
      `<span class="eyebrow">${esc(ui("prelaunch.eyebrow"))}</span>`,
      `<h1>${esc(tr(page.title).trim() || ui("prelaunch.title"))}</h1>`,
      intro ? `<div class="help-prelaunch-intro">${Store.rich(intro)}</div>` : "",
      '</div><div class="general-prelaunch-flow">',
      page.blocks.map(prelaunchBlock).join(""),
      final ? `<div class="general-prelaunch-final">${Store.richInline(final)}</div>` : "",
      "</div>",
      contact(),
      "</section>",
    ].join("");
  };

  /* ----------------------------------------------------------- PC check */

  function guideStep(step, index) {
    const title = tr(step.title).trim();
    const text = tr(step.text).trim();
    const tutorial = tr(step.tutorial).trim();
    const tutorialTitle = tr(step.tutorialTitle).trim() || ui("guide.tutorial");
    return [
      `<section class="guide-step"><span class="mono">${String(index + 1).padStart(2, "0")}</span><div>`,
      title ? `<h2>${esc(title)}</h2>` : "",
      text ? `<div class="guide-text">${Store.rich(text)}</div>` : "",
      tutorial
        ? `<details class="bios-tutorial"><summary>${esc(tutorialTitle)}<span aria-hidden="true">＋</span></summary><div>${Store.rich(tutorial)}</div></details>`
        : "",
      "</div></section>",
    ].join("");
  }

  Store.pages.guide = function () {
    const steps = Store.data.pages.guide.steps;
    Store.main.innerHTML = [
      '<article class="guide-page">',
      backLink("#catalog", "common.backToCatalog"),
      `<div class="eyebrow">${esc(ui("guide.eyebrow"))}</div>`,
      `<h1>${lines(ui("guide.title"))}</h1>`,
      `<p class="guide-intro">${lines(ui("guide.intro"))}</p>`,
      steps.length ? steps.map(guideStep).join("") : `<p class="guide-empty">${esc(ui("guide.empty"))}</p>`,
      contact(),
      "</article>",
    ].join("");
  };

  /* -------------------------------------------------------------- terms */

  Store.pages.agreement = function () {
    const page = Store.data.pages.agreement;
    const body = tr(page.body).trim();
    const url = Store.safeUrl(page.link.url);
    const label = tr(page.link.label).trim() || ui("agreement.link");
    Store.main.innerHTML = [
      '<article class="agreement-page">',
      backLink("#catalog", "common.backToCatalog"),
      `<div class="eyebrow">${esc(ui("agreement.eyebrow"))}</div>`,
      `<h1>${esc(tr(page.title).trim() || ui("nav.agreement"))}</h1>`,
      body
        ? `<div class="agreement-text">${Store.rich(body)}</div>`
        : `<div class="agreement-pending"><span class="tag">${esc(ui("agreement.pending.tag"))}</span>` +
          `<h2>${esc(ui("agreement.pending.title"))}</h2><p>${esc(ui("agreement.pending.text"))}</p></div>`,
      url
        ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`
        : "",
      "</article>",
    ].join("");
  };

  /* ----------------------------------------------- sticky sub-navigation */

  // While the section nav sits at its sticky offset, base.css hides the header (body.help-subnav-stuck).
  function syncSubnav() {
    if (Store.current.name !== "help") return;
    const wrap = document.querySelector(".help-local-nav-wrap");
    if (!wrap) return;
    const stickyTop = parseFloat(getComputedStyle(wrap).top) || 0;
    const stuck = window.scrollY > 24 && wrap.getBoundingClientRect().top <= stickyTop + 1;
    document.body.classList.toggle("help-subnav-stuck", stuck);
  }

  Store.onScroll(syncSubnav);
  Store.onResize(syncSubnav);
  Store.afterRender(syncSubnav);
  Store.beforeRender((prev) => {
    previousRoute = prev;
    clearTimeout(searchTimer); // a pending search must not render into the next page
  });
})();
