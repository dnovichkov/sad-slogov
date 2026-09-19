/**
 * Проверка исходников и учебного материала: npm run check.
 *
 * Ловит то, что молча ломает занятие, а не страницу: слог, которого нет
 * в русском языке; слово с безударной «О»; латинскую «C» вместо кириллической;
 * опечатку в ключе рисунка; незакрытый тег в SVG.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ACCENT = "́"; // знак ударения, комбинируемый символ U+0301
const errors = [];
const notes = [];
const fail = (message) => errors.push(message);

function load(file, name) {
  const source = readFileSync(join("public", file), "utf8");
  try {
    return vm.runInNewContext(`${source}\n${name};`, {}, { filename: file });
  } catch (error) {
    fail(`${file}: не выполняется — ${error.message}`);
    return null;
  }
}

// --- 1. Синтаксис всех скриптов ---
// app.js обращается к document, поэтому его только разбираем, но не выполняем.
const scripts = readdirSync("public").filter((f) => f.endsWith(".js"));
for (const file of scripts) {
  try {
    new vm.Script(readFileSync(join("public", file), "utf8"), {
      filename: file,
    });
  } catch (error) {
    fail(`${file}: синтаксическая ошибка — ${error.message}`);
  }
}
if (errors.length) {
  for (const error of errors) console.error(`ошибка: ${error}`);
  process.exit(1);
}

const CURRICULUM = load("curriculum.js", "CURRICULUM");
const ART = load("art.js", "ART");
if (!CURRICULUM || !ART) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// --- 2. Алфавит ---
const ids = new Set();
const vowelIds = new Set(CURRICULUM.vowelIds);
for (const letter of CURRICULUM.alphabet) {
  const where = `буква ${letter.id}`;
  if (ids.has(letter.id)) fail(`${where}: повторяется в алфавите`);
  ids.add(letter.id);
  if ([...letter.id].length !== 1) fail(`${where}: id должен быть одной буквой`);
  if (!["vowel", "consonant", "semivowel", "sign"].includes(letter.kind))
    fail(`${where}: неизвестный вид "${letter.kind}"`);

  if (letter.kind === "vowel") {
    if (!["hard", "soft"].includes(letter.row))
      fail(`${where}: ряд должен быть hard или soft`);
    const pair = CURRICULUM.letter(letter.pair);
    if (!pair || pair.kind !== "vowel")
      fail(`${where}: парная гласная "${letter.pair}" не найдена`);
    else if (pair.pair !== letter.id)
      fail(`${where}: пара с ${pair.id} несимметрична`);
    else if (pair.row === letter.row)
      fail(`${where}: пара ${pair.id} того же ряда — должна быть другого`);
  } else if (letter.kind === "consonant") {
    if (!letter.vowels?.length) fail(`${where}: не указаны гласные`);
    if (!letter.sound) fail(`${where}: не указано, как звучит (sound)`);
    if (typeof letter.hold !== "boolean")
      fail(`${where}: не указано, можно ли тянуть звук (hold)`);
    for (const v of letter.vowels || [])
      if (!vowelIds.has(v)) fail(`${where}: гласная ${v} не описана в алфавите`);
  }
  if (!letter.tip && letter.kind !== "vowel")
    fail(`${where}: нет подсказки взрослому (tip)`);
}

// --- 3. Слияний, которых нет в русском языке, быть не должно ---
// Это не стилистика, а орфография: ЖЫ и ШЫ не пишутся, ГЫ/КЫ/ХЫ не бывает.
const FORBIDDEN = [
  "ЖЫ", "ШЫ", "ЦЯ", "ЦЮ", "ЦЁ", "ЧЯ", "ЧЮ", "ЧЫ", "ЩЯ", "ЩЮ", "ЩЫ",
  "ГЫ", "КЫ", "ХЫ", "ЖЯ", "ЖЮ", "ШЯ", "ШЮ",
];
const syllables = CURRICULUM.syllables;
const syllableSet = new Set(syllables);
if (syllableSet.size !== syllables.length) fail("слоги повторяются");
for (const bad of FORBIDDEN)
  if (syllableSet.has(bad))
    fail(`слог ${bad}: в русском языке такого сочетания нет`);

// --- 4. Слова ---
const seenWords = new Set();
const usedArt = new Set();
const undrawn = new Set();
for (const w of CURRICULUM.words) {
  const where = `слово ${w.word}`;
  if (seenWords.has(w.word)) fail(`${where}: встречается дважды`);
  seenWords.add(w.word);

  // Латинская «C» и кириллическая «С» выглядят одинаково: ловим по алфавиту.
  for (const ch of w.word)
    if (!ids.has(ch))
      fail(`${where}: символ "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}) не из русского алфавита курса`);

  if (!w.parts.length || w.parts.some((part) => !part))
    fail(`${where}: пустой слог в разбивке "${w.split}"`);
  if (w.parts.join("") !== w.word)
    fail(`${where}: разбивка "${w.split}" не складывается в слово`);

  // «Ё» в русском языке всегда ударная и знаком не помечается.
  const hasYo = w.word.includes("Ё");
  const accents = [...w.spoken].filter((c) => c === ACCENT).length;
  if (hasYo && accents !== 0)
    fail(`${where}: в слове есть «ё» — знак ударения не нужен`);
  if (!hasYo && accents !== 1)
    fail(`${where}: знаков ударения ${accents}, нужен ровно один`);
  if (w.spoken.replaceAll(ACCENT, "") !== w.word.toLowerCase())
    fail(`${where}: "${w.spoken}" не совпадает со словом`);

  if (w.art) {
    usedArt.add(w.art);
    if (!ART.has(w.art)) undrawn.add(w.art);
  }

  for (const s of w.also || []) {
    if (!syllableSet.has(s))
      fail(`${where}: в исключениях слог ${s}, которого нет в курсе`);
    else if (!w.word.includes(s))
      fail(`${where}: в исключениях слог ${s}, которого нет в слове`);
    else if (!"ОЕЯ".includes(s[1]))
      fail(`${where}: слог ${s} не нуждается в исключении — гласная не безударная`);
  }

  for (const s of w.teaches) {
    if (!syllableSet.has(s)) fail(`${where}: учит слогу ${s} вне курса`);
    if (!w.contains.includes(s))
      fail(`${where}: ${s} потерялся в вычисленном списке contains`);
    if (!(s in w.at)) fail(`${where}: не найдено место слога ${s}`);
  }
}

// --- 5. Рисунки: целостность разметки ---
/**
 * Рисунки собираются склейкой строк, поэтому обычные ошибки здесь —
 * незакрытый тег и NaN, приехавший из шаблонной подстановки.
 * Полноценный парсер не нужен: хватает баланса тегов.
 */
function svgProblems(markup) {
  const problems = [];
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let match;
  while ((match = tag.exec(markup))) {
    const [, closing, name, , selfClosing] = match;
    if (closing) {
      const open = stack.pop();
      if (open !== name)
        problems.push(`</${name}> закрывает <${open ?? "пустоту"}>`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  if (stack.length) problems.push(`не закрыты теги: ${stack.join(", ")}`);
  if (/\bNaN\b|undefined/.test(markup))
    problems.push("в разметке есть NaN или undefined");
  for (const [, color] of markup.matchAll(/(?:fill|stroke)="([^"]*)"/g))
    if (!/^(none|currentColor|#[0-9a-fA-F]{3,8})$/.test(color))
      problems.push(`непонятный цвет "${color}"`);
  return problems;
}

const drawings = [
  ...ART.keys().map((key) => [`рисунок "${key}"`, ART.word(key)]),
  ["сад на главной", ART.garden(syllables.slice(0, 3))],
  ["итог занятия", ART.summary(9)],
];
for (const [what, markup] of drawings) {
  if (markup.length < 200) fail(`${what}: подозрительно пустой`);
  for (const problem of svgProblems(markup)) fail(`${what}: ${problem}`);
}
for (const key of ART.keys())
  if (!usedArt.has(key))
    notes.push(`рисунок "${key}" не используется ни одним словом`);
if (undrawn.size)
  notes.push(
    `ключи без рисунка (${undrawn.size}): ${[...undrawn].join(", ")} — такие слова показываются текстом`,
  );

// --- 6. index.html подключает все скрипты ---
const html = readFileSync(join("public", "index.html"), "utf8");
for (const file of scripts)
  if (!html.includes(file)) fail(`index.html не подключает ${file}`);
for (const asset of ["style.css", "icon.svg"])
  if (!html.includes(asset)) fail(`index.html не ссылается на ${asset}`);

// --- Отчёт ---
const known = (letters, vowels) => new Set([...letters, ...vowels]);
console.log(
  `Букв: ${CURRICULUM.alphabet.length} · согласных ${CURRICULUM.letters.length}, гласных ${CURRICULUM.vowelLetters.length}, знаков ${CURRICULUM.signs.length}`,
);
console.log(`Слогов: ${syllables.length}   Слов: ${CURRICULUM.words.length}`);
console.log("");
console.log("этап          гласные      слогов  со словом  с рисунком  для чтения");
for (const upTo of ["С", "Т", "И", "Ж", "Ь", "Ё", "Ъ"]) {
  const { letters, vowels } = CURRICULUM.upTo(upTo);
  const pool = letters.flatMap((id) => CURRICULUM.syllablesOf(id, vowels));
  const withWord = pool.filter((s) => CURRICULUM.wordsFor(s).length).length;
  const withArt = pool.filter((s) =>
    CURRICULUM.wordsFor(s).some((w) => w.art && ART.has(w.art)),
  ).length;
  const alphabet = known(letters, vowels);
  const readable = CURRICULUM.words.filter((w) =>
    [...w.word].every((c) => alphabet.has(c)),
  ).length;
  console.log(
    `до ${upTo}`.padEnd(14) +
      vowels.join("").padEnd(12) +
      String(pool.length).padStart(5) +
      String(withWord).padStart(10) +
      String(withArt).padStart(11) +
      String(readable).padStart(11),
  );
}

const noWords = syllables.filter((s) => !CURRICULUM.wordsFor(s).length);
if (noWords.length) {
  console.log("");
  console.log(
    `Слоги без слова (${noWords.length}): ${noWords.join(" ")}\n` +
      "  Читаются в карточках и в соединении букв; в поиске слога не встречаются.",
  );
}

if (notes.length) {
  console.log("");
  for (const note of notes) console.log(`замечание: ${note}`);
}

if (errors.length) {
  console.log("");
  for (const error of errors) console.error(`ошибка: ${error}`);
  console.error(`\nНе пройдено: ${errors.length}`);
  process.exit(1);
}
console.log("\nМатериал согласован.");
