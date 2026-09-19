/**
 * Проверка исходников и учебного материала: npm run check.
 *
 * Ловит то, что молча ломает занятие, а не страницу:
 * опечатку в ключе рисунка, слог без слов, слово с безударной «О»
 * (в речи она звучит как [а], и ребёнок не услышит нужный слог).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ACCENT = "́"; // знак ударения, комбинируемый символ U+0301
const errors = [];
const notes = [];
const fail = (message) => errors.push(message);

/** Загружает обычный (не модульный) скрипт из public/ и отдаёт его глобальную константу. */
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

// --- 2. Буквы и слоги ---
const vowels = new Set(CURRICULUM.vowels);
const seenLetters = new Set();
for (const letter of CURRICULUM.letters) {
  const where = `буква ${letter.id}`;
  if (seenLetters.has(letter.id)) fail(`${where}: повторяется в списке`);
  seenLetters.add(letter.id);
  if (letter.id.length !== 1) fail(`${where}: id должен быть одной буквой`);
  if (!letter.vowels?.length) fail(`${where}: не указаны гласные`);
  if (!letter.sound) fail(`${where}: не указано, как тянуть звук (sound)`);
  if (!letter.tip) fail(`${where}: нет подсказки взрослому (tip)`);
  for (const v of letter.vowels || [])
    if (!vowels.has(v)) fail(`${where}: гласная ${v} не описана в VOWELS`);
}

const syllables = CURRICULUM.syllables;
if (new Set(syllables).size !== syllables.length)
  fail("слоги повторяются в общем списке");

// --- 3. Слова ---
const seenWords = new Set();
const usedArt = new Set();
for (const w of CURRICULUM.words) {
  const where = `слово ${w.word}`;
  if (seenWords.has(w.word)) fail(`${where}: встречается дважды`);
  seenWords.add(w.word);

  if (!ART.has(w.art)) fail(`${where}: нет рисунка с ключом "${w.art}"`);
  usedArt.add(w.art);

  // spoken — то же слово строчными плюс ровно один знак ударения.
  const accents = [...w.spoken].filter((c) => c === ACCENT).length;
  const bare = w.spoken.replaceAll(ACCENT, "");
  if (accents !== 1)
    fail(`${where}: в "${w.spoken}" знаков ударения ${accents}, нужен один`);
  if (bare !== w.word.toLowerCase())
    fail(`${where}: "${w.spoken}" не совпадает со словом без ударения`);
  const stressedAt = w.spoken.indexOf(ACCENT) - 1;

  if (!w.teaches?.length) fail(`${where}: не указано, какие слоги оно учит`);
  const declaredUnstressed = new Set(w.unstressed || []);

  for (const syllable of w.teaches || []) {
    if (!syllables.includes(syllable)) {
      fail(`${where}: учит слогу ${syllable}, которого нет в курсе`);
      continue;
    }
    const at = w.word.indexOf(syllable);
    if (at < 0) {
      fail(`${where}: слога ${syllable} в слове нет`);
      continue;
    }
    if (!w.contains.includes(syllable))
      fail(`${where}: ${syllable} потерялся в вычисленном списке contains`);

    // Безударная «О» звучит как [а]: «соро́ка» это [сарока].
    // Такое слово нельзя давать на слог с «О», не пометив это осознанно.
    if (syllable[1] === "О" && stressedAt !== at + 1) {
      if (!declaredUnstressed.has(syllable))
        fail(
          `${where}: «О» в ${syllable} безударная — ребёнок услышит [а]. ` +
            `Замените слово или добавьте unstressed: ["${syllable}"].`,
        );
    } else if (declaredUnstressed.has(syllable)) {
      fail(`${where}: ${syllable} помечен unstressed, но гласная ударная`);
    }
  }
  for (const syllable of declaredUnstressed)
    if (!w.teaches.includes(syllable))
      fail(`${where}: ${syllable} в unstressed, но слово ему не учит`);
}

// --- 4. У каждого слога есть материал ---
const rows = [];
for (const syllable of syllables) {
  const all = CURRICULUM.wordsFor(syllable);
  const fromStart = CURRICULUM.wordsFor(syllable, true);
  if (all.length < 2)
    fail(
      `слог ${syllable}: слов ${all.length}, нужно хотя бы два — иначе задания повторяются`,
    );
  if (!fromStart.length)
    fail(
      `слог ${syllable}: нет слова, которое с него начинается — ` +
        `режим «только начало слова» останется без заданий`,
    );
  rows.push([syllable, all.length, fromStart.length, all.map((w) => w.word)]);
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

// --- 6. index.html подключает все скрипты ---
const html = readFileSync(join("public", "index.html"), "utf8");
for (const file of scripts)
  if (!html.includes(file)) fail(`index.html не подключает ${file}`);
for (const asset of ["style.css", "icon.svg"])
  if (!html.includes(asset)) fail(`index.html не ссылается на ${asset}`);

// --- Отчёт ---
console.log(
  `Букв: ${CURRICULUM.letters.length} (${CURRICULUM.letterIds.join(" ")})`,
);
console.log(`Слогов: ${syllables.length}   Слов: ${CURRICULUM.words.length}`);
console.log("");
console.log("слог   слов  с начала  примеры");
for (const [syllable, all, fromStart, words] of rows)
  console.log(
    `${syllable.padEnd(6)} ${String(all).padStart(4)}  ${String(fromStart).padStart(8)}  ${words.join(", ")}`,
  );

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
