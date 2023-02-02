import { exec, env } from "shelljs";
import path from "path";
import fs from "fs";

const buildPath = path.join(__dirname, "build");
const distPath = path.join(__dirname, "dist");
{
  // Git clone
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync("build");
  }
}
{
  // Configure
  const res = exec("emcmake cmake ..", {
    cwd: buildPath,
  });
  if (res.code !== 0) throw new Error(res.stderr);
}
{
  // Run build
  const res = exec("emmake make -j$(nproc)", { cwd: buildPath });
  if (res.code !== 0) throw new Error(res.stderr);
}
{
  // Install
  fs.mkdirSync("dist", { recursive: true });
  for (const f of ["TestApplication.js", "TestApplication.worker.js", "TestApplication.wasm"]) {
    fs.copyFileSync(path.join(buildPath, f), path.join(distPath, f));
  }
}
