#!/usr/bin/env node
// CI validator: checks required files exist and YAML files parse without error.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const REQUIRED = [
  "workflows/cursorbuddy_session.yaml",
  "tools/vscode_probe_state.md",
  "tools/cursorbuddy_emit_envelope.md",
  "SKILL.md",
  "policy/default.yaml",
];

let ok = true;

for (const rel of REQUIRED) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

// Basic YAML syntax check (no deps — just look for tab indentation which breaks YAML)
const yamls = REQUIRED.filter((f) => f.endsWith(".yaml") && fs.existsSync(path.join(root, f)));
for (const rel of yamls) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("\t")) {
      console.error(`YAML TAB at ${rel}:${i + 1}`);
      ok = false;
    }
  }
}

if (!ok) {
  process.exit(1);
}
console.log("\nAll openclaw-pack checks passed.");
