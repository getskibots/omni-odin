# Claude Code Brief — Omni + Odin (omni-odin)

## What this repo is

`omni-odin` is a fork of `getskibots/omni` that aligns the Omni prototype against
the real BotScrew/Odin substrate. The original Omni (omni-gules.vercel.app) remains
the unified-vision marketing demo. **This fork is the production-realistic version
that mirrors how BotScrew/Odin actually structures things**, used as the source of
truth for spec packages handed to BotScrew's dev team (Daria et al.).

The two repos serve different audiences and are allowed to diverge.

## Read these first (in this order)

The fork includes five reference docs in `docs/reference/` that capture the
substrate, the data model, and the alignment work. Read them before making changes:

1. `docs/reference/OMNI_ODIN_ALIGNMENT.md` — master alignment doc. The audit table
   in Part 2 + the action-layer section (F) are the most important.
2. `docs/reference/OMNI_DATA_MODEL.md` — the target TypeScript model
   (Project / KnowledgeBase / Channel / Agent / Toolkits).
3. `docs/reference/ODIN_SUBSTRATE.md` — engine model details (Project→KB→Agents).
4. `docs/reference/BOTSCREW_DATA.md` — conversation egress data shapes (for context
   on the analytics / support data side; not relevant for this first task).
5. `docs/reference/CLAUDE_CODE_INSTRUCTIONS.md` — older Claude Code guidance, useful
   for general repo conventions.

Do not invent on top of these — they're the ground truth. If something in the
existing code conflicts with them, the docs win.

## Current state (what's in the fork now)

The fork was just created from `getskibots/omni`. So:

- React 19 + Vite 8 + Tailwind 3 + HashRouter (unchanged from origin)
- `src/data/parent.ts` (~1000 lines) — the current data model, using
  `ParentSummary` + `ChannelLayer[]` + `ResortTemplate` + `renderTemplate()`
- 10 pages, 4 real (Knowledge/Support/Widget/SettingsChannels) + 6 stubbed
- localStorage-only persistence; no BotScrew push (gated on BotScrew API)
- `botscrewBotId` strings like `bs_8721`, `bs_9034` — the OLD model
- No Odin awareness anywhere in the code

## Task: substrate-align the data model

**Goal:** refactor `src/data/parent.ts` (or replace it) so the data model matches
`OMNI_DATA_MODEL.md` exactly. The existing pages should mostly still render with
minimal page-level changes — most of the work is in the data layer.

### Specifically

1. **Create `src/data/model.ts`** with the full TypeScript types from
   `OMNI_DATA_MODEL.md`. Copy the types verbatim, including:
   - `Resort` (the parent — formerly `ParentSummary`)
   - `KnowledgeBase` + `KnowledgeSource` + `KnowledgeTemplate` + `SmartTableRef`
   - `Channel` + `AgentConfig` + `ToolkitId` + `CustomToolRef`
   - `ChatChannelConfig` + `VoiceChannelConfig` + `EmailChannelConfig`
   - `Conversation` + `Message` (for the Support page later)
   - All the enums: `Platform`, `ChannelFamily`, `ConversationOutcome`, etc.

2. **Preserve the `@gsb` / `@odin` / `@botscrew` ownership comments inline.**
   They're not just documentation — they're the rule for how Omni's layers stay
   honest. Keep every layer-tag in the source file.

3. **Add `odinProjectId` to `Resort`** and `odinAgentId` to each `Channel`. These
   are the unification keys. They can be `null` or placeholder UUIDs for now, but
   the *fields must exist*.

4. **Migrate the seed data** in `parent.ts` into one realistic resort in the new
   shape. Use Mountain Collective as the seed since it's a visible test case:
   - One `Resort` for Mountain Collective with a placeholder `odinProjectId`
   - One shared `KnowledgeBase` with 2-3 sample `KnowledgeSource` entries
     (one WEB_CRAWL pointing at mountaincollective.com, one DOCUMENT example,
     one FILE example with a placeholder name)
   - Three `Channel` entries: chat, voice, email — each with their own
     `AgentConfig` (personality prompt as placeholder text, model = "gpt-5.2",
     toolkits = `["KNOWLEDGE_BASE"]` at minimum)
   - For email channel: `EmailChannelConfig` with `provider: "MICROSOFT_365"`,
     `mailbox: "support@example.com"`, `sendPolicy: "DRAFT"`, and an `oauth`
     block with `connected: false`. **Never include real OAuth tokens or
     credentials in seed data — use placeholders only.**

5. **Keep the existing pages working.** The Knowledge page, Support page, Widget
   page, and SettingsChannels page in `src/pages/` currently read from `parent.ts`.
   Update them to read from the new model. **Do not redesign the pages in this
   pass** — just adapt them to consume the new types. Page redesign comes later
   as separate, focused tasks.

6. **Preserve the existing flows array** but expose it through the new model.
   The current `parent.ts` has `flows` like `get_snow_report`, `get_lift_status`
   etc. These become `CustomToolRef[]` on each Channel's `AgentConfig`. They are
   per-resort GSB-built integrations — see `OMNI_ODIN_ALIGNMENT.md` Section F.3
   for the architectural framing. Don't try to wire them to real endpoints in
   this task; just preserve them as data.

### What NOT to do in this task

- Don't redesign any UI. Pages should look identical to the original Omni — just
  reading from a substrate-aligned model underneath.
- Don't add new pages or features.
- Don't try to integrate with BotScrew's API or Odin's SDK. There's no live
  connection. localStorage persistence stays.
- Don't touch the voice integration (`lib/realtimeVoice.ts`,
  `lib/elevenLabsVoice.ts`, or the api proxies). It works; leave it.
- Don't remove or rewrite the existing 17 knowledge groups in the current model
  without preserving their content — they're seeded resort knowledge. Map them
  into the new `KnowledgeBase.sources` and `KnowledgeBase.templates` where
  appropriate.

### Definition of done

- New `src/data/model.ts` exists, contains the full type set from
  `OMNI_DATA_MODEL.md`, compiles cleanly with no `any` escape hatches.
- Seed data for Mountain Collective is in the new shape in
  `src/data/seed.ts` (or wherever feels natural — split from types).
- All four real pages still render without errors.
- `npm run build` succeeds.
- Vercel preview deploy works.
- Existing tests (if any) pass; if a few break, document which and why in the PR
  description rather than masking them.
- Commit messages reference the substrate concept ("Refactor to substrate-aligned
  data model (Project / KB / Channel)") rather than just "Refactor parent.ts."

### Constraints — the discipline that keeps the fork honest

- **Never log, commit, or display real OAuth tokens, API keys, or OpenAI keys**
  anywhere in this repo. Even placeholder strings like `<REDACTED>` are
  preferable to anything that looks real.
- **Never use Odin terminology in user-visible UI strings.** The data model uses
  Odin terms internally (`odinProjectId`, "Agent", etc.) because they're accurate.
  But the *page UI* uses product language (Resort, Knowledge Base, Channel,
  Instructions) — this is the GSB-internal vs. BotScrew-handoff distinction
  from `OMNI_ODIN_ALIGNMENT.md` Part 6.
- **Open questions** found during the refactor → add to
  `docs/alignment/_questions.md` (create the file if missing). Don't try to
  resolve every ambiguity in code; surface it for the next conversation.

## After this task

Subsequent tasks (separate Claude Code briefs) will:

- Build `docs/alignment/knowledge-page.md` — the per-page alignment file for the
  Knowledge page redesign.
- Redesign the Knowledge page UI to add the fifth Tools / Actions layer
  (see `OMNI_ODIN_ALIGNMENT.md` Section F.7).
- Build the first handoff package in `docs/handoff/knowledge-page/` for Daria.

These come after the data model is solid. Get the foundation right first.

## How to ask for help

If anything in this brief conflicts with the reference docs, or if the existing
code's structure makes a clean refactor impossible, surface that in the PR
description with a clear question rather than silently choosing a path. The goal
is substrate-aligned correctness, not speed.
