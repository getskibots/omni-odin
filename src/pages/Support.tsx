import { useMemo, useState } from 'react';
import { User, Phone, MessageCircle, Mail, Send, Paperclip, UserPlus, Check, Headphones } from 'lucide-react';
import {
  conversations,
  type AttentionFlag,
  type Channel,
  type Conversation,
} from '../data/conversations';

type ChannelFilter = 'all' | Channel;
type AttentionFilter = 'all' | 'needs-attention';

/**
 * Display-message type widens the data model's `from` to include 'support' —
 * the human agent's messages once they take over a chat. Maps to BotScrew's
 * `sender_type: SUPPORT` / `is_from_support: true`.
 */
type ChatSender = 'bot' | 'user' | 'support';
interface DisplayMessage {
  from: ChatSender;
  text: string;
  time: string;
  toolCall?: { name: string; failed?: boolean };
  audioDuration?: string;
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Support() {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(conversations[0].id);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      if (attentionFilter === 'needs-attention' && c.flags.length === 0) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !c.identityLabel.toLowerCase().includes(q) &&
          !c.preview.toLowerCase().includes(q) &&
          !(c.subject ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [channelFilter, attentionFilter, query]);

  const selected = conversations.find((c) => c.id === selectedId) ?? filtered[0];
  const linked = selected?.linkedConversationIds
    ?.map((id) => conversations.find((c) => c.id === id))
    .filter((c): c is Conversation => Boolean(c));

  const counts = {
    all: conversations.length,
    chat: conversations.filter((c) => c.channel === 'chat').length,
    voice: conversations.filter((c) => c.channel === 'voice').length,
    email: conversations.filter((c) => c.channel === 'email').length,
  };
  const attentionCount = conversations.filter((c) => c.flags.length > 0).length;

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 pt-4 pb-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">Support</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              All channels in one inbox. {attentionCount} need attention.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RangePill label="Last 7 days" active />
            <RangePill label="Last 30 days" />
            <RangePill label="Custom" />
            <button className="px-3 py-1.5 text-sm rounded-md bg-action-500 hover:bg-action-600 text-white">
              Export chats
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <ChannelChip active={channelFilter === 'all'} onClick={() => setChannelFilter('all')}>
              All · <span className="font-mono text-xs">{counts.all}</span>
            </ChannelChip>
            <ChannelChip active={channelFilter === 'chat'} onClick={() => setChannelFilter('chat')}>
              💬 Chat · <span className="font-mono text-xs">{counts.chat}</span>
            </ChannelChip>
            <ChannelChip active={channelFilter === 'voice'} onClick={() => setChannelFilter('voice')}>
              📞 Voice · <span className="font-mono text-xs">{counts.voice}</span>
            </ChannelChip>
            <ChannelChip active={channelFilter === 'email'} onClick={() => setChannelFilter('email')}>
              ✉️ Email · <span className="font-mono text-xs">{counts.email}</span>
            </ChannelChip>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setAttentionFilter(attentionFilter === 'all' ? 'needs-attention' : 'all')
              }
              className={`text-xs px-3 py-1.5 rounded-md border ${
                attentionFilter === 'needs-attention'
                  ? 'bg-warn/10 border-warn/40 text-warn'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              ⚠️ Needs attention {attentionFilter === 'needs-attention' && `· ${attentionCount}`}
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats / users"
              className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white w-56 focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[420px_minmax(0,1fr)] min-h-0">
        <aside className="border-r border-slate-200 bg-white overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No conversations match.</div>
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                selected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </aside>

        <section className="overflow-y-auto bg-slate-50">
          {selected ? (
            // key={selected.id} remounts the pane per conversation so the
            // local takeover state (assigned / agent messages) resets cleanly.
            <ConversationPane key={selected.id} conv={selected} linked={linked} />
          ) : (
            <div className="p-8 text-sm text-slate-400">Select a conversation.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function RangePill({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-3 py-1.5 text-sm rounded-md border ${
        active
          ? 'bg-botscrew-500 border-botscrew-500 text-white'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function ChannelChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-md border transition ${
        active
          ? 'bg-botscrew-50 border-botscrew-400 text-ink-900'
          : 'bg-white border-transparent text-slate-500 hover:text-ink-900 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function ConversationRow({
  conv,
  selected,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  // Surface subject for email rows in the preview line; otherwise show preview.
  // Identity sub (e.g. phone number, email address, return-caller note) goes
  // on the second line under the name — matching Botscrew's row hierarchy.
  const subline = conv.identitySub ?? '';
  const previewLine = conv.subject ?? conv.preview;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-100 transition ${
        selected ? 'bg-botscrew-50' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with channel-icon overlay (matches Botscrew's pattern) */}
        <RowAvatar channel={conv.channel} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name (+ optional flag later) + date right-aligned */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[15px] font-medium text-ink-900 truncate">
              {conv.identityLabel}
            </div>
            <div className="text-xs text-slate-400 shrink-0">{conv.time}</div>
          </div>

          {/* Row 2: sub-identity (phone, email, return-caller note) */}
          {subline && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{subline}</div>
          )}

          {/* Row 3: preview / subject (single line) */}
          <div className="text-[13px] text-slate-500 truncate mt-1">{previewLine}</div>

          {/* Row 4: attention flags + large unread badge (Botscrew uses 24px+ circle) */}
          {(conv.flags.length > 0 || conv.unread > 0) && (
            <div className="flex items-center gap-1.5 mt-2">
              {conv.flags.map((f) => (
                <AttentionPill key={f} flag={f} />
              ))}
              {conv.unread > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold bg-botscrew-500 text-white">
                  {conv.unread}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Row avatar — silhouette in a circle with a small channel-icon badge in the
 * bottom-right corner. Mirrors Botscrew's voice/chat row pattern.
 */
function RowAvatar({ channel }: { channel: Channel }) {
  const Icon = channel === 'voice' ? Phone : channel === 'email' ? Mail : MessageCircle;
  return (
    <div className="shrink-0 relative">
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <User className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-botscrew-500 border-2 border-white flex items-center justify-center">
        <Icon className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
      </div>
    </div>
  );
}

function ChannelBadge({ channel, connector }: { channel: Channel; connector?: string }) {
  const styles: Record<Channel, string> = {
    chat: 'bg-botscrew-50 text-botscrew-700 border-botscrew-200',
    voice: 'bg-violet-50 text-violet-700 border-violet-200',
    email: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const icon = channel === 'chat' ? '💬' : channel === 'voice' ? '📞' : '✉️';
  const label = channel.charAt(0).toUpperCase() + channel.slice(1);
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles[channel]}`}
      title={connector ? `${label} · ${connector}` : label}
    >
      <span>{icon}</span>
      <span>{connector ? connector.charAt(0).toUpperCase() + connector.slice(1) : label}</span>
    </div>
  );
}

function AttentionPill({ flag }: { flag: AttentionFlag }) {
  const map: Record<AttentionFlag, { label: string; tone: string }> = {
    'human-requested': { label: 'Wants human', tone: 'bg-action-500/10 text-action-600 border-action-500/30' },
    'tool-failed': { label: 'Tool failed', tone: 'bg-danger/10 text-danger border-danger/30' },
    'missed-call': { label: 'Missed call', tone: 'bg-danger/10 text-danger border-danger/30' },
    unanswered: { label: 'Unanswered', tone: 'bg-warn/10 text-warn border-warn/30' },
    'negative-sentiment': { label: 'Negative', tone: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
    'failed-booking': { label: 'Booking failed', tone: 'bg-danger/10 text-danger border-danger/30' },
  };
  const m = map[flag];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.tone}`}>
      {m.label}
    </span>
  );
}

function ConversationPane({
  conv,
  linked,
}: {
  conv: Conversation;
  linked?: Conversation[];
}) {
  // --- Live agent takeover state (demo / local-only) ----------------------
  // Maps to BotScrew's support handoff state machine:
  //   assigned         → current_request_status: 'assigned' + admin_id set
  //   agent messages   → sender_type: 'SUPPORT' / is_from_support: true
  //   taking over      → user_bot: false (bot paused)
  // In production these actions POST to BotScrew's API. Here they're local.
  const isChat = conv.channel === 'chat';
  const [assigned, setAssigned] = useState(false);
  const [draft, setDraft] = useState('');
  const [agentMessages, setAgentMessages] = useState<DisplayMessage[]>([]);

  const sendAgentMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setAgentMessages((prev) => [...prev, { from: 'support', text, time: nowLabel() }]);
    setDraft('');
  };

  // Merge seeded conversation messages with locally-sent agent messages.
  const allMessages: DisplayMessage[] = [...conv.messages, ...agentMessages];

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <header className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ChannelBadge channel={conv.channel} connector={conv.connector} />
                {conv.flags.map((f) => (
                  <AttentionPill key={f} flag={f} />
                ))}
                {assigned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-success/10 text-success border-success/30">
                    <Headphones className="h-3 w-3" strokeWidth={2} />
                    Assigned to you
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-ink-900">{conv.identityLabel}</h2>
              {conv.identitySub && (
                <div className="text-xs text-slate-500 mt-0.5">{conv.identitySub}</div>
              )}
              {conv.subject && (
                <div className="text-sm font-medium text-ink-900 mt-2">{conv.subject}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right text-xs text-slate-400">
                <div>{conv.time}</div>
                {conv.callDuration && conv.callDuration !== '00:00' && (
                  <div className="mt-1 font-mono text-slate-600">Duration {conv.callDuration}</div>
                )}
              </div>
              {/* Assign / Close — chat only (live takeover) */}
              {isChat &&
                (assigned ? (
                  <button
                    onClick={() => setAssigned(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    Close request
                  </button>
                ) : (
                  <button
                    onClick={() => setAssigned(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-action-500 hover:bg-action-600 text-white rounded-md"
                  >
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                    Assign to me
                  </button>
                ))}
            </div>
          </div>
          {linked && linked.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                Related on other channels
              </div>
              <div className="flex flex-wrap gap-2">
                {linked.map((l) => (
                  <a
                    key={l.id}
                    href="#"
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-white"
                  >
                    <ChannelBadge channel={l.channel} connector={l.connector} />
                    <span className="text-slate-600">{l.subject ?? l.preview.slice(0, 40)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Takeover status banner */}
        {isChat && assigned && (
          <div className="mb-4 flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-md px-3 py-2">
            <Headphones className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>You're handling this chat. The bot is paused — your replies go straight to the visitor.</span>
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            {conv.flags.includes('missed-call')
              ? 'Caller hung up before connecting. No voicemail.'
              : 'No messages yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {conv.channel === 'voice' && (
              <AudioPlaceholder duration={conv.callDuration ?? '00:00'} />
            )}
            {allMessages.map((m, i) => (
              <MessageBubble key={i} message={m} channel={conv.channel} />
            ))}
          </div>
        )}
      </div>

      {/* Composer — chat only. Active once assigned, otherwise prompts to take over. */}
      {isChat && (
        <div className="border-t border-slate-200 bg-white px-6 py-3">
          {assigned ? (
            <div className="flex items-center gap-2">
              <button
                className="text-slate-400 hover:text-ink-900 p-1.5 rounded-md hover:bg-slate-100"
                title="Attach a file"
              >
                <Paperclip className="h-4 w-4" strokeWidth={2} />
              </button>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAgentMessage();
                  }
                }}
                autoFocus
                placeholder="Type a reply to the visitor…"
                className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
              <button
                onClick={sendAgentMessage}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} /> Send
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Assign this chat to yourself to jump in and reply to the visitor.
              </span>
              <button
                onClick={() => setAssigned(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-action-500 hover:bg-action-600 text-white rounded-md shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                Assign to me
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AudioPlaceholder({ duration }: { duration: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
      <button className="h-9 w-9 rounded-full bg-botscrew-500 text-white flex items-center justify-center hover:bg-botscrew-600">
        ▶
      </button>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
        <div className="h-full bg-botscrew-500 rounded-full" style={{ width: '0%' }} />
      </div>
      <span className="text-xs font-mono text-slate-500">{duration}</span>
      <button className="text-slate-400 hover:text-ink-900" title="Download">
        ⬇
      </button>
    </div>
  );
}

function MessageBubble({ message, channel }: { message: DisplayMessage; channel: Channel }) {
  if (message.toolCall) {
    return (
      <div className="flex justify-center text-xs text-slate-500">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            message.toolCall.failed
              ? 'bg-danger/10 text-danger border-danger/30'
              : 'bg-slate-100 border-slate-200'
          }`}
        >
          <span>{message.toolCall.failed ? '⚠' : '⚙'}</span>
          <code className="font-mono text-[11px]">{message.toolCall.name}</code>
          {message.toolCall.failed && <span>· failed</span>}
        </span>
      </div>
    );
  }

  const isBot = message.from === 'bot';
  const isSupport = message.from === 'support';
  const isOutbound = isBot || isSupport; // both render on the right
  const isEmail = channel === 'email';

  // Three styles: bot (blue), human agent (teal/green), visitor (white).
  const bubbleStyle = isSupport
    ? 'bg-teal-600 text-white rounded-br-sm'
    : isBot
      ? 'bg-botscrew-500 text-white rounded-br-sm'
      : 'bg-white border border-slate-200 text-ink-900 rounded-bl-sm';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${bubbleStyle} ${isEmail ? 'whitespace-pre-wrap' : ''}`}>
        {isSupport && (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-white/80 mb-0.5 uppercase tracking-wide">
            <Headphones className="h-2.5 w-2.5" strokeWidth={2.5} />
            Agent
          </div>
        )}
        <div className={`text-sm ${isEmail ? 'leading-relaxed' : ''}`}>{message.text}</div>
        <div
          className={`text-[10px] mt-1 ${isOutbound ? 'text-white/70' : 'text-slate-400'} flex items-center gap-2`}
        >
          <span>{message.time}</span>
          {message.audioDuration && <span className="font-mono">▶ {message.audioDuration}</span>}
        </div>
      </div>
    </div>
  );
}
