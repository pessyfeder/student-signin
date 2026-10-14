// Zero-dependency static server for the offline build. Always uses port 4173 so the browser keeps
// the same origin (and therefore the same saved records). Only listens on this computer.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4173;
const root = join(dirname(fileURLToPath(import.meta.url)), "app");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

const url = `http://localhost:${PORT}`;
const open = () => exec(`start "" "${url}"`);

const server = createServer(async (req, res) => {
  // Strip leading slashes and any ".." so requests cannot leave the app folder.
  const path = normalize(decodeURIComponent(new URL(req.url, url).pathname))
    .split(/[\\/]+/)
    .filter((part) => part && part !== "..")
    .join("/");
  const tryRead = (p) => readFile(join(root, p)).then((body) => [p, body]);
  try {
    let hit;
    try {
      hit = path && extname(path) ? await tryRead(path) : null;
    } catch {
      hit = null;
    }
    if (!hit) hit = await tryRead("index.html");
    const [p, body] = hit;
    res.writeHead(200, {
      "Content-Type": types[extname(p)] || "application/octet-stream",
      "Cache-Control": p === "sw.js" ? "no-cache" : "public, max-age=3600",
    });
    res.end(body);
  } catch {
    res.writeHead(500).end("Server error");
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log("Already running. Opening the app.");
    open();
    setTimeout(() => process.exit(0), 500);
  } else {
    console.error(e.message);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Class Sign-In is running at ${url}\nLeave this window open (minimize it).`);
  open();
});
