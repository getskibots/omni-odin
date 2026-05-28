# Odin API Surface (api.getodin.ai) — capability map

Captured 2026-05-27 from the live Odin OpenAPI spec at
`https://api.getodin.ai/openapi.json` (FastAPI, title "API Docs", **850 endpoints**).

> **Why this matters:** This is the authoritative answer to `_questions.md` O1 and
> O2. Odin exposes a complete platform management + read API. omni-odin does NOT
> need Botscrew to *build* anything — it needs **scoped Odin API credentials** for
> GSB's projects. That reframes the entire Tuesday ask.

## Endpoint groups (by count)

```
192 project      173 admin       72 tools       31 user        23 agents
21 chat          20 actions      20 workflows   16 team        15 (agents/personality/version)
14 analytics     13 integrations 11 agent-tests  8 mcp          6 crawl-configs
5 personality     5 crawl-runs    4 elevenlabs   3 knowledgebase-settings   ...
```

Auth model (from `ODIN_SUBSTRATE.md` §3): every call needs `projectId` + `apiKey` +
`apiSecret`. **Botscrew currently holds these** (GSB's bots live in Botscrew's Odin
project). So the API exists and does everything — the only gate is credential access.

---

## ✅ O2 — Inbound config management API: YES, comprehensive

Everything omni-odin would need to *write* config programmatically:

### Agents (full CRUD + lifecycle)
```
POST   /agents/new · /agents/edit · /agents/clone · /agents/activate · /agents/deactivate
DELETE /agents/delete
GET    /agents/{project_id}/{agent_id}/get · /config · /oauth-status
GET    /agents/{project_id}/list
GET/POST/PUT/DELETE /agents/{agent_id}/prompts[/{prompt_id}]      (prompt library)
GET/POST /agents/{project_id}/model[...]                          (model selection)
GET/PUT  /agents/{agent_id}/memory-settings · /prompt-library-settings
GET/POST/DELETE /agents/{agent_id}/skills[...]
```
### Personality (the agent personality prompt)
```
POST   /personality/add · /personality/update · /personality/select
GET    /personality/all/{project_id}      DELETE /personality/delete
```
### Agent version history (audit + rollback)
```
GET    /agent-version-history/agents/{agent_id}/history · /current-version · /compare
POST   /agent-version-history/agents/{agent_id}/history/{version}/restore
```
### Knowledge Base (ingest + manage)
```
POST   /project/knowledge/add/{file|url|html-content|sharepoint|google_drive|confluence|zoomin}
GET    /project/{project_id}/knowledge            (get KB)
POST   /project/{project_id}/knowledgebase        (KB page)
POST   /project/knowledge/settings · /sync · /auto-sync · /move · /rename
DELETE /project/knowledge/delete · /remove · /{project_id}/knowledge/delete/all
PATCH  /project/{project_id}/knowledge/{document_name}/metadata
POST   /project/{id}/search/documents · /project/{project_id}/document/chunks
GET/POST/PUT/DELETE /crawl-configs/{project_id}[...]   (web crawl + auto-sync + runs)
GET/POST/PUT /knowledgebase-settings/{project_id}      (chunking strategy)
```
### Actions (the AI Actions / tool config)
```
POST   /actions/save · /actions/create-code-runner    DELETE /actions/delete/{project_id}/{flow_id}
GET    /actions/{project_id} · /blocks · /flow/{flow_id} · /flow/{flow_id}/export
POST   /actions/execute[/api|/direct|/generic]         (test an action)
```
### Workflows (multi-step flows)
```
POST/GET/PUT/DELETE /workflows[/{id}]
POST   /workflows/{id}/activate · /deactivate · /duplicate · /import · /{id}/export
```

→ **omni-odin's Knowledge page (agents, personality prompts, KB sources, crawl
configs, actions, workflows) maps directly onto these endpoints.** No gaps.

---

## ✅ O1 — Conversation + trace data: YES

Everything omni-odin's Support inbox + trace view would need to *read*:

### Conversations / messages
```
GET    /project/{project_id}/chat                          (list chats)
GET    /project/{project_id}/chat/{chat_id} · /chat/{chat_id}/all   (full transcript)
GET    /project/{project_id}/chats · /user/chats
GET    /project/{project_id}/chat-audits[/export]          (audit logs)
```
### ⭐ Per-message trace (the smart-routing QA data)
```
GET    /project/{project_id}/agent-interactions/{message_id}
       -- "Get interaction detail for a single message"
GET    /actions/result/{project_id}/{flow_run_id}          (action result)
GET    /actions/status/{project_id}/{flow_run_id}          (action status)
```
`agent-interactions/{message_id}` is almost certainly the per-message detail
(which action fired, KB retrieved, routing decision) that the conversation-trace
view needs. **Verify the response shape with scoped access.**

### Analytics (intent + metrics)
```
POST   /analytics/chats/{project_id}                       (chat analytics)
POST   /analytics/chats/{project_id}/metrics_and_timeseries
POST   /analytics/chats/{project_id}/nlp_metrics_and_categories   (intent classes!)
POST   /analytics/chat/{project_id}/feedback_table · /liked_disliked_messages
GET    /analytics/kb/{project_id}
GET    /analytics/tokens/projects/{project_id}/by-{agent|domain|medium|model|user}|total
```

---

## Voice — Odin already has the ElevenLabs endpoints omni built itself

```
GET    /elevenlabs/signed-url                 (omni-odin built its OWN proxy for this!)
POST   /elevenlabs/agent/edit
GET    /integrations/elevenlabs/voices        (list voices)
POST   /elevenlabs/voice-conversation/save-pair · /voice-message/save
```
omni-odin's `api/elevenlabs-signed-url.ts` could call Odin's `/elevenlabs/signed-url`
instead of ElevenLabs directly — if/when we route voice through Odin.

---

## 🎯 Strategic reframe for the Tuesday meeting

**Before this discovery:** the two asks were "will Botscrew BUILD us an inbound
config API?" + "will they EXPOSE trace data?" — big asks they'd likely resist.

**After:** Odin already has all of it. The ask collapses to ONE, much smaller item:

> **"Odin's API already supports everything we need to build the admin layer.
> Can you provision GSB scoped Odin API credentials (apiKey/apiSecret) for our
> projects, so omni reads/writes our own agent config, KB, and conversation data
> directly?"**

This is provisioning access to an existing API — not asking them to build one.

### The caveats to navigate (don't assert these as solved)

1. **Credentials are Botscrew's.** GSB's bots live in Botscrew's Odin project;
   Botscrew holds the apiKey/apiSecret. Need them to provision scoped access.
2. **On-prem vs cloud.** `SYSTEM_ARCHITECTURE.md` shows Odin running on-prem inside
   Botscrew's VPC. `api.getodin.ai` is Odin's public cloud. Confirm: does Botscrew's
   on-prem Odin expose this same API, and can GSB reach it (network + auth)?
3. **Disintermediation tension.** Botscrew's business is being the wrapper/reseller.
   Direct Odin API access partially routes around them. Frame collaboratively:
   omni-odin = the GSB-built admin over Odin; Botscrew keeps the runtime, hosting,
   Odin license, billing, telephony — and their devs DON'T have to build omni's
   features (which Daria already said they'd rather not). It's a win for them too.
4. **Odin confirms this is intended.** `ODIN_SUBSTRATE.md` §11: Odin offers API keys
   + custom app interfaces + on-prem. "Building a custom frontend over Odin is an
   intended use case." This API surface proves it.

### How this changes the omni-odin model

If Botscrew provisions scoped Odin access, omni-odin stops being *only* a
spec-handoff prototype and can become a **real product talking to Odin's API** —
GSB-built, GSB-owned admin over the Botscrew/Odin runtime. That's a stronger
position than "hand specs to Botscrew's devs and wait."

---

## Source

Full spec saved locally at `C:\Users\Brandon\Downloads\odin-openapi.json` (2.1 MB,
850 paths). Re-fetch from `https://api.getodin.ai/openapi.json` to refresh.
