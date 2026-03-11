import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as fs from "fs";
import * as path from "path";

// Load root .env for program IDs
function loadRootEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const envPath = path.resolve(__dirname, "../.env");
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
  } catch {}
  return vars;
}
const rootEnv = loadRootEnv();

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {},
    global: "globalThis",
    __SSS_TOKEN_PROGRAM_ID__: JSON.stringify(
      rootEnv.SSS_TOKEN_PROGRAM_ID || "BXG5KG57ef5vgZdA4mWjBYfrFPyaaZEvdHCmGsuj7vbq"
    ),
    __SSS_TRANSFER_HOOK_PROGRAM_ID__: JSON.stringify(
      rootEnv.SSS_TRANSFER_HOOK_PROGRAM_ID || "B9HzG9fuxbuJBG2wTSP6UmxBSQLdaUAk62Kcdf41WxAt"
    ),
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
});
