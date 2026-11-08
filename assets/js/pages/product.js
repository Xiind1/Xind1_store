/* Product page: Store.pages.product(product, section).
   Heading with breadcrumb and status badge, a sticky quick-navigation dock (sliding indicator,
   scroll-spy, animated scrolling to sections, #product=…&section=… kept in the address bar),
   the media gallery (lightbox images, YouTube, video), the flat feature list or collapsible
   feature groups, system requirements and the sticky purchase panel with period selection. */
(function () {
  "use strict";

  const Store = window.Store;
  if (!Store) return;

  const { esc, ui, tr, trList } = Store;

  const SECTIONS = ["media", "features", "requirements"];
  const SECTION_IDS = { media: "product-media", features: "product-features", requirements: "product-requirements" };
  // Past this many feature groups, titles shaped "PARENT · CHILD" are nested under their parent.
  const NEST_AFTER = 20;
  const NEST_SEPARATOR = " · ";
  // One slow-in / slow-out curve for anchor scrolls and the feature-group collapse glide.
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------------------------------------------------------------- state */

  let product = null; // product on screen
  let selected = -1; // index of the chosen offer in product.offers
  let preferredPeriod = "1"; // last chosen period, reused on the next product that offers it

  let anchorFrame = 0; // running anchor scroll (rAF id)
  let glideFrame = 0; // running collapse glide (rAF id)
  let anchorScrolling = false;
  let pinnedY = null; // scroll position where a dock jump ended; the clicked link stays active there
  let scrollLocked = false;
  const groupAnimations = new WeakMap();

  /* -------------------------------------------------------------- helpers */

  const html = document.documentElement;
  const main = () => Store.main;
  const nav = () => (main() ? main().querySelector(".product-anchor-nav") : null);
  const sectionEl = (section) => document.getElementById(SECTION_IDS[section] || "");
  const sections = () => Store.data.settings.sections;

  // Programmatic scrolling must not pick up html { scroll-behavior: smooth }.
  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    html.style.scrollBehavior = "auto";
  }

  function unlockScroll() {
    if (!scrollLocked || anchorFrame || glideFrame) return;
    scrollLocked = false;
    html.style.scrollBehavior = "";
  }

  function setScrollTop(y) {
    (document.scrollingElement || html).scrollTop = y;
  }

  // Layout position (ignores the reveal transform), like the reference.
  function documentTop(el) {
    let top = 0;
    for (let node = el; node; node = node.offsetParent) top += node.offsetTop || 0;
    return top;
  }

  // Distance from the viewport top at which a section heading should land: below the dock.
  function anchorOffset() {
    const topbar = document.querySelector(".topbar");
    const dock = nav();
    const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 85;
    const dockHeight = dock ? dock.getBoundingClientRect().height : 56;
    const stickyTop = dock ? parseFloat(getComputedStyle(dock).top) : topbarHeight;
    const dockTop = Number.isFinite(stickyTop) ? Math.max(topbarHeight, stickyTop) : topbarHeight;
    return Math.round(dockTop + dockHeight + 18);
  }

  function replaceHash(section) {
    if (!product) return;
    const next = Store.href.product(product.id, section);
    if (window.location.hash === next) return;
    try {
      history.replaceState(null, "", next); // no hashchange, so no re-render
    } catch (e) {
      /* history unavailable (sandboxed frame) — the address bar simply isn't updated */
    }
  }

  /* --------------------------------------------------- quick-navigation dock */

  // Moves the sliding highlight under the active link; scrollable docks centre that link.
  function positionIndicator() {
    const dock = nav();
    const active = dock && dock.querySelector(".product-anchor-link.is-active");
    if (!dock || !active) return;
    const dr = dock.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    // scrollLeft keeps the value independent of the dock's own horizontal scroll position.
    dock.style.setProperty("--anchor-indicator-x", `${ar.left - dr.left + dock.scrollLeft}px`);
    dock.style.setProperty("--anchor-indicator-y", `${ar.top - dr.top}px`);
    dock.style.setProperty("--anchor-indicator-w", `${ar.width}px`);
    dock.style.setProperty("--anchor-indicator-h", `${ar.height}px`);
    dock.style.setProperty("--anchor-indicator-visible", "1");
    if (dock.scrollWidth > dock.clientWidth + 1) {
      const left = active.offsetLeft - (dock.clientWidth - active.offsetWidth) / 2;
      dock.scrollTo({ left: Math.max(0, left), behavior: Store.reducedMotion() ? "auto" : "smooth" });
    }
  }

  function setActive(section, updateHash) {
    const dock = nav();
    if (!dock) return;
    let changed = false;
    dock.querySelectorAll("[data-product-anchor]").forEach((link) => {
      const on = link.dataset.productAnchor === section;
      if (on && !link.classList.contains("is-active")) changed = true;
      link.classList.toggle("is-active", on);
      link.setAttribute("aria-current", on ? "location" : "false");
    });
    if (changed || !dock.style.getPropertyValue("--anchor-indicator-visible")) requestAnimationFrame(positionIndicator);
    if (updateHash) replaceHash(section);
  }

  // Scroll-spy: the last section whose top has passed the line under the dock is active.
  function syncFromScroll() {
    if (anchorScrolling || !product || !nav()) return;
    if (pinnedY !== null) {
      if (Math.abs(window.scrollY - pinnedY) < 2) return;
      pinnedY = null;
    }
    const line = anchorOffset() + 18;
    let active = "";
    for (const section of SECTIONS) {
      const el = sectionEl(section);
      if (!el) continue;
      if (!active) active = section;
      if (documentTop(el) - window.scrollY <= line) active = section;
      else break;
    }
    if (active) setActive(active, true);
  }

  // Eased scroll towards targetTop(); the target is re-read every frame because lazy images
  // above it may still change the layout while the page moves.
  function animateScroll(targetTop, done) {
    cancelAnimationFrame(anchorFrame);
    anchorFrame = 0;
    lockScroll();
    const start = window.scrollY;
    const distance = targetTop() - start;
    if (Store.reducedMotion() || Math.abs(distance) < 2) {
      setScrollTop(start + distance);
      unlockScroll();
      done();
      return;
    }
    const duration = Math.min(860, Math.max(520, 420 + Math.abs(distance) * 0.18));
    const began = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration);
      setScrollTop(Math.round(start + (targetTop() - start) * easeInOut(progress)));
      if (progress < 1) {
        anchorFrame = requestAnimationFrame(step);
        return;
      }
      anchorFrame = 0;
      unlockScroll();
      done();
    };
    anchorFrame = requestAnimationFrame(step);
  }

  // Brief highlight + sheen on the section the dock just scrolled to.
  function playArrival(target) {
    target.classList.remove("anchor-arrival");
    void target.offsetWidth; // restart the animation
    target.classList.add("anchor-arrival");
    setTimeout(() => target.classList.remove("anchor-arrival"), 1050);
  }

  function scrollToSection(section) {
    const target = sectionEl(section);
    if (!target || !target.isConnected) return;
    anchorScrolling = true;
    pinnedY = null;
    setActive(section, false);
    replaceHash(section);
    animateScroll(
      () => Math.max(0, Math.round(documentTop(target) - anchorOffset())),
      () => {
        anchorScrolling = false;
        if (!target.isConnected) return;
        // The page bottom may stop short of the section; keep the clicked link active there.
        pinnedY = window.scrollY;
        setActive(section, false);
        playArrival(target);
      },
    );
  }

  /* --------------------------------------------------------- feature groups */

  function glideScroll(start, distance, duration) {
    cancelAnimationFrame(glideFrame);
    glideFrame = 0;
    if (Store.reducedMotion()) {
      lockScroll();
      setScrollTop(start + distance);
      unlockScroll();
      return;
    }
    lockScroll();
    const began = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration);
      setScrollTop(Math.round(start + distance * easeInOut(progress)));
      if (progress < 1) {
        glideFrame = requestAnimationFrame(step);
        return;
      }
      glideFrame = 0;
      unlockScroll();
    };
    glideFrame = requestAnimationFrame(step);
  }

  // <details> snaps open and shut; animate the body instead. Closing also glides the page
  // back to the group heading on the same duration and curve, so both read as one motion.
  function toggleGroup(card, open) {
    const body = card.querySelector(":scope > .help-card-body");
    const running = groupAnimations.get(card);
    if (running) running.cancel();
    const closedTop = () => Math.max(0, Math.round(documentTop(card) - anchorOffset()));

    if (!body || Store.reducedMotion() || typeof body.animate !== "function") {
      const target = open ? window.scrollY : closedTop();
      card.open = open;
      if (window.scrollY > target + 1) {
        lockScroll();
        setScrollTop(target);
        unlockScroll();
      }
      return;
    }

    const style = getComputedStyle(body);
    const from = card.open ? body.getBoundingClientRect().height : 0;
    card.open = true;
    body.style.overflow = "hidden";
    const to = open ? body.scrollHeight : 0;
    const shut = { height: "0px", paddingTop: "0px", paddingBottom: "0px", opacity: 0 };
    const full = {
      height: `${open ? to : from}px`,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      opacity: 1,
    };
    const scrollFrom = window.scrollY;
    const scrollTarget = open ? scrollFrom : closedTop();
    const scrollBy = scrollFrom > scrollTarget + 1 ? scrollTarget - scrollFrom : 0;
    const duration = Math.min(640, Math.max(260, Math.max(Math.abs(to - from), Math.abs(scrollBy)) * 0.34));
    const anim = body.animate(open ? [shut, full] : [full, shut], { duration, easing: "cubic-bezier(.65,0,.35,1)" });
    groupAnimations.set(card, anim);
    // While closing, keep the document tall so the scroll position is not clamped mid-glide.
    if (!open) document.body.style.minHeight = `${document.body.scrollHeight}px`;
    const settle = () => {
      body.style.overflow = "";
      document.body.style.minHeight = "";
      groupAnimations.delete(card);
    };
    anim.onfinish = () => {
      card.open = open;
      settle();
    };
    anim.oncancel = settle;
    if (scrollBy) glideScroll(scrollFrom, scrollBy, duration);
  }

  /* ---------------------------------------------------------------- markup */

  const soonBadge = () => `<span class="product-status-badge is-soon">${esc(ui("product.soonBadge"))}</span>`;

  function sectionHtml(key, number, title, caption, body) {
    return (
      `<section class="product-section" id="${SECTION_IDS[key]}"><span class="section-number">${number}</span>` +
      `<h2>${esc(title)}</h2><p class="caption">${esc(caption)}</p>${body}</section>`
    );
  }

  function anchorsHtml(p) {
    const links = SECTIONS.map((section, i) => {
      const active = i === 0;
      return (
        `<a class="product-anchor-link${active ? " is-active" : ""}" data-product-anchor="${section}" ` +
        `href="${esc(Store.href.product(p.id, section))}" aria-current="${active ? "location" : "false"}">` +
        `${esc(ui(`product.anchor.${section}`))}</a>`
      );
    }).join("");
    return `<nav class="product-anchor-nav" aria-label="${esc(ui("product.anchorNav"))}">${links}</nav>`;
  }

  function mediaItemHtml(m, index) {
    const caption = tr(m.caption).trim();
    const captionHtml = caption
      ? `<p data-error-note="${esc(ui("product.media.errorNote"))}">${esc(caption)}</p>`
      : "";
    if (m.type === "youtube") {
      const src = Store.youtube(m.url);
      if (!src) return "";
      return (
        `<div class="media-box"><iframe src="${esc(src)}" title="${esc(caption || ui("product.media.videoTitle"))}" ` +
        `loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen ` +
        `referrerpolicy="strict-origin-when-cross-origin"></iframe>${captionHtml}</div>`
      );
    }
    if (m.type === "video") {
      const src = Store.mediaUrl(m.url, false);
      if (!src) return "";
      return (
        `<div class="media-box"><video src="${esc(src)}" controls preload="metadata" playsinline ` +
        `aria-label="${esc(caption || ui("product.media.videoTitle"))}"></video>${captionHtml}</div>`
      );
    }
    const label = ui("product.media.zoom", { name: caption || ui("product.media.imageWord") });
    return (
      `<div class="media-box" data-fallback-host><button type="button" data-image="${index}" aria-label="${esc(label)}">` +
      `<img src="${esc(Store.mediaUrl(m.url, true))}" alt="${esc(caption || ui("product.media.imageAlt"))}" ` +
      `loading="lazy" data-fallback></button>${captionHtml}</div>`
    );
  }

  function mediaHtml(p) {
    const items = p.media.map(mediaItemHtml).filter(Boolean);
    const body = items.length
      ? `<div class="gallery">${items.join("")}</div>`
      : `<div class="media-missing"><span class="large-icon">${Store.icons.media}</span>` +
        `<strong>${esc(ui("product.media.emptyTitle"))}</strong><p>${esc(ui("product.media.emptyText"))}</p></div>`;
    return sectionHtml("media", "01", ui("product.media.title"), ui("product.media.caption"), body);
  }

  // `label` replaces the shown text (empty-state row) while the icon still follows `text`.
  function featureItemHtml(text, index, label) {
    const shown = label === undefined ? text : label;
    return `<li><span class="feature-icon">${Store.featureIcon(text, index)}</span><span>${esc(shown)}</span></li>`;
  }

  const featureListHtml = (items) =>
    `<ul class="feature-list">${items.map((item, i) => featureItemHtml(item, i)).join("")}</ul>`;

  function groupCardHtml(label, meta, body, index, modifier) {
    return (
      `<details class="help-card full-feature-group${modifier}"><summary><div>` +
      `<span class="help-type">${String(index + 1).padStart(2, "0")}</span><h3>${esc(label)}</h3>` +
      `<p class="help-summary">${esc(meta)}</p></div><span class="help-toggle" aria-hidden="true">+</span></summary>` +
      `<div class="help-card-body">${body}<button type="button" class="feature-collapse" data-feature-collapse>` +
      `${esc(ui("product.features.collapse"))} <span aria-hidden="true">↑</span></button></div></details>`
    );
  }

  const featureCount = (n) => Store.count(n, "noun.feature");

  function featureGroupsHtml(groups) {
    const list = groups.map((g) => ({ title: tr(g.title).trim() || ui("common.untitled"), items: trList(g.items) }));
    const nest = list.length > NEST_AFTER && list.some((g) => g.title.includes(NEST_SEPARATOR));
    if (!nest) {
      return list
        .map((g, i) => groupCardHtml(g.title, featureCount(g.items.length), featureListHtml(g.items), i, ""))
        .join("");
    }
    // Long lists: "PARENT · CHILD" titles become an outer tier, in first-seen order.
    const parents = new Map();
    list.forEach((g) => {
      const at = g.title.indexOf(NEST_SEPARATOR);
      const parent = at > 0 ? g.title.slice(0, at) : g.title;
      const child = at > 0 ? g.title.slice(at + NEST_SEPARATOR.length) : "";
      if (!parents.has(parent)) parents.set(parent, []);
      parents.get(parent).push({ group: g, child });
    });
    return Array.from(parents, ([parent, kids], index) => {
      const total = kids.reduce((n, k) => n + k.group.items.length, 0);
      const body = kids
        .map((k, i) =>
          k.child
            ? groupCardHtml(k.child, featureCount(k.group.items.length), featureListHtml(k.group.items), i, " is-nested")
            : featureListHtml(k.group.items),
        )
        .join("");
      const meta = `${Store.count(kids.length, "noun.section")} · ${featureCount(total)}`;
      return groupCardHtml(parent, meta, body, index, " is-parent");
    }).join("");
  }

  function featuresHtml(p) {
    if (p.featureGroups.length) {
      const body = `<div class="help-product-section-list">${featureGroupsHtml(p.featureGroups)}</div>`;
      return sectionHtml("features", "02", ui("product.features.title"), ui("product.features.groupsCaption"), body);
    }
    const items = trList(p.features);
    const body = items.length
      ? featureListHtml(items)
      : `<ul class="feature-list">${featureItemHtml("", 0, ui("product.features.empty"))}</ul>`;
    return sectionHtml("features", "02", ui("product.features.title"), ui("product.features.caption"), body);
  }

  function requirementsHtml(p) {
    const rows = trList(p.requirements);
    const list = rows.length
      ? `<dl class="req-list">${rows.map(([k, v]) => `<div class="req-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
      : `<dl class="req-list"></dl><p class="req-empty">${esc(ui("product.requirements.empty"))}</p>`;
    const hint = sections().guide
      ? `<div class="detail-hint">${esc(ui("product.requirements.hint"))}<br><a href="#guide">` +
        `${esc(ui("product.requirements.hintLink"))} <span aria-hidden="true">↗</span></a></div>`
      : "";
    return sectionHtml(
      "requirements",
      "03",
      ui("product.requirements.title"),
      ui("product.requirements.caption"),
      list + hint,
    );
  }

  function trustHtml() {
    const items = Store.data.settings.trust;
    if (!items.length) return "";
    const rows = items.map((t) => {
      const title = tr(t.title).trim();
      const text = tr(t.text).trim();
      return (
        `<div><span>${Store.trustIcon(t.icon)}</span><p>${title ? `<b>${esc(title)}</b>` : ""}` +
        `${text ? `<small>${esc(text)}</small>` : ""}</p></div>`
      );
    });
    return `<div class="trust-list">${rows.join("")}</div>`;
  }

  function periodsHtml(p) {
    if (!p.offers.length) return "";
    const buttons = p.offers.map((offer, i) => {
      const on = i === selected;
      return (
        `<button type="button" class="period${on ? " active" : ""}" data-period="${i}" aria-pressed="${on}">` +
        `<b>${esc(Store.formatPeriod(offer))}</b></button>`
      );
    });
    return `<div class="periods" role="group" aria-label="${esc(ui("purchase.periods"))}">${buttons.join("")}</div>`;
  }

  // Status line, buy button and notes below the period buttons (re-rendered on period change).
  function purchaseActionHtml(p) {
    const agreement = sections().agreement
      ? `<p class="purchase-note"><a href="#agreement" class="agreement-buy">${esc(ui("purchase.agreement"))} ↗</a></p>`
      : "";
    if (Store.isSoon(p)) {
      return (
        `<div class="purchase-soon">${soonBadge()}<strong>${esc(ui("purchase.soon.heading"))}</strong>` +
        `<p>${esc(ui("purchase.soon.text"))}</p></div>` +
        `<button type="button" class="btn light" disabled>${esc(ui("purchase.soon.button"))} <span aria-hidden="true">↗</span></button>` +
        agreement
      );
    }
    const offer = p.offers[selected] || null;
    const url = offer ? Store.safeUrl(offer.url) : "";
    const status = url ? ui("purchase.selected", { period: Store.formatPeriod(offer) }) : ui("purchase.noOffer");
    const button = url
      ? `<a class="btn light has-note" href="${esc(url)}" target="_blank" rel="noopener noreferrer">` +
        `<span class="btn-main">${esc(ui("purchase.buy"))} <span aria-hidden="true">↗</span></span>` +
        `<small class="btn-note">${esc(ui("purchase.buyNote"))}</small></a>`
      : `<button type="button" class="btn light" disabled>${esc(ui("purchase.buy"))} <span aria-hidden="true">↗</span></button>`;
    return (
      `<p class="purchase-status ${url ? "is-ready" : "is-empty"}"><span class="purchase-status-dot" aria-hidden="true"></span>` +
      `<span>${esc(status)}</span></p>${button}${agreement}` +
      (url ? "" : `<p class="purchase-note">${esc(ui("purchase.buyLater"))}</p>`)
    );
  }

  function purchaseHtml(p) {
    const soon = Store.isSoon(p);
    return (
      `<aside class="purchase"><h2>${esc(ui(soon ? "purchase.soon.title" : "purchase.title"))}</h2>` +
      `${soon ? "" : trustHtml() + periodsHtml(p)}<div data-purchase-action></div><hr>` +
      `<p class="purchase-note">${esc(ui(soon ? "purchase.soon.note" : "purchase.note"))}</p></aside>`
    );
  }

  function pageHtml(p) {
    const game = Store.game(p.gameId);
    const gameName = game ? game.name : "";
    const description = tr(p.description).trim();
    const crumbGame = game
      ? `<a class="breadcrumb-game" href="${esc(Store.href.game(game.id))}">${esc(gameName)}</a>`
      : "";
    return (
      `<section class="detail-page">` +
      `<div class="breadcrumb"><a href="#catalog" class="link">← ${esc(ui("product.backToCatalog"))}</a>` +
      `${crumbGame ? `<span>/</span>${crumbGame}` : ""}</div>` +
      `<div class="detail-heading"><div><div class="detail-kicker"><span class="eyebrow">` +
      `${esc(ui("product.kicker", { game: gameName }))}</span>${Store.isSoon(p) ? soonBadge() : ""}</div>` +
      `<h1>${esc(p.name)}</h1>${description ? `<p>${esc(description)}</p>` : ""}</div></div>` +
      `<div class="detail-layout"><div class="detail-content product-stack">${anchorsHtml(p)}` +
      `${mediaHtml(p)}${featuresHtml(p)}${requirementsHtml(p)}</div>${purchaseHtml(p)}</div>` +
      `<div class="detail-footer">${Store.contactBand()}</div></section>`
    );
  }

  /* ---------------------------------------------------------------- render */

  function renderPurchase() {
    const root = main();
    const box = root && root.querySelector("[data-purchase-action]");
    if (!box || !product) return;
    box.innerHTML = purchaseActionHtml(product);
    root.querySelectorAll(".periods [data-period]").forEach((button) => {
      const on = Number(button.dataset.period) === selected;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", String(on));
    });
  }

  function choosePeriod(index) {
    if (!product || !product.offers[index]) return;
    selected = index;
    if (product.offers[index].period) preferredPeriod = product.offers[index].period;
    renderPurchase();
  }

  function openImage(button) {
    const m = product && product.media[Number(button.dataset.image)];
    const img = button.querySelector("img");
    if (m) Store.openLightbox(m.url, tr(m.caption).trim() || ui("product.media.imageAlt"));
    else if (img) Store.openLightbox(img.getAttribute("src"), img.alt);
  }

  function onPageClick(e) {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const anchor = t.closest("[data-product-anchor]");
    if (anchor) {
      // Modified clicks keep their browser meaning (new tab / window).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      scrollToSection(anchor.dataset.productAnchor);
      return;
    }
    const collapse = t.closest("[data-feature-collapse]");
    if (collapse) {
      const card = collapse.closest("details.full-feature-group");
      if (!card) return;
      toggleGroup(card, false);
      // The button disappears with the body: keep keyboard focus on the group heading.
      const summary = card.querySelector(":scope > summary");
      if (summary && document.activeElement === collapse) summary.focus({ preventScroll: true });
      return;
    }
    const summary = t.closest(".full-feature-group > summary");
    if (summary) {
      e.preventDefault();
      toggleGroup(summary.parentElement, !summary.parentElement.open);
      return;
    }
    const period = t.closest("[data-period]");
    if (period) {
      choosePeriod(Number(period.dataset.period));
      return;
    }
    const image = t.closest("[data-image]");
    if (image) openImage(image);
  }

  Store.pages.product = function renderProduct(p) {
    const root = main();
    if (!root || !p) return;
    product = p;
    const keep = preferredPeriod ? p.offers.findIndex((o) => o.period === preferredPeriod) : -1;
    selected = p.offers.length ? Math.max(0, keep) : -1;
    pinnedY = null;
    root.innerHTML = pageHtml(p);
    const page = root.querySelector(".detail-page");
    if (page) page.addEventListener("click", onPageClick);
    renderPurchase();
  };

  /* ----------------------------------------------------------------- hooks */

  // Stops every running scroll animation (route change, user takes over the scroll).
  function stopScrolling() {
    cancelAnimationFrame(anchorFrame);
    cancelAnimationFrame(glideFrame);
    anchorFrame = 0;
    glideFrame = 0;
    anchorScrolling = false;
    unlockScroll();
  }

  Store.beforeRender(() => {
    stopScrolling();
    pinnedY = null;
    product = null;
    document.body.style.minHeight = "";
  });

  Store.afterRender((route) => {
    if (route.name !== "product") return;
    positionIndicator();
    if (route.params.section) scrollToSection(route.params.section);
  });

  Store.onScroll(() => {
    if (Store.current.name === "product") syncFromScroll();
  });

  Store.onResize(() => {
    if (Store.current.name === "product") positionIndicator();
  });

  // Wheel, touch or keyboard scrolling hands control back to the user.
  function userTakesOver() {
    if (!anchorFrame && !glideFrame) return;
    const wasAnchoring = anchorScrolling;
    stopScrolling();
    if (wasAnchoring) requestAnimationFrame(syncFromScroll);
  }

  const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
  window.addEventListener("wheel", userTakesOver, { passive: true });
  window.addEventListener("touchstart", userTakesOver, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (SCROLL_KEYS.has(e.key)) userTakesOver();
  });
})();
