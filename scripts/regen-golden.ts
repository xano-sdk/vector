import { writeFileSync } from "node:fs";
import {
  GOLDEN_FIXTURE_URL,
  buildGoldenBundle,
  serializeGoldenBundle,
} from "../test/golden.js";

writeFileSync(GOLDEN_FIXTURE_URL, serializeGoldenBundle(buildGoldenBundle()));

console.log(`Wrote ${GOLDEN_FIXTURE_URL.pathname}`);
console.log("Review the diff line by line before committing it.");
