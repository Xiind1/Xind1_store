/* Home page and game catalog strings: hero, catalog counters, game grid, game page and product cards.
   Placeholders: {brand} {mark} {market} are always available; {game} and {count} are filled by the page.
   Admin overrides are stored in settings.texts and win over these defaults. */
(window.STORE_I18N = window.STORE_I18N || {}).catalog = {
  title: "Главная и каталог",
  keys: {
    // Home hero (the second title line is drawn in italic accent type)
    "home.hero.eyebrow": { ru: "{brand} / игровой каталог", en: "{brand} / game catalog" },
    "home.hero.title": { ru: "Лучшие читы", en: "The best cheats" },
    "home.hero.accent": { ru: "для твоих игр", en: "for your games" },
    "home.hero.text": {
      ru: "Выбери игру — покажем доступные читы и совместимость.",
      en: "Choose a game — we’ll show available cheats and compatibility.",
    },
    "home.hero.cta": { ru: "Выбрать игру", en: "Choose a game" },
    "home.hero.check": { ru: "Проверить ПК", en: "Check my PC" },

    // Catalog counters next to the hero
    "home.stats.title": { ru: "Каталог", en: "Catalog" },
    "home.stats.live": { ru: "обновляется", en: "live" },

    // Game grid
    "home.catalog.eyebrow": { ru: "01 / игры", en: "01 / games" },
    "home.catalog.title": { ru: "Выбери игру", en: "Choose a game" },
    "home.catalog.text": {
      ru: "Найди нужную игру и открой доступные читы.",
      en: "Find your game and open the available cheats.",
    },
    "home.catalog.search": { ru: "Поиск игры", en: "Search games" },
    "home.catalog.empty": { ru: "Игра не найдена", en: "Game not found" },
    "home.catalog.none": { ru: "Игры скоро появятся", en: "Games are coming soon" },

    // Game page
    "game.back": { ru: "Все игры", en: "All games" },
    "game.eyebrow": { ru: "Каталог игры", en: "Game catalog" },
    "game.defaultDescription": {
      ru: "Открой каталог {game}, сравни доступные продукты, их функции, требования и материалы перед выбором.",
      en: "Open the {game} catalog and compare available products, features, requirements and media before choosing.",
    },
    "game.search": { ru: "Поиск по названию", en: "Search by name" },
    "game.empty": { ru: "Читы не найдены", en: "No cheats found" },
    "game.shown": { ru: "Показано читов: {count}", en: "Cheats shown: {count}" },

    // Product cards (a card is "soon" when the product is marked soon or has no valid offer link)
    "card.details": { ru: "Требования · Функции · Медиа", en: "Requirements · Features · Media" },
    "card.soonBadge": { ru: "SOON", en: "SOON" },
    "card.soonText": {
      ru: "Ведём переговоры с разработчиками и издателем",
      en: "Negotiating with the developer and publisher",
    },
    "card.soonFooter": { ru: "Продажа после согласования", en: "Sale after approval" },
  },
};
