import fs from "node:fs";
import path from "node:path";
import type { HugeiconsConfig } from "../types.js";

const CONFIG_NAME = ".hugeiconrc.json";

export function getConfigPath(): string {
  return path.resolve(process.cwd(), CONFIG_NAME);
}

export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

export function readConfig(): HugeiconsConfig | null {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return null;

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as HugeiconsConfig;
}

export function writeConfig(config: HugeiconsConfig): string {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}

export function requireConfig(): HugeiconsConfig {
  const config = readConfig();
  if (!config) {
    console.error("No .hugeiconrc.json found. Run `hugeicons init` first.");
    process.exit(1);
  }
  return config;
}
