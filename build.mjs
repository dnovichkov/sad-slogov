import { cpSync, rmSync } from "node:fs";
import { basename } from "node:path";

// Страница со всеми рисунками нужна только при правке материала.
// В опубликованный сайт она не попадает.
const DEV_ONLY = new Set(["art-sheet.html"]);

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", {
  recursive: true,
  filter: (src) => !DEV_ONLY.has(basename(src)),
});
console.log("Static site built in dist/");
