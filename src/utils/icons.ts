import fs from "node:fs";
import path from "node:path";
import type { VariantKey } from "../types.js";

export const VARIANT_TO_PACKAGE: Record<VariantKey, string> = {
  free: "@hugeicons/core-free-icons",
  "bulk-rounded": "@hugeicons-pro/core-bulk-rounded",
  "duotone-rounded": "@hugeicons-pro/core-duotone-rounded",
  "solid-rounded": "@hugeicons-pro/core-solid-rounded",
  "solid-sharp": "@hugeicons-pro/core-solid-sharp",
  "solid-standard": "@hugeicons-pro/core-solid-standard",
  "stroke-rounded": "@hugeicons-pro/core-stroke-rounded",
  "stroke-sharp": "@hugeicons-pro/core-stroke-sharp",
  "stroke-standard": "@hugeicons-pro/core-stroke-standard",
  "twotone-rounded": "@hugeicons-pro/core-twotone-rounded",
};

export const ALL_VARIANTS = Object.keys(VARIANT_TO_PACKAGE) as VariantKey[];

export function detectInstalledPackages(): VariantKey[] {
  const found: VariantKey[] = [];
  for (const variant of ALL_VARIANTS) {
    const esmDir = getEsmDir(variant);
    if (fs.existsSync(esmDir)) found.push(variant);
  }
  return found;
}

export function getInstalledVersion(variant: VariantKey): string | null {
  const pkg = VARIANT_TO_PACKAGE[variant];
  const pkgJsonPath = path.resolve(process.cwd(), "node_modules", pkg, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return null;

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  return pkgJson.version ?? null;
}

function getEsmDir(variant: VariantKey): string {
  const pkg = VARIANT_TO_PACKAGE[variant];
  return path.resolve(process.cwd(), "node_modules", pkg, "dist", "esm");
}

export function getIconNames(variant: VariantKey): string[] {
  const esmDir = getEsmDir(variant);
  if (!fs.existsSync(esmDir)) return [];

  return fs
    .readdirSync(esmDir)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".js.map"))
    .map((f) => f.replace(/\.js$/, ""))
    .sort();
}

export function getAllIconNames(variants: VariantKey[]): string[] {
  const names = new Set<string>();
  for (const variant of variants) {
    for (const name of getIconNames(variant)) {
      names.add(name);
    }
  }
  return [...names].sort();
}

export function searchIcons(variants: VariantKey[], searchTerm: string): string[] {
  const all = getAllIconNames(variants);
  const lower = searchTerm.toLowerCase();
  return all.filter((name) => name.toLowerCase().includes(lower));
}

export function getVariantsForIcon(iconName: string, variants: VariantKey[]): VariantKey[] {
  return variants.filter((variant) => {
    const filePath = path.resolve(getEsmDir(variant), `${iconName}.js`);
    return fs.existsSync(filePath);
  });
}

export function iconFileExists(iconName: string, variant: VariantKey): boolean {
  const filePath = path.resolve(getEsmDir(variant), `${iconName}.js`);
  return fs.existsSync(filePath);
}

export function getPackageName(variant: VariantKey): string {
  return VARIANT_TO_PACKAGE[variant];
}
