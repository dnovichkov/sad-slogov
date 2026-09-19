"use strict";
/**
 * Игровая логика занятия.
 * Учебный материал — в curriculum.js, иллюстрации — в art.js.
 *
 * Состояние: view (home | lesson | summary) и объект session.
 * При любом изменении главная область перерисовывается целиком —
 * поэтому фокус после перерисовки возвращается вручную.
 *
 * Материал задаётся двумя осями: согласные (и знаки) и гласные.
 * Слог попадает в занятие, только если пройдены обе его буквы.
 */

const STORE = "sad-slogov-v3";
const LENGTHS = [3, 6, 9];
const MAX_LENGTH = Math.max(...LENGTHS);
/** Сколько карточек-вариантов показываем в игре «Где спрятался слог?». */
const OPTION_COUNT = 3;

/** Настройки по умолчанию: материал до страницы 16 букваря включительно. */
const initial = { ...CURRICULUM.upTo("С"), length: 6, prompt: "picture", position: "any" };

let storageAvailable = true,
  prefs = { ...initial },
  history = [],
  /** По слогам: сколько раз встретился и сколько раз понадобилась помощь. */
  stats = {},
  session = null,
  view = "home";

/**
 * Читает сохранённое состояние, при необходимости перенося его
 * с версий 1 и 2. В версии 1 хранились слоги одной буквы «С»,
 * в версии 2 — список букв без отдельных гласных.
 */
function restore() {
  const v3 = localStorage.getItem(STORE);
  if (v3) return JSON.parse(v3);

  const v2 = localStorage.getItem("sad-slogov-v2");
  if (v2) {
    const old = JSON.parse(v2);
    // В версии 2 были только твёрдые слияния с А, У, О и Ы.
    return {
      prefs: { ...old?.prefs, vowels: ["А", "У", "О", "Ы"] },
      history: old?.history,
    };
  }

  const v1 = localStorage.getItem("sad-slogov-v1");
  if (!v1) return null;
  const old = JSON.parse(v1);
  const letters = [...new Set((old?.prefs?.syllables || []).map((s) => s[0]))];
  return {
    prefs: {
      ...old?.prefs,
      letters: letters.length ? letters : ["С"],
      vowels: ["А", "У", "О"],
    },
    history: old?.history,
  };
}

try {
  const data = restore();
  if (data) {
    // Списки всегда пересобираем из курса: в хранилище могли остаться
    // буквы прежних версий или просто мусор.
    const letters = CURRICULUM.alphabet
      .filter((l) => l.kind !== "vowel" && data.prefs?.letters?.includes(l.id))
      .map((l) => l.id);
    const vowels = CURRICULUM.vowelIds.filter((id) =>
      data.prefs?.vowels?.includes(id),
    );
    prefs = {
      letters: letters.length ? letters : [...initial.letters],
      vowels: vowels.length ? vowels : [...initial.vowels],
      length: LENGTHS.includes(data.prefs?.length)
        ? data.prefs.length
        : initial.length,
      prompt: data.prefs?.prompt === "word" ? "word" : "picture",
      position: data.prefs?.position === "start" ? "start" : "any",
    };
    history = Array.isArray(data.history)
      ? data.history
          .filter(
            (x) =>
              Number.isFinite(x.time) &&
              Number.isFinite(new Date(x.time).getTime()) &&
              Number.isInteger(x.completed) &&
              x.completed >= 0 &&
              x.completed <= MAX_LENGTH &&
              Number.isInteger(x.independent) &&
              x.independent >= 0 &&
              x.independent <= x.completed,
          )
          .slice(-20)
      : [];
    // Статистика по слогам: ключ — слог, значение — два целых числа.
    // Мусор отбрасываем молча, счёт начнётся заново.
    const saved = data.stats;
    if (saved && typeof saved === "object")
      for (const [key, value] of Object.entries(saved).slice(0, 400))
        if (
          typeof key === "string" &&
          key.length === 2 &&
          Number.isInteger(value?.seen) &&
          Number.isInteger(value?.help) &&
          value.seen > 0 &&
          value.help >= 0 &&
          value.help <= value.seen
        )
          stats[key] = { seen: value.seen, help: value.help };
  }
} catch {
  storageAvailable = false;
}

const main = document.getElementById("main"),
  adultDialog = document.getElementById("adult-dialog"),
  pauseDialog = document.getElementById("pause-dialog"),
  footerMaterial = document.getElementById("footer-material");

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Русское склонение при числе: 1 слог, 2 слога, 5 слогов. */
function plural(n, one, few, many) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ prefs, history, stats }));
  } catch {
    storageAvailable = false;
  }
}

/**
 * Насколько слог просится в повторение.
 *
 * 1 — всегда читался сам, 4 — всегда с помощью. Незнакомый слог получает
 * 1.4: новый материал должен появляться, но уступать тому, что не даётся.
 * Вес не отменяет случайность, а смещает её: лёгкие слоги тоже выпадают.
 */
function weightOf(key) {
  const seen = stats[key];
  if (!seen) return 1.4;
  return 1 + 3 * (seen.help / seen.seen);
}

/** Перемешивает список, отдавая предпочтение тому, что даётся труднее. */
function weightedOrder(list) {
  const rest = [...list];
  const out = [];
  while (rest.length) {
    let total = 0;
    for (const item of rest) total += weightOf(item);
    let point = Math.random() * total;
    let i = 0;
    while (i < rest.length - 1 && (point -= weightOf(rest[i])) > 0) i++;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** Есть ли у слова готовый рисунок. Слово без рисунка показывается текстом. */
const drawn = (word) => Boolean(word?.art) && ART.has(word.art);

/**
 * Что можно составить из выбранного материала.
 * Списки считаются один раз на серию: по ним видно, какие игры доступны
 * и какие слоги годятся для каждой.
 */
function plan() {
  const pool = prefs.letters.flatMap((id) =>
    CURRICULUM.syllablesOf(id, prefs.vowels),
  );
  const inPool = new Set(pool);
  const startOnly = prefs.position === "start";
  // В «Прочитай слово» годятся только слова из пройденных букв:
  // иначе ребёнок упрётся в букву, которой ещё не знает.
  const known = new Set([...prefs.letters, ...prefs.vowels]);
  return {
    pool,
    card: pool,
    blend: pool,
    reverse: pool.length
      ? CURRICULUM.reverseSyllables(prefs.letters, prefs.vowels)
      : [],
    picture: pool.filter(
      (s) => CURRICULUM.wordsFor(s, { startOnly }).length > 0,
    ),
    soft: pool.filter((s) => {
      const pair = CURRICULUM.softPair(s);
      return pair && inPool.has(pair);
    }),
    read: CURRICULUM.words.filter((w) =>
      [...w.word].every((c) => known.has(c)),
    ),
  };
}

/** Описание игр. Порядок задаёт и главную страницу, и смешанную серию. */
const GAMES = [
  {
    id: "card",
    title: () => "Карточки слогов",
    hint: () => "Смотрим, тянем звуки, читаем.",
    icon: (p) => p.pool[0] || "СА",
  },
  {
    id: "blend",
    title: () => "Подружи буквы",
    hint: () => "Соединяем согласную с гласной.",
    icon: (p) => {
      const s = p.pool[0] || "СА";
      return `${s[0]}→${s[1]}`;
    },
  },
  {
    id: "reverse",
    title: () => "Обратный слог",
    hint: () => "Гласная впереди: МА — но АМ.",
    icon: (p) => p.reverse[0] || "АМ",
  },
  {
    id: "picture",
    title: () =>
      prefs.position === "start" ? "Что в начале?" : "Где спрятался слог?",
    hint: () =>
      prefs.position === "start"
        ? "Узнаём знакомый слог в начале слова."
        : "Ищем знакомый слог внутри слова.",
    icon: () =>
      ART.svg(
        '<path d="M7 18V7h25v22H7Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="12" r="3" fill="currentColor"/><path d="m8 25 8-10 8 10 5-5 4 6" fill="none" stroke="currentColor" stroke-width="2"/>',
        "0 0 40 36",
      ),
  },
  {
    id: "read",
    title: () => "Прочитай слово",
    hint: () => "Целое слово, слог за слогом.",
    icon: () =>
      ART.svg(
        '<g fill="currentColor"><rect x="4" y="12" width="14" height="12" rx="3"/><rect x="22" y="12" width="14" height="12" rx="3"/></g>',
        "0 0 40 36",
      ),
  },
  {
    id: "soft",
    title: () => "Твёрдый или мягкий?",
    hint: () => "Слышим разницу: МА или МЯ.",
    icon: () => "А·Я",
  },
];

const availableGames = (p) => GAMES.filter((g) => p[g.id].length > 0);

function focusMain() {
  main.querySelector("h1")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

/** Подпись в подвале: какой материал сейчас в занятии. */
function syncFooter() {
  if (!footerMaterial) return;
  const count = plan().pool.length;
  const word = plural(count, "слог", "слога", "слогов");
  // Букв бывает и две, и тридцать: перечисляем, пока помещается.
  const letters =
    prefs.letters.length <= 8
      ? prefs.letters.join(" ")
      : `${prefs.letters.length} букв`;
  footerMaterial.textContent = `Буквы занятия · ${letters} · ${count} ${word}`;
}

function renderHome() {
  view = "home";
  syncFooter();
  const p = plan();
  // По одному слогу от каждой буквы, с разными гласными: ряд МА СА ХА РА
  // выглядел бы однообразно. Больше шести фишек не показываем.
  const chips = prefs.letters
    .map((id, i) => {
      const own = CURRICULUM.syllablesOf(id, prefs.vowels);
      return own.length ? own[i % own.length] : null;
    })
    .filter(Boolean)
    .slice(0, 6);
  const shown = chips.length ? chips : p.pool.slice(0, 3);
  const garden = [...new Set([...shown, ...p.pool])].slice(0, 3);
  const games = availableGames(p);
  main.innerHTML = `<section class="home-hero"><div class="hero-copy"><div class="eyebrow">Читаем вместе · слоги по букварю</div><h1 tabindex="-1">По слогу —<br>к большим <span class="accent">историям.</span></h1><p class="intro">Поиграем с буквами и вырастим маленький сад. Всего несколько заданий — и ещё один шаг к чтению.</p><div class="known-syllables">${shown.map((s) => `<span>${s}</span>`).join("")}<small>сегодняшние слоги</small></div><button class="primary" data-action="start" data-mode="mixed">Начать маленькое занятие <span aria-hidden="true">→</span></button><p class="under-button"><span aria-hidden="true">◷</span> ${prefs.length} ${prefs.length === 3 ? "задания" : "заданий"} · без спешки · вместе со взрослым</p></div><div class="hero-art" role="img" aria-label="Слоги ${garden.join(", ")} на карточках в саду с цветами">${ART.garden(garden)}<span class="art-note">Всё начинается<br>с маленького семечка</span><span class="art-badge">Чуть-чуть каждый день — и получится</span></div></section><section aria-labelledby="games-title"><div class="section-head"><h2 id="games-title">А можно выбрать игру</h2><span>${games.length} ${plural(games.length, "способ", "способа", "способов")} подружиться со слогами</span></div><div class="games-grid">${games
    .map(
      (g) =>
        `<button class="game-card" data-action="start" data-mode="${g.id}"><span class="mini-icon" aria-hidden="true">${g.icon(p)}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>${g.title()}</h3><p>${g.hint()}</p></button>`,
    )
    .join("")}</div></section><section class="adult-strip" aria-label="Подсказка взрослому"><div class="strip-copy"><span aria-hidden="true">♧</span><div><h3>Вы рядом — и это главное</h3><p>Произносите задания, помогайте и замечайте маленькие успехи.</p></div></div><button class="text-button" data-action="adult">Настроить занятие <span aria-hidden="true">↗</span></button></section>`;
}

/**
 * Выбирает варианты ответа для игры «Где спрятался слог?».
 *
 * @param {string}   target    правильный слог
 * @param {string[]} pool      все слоги занятия
 * @param {string[]} forbidden слоги, которые тоже есть в слове задания:
 *                             указав такой, ребёнок был бы прав, а интерфейс
 *                             засчитал бы ошибку — в варианты их пускать нельзя
 * @param {number}   count     сколько кнопок показать, включая правильную
 * @returns {string[]} перемешанный набор из count слогов
 *
 * Варианты подбираются смешанно: сначала сосед по согласной (СА — СУ),
 * потом сосед по гласной (СА — МА), остальное случайно. Сосед по согласной
 * заставляет вслушаться в гласную, сосед по гласной — в согласную,
 * а далёкий слог вроде ШУ можно угадать по виду карточки, не вслушиваясь.
 * Если соседей в материале нет, добираем чем есть.
 */
function pickOptions(target, pool, forbidden, count) {
  const [consonant, vowel] = target;
  const free = pool.filter((s) => s !== target && !forbidden.includes(s));
  const picked = [];
  const take = (list) => {
    if (picked.length >= count - 1) return false;
    const choice = shuffle(list).find((s) => !picked.includes(s));
    if (choice) picked.push(choice);
    return Boolean(choice);
  };
  take(free.filter((s) => s[0] === consonant));
  take(free.filter((s) => s[1] === vowel));
  while (take(free));
  return shuffle([target, ...picked]);
}

function start(mode = "mixed") {
  const p = plan();
  const games = availableGames(p);
  if (!games.length) return;
  const ids =
    mode === "mixed" ? games.map((g) => g.id) : games.some((g) => g.id === mode) ? [mode] : null;
  if (!ids) return;

  // Для каждой игры свой запас подходящих заданий; выдаём по кругу,
  // чтобы внутри серии поменьше повторяться. Слоги упорядочены с оглядкой
  // на прошлые занятия, слова для чтения — просто случайно.
  const queues = Object.fromEntries(
    ids.map((id) => [id, id === "read" ? shuffle(p[id]) : weightedOrder(p[id])]),
  );
  const taken = Object.fromEntries(ids.map((id) => [id, 0]));
  const next = (id) => {
    const list = queues[id];
    return list[taken[id]++ % list.length];
  };

  const startOnly = prefs.position === "start";
  session = {
    mode,
    queue: Array.from({ length: prefs.length }, (_, i) => {
      const type = ids[i % ids.length];
      if (type === "read") return { type, word: next("read") };

      const target = next(type);
      const q = { type, target, prompt: prefs.prompt, position: prefs.position };
      if (type === "blend") {
        // Выбирают гласную, поэтому варианты — только слоги той же
        // согласной и только из пройденных гласных.
        q.options = shuffle(
          CURRICULUM.syllablesOf(target[0], prefs.vowels),
        );
      } else if (type === "soft") {
        q.options = shuffle([target, CURRICULUM.softPair(target)]);
      } else if (type === "picture") {
        const choices = CURRICULUM.wordsFor(target, { startOnly });
        q.word = choices[Math.floor(Math.random() * choices.length)];
        q.options = pickOptions(target, p.pool, q.word.contains, OPTION_COUNT);
      }
      return q;
    }),
    index: 0,
    results: [],
    ...blankQuestion(),
  };
  renderLesson(true);
}

const blankQuestion = () => ({
  assisted: false,
  attempts: 0,
  pickedConsonant: false,
  solved: false,
  hint: false,
  revealed: false,
  lastWrong: null,
  notice: null,
});

const resetQuestion = () => Object.assign(session, blankQuestion());

/** Подсказка взрослому внизу экрана — своя для каждой игры и буквы. */
function helpText(q) {
  const letter = q.target ? CURRICULUM.letterOf(q.target) : null;
  if (q.type === "card")
    return `Взрослому: послушайте чтение и отметьте результат. Если понадобилась помощь — прочитайте вместе. ${letter.tip}`;
  if (q.type === "blend")
    return letter.hold
      ? `Взрослому: тяните «${letter.sound}» и переходите к гласному плавно, без паузы между звуками. ${letter.tip}`
      : `Взрослому: этот звук тянуть нельзя — произнесите слог одним движением, «${q.target.toLowerCase()}», а не «${letter.id.toLowerCase()}… ${q.target[1].toLowerCase()}». ${letter.tip}`;
  if (q.type === "reverse")
    return `Взрослому: обратный слог читается не так, как прямой: сначала тянем гласную, потом добавляем согласную. Сравните вслух «${(q.target[1] + q.target[0]).toLowerCase()}» и «${q.target.toLowerCase()}» — это разные слоги.`;
  if (q.type === "read")
    return "Взрослому: пусть ребёнок ведёт пальцем и читает слог за слогом, а не по буквам. Подскажите первый слог, если нужно, и не торопите.";
  if (q.type === "soft")
    return `Взрослому: произнесите слог один раз, отчётливо. Если ребёнок не слышит разницу — скажите оба подряд: «${q.options.map((s) => s.toLowerCase()).join(" — ")}».`;
  return q.position === "start"
    ? "Взрослому: назовите картинку или прочитайте слово. Ребёнок ищет только знакомые первые два звука; всё слово читать не нужно."
    : "Взрослому: назовите слово по слогам. Слог может быть в начале, в середине или в конце — ребёнок ищет его на слух, читать всё слово не нужно.";
}

function lessonShell(inner) {
  const q = session.queue[session.index];
  return `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="pause"><span aria-hidden="true">←</span> К играм</button><span class="step-count">Задание ${session.index + 1} из ${session.queue.length}</span><button class="pause-button" data-action="pause"><span aria-hidden="true">Ⅱ</span> Пауза</button></div><div class="progress-trail" aria-label="Выполнено ${session.index} из ${session.queue.length}">${session.queue.map((_, i) => `<span aria-hidden="true" class="progress-dot ${i < session.index ? "done" : i === session.index ? "current" : ""}">✳</span>`).join("")}</div><div class="exercise">${inner}</div><div class="lesson-help"><span aria-hidden="true">♧</span><p>${helpText(q)}</p></div></section>`;
}

const adultMarks = `<div class="action-row"><button class="secondary" data-action="card-done" data-help="yes">Прочитали вместе</button><button class="primary small-primary" data-action="card-done" data-help="no">Получилось самостоятельно <span aria-hidden="true">✓</span></button></div>`;

function renderLesson(focus = false) {
  view = "lesson";
  const q = session.queue[session.index];
  const next =
    '<button class="primary small-primary" data-action="next">Дальше <span aria-hidden="true">→</span></button>';
  let body = "";

  if (q.type === "card") {
    const [consonant, vowel] = q.target;
    body = `<p class="exercise-kicker">Карточки слогов</p><h1 tabindex="-1">Прочитай слог</h1><p class="task-description">Не спеши. У нас всё получится.</p><button class="flash-card" data-action="hint" aria-label="Слог ${q.target}. Показать соединение звуков"><span class="big-syllable">${q.target}</span><small>Нажми, чтобы подружить звуки</small></button><div class="blend-hint" aria-live="polite">${session.hint ? `${consonant} <span aria-hidden="true">⟶</span> ${vowel} <span aria-hidden="true">·</span> ${q.target}` : ""}</div><p class="parent-caption">Взрослому: послушайте и отметьте, как получилось.</p>${adultMarks}`;
  } else if (q.type === "reverse") {
    const [vowel, consonant] = q.target;
    body = `<p class="exercise-kicker">Обратный слог</p><h1 tabindex="-1">Прочитай слог</h1><p class="task-description">Здесь гласная впереди. Сначала потяни её, потом добавь согласную.</p><button class="flash-card" data-action="hint" aria-label="Слог ${q.target}. Показать порядок звуков"><span class="big-syllable">${q.target}</span><small>Нажми, чтобы увидеть порядок</small></button><div class="blend-hint" aria-live="polite">${session.hint ? `${vowel} <span aria-hidden="true">⟶</span> ${consonant} <span aria-hidden="true">·</span> ${q.target}` : ""}</div><p class="parent-caption">Взрослому: послушайте и отметьте, как получилось.</p>${adultMarks}`;
  } else if (q.type === "blend") {
    const [consonant, vowel] = q.target;
    body = `<p class="exercise-kicker">Подружи буквы</p><h1 tabindex="-1">Собери слог ${q.target}</h1><p class="task-description">${session.solved ? "Прочитай, как звуки подружились." : session.pickedConsonant ? "Теперь выбери гласную внизу." : `Сначала нажми на «${consonant}», затем на гласную.`}</p>${session.solved ? `<div class="blend-result">${q.target}</div>` : `<div class="blend-board"><button class="letter-source ${session.pickedConsonant ? "selected" : ""}" data-action="select-consonant" aria-label="Выбрать букву ${consonant}" aria-pressed="${session.pickedConsonant}">${consonant}</button><span class="blend-arrow" aria-hidden="true"></span><div class="letter-destination" aria-label="Место для гласной">?</div></div>`}<div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="vowel" data-value="${s}" aria-label="Гласная ${s[1]}" ${session.solved ? "disabled" : ""}>${s[1]}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">Проведи пальчиком слева направо и прочитай вместе со взрослым: <strong>${consonant} → ${vowel} → ${q.target}</strong></div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  } else if (q.type === "read") {
    const picture = drawn(q.word);
    body = `<p class="exercise-kicker">Прочитай слово</p><h1 tabindex="-1">Читаем по слогам</h1><p class="task-description">Веди пальчиком и читай слог за слогом.</p><div class="read-word" aria-label="${q.word.word.toLowerCase()}">${q.word.parts.map((part) => `<span>${part}</span>`).join("")}</div>${session.revealed && picture ? `<div class="picture-wrap" role="img" aria-label="${q.word.word.toLowerCase()}">${ART.word(q.word.art)}</div>` : ""}<p class="parent-caption">Взрослому: послушайте и отметьте, как получилось.</p>${picture && !session.revealed ? '<div class="action-row"><button class="text-button" data-action="reveal">Посмотреть, что это <span aria-hidden="true">↓</span></button></div>' : ""}${adultMarks}`;
  } else if (q.type === "soft") {
    body = `<p class="exercise-kicker">Твёрдый или мягкий?</p><h1 tabindex="-1">Какой слог назвали?</h1><p class="task-description">Послушай взрослого и выбери карточку.</p><p class="listen-word">Взрослому: произнесите <strong>«${q.target.toLowerCase()}»</strong> один раз.</p><div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="answer" data-value="${s}" aria-label="Слог ${s}" ${session.solved ? "disabled" : ""}>${s}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">Произнесите оба подряд и сравните: <strong>${q.options.join(" — ")}</strong>. В мягком слоге согласная звучит мягче.</div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  } else {
    const at = q.word.at[q.target];
    const marked = `${q.word.word.slice(0, at)}<span class="found">${q.target}</span>${q.word.word.slice(at + 2)}`;
    // Картинку показываем, если она нарисована; иначе слово текстом.
    const asPicture = q.prompt === "picture" && drawn(q.word);
    body = `<p class="exercise-kicker">${q.position === "start" ? "Что в начале?" : "Где спрятался слог?"}</p><h1 tabindex="-1">${q.position === "start" ? "Найди начало слова" : "Найди знакомый слог"}</h1><p class="task-description">Послушай взрослого и выбери слог.</p>${asPicture ? `<div class="picture-wrap" role="img" aria-label="${q.word.word.toLowerCase()}">${ART.word(q.word.art)}</div>` : `<div class="word-card">${session.solved ? marked : q.word.word}</div>`}<p class="listen-word">Взрослому: произнесите <strong>«${q.word.spoken}»</strong> по слогам.</p><div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="answer" data-value="${s}" aria-label="Слог ${s}" ${session.solved ? "disabled" : ""}>${s}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">${q.position === "start" ? "Послушай первые звуки" : "Послушай слово ещё раз — слог спрятался внутри"}: <strong>${q.target}</strong>. Найди такую карточку.</div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  }

  main.innerHTML = lessonShell(body);
  if (focus) focusMain();
}

function feedback(q) {
  const retry =
    q.type === "blend"
      ? "Попробуй другую гласную. Мы не спешим."
      : q.type === "soft"
        ? "Послушаем ещё раз. Попробуй другую карточку."
        : "Послушаем слово ещё раз. Попробуй другую карточку.";
  return `<div class="feedback ${session.lastWrong ? "retry-text" : ""}" role="status" aria-live="polite">${session.solved ? "Получилось! Ещё один цветочек." : session.lastWrong ? retry : session.notice || " "}</div>`;
}

function answer(value, isVowel = false) {
  if (view !== "lesson" || session.solved) return;
  const q = session.queue[session.index];
  if (isVowel && !session.pickedConsonant) {
    session.notice = `Сначала нажми на «${q.target[0]}» вверху.`;
    renderLesson();
    return;
  }
  if (!q.options?.includes(value)) return;
  session.attempts++;
  if (value === q.target) {
    session.solved = true;
    session.lastWrong = null;
  } else {
    session.assisted = true;
    session.lastWrong = value;
  }
  renderLesson();
  if (session.solved)
    main.querySelector('[data-action="next"]')?.focus({ preventScroll: true });
}

/** Игры, где результат отмечает взрослый, а не проверяет интерфейс. */
const adultJudged = (type) =>
  ["card", "read", "reverse"].includes(type);

function finishQuestion(help = false) {
  if (view !== "lesson") return;
  const q = session.queue[session.index];
  if (!adultJudged(q.type) && !session.solved) return;
  const assisted = help || session.assisted;
  session.results.push({
    target: q.target || q.word.word,
    type: q.type,
    help: assisted,
    attempts: session.attempts,
  });
  if (q.target) {
    // Копим по слогу, а не по заданию: один и тот же слог встречается
    // в карточках, в соединении букв и в поиске слога.
    const seen = (stats[q.target] ||= { seen: 0, help: 0 });
    seen.seen++;
    if (assisted) seen.help++;
  }
  session.index++;
  if (session.index >= session.queue.length) {
    complete(false);
  } else {
    resetQuestion();
    renderLesson(true);
  }
}

function complete(partial = false) {
  pauseDialog.close();
  if (!session) return;
  const results = [...session.results],
    total = session.queue.length,
    mode = session.mode;
  const completed = results.length;
  const independent = results.filter((x) => !x.help).length;
  if (completed) {
    history.push({ time: Date.now(), completed, independent, total, partial });
    history = history.slice(-20);
    save();
  }
  // Обратных слогов нет в общем списке курса, поэтому берём то,
  // что реально встретилось в серии, в порядке появления.
  const bySyllable = [
    ...new Set(results.filter((r) => r.type !== "read").map((r) => r.target)),
  ];
  const readWords = results.filter((r) => r.type === "read");
  view = "summary";
  main.innerHTML = `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="home">← К играм</button><span class="step-count">${completed} из ${total} заданий</span></div><div class="exercise"><div class="summary-art">${ART.summary(completed)}</div><p class="exercise-kicker">${completed ? "Маленький шаг сделан" : "Занятие подождёт"}</p><h1 tabindex="-1">${completed ? "Твой сад растёт!" : "Отдохнём и вернёмся"}</h1><p class="summary-text">${completed ? "Здорово потрудились вместе. Теперь можно отдохнуть — можно вернуться в сад, когда захочется." : "Сегодня можно просто рассмотреть карточки вместе. Начнём, когда будет настроение."}</p><div class="action-row"><button class="primary small-primary" data-action="home">На сегодня всё <span aria-hidden="true">✓</span></button>${completed ? `<button class="secondary" data-action="start" data-mode="${mode}">Ещё одна серия</button>` : ""}</div>${
    completed
      ? `<details class="results-details"><summary>Взрослому: как прошло занятие</summary><p>Выполнено ${completed} из ${total}. Самостоятельно: ${independent}. С повтором или подсказкой: ${completed - independent}.</p>${
          bySyllable.length
            ? `<table><thead><tr><th>Слог</th><th>Самостоятельно</th><th>С помощью / повтором</th></tr></thead><tbody>${bySyllable
                .map(
                  (s) =>
                    `<tr><td><strong>${s}</strong></td><td>${results.filter((r) => r.target === s && !r.help).length}</td><td>${results.filter((r) => r.target === s && r.help).length}</td></tr>`,
                )
                .join("")}</tbody></table>`
            : ""
        }${
          readWords.length
            ? `<p>Прочитано слов: ${readWords.map((r) => `<strong>${r.target}</strong>${r.help ? " (вместе)" : ""}`).join(", ")}.</p>`
            : ""
        }<p class="completed-message">Это наблюдение за занятием, а не оценка навыка. Чтение вслух отмечает взрослый.</p></details>`
      : ""
  }${!storageAvailable ? '<p class="completed-message storage-warning">Браузер не разрешил сохранить результат. Играть по-прежнему можно.</p>' : ""}</div></section>`;
  session = null;
  focusMain();
}

/**
 * Слоги, где помощь нужна чаще всего. Меньше двух встреч — рано судить:
 * одна ошибка может быть просто усталостью.
 */
function hardSyllables(limit = 8) {
  return Object.entries(stats)
    .filter(([, x]) => x.seen >= 2 && x.help > 0)
    .sort(
      (a, b) =>
        b[1].help / b[1].seen - a[1].help / a[1].seen || b[1].seen - a[1].seen,
    )
    .slice(0, limit);
}

function showAdult() {
  const current = view === "lesson";
  const chosen = CURRICULUM.alphabet.filter(
    (l) => l.tip && prefs.letters.includes(l.id),
  );
  const p = plan();
  const hard = hardSyllables();
  const letterChip = (l) =>
    `<label class="option"><input type="checkbox" name="letters" value="${l.id}" ${prefs.letters.includes(l.id) ? "checked" : ""}><span class="chip"><b class="letter-mark">${l.id}</b><small>${l.kind === "consonant" ? `${CURRICULUM.syllablesOf(l.id, prefs.vowels).length} слог.` : "без слога"}</small></span></label>`;
  const vowelChip = (l) =>
    `<label class="option"><input type="checkbox" name="vowels" value="${l.id}" ${prefs.vowels.includes(l.id) ? "checked" : ""}><span class="chip"><b class="letter-mark">${l.id}</b><small>${l.row === "soft" ? "мягкая" : "твёрдая"}</small></span></label>`;

  adultDialog.innerHTML = `<button class="close-button" data-action="close-adult" aria-label="Закрыть настройки">×</button><div class="dialog-eyebrow">ДЛЯ ВЗРОСЛОГО</div><h2 id="adult-title">Занимаемся вместе</h2><p>Отмечены буквы, которые уже пройдены. Слог попадает в занятие, только когда пройдены обе его буквы — и согласная, и гласная.</p><form id="settings-form"><fieldset class="setting-group"><legend>Мы дошли до буквы</legend><div class="letter-ladder">${CURRICULUM.alphabet
    .map(
      (l) =>
        `<button type="button" class="ladder-step ${l.kind === "vowel" ? "vowel" : ""}" data-action="upto" data-letter="${l.id}">${l.id}</button>`,
    )
    .join(
      "",
    )}</div><p class="setting-note">Порядок букв — как в «Букваре» Жуковой. Нажмите букву: отметится всё до неё включительно. Дальше можно поправить вручную.</p></fieldset><fieldset class="setting-group"><legend>Согласные и знаки</legend><div class="setting-options compact">${CURRICULUM.alphabet
    .filter((l) => l.kind !== "vowel")
    .map(letterChip)
    .join(
      "",
    )}</div></fieldset><fieldset class="setting-group"><legend>Гласные</legend><div class="setting-options compact">${CURRICULUM.vowelLetters.map(vowelChip).join("")}</div><p class="setting-note">Сейчас получается ${p.pool.length} ${plural(p.pool.length, "слог", "слога", "слогов")} и ${p.read.length} ${plural(p.read.length, "слово", "слова", "слов")} для чтения.</p></fieldset><fieldset class="setting-group"><legend>Длина одной серии</legend><div class="setting-options">${LENGTHS.map((n) => `<label class="option"><input type="radio" name="length" value="${n}" ${prefs.length === n ? "checked" : ""}><span>${n} ${n === 3 ? "задания" : "заданий"}</span></label>`).join("")}</div></fieldset><fieldset class="setting-group"><legend>Где искать слог в слове</legend><div class="setting-options"><label class="option"><input type="radio" name="position" value="start" ${prefs.position === "start" ? "checked" : ""}><span>Только в начале</span></label><label class="option"><input type="radio" name="position" value="any" ${prefs.position === "any" ? "checked" : ""}><span>В любом месте</span></label></div><p class="setting-note">«Только в начале» — задания вида СА в слове САНИ. «В любом месте» труднее: слог может оказаться в середине или в конце — МУХА, БУСЫ, МЕШОК.</p></fieldset><fieldset class="setting-group"><legend>Что показывать в этой игре</legend><div class="setting-options"><label class="option"><input type="radio" name="prompt" value="picture" ${prefs.prompt === "picture" ? "checked" : ""}><span>Картинка</span></label><label class="option"><input type="radio" name="prompt" value="word" ${prefs.prompt === "word" ? "checked" : ""}><span>Слово</span></label></div><p class="setting-note">В обоих вариантах слово произносите вы. Ребёнку не нужно читать его целиком. Если рисунка для слова ещё нет, оно покажется текстом.</p></fieldset><div class="parent-guide"><h3>Как помочь прочитать</h3><p>Тяните согласный звук и плавно переходите к гласному, без паузы. Называйте звук, а не букву: «с-с-с», а не «эс». Звуки К, Т, П, Г, Д, Б, Ц и Ч тянуть нельзя — такой слог произносите одним движением.</p><details class="letter-guide"><summary>Подсказки по выбранным буквам (${chosen.length})</summary>${chosen.map((l) => `<p><b>${l.id}</b>${l.sound ? ` — «${l.sound}»` : ""}. ${l.tip}${l.note ? ` ${l.note}` : ""}</p>`).join("")}</details><p>На карточке и в чтении слова послушайте ребёнка и отметьте, получилось ли самостоятельно. В остальных играх достаточно нажимать на большие кнопки — перетаскивать ничего не нужно.</p><p>При усталости нажмите «Пауза». Не обязательно завершать всю серию.</p></div><p class="setting-note">Самостоятельные упражнения для закрепления пройденного. Страницы и иллюстрации букваря здесь не воспроизводятся.</p><div class="save-status" id="save-status" role="status">${current ? "Настройки применятся к следующей серии." : ""}</div><div class="dialog-actions"><button type="submit" class="primary">Сохранить настройки <span aria-hidden="true">✓</span></button><button type="button" class="text-button" data-action="close-adult">Закрыть</button></div></form><div class="history"><h3>Трудные слоги</h3>${
    hard.length
      ? `<div class="hard-syllables">${hard
          .map(
            ([syllable, x]) =>
              `<span><b>${syllable}</b><small>помощь ${x.help} из ${x.seen}</small></span>`,
          )
          .join("")}</div><p class="setting-note">Эти слоги выпадают в занятиях чаще остальных. Счёт ведётся по слогу, а не по игре: он общий для карточек, соединения букв и поиска слога.</p>`
      : '<p>Здесь появятся слоги, с которыми чаще нужна помощь. Пока таких нет.</p>'
  }<h3>Последние занятия</h3>${
    history.length
      ? history
          .slice(-5)
          .reverse()
          .map(
            (h) =>
              `<div class="history-row"><span>${new Intl.DateTimeFormat("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(h.time)}</span><span>${h.completed} заданий · ${h.independent} самостоятельно</span></div>`,
          )
          .join("")
      : "<p>Здесь появятся завершённые задания из ваших серий.</p>"
  }<p class="setting-note ${!storageAvailable ? "storage-warning" : ""}">${storageAvailable ? "Настройки и результаты хранятся только в этом браузере. На другом устройстве будет своя история." : "Браузер не разрешил сохранение. Настройки действуют до закрытия страницы."}</p>${history.length ? '<button class="text-button" data-action="confirm-clear">Очистить историю</button><div id="clear-confirm" class="confirm-box hidden"><p>Удалить результаты и счёт по слогам в этом браузере? Настройки останутся.</p><button class="secondary" data-action="clear-history">Удалить историю</button> <button class="text-button" data-action="cancel-clear">Оставить</button></div>' : ""}</div>`;
  adultDialog.showModal();
}

document.addEventListener("submit", (e) => {
  if (e.target.id !== "settings-form") return;
  e.preventDefault();
  const data = new FormData(e.target);
  const picked = data.getAll("letters");
  const letters = CURRICULUM.alphabet
    .filter((l) => l.kind !== "vowel" && picked.includes(l.id))
    .map((l) => l.id);
  const vowels = CURRICULUM.vowelIds.filter((id) =>
    data.getAll("vowels").includes(id),
  );
  const status = document.getElementById("save-status");
  if (!letters.length || !vowels.length) {
    status.textContent = !letters.length
      ? "Выберите хотя бы одну согласную."
      : "Выберите хотя бы одну гласную.";
    e.target
      .querySelector(`input[name="${letters.length ? "vowels" : "letters"}"]`)
      .focus();
    return;
  }
  const before = { ...prefs };
  prefs = {
    letters,
    vowels,
    length: Number(data.get("length")),
    prompt: data.get("prompt"),
    position: data.get("position"),
  };
  // Набор может не дать ни одного слога: например, отмечены только Ь и Ъ.
  if (!plan().pool.length) {
    prefs = before;
    status.textContent =
      "Из этих букв не получается ни одного слога. Добавьте согласную и гласную, которые встречаются вместе.";
    return;
  }
  save();
  syncFooter();
  status.textContent = storageAvailable
    ? view === "lesson"
      ? "Сохранено. Применим в следующей серии."
      : "Сохранено. Можно начинать!"
    : "Настройки применены. Браузер не разрешил их сохранить.";
  if (view === "home") renderHome();
});

document.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  switch (action) {
    case "home":
      if (view === "lesson") {
        pauseDialog.showModal();
      } else {
        renderHome();
        focusMain();
      }
      break;
    case "start":
      start(button.dataset.mode);
      break;
    case "adult":
      showAdult();
      break;
    case "close-adult":
      adultDialog.close();
      break;
    case "upto": {
      // Только отмечает галочки: настройки применяются кнопкой «Сохранить».
      const id = button.dataset.letter;
      const { letters, vowels } = CURRICULUM.upTo(id);
      for (const input of adultDialog.querySelectorAll('input[name="letters"]'))
        input.checked = letters.includes(input.value);
      for (const input of adultDialog.querySelectorAll('input[name="vowels"]'))
        input.checked = vowels.includes(input.value);
      document.getElementById("save-status").textContent =
        `Отмечено всё до буквы ${id}. Нажмите «Сохранить настройки».`;
      break;
    }
    case "pause":
      pauseDialog.showModal();
      break;
    case "resume":
      pauseDialog.close();
      break;
    case "end":
      complete(true);
      break;
    case "select-consonant":
      if (!session || session.solved) return;
      session.pickedConsonant = true;
      session.notice = null;
      renderLesson();
      main
        .querySelector('[data-action="vowel"]')
        ?.focus({ preventScroll: true });
      break;
    case "vowel":
      answer(button.dataset.value, true);
      break;
    case "answer":
      answer(button.dataset.value);
      break;
    case "hint":
      if (!session || session.solved) return;
      session.hint = true;
      session.assisted = true;
      renderLesson();
      break;
    case "reveal":
      // Картинка к прочитанному слову — награда, а не подсказка:
      // самостоятельность всё равно отмечает взрослый.
      if (!session) return;
      session.revealed = true;
      renderLesson();
      break;
    case "card-done":
      finishQuestion(button.dataset.help === "yes");
      break;
    case "next":
      finishQuestion();
      break;
    case "confirm-clear":
      document.getElementById("clear-confirm").classList.remove("hidden");
      break;
    case "cancel-clear":
      document.getElementById("clear-confirm").classList.add("hidden");
      break;
    case "clear-history":
      history = [];
      stats = {};
      save();
      adultDialog.close();
      showAdult();
      break;
  }
});

renderHome();
