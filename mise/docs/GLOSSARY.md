# Глоссарий интерфейса (ru · en · es-ES)

Выбор терминов для интерфейса. Колонка «Проверено» говорит, что именно подтверждено по словарю при разработке;
где источник не нашёлся, так и написано. Это не заменяет вычитку носителем языка.

| ru | en | es (Испания) | Проверено |
|---|---|---|---|
| Главная | Home | Inicio | типовой выбор интерфейсов |
| Рецепты | Recipes | Recetas | — |
| Холодильник | Fridge | Nevera | «nevera» — обычное слово в Испании; в DLE через поиск не подтверждено |
| Помощник | Assistant | Asistente | — |
| План питания | Meal plan | Plan de comidas | — |
| Список покупок | Shopping list | Lista de la compra | обычное выражение в Испании (в Латинской Америке чаще «lista de compras»); в DLE не подтверждено |
| Начать готовить | Start cooking | Empezar a cocinar | — |
| Таймер | Timer | Temporizador | es: [DLE «temporizador»](https://dle.rae.es/temporizador) |
| Пауза | Pause | Pausar | — |
| Готово | Done | ¡Listo! | — |
| Пассеровать | Sauté | Rehogar | ru: [Грамота «пассеровать»](https://gramota.ru/meta/passerovat); en: [Cambridge «sauté»](https://dictionary.cambridge.org/dictionary/english/saute) |
| Бланшировать | Blanch | Escaldar | ru: [Грамота «бланшировать»](https://gramota.ru/meta/blanshirovat) |
| Аль денте | Al dente | Al dente | en: [Cambridge «al dente»](https://dictionary.cambridge.org/dictionary/english/al-dente) |
| Томить | Simmer | Cocer a fuego suave | en: [Cambridge «simmer»](https://dictionary.cambridge.org/dictionary/english/simmer) |

## Региональные варианты в базе продуктов
Названия продуктов хранят варианты Испании и Латинской Америки, а также US/UK (кабачок: calabacín / zapallito / courgette / zucchini). Поиск понимает все варианты.

## Правила
- Все строки интерфейса лежат в `js/i18n/{ru,en,es}.js` и проверяются тестом `test/i18n.test.mjs` на полноту и одинаковую форму множественных чисел.
- Испанский ориентирован на es-ES (tú, «ordenador/móvil», «zumo», «patatas»).
- Даты и время форматируются через `Intl` по языку интерфейса.
