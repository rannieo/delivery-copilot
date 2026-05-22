import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Mastra CORS allows browser document deletion requests", () => {
  const source = readFileSync(new URL("../../src/mastra/index.ts", import.meta.url), "utf-8");

  assert.match(source, /allowMethods:\s*\[[^\]]*"DELETE"/s);
  assert.match(source, /allowHeaders:\s*\[[^\]]*"x-delivery-copilot-token"/s);
});

test("package test script runs the focused Node test suite", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
  ) as { scripts?: { test?: string } };

  assert.match(packageJson.scripts?.test ?? "", /node --experimental-strip-types --test/);
  assert.doesNotMatch(packageJson.scripts?.test ?? "", /Error: no test specified/);
});
