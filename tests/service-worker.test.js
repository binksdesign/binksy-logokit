import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("service worker retires stale caches and refreshes documents", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const registration = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

  assert.match(source, /binksy-logokit-v4/);
  assert.match(source, /caches\.delete/);
  assert.match(source, /event\.request\.mode === "navigate"/);
  assert.match(registration, /updateViaCache: "none"/);
});
