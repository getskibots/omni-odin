# Botscrew System Architecture (official diagram, May 2026)

Captured from a system-services schematic shared by Daria Vaskovska (Botscrew BA)
on 2026-05-27, in the "Aligning Omni-Channel prototype with Botscrew" thread. This
is Botscrew's own depiction of how the platform is deployed — the authoritative
infrastructure picture.

> Companion docs: `ODIN_SUBSTRATE.md` (engine model), `BOTSCREW_DATA.md` (export
> shapes), `botscrew-docs/` (product documentation).

## The diagram (text rendering)

```
Admins ─────────────────────────────┐
                                     │
                                     ▼
End Users ─→ [ messaging channels ] ─┬─ Web Sockets ─→ Amazon ─→ NGINX ─→ ┌── EC2 Instance Contents ──┐
             www · WhatsApp · SMS    │                 Route 53            │ Front-end                 │
             Telegram · FB Messenger ┴─ Chat ─────────→                    │ Back-end                  │
                                                                           │ Odin (NLP Service)        │
                          ┌──── AWS Cloud ──────────────────────────────┐  │ AI Voice service          │
                          │  ┌── VPC 10.0.0.0/16 ──────────────────────┐ │  │ Logs                      │
                          │  │  (EC2 instance shown at right)          │ │  │ MongoDB                   │
                          │  └──────────────────────────────────────────┘ │  │ Redis                     │
                          └────────────────────────────────────────────┘  │ MySQL DB                  │
                                                                           └─────────────┬─────────────┘
                                                                                         │
                                       ┌──── 3rd Party Services ──────────────────────────┴────┐
                                       │   Pinecone (Vector DB)        OpenAI (Generative AI)   │
                                       └───────────────────────────────────────────────────────┘
```

## Components

### Entry / routing
- **Amazon Route 53** — DNS. Both Admins (dashboard) and End Users (channels) enter here.
- **NGINX** — reverse proxy in front of the EC2 instance.
- **Web Sockets** — the real-time channel (live chat delivery, support-agent
  takeover messages reaching the visitor's widget). **Important:** the real-time
  layer already exists; the agent-takeover feature rides on this.
- **Chat** — the request path for messaging traffic.

### EC2 Instance Contents (everything co-located — a monolith inside one VPC)
- **Front-end** — the admin dashboard SPA (the "Chatbot Platform" UI).
- **Back-end** — the application/API server the SPA talks to (internal API).
- **Odin (NLP Service)** — the orchestration brain, running **on-prem inside the
  VPC** (not a remote `api.getodin.ai` call). Interprets intent, triggers AI Actions.
- **AI Voice service** — dedicated voice component (where Twilio voice bridges in;
  Twilio itself not drawn).
- **Logs**, **MongoDB**, **Redis**, **MySQL DB** — observability + data layer.
  Two databases: MongoDB (likely bot config / flows / conversations) + MySQL
  (likely relational/user/account data). Redis for cache/sessions.

### 3rd Party Services (outside the VPC)
- **Pinecone** — Vector DB. KB embeddings live here, in Botscrew's Pinecone
  account. **Inaccessible to omni.**
- **OpenAI** — "Generative AI." The LLM layer, on GSB's API keys. (Odin is
  multi-model capable, but OpenAI is what's wired in production.)

## What this confirms (vs. ODIN_SUBSTRATE.md §I)

The infrastructure notes in `ODIN_SUBSTRATE.md` §I were accurate almost line-for-line:
- ✅ Odin NLP on Botscrew's AWS EC2 (on-prem install)
- ✅ Front-end + Back-end on EC2
- ✅ MongoDB + MySQL on EC2
- ✅ Redis on EC2
- ✅ Pinecone (vector DB) 3rd-party
- ✅ OpenAI 3rd-party

Refinements the diagram adds:
- **Monolithic single-EC2 deployment** inside one VPC (10.0.0.0/16). Vertically scaled.
- **AI Voice is a distinct service** on the EC2, separate from Odin NLP.
- **Web Sockets** explicitly carry real-time traffic (the live-chat / takeover layer).
- **Odin is on-prem**, not a cloud API call — clarify Tuesday whether the SDK
  `baseUrl` in `ODIN_SUBSTRATE.md` §3 points to an internal address or a hybrid.

## The strategic insight (re: `_questions.md` O2 — inbound API)

**There is NO inbound integration API depicted.** The only inbound connections are:
- Admins → the dashboard UI (Route 53 → NGINX → Front-end)
- End Users → channels + websockets (Route 53 → NGINX → Back-end)

No partner/integration API box. This visually reinforces O2: programmatic config
push from omni would require Botscrew to expose their internal Back-end API (which
the SPA already uses) as a published surface — a real ask, not a given. It quietly
validates Daria's "we build internally; prototypes are references" stance and the
omni-odin spec-handoff model.

## Open clarifications for the Tuesday meeting

1. **Inbound API (O2):** Is the internal Back-end API exposable for omni to
   read/write agent config, KB, prompts, flows? Or is the dashboard the only write path?
2. **Trace data (O1):** Can the export/API surface per-message flow + AI-action +
   `last_ai_action_result`?
3. **Odin deployment:** on-prem self-hosted inside the VPC? Where does the SDK
   `baseUrl` point?
4. **Multi-tenancy / scaling:** one EC2 — how are 100+ demos / 30 partners isolated
   and scaled? One instance for all, or per-tenant instances?
5. **Twilio voice:** where does the Twilio bridge connect to "AI Voice service"?
6. **One bot, multiple channels:** does a resort's chat + voice share one Odin
   project (shared KB) or separate projects (duplicated KB)? (ODIN_SUBSTRATE.md §1)
