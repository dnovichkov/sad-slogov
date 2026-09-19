/**
 * Снимки экранов: npm run shots
 *
 * Поднимает локальный сервер, открывает приложение в Chrome без окна
 * и сохраняет PNG в screenshots/. Нужно, чтобы глазами проверять то,
 * что тест проверить не может: вёрстку, иллюстрации, длинные диалоги.
 *
 * Одного `chrome --screenshot` не хватает: перед снимком надо положить
 * настройки в localStorage и нажать кнопку, поэтому страницей управляем
 * по Chrome DevTools Protocol.
 *
 * Chrome ищется в обычных местах; свой путь — в переменной CHROME.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const OUT = "screenshots";
const PORT = Number(process.env.PORT || 3399);
const DEBUG_PORT = Number(process.env.CHROME_PORT || 9333);
const BASE = `http://127.0.0.1:${PORT}/`;

const CANDIDATES = [
  process.env.CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error(
    "Не нашёл Chrome. Укажите путь: CHROME=... npm run shots\nИскал: " +
      CANDIDATES.join("\n       "),
  );
  process.exit(1);
}

// Учебный материал нужен, чтобы собрать настройки для каждого снимка.
const require = createRequire(import.meta.url);
const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const CURRICULUM = vm.runInNewContext(
  readFileSync("public/curriculum.js", "utf8") + "\nCURRICULUM;",
  {},
);
const setup = (upTo, extra = {}) => {
  const { letters, vowels } = CURRICULUM.upTo(upTo);
  return {
    prefs: { letters, vowels, length: 6, prompt: "picture", position: "any" },
    history: [],
    stats: {},
    ...extra,
  };
};
const play = (mode) =>
  `document.querySelector('[data-mode="${mode}"]').click()`;

const SHOTS = [
  { name: "home-start", state: setup("С"), height: 1400 },
  { name: "home-full", state: setup("Ъ"), height: 1700 },
  { name: "game-card", state: setup("Т"), run: play("card") },
  { name: "game-blend", state: setup("Т"), run: play("blend") },
  { name: "game-reverse", state: setup("Т"), run: play("reverse") },
  { name: "game-picture", state: setup("Т"), run: play("picture") },
  { name: "game-read", state: setup("Ж"), run: play("read") },
  { name: "game-sentence", state: setup("Ж"), run: play("sentence") },
  { name: "game-soft", state: setup("Ъ"), run: play("soft") },
  {
    name: "adult",
    state: setup("Ж", {
      history: [{ time: Date.now(), completed: 6, independent: 4, total: 6 }],
      stats: { РЫ: { seen: 4, help: 3 }, ШО: { seen: 3, help: 2 } },
    }),
    run: `document.querySelector('[data-action="adult"]').click()`,
    height: 1600,
    wait: 400,
  },
  { name: "phone-home", state: setup("Ж"), width: 390, height: 1500 },
  {
    name: "phone-sentence",
    state: setup("Ж"),
    run: play("sentence"),
    width: 390,
    height: 900,
  },
  { name: "art-sheet", path: "art-sheet.html?page=0", height: 1100 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ["dev-server.mjs", "--port", String(PORT)], {
  stdio: "ignore",
});
const profile = join(tmpdir(), `sad-slogov-shots-${process.pid}`);
const chrome = spawn(browser, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  "about:blank",
]);

function cleanup() {
  chrome.kill();
  server.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}
process.on("exit", cleanup);

async function debuggerUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(
        (r) => r.json(),
      );
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome не отдал отладочный порт");
}

mkdirSync(OUT, { recursive: true });
const socket = new WebSocket(await debuggerUrl());
await new Promise((resolve) => (socket.onopen = resolve));

let nextId = 1;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const waiting = pending.get(message.id);
  if (!waiting) return;
  pending.delete(message.id);
  message.error
    ? waiting.reject(new Error(message.error.message))
    : waiting.resolve(message.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

async function evaluate(expression) {
  const { exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails)
    throw new Error(
      exceptionDetails.exception?.description || "ошибка в странице",
    );
}

await send("Page.enable");
await send("Runtime.enable");

for (const shot of SHOTS) {
  const url = BASE + (shot.path || "");
  const width = shot.width || 1500;
  const height = shot.height || 900;
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send("Page.navigate", { url });
  await sleep(500);
  if (shot.state) {
    await evaluate(
      `localStorage.setItem("sad-slogov-v3", ${JSON.stringify(JSON.stringify(shot.state))})`,
    );
    await send("Page.navigate", { url });
    await sleep(500);
  }
  if (shot.run) await evaluate(shot.run);
  await sleep(shot.wait ?? 250);
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  writeFileSync(join(OUT, `${shot.name}.png`), Buffer.from(data, "base64"));
  console.log(`${OUT}/${shot.name}.png  ${width}×${height}`);
}

socket.close();
cleanup();
console.log(`\nГотово: ${SHOTS.length} снимков в ${OUT}/`);
process.exit(0);
