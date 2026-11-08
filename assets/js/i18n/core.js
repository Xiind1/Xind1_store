/* Core UI strings: header, footer, shared blocks, plural nouns and accessibility labels.
   Placeholders: {brand} {mark} {market} (+ caller variables). Admin overrides are stored in
   settings.texts and win over these defaults. Noun keys hold plural forms:
   RU "one|few|many", EN "one|many". */
(window.STORE_I18N = window.STORE_I18N || {}).core = {
  title: "Общие элементы",
  keys: {
    // Header navigation and mobile menu
    "nav.catalog": { ru: "Каталог", en: "Catalog" },
    "nav.help": { ru: "Справочник", en: "Help center" },
    "nav.guide": { ru: "Проверка ПК", en: "PC check" },
    "nav.agreement": { ru: "Пользовательское соглашение", en: "Terms of Use" },
    "nav.profile": { ru: "{market}", en: "{market}" },
    "nav.prelaunch": { ru: "Информация перед запуском", en: "Before launch" },

    // Footer
    "footer.agreement": { ru: "Пользовательское соглашение", en: "Terms of Use" },
    "footer.profile": { ru: "Профиль на {market} ↗", en: "{market} profile ↗" },
    "footer.note": {
      ru: "Информационный каталог, не платёжная площадка. Заказы оформляются на {market}. Использование сторонних программ может нарушать правила игры и привести к блокировке аккаунта.",
      en: "This is an information catalog, not a payment service. Orders are placed on {market}. Third-party software may violate game rules and lead to account restrictions.",
    },

    // Shared words
    "common.backToCatalog": { ru: "Вернуться в каталог", en: "Back to catalog" },
    "common.search": { ru: "Поиск", en: "Search" },
    "common.nothingFound": { ru: "Ничего не найдено", en: "Nothing found" },
    "common.close": { ru: "Закрыть", en: "Close" },
    "common.open": { ru: "Открыть", en: "Open" },
    "common.more": { ru: "Подробнее", en: "Learn more" },
    "common.updated": { ru: "Обновлено", en: "Updated" },
    "common.untitled": { ru: "Без названия", en: "Untitled" },
    "common.soon": { ru: "Скоро", en: "Soon" },
    "common.newTab": { ru: "Откроется в новой вкладке", en: "Opens in a new tab" },
    "common.mediaUnavailable": { ru: "Медиа временно недоступно", en: "Media temporarily unavailable" },
    "common.copied": { ru: "Скопировано", en: "Copied" },

    // Plural nouns (Store.plural / Store.count)
    "noun.product": { ru: "чит|чита|читов", en: "cheat|cheats" },
    "noun.game": { ru: "игра|игры|игр", en: "game|games" },
    "noun.feature": { ru: "функция|функции|функций", en: "feature|features" },
    "noun.section": { ru: "раздел|раздела|разделов", en: "section|sections" },
    "noun.article": { ru: "материал|материала|материалов", en: "article|articles" },
    "noun.day": { ru: "день|дня|дней", en: "day|days" },

    // "Questions?" band (Store.contactBand)
    "contact.title": { ru: "Остались вопросы?", en: "Questions?" },
    "contact.text": {
      ru: "Уточни детали до покупки — напиши в чате {market}.",
      en: "Ask questions in the {market} chat before purchasing.",
    },
    "contact.button": { ru: "К профилю {brand}", en: "Open {brand} profile" },

    // Not-found and unavailable sections
    "notfound.product": { ru: "Карточка не найдена", en: "Product not found" },
    "notfound.toCatalog": { ru: "К каталогу", en: "Back to catalog" },
    "notfound.section": { ru: "Раздел не найден", en: "Section not found" },
    "notfound.toHelp": { ru: "К справочнику", en: "Back to help center" },
    "notfound.page": { ru: "Страница не найдена", en: "Page not found" },
    "notfound.unavailable": { ru: "Раздел пока недоступен", en: "This section is not available yet" },
    "notfound.toHome": { ru: "На главную", en: "Home" },

    // Accessibility labels
    "a11y.skip": { ru: "К содержимому", en: "Skip to content" },
    "a11y.toTop": { ru: "Наверх", en: "Back to top" },
    "a11y.mainNav": { ru: "Основная навигация", en: "Main navigation" },
    "a11y.mobileNav": { ru: "Мобильная навигация", en: "Mobile navigation" },
    "a11y.home": { ru: "{brand} — главная", en: "{brand} — home" },
    "a11y.language": { ru: "Язык", en: "Language" },
    "a11y.theme": { ru: "Сменить тему", en: "Change theme" },
    "a11y.menuOpen": { ru: "Открыть меню", en: "Open menu" },
    "a11y.menuClose": { ru: "Закрыть меню", en: "Close menu" },
    "a11y.lightbox": { ru: "Просмотр изображения", en: "Image viewer" },
    "a11y.lightboxClose": { ru: "Закрыть изображение", en: "Close image" },
  },
};
