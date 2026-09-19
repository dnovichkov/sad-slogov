/**
 * Проверка занятия целиком: npm test.
 *
 * Браузера здесь нет — вместо него заглушка DOM, которая запоминает
 * разметку строкой. Этого хватает, чтобы прогнать состояние игры:
 * собрать серию, ответить верно и неверно, дойти до итога, сохранить настройки.
 *
 * Главное, ради чего тест написан, — инварианты заданий. Их не видно глазами:
 * что среди вариантов ответа нет второго слога, который тоже есть в слове,
 * что в «Подружи буквы» все варианты с одной согласной,
 * что слово действительно учит нужному слогу.
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
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  focus() {}
}

/**
 * Поднимает приложение в отдельном контексте со своим localStorage.
 * @param {object} storage начальное содержимое localStorage
 */
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
  CURRICULUM, ART, OPTION_COUNT, LENGTHS, STORE,
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
        target: { id: "settings-form", values, querySelector: () => ({ focus() {} }) },
        preventDefault() {},
      });
    },
    html: () => document.getElementById("main").innerHTML,
  };
}

// --- 1. Инварианты заданий на множестве случайных серий ---
{
  const app = launch();
  const { CURRICULUM, OPTION_COUNT } = app;

  for (const letters of [
    ["М", "С"],
    ["Х"],
    ["М", "С", "Х", "Р", "Ш"],
    ["Ш", "Р"],
  ]) {
    for (const position of ["start", "any"]) {
      app.saveSettings({ letters, length: "9", prompt: "picture", position });
      const pool = letters.flatMap((id) => CURRICULUM.syllablesOf(id));

      for (let run = 0; run < 40; run++) {
        app.click("start", { mode: "mixed" });
        if (!app.session) { ok(false, `${letters}/${position}: серия не началась`); continue; }
        const queue = app.session.queue;
        equal(queue.length, 9, `${letters}/${position}: длина серии`);

        for (const q of queue) {
          const where = `${letters}/${position}/${q.type}/${q.target}`;
          ok(pool.includes(q.target), `${where}: слог вне выбранных букв`);
          ok(q.options.includes(q.target), `${where}: нет верного варианта`);
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
            equal(
              q.options.length,
              CURRICULUM.syllablesOf(q.target[0]).length,
              `${where}: показаны не все гласные буквы`,
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

// --- 2. Полная серия: всё самостоятельно ---
{
  const app = launch();
  app.saveSettings({
    letters: ["М", "С"],
    length: "6",
    prompt: "picture",
    position: "any",
  });
  app.click("start", { mode: "mixed" });

  for (let i = 0; i < 6; i++) {
    if (!app.session) break;
    const q = app.session.queue[app.session.index];
    if (q.type === "card") {
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

// --- 3. Ошибка и подсказка засчитываются как помощь ---
{
  const app = launch();
  app.saveSettings({
    letters: ["М", "С"],
    length: "3",
    prompt: "word",
    position: "any",
  });
  app.click("start", { mode: "picture" });

  const first = app.session.queue[0];
  const wrong = first.options.find((s) => s !== first.target);
  app.click("answer", { value: wrong });
  ok(app.session.lastWrong === wrong, "неверный ответ отмечен");
  ok(!app.session.solved, "задание не считается решённым");
  ok(app.html().includes("Попробуй другую карточку"), "показана подсказка про повтор");

  app.click("answer", { value: first.target });
  ok(app.session.solved, "верный ответ принят");
  ok(app.html().includes("Получилось!"), "показана похвала");
  app.click("next");

  // Второе задание: сразу просим подсказку.
  app.click("hint");
  ok(app.session.assisted, "подсказка помечает задание как «с помощью»");
  const second = app.session.queue[1];
  app.click("answer", { value: second.target });
  app.click("next");

  const third = app.session.queue[2];
  app.click("answer", { value: third.target });
  app.click("next");

  equal(app.history[0]?.completed, 3, "выполнено три задания");
  equal(app.history[0]?.independent, 1, "самостоятельно только третье");
}

// --- 4. Нельзя выбрать гласную, не нажав согласную ---
{
  const app = launch();
  app.saveSettings({
    letters: ["Х"],
    length: "3",
    prompt: "picture",
    position: "any",
  });
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

// --- 5. Незавершённая серия сохраняется частично ---
{
  const app = launch();
  app.saveSettings({
    letters: ["М"],
    length: "9",
    prompt: "picture",
    position: "any",
  });
  app.click("start", { mode: "card" });
  app.click("card-done", { help: "yes" });
  app.click("card-done", { help: "no" });
  app.click("pause");
  app.click("end");
  equal(app.view, "summary", "пауза с завершением ведёт на итог");
  equal(app.history[0]?.completed, 2, "записаны только выполненные задания");
  equal(app.history[0]?.independent, 1, "одно из двух самостоятельно");
}

// --- 6. Пустой набор букв отклоняется ---
{
  const app = launch();
  const before = [...app.prefs.letters];
  app.saveSettings({
    letters: [],
    length: "6",
    prompt: "picture",
    position: "any",
  });
  equal(
    app.prefs.letters.join(),
    before.join(),
    "настройки без букв не применяются",
  );
  equal(
    app.nodes.get("save-status")?.textContent,
    "Выберите хотя бы одну букву.",
    "объяснение показано",
  );
}

// --- 7. Перенос сохранений с первой версии ---
{
  const legacy = JSON.stringify({
    prefs: { syllables: ["СА", "СО"], length: 3, prompt: "word" },
    history: [{ time: Date.now(), completed: 3, independent: 2, total: 3 }],
  });
  const app = launch({ "sad-slogov-v1": legacy });
  equal(app.prefs.letters.join(), "С", "буква выведена из старых слогов");
  equal(app.prefs.length, 3, "длина серии перенесена");
  equal(app.prefs.prompt, "word", "режим показа перенесён");
  equal(app.history.length, 1, "история перенесена");
}

// --- 8. Мусор в хранилище не ломает запуск ---
{
  const app = launch({
    "sad-slogov-v2": JSON.stringify({
      prefs: { letters: ["Ъ", "Э"], length: 77, prompt: "hack", position: "x" },
      history: [{ time: "вчера", completed: 900, independent: -5 }, null],
    }),
  });
  equal(
    app.prefs.letters.join(),
    ["М", "С"].join(),
    "неизвестные буквы заменены значением по умолчанию",
  );
  equal(app.prefs.length, 6, "недопустимая длина заменена");
  equal(app.prefs.prompt, "picture", "недопустимый режим заменён");
  equal(app.prefs.position, "any", "недопустимая позиция заменена");
  equal(app.history.length, 0, "битые записи истории отброшены");
}

// --- 9. Запрет localStorage не мешает играть ---
{
  const app = launch({}, { denyWrites: true });
  app.saveSettings({
    letters: ["С"],
    length: "3",
    prompt: "picture",
    position: "start",
  });
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

// --- Отчёт ---
if (failures.length) {
  for (const f of failures) console.error(`не сошлось: ${f}`);
  console.error(`\nПроверок: ${checks}, не прошло: ${failures.length}`);
  process.exit(1);
}
console.log(`Проверок пройдено: ${checks}`);
