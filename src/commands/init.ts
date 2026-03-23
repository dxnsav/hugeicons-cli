import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { HugeiconsConfig, ModuleType, NamingConvention, VariantKey } from "../types.js";
import { configExists, writeConfig } from "../utils/config.js";
import { detectProjectStructure } from "../utils/detect-structure.js";
import { ALL_VARIANTS, detectInstalledPackages, getInstalledVersion } from "../utils/icons.js";

export async function init(): Promise<void> {
  console.log("\n  hugeicons-cli init\n");

  if (configExists()) {
    const overwrite = await confirm({
      message: ".hugeiconrc.json already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      console.log("Aborted.");
      return;
    }
  }

  const detection = detectProjectStructure(process.cwd());

  console.log(`  Detected: ${detection.framework} project`);
  if (detection.existingIconFiles.length > 0) {
    console.log(`  Found existing icon files: ${detection.existingIconFiles.join(", ")}`);
  }
  console.log(`  Suggestion: ${detection.suggestedPath} (${detection.reason})\n`);

  const targetFile = await input({
    message: "Target file for icon exports:",
    default: detection.suggestedPath,
  });

  const moduleType = await select<ModuleType>({
    message: "Module format:",
    choices: [
      { name: "ESM — export { default as ... } from ...", value: "esm" },
      { name: "CJS — module.exports.X = require(...).default", value: "cjs" },
    ],
    default: "esm",
  });

  const detected = detectInstalledPackages();

  const variantLabel = (v: VariantKey) =>
    v === "free" ? "free (5,100+ stroke-rounded icons, no license needed)" : v;

  let packages: VariantKey[];
  if (detected.length > 0) {
    const hasFree = detected.includes("free");
    const hasPro = detected.some((v) => v !== "free");
    const parts = [hasFree ? "free" : "", hasPro ? "pro" : ""].filter(Boolean).join(" + ");
    console.log(`\n  Found ${detected.length} installed HugeIcons package(s) (${parts}).\n`);

    packages = await checkbox<VariantKey>({
      message: "Which icon packages do you want to use?",
      choices: ALL_VARIANTS.map((v) => ({
        name: `${variantLabel(v)}  ${detected.includes(v) ? "(installed)" : "(not installed)"}`,
        value: v,
        checked: detected.includes(v),
      })),
      required: true,
    });
  } else {
    console.log("\n  No HugeIcons packages detected in node_modules.");
    console.log("  Select which ones you plan to install.\n");

    packages = await checkbox<VariantKey>({
      message: "Select packages:",
      choices: ALL_VARIANTS.map((v) => ({
        name: variantLabel(v),
        value: v,
        checked: v === "free" || v === "stroke-rounded",
      })),
      required: true,
    });
  }

  const naming = await select<NamingConvention>({
    message: "Naming convention for export aliases:",
    choices: [
      {
        name: "Short — StarIconStroke, StarIconSolid (drop shape)",
        value: "short",
      },
      {
        name: "Full — StarIconStrokeRounded, StarIconSolidSharp",
        value: "full",
      },
      {
        name: "Minimal — StarIcon (no suffix, one variant per icon only)",
        value: "minimal",
      },
    ],
    default: "short",
  });

  let packageVersion: string | undefined;
  if (detected.length > 0) {
    packageVersion = getInstalledVersion(detected[0]) ?? undefined;
  }

  const config: HugeiconsConfig = {
    targetFile,
    moduleType,
    packages,
    naming,
    ...(packageVersion ? { packageVersion } : {}),
  };

  const configPath = writeConfig(config);

  console.log(`\n  Config saved to ${configPath}`);
  console.log("\n  Next steps:");
  console.log("    hugeicons add <search>  — add icons interactively");
  console.log("    hugeicons validate      — check for broken imports\n");
}
