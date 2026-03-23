import { add } from "./commands/add.js";
import { init } from "./commands/init.js";
import { validate } from "./commands/validate.js";

const HELP = `
  hugeicons-cli — Interactive HugeIcons Pro export manager

  Commands:
    init              Set up .hugeiconrc.json for your project
    add [search]      Add icons interactively (fuzzy search)
    validate          Check for broken imports in your icon file

  Options:
    --help, -h        Show this help
    --version, -v     Show version

  Examples:
    hugeicons init
    hugeicons add Search
    hugeicons add Calendar
    hugeicons validate
`;

export async function run(args: string[]): Promise<void> {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
  }

  switch (command) {
    case "init":
      await init();
      break;
    case "add":
      await add(args.slice(1).join(" ").trim() || undefined);
      break;
    case "validate":
      await validate();
      break;
    default:
      console.error(`Unknown command: "${command}"`);
      console.log(HELP);
      process.exit(1);
  }
}
