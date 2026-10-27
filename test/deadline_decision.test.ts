import assert from "node:assert/strict";
import test from "node:test";
import { decideDeadline } from "../src/deadline_decision.js";

test("a late learner submission is surfaced for the educator report", () => {
  const decision = decideDeadline(new Date("2026-09-20T17:00:00Z"), new Date("2026-09-20T17:01:00Z"));
  assert.equal(decision.status, "late");
  assert.match(decision.message, /educator report/);
});
