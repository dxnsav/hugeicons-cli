#!/usr/bin/env node

import { run } from "../dist/index.js";

run(process.argv.slice(2)).catch((err) => {
  if (err?.name === "ExitPromptError" || err?.message?.includes("SIGINT")) {
    console.log("\n  Cancelled.");
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
