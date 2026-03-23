import type { ModuleType, NamingConvention, VariantKey } from "../types.js";

interface VariantParts {
  style: string;
  shape: string;
}

export function parseVariant(variant: VariantKey): VariantParts {
  if (variant === "free") {
    return { style: "Free", shape: "" };
  }
  const parts = variant.split("-");
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    style: capitalize(parts[0]),
    shape: parts[1] ? capitalize(parts[1]) : "",
  };
}

export function generateAlias(
  iconName: string,
  variant: VariantKey,
  naming: NamingConvention,
): string {
  const { style, shape } = parseVariant(variant);

  switch (naming) {
    case "full":
      return `${iconName}${style}${shape}`;
    case "short":
      return `${iconName}${style}`;
    case "minimal":
      return iconName;
  }
}

export function generateExportLine(
  iconName: string,
  variant: VariantKey,
  alias: string,
  moduleType: ModuleType,
): string {
  const pkg = variant === "free" ? "@hugeicons/core-free-icons" : `@hugeicons-pro/core-${variant}`;
  const importPath = `${pkg}/dist/esm/${iconName}`;

  if (moduleType === "cjs") {
    return `module.exports.${alias} = require("${importPath}").default;`;
  }
  return `export { default as ${alias} } from "${importPath}";`;
}

function toSlug(iconName: string): string {
  return iconName
    .replace(/Icon$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function getIconUrl(iconName: string, variant: VariantKey): string {
  const slug = toSlug(iconName);
  const style = variant === "free" ? "stroke-rounded" : variant;
  return `https://hugeicons.com/icon/${slug}?style=${style}`;
}
