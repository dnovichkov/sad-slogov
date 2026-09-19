"use strict";
/**
 * Учебный материал: буквы, слоги и слова.
 *
 * Порядок букв взят из «Букваря» Жуковой:
 * А, У, О, М, С, Х, Р, Ш, Ы, Л, Н, К, Т, И, П, З, Й, Г, В, Д, Б, Ж, Е, Ь, Я, Ю, Ё, Ч, Э, Ц, Ф, Щ, Ъ.
 * Здесь описан пройденный участок: согласные М, С, Х, Р, Ш и гласные А, У, О, Ы.
 *
 * Как добавить следующую букву: допишите её в LETTERS после предыдущей,
 * добавьте слова в WORDS и рисунки в wordArt (public/art.js).
 * Команда `npm run check` проверит, что материал согласован.
 */
const CURRICULUM = (() => {
  /** Гласные в порядке букваря. Буква И появится вместе с согласной И-страницы. */
  const VOWELS = ["А", "У", "О", "Ы"];

  /**
   * Согласные в порядке букваря.
   * vowels — только реально существующие слияния. Решётку не перемножаем:
   * ХЫ в русском языке практически не встречается, ШЫ не существует (пишется ШИ).
   * sound — как взрослому тянуть звук; tip — что сделать и чего не делать
   * во время задания; note — орфографическая ремарка, её видно только в настройках.
   */
  const LETTERS = [
    {
      id: "М",
      vowels: ["А", "У", "О", "Ы"],
      sound: "м-м-м",
      tip: "Тяните «м-м-м» сомкнутыми губами, не говорите «эм»: с названием буквы слог не соберётся.",
    },
    {
      id: "С",
      vowels: ["А", "У", "О", "Ы"],
      sound: "с-с-с",
      tip: "Тяните «с-с-с» тонкой струйкой воздуха, не говорите «эс».",
    },
    {
      id: "Х",
      vowels: ["А", "У", "О"],
      sound: "х-х-х",
      tip: "Выдохните «х-х-х», как на замёрзшее стекло, — не произносите «ха» отдельным куском.",
      note: "Слога ХЫ в русском языке нет, поэтому у Х только три слияния.",
    },
    {
      id: "Р",
      vowels: ["А", "У", "О", "Ы"],
      sound: "р-р-р",
      tip: "Порычите «р-р-р». Если звук пока не выходит — это нормально в этом возрасте: прочитайте слог вместе и не поправляйте произношение.",
    },
    {
      id: "Ш",
      vowels: ["А", "У", "О"],
      sound: "ш-ш-ш",
      tip: "Шипите «ш-ш-ш», как воздух из шарика.",
      note: "Слог ШЫ не пишется: позже, с буквой И, появится ШИ.",
    },
  ];

  /**
   * Слова для игры «Где спрятался слог?».
   *
   * teaches — слоги, которые по этому слову можно спрашивать. Список ручной:
   *   слог попадает сюда, только если он отчётливо слышен, когда взрослый
   *   произносит слово по слогам.
   *   Безударная «О» звучит как [а] — «соро́ка» это [сарока], поэтому СОРОКА
   *   учит РО, но не СО.
   * unstressed — согласие автора на слог с безударной «О»: при чтении по слогам
   *   гласная звучит полностью, но проверка должна знать, что это осознанный выбор.
   * contains и at (место слога в слове) вычисляются ниже автоматически.
   */
  const WORDS = [
    // М
    { word: "МАК", spoken: "ма́к", art: "poppy", teaches: ["МА"] },
    { word: "МАШИНА", spoken: "маши́на", art: "car", teaches: ["МА"] },
    { word: "МУХА", spoken: "му́ха", art: "fly", teaches: ["МУ", "ХА"] },
    { word: "МУРАВЕЙ", spoken: "мураве́й", art: "ant", teaches: ["МУ"] },
    { word: "МОРЕ", spoken: "мо́ре", art: "sea", teaches: ["МО"] },
    { word: "МОСТ", spoken: "мо́ст", art: "bridge", teaches: ["МО"] },
    { word: "МЫШКА", spoken: "мы́шка", art: "mouse", teaches: ["МЫ"] },
    { word: "МЫЛО", spoken: "мы́ло", art: "soap", teaches: ["МЫ"] },
    // С
    { word: "САНИ", spoken: "са́ни", art: "sled", teaches: ["СА"] },
    { word: "САХАР", spoken: "са́хар", art: "sugar", teaches: ["СА"] },
    { word: "СУМКА", spoken: "су́мка", art: "bag", teaches: ["СУ"] },
    { word: "СУШКИ", spoken: "су́шки", art: "bagels", teaches: ["СУ"] },
    { word: "СОВЫ", spoken: "со́вы", art: "owls", teaches: ["СО"] },
    { word: "СОТЫ", spoken: "со́ты", art: "honey", teaches: ["СО"] },
    { word: "СЫР", spoken: "сы́р", art: "cheese", teaches: ["СЫ"] },
    { word: "БУСЫ", spoken: "бу́сы", art: "beads", teaches: ["СЫ"] },
    // Х
    { word: "ХАЛАТ", spoken: "хала́т", art: "robe", teaches: ["ХА"] },
    { word: "ХУДОЖНИК", spoken: "худо́жник", art: "painter", teaches: ["ХУ"] },
    { word: "ХУРМА", spoken: "хурма́", art: "persimmon", teaches: ["ХУ", "МА"] },
    { word: "ХОБОТ", spoken: "хо́бот", art: "trunk", teaches: ["ХО"] },
    {
      word: "ХОМЯК",
      spoken: "хомя́к",
      art: "hamster",
      teaches: ["ХО"],
      unstressed: ["ХО"],
    },
    // Р
    { word: "РАДУГА", spoken: "ра́дуга", art: "rainbow", teaches: ["РА"] },
    { word: "РАКЕТА", spoken: "раке́та", art: "rocket", teaches: ["РА"] },
    { word: "РУКА", spoken: "рука́", art: "hand", teaches: ["РУ"] },
    { word: "ГРУША", spoken: "гру́ша", art: "pear", teaches: ["РУ", "ША"] },
    { word: "РОЗА", spoken: "ро́за", art: "rose", teaches: ["РО"] },
    { word: "СОРОКА", spoken: "соро́ка", art: "magpie", teaches: ["РО"] },
    { word: "РЫБА", spoken: "ры́ба", art: "fish", teaches: ["РЫ"] },
    { word: "ШАРЫ", spoken: "шары́", art: "balloons", teaches: ["ША", "РЫ"] },
    // Ш
    { word: "ШАПКА", spoken: "ша́пка", art: "hat", teaches: ["ША"] },
    { word: "ШУБА", spoken: "шу́ба", art: "coat", teaches: ["ШУ"] },
    { word: "ШУРУП", spoken: "шуру́п", art: "screw", teaches: ["ШУ"] },
    { word: "ШОРТЫ", spoken: "шо́рты", art: "shorts", teaches: ["ШО"] },
    { word: "МЕШОК", spoken: "мешо́к", art: "sack", teaches: ["ШО"] },
  ];

  const syllablesOf = (letter) => letter.vowels.map((v) => letter.id + v);
  const syllables = LETTERS.flatMap(syllablesOf);

  // contains — все слоги курса, встречающиеся в слове. Нужен не для заданий,
  // а чтобы такой слог не попал в неверные варианты ответа: в слове МУХА
  // спрятаны и МУ, и ХА, и ребёнок был бы прав, указав любой из них.
  const words = WORDS.map((w) => ({
    ...w,
    contains: syllables.filter((s) => w.word.includes(s)),
    at: Object.fromEntries(w.teaches.map((s) => [s, w.word.indexOf(s)])),
  }));

  const byLetter = new Map(LETTERS.map((l) => [l.id, l]));
  const bySyllable = new Map(
    syllables.map((s) => [s, words.filter((w) => w.teaches.includes(s))]),
  );

  return {
    vowels: VOWELS,
    letters: LETTERS,
    letterIds: LETTERS.map((l) => l.id),
    syllables,
    words,
    letter: (id) => byLetter.get(id),
    letterOf: (syllable) => byLetter.get(syllable[0]),
    syllablesOf: (id) => {
      const letter = byLetter.get(id);
      return letter ? syllablesOf(letter) : [];
    },
    /**
     * Слова для задания на слог.
     * startOnly — только те, где слог стоит в начале слова (лёгкий режим).
     */
    wordsFor: (syllable, startOnly = false) => {
      const list = bySyllable.get(syllable) || [];
      return startOnly ? list.filter((w) => w.at[syllable] === 0) : list;
    },
  };
})();
