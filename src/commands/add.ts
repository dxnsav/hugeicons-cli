import fs from "node:fs";
import path from "node:path";
import { checkbox, confirm, input, search } from "@inquirer/prompts";
import type { IconAddition, VariantKey } from "../types.js";
import { requireConfig } from "../utils/config.js";
import {
  getAllIconNames,
  getInstalledVersion,
  getVariantsForIcon,
  searchIcons,
} from "../utils/icons.js";
import { generateAlias, generateExportLine, getIconUrl } from "../utils/naming.js";

const PAGE_SIZE = 15;

export async function add(searchTerm?: string): Promise<void> {
  const config = requireConfig();
  const { packages, naming, moduleType, targetFile } = config;

  if (config.packageVersion) {
    const currentVersion = getInstalledVersion(packages[0]);
    if (currentVersion && currentVersion !== config.packageVersion) {
      console.log(
        `\n\x1b[33m  Package version changed: ${config.packageVersion} → ${currentVersion}\n  Run \`hugeicons validate\` to check for broken imports.\x1b[0m\n`,
      );
    }
  }

  let matchedIcons: string[];

  if (searchTerm) {
    matchedIcons = searchIcons(packages, searchTerm);
    if (matchedIcons.length === 0) {
      console.log(`No icons found matching "${searchTerm}".`);
      return;
    }
    console.log(`\nFound ${matchedIcons.length} icon(s) matching "${searchTerm}":\n`);
  } else {
    const allIcons = getAllIconNames(packages);

    const picked = await search({
      message: "Search for an icon:",
      source: (term) => {
        if (!term) return allIcons.slice(0, 20).map((name) => ({ name, value: name }));
        const lower = term.toLowerCase();
        return allIcons
          .filter((n) => n.toLowerCase().includes(lower))
          .slice(0, 30)
          .map((name) => ({ name, value: name }));
      },
    });

    matchedIcons = [picked];
  }

  const defaultVariant = packages[0];

  let selectedIcons: string[];

  if (matchedIcons.length === 1) {
    selectedIcons = matchedIcons;
    const url = getIconUrl(matchedIcons[0], defaultVariant);
    console.log(`  → ${matchedIcons[0]}  \x1b[2m${url}\x1b[0m\n`);
  } else {
    selectedIcons = await checkbox<string>({
      message: `Select icons to add (${matchedIcons.length} found, cmd/ctrl+click to preview):`,
      choices: matchedIcons.map((name) => ({
        name: `${name}  \x1b[2m${getIconUrl(name, defaultVariant)}\x1b[0m`,
        value: name,
        checked: matchedIcons.length <= 5,
      })),
      pageSize: PAGE_SIZE,
      required: true,
    });
  }

  const additions: IconAddition[] = [];
  const skipVariantSelection = packages.length === 1;

  let sharedVariants: VariantKey[] | null = null;

  if (!skipVariantSelection && selectedIcons.length > 1) {
    const useSameVariants = await confirm({
      message: "Apply the same variant(s) to all selected icons?",
      default: true,
    });

    if (useSameVariants) {
      sharedVariants = await checkbox<VariantKey>({
        message: "Select variant(s):",
        choices: packages.map((v) => ({ name: v, value: v })),
        required: true,
      });
    }
  }

  for (const iconName of selectedIcons) {
    let variants: VariantKey[];

    if (skipVariantSelection) {
      variants = packages;
    } else if (sharedVariants) {
      const available = getVariantsForIcon(iconName, sharedVariants);
      if (available.length === 0) {
        console.log(`  - ${iconName} not found in selected variants, skipping.`);
        continue;
      }
      variants = available;
    } else {
      const available = getVariantsForIcon(iconName, packages);
      if (available.length === 0) {
        console.log(`  - ${iconName} not found in any configured package, skipping.`);
        continue;
      }

      if (available.length === 1) {
        variants = available;
      } else {
        // Show per-variant URLs for visual comparison
        for (const v of available) {
          console.log(`    ${v}  \x1b[2m${getIconUrl(iconName, v)}\x1b[0m`);
        }
        variants = await checkbox<VariantKey>({
          message: `Variants for ${iconName}:`,
          choices: available.map((v) => ({ name: v, value: v })),
          required: true,
        });
      }
    }

    for (const variant of variants) {
      let alias = generateAlias(iconName, variant, naming);

      // Minimal naming with multiple variants → fall back to short
      if (naming === "minimal" && variants.length > 1) {
        alias = generateAlias(iconName, variant, "short");
      }

      additions.push({
        iconName,
        variant,
        alias,
        line: generateExportLine(iconName, variant, alias, moduleType),
      });
    }
  }

  if (additions.length === 0) {
    console.log("Nothing to add.");
    return;
  }

  const fullPath = path.resolve(process.cwd(), targetFile);
  const dir = path.dirname(fullPath);

  let existingLines: string[] = [];
  if (fs.existsSync(fullPath)) {
    existingLines = fs
      .readFileSync(fullPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter(Boolean);
  }

  const existingSet = new Set(existingLines);
  const aliasPrefix = (alias: string) =>
    moduleType === "esm"
      ? `export { default as ${alias} } from `
      : `module.exports.${alias} = require(`;

  const toAdd: IconAddition[] = [];
  const skipped: IconAddition[] = [];
  const conflicts: (IconAddition & { conflicting: string })[] = [];

  for (const item of additions) {
    if (existingSet.has(item.line)) {
      skipped.push(item);
      continue;
    }

    const conflicting = existingLines.find(
      (l) => l.startsWith(aliasPrefix(item.alias)) && l !== item.line,
    );

    if (conflicting) {
      conflicts.push({ ...item, conflicting });
    } else {
      toAdd.push(item);
    }
  }

  for (const conflict of conflicts) {
    console.log(`\n  Alias "${conflict.alias}" already exists:\n  ${conflict.conflicting}`);

    const newAlias = await input({
      message: `Enter a different alias for ${conflict.iconName} (${conflict.variant}):`,
      default: generateAlias(conflict.iconName, conflict.variant, "full"),
    });

    conflict.alias = newAlias;
    conflict.line = generateExportLine(conflict.iconName, conflict.variant, newAlias, moduleType);

    if (!existingSet.has(conflict.line)) {
      toAdd.push(conflict);
    } else {
      skipped.push(conflict);
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (already exist): ${skipped.length}`);
  }

  if (toAdd.length === 0) {
    console.log("\nNothing new to add.");
    return;
  }

  console.log(`\nWill add ${toAdd.length} export(s):\n`);
  for (const item of toAdd) {
    console.log(`  ${item.line}`);
  }
  console.log();

  const ok = await confirm({ message: "Confirm?", default: true });
  if (!ok) {
    console.log("Aborted.");
    return;
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const allLines = [...existingLines, ...toAdd.map((i) => i.line)];
  const sorted = [...new Set(allLines)].sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(fullPath, `${sorted.join("\n")}\n`, "utf8");

  console.log(`\n  Added ${toAdd.length} export(s) to ${targetFile}`);
}
