import fs from "node:fs";
import path from "node:path";
import type { IconValidation, ModuleType, ValidateResult } from "../types.js";
import { requireConfig } from "../utils/config.js";

const ESM_PATTERN = /^export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*"([^"]+)";?$/;
const CJS_PATTERN = /^module\.exports\.(\w+)\s*=\s*require\("([^"]+)"\)\.default;?$/;

function parseLine(
  line: string,
  lineNumber: number,
  moduleType: ModuleType,
): IconValidation | null {
  const pattern = moduleType === "esm" ? ESM_PATTERN : CJS_PATTERN;
  const match = line.match(pattern);
  if (!match) return null;

  const alias = match[1];
  const importPath = match[2];

  const segments = importPath.split("/");
  const iconName = segments[segments.length - 1];

  const resolvedPath = path.resolve(process.cwd(), "node_modules", `${importPath}.js`);
  const exists = fs.existsSync(resolvedPath);

  return {
    line,
    lineNumber,
    alias,
    iconName,
    packagePath: importPath,
    exists,
  };
}

export async function validate(): Promise<void> {
  const config = requireConfig();
  const { targetFile, moduleType } = config;

  const fullPath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`Target file not found: ${targetFile}`);
    process.exit(1);
  }

  console.log(`\nValidating ${targetFile}...\n`);

  const content = fs.readFileSync(fullPath, "utf8");
  const rawLines = content.split(/\r?\n/);

  const result: ValidateResult = {
    valid: [],
    broken: [],
    duplicateAliases: [],
    malformed: [],
  };

  const aliasMap = new Map<string, { line: string; lineNumber: number }[]>();
  const parsed: IconValidation[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trimEnd();
    if (!line) continue;

    const lineNumber = i + 1;
    const entry = parseLine(line, lineNumber, moduleType);

    if (!entry) {
      result.malformed.push(`  L${lineNumber}: ${line}`);
      continue;
    }

    parsed.push(entry);

    if (entry.exists) {
      result.valid.push(entry);
    } else {
      result.broken.push(entry);
    }

    const existing = aliasMap.get(entry.alias) ?? [];
    existing.push({ line, lineNumber });
    aliasMap.set(entry.alias, existing);
  }

  for (const [alias, lines] of aliasMap) {
    if (lines.length > 1) {
      result.duplicateAliases.push({ alias, lines });
    }
  }

  const total = parsed.length;

  if (result.broken.length > 0) {
    console.log(`\x1b[31m✗ ${result.broken.length} broken import(s):\x1b[0m`);
    for (const b of result.broken) {
      console.log(`  L${b.lineNumber}: ${b.alias} → ${b.packagePath}`);
      console.log(`    File not found: node_modules/${b.packagePath}.js`);
    }
    console.log();
  }

  if (result.duplicateAliases.length > 0) {
    console.log(`\x1b[33m⚠ ${result.duplicateAliases.length} duplicate alias(es):\x1b[0m`);
    for (const dup of result.duplicateAliases) {
      console.log(`  "${dup.alias}" defined ${dup.lines.length} times:`);
      for (const l of dup.lines) {
        console.log(`    L${l.lineNumber}: ${l.line}`);
      }
    }
    console.log();
  }

  if (result.malformed.length > 0) {
    console.log(`\x1b[33m⚠ ${result.malformed.length} malformed line(s):\x1b[0m`);
    for (const m of result.malformed) {
      console.log(m);
    }
    console.log();
  }

  const hasIssues =
    result.broken.length > 0 || result.duplicateAliases.length > 0 || result.malformed.length > 0;

  if (!hasIssues) {
    console.log(`\x1b[32m✓ All ${total} import(s) are valid.\x1b[0m`);
  } else {
    console.log(
      `${result.valid.length}/${total} valid, ` +
        `${result.broken.length} broken, ` +
        `${result.duplicateAliases.length} duplicate alias(es), ` +
        `${result.malformed.length} malformed`,
    );
    process.exit(1);
  }
}
