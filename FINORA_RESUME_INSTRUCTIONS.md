# FINORA AUTONOMOUS RESUMPTION PROTOCOL

## Core Directive
This document defines the automated recovery and continuation protocol for the Finora ERP & Accounting platform across all 260 Master Specification Chapters.

When an autonomous execution session initiates:
1. **Never reset or discard repository state.**
2. **Read persistent execution state:**
   - Inspect `FINORA_EXECUTION_STATE.json` for active tasks and last successful commits.
   - Inspect `FINORA_PENDING_TASKS.json` for priority queue.
   - Verify all 260 chapters in `FINORA_IMPLEMENTATION_MATRIX.json`.
3. **Run existing test suite:**
   - Execute `npm test` and `npm run validate:matrix` to verify zero regression.
4. **Identify next executable task:**
   - Select the next `IN_PROGRESS` or highest priority `PENDING` task from `FINORA_PENDING_TASKS.json`.
5. **Implement, Verify & Commit:**
   - Develop core domain engines in `src/`.
   - Implement web user interface and client bindings.
   - Add unit/integration tests in `tests/`.
   - Update matrix, work log, and test results.
   - Commit changes cleanly via Git.
6. **Trigger Next Task:**
   - Do not ask for user direction. Select the next task and continue autonomously.

## Scheduled Execution
- Spark Schedule ID: `eff7c4e9-850d-420a-822b-6b8189b6f7e7`
- Trigger cadence: Hourly
- Status: `STATUS_ACTIVE`
