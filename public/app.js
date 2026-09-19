"use strict";
/**
 * Игровая логика занятия.
 * Учебный материал — в curriculum.js, иллюстрации — в art.js.
 *
 * Состояние: view (home | lesson | summary) и объект session.
 * При любом изменении главная область перерисовывается целиком —
 * поэтому фокус после перерисовки возвращается вручную.
 */

const STORE = "sad-slogov-v2";
const LEGACY_STORE = "sad-slogov-v1";
const LENGTHS = [3, 6, 9];
const MAX_LENGTH = Math.max(...LENGTHS);
/** Сколько карточек-вариантов показываем в игре «Где спрятался слог?». */
const OPTION_COUNT = 3;

/**
 * Настройки по умолчанию: буквы М и С — материал до страницы 16
 * «Букваря» Жуковой включительно, с которого начинался проект.
 * Х, Р и Ш взрослый включает, когда ребёнок до них дойдёт.
 */
const initial = {
  letters: ["М", "С"],
  length: 6,
  prompt: "picture",
  position: "any",
};

let storageAvailable = true,
  prefs = { ...initial },
  history = [],
  session = null,
  view = "home";

/** Читает сохранённое состояние, при необходимости перенося его с версии 1. */
function restore() {
  const raw = localStorage.getItem(STORE);
  if (raw) return JSON.parse(raw);
  const legacy = localStorage.getItem(LEGACY_STORE);
  if (!legacy) return null;
  // В первой версии хранились слоги одной буквы «С». Буквы выводим из них,
  // чтобы у тех, кто уже занимался, ничего не сбросилось.
  const old = JSON.parse(legacy);
  const letters = [
    ...new Set((old?.prefs?.syllables || []).map((s) => s[0])),
  ].filter((id) => CURRICULUM.letter(id));
  return {
    prefs: { ...old?.prefs, letters: letters.length ? letters : ["С"] },
    history: old?.history,
  };
}

try {
  const data = restore();
  if (data) {
    const letters = CURRICULUM.letterIds.filter((id) =>
      data.prefs?.letters?.includes(id),
    );
    prefs = {
      letters: letters.length ? letters : [...initial.letters],
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

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ prefs, history }));
  } catch {
    storageAvailable = false;
  }
}

/** Все слоги выбранных букв, в порядке букваря. */
const lessonSyllables = () =>
  prefs.letters.flatMap((id) => CURRICULUM.syllablesOf(id));

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
 * Сейчас неверные варианты берутся случайно. Насколько трудным получится
 * выбор — решение не техническое: см. комментарий ниже.
 */
function pickOptions(target, pool, forbidden, count) {
  const candidates = pool.filter(
    (s) => s !== target && !forbidden.includes(s),
  );
  return shuffle([target, ...shuffle(candidates).slice(0, count - 1)]);
}

function focusMain() {
  main.querySelector("h1")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

/** Подпись в подвале: какой материал сейчас в занятии. */
function syncFooter() {
  if (!footerMaterial) return;
  const count = lessonSyllables().length;
  footerMaterial.textContent = `Буквы занятия · ${prefs.letters.join(", ")} · ${count} ${count % 10 === 1 && count % 100 !== 11 ? "слог" : "слогов"}`;
}

function renderHome() {
  view = "home";
  syncFooter();
  const pool = lessonSyllables();
  // Одна буква — показываем все её слоги. Несколько — по одному от каждой,
  // с разными гласными, чтобы не получился ряд вида МА СА ХА РА ША.
  const chips =
    prefs.letters.length === 1
      ? pool
      : prefs.letters.map((id, i) => {
          const own = CURRICULUM.syllablesOf(id);
          return own[i % own.length];
        });
  const gardenSample = [...new Set([...chips, ...pool])].slice(0, 3);
  main.innerHTML = `<section class="home-hero"><div class="hero-copy"><div class="eyebrow">Читаем вместе · слоги по букварю</div><h1 tabindex="-1">По слогу —<br>к большим <span class="accent">историям.</span></h1><p class="intro">Поиграем с буквами и вырастим маленький сад. Всего несколько заданий — и ещё один шаг к чтению.</p><div class="known-syllables">${chips.map((s) => `<span>${s}</span>`).join("")}<small>сегодняшние слоги</small></div><button class="primary" data-action="start" data-mode="mixed">Начать маленькое занятие <span aria-hidden="true">→</span></button><p class="under-button"><span aria-hidden="true">◷</span> ${prefs.length} ${prefs.length === 3 ? "задания" : "заданий"} · без спешки · вместе со взрослым</p></div><div class="hero-art" role="img" aria-label="Слоги ${gardenSample.join(", ")} на карточках в саду с цветами">${ART.garden(gardenSample)}<span class="art-note">Всё начинается<br>с маленького семечка</span><span class="art-badge">Чуть-чуть каждый день — и получится</span></div></section><section aria-labelledby="games-title"><div class="section-head"><h2 id="games-title">А можно выбрать игру</h2><span>Три способа подружиться со слогами</span></div><div class="games-grid"><button class="game-card" data-action="start" data-mode="card"><span class="mini-icon" aria-hidden="true">${chips[0]}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>Карточки слогов</h3><p>Смотрим, тянем звуки, читаем.</p></button><button class="game-card" data-action="start" data-mode="blend"><span class="mini-icon" aria-hidden="true">${chips[0][0]}→${chips[0][1]}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>Подружи буквы</h3><p>Соединяем согласную с гласной.</p></button><button class="game-card" data-action="start" data-mode="picture"><span class="mini-icon" aria-hidden="true">${ART.svg('<path d="M7 18V7h25v22H7Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="12" r="3" fill="currentColor"/><path d="m8 25 8-10 8 10 5-5 4 6" fill="none" stroke="currentColor" stroke-width="2"/>', "0 0 40 36")}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>${prefs.position === "start" ? "Что в начале?" : "Где спрятался слог?"}</h3><p>${prefs.position === "start" ? "Узнаём знакомый слог в начале слова." : "Ищем знакомый слог внутри слова."}</p></button></div></section><section class="adult-strip" aria-label="Подсказка взрослому"><div class="strip-copy"><span aria-hidden="true">♧</span><div><h3>Вы рядом — и это главное</h3><p>Произносите задания, помогайте и замечайте маленькие успехи.</p></div></div><button class="text-button" data-action="adult">Настроить занятие <span aria-hidden="true">↗</span></button></section>`;
}

function start(mode = "mixed") {
  const pool = lessonSyllables();
  if (!pool.length) return;
  const targets = [];
  while (targets.length < prefs.length) targets.push(...shuffle(pool));
  const types = ["card", "blend", "picture"];
  session = {
    mode,
    queue: targets.slice(0, prefs.length).map((target, i) => {
      const type = mode === "mixed" ? types[i % 3] : mode;
      const startOnly = prefs.position === "start";
      const choices = CURRICULUM.wordsFor(target, startOnly);
      const word = choices[Math.floor(Math.random() * choices.length)];
      return {
        type,
        target,
        word,
        // В «Подружи буквы» выбирают гласную, поэтому варианты — только слоги
        // той же согласной. Заодно видно, что у Х нет пары с Ы.
        options:
          type === "blend"
            ? shuffle(CURRICULUM.syllablesOf(target[0]))
            : pickOptions(target, pool, word ? word.contains : [], OPTION_COUNT),
        prompt: prefs.prompt,
        position: prefs.position,
      };
    }),
    index: 0,
    results: [],
    assisted: false,
    attempts: 0,
    pickedConsonant: false,
    solved: false,
    hint: false,
    lastWrong: null,
    notice: null,
  };
  renderLesson(true);
}

function resetQuestion() {
  Object.assign(session, {
    assisted: false,
    attempts: 0,
    pickedConsonant: false,
    solved: false,
    hint: false,
    lastWrong: null,
    notice: null,
  });
}

/** Подсказка взрослому внизу экрана — своя для каждой игры и буквы. */
function helpText(q) {
  if (q.type === "card")
    return "Взрослому: послушайте чтение и отметьте результат. Если понадобилась помощь — прочитайте вместе.";
  if (q.type === "blend") {
    const letter = CURRICULUM.letterOf(q.target);
    return `Взрослому: переходите от согласного к гласному плавно, без паузы между звуками. ${letter.tip}`;
  }
  return q.position === "start"
    ? "Взрослому: назовите картинку или прочитайте слово. Ребёнок ищет только знакомые первые два звука; всё слово читать не нужно."
    : "Взрослому: назовите слово по слогам. Слог может быть в начале, в середине или в конце — ребёнок ищет его на слух, читать всё слово не нужно.";
}

function lessonShell(inner) {
  const q = session.queue[session.index];
  return `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="pause"><span aria-hidden="true">←</span> К играм</button><span class="step-count">Задание ${session.index + 1} из ${session.queue.length}</span><button class="pause-button" data-action="pause"><span aria-hidden="true">Ⅱ</span> Пауза</button></div><div class="progress-trail" aria-label="Выполнено ${session.index} из ${session.queue.length}">${session.queue.map((_, i) => `<span aria-hidden="true" class="progress-dot ${i < session.index ? "done" : i === session.index ? "current" : ""}">✳</span>`).join("")}</div><div class="exercise">${inner}</div><div class="lesson-help"><span aria-hidden="true">♧</span><p>${helpText(q)}</p></div></section>`;
}

function renderLesson(focus = false) {
  view = "lesson";
  const q = session.queue[session.index];
  const consonant = q.target[0],
    vowel = q.target[1];
  const next =
    '<button class="primary small-primary" data-action="next">Дальше <span aria-hidden="true">→</span></button>';
  let body = "";
  if (q.type === "card") {
    body = `<p class="exercise-kicker">Карточки слогов</p><h1 tabindex="-1">Прочитай слог</h1><p class="task-description">Не спеши. У нас всё получится.</p><button class="flash-card" data-action="hint" aria-label="Слог ${q.target}. Показать соединение звуков"><span class="big-syllable">${q.target}</span><small>Нажми, чтобы подружить звуки</small></button><div class="blend-hint" aria-live="polite">${session.hint ? `${consonant} <span aria-hidden="true">⟶</span> ${vowel} <span aria-hidden="true">·</span> ${q.target}` : ""}</div><p class="parent-caption">Взрослому: послушайте и отметьте, как получилось.</p><div class="action-row"><button class="secondary" data-action="card-done" data-help="yes">Прочитали вместе</button><button class="primary small-primary" data-action="card-done" data-help="no">Получилось самостоятельно <span aria-hidden="true">✓</span></button></div>`;
  } else if (q.type === "blend") {
    body = `<p class="exercise-kicker">Подружи буквы</p><h1 tabindex="-1">Собери слог ${q.target}</h1><p class="task-description">${session.solved ? "Прочитай, как звуки подружились." : session.pickedConsonant ? "Теперь выбери гласную внизу." : `Сначала нажми на «${consonant}», затем на гласную.`}</p>${session.solved ? `<div class="blend-result">${q.target}</div>` : `<div class="blend-board"><button class="letter-source ${session.pickedConsonant ? "selected" : ""}" data-action="select-consonant" aria-label="Выбрать букву ${consonant}" aria-pressed="${session.pickedConsonant}">${consonant}</button><span class="blend-arrow" aria-hidden="true"></span><div class="letter-destination" aria-label="Место для гласной">?</div></div>`}<div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="vowel" data-value="${s}" aria-label="Гласная ${s[1]}" ${session.solved ? "disabled" : ""}>${s[1]}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">Проведи пальчиком слева направо и прочитай вместе со взрослым: <strong>${consonant} → ${vowel} → ${q.target}</strong></div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  } else {
    const at = q.word.at[q.target];
    const shown = session.solved
      ? `${q.word.word.slice(0, at)}<span class="found">${q.target}</span>${q.word.word.slice(at + 2)}`
      : q.word.word;
    body = `<p class="exercise-kicker">${q.position === "start" ? "Что в начале?" : "Где спрятался слог?"}</p><h1 tabindex="-1">${q.position === "start" ? "Найди начало слова" : "Найди знакомый слог"}</h1><p class="task-description">Послушай взрослого и выбери слог.</p>${q.prompt === "picture" ? `<div class="picture-wrap" role="img" aria-label="${q.word.word.toLowerCase()}">${ART.word(q.word.art)}</div>` : `<div class="word-card">${shown}</div>`}<p class="listen-word">Взрослому: произнесите <strong>«${q.word.spoken}»</strong> по слогам.</p><div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="answer" data-value="${s}" aria-label="Слог ${s}" ${session.solved ? "disabled" : ""}>${s}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">${q.position === "start" ? "Послушай первые звуки" : "Послушай слово ещё раз — слог спрятался внутри"}: <strong>${q.target}</strong>. Найди такую карточку.</div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  }
  main.innerHTML = lessonShell(body);
  if (focus) focusMain();
}

function feedback(q) {
  return `<div class="feedback ${session.lastWrong ? "retry-text" : ""}" role="status" aria-live="polite">${session.solved ? "Получилось! Ещё один цветочек." : session.lastWrong ? (q.type === "blend" ? "Попробуй другую гласную. Мы не спешим." : "Послушаем слово ещё раз. Попробуй другую карточку.") : session.notice || " "}</div>`;
}

function answer(value, isVowel = false) {
  if (view !== "lesson" || session.solved) return;
  const q = session.queue[session.index];
  if (isVowel && !session.pickedConsonant) {
    session.notice = `Сначала нажми на «${q.target[0]}» вверху.`;
    renderLesson();
    return;
  }
  if (!q.options.includes(value)) return;
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

function finishQuestion(help = false) {
  if (view !== "lesson") return;
  const q = session.queue[session.index];
  if (q.type !== "card" && !session.solved) return;
  session.results.push({
    target: q.target,
    type: q.type,
    help: help || session.assisted,
    attempts: session.attempts,
  });
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
  view = "summary";
  main.innerHTML = `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="home">← К играм</button><span class="step-count">${completed} из ${total} заданий</span></div><div class="exercise"><div class="summary-art">${ART.summary(completed)}</div><p class="exercise-kicker">${completed ? "Маленький шаг сделан" : "Занятие подождёт"}</p><h1 tabindex="-1">${completed ? "Твой сад растёт!" : "Отдохнём и вернёмся"}</h1><p class="summary-text">${completed ? "Здорово потрудились вместе. Теперь можно отдохнуть — можно вернуться в сад, когда захочется." : "Сегодня можно просто рассмотреть карточки вместе. Начнём, когда будет настроение."}</p><div class="action-row"><button class="primary small-primary" data-action="home">На сегодня всё <span aria-hidden="true">✓</span></button>${completed ? `<button class="secondary" data-action="start" data-mode="${mode}">Ещё одна серия</button>` : ""}</div>${
    completed
      ? `<details class="results-details"><summary>Взрослому: как прошло занятие</summary><p>Выполнено ${completed} из ${total}. Самостоятельно: ${independent}. С повтором или подсказкой: ${completed - independent}.</p><table><thead><tr><th>Слог</th><th>Самостоятельно</th><th>С помощью / повтором</th></tr></thead><tbody>${CURRICULUM.syllables.filter(
          (s) => results.some((r) => r.target === s),
        )
          .map(
            (s) =>
              `<tr><td><strong>${s}</strong></td><td>${results.filter((r) => r.target === s && !r.help).length}</td><td>${results.filter((r) => r.target === s && r.help).length}</td></tr>`,
          )
          .join(
            "",
          )}</tbody></table><p class="completed-message">Это наблюдение за занятием, а не оценка навыка. Чтение вслух отмечает взрослый.</p></details>`
      : ""
  }${!storageAvailable ? '<p class="completed-message storage-warning">Браузер не разрешил сохранить результат. Играть по-прежнему можно.</p>' : ""}</div></section>`;
  session = null;
  focusMain();
}

function showAdult() {
  const current = view === "lesson";
  const chosen = CURRICULUM.letters.filter((l) => prefs.letters.includes(l.id));
  adultDialog.innerHTML = `<button class="close-button" data-action="close-adult" aria-label="Закрыть настройки">×</button><div class="dialog-eyebrow">ДЛЯ ВЗРОСЛОГО</div><h2 id="adult-title">Занимаемся вместе</h2><p>Буквы идут в порядке «Букваря» Жуковой:<br>${CURRICULUM.letterIds.join(" · ")}. Отметьте те, что уже пройдены.</p><form id="settings-form"><fieldset class="setting-group"><legend>Какие буквы повторяем</legend><div class="setting-options">${CURRICULUM.letters.map((l) => `<label class="option"><input type="checkbox" name="letters" value="${l.id}" ${prefs.letters.includes(l.id) ? "checked" : ""}><span><b class="letter-mark">${l.id}</b><small>${CURRICULUM.syllablesOf(l.id).join(" ")}</small></span></label>`).join("")}</div><p class="setting-note">${CURRICULUM.letters
    .filter((l) => l.note)
    .map((l) => l.note)
    .join(" ")}</p></fieldset><fieldset class="setting-group"><legend>Длина одной серии</legend><div class="setting-options">${LENGTHS.map((n) => `<label class="option"><input type="radio" name="length" value="${n}" ${prefs.length === n ? "checked" : ""}><span>${n} ${n === 3 ? "задания" : "заданий"}</span></label>`).join("")}</div></fieldset><fieldset class="setting-group"><legend>Где искать слог в слове</legend><div class="setting-options"><label class="option"><input type="radio" name="position" value="start" ${prefs.position === "start" ? "checked" : ""}><span>Только в начале</span></label><label class="option"><input type="radio" name="position" value="any" ${prefs.position === "any" ? "checked" : ""}><span>В любом месте</span></label></div><p class="setting-note">«Только в начале» — задания вида СА в слове САНИ. «В любом месте» труднее: слог может оказаться в середине или в конце — МУХА, БУСЫ, МЕШОК.</p></fieldset><fieldset class="setting-group"><legend>Что показывать в этой игре</legend><div class="setting-options"><label class="option"><input type="radio" name="prompt" value="picture" ${prefs.prompt === "picture" ? "checked" : ""}><span>Картинка</span></label><label class="option"><input type="radio" name="prompt" value="word" ${prefs.prompt === "word" ? "checked" : ""}><span>Слово</span></label></div><p class="setting-note">В обоих вариантах слово произносите вы. Ребёнку не нужно читать его целиком.</p></fieldset><div class="parent-guide"><h3>Как помочь прочитать</h3><p>Тяните согласный звук и плавно переходите к гласному, без паузы и добавочного звука. Называйте звук, а не букву: «с-с-с», а не «эс».</p>${chosen.map((l) => `<p><b>${l.id}</b> — «${l.sound}». ${l.tip}${l.note ? ` ${l.note}` : ""}</p>`).join("")}<p>На карточке послушайте ребёнка и отметьте, получилось ли самостоятельно. В остальных играх достаточно нажимать на большие кнопки — перетаскивать ничего не нужно.</p><p>При усталости нажмите «Пауза». Не обязательно завершать всю серию.</p></div><p class="setting-note">Самостоятельные упражнения для закрепления вашего этапа. Страницы и иллюстрации букваря здесь не воспроизводятся.</p><div class="save-status" id="save-status" role="status">${current ? "Настройки применятся к следующей серии." : ""}</div><div class="dialog-actions"><button type="submit" class="primary">Сохранить настройки <span aria-hidden="true">✓</span></button><button type="button" class="text-button" data-action="close-adult">Закрыть</button></div></form><div class="history"><h3>Последние занятия</h3>${
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
  }<p class="setting-note ${!storageAvailable ? "storage-warning" : ""}">${storageAvailable ? "Настройки и результаты хранятся только в этом браузере. На другом устройстве будет своя история." : "Браузер не разрешил сохранение. Настройки действуют до закрытия страницы."}</p>${history.length ? '<button class="text-button" data-action="confirm-clear">Очистить историю</button><div id="clear-confirm" class="confirm-box hidden"><p>Удалить результаты в этом браузере? Настройки останутся.</p><button class="secondary" data-action="clear-history">Удалить историю</button> <button class="text-button" data-action="cancel-clear">Оставить</button></div>' : ""}</div>`;
  adultDialog.showModal();
}

document.addEventListener("submit", (e) => {
  if (e.target.id !== "settings-form") return;
  e.preventDefault();
  const data = new FormData(e.target);
  const letters = CURRICULUM.letterIds.filter((id) =>
    data.getAll("letters").includes(id),
  );
  if (!letters.length) {
    document.getElementById("save-status").textContent =
      "Выберите хотя бы одну букву.";
    e.target.querySelector('input[name="letters"]').focus();
    return;
  }
  prefs = {
    letters,
    length: Number(data.get("length")),
    prompt: data.get("prompt"),
    position: data.get("position"),
  };
  save();
  syncFooter();
  document.getElementById("save-status").textContent = storageAvailable
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
      save();
      adultDialog.close();
      showAdult();
      break;
  }
});

renderHome();
