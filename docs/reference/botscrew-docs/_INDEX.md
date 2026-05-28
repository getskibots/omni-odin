# Botscrew Product Documentation (reference snapshot)

Text extraction of Botscrew's official product help docs, captured from a Notion
export (May 2026). These are the **ground-truth** description of how the Botscrew
platform (and the Odin engine underneath) actually works — the substrate omni-odin
is designed against.

> **Source:** Botscrew "Help & Support" Notion space, exported to HTML, stripped to
> plain text. Original export also included ~550 screenshots (not committed — text
> is what matters for architecture work).
>
> **Status:** Botscrew's material, internal GSB reference only. Do not redistribute.
>
> **Confidence:** This is Botscrew's *documented* behavior. Where it conflicts with
> observed export data (`../BOTSCREW_DATA.md`) or the Odin substrate notes
> (`../ODIN_SUBSTRATE.md`), note the discrepancy in `../../alignment/_questions.md`.

---

## High-value docs (start here)

These directly informed the omni-odin data model + Support/Knowledge design:

| Doc | Why it matters |
|---|---|
| **'Support' tab.txt** | The full human-handover state machine: `current_request_status` (open/pending/expired), agent groupings (Assigned to me / New requests / Assigned / Expired / Chatbot / Solved), assign/reassign/close mechanics, disconnect→Resolve, system event messages. Drives the agent-takeover UI. |
| **AI Actions.txt** | The smart-routing engine. Confirms **Odin** triggers AI Actions from user intent. name + "Description for AI" + parameters + `last_ai_action_result`. Maps to `model.ts::CustomToolRef`. |
| **API call.txt** | The **outbound** HTTP atom (Botscrew→external). How GSB resort feeds (lift status, snow report) are wired. Maps to `CustomToolRef.endpoint`. NOTE: this is outbound only — NOT an inbound API for omni to push config in. |
| **Smart redirect.txt** | Deterministic attribute-based routing (is/is not/greater/less/contains, and/or). The OTHER routing layer alongside AI Actions. How human-handover branches on `current_request_status` + `is_in_working_hours`. |
| **AI Knowledge.txt** | The KB layer (Odin RAG). For the Knowledge page redesign. |
| **Atom.txt** | The core flow building block. Everything (messages, API calls, redirects, handover) is an "atom." |
| **Flow.txt / 'Flows' tab.txt** | The flow builder — how atoms chain into conversations. |
| **Platform roles.txt** | Roles + permissions (e.g. "Customer support manager"). Affects who can assign/close in Support. |
| **Conversation.txt** | Conversation model. |
| **Messaging channels capabilities comparison.txt** | Per-connector feature matrix (Web / FB / WhatsApp / SMS / Telegram / Instagram). |
| **'NLP' tab.txt / What is NLP.txt** | Intent recognition layer. |
| **Attributes.txt / Save user input.txt** | The attribute system that drives routing + personalization. |

## Key confirmations from these docs (May 2026 read)

1. **Odin is the orchestration brain** — AI Actions are explicitly "triggered by ODIN based on user input." Confirms the substrate model in `../ODIN_SUBSTRATE.md`.

2. **Two routing mechanisms:**
   - **AI Actions** — AI/intent-based (Odin interprets "user wants X" → triggers action)
   - **Smart redirect** — deterministic attribute conditions (working hours, request status, language)
   - Your department smart-routing uses BOTH.

3. **Resort feeds = API call atoms** — `get_lift_status` etc. are API call atoms hitting GSB-hosted endpoints. Validates `model.ts::CustomToolRef` (endpoint/method/headers/body/response-mapping all match).

4. **Support handoff state machine** (`current_request_status`):
   - `open` → bot stops replying, user in support mode
   - `pending` → out-of-hours; bot keeps replying until agent picks up (`is_in_working_hours`)
   - expired → no agent within 20 min → back to bot
   - exit → user types "back to bot" or clicks a flow option

5. **`last_ai_action_result`** holds the outcome of the most recent AI action — the data the conversation-trace view would surface.

## Still-open questions these docs do NOT answer

- **Inbound management API** — is there an API for omni to PUSH agent config / KB content / prompts INTO Botscrew? The docs describe the admin UI + the outbound API-call atom, but no inbound integration API. → biggest "build against vs. alongside" question. Ask Daria.
- **Trace data in the export** — Odin tracks AI-action name + params + `last_ai_action_result` at runtime, but `../BOTSCREW_DATA.md` shows the conversation export doesn't include them. Ask whether they can be exposed.

See `../../alignment/_questions.md` for the running list.

---

## Full file list (66 docs)

Getting started: `0 Introduction`, `1 Create a new account`, `2 Sign in`,
`3 Create a chatbot`, `4 Build a chatbot flow`, `5 Publish your chatbot to Facebook`,
`6 Test your chatbot`

Tabs: `'Dashboard' tab`, `'Flows' tab`, `'NLP' tab`, `'Support' tab`, `'Widget' tab`,
`'Broadcasts' tab`, `'Bot Settings' tab`, `'Analytics' tab`, `'Account settings' page`,
`Home page`, `Overview`

Flow primitives: `Atom`, `Flow`, `Attributes`, `Buttons`, `Quick Replies`,
`Quick replies multi-selection`, `Messages`, `Gallery and Attachment`,
`Save user input`, `User input On Off`, `Smart redirect`, `Random redirect`,
`What is a chatbot's (persistent) menu`

AI / NLP: `AI Actions`, `AI Knowledge`, `API call`, `Api Calls Messages Response`,
`What is NLP`, `How to build bot flow using AI Knowledge`,
`How to analyse and improve AI Knowledge replies`, `How to add and edit an FAQ`

Support / roles: `Conversation`, `Platform roles`,
`How to set the support team's working hours`, `How to enable browser notifications`

Channels: `FaceBook integration`, `WhatsApp integration`, `Telegram integration`,
`Instagram Integration`, `Twilio integration`, `Dialogflow integration`,
`WitAi integration`, `Messaging channels capabilities comparison`,
`Messaging channels limits comparison`

How-tos: language, password reset, tags, attributes, name change, clear history,
clone, broadcast, multiple welcome messages, customize widget, delete, share,
transfer content between bots, `Funnels`
