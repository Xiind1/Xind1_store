/* Help centre and info pages: #help, #help-product=<id>, #before-launch, #guide, #agreement.
   Placeholders: {brand} {mark} {market} (+ the caller variables named below). Admin overrides
   are stored in settings.texts and win over these defaults. A "\n" in a title is a line break. */
(window.STORE_I18N = window.STORE_I18N || {}).help = {
  title: "Справочник и страницы",
  keys: {
    // Help centre (#help): hero, search and the sticky section navigation
    "help.title": { ru: "Справочник", en: "Help center" },
    "help.hero.kicker": { ru: "База знаний", en: "Knowledge base" },
    "help.hero.text": {
      ru: "Найди свою игру, выбери чит и открой готовое решение. Ошибки собраны в одном месте без лишних переходов.",
      en: "Find your game, choose a cheat and open the ready solution. Errors are collected in one place without unnecessary steps.",
    },
    "help.search.placeholder": { ru: "Поиск по игре, читу или ошибке", en: "Search by game, cheat or error" },
    "help.search.label": { ru: "Поиск по справочнику", en: "Search help center" },
    "help.nav.label": { ru: "Навигация по справочнику", en: "Help center navigation" },
    "help.nav.top": { ru: "Справочник", en: "Help center" },
    "help.nav.guides": { ru: "Общие инструкции", en: "General guides" },
    "help.nav.errors": { ru: "Решение ошибок", en: "Error solutions" },

    // Help centre: "General guides" cards. The prelaunch and terms cards take their titles from
    // the pages' data (fallbacks: prelaunch.title, nav.agreement).
    "help.guides.eyebrow": { ru: "Быстрый доступ", en: "Quick access" },
    "help.guides.title": { ru: "Общие инструкции", en: "General guides" },
    "help.guides.text": { ru: "Основные материалы перед запуском и покупкой.", en: "Essential material before launch and purchase." },
    "help.quick.prelaunch.type": { ru: "Подготовка", en: "Preparation" },
    "help.quick.prelaunch.text": {
      ru: "Компоненты Windows, защита, антивирусы, оверлеи и обязательная подготовка системы.",
      en: "Windows components, protection, antivirus software, overlays and required system preparation.",
    },
    "help.quick.guide.type": { ru: "Проверка", en: "Check" },
    "help.quick.guide.title": { ru: "Проверка компьютера перед покупкой", en: "PC check before purchase" },
    "help.quick.guide.text": {
      ru: "Windows, процессор, память, видеокарта и параметры BIOS перед покупкой продукта.",
      en: "Windows, CPU, memory, graphics and BIOS settings before purchase.",
    },
    "help.quick.agreement.type": { ru: "Документ", en: "Document" },
    "help.quick.agreement.text": {
      ru: "Условия покупки, совместимости, возврата и использования цифрового товара.",
      en: "Purchase, compatibility, refund and digital-product terms.",
    },

    // Help centre: game → product tree
    "help.games.eyebrow": { ru: "База решений", en: "Solution base" },
    "help.games.title": { ru: "Выбери игру", en: "Choose a game" },
    "help.games.text": { ru: "Раскрой игру и перейди к нужному читу.", en: "Expand a game and open the cheat you need." },
    "help.tree.game": { ru: "Игра", en: "Game" },
    "help.search.empty": { ru: "Попробуй изменить поисковый запрос.", en: "Try another search query." },
    "help.empty.title": { ru: "Справочник пока пуст", en: "The help center is empty for now" },
    "help.empty.text": {
      ru: "Материалы появятся здесь, когда в каталоге будут товары.",
      en: "Articles will appear here once the catalog has products.",
    },

    // Product help page (#help-product=<id>)
    "help.back": { ru: "К справочнику", en: "Back to help center" },
    "help.product.eyebrow": { ru: "Ошибки и решения", en: "Errors and fixes" },
    "help.product.search.placeholder": { ru: "Найти ошибку или решение", en: "Find an error or fix" },
    "help.product.search.label": { ru: "Поиск внутри чита", en: "Search within cheat" },
    "help.product.errors.kicker": { ru: "Поддержка", en: "Support" },
    "help.product.errors.title": { ru: "Ошибки и решения", en: "Errors and fixes" },
    "help.product.errors.empty": { ru: "Ошибок и решений пока нет.", en: "No errors or fixes yet." },
    "help.product.guides.kicker": { ru: "Перед запуском", en: "Before launch" },
    "help.product.guides.title": { ru: "Инструкции и настройка", en: "Guides and setup" },
    "help.notice.title": { ru: "Возникла ошибка?", en: "Having an error?" },

    // Article cards
    "help.type.error": { ru: "Ошибка", en: "Error" },
    "help.type.prelaunch": { ru: "Перед запуском", en: "Before launch" },
    "help.type.instruction": { ru: "Инструкция", en: "Instruction" },
    "help.type.setup": { ru: "Настройка", en: "Setup" },
    "help.type.other": { ru: "Прочее", en: "Other" },
    "help.article.problem": { ru: "Проблема", en: "Problem" },
    "help.article.solution": { ru: "Решение", en: "Solution" },
    "help.article.steps": { ru: "Шаги", en: "Steps" },
    "help.article.note": { ru: "Важно", en: "Important" },

    // "Before launch" page (#before-launch); title/intro/blocks come from the data
    "prelaunch.eyebrow": { ru: "Общая инструкция", en: "General guide" },
    "prelaunch.title": { ru: "Подготовка системы к первому запуску", en: "System preparation before first launch" },
    "prelaunch.imageLink": { ru: "{title} — открыть ссылку", en: "{title} — open link" },

    // PC check page (#guide); the steps come from the data
    "guide.eyebrow": { ru: "Проверка перед покупкой", en: "Pre-purchase check" },
    "guide.title": { ru: "Проверь свой\nкомпьютер", en: "Check your\ncomputer" },
    "guide.intro": {
      ru: "Проверь характеристики вручную: сайт не получает доступ к твоему устройству. Это базовая проверка, не гарантия совместимости.",
      en: "Check the specifications manually: the site never accesses your device. This is a basic check, not a compatibility guarantee.",
    },
    "guide.tutorial": { ru: "Подробнее", en: "Learn more" },
    "guide.empty": { ru: "Шаги проверки пока не добавлены.", en: "No check steps have been added yet." },

    // Terms page (#agreement); title/body/link come from the data
    "agreement.eyebrow": { ru: "{brand} / документы", en: "{brand} / documents" },
    "agreement.pending.tag": { ru: "ТЕКСТ ЕЩЁ НЕ ДОБАВЛЕН", en: "TEXT NOT ADDED YET" },
    "agreement.pending.title": { ru: "Соглашение готовится", en: "The agreement is being prepared" },
    "agreement.pending.text": {
      ru: "Здесь появится пользовательское соглашение {brand}. Пока текст не опубликован, уточняйте условия покупки у продавца на {market}.",
      en: "The {brand} terms of use will appear on this page. Until the text is published, check the purchase terms with the seller on {market}.",
    },
    "agreement.link": { ru: "Открыть оригинал", en: "Open the original" },
  },
};
