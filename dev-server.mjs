import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const args = process.argv.slice(2);
const dirFlag = args.indexOf("--dir");
const directory = dirFlag >= 0 ? args[dirFlag + 1] : "public";
if (!["public", "dist"].includes(directory))
  throw new Error("Use --dir public or --dir dist");
const root = resolve(directory);
const hostFlag = args.indexOf("--host");
const host = hostFlag >= 0 ? args[hostFlag + 1] : "127.0.0.1";
const flag = args.indexOf("--port");
const port = Number(flag >= 0 ? args[flag + 1] : process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (req, res) => {
    try {
      const path = resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const actual = path === root ? resolve(root, "index.html") : path;
      const data = await readFile(actual);
      res.writeHead(200, {
        "Content-Type": mime[extname(actual)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, host, () =>
    console.log(`Serving ${directory}/ on http://${host}:${port}`),
  );
