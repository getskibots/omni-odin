import { useState } from 'react';
import ChannelCard from '../components/ChannelCard';
import Panel from '../components/Panel';
import { jacksonHole } from '../data/parent';

export default function Knowledge() {
  const [systemRole, setSystemRole] = useState(jacksonHole.systemRolePrompt);
  const [model, setModel] = useState(jacksonHole.defaultModel);

  const charCount = systemRole.length;
  const limit = jacksonHole.systemRoleLimit;

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink-900">Knowledge</h1>
        <p className="text-sm text-slate-500 mt-1">
          Edit the parent. Every channel below inherits from here.
        </p>
      </header>

      <div>
        <SectionHeader label="Parent" />
        <div className="space-y-4">
          <Panel
            eyebrow="System Role"
            title="Identity, personas, and policies"
            right={
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500">Default model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white"
                >
                  <option value="gpt-5.2">gpt-5.2</option>
                  <option value="gpt-5.1">gpt-5.1</option>
                  <option value="claude-opus-4-7">claude-opus-4-7</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                </select>
              </div>
            }
          >
            <textarea
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
              className="w-full min-h-[280px] text-sm font-mono text-ink-900 bg-slate-50 border border-slate-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Channel-specific rules (length, formatting, fallback) belong on each channel's page.
              </span>
              <span className={charCount > limit ? 'text-danger font-semibold' : 'text-slate-500'}>
                {charCount.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
          </Panel>

          <Panel eyebrow="Knowledge" title="What the bot knows">
            <div className="grid grid-cols-3 gap-4">
              <KnowledgeTile label="Text Edits" value={jacksonHole.knowledge.textEdits} suffix="entries" />
              <KnowledgeTile label="Files" value={jacksonHole.knowledge.files} suffix="files" />
              <KnowledgeTile
                label="Website"
                value={jacksonHole.knowledge.websites.count}
                suffix={`crawl · synced ${jacksonHole.knowledge.websites.lastSync}`}
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-wider justify-center">
        <span className="h-px bg-slate-200 flex-1" />
        <span>↓ inherits to ↓</span>
        <span className="h-px bg-slate-200 flex-1" />
      </div>

      <div>
        <SectionHeader label="Channels" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jacksonHole.channels.map((c) => (
            <ChannelCard key={c.id} channel={c} />
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3 pt-2">
        <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-ink-900">
          Reset
        </button>
        <button className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50">
          Preview assembled
        </button>
        <button className="px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md">
          Save parent
        </button>
      </footer>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</h2>
      <div className="h-px bg-slate-200 flex-1" />
    </div>
  );
}

function KnowledgeTile({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{label}</div>
      <div className="text-2xl font-semibold text-ink-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{suffix}</div>
    </div>
  );
}
