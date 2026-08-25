import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

rmSync("dist", { recursive: true, force: true });
rmSync("static-site", { recursive: true, force: true });
const result = spawnSync(process.execPath, ["node_modules/vinext/dist/cli.js", ...process.argv.slice(2)], { stdio: "inherit" });
if (result.status === 0 || (process.platform === "win32" && existsSync("dist/server/index.js"))) {
  cpSync("dist/client", "static-site", { recursive: true });
  for (const route of ["merch", "art"]) {
    mkdirSync(`static-site/${route}`, { recursive: true });
    copyFileSync(`static-site/${route}.html`, `static-site/${route}/index.html`);
  }
  process.exit(0);
}
process.exit(result.status ?? 1);
