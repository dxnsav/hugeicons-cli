export type NamingConvention = "short" | "full" | "minimal";
export type ModuleType = "esm" | "cjs";

export type VariantKey =
  | "free"
  | "bulk-rounded"
  | "duotone-rounded"
  | "solid-rounded"
  | "solid-sharp"
  | "solid-standard"
  | "stroke-rounded"
  | "stroke-sharp"
  | "stroke-standard"
  | "twotone-rounded";

export interface HugeiconsConfig {
  /** Relative path to the icon barrel file */
  targetFile: string;
  /** ESM or CJS exports */
  moduleType: ModuleType;
  /** Which @hugeicons-pro variant packages to use */
  packages: VariantKey[];
  /** How to name export aliases */
  naming: NamingConvention;
  /** Tracked package version for migration detection */
  packageVersion?: string;
}

export interface IconAddition {
  iconName: string;
  variant: VariantKey;
  alias: string;
  line: string;
}

export interface ValidateResult {
  valid: IconValidation[];
  broken: IconValidation[];
  duplicateAliases: DuplicateAlias[];
  malformed: string[];
}

export interface IconValidation {
  line: string;
  lineNumber: number;
  alias: string;
  iconName: string;
  packagePath: string;
  exists: boolean;
}

export interface DuplicateAlias {
  alias: string;
  lines: { line: string; lineNumber: number }[];
}
