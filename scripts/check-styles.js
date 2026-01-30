#!/usr/bin/env node

/**
 * CI/build-time check: verify Tailwind CSS plumbing is intact.
 * Run: node scripts/check-styles.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failed = false;

function check(label, ok, detail) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    if (detail) console.error(`      ${detail}`);
    failed = true;
  } else {
    console.log(`  OK: ${label}`);
  }
}

// 1. app/layout.tsx must import globals.css
const layoutPath = path.join(ROOT, "app", "layout.tsx");
const layoutContent = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, "utf8") : "";
check(
  "app/layout.tsx imports globals.css",
  /import\s+["']\.\/globals\.css["']/.test(layoutContent),
  "Add: import './globals.css' to app/layout.tsx"
);

// 2. globals.css must contain @tailwind directives
const cssPath = path.join(ROOT, "app", "globals.css");
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
check(
  "globals.css has @tailwind base",
  cssContent.includes("@tailwind base"),
  "Add @tailwind base; to app/globals.css"
);
check(
  "globals.css has @tailwind components",
  cssContent.includes("@tailwind components"),
  "Add @tailwind components; to app/globals.css"
);
check(
  "globals.css has @tailwind utilities",
  cssContent.includes("@tailwind utilities"),
  "Add @tailwind utilities; to app/globals.css"
);

// 3. tailwind.config content globs must include app/** and components/**
let twContent = "";
for (const ext of ["ts", "js", "mjs", "cjs"]) {
  const p = path.join(ROOT, `tailwind.config.${ext}`);
  if (fs.existsSync(p)) {
    twContent = fs.readFileSync(p, "utf8");
    break;
  }
}
check(
  "tailwind.config content includes app/**",
  /["']\.\/app\/\*\*/.test(twContent),
  "Add './app/**/*.{js,ts,jsx,tsx,mdx}' to tailwind content array"
);
check(
  "tailwind.config content includes components/**",
  /["']\.\/components\/\*\*/.test(twContent),
  "Add './components/**/*.{js,ts,jsx,tsx,mdx}' to tailwind content array"
);

// 4. postcss.config must reference tailwindcss
let pcContent = "";
for (const name of ["postcss.config.js", "postcss.config.cjs", "postcss.config.mjs"]) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) {
    pcContent = fs.readFileSync(p, "utf8");
    break;
  }
}
check(
  "postcss.config includes tailwindcss",
  pcContent.includes("tailwindcss"),
  "Add tailwindcss to postcss.config plugins"
);

console.log("");
if (failed) {
  console.error("Style checks FAILED. Fix the issues above.");
  process.exit(1);
} else {
  console.log("All style checks passed.");
}
