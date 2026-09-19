/**
 * Проверка занятия целиком: npm test.
 *
 * Браузера здесь нет — вместо него заглушка DOM, которая запоминает
 * разметку строкой. Этого хватает, чтобы прогнать состояние игры.
 *
 * Главное, ради чего тест написан, — инварианты заданий. Их не видно глазами:
 * что среди вариантов ответа нет второго слога, который тоже есть в слове;
 * что в «Подружи буквы» все варианты с одной согласной и только из пройденных
 * гласных; что в «Прочитай слово» нет ни одной непройденной буквы;
 * что в «Твёрдый или мягкий?» пара действительно из разных рядов.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

let checks = 0;
const failures = [];
function ok(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}
function equal(actual, expected, message) {
  ok(
    actual === expected,
    `${message}: получили ${JSON.stringify(actual)}, ждали ${JSON.stringify(expected)}`,
  );
}

const read = (file) => readFileSync(join("public", file), "utf8");

/** Минимальная заглушка узла: innerHTML запоминается строкой. */
class Node {
  constructor(id) {
    this.id = id;
    this.innerHTML = "";
    this.textContent = "";
    this.open = false;
    this.classList = { add() {}, remove() {} };
  }
  querySelector() {
    return { focus() {} };
  }
  querySelectorAll() {
    return [];
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  focus() {}
}

/** Поднимает приложение в отдельном контексте со своим localStorage. */
function launch(storage = {}, { denyWrites = false } = {}) {
  const nodes = new Map();
  const handlers = { click: [], submit: [] };
  const store = { ...storage };

  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, new Node(id));
      return nodes.get(id);
    },
    addEventListener(type, fn) {
      handlers[type]?.push(fn);
    },
  };

  const context = {
    document,
    window: { scrollTo() {} },
    console,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        if (denyWrites) throw new Error("QuotaExceededError");
        store[k] = String(v);
      },
    },
    // FormData в браузере читает форму; здесь форма — обычный объект.
    FormData: class {
      constructor(form) {
        this.values = form.values;
      }
      get(name) {
        const v = this.values[name];
        return Array.isArray(v) ? v[0] : v;
      }
      getAll(name) {
        const v = this.values[name];
        return v === undefined ? [] : Array.isArray(v) ? v : [v];
      }
    },
  };

  const source = [read("curriculum.js"), read("art.js"), read("app.js")].join(
    "\n",
  );
  // Внутренние переменные отдаём наружу геттерами: тест смотрит состояние,
  // а не переписывает его.
  const api = vm.runInNewContext(
    `${source}
;({
  get view() { return view },
  get session() { return session },
  get prefs() { return prefs },
  get history() { return history },
  CURRICULUM, ART, OPTION_COUNT, LENGTHS, STORE, plan, GAMES,
})`,
    context,
    { filename: "app-under-test.js" },
  );

  const fire = (type, event) => handlers[type].forEach((fn) => fn(event));

  // Геттеры нельзя разворачивать через spread: он взял бы значение один раз,
  // и состояние в тесте застыло бы на моменте запуска.
  return {
    get view() {
      return api.view;
    },
    get session() {
      return api.session;
    },
    get prefs() {
      return api.prefs;
    },
    get history() {
      return api.history;
    },
    CURRICULUM: api.CURRICULUM,
    ART: api.ART,
    OPTION_COUNT: api.OPTION_COUNT,
    LENGTHS: api.LENGTHS,
    STORE: api.STORE,
    plan: api.plan,
    GAMES: api.GAMES,
    nodes,
    store,
    /** Нажатие на кнопку с указанным data-action. */
    click(action, dataset = {}) {
      const button = { disabled: false, dataset: { action, ...dataset } };
      fire("click", {
        target: {
          closest: (selector) =>
            selector === "button[data-action]" ? button : null,
        },
      });
    },
    /** Отправка формы настроек. */
    saveSettings(values) {
      fire("submit", {
        target: {
          id: "settings-form",
          values,
          querySelector: () => ({ focus() {} }),
        },
        preventDefault() {},
      });
    },
    settings(overrides = {}) {
      return this.saveSettings({
        letters: ["М", "С"],
        vowels: ["А", "У", "О"],
        length: "6",
        prompt: "picture",
        position: "any",
        ...overrides,
      });
    },
    html: () => document.getElementById("main").innerHTML,
    dialog: () => document.getElementById("adult-dialog").innerHTML,
  };
}

// --- 1. Инварианты заданий на множестве случайных серий ---
{
  const app = launch();
  const { CURRICULUM, OPTION_COUNT } = app;

  const stages = ["С", "Т", "И", "Ж", "Ь", "Ё", "Ъ"].map((id) => ({
    id,
    ...CURRICULUM.upTo(id),
  }));

  for (const stage of stages) {
    for (const position of ["start", "any"]) {
      app.settings({
        letters: stage.letters,
        vowels: stage.vowels,
        length: "9",
        position,
      });
      const pool = stage.letters.flatMap((id) =>
        CURRICULUM.syllablesOf(id, stage.vowels),
      );
      const inPool = new Set(pool);
      const known = new Set([...stage.letters, ...stage.vowels]);

      for (let run = 0; run < 12; run++) {
        app.click("start", { mode: "mixed" });
        if (!app.session) {
          ok(false, `до ${stage.id}/${position}: серия не началась`);
          continue;
        }
        equal(
          app.session.queue.length,
          9,
          `до ${stage.id}/${position}: длина серии`,
        );

        for (const q of app.session.queue) {
          const where = `до ${stage.id}/${position}/${q.type}/${q.target || q.word?.word}`;

          if (q.type === "read") {
            ok(!!q.word, `${where}: нет слова`);
            // Ни одной буквы, которую ребёнок ещё не проходил.
            const unknown = [...q.word.word].filter((c) => !known.has(c));
            ok(
              unknown.length === 0,
              `${where}: непройденные буквы ${unknown.join("")}`,
            );
            equal(
              q.word.parts.join(""),
              q.word.word,
              `${where}: разбивка не складывается`,
            );
            continue;
          }

          if (q.type === "reverse") {
            ok(!q.options, `${where}: у обратного слога нет вариантов`);
            // Гласная впереди, и только та, что бывает в обратном слоге:
            // «эм» и «эс» — это названия букв, их называть нельзя.
            ok(
              "АУОЫИЕ".includes(q.target[0]),
              `${where}: первая буква не годится для обратного слога`,
            );
            ok(
              stage.vowels.includes(q.target[0]),
              `${where}: гласная ещё не пройдена`,
            );
            ok(
              stage.letters.includes(q.target[1]),
              `${where}: согласная ещё не пройдена`,
            );
            ok(
              CURRICULUM.letter(q.target[1])?.kind !== "sign",
              `${where}: обратный слог не может кончаться знаком`,
            );
            continue;
          }

          ok(pool.includes(q.target), `${where}: слог вне выбранного материала`);

          if (q.type === "card") {
            ok(!q.options, `${where}: у карточки не должно быть вариантов`);
            continue;
          }

          ok(q.options?.includes(q.target), `${where}: нет верного варианта`);
          equal(
            new Set(q.options).size,
            q.options.length,
            `${where}: варианты повторяются`,
          );

          if (q.type === "blend") {
            ok(
              q.options.every((s) => s[0] === q.target[0]),
              `${where}: в «Подружи буквы» согласные разные`,
            );
            ok(
              q.options.every((s) => stage.vowels.includes(s[1])),
              `${where}: предложена непройденная гласная`,
            );
            equal(
              q.options.length,
              CURRICULUM.syllablesOf(q.target[0], stage.vowels).length,
              `${where}: показаны не все доступные гласные`,
            );
          }

          if (q.type === "soft") {
            equal(q.options.length, 2, `${where}: в паре должно быть два слога`);
            ok(
              q.options.every((s) => inPool.has(s)),
              `${where}: слог пары вне материала`,
            );
            ok(
              q.options[0][0] === q.options[1][0],
              `${where}: в паре разные согласные`,
            );
            const rows = q.options.map(
              (s) => CURRICULUM.letter(s[1]).row,
            );
            ok(
              rows[0] !== rows[1],
              `${where}: оба слога одного ряда (${q.options.join("/")})`,
            );
          }

          if (q.type === "picture") {
            ok(!!q.word, `${where}: нет слова`);
            ok(
              q.word.teaches.includes(q.target),
              `${where}: слово ${q.word?.word} не учит этому слогу`,
            );
            ok(
              q.options.length >= 2 && q.options.length <= OPTION_COUNT,
              `${where}: вариантов ${q.options.length}`,
            );
            // Главный инвариант: в слове МУХА спрятаны и МУ, и ХА.
            // Если оба попадут в варианты, ребёнок может быть прав и ошибиться.
            for (const option of q.options)
              if (option !== q.target)
                ok(
                  !q.word.contains.includes(option),
                  `${where}: вариант ${option} тоже есть в слове ${q.word.word}`,
                );
            if (position === "start")
              equal(
                q.word.at[q.target],
                0,
                `${where}: в лёгком режиме слог не в начале (${q.word.word})`,
              );
          }
        }
      }
    }
  }
}

// --- 2. Каждая игра доступна там, где должна ---
{
  const app = launch();
  app.settings({ letters: ["М", "С"], vowels: ["А", "У", "О"] });
  let p = app.plan();
  ok(p.card.length && p.blend.length, "в начале есть карточки и соединение");
  ok(p.picture.length, "есть задания на поиск слога");
  ok(p.read.length, "есть что прочитать уже на первых буквах");
  equal(p.soft.length, 0, "без мягких гласных пары твёрдый/мягкий не бывает");

  ok(p.reverse.length, "обратные слоги есть с первых букв");
  ok(
    p.reverse.every((s) => !p.pool.includes(s)),
    "обратный слог не путается с прямым",
  );

  const upToYo = app.CURRICULUM.upTo("Ё");
  app.settings({ letters: upToYo.letters, vowels: upToYo.vowels });
  p = app.plan();
  ok(p.soft.length > 0, "с мягкими гласными появляется игра на пары");
  ok(
    p.soft.every((s) => app.CURRICULUM.softPair(s)),
    "у каждого слога пары есть партнёр",
  );
  // Я, Ю и Ё в обратный слог не берутся, хотя в прямых они есть.
  ok(
    p.reverse.every((s) => !"ЯЮЁЭ".includes(s[0])),
    "в обратном слоге нет Я, Ю, Ё и Э",
  );
}

// --- 2б. Обратный слог: результат отмечает взрослый ---
{
  const app = launch();
  app.settings({ letters: ["М", "С"], vowels: ["А", "У", "О"], length: "3" });
  app.click("start", { mode: "reverse" });
  const q = app.session.queue[0];
  ok(app.html().includes("Обратный слог"), "заголовок игры показан");
  ok(app.html().includes(`>${q.target}<`), "слог показан на карточке");
  const compare = (q.target[1] + q.target[0]).toLowerCase();
  ok(
    app.html().includes(compare),
    `подсказка предлагает сравнить с прямым слогом «${compare}»`,
  );
  app.click("card-done", { help: "no" });
  equal(app.session.index, 1, "задание засчитано без выбора варианта");
}

// --- 3. Полная серия: всё самостоятельно ---
{
  const app = launch();
  app.settings({ letters: ["М", "С"], vowels: ["А", "У", "О"], length: "6" });
  app.click("start", { mode: "mixed" });

  for (let i = 0; i < 6; i++) {
    if (!app.session) break;
    const q = app.session.queue[app.session.index];
    if (q.type === "card" || q.type === "read") {
      app.click("card-done", { help: "no" });
    } else {
      if (q.type === "blend") app.click("select-consonant");
      app.click(q.type === "blend" ? "vowel" : "answer", { value: q.target });
      app.click("next");
    }
  }
  equal(app.view, "summary", "после шести заданий показан итог");
  equal(app.history.length, 1, "занятие записано в историю");
  equal(app.history[0]?.completed, 6, "засчитаны все шесть заданий");
  equal(app.history[0]?.independent, 6, "все шесть — самостоятельно");
  ok(app.html().includes("Твой сад растёт"), "на итоге поздравление");
  ok(
    JSON.parse(app.store[app.STORE]).history.length === 1,
    "история попала в localStorage",
  );
}

// --- 4. Ошибка и подсказка засчитываются как помощь ---
{
  const app = launch();
  app.settings({
    letters: ["М", "С"],
    vowels: ["А", "У", "О"],
    length: "3",
    prompt: "word",
  });
  app.click("start", { mode: "picture" });

  const first = app.session.queue[0];
  const wrong = first.options.find((s) => s !== first.target);
  app.click("answer", { value: wrong });
  ok(app.session.lastWrong === wrong, "неверный ответ отмечен");
  ok(!app.session.solved, "задание не считается решённым");
  ok(
    app.html().includes("Попробуй другую карточку"),
    "показана подсказка про повтор",
  );

  app.click("answer", { value: first.target });
  ok(app.session.solved, "верный ответ принят");
  ok(app.html().includes("Получилось!"), "показана похвала");
  app.click("next");

  app.click("hint");
  ok(app.session.assisted, "подсказка помечает задание как «с помощью»");
  app.click("answer", { value: app.session.queue[1].target });
  app.click("next");
  app.click("answer", { value: app.session.queue[2].target });
  app.click("next");

  equal(app.history[0]?.completed, 3, "выполнено три задания");
  equal(app.history[0]?.independent, 1, "самостоятельно только третье");
}

// --- 5. Нельзя выбрать гласную, не нажав согласную ---
{
  const app = launch();
  app.settings({ letters: ["Х"], vowels: ["А", "У", "О"], length: "3" });
  app.click("start", { mode: "blend" });
  const q = app.session.queue[0];
  app.click("vowel", { value: q.target });
  ok(!app.session.solved, "гласная без согласной не засчитывается");
  ok(
    app.html().includes(`Сначала нажми на «${q.target[0]}»`),
    "подсказка называет нужную согласную",
  );
  app.click("select-consonant");
  app.click("vowel", { value: q.target });
  ok(app.session.solved, "после согласной гласная принимается");
  ok(app.html().includes("blend-result"), "слог показан собранным");
}

// --- 6. Чтение слова: картинка открывается, но помощью не считается ---
{
  const app = launch();
  const upToT = app.CURRICULUM.upTo("Т");
  app.settings({ letters: upToT.letters, vowels: upToT.vowels, length: "3" });
  app.click("start", { mode: "read" });
  const q = app.session.queue[0];
  ok(app.html().includes("read-word"), "слово показано по слогам");
  for (const part of q.word.parts)
    ok(app.html().includes(`<span>${part}</span>`), `слог ${part} показан`);
  app.click("reveal");
  ok(app.session.revealed, "картинка открыта");
  ok(!app.session.assisted, "показ картинки не считается помощью");
  app.click("card-done", { help: "no" });
  equal(app.session.index, 1, "задание засчитано");
}

// --- 7. Незавершённая серия сохраняется частично ---
{
  const app = launch();
  app.settings({ letters: ["М"], vowels: ["А", "У", "О"], length: "9" });
  app.click("start", { mode: "card" });
  app.click("card-done", { help: "yes" });
  app.click("card-done", { help: "no" });
  app.click("pause");
  app.click("end");
  equal(app.view, "summary", "пауза с завершением ведёт на итог");
  equal(app.history[0]?.completed, 2, "записаны только выполненные задания");
  equal(app.history[0]?.independent, 1, "одно из двух самостоятельно");
}

// --- 8. Невозможные наборы букв отклоняются ---
{
  const app = launch();
  const before = app.prefs.letters.join();

  app.settings({ letters: [] });
  equal(app.prefs.letters.join(), before, "без согласных настройки не меняются");
  equal(
    app.nodes.get("save-status")?.textContent,
    "Выберите хотя бы одну согласную.",
    "объяснение про согласные",
  );

  app.settings({ vowels: [] });
  equal(
    app.nodes.get("save-status")?.textContent,
    "Выберите хотя бы одну гласную.",
    "объяснение про гласные",
  );

  // Ь и Ъ слогов не дают: занятие из них не собрать.
  app.settings({ letters: ["Ь", "Ъ"], vowels: ["А"] });
  equal(app.prefs.letters.join(), before, "набор без слогов не применяется");
  ok(
    app.nodes.get("save-status")?.textContent.includes("ни одного слога"),
    "объяснение про отсутствие слогов",
  );

  // Х и Ы существуют по отдельности, но слога ХЫ в русском языке нет.
  app.settings({ letters: ["Х"], vowels: ["Ы"] });
  equal(app.prefs.letters.join(), before, "несуществующее слияние отклонено");
}

// --- 9. Пресет «дошли до буквы» повторяет порядок букваря ---
{
  const app = launch();
  const { CURRICULUM } = app;
  equal(CURRICULUM.upTo("С").vowels.join(""), "АУО", "до С гласные А, У, О");
  equal(CURRICULUM.upTo("Т").vowels.join(""), "АУОЫ", "до Т добавляется Ы");
  equal(CURRICULUM.upTo("П").vowels.join(""), "АУОЫИ", "до П добавляется И");
  ok(CURRICULUM.upTo("Ъ").letters.includes("Ь"), "знаки попадают в буквы");
  equal(
    CURRICULUM.upTo("С").letters.join(""),
    "МС",
    "до С согласные М и С",
  );
  // Несуществующая буква не должна обрезать материал до пустого.
  ok(CURRICULUM.upTo("Щ").letters.length > 15, "до Щ почти весь алфавит");
}

// --- 10. Перенос сохранений с прошлых версий ---
{
  const v1 = JSON.stringify({
    prefs: { syllables: ["СА", "СО"], length: 3, prompt: "word" },
    history: [{ time: Date.now(), completed: 3, independent: 2, total: 3 }],
  });
  const app = launch({ "sad-slogov-v1": v1 });
  equal(app.prefs.letters.join(), "С", "буква выведена из старых слогов");
  equal(app.prefs.vowels.join(""), "АУО", "гласные подставлены");
  equal(app.prefs.length, 3, "длина серии перенесена");
  equal(app.history.length, 1, "история перенесена");

  const v2 = JSON.stringify({
    prefs: { letters: ["М", "Х"], length: 9, prompt: "picture", position: "start" },
    history: [{ time: Date.now(), completed: 9, independent: 9, total: 9 }],
  });
  const app2 = launch({ "sad-slogov-v2": v2 });
  equal(app2.prefs.letters.join(""), "МХ", "буквы версии 2 сохранены");
  equal(app2.prefs.vowels.join(""), "АУОЫ", "гласные версии 2 восстановлены");
  equal(app2.prefs.position, "start", "режим поиска слога перенесён");
  equal(app2.history.length, 1, "история версии 2 перенесена");
}

// --- 11. Мусор в хранилище не ломает запуск ---
{
  const app = launch({
    "sad-slogov-v3": JSON.stringify({
      prefs: {
        letters: ["Ъ\u0000", "Q", "Ж"],
        vowels: ["W"],
        length: 77,
        prompt: "hack",
        position: "x",
      },
      history: [{ time: "вчера", completed: 900, independent: -5 }, null],
    }),
  });
  equal(app.prefs.letters.join(), "Ж", "неизвестные буквы отброшены");
  equal(app.prefs.vowels.join(""), "АУО", "неизвестные гласные заменены");
  equal(app.prefs.length, 6, "недопустимая длина заменена");
  equal(app.prefs.prompt, "picture", "недопустимый режим заменён");
  equal(app.prefs.position, "any", "недопустимая позиция заменена");
  equal(app.history.length, 0, "битые записи истории отброшены");
}

// --- 12. Запрет localStorage не мешает играть ---
{
  const app = launch({}, { denyWrites: true });
  app.settings({ letters: ["С"], vowels: ["А", "У", "О"], length: "3" });
  equal(app.prefs.letters.join(), "С", "настройки действуют без сохранения");
  app.click("start", { mode: "card" });
  app.click("card-done", { help: "no" });
  app.click("card-done", { help: "no" });
  app.click("card-done", { help: "no" });
  equal(app.view, "summary", "серия доходит до итога");
  ok(
    app.html().includes("Браузер не разрешил сохранить результат"),
    "взрослому объяснено, что результат не сохранён",
  );
}

// --- 13. Настройки взрослого собираются на любом объёме материала ---
{
  const app = launch();
  const full = app.CURRICULUM.upTo("Ъ");
  app.settings({ letters: full.letters, vowels: full.vowels });
  app.click("adult");
  const html = app.dialog();
  for (const letter of app.CURRICULUM.alphabet)
    ok(
      html.includes(`data-letter="${letter.id}"`),
      `в лесенке есть буква ${letter.id}`,
    );
  ok(html.includes("Согласные и знаки"), "есть выбор согласных");
  ok(html.includes("Гласные"), "есть выбор гласных");
  ok(html.includes("letter-guide"), "подсказки по буквам свёрнуты в details");
}

// --- Отчёт ---
if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error(`не сошлось: ${f}`);
  if (failures.length > 40) console.error(`… и ещё ${failures.length - 40}`);
  console.error(`\nПроверок: ${checks}, не прошло: ${failures.length}`);
  process.exit(1);
}
console.log(`Проверок пройдено: ${checks}`);
