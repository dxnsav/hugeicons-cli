import fs from "node:fs";
import path from "node:path";

type Framework = "react-native" | "nextjs" | "react" | "unknown";

interface DetectionResult {
  framework: Framework;
  suggestedPath: string;
  reason: string;
  existingIconFiles: string[];
}

function detectFramework(cwd: string): Framework {
  const pkgPath = path.resolve(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return "unknown";

  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (allDeps["react-native"] || allDeps.expo) return "react-native";
  if (allDeps.next) return "nextjs";
  if (allDeps.react) return "react";
  return "unknown";
}

function findExistingIconFiles(cwd: string): string[] {
  const candidates = [
    "src/icons/index.ts",
    "src/icons/index.tsx",
    "src/icons/hugeicons.ts",
    "src/icons/icons.ts",
    "src/components/icons.ts",
    "src/components/icons.tsx",
    "src/components/icons/index.ts",
    "src/components/icons/index.tsx",
    "src/components/ui/icons.ts",
    "src/components/ui/icons.tsx",
    "lib/icons/index.ts",
    "lib/icons.ts",
    "src/lib/icons.ts",
    "src/assets/icons/index.ts",
  ];

  return candidates.filter((f) => fs.existsSync(path.resolve(cwd, f)));
}

function dirExists(cwd: string, rel: string): boolean {
  return fs.existsSync(path.resolve(cwd, rel));
}

export function detectProjectStructure(cwd: string): DetectionResult {
  const framework = detectFramework(cwd);
  const existingIconFiles = findExistingIconFiles(cwd);

  if (existingIconFiles.length > 0) {
    return {
      framework,
      suggestedPath: existingIconFiles[0],
      reason: `Found existing icon file at ${existingIconFiles[0]}`,
      existingIconFiles,
    };
  }

  switch (framework) {
    case "react-native":
      if (dirExists(cwd, "src/icons")) {
        return {
          framework,
          suggestedPath: "src/icons/hugeicons.ts",
          reason: "React Native project with src/icons/ directory",
          existingIconFiles,
        };
      }
      if (dirExists(cwd, "src")) {
        return {
          framework,
          suggestedPath: "src/icons/hugeicons.ts",
          reason: "React Native project — src/icons/ is the standard location",
          existingIconFiles,
        };
      }
      break;

    case "nextjs":
      if (dirExists(cwd, "src/components")) {
        return {
          framework,
          suggestedPath: "src/components/icons.ts",
          reason: "Next.js project with src/components/",
          existingIconFiles,
        };
      }
      if (dirExists(cwd, "components")) {
        return {
          framework,
          suggestedPath: "components/icons.ts",
          reason: "Next.js project with components/",
          existingIconFiles,
        };
      }
      if (dirExists(cwd, "src")) {
        return {
          framework,
          suggestedPath: "src/icons/hugeicons.ts",
          reason: "Next.js project with src/",
          existingIconFiles,
        };
      }
      break;

    case "react":
      if (dirExists(cwd, "src/components")) {
        return {
          framework,
          suggestedPath: "src/components/icons.ts",
          reason: "React project with src/components/",
          existingIconFiles,
        };
      }
      if (dirExists(cwd, "src")) {
        return {
          framework,
          suggestedPath: "src/icons/hugeicons.ts",
          reason: "React project with src/",
          existingIconFiles,
        };
      }
      break;
  }

  return {
    framework,
    suggestedPath: "src/icons/index.ts",
    reason: "Default location",
    existingIconFiles,
  };
}
