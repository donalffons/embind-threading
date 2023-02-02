const fs = require("fs");
const path = require("path");

const buildFile = path.join(".", "build", "index.js");
const distFile = path.join(".", "dist", "index.js");

const buildContents = fs.readFileSync(buildFile, { encoding: "utf-8" });

fs.writeFileSync(distFile, `module.exports = { "default": ${JSON.stringify(buildContents)} };`);
