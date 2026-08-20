import fs from "node:fs";

// Reads a value either straight from an env var, or from a file path given
// by a companion `${envVar}_FILE` var — the pattern Docker/Compose secrets
// use (mounted at /run/secrets/<name>).
export function readSecret(envVar: string, fallback?: string): string | undefined {
  const filePath = process.env[`${envVar}_FILE`];
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf-8").trim();
  }
  return process.env[envVar] || fallback;
}
