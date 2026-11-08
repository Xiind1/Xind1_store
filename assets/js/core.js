/* Storefront core: the window.Store namespace.
   Data normalisation, i18n, formatting and rich text, URL safety, icons, catalog lookups,
   hash router, header/footer chrome, scroll and motion effects, lightbox and toast.
   Page modules (assets/js/pages/*.js) register renderers on Store.pages;
   assets/js/app.js calls Store.boot() once every script is loaded. */
(function () {
  "use strict";

  const W = window;
  const D = document;

  const LANGS = ["ru", "en"];
  const THEMES = ["dark", "light"];
  const SECTION_KEYS = ["help", "guide", "agreement", "english", "cursorGlow"];
  const PRODUCT_ICONS = ["letter", "spark", "bolt", "ghost", "target", "eye", "wave", "shield"];
  const TRUST_ICONS = ["bolt", "star", "diamond", "shield", "clock", "chat", "check"];
  const ARTICLE_TYPES = ["error", "instruction", "setup", "other", "prelaunch"];
  const MEDIA_TYPES = ["image", "video", "youtube"];
  const PRODUCT_SECTIONS = ["media", "features", "requirements"];
  const PLACEHOLDER_IMAGE = "assets/img/media-placeholder.svg";
  const FALLBACK_IMAGE = "assets/img/media-fallback.svg";
  const LS_LANG = "store.lang";
  const LS_THEME = "store.theme";
  const REVEAL_SELECTOR =
    ".section-heading,.product-card,.catalog-note,.help-block,.contact-band,.detail-heading," +
    ".detail-content,.purchase,.guide-step,.guide-callout,.agreement-page,[data-reveal]";
  const SEARCH_IDS = ["catalog-search", "game-search", "help-search", "help-product-search"];

  /* ------------------------------------------------------------------ helpers */

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const arr = (v) => (Array.isArray(v) ? v : []);
  const str = (v) => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
  const clean = (v) => str(v).trim();
  const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

  function $(sel, root) {
    return (root || D).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.from((root || D).querySelectorAll(sel));
  }

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  }

  function readStorage(key) {
    try {
      return W.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      W.localStorage.setItem(key, value);
    } catch (e) {
      /* storage unavailable (private mode, file://) — the choice simply isn't remembered */
    }
  }

  function parseUrl(v) {
    try {
      return new URL(v);
    } catch (e) {
      return null;
    }
  }

  const motionQuery = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function reducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  /* ------------------------------------------------------------- normalisation */
  // Every reader gets a complete structure: missing or malformed fields become safe defaults.

  const normL = (v) =>
    typeof v === "string" ? { ru: v, en: "" } : isObj(v) ? { ru: str(v.ru), en: str(v.en) } : { ru: "", en: "" };
  const emptyL = (l) => !l.ru.trim() && !l.en.trim();
  const strList = (v) => arr(v).map(str).filter((s) => s.trim() !== "");
  const normLL = (v) =>
    Array.isArray(v) ? { ru: strList(v), en: [] } : isObj(v) ? { ru: strList(v.ru), en: strList(v.en) } : { ru: [], en: [] };

  function requirementRows(v) {
    return arr(v)
      .map((row) =>
        Array.isArray(row)
          ? [str(row[0]), str(row[1])]
          : isObj(row)
            ? [str(row.name || row.label || row.key), str(row.value)]
            : null,
      )
      .filter((row) => row && (row[0].trim() || row[1].trim()));
  }

  const normRequirements = (v) =>
    Array.isArray(v)
      ? { ru: requirementRows(v), en: [] }
      : isObj(v)
        ? { ru: requirementRows(v.ru), en: requirementRows(v.en) }
        : { ru: [], en: [] };

  function normMedia(m) {
    const item = typeof m === "string" ? { url: m } : m;
    if (!isObj(item)) return null;
    const url = clean(item.url);
    if (!url) return null;
    const guess = youtube(url) ? "youtube" : /\.(mp4|webm)(?:$|[?#])/i.test(url) ? "video" : "image";
    return { type: oneOf(item.type, MEDIA_TYPES, guess), url, caption: normL(item.caption) };
  }

  function normOffers(v) {
    // Accepts the schema list and the legacy { "<period>": "<url>" } map.
    const list = Array.isArray(v) ? v : isObj(v) ? Object.keys(v).map((period) => ({ period, url: v[period] })) : [];
    return list
      .filter(isObj)
      .map((o) => ({ period: clean(o.period), label: normL(o.label), url: clean(o.url) }))
      .filter((o) => o.period || !emptyL(o.label));
  }

  function normNotice(v) {
    if (!isObj(v)) return null;
    const notice = { title: normL(v.title), text: normL(v.text), url: clean(v.url) };
    return emptyL(notice.title) && emptyL(notice.text) && !notice.url ? null : notice;
  }

  function normTexts(v) {
    const out = {};
    if (isObj(v)) {
      for (const key of Object.keys(v)) {
        const l = normL(v[key]);
        if (!emptyL(l)) out[key] = l;
      }
    }
    return out;
  }

  function deriveMark(name) {
    const words = name.split(/[\s_-]+/).filter(Boolean);
    const letters =
      words.length > 1 ? words.slice(0, 2).map((w) => Array.from(w)[0]).join("") : Array.from(name).slice(0, 2).join("");
    return letters.toUpperCase() || "S";
  }

  // Keeps the first occurrence of every non-empty id.
  function uniqueById(list, build) {
    const seen = new Set();
    const out = [];
    arr(list).forEach((raw, index) => {
      if (!isObj(raw)) return;
      const item = build(raw, index);
      if (!item.id || seen.has(item.id)) return;
      seen.add(item.id);
      out.push(item);
    });
    return out;
  }

  function normalizeData(raw) {
    const d = isObj(raw) ? raw : {};
    const s = isObj(d.settings) ? d.settings : {};
    const brand = isObj(s.brand) ? s.brand : {};
    const market = isObj(s.market) ? s.market : {};
    const seo = isObj(s.seo) ? s.seo : {};
    const sections = isObj(s.sections) ? s.sections : {};
    const brandName = clean(brand.name) || "Store";
    const help = isObj(d.help) ? d.help : {};
    const pages = isObj(d.pages) ? d.pages : {};
    const prelaunch = isObj(pages.prelaunch) ? pages.prelaunch : {};
    const guide = isObj(pages.guide) ? pages.guide : {};
    const agreement = isObj(pages.agreement) ? pages.agreement : {};
    const agreementLink = isObj(agreement.link) ? agreement.link : {};

    return {
      schema: 1,
      revision: clean(d.revision),
      settings: {
        brand: {
          name: brandName,
          mark: Array.from(clean(brand.mark) || deriveMark(brandName)).slice(0, 3).join(""),
          tagline: normL(brand.tagline),
        },
        market: { name: clean(market.name) || "FunPay", profileUrl: clean(market.profileUrl) },
        seo: { title: normL(seo.title), description: normL(seo.description) },
        defaultLang: oneOf(s.defaultLang, LANGS, "ru"),
        defaultTheme: oneOf(s.defaultTheme, THEMES, "dark"),
        sections: SECTION_KEYS.reduce((acc, key) => {
          acc[key] = typeof sections[key] === "boolean" ? sections[key] : true;
          return acc;
        }, {}),
        trust: arr(s.trust)
          .filter(isObj)
          .map((t) => ({ icon: oneOf(t.icon, TRUST_ICONS, "check"), title: normL(t.title), text: normL(t.text) }))
          .filter((t) => !emptyL(t.title) || !emptyL(t.text)),
        texts: normTexts(s.texts),
      },
      games: uniqueById(d.games, (g) => {
        const id = clean(g.id);
        return {
          id,
          name: clean(g.name) || id,
          cover: clean(g.cover),
          tags: normLL(g.tags),
          description: normL(g.description),
          hidden: g.hidden === true,
        };
      }),
      products: uniqueById(d.products, (p) => {
        const id = clean(p.id);
        const card = isObj(p.card) ? p.card : {};
        return {
          id,
          gameId: clean(p.gameId),
          name: clean(p.name) || id,
          hidden: p.hidden === true,
          availability: p.availability === "soon" ? "soon" : "available",
          icon: oneOf(p.icon, PRODUCT_ICONS, "shield"),
          card: { image: clean(card.image), mode: card.mode === "logo" ? "logo" : "cover" },
          description: normL(p.description),
          requirements: normRequirements(p.requirements),
          features: normLL(p.features),
          featureGroups: arr(p.featureGroups)
            .filter(isObj)
            .map((g) => ({ title: normL(g.title), items: normLL(g.items) }))
            .filter((g) => !emptyL(g.title) || g.items.ru.length || g.items.en.length),
          media: arr(p.media).map(normMedia).filter(Boolean),
          offers: normOffers(p.offers),
          helpNotice: normNotice(p.helpNotice),
        };
      }),
      help: {
        articles: uniqueById(help.articles, (a, index) => ({
          id: clean(a.id) || `article-${index + 1}`,
          productId: clean(a.productId),
          type: oneOf(a.type, ARTICLE_TYPES, "other"),
          title: normL(a.title),
          summary: normL(a.summary),
          problem: normL(a.problem),
          solution: normL(a.solution),
          steps: normLL(a.steps),
          note: normL(a.note),
          keywords: strList(a.keywords),
          updated: clean(a.updated),
        })),
      },
      pages: {
        prelaunch: {
          title: normL(prelaunch.title),
          intro: normL(prelaunch.intro),
          blocks: arr(prelaunch.blocks)
            .filter(isObj)
            .map((b) => ({
              title: normL(b.title),
              lead: normL(b.lead),
              body: normL(b.body),
              image: clean(b.image),
              imageSize: b.imageSize === "small" ? "small" : "normal",
              imageLink: clean(b.imageLink),
            })),
          final: normL(prelaunch.final),
        },
        guide: {
          steps: arr(guide.steps)
            .filter(isObj)
            .map((st) => ({
              title: normL(st.title),
              text: normL(st.text),
              tutorialTitle: normL(st.tutorialTitle),
              tutorial: normL(st.tutorial),
            })),
        },
        agreement: {
          title: normL(agreement.title),
          body: normL(agreement.body),
          link: { url: clean(agreementLink.url), label: normL(agreementLink.label) },
        },
      },
    };
  }

  /* ---------------------------------------------------------------- state */

  const DATA = normalizeData(W.STORE_DATA);
  const SETTINGS = DATA.settings;
  const GAMES = new Map(DATA.games.map((g) => [g.id, g]));
  const PRODUCTS = new Map(DATA.products.map((p) => [p.id, p]));

  const normalizeLang = (l) => (SETTINGS.sections.english && l === "en" ? "en" : "ru");
  const storedLang = readStorage(LS_LANG);
  const storedTheme = readStorage(LS_THEME);

  let lang = normalizeLang(LANGS.includes(storedLang) ? storedLang : SETTINGS.defaultLang);
  let theme = THEMES.includes(storedTheme) ? storedTheme : SETTINGS.defaultTheme;
  let current = Object.freeze({ name: "", params: Object.freeze({}), hash: "", nav: "" });
  let booted = false;

  const hooks = { before: [], after: [], scroll: [], resize: [] };

  function addHook(list, fn) {
    if (typeof fn !== "function") return () => {};
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  function runHooks(list, arg) {
    list.slice().forEach((fn) => {
      try {
        fn(arg);
      } catch (err) {
        console.error("[Store] hook failed:", err);
      }
    });
  }

  /* ----------------------------------------------------------------- i18n */

  let dictionary = null;

  // Flattens every window.STORE_I18N group into key -> {ru, en}.
  function dict() {
    if (dictionary) return dictionary;
    dictionary = Object.create(null);
    const groups = isObj(W.STORE_I18N) ? W.STORE_I18N : {};
    for (const name of Object.keys(groups)) {
      const keys = isObj(groups[name]) && isObj(groups[name].keys) ? groups[name].keys : {};
      for (const key of Object.keys(keys)) dictionary[key] = normL(keys[key]);
    }
    return dictionary;
  }

  // settings.texts override first, then the default; the other language is the last resort.
  function uiTemplate(key) {
    const own = hasOwn(SETTINGS.texts, key) ? SETTINGS.texts[key] : null;
    const def = dict()[key] || null;
    const order =
      lang === "en"
        ? [own && own.en, def && def.en, own && own.ru, def && def.ru]
        : [own && own.ru, def && def.ru, own && own.en, def && def.en];
    for (const v of order) if (v && v.trim()) return v;
    return null;
  }

  function fill(template, vars) {
    const all = Object.assign(
      { brand: SETTINGS.brand.name, mark: SETTINGS.brand.mark, market: SETTINGS.market.name },
      isObj(vars) ? vars : {},
    );
    return template.replace(/\{([\w.-]+)\}/g, (m, k) => (hasOwn(all, k) && all[k] != null ? String(all[k]) : m));
  }

  // Raw (unescaped) UI text; an unknown key returns the key itself so gaps are visible.
  function ui(key, vars) {
    const template = uiTemplate(String(key));
    return template === null ? String(key) : fill(template, vars);
  }

  function hasUi(key) {
    return uiTemplate(String(key)) !== null;
  }

  function tr(v) {
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (!isObj(v)) return "";
    const ru = str(v.ru);
    const en = str(v.en);
    if (lang === "en") return en.trim() ? en : ru;
    return ru.trim() ? ru : en;
  }

  function trList(v) {
    if (Array.isArray(v)) return v;
    if (!isObj(v)) return [];
    const ru = arr(v.ru);
    const en = arr(v.en);
    if (lang === "en") return en.length ? en : ru;
    return ru.length ? ru : en;
  }

  // Noun keys hold "one|few|many" (RU) / "one|many" (EN).
  function plural(n, nounKey) {
    const forms = ui(nounKey).split("|").map((f) => f.trim());
    const num = Math.abs(Number(n)) || 0;
    if (lang === "en") return num === 1 ? forms[0] : forms[1] || forms[0];
    const one = forms[0];
    const few = forms[1] || one;
    const many = forms[2] || few;
    if (!Number.isInteger(num)) return few;
    const a = num % 100;
    const b = a % 10;
    return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  }

  function count(n, nounKey) {
    return `${n} ${plural(n, nounKey)}`;
  }

  // Offer → "1 день" / "7 days"; a non-empty label wins, any other period is shown as is.
  function formatPeriod(offer) {
    const o = isObj(offer) ? offer : { period: offer };
    const label = tr(o.label).trim();
    if (label) return label;
    const period = clean(o.period);
    if (/^\d+$/.test(period)) {
      const n = Number(period);
      return `${n} ${plural(n, "noun.day")}`;
    }
    return period;
  }

  /* ------------------------------------------------------------ URL safety */

  // http(s) only, no credentials; anything else → "".
  function safeUrl(url) {
    const u = parseUrl(clean(url));
    return u && (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password ? u.href : "";
  }

  const ASSET_PATH = /^(?:\.\/)?assets\/[^?#\\]+$/i;
  const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

  // Site assets, https URLs and (images only) base64 data URIs; invalid images → placeholder.
  function mediaUrl(url, isImage) {
    const v = clean(url);
    if (v) {
      if (ASSET_PATH.test(v) && !/(?:^|\/)\.\.(?:\/|$)/.test(v)) return v;
      if (isImage && DATA_IMAGE.test(v)) return v;
      const u = /^https:\/\//i.test(v) ? parseUrl(v) : null;
      if (u && !u.username && !u.password) return u.href;
    }
    return isImage ? PLACEHOLDER_IMAGE : "";
  }

  // Any YouTube watch/short/embed/live link → privacy-friendly embed URL, else "".
  function youtube(url) {
    const u = parseUrl(clean(url));
    if (!u || !/^https?:$/.test(u.protocol)) return "";
    const host = u.hostname.replace(/^(?:www\.|m\.)/, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com")
      id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/) || [])[1] || "";
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  }

  /* ------------------------------------------------------------- rich text */

  const INLINE = /\*\*(?=\S)([\s\S]*?\S)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'`]+)/g;
  const TRAILING = ".,;:!?…»”’\"'";

  function linkHtml(url, labelHtml) {
    const href = safeUrl(url);
    return href
      ? `<a class="help-inline-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${labelHtml}</a>`
      : labelHtml;
  }

  // Drops sentence punctuation (and unbalanced ")") glued to the end of a bare URL.
  function trimUrl(url) {
    let end = url.length;
    while (end > 0) {
      const ch = url[end - 1];
      const head = url.slice(0, end);
      if (TRAILING.includes(ch)) end--;
      else if (ch === ")" && (head.match(/\(/g) || []).length < (head.match(/\)/g) || []).length) end--;
      else break;
    }
    return url.slice(0, end);
  }

  // Escapes text and renders **bold**, [label](https://…) and bare http(s) links.
  function inline(raw, nested) {
    let html = "";
    let last = 0;
    for (const m of raw.matchAll(INLINE)) {
      const [whole, bold, label, target, bare] = m;
      html += esc(raw.slice(last, m.index));
      if (bold !== undefined) html += nested ? esc(whole) : `<b>${inline(bold, true)}</b>`;
      else if (label !== undefined) html += linkHtml(target, esc(label));
      else {
        const url = trimUrl(bare);
        html += url ? linkHtml(url, esc(url)) + esc(bare.slice(url.length)) : esc(bare);
      }
      last = m.index + whole.length;
    }
    return html + esc(raw.slice(last));
  }

  const codeBlock = (lines) => `<pre class="general-prelaunch-code">${esc(lines.join("\n"))}</pre>`;

  // Block rich text: blank line → paragraph, newline → <br>, ``` fences → <pre>.
  function rich(value) {
    const src = tr(value).replace(/\r\n?/g, "\n");
    const out = [];
    let para = [];
    let code = null;
    const flush = () => {
      if (para.length) out.push(`<p>${inline(para.join("\n")).replace(/\n/g, "<br>")}</p>`);
      para = [];
    };
    for (const line of src.split("\n")) {
      const fence = line.trim();
      if (code === null && /^```[\w-]*$/.test(fence)) {
        flush();
        code = [];
      } else if (code !== null && fence === "```") {
        out.push(codeBlock(code));
        code = null;
      } else if (code !== null) code.push(line);
      else if (fence) para.push(line);
      else flush();
    }
    if (code !== null) out.push(codeBlock(code));
    flush();
    return out.join("");
  }

  // Inline rich text (no paragraphs); newlines are kept for CSS white-space: pre-line.
  function richInline(value) {
    return inline(tr(value).replace(/\r\n?/g, "\n"));
  }

  /* ----------------------------------------------------------------- icons */

  const stroke = (body) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const icons = Object.freeze({
    search:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    media:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 5 5 4-4 4 4"/><circle cx="15.5" cy="8.5" r="1"/></svg>',
    check:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    tick: stroke('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    arrowUpRight: stroke('<path d="M7 17 17 7M8 7h9v9"/>'),
    arrowRight: stroke('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    arrowLeft: stroke('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    external: stroke('<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    close: stroke('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: stroke('<path d="M12 5v14M5 12h14"/>'),
    minus: stroke('<path d="M5 12h14"/>'),
    chevronDown: stroke('<path d="m6 9 6 6 6-6"/>'),
    play: stroke('<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5Z"/>'),
    video: stroke('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
    info: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    warning: stroke('<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17h.01"/>'),
  });

  // Keyword heuristic of the reference catalog (first match wins).
  const FEATURE_ICONS = [
    [["aimbot"], '<circle cx="12" cy="12" r="5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>'],
    [["player esp"], '<circle cx="12" cy="8" r="3"/><path d="M5.5 21c.5-4 2.7-6 6.5-6s6 2 6.5 6"/>'],
    [["world esp"], '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'],
    [["loot"], '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'],
    [["radar"], '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="m12 12 6-6M12 3v3M3 12h3"/>'],
    [["боевой"], '<path d="m12 3 8 3v5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-5"/>'],
    [
      ["обзор", "bright", "fov"],
      '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/>',
    ],
    [
      ["конфигурац"],
      '<path d="M4 6h10M18 6h2M4 12h2m4 0h10M4 18h8m4 0h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    ],
    [["интерфейс"], '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11"/>'],
  ];
  const FEATURE_ICON_DEFAULT =
    '<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4"/>';

  // `index` is accepted for API compatibility (the reference ignores it too).
  // eslint-disable-next-line no-unused-vars
  function featureIcon(textValue, index) {
    const t = tr(textValue).toLowerCase();
    const hit = FEATURE_ICONS.find(([words]) => words.some((w) => t.includes(w)));
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${hit ? hit[1] : FEATURE_ICON_DEFAULT}</svg>`;
  }

  const PRODUCT_ICON_PATHS = {
    letter: '<path d="M8 17h8M9.5 13.5 12 6l2.5 7.5M10.4 11h3.2"/>',
    spark:
      '<path d="M12 3.5 13.7 8.3 18.5 10 13.7 11.7 12 16.5 10.3 11.7 5.5 10 10.3 8.3 12 3.5Z"/><path d="M18 15.5 18.7 17.3 20.5 18l-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
    bolt: '<path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/>',
    ghost: '<path d="M6 20V9a6 6 0 0 1 12 0v11l-3-2-3 2-3-2-3 2Z"/><path d="M9.5 10h.01M14.5 10h.01"/>',
    target: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    eye: '<path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    wave: '<path d="M3 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 3 4"/>',
    shield: '<path d="M12 3 4 7v5c0 4.8 3.3 7.7 8 9 4.7-1.3 8-4.2 8-9V7l-8-4Z"/><path d="M9 12h6M12 9v6"/>',
  };

  // Help-centre product badge; accepts a product or an icon name.
  function productIcon(productOrIcon, extraClass) {
    const name = typeof productOrIcon === "string" ? productOrIcon : isObj(productOrIcon) ? productOrIcon.icon : "";
    const body = PRODUCT_ICON_PATHS[oneOf(name, PRODUCT_ICONS, "shield")];
    const cls = ["help-cheat-icon", clean(extraClass)].filter(Boolean).join(" ");
    return `<span class="${esc(cls)}" aria-hidden="true"><svg viewBox="0 0 24 24">${body}</svg></span>`;
  }

  const TRUST_ICON_PATHS = {
    bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-6V2Z"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    diamond: '<path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="m8 12 3 3 5-6"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  };

  function trustIcon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${TRUST_ICON_PATHS[oneOf(name, TRUST_ICONS, "check")]}</svg>`;
  }

  /* --------------------------------------------------------- catalog lookups */

  // Games: not hidden. Products: not hidden and their game exists and is visible.
  function isVisible(item) {
    if (!isObj(item) || item.hidden) return false;
    if (!hasOwn(item, "gameId")) return true;
    const g = GAMES.get(item.gameId);
    return !!g && !g.hidden;
  }

  const games = () => DATA.games.filter(isVisible);
  const products = () => DATA.products.filter(isVisible);
  const game = (id) => GAMES.get(String(id)) || null;
  const product = (id) => PRODUCTS.get(String(id)) || null;
  const productsOf = (gameId) => DATA.products.filter((p) => p.gameId === String(gameId) && isVisible(p));

  const isSoon = (p) => isObj(p) && p.availability === "soon";
  const hasOffer = (p) => isObj(p) && arr(p.offers).some((o) => isObj(o) && safeUrl(o.url) !== "");
  const cardSoon = (p) => isSoon(p) || !hasOffer(p);
  const profileUrl = () => safeUrl(SETTINGS.market.profileUrl);

  // Cover image (already passed through mediaUrl): game.cover, else the first image of its products.
  function gameCover(gameOrId) {
    const g = typeof gameOrId === "string" ? game(gameOrId) : gameOrId;
    if (!isObj(g)) return null;
    const cover = clean(g.cover);
    if (cover && !/\.(?:mp4|webm)(?:$|[?#])/i.test(cover)) return { url: mediaUrl(cover, true), caption: str(g.name) };
    for (const p of productsOf(g.id)) {
      const m = p.media.find((item) => item.type === "image");
      if (m) return { url: mediaUrl(m.url, true), caption: tr(m.caption) || p.name };
    }
    return null;
  }

  const href = Object.freeze({
    product: (id, section) =>
      `#product=${encodeURIComponent(id)}${section ? `&section=${encodeURIComponent(section)}` : ""}`,
    game: (id) => `#game=${encodeURIComponent(id)}`,
    helpProduct: (id) => `#help-product=${encodeURIComponent(id)}`,
  });

  /* -------------------------------------------------------- shared markup */

  function contactBand() {
    const url = profileUrl();
    const button = url
      ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-profile>${esc(ui("contact.button"))} ↗</a>`
      : "";
    return `<section class="contact-band"><div><h3>${esc(ui("contact.title"))}</h3><p>${esc(ui("contact.text"))}</p></div>${button}</section>`;
  }

  function notFound(titleText, backHref, backText) {
    const main = D.getElementById("main");
    if (!main) return;
    const title = clean(titleText) || ui("notfound.page");
    const back = clean(backText) || ui("notfound.toCatalog");
    main.innerHTML = `<section class="section empty"><h1>${esc(title)}</h1><a class="link" href="${esc(backHref || "#catalog")}">← ${esc(back)}</a></section>`;
  }

  /* ------------------------------------------------------------- chrome */

  const chrome = {};

  function cacheChrome() {
    chrome.topbar = $(".topbar");
    chrome.progress = $("#scroll-progress");
    chrome.scrollTop = $("#scroll-top");
    chrome.glow = $("#cursor-glow");
    chrome.menu = $("#mobile-menu");
    chrome.menuToggle = $("#menu-toggle");
    chrome.lightbox = $("#lightbox");
    chrome.lightboxImage = $("#lightbox-image");
    chrome.toast = $("#toast");
  }

  const sectionOn = (name) => !hasOwn(SETTINGS.sections, name) || SETTINGS.sections[name] !== false;

  // [data-ui] / [data-ui-label|title|placeholder] → localized text or attributes.
  function applyUi(root) {
    const scope = root || D;
    $$("[data-ui]", scope).forEach((el) => {
      el.textContent = ui(el.dataset.ui);
    });
    $$("[data-ui-label]", scope).forEach((el) => el.setAttribute("aria-label", ui(el.dataset.uiLabel)));
    $$("[data-ui-title]", scope).forEach((el) => el.setAttribute("title", ui(el.dataset.uiTitle)));
    $$("[data-ui-placeholder]", scope).forEach((el) => el.setAttribute("placeholder", ui(el.dataset.uiPlaceholder)));
  }

  // Brand, profile links, section toggles, language state and nav state for the whole document.
  function applyChrome() {
    const root = D.documentElement;
    root.lang = lang;
    const tagline = tr(SETTINGS.brand.tagline).trim();
    const profile = profileUrl();
    $$("[data-brand-name]").forEach((el) => {
      el.textContent = SETTINGS.brand.name;
    });
    $$("[data-brand-mark]").forEach((el) => {
      el.textContent = SETTINGS.brand.mark;
    });
    $$("[data-brand-tagline]").forEach((el) => {
      el.textContent = tagline ? `/ ${tagline}` : "";
      el.hidden = !tagline;
    });
    $$("[data-profile]").forEach((el) => {
      if (profile) el.setAttribute("href", profile);
      else {
        el.removeAttribute("href");
        el.hidden = true;
      }
    });
    $$("[data-requires]").forEach((el) => {
      if (!sectionOn(el.dataset.requires)) el.hidden = true;
    });
    $$(".lang-switch [data-lang]").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    $$("[data-nav]").forEach((a) => {
      if (current.nav && a.dataset.nav === current.nav) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const description = tr(SETTINGS.seo.description).trim();
    const meta = $('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
    applyUi(D);
    if (chrome.menuToggle) setMenu(chrome.menu ? !chrome.menu.hidden : false);
  }

  function setMenu(open) {
    if (!chrome.menu || !chrome.menuToggle) return;
    chrome.menu.hidden = !open;
    chrome.menuToggle.setAttribute("aria-expanded", String(open));
    chrome.menuToggle.setAttribute("aria-label", ui(open ? "a11y.menuClose" : "a11y.menuOpen"));
  }

  const closeMenu = () => setMenu(false);

  function applyTheme() {
    D.documentElement.setAttribute("data-theme", theme);
  }

  function setTheme(next) {
    theme = oneOf(next, THEMES, theme);
    writeStorage(LS_THEME, theme);
    applyTheme();
  }

  function setLang(next) {
    const value = normalizeLang(next);
    writeStorage(LS_LANG, value);
    if (value === lang) return;
    lang = value;
    route();
  }

  /* ------------------------------------------------------- scroll & motion */

  let scrollLock = null;

  // Temporarily disables html { scroll-behavior: smooth } so programmatic jumps are instant.
  function lockScrollBehavior() {
    if (scrollLock !== null) return;
    scrollLock = D.documentElement.style.scrollBehavior;
    D.documentElement.style.scrollBehavior = "auto";
  }

  function unlockScrollBehavior() {
    if (scrollLock === null) return;
    D.documentElement.style.scrollBehavior = scrollLock;
    scrollLock = null;
  }

  let jumpFrame = 0;

  function jumpToTop() {
    const toTop = () => {
      try {
        W.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch (e) {
        W.scrollTo(0, 0);
      }
    };
    lockScrollBehavior();
    toTop();
    // A smooth scroll that was already running may write one more frame; correct it.
    cancelAnimationFrame(jumpFrame);
    jumpFrame = requestAnimationFrame(() => {
      if (W.scrollY > 0) toTop();
      unlockScrollBehavior();
    });
  }

  function updateScrollUi() {
    const y = W.scrollY || 0;
    const max = D.documentElement.scrollHeight - W.innerHeight;
    if (chrome.progress) chrome.progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, y / max)) : 0})`;
    if (chrome.scrollTop) chrome.scrollTop.classList.toggle("visible", y > 520);
    if (chrome.topbar) chrome.topbar.classList.toggle("scrolled", y > 8);
  }

  function playPageEnter() {
    const main = D.getElementById("main");
    if (!main || reducedMotion()) return;
    main.classList.remove("page-enter");
    void main.offsetWidth; // restart the animation
    main.classList.add("page-enter");
  }

  let revealObserver = null;

  // Reveal-on-scroll for the reference block list and any [data-reveal]; safe to call repeatedly.
  function enhanceMotion(root) {
    const items = $$(REVEAL_SELECTOR, root || D).filter((el) => !el.classList.contains("reveal"));
    if (!items.length) return;
    if (!("IntersectionObserver" in W) || reducedMotion()) {
      items.forEach((el) => el.classList.add("reveal", "is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries, observer) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }),
        // threshold 0: very tall blocks (long galleries) would never reach a ratio threshold
        { threshold: 0, rootMargin: "0px 0px -35px" },
      );
    }
    items.forEach((el) => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }

  /* -------------------------------------------------------------- overlays */

  function openLightbox(src, alt) {
    const box = chrome.lightbox;
    const img = chrome.lightboxImage;
    if (!box || !img) return;
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK_IMAGE;
    };
    img.src = mediaUrl(src, true);
    img.alt = str(alt);
    if (box.open) return;
    if (typeof box.showModal === "function") box.showModal();
    else box.setAttribute("open", "");
  }

  function closeLightbox() {
    const box = chrome.lightbox;
    if (!box || !box.open) return;
    if (typeof box.close === "function") box.close();
    else box.removeAttribute("open");
  }

  let toastTimer = 0;

  function toast(message) {
    const el = chrome.toast;
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = str(message);
    el.hidden = false;
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 4500);
  }

  /* ---------------------------------------------------------------- router */

  const SIMPLE_ROUTES = new Map([
    ["#help", "help"],
    ["#before-launch", "prelaunch"],
    ["#guide", "guide"],
    ["#agreement", "agreement"],
  ]);

  function parseHash(hash) {
    const h = String(hash || "");
    const param = (key) => {
      try {
        return new URLSearchParams(h.slice(1)).get(key) || "";
      } catch (e) {
        return "";
      }
    };
    if (h.startsWith("#product="))
      return { name: "product", id: param("product"), section: oneOf(param("section"), PRODUCT_SECTIONS, "") };
    if (h.startsWith("#game=")) return { name: "game", id: param("game") };
    if (h.startsWith("#help-product=")) return { name: "helpProduct", id: param("help-product") };
    if (h.startsWith("#help-prelaunch=")) return { name: "helpProduct", id: param("help-prelaunch") };
    if (SIMPLE_ROUTES.has(h)) return { name: SIMPLE_ROUTES.get(h) };
    return { name: "home", anchor: h === "#catalog" ? "catalog" : "" };
  }

  // Maps a parsed hash to {name, page, args, params, nav, title} or a not-found renderer.
  function resolveRoute(r) {
    const brand = SETTINGS.brand.name;
    const sec = SETTINGS.sections;
    const helpTitle = () => (hasUi("help.title") ? ui("help.title") : ui("nav.help"));
    const missing = (title, back, backText, nav) => ({
      name: "notFound",
      params: {},
      nav,
      title: `${title} - ${brand}`,
      render: () => notFound(title, back, backText),
    });
    const page = (name, args, params, nav, title) => ({ name, page: name, args, params, nav, title });

    if (r.name === "product") {
      const p = product(r.id);
      if (!p || !isVisible(p)) return missing(ui("notfound.product"), "#catalog", ui("notfound.toCatalog"), "catalog");
      return page("product", [p, r.section], { id: p.id, section: r.section }, "catalog", `${p.name} - ${brand}`);
    }
    if (r.name === "game") {
      const g = game(r.id);
      if (g && isVisible(g)) return page("game", [g], { id: g.id }, "catalog", `${g.name} - ${brand}`);
    } else if (r.name === "helpProduct" && sec.help) {
      const p = product(r.id);
      if (!p || !isVisible(p)) return missing(ui("notfound.section"), "#help", ui("notfound.toHelp"), "help");
      return page("helpProduct", [p], { id: p.id }, "help", `${p.name} - ${helpTitle()} - ${brand}`);
    } else if (r.name === "help" && sec.help) {
      return page("help", [], {}, "help", `${helpTitle()} - ${brand}`);
    } else if (r.name === "prelaunch" && sec.help) {
      return page("prelaunch", [], {}, "help", `${ui("nav.prelaunch")} - ${brand}`);
    } else if (r.name === "guide" && sec.guide) {
      return page("guide", [], {}, "guide", `${ui("nav.guide")} - ${brand}`);
    } else if (r.name === "agreement" && sec.agreement) {
      const title = tr(DATA.pages.agreement.title).trim() || ui("nav.agreement");
      return page("agreement", [], {}, "agreement", `${title} - ${brand}`);
    }
    const anchor = r.anchor || "";
    return page("home", [], { anchor }, anchor ? "catalog" : "", tr(SETTINGS.seo.title).trim() || `${brand} - catalog`);
  }

  function renderTarget(target) {
    if (!D.getElementById("main")) return;
    if (target.render) {
      target.render();
      return;
    }
    const fn = Store.pages[target.page];
    if (typeof fn !== "function") {
      notFound(ui("notfound.unavailable"), "#", ui("notfound.toHome"));
      return;
    }
    try {
      fn.apply(Store, target.args);
    } catch (err) {
      console.error(`[Store] page "${target.page}" failed:`, err);
      notFound(ui("notfound.unavailable"), "#", ui("notfound.toHome"));
    }
  }

  // Renders the current location.hash; every route starts at the top (#catalog then glides down).
  function route() {
    closeMenu();
    const target = resolveRoute(parseHash(W.location.hash));
    runHooks(hooks.before, current);
    D.body.classList.remove("help-subnav-stuck");
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    current = Object.freeze({
      name: target.name,
      params: Object.freeze(Object.assign({}, target.params)),
      hash: W.location.hash,
      nav: target.nav || "",
    });
    renderTarget(target);
    D.title = target.title;
    applyChrome();
    jumpToTop();
    const anchor = current.name === "home" ? current.params.anchor : "";
    if (anchor) {
      requestAnimationFrame(() => {
        const el = D.getElementById(anchor);
        if (el) el.scrollIntoView();
      });
    }
    playPageEnter();
    const routeInfo = current;
    requestAnimationFrame(() => {
      enhanceMotion();
      updateScrollUi();
      if (routeInfo === current) runHooks(hooks.after, routeInfo);
    });
  }

  /* ------------------------------------------------------------------ events */

  let scrollFrame = 0;
  let resizeFrame = 0;
  let glowFrame = 0;
  let glowPoint = [0, 0];

  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateScrollUi();
      runHooks(hooks.scroll, W.scrollY);
    });
  }

  function onResize() {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      // The menu button disappears on wide screens; never leave its menu stranded open.
      if (chrome.menuToggle && !chrome.menuToggle.getClientRects().length) closeMenu();
      updateScrollUi();
      runHooks(hooks.resize, W.innerWidth);
    });
  }

  function onPointerMove(e) {
    // Skipped on the heavy help-centre pages, like the reference.
    if (!chrome.glow || !SETTINGS.sections.cursorGlow || e.pointerType === "touch" || reducedMotion()) return;
    if (current.name === "help" || current.name === "helpProduct") return;
    glowPoint = [e.clientX, e.clientY];
    if (glowFrame) return;
    glowFrame = requestAnimationFrame(() => {
      glowFrame = 0;
      chrome.glow.style.transform = `translate3d(${glowPoint[0]}px,${glowPoint[1]}px,0) translate(-50%,-50%)`;
    });
  }

  const isTyping = (el) => !!el && (/^(?:INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  function onKeyDown(e) {
    if (e.key === "Escape") {
      closeMenu();
      return;
    }
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || isTyping(D.activeElement)) return;
    const search = SEARCH_IDS.map((id) => D.getElementById(id)).find((el) => el && el.getClientRects().length);
    if (search) {
      e.preventDefault();
      search.focus();
    }
  }

  function onClick(e) {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const langButton = t.closest(".lang-switch [data-lang]");
    if (langButton) {
      setLang(langButton.dataset.lang);
      return;
    }
    if (t.closest("#theme-toggle")) {
      setTheme(theme === "dark" ? "light" : "dark");
      return;
    }
    if (t.closest("#menu-toggle")) {
      setMenu(!!(chrome.menu && chrome.menu.hidden));
      return;
    }
    if (t.closest("#scroll-top")) {
      W.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    if (t.closest(".skip")) {
      // Focus the content without touching the hash (the router owns it).
      e.preventDefault();
      const main = D.getElementById("main");
      if (main) {
        main.focus({ preventScroll: true });
        main.scrollIntoView();
      }
      return;
    }
    if (chrome.menu && !chrome.menu.hidden && (t.closest("#mobile-menu a") || !t.closest("#mobile-menu"))) closeMenu();
  }

  // <img data-fallback> (optionally data-fallback="path") swaps to the fallback image once on error;
  // the closest [data-fallback-host] gets the class "media-error".
  function onImageError(e) {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-fallback") || img.dataset.fallbackDone) return;
    img.dataset.fallbackDone = "1";
    img.src = img.getAttribute("data-fallback") || FALLBACK_IMAGE;
    const host = img.closest("[data-fallback-host]");
    if (host) host.classList.add("media-error");
  }

  function wireLightbox() {
    const box = chrome.lightbox;
    if (!box) return;
    const closeButton = $("#close-lightbox");
    if (closeButton) closeButton.addEventListener("click", closeLightbox);
    box.addEventListener("click", (e) => {
      if (e.target !== box) return;
      const r = box.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (outside) closeLightbox();
    });
    box.addEventListener("close", () => {
      if (!chrome.lightboxImage) return;
      chrome.lightboxImage.onerror = null;
      chrome.lightboxImage.removeAttribute("src");
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    cacheChrome();
    applyTheme();
    if (chrome.glow && !SETTINGS.sections.cursorGlow) chrome.glow.hidden = true;
    closeMenu();
    wireLightbox();
    D.addEventListener("click", onClick);
    D.addEventListener("keydown", onKeyDown);
    D.addEventListener("error", onImageError, true);
    W.addEventListener("hashchange", route);
    W.addEventListener("scroll", onScroll, { passive: true });
    W.addEventListener("resize", onResize, { passive: true });
    W.addEventListener("pointermove", onPointerMove, { passive: true });
    // Drop the entrance-animation class once it has played (as the reference does): while the
    // filled animation stays applied, #main is a stacking context and sticky/z-indexed elements
    // inside it (help sub-nav, product dock) would slide under the fixed header.
    const main = D.getElementById("main");
    if (main) {
      main.addEventListener("animationend", (e) => {
        if (e.target === main) main.classList.remove("page-enter");
      });
    }
    route();
  }

  /* ---------------------------------------------------------------- export */

  const Store = {
    $,
    $$,
    esc,
    data: DATA,
    get lang() {
      return lang;
    },
    get theme() {
      return theme;
    },
    get current() {
      return current;
    },
    get main() {
      return D.getElementById("main");
    },
    setLang,
    setTheme,
    tr,
    trList,
    ui,
    hasUi,
    plural,
    count,
    formatPeriod,
    rich,
    richInline,
    mediaUrl,
    safeUrl,
    youtube,
    icons,
    featureIcon,
    productIcon,
    trustIcon,
    games,
    products,
    game,
    product,
    productsOf,
    isVisible,
    gameCover,
    isSoon,
    hasOffer,
    cardSoon,
    profileUrl,
    href,
    contactBand,
    notFound,
    pages: {},
    beforeRender: (fn) => addHook(hooks.before, fn),
    afterRender: (fn) => addHook(hooks.after, fn),
    onScroll: (fn) => addHook(hooks.scroll, fn),
    onResize: (fn) => addHook(hooks.resize, fn),
    enhanceMotion,
    applyUi,
    jumpToTop,
    reducedMotion,
    openLightbox,
    closeLightbox,
    toast,
    route,
    boot,
    placeholderImage: PLACEHOLDER_IMAGE,
    fallbackImage: FALLBACK_IMAGE,
  };

  // Apply the theme and language right away (before the first render) to avoid a flash.
  applyTheme();
  D.documentElement.lang = lang;

  W.Store = Store;
})();
