/* Product page strings: heading, quick navigation, media / features / requirements sections
   and the purchase panel. Placeholders: {brand} {mark} {market} plus the variables noted below.
   Admin overrides are stored in settings.texts and win over these defaults. */
(window.STORE_I18N = window.STORE_I18N || {}).product = {
  title: "Карточка товара",
  keys: {
    // Heading
    "product.backToCatalog": { ru: "Каталог", en: "Catalog" },
    "product.kicker": { ru: "{game} / продукт", en: "{game} / product" }, // {game}
    "product.soonBadge": { ru: "Soon...", en: "Soon..." },

    // Quick navigation (sticky dock above the sections)
    "product.anchorNav": { ru: "Быстрая навигация по продукту", en: "Product quick navigation" },
    "product.anchor.media": { ru: "Фото и видео", en: "Images & media" },
    "product.anchor.features": { ru: "Функционал", en: "Features" },
    "product.anchor.requirements": { ru: "Системные требования", en: "System requirements" },

    // 01 — media
    "product.media.title": { ru: "Фото и видео", en: "Images & media" },
    "product.media.caption": {
      ru: "Интерфейс и демонстрации работы продукта.",
      en: "Interface previews and product demonstrations.",
    },
    "product.media.emptyTitle": { ru: "Материалы пока не добавлены", en: "No media yet" },
    "product.media.emptyText": {
      ru: "Фото и видео появятся здесь после публикации материалов.",
      en: "Screenshots and videos will appear here once they are published.",
    },
    "product.media.zoom": { ru: "Увеличить {name}", en: "Enlarge {name}" }, // {name}
    "product.media.imageWord": { ru: "изображение", en: "image" },
    "product.media.imageAlt": { ru: "Изображение продукта", en: "Product image" },
    "product.media.videoTitle": { ru: "Видео продукта", en: "Product video" },
    "product.media.errorNote": { ru: "Медиа недоступно — показана заглушка", en: "Media unavailable — showing a placeholder" },

    // 02 — features
    "product.features.title": { ru: "Возможности продукта", en: "Product features" },
    "product.features.caption": {
      ru: "Основные функции собраны на этой странице без переключения вкладок.",
      en: "Core features are collected on this page without switching tabs.",
    },
    "product.features.groupsCaption": {
      ru: "Раскрой раздел, чтобы увидеть все функции внутри него.",
      en: "Expand a section to see every feature inside it.",
    },
    "product.features.empty": { ru: "Описание функций пока не добавлено.", en: "Feature descriptions have not been added yet." },
    "product.features.collapse": { ru: "Свернуть", en: "Collapse" },

    // 03 — system requirements
    "product.requirements.title": { ru: "Системные требования", en: "System requirements" },
    "product.requirements.caption": {
      ru: "Сверь параметры компьютера и уточни совместимость до покупки.",
      en: "Compare your PC specifications and confirm compatibility before purchase.",
    },
    "product.requirements.empty": { ru: "Требования пока не указаны.", en: "Requirements have not been specified yet." },
    "product.requirements.hint": {
      ru: "Не знаешь, где посмотреть характеристики?",
      en: "Not sure where to find your PC specifications?",
    },
    "product.requirements.hintLink": { ru: "Открыть инструкцию по проверке ПК", en: "Open the PC check guide" },

    // Purchase panel
    "purchase.title": { ru: "Выберите срок доступа", en: "Choose your access period" },
    "purchase.periods": { ru: "Срок доступа", en: "Access period" },
    "purchase.selected": { ru: "Выбран срок: {period}.", en: "Selected duration: {period}." }, // {period}
    "purchase.noOffer": { ru: "Для этого срока лот ещё не добавлен.", en: "No offer has been added for this duration yet." },
    "purchase.buy": { ru: "Купить на {market}", en: "Buy on {market}" },
    "purchase.buyNote": { ru: "Нужный лот откроется в новой вкладке.", en: "The selected listing will open in a new tab." },
    "purchase.buyLater": {
      ru: "Кнопка станет доступна после добавления лота к реальному продукту.",
      en: "The button will become available after a listing is added.",
    },
    "purchase.agreement": { ru: "Пользовательское соглашение", en: "Terms of Use" },
    "purchase.note": {
      ru: "Оплата и получение заказа — на {market}. Цена указана в лоте.",
      en: "Payment and delivery are handled on {market}. The price is shown in the listing.",
    },

    // Purchase panel of a "soon" product
    "purchase.soon.title": { ru: "Soon...", en: "Soon..." },
    "purchase.soon.heading": { ru: "Скоро появится", en: "Coming soon" },
    "purchase.soon.text": {
      ru: "Этот продукт уже есть в каталоге, но покупка пока отключена. Продажи откроются сразу после релиза.",
      en: "This product is already listed in the catalog, but purchasing is disabled. Sales will open right after release.",
    },
    "purchase.soon.button": { ru: "Пока недоступно", en: "Not available yet" },
    "purchase.soon.note": {
      ru: "Продажи откроются после публикации продукта.",
      en: "Sales will open after the product is released.",
    },
  },
};
