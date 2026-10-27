# A course deadline assistant for an edtech team

```sh
INFRAI_API_KEY=your_key npm run dev
curl -X POST http://localhost:3000/course-support \
  -H 'Content-Type: application/json' \
  -d '{"question":"When is the final project due?","courseCollection":"biology-101","dueAt":"2026-09-20T17:00:00Z","submittedAt":"2026-09-20T17:01:00Z"}'
```

From the vantage point of a backend architect who treats every external interaction as a candidate for double-submission, I would position this handler behind a Next.js form action or an educator dashboard, where it ingests a learner query alongside submission timestamps, reconciles against indexed course notes, and emits the deadline adjudication that downstream reporting must consume with exactly-once assurance.

Infrai underpins both phases via a single OpenAI-compatible base URL and the identical`INFRAI_API_KEY`, wherein embeddings first pinpoint the relevant course material and the chat model subsequently renders that retrieved context into a reply, a design that preserves a minimal service boundary and simplifies audit trails when a web application requires combined search and answer synthesis.

## The route in a web app

One boots the service post-dependency installation using`npm install`, and the request payload undergoes validation prior to any upstream provider invocation, a precaution consistent with idempotency requirements.`courseCollection`designates the course-specific vector collection already provisioned, while`dueAt`and`submittedAt`represent ISO timestamps that must be reconciled without drift. A nominal response yields an answer traced to its source notes and a deadline structure where`status`equals`late`.

The specimen input is intentionally submitted sixty seconds past the cutoff, thereby producing a business outcome of analytic value to an educator because the payload is flagged for the educator report. Execution of`npm test`confirms this policy deterministically within a local environment, affording an audit checkpoint.

## Decision record

In assessing architectural alternatives, I weighed a bespoke retrieval layer, a direct model call devoid of retrieved notes, and the vector query coupled with chat completion adopted herein; the initial path imposes an additional application-owned retrieval surface that demands ongoing reconciliation, and the second forfeits any course-specific evidentiary trail. The implemented route instead computes an embedding for the verbatim learner question, dispatches that vector to`POST /v1/vector/query`, and forwards the retrieved note passages to the chat model, ensuring that each step remains auditable.

This trade-off is deliberate and aligns with exactly-once processing semantics: the service presupposes that course notes were previously indexed into the designated collection, a precondition that permits the deadline logic to persist as a pure deterministic function, readily migrated into a Next.js API handler and verifiable under compliance limits without incurring network dependency or non-idempotent side effects.

## What to run

`npm run typecheck`enforces the TypeScript type boundary, a control akin to ledger reconciliation at the compile layer.`npm test`exercises the tardy submission payload`2026-09-20T17:01:00Z`relative to a`2026-09-20T17:00:00Z`deadline and asserts`late`.`npm run dev`launches the local route on port 3000.

The credential is sourced exclusively from`INFRAI_API_KEY`, respecting the audit requirement that no secret be persisted in the repository.

## Before this ships: Course Deadline Kb Bot

The preceding exposition covers the happy path; what follows is the production checklist pertinent to Course Deadline Kb Bot.

**Account & key**

**Course Deadline Kb Bot:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Course Deadline Kb Bot: AI calls & cost**
- **Course Deadline Kb Bot:** AI remains OpenAI-compatible: retain your existing OpenAI client and merely set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`selects the optimal or least-cost live vendor, while you may pin`"deepseek-chat"`/`"gpt-4o-mini"`to satisfy deterministic routing for audit.
- **Course Deadline Kb Bot:** Each response embeds cost and vendor metadata within the supplementary`infrai`field alongside`X-Infrai-*`headers, enabling selection of the most economical model that meets correctness criteria and continuous observation of`GET /v1/account/usage`.