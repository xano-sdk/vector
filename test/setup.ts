import { afterEach } from "vitest";
import { resetLockOverrides } from "@xano/sdk";

afterEach(() => {
  resetLockOverrides();
});
