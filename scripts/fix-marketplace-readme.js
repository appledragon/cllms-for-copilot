// Fix relative links in README.md for VS Code Marketplace.
// The marketplace only shows a single README, so links like
// "README.zh-cn.md" or "./docs/adding-a-model.md" would be dead.
// Rewrite them to absolute GitHub URLs.
const fs = require("node:fs");

const GITHUB_BASE =
  "https://github.com/appledragon/cllms-for-copilot/blob/main";

let text = fs.readFileSync("README.md", "utf8");

// <a href="README.zh-cn.md">中文</a>
text = text.replace(
  /href="README\.zh-cn\.md"/g,
  `href="${GITHUB_BASE}/README.zh-cn.md"`,
);

// [text](./docs/adding-a-model.md) or [text](docs/adding-a-model.md)
text = text.replace(
  /\(\.?\/docs\/(adding-a-model(?:\.zh-cn)?\.md)\)/g,
  `(${GITHUB_BASE}/docs/$1)`,
);

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/README.marketplace.md", text);
