"use strict";
const SYLLABLES = ["СА", "СУ", "СО"];
const WORDS = {
  СА: [
    { word: "САНИ", spoken: "са́ни", art: "sled" },
    { word: "САХАР", spoken: "са́хар", art: "sugar" },
  ],
  СУ: [
    { word: "СУМКА", spoken: "су́мка", art: "bag" },
    { word: "СУШКИ", spoken: "су́шки", art: "bagels" },
  ],
  СО: [
    { word: "СОВЫ", spoken: "со́вы", art: "owls" },
    { word: "СОТЫ", spoken: "со́ты", art: "honey" },
  ],
};
const STORE = "sad-slogov-v1";
const initial = { syllables: [...SYLLABLES], length: 6, prompt: "picture" };
let storageAvailable = true,
  prefs = { ...initial },
  history = [],
  session = null,
  view = "home";
try {
  const data = JSON.parse(localStorage.getItem(STORE) || "null");
  if (data) {
    prefs = {
      syllables: SYLLABLES.filter((s) => data.prefs?.syllables?.includes(s)),
      length: [3, 6, 9].includes(data.prefs?.length) ? data.prefs.length : 6,
      prompt: data.prefs?.prompt === "word" ? "word" : "picture",
    };
    if (!prefs.syllables.length) prefs.syllables = [...SYLLABLES];
    history = Array.isArray(data.history)
      ? data.history
          .filter(
            (x) =>
              Number.isFinite(x.time) &&
              Number.isFinite(new Date(x.time).getTime()) &&
              Number.isInteger(x.completed) &&
              x.completed >= 0 &&
              x.completed <= 9 &&
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
  pauseDialog = document.getElementById("pause-dialog");
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
function svg(body, viewBox = "0 0 240 170", className = "") {
  return `<svg class="${className}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
function flower(x, y, color = "#d88668", scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0V86" stroke="#587e54" stroke-width="6" stroke-linecap="round"/><path d="M-2 64C-35 62-38 39-31 36C-6 35 0 53-2 64M2 45C32 44 33 24 29 21C8 22 0 36 2 45" fill="#91ab76"/><g fill="${color}">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-20" rx="14" ry="21" transform="rotate(${a})"/>`).join("")}</g><circle r="18" fill="#f4d47d"/><circle cx="-6" cy="-2" r="2" fill="#4b563a"/><circle cx="6" cy="-2" r="2" fill="#4b563a"/><path d="M-5 6Q0 10 5 6" fill="none" stroke="#4b563a" stroke-width="2" stroke-linecap="round"/></g>`;
}
function gardenArt() {
  return svg(
    `<path d="M9 320Q80 280 166 316T452 312V370H9Z" fill="#dde3cb"/><g stroke="#e0bd61" stroke-width="4" stroke-linecap="round"><path d="M115 51V40M115 104v11M83 78H73M149 78h11M92 55l-8-8M140 55l8-8"/></g><circle cx="115" cy="78" r="24" fill="#f2d074"/><path d="M107 79v3M123 79v3M110 90q5 4 10 0" stroke="#7d7146" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M347 103c-8-26-44-22-48 0-16-10-31 0-31 11h107c0-12-17-23-28-11" fill="#faf9ed"/>${flower(348, 222, "#d78b6e", 1.1)}${flower(288, 279, "#a9b979", 0.6)}<path d="M352 328q22-36 49-11M56 337q-2-22 10-36M58 336q18-24 25-21" fill="none" stroke="#9dad7f" stroke-width="4" stroke-linecap="round"/><g transform="translate(84 205) rotate(-10)"><rect x="0" y="9" width="102" height="103" rx="18" fill="#d6ddc1"/><rect width="102" height="103" rx="18" fill="#fffdf4"/><text x="51" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#426954">СА</text></g><g transform="translate(189 205) rotate(9)"><rect x="0" y="8" width="101" height="103" rx="18" fill="#c7d5b4"/><rect width="101" height="103" rx="18" fill="#e0e9d3"/><text x="50" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#426954">СУ</text></g><g transform="translate(150 120) rotate(-2)"><rect x="0" y="7" width="103" height="105" rx="18" fill="#d6b47a"/><rect width="103" height="105" rx="18" fill="#f4d48d"/><text x="52" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#795c35">СО</text></g><g fill="#9aa978"><ellipse cx="386" cy="169" rx="7" ry="12" transform="rotate(-30 386 169)"/><ellipse cx="399" cy="167" rx="7" ry="12" transform="rotate(30 399 167)"/></g><path d="M392 172q-1 18-15 20" stroke="#9aa978" stroke-width="2" fill="none" stroke-dasharray="3 4"/>`,
    "0 0 460 380",
  );
}
function wordArt(type) {
  const shadow = '<ellipse cx="120" cy="150" rx="86" ry="9" fill="#e9eadd"/>';
  const arts = {
    sled: '<path d="M62 101v33m106-33v33M46 129h132q24 0 27-26M41 145h139q26 0 31-24" stroke="#60838a" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M168 84c-2-41 13-47 26-43" stroke="#60838a" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="44" y="86" width="142" height="15" rx="6" fill="#ce7555"/><path d="M54 74h125" stroke="#eabf70" stroke-width="14" stroke-linecap="round"/><path d="M188 88q26 1 32-39" stroke="#b2916b" stroke-width="3" fill="none"/><path d="M30 51h10m-5-5v10M73 32h10m-5-5v10M213 80h10m-5-5v10" stroke="#b8c7c5" stroke-width="3" stroke-linecap="round"/>',
    sugar:
      '<path d="M53 92q0 57 67 57t67-57" fill="#b3c7af"/><ellipse cx="120" cy="91" rx="67" ry="18" fill="#dee5d3"/><g fill="#fffdf5" stroke="#dad9c9" stroke-width="2"><path d="m70 73 26-9 28 10-1 29-27 10-26-11Z"/><path d="m116 70 26-9 29 10v30l-28 10-27-11Z"/><path d="m94 42 26-9 27 10v30l-27 10-26-11Z"/></g><g fill="none" stroke="#e2decd" stroke-width="2"><path d="m94 42 26 12 27-11m-27 11v29M70 73l27 11 27-10M97 84v28m19-42 27 11 28-10m-28 10v29"/></g>',
    bag: '<path d="M84 67V46a36 36 0 0 1 72 0v21" fill="none" stroke="#9c673f" stroke-width="10"/><path d="M64 55h112l16 84q-72 21-144 0Z" fill="#dfa776"/><path d="M65 57h111l6 28H59Z" fill="#eabb86"/><rect x="92" y="90" width="56" height="41" rx="9" fill="#f4d8a3"/><path d="M109 104q12-20 22 0-1 12-11 18-11-7-11-18" fill="#cb8059"/><path d="M62 134h116" stroke="#c48b5e" stroke-width="3" stroke-dasharray="4 5"/>',
    bagels:
      '<ellipse cx="120" cy="119" rx="87" ry="26" fill="#d5e1d2"/><ellipse cx="120" cy="117" rx="71" ry="17" fill="#e8ede0"/><g fill="none" stroke="#cb9651" stroke-width="20"><ellipse cx="77" cy="109" rx="26" ry="18" transform="rotate(-18 77 109)"/><ellipse cx="151" cy="110" rx="27" ry="18" transform="rotate(15 151 110)"/><ellipse cx="115" cy="80" rx="30" ry="20" transform="rotate(-12 115 80)"/></g><g fill="none" stroke="#efd190" stroke-width="4" stroke-linecap="round"><path d="M51 104q6-14 23-14M129 101q18-10 34 1M88 75q13-15 34-13"/></g>',
    owls: '<path d="M24 143h192" stroke="#a3825c" stroke-width="7" stroke-linecap="round"/><g transform="translate(33 30)"><path d="M7 40 6 6 28 25Q43 20 57 25L77 5v39q14 77-34 77T7 40" fill="#b4bda0"/><path d="M9 59Q-7 102 25 104" fill="#8f9f7c"/><ellipse cx="42" cy="80" rx="27" ry="36" fill="#e3e1c7"/><circle cx="26" cy="48" r="19" fill="#fffbed"/><circle cx="58" cy="48" r="19" fill="#fffbed"/><circle cx="29" cy="49" r="7" fill="#425748"/><circle cx="55" cy="49" r="7" fill="#425748"/><path d="m35 61 7 11 8-11Z" fill="#d4a15f"/></g><g transform="translate(129 44) scale(.87)"><path d="M7 40 6 6 28 25Q43 20 57 25L77 5v39q14 77-34 77T7 40" fill="#c9a58a"/><path d="M75 59q15 43-16 45" fill="#af8a71"/><ellipse cx="42" cy="80" rx="27" ry="36" fill="#f0dcc1"/><circle cx="26" cy="48" r="19" fill="#fffbed"/><circle cx="58" cy="48" r="19" fill="#fffbed"/><circle cx="29" cy="49" r="7" fill="#425748"/><circle cx="55" cy="49" r="7" fill="#425748"/><path d="m35 61 7 11 8-11Z" fill="#d4a15f"/></g>',
    honey:
      '<g fill="#f2cf79" stroke="#c89943" stroke-width="5" stroke-linejoin="round">' +
      [
        [82, 59],
        [127, 59],
        [60, 99],
        [105, 99],
        [150, 99],
        [127, 139],
      ]
        .map(
          ([x, y]) => `<path d="M${x} ${y - 24}l22 12v24l-22 12-22-12v-24Z"/>`,
        )
        .join("") +
      '</g><g transform="translate(183 40) rotate(18)"><ellipse cx="-9" cy="-9" rx="10" ry="14" fill="#e3e8d6"/><ellipse cx="9" cy="-9" rx="10" ry="14" fill="#e3e8d6"/><ellipse cy="6" rx="17" ry="12" fill="#e8bb57"/><path d="M-5-4v20m11-20v20" stroke="#647058" stroke-width="5"/><circle cx="16" cy="4" r="3" fill="#405542"/></g>',
  };
  return svg(shadow + arts[type]);
}
function focusMain() {
  main.querySelector("h1")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function renderHome() {
  view = "home";
  main.innerHTML = `<section class="home-hero"><div class="hero-copy"><div class="eyebrow">Читаем вместе · первые слоги</div><h1 tabindex="-1">По слогу —<br>к большим <span class="accent">историям.</span></h1><p class="intro">Поиграем с буквами и вырастим маленький сад. Всего несколько заданий — и ещё один шаг к чтению.</p><div class="known-syllables"><span>СА</span><span>СУ</span><span>СО</span><small>уже знакомые слоги</small></div><button class="primary" data-action="start" data-mode="mixed">Начать маленькое занятие <span aria-hidden="true">→</span></button><p class="under-button"><span aria-hidden="true">◷</span> ${prefs.length} ${prefs.length === 3 ? "задания" : "заданий"} · без спешки · вместе со взрослым</p></div><div class="hero-art" role="img" aria-label="Слоги СА, СУ, СО на карточках в саду с цветами">${gardenArt()}<span class="art-note">Всё начинается<br>с маленького семечка</span><span class="art-badge">Чуть-чуть каждый день — и получится</span></div></section><section aria-labelledby="games-title"><div class="section-head"><h2 id="games-title">А можно выбрать игру</h2><span>Три способа подружиться со слогами</span></div><div class="games-grid"><button class="game-card" data-action="start" data-mode="card"><span class="mini-icon" aria-hidden="true">СА</span><span class="card-arrow" aria-hidden="true">↗</span><h3>Карточки слогов</h3><p>Смотрим, тянем звуки, читаем.</p></button><button class="game-card" data-action="start" data-mode="blend"><span class="mini-icon" aria-hidden="true">С→А</span><span class="card-arrow" aria-hidden="true">↗</span><h3>Подружи буквы</h3><p>Соединяем «С» с гласной.</p></button><button class="game-card" data-action="start" data-mode="picture"><span class="mini-icon" aria-hidden="true">${svg('<path d="M7 18V7h25v22H7Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="12" r="3" fill="currentColor"/><path d="m8 25 8-10 8 10 5-5 4 6" fill="none" stroke="currentColor" stroke-width="2"/>', "0 0 40 36")}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>Что в начале?</h3><p>Узнаём знакомый слог в слове.</p></button></div></section><section class="adult-strip" aria-label="Подсказка взрослому"><div class="strip-copy"><span aria-hidden="true">♧</span><div><h3>Вы рядом — и это главное</h3><p>Произносите задания, помогайте и замечайте маленькие успехи.</p></div></div><button class="text-button" data-action="adult">Настроить занятие <span aria-hidden="true">↗</span></button></section>`;
}
function start(mode = "mixed") {
  const targets = [];
  while (targets.length < prefs.length)
    targets.push(...shuffle(prefs.syllables));
  const types = ["card", "blend", "picture"];
  session = {
    mode,
    queue: targets.slice(0, prefs.length).map((target, i) => {
      const type = mode === "mixed" ? types[i % 3] : mode;
      return {
        type,
        target,
        word: WORDS[target][Math.floor(Math.random() * WORDS[target].length)],
        options: shuffle(prefs.syllables),
        prompt: prefs.prompt,
      };
    }),
    index: 0,
    results: [],
    assisted: false,
    attempts: 0,
    selectedC: false,
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
    selectedC: false,
    solved: false,
    hint: false,
    lastWrong: null,
    notice: null,
  });
}
function lessonShell(inner) {
  return `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="pause"><span aria-hidden="true">←</span> К играм</button><span class="step-count">Задание ${session.index + 1} из ${session.queue.length}</span><button class="pause-button" data-action="pause"><span aria-hidden="true">Ⅱ</span> Пауза</button></div><div class="progress-trail" aria-label="Выполнено ${session.index} из ${session.queue.length}">${session.queue.map((_, i) => `<span aria-hidden="true" class="progress-dot ${i < session.index ? "done" : i === session.index ? "current" : ""}">✳</span>`).join("")}</div><div class="exercise">${inner}</div><div class="lesson-help"><span aria-hidden="true">♧</span><p>${session.queue[session.index].type === "card" ? "Взрослому: послушайте чтение и отметьте результат. Если понадобилась помощь — прочитайте вместе." : session.queue[session.index].type === "blend" ? "Взрослому: произносите звук «с-с-с», затем плавно переходите к гласному. Не называйте букву «эс»." : "Взрослому: назовите картинку или прочитайте слово. Ребёнок ищет только знакомые первые два звука; всё слово читать не нужно."}</p></div></section>`;
}
function renderLesson(focus = false) {
  view = "lesson";
  const q = session.queue[session.index];
  const next =
    '<button class="primary small-primary" data-action="next">Дальше <span aria-hidden="true">→</span></button>';
  let body = "";
  if (q.type === "card") {
    body = `<p class="exercise-kicker">Карточки слогов</p><h1 tabindex="-1">Прочитай слог</h1><p class="task-description">Не спеши. У нас всё получится.</p><button class="flash-card" data-action="hint" aria-label="Слог ${q.target}. Показать соединение звуков"><span class="big-syllable">${q.target}</span><small>Нажми, чтобы подружить звуки</small></button><div class="blend-hint" aria-live="polite">${session.hint ? `С <span aria-hidden="true">⟶</span> ${q.target[1]} <span aria-hidden="true">·</span> ${q.target}` : ""}</div><p class="parent-caption">Взрослому: послушайте и отметьте, как получилось.</p><div class="action-row"><button class="secondary" data-action="card-done" data-help="yes">Прочитали вместе</button><button class="primary small-primary" data-action="card-done" data-help="no">Получилось самостоятельно <span aria-hidden="true">✓</span></button></div>`;
  } else if (q.type === "blend") {
    body = `<p class="exercise-kicker">Подружи буквы</p><h1 tabindex="-1">Собери слог ${q.target}</h1><p class="task-description">${session.solved ? "Прочитай, как звуки подружились." : session.selectedC ? "Теперь выбери гласную внизу." : "Сначала нажми на «С», затем на гласную."}</p>${session.solved ? `<div class="blend-result">${q.target}</div>` : `<div class="blend-board"><button class="letter-source ${session.selectedC ? "selected" : ""}" data-action="select-c" aria-label="Выбрать букву С" aria-pressed="${session.selectedC}">С</button><span class="blend-arrow" aria-hidden="true"></span><div class="letter-destination" aria-label="Место для гласной">?</div></div>`}<div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="vowel" data-value="${s}" aria-label="Гласная ${s[1]}" ${session.solved ? "disabled" : ""}>${s[1]}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">Проведи пальчиком слева направо и прочитай вместе со взрослым: <strong>С → ${q.target[1]} → ${q.target}</strong></div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  } else {
    body = `<p class="exercise-kicker">Что в начале?</p><h1 tabindex="-1">Найди начало слова</h1><p class="task-description">Послушай взрослого и выбери слог.</p>${q.prompt === "picture" ? `<div class="picture-wrap" role="img" aria-label="${q.word.word.toLowerCase()}">${wordArt(q.word.art)}</div>` : `<div class="word-card">${session.solved ? `<span class="found">${q.word.word.slice(0, 2)}</span>${q.word.word.slice(2)}` : q.word.word}</div>`}<p class="listen-word">Взрослому: произнесите <strong>«${q.word.spoken}»</strong>.</p><div class="choice-row">${q.options.map((s) => `<button class="choice ${session.solved && s === q.target ? "correct" : ""} ${session.lastWrong === s ? "retry" : ""}" data-action="answer" data-value="${s}" aria-label="Слог ${s}" ${session.solved ? "disabled" : ""}>${s}</button>`).join("")}</div>${feedback(q)}${session.hint && !session.solved ? `<div class="hint-box">Послушай первые звуки: <strong>${q.target}</strong>. Найди такую карточку.</div>` : ""}<div class="action-row">${session.solved ? next : '<button class="text-button" data-action="hint">Помоги мне</button>'}</div>`;
  }
  main.innerHTML = lessonShell(body);
  if (focus) focusMain();
}
function feedback(q) {
  return `<div class="feedback ${session.lastWrong ? "retry-text" : ""}" role="status" aria-live="polite">${session.solved ? "Получилось! Ещё один цветочек." : session.lastWrong ? (q.type === "blend" ? "Попробуй другую гласную. Мы не спешим." : "Послушаем начало ещё раз. Попробуй другую карточку.") : session.notice || " "}</div>`;
}
function answer(value, isVowel = false) {
  if (view !== "lesson" || session.solved) return;
  if (isVowel && !session.selectedC) {
    session.notice = "Сначала нажми на «С» вверху.";
    renderLesson();
    return;
  }
  const q = session.queue[session.index];
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
  main.innerHTML = `<section class="lesson"><div class="lesson-bar"><button class="back-button" data-action="home">← К играм</button><span class="step-count">${completed} из ${total} заданий</span></div><div class="exercise"><div class="summary-art">${svg(`<ellipse cx="120" cy="153" rx="85" ry="9" fill="#e5e8d7"/>${flower(120, 57, "#d88668", 1)}${completed >= 3 ? flower(55, 105, "#abb980", 0.5) : ""}${completed >= 6 ? flower(185, 98, "#aabbaa", 0.55) : ""}`)}</div><p class="exercise-kicker">${completed ? "Маленький шаг сделан" : "Занятие подождёт"}</p><h1 tabindex="-1">${completed ? "Твой сад растёт!" : "Отдохнём и вернёмся"}</h1><p class="summary-text">${completed ? "Здорово потрудились вместе. Теперь можно отдохнуть — можно вернуться в сад, когда захочется." : "Сегодня можно просто рассмотреть карточки вместе. Начнём, когда будет настроение."}</p><div class="action-row"><button class="primary small-primary" data-action="home">На сегодня всё <span aria-hidden="true">✓</span></button>${completed ? `<button class="secondary" data-action="start" data-mode="${mode}">Ещё одна серия</button>` : ""}</div>${
    completed
      ? `<details class="results-details"><summary>Взрослому: как прошло занятие</summary><p>Выполнено ${completed} из ${total}. Самостоятельно: ${independent}. С повтором или подсказкой: ${completed - independent}.</p><table><thead><tr><th>Слог</th><th>Самостоятельно</th><th>С помощью / повтором</th></tr></thead><tbody>${SYLLABLES.filter(
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
  adultDialog.innerHTML = `<button class="close-button" data-action="close-adult" aria-label="Закрыть настройки">×</button><div class="dialog-eyebrow">ДЛЯ ВЗРОСЛОГО</div><h2 id="adult-title">Занимаемся вместе</h2><p>Закрепляем СА, СУ, СО — ваш текущий этап<br>по «Букварю» Жуковой, страница 16.</p><form id="settings-form"><fieldset class="setting-group"><legend>Какие слоги повторяем</legend><div class="setting-options">${SYLLABLES.map((s) => `<label class="option"><input type="checkbox" name="syllables" value="${s}" ${prefs.syllables.includes(s) ? "checked" : ""}><span>${s}</span></label>`).join("")}</div><p class="setting-note" id="syllable-note">Можно оставить один слог или два. Новых слогов здесь нет.</p></fieldset><fieldset class="setting-group"><legend>Длина одной серии</legend><div class="setting-options">${[3, 6, 9].map((n) => `<label class="option"><input type="radio" name="length" value="${n}" ${prefs.length === n ? "checked" : ""}><span>${n} ${n === 3 ? "задания" : "заданий"}</span></label>`).join("")}</div></fieldset><fieldset class="setting-group"><legend>В игре «Что в начале?»</legend><div class="setting-options"><label class="option"><input type="radio" name="prompt" value="picture" ${prefs.prompt === "picture" ? "checked" : ""}><span>Картинка</span></label><label class="option"><input type="radio" name="prompt" value="word" ${prefs.prompt === "word" ? "checked" : ""}><span>Слово</span></label></div><p class="setting-note">В обоих вариантах слово произносите вы. Ребёнку не нужно читать его целиком.</p></fieldset><div class="parent-guide"><h3>Как помочь прочитать</h3><p>Произносите звук «с-с-с», а не название «эс». Плавно соединяйте его с «а», «у» или «о», без паузы и добавочного звука.</p><p>На карточке послушайте ребёнка и отметьте, получилось ли самостоятельно. В остальных играх достаточно нажимать на большие кнопки — перетаскивать ничего не нужно.</p><p>При усталости нажмите «Пауза». Не обязательно завершать всю серию.</p></div><p class="setting-note">Самостоятельные упражнения для закрепления вашего этапа. Страницы и иллюстрации букваря здесь не воспроизводятся.</p><div class="save-status" id="save-status" role="status">${current ? "Настройки применятся к следующей серии." : ""}</div><div class="dialog-actions"><button type="submit" class="primary">Сохранить настройки <span aria-hidden="true">✓</span></button><button type="button" class="text-button" data-action="close-adult">Закрыть</button></div></form><div class="history"><h3>Последние занятия</h3>${
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
  const syllables = SYLLABLES.filter((s) =>
    data.getAll("syllables").includes(s),
  );
  if (!syllables.length) {
    document.getElementById("save-status").textContent =
      "Выберите хотя бы один слог.";
    e.target.querySelector('input[name="syllables"]').focus();
    return;
  }
  prefs = {
    syllables,
    length: Number(data.get("length")),
    prompt: data.get("prompt"),
  };
  save();
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
    case "select-c":
      if (!session || session.solved) return;
      session.selectedC = true;
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
