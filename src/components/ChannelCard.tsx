import { Link } from 'react-router-dom';
import type { ChannelSummary } from '../data/parent';

interface Props {
  channel: ChannelSummary;
}

export default function ChannelCard({ channel }: Props) {
  const isActive = channel.status === 'active';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{channel.icon}</div>
          <div>
            <div className="font-semibold text-ink-900">{channel.label}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {channel.botscrewBotId ?? '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Not connected
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="text-sm text-slate-600">{channel.meta}</div>
        {isActive && (
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div>
              Override:{' '}
              <span className="font-semibold text-ink-900">
                +{channel.overrideChars.toLocaleString()} chars
              </span>
            </div>
            <div>
              Assembled:{' '}
              <span className="font-semibold text-ink-900">
                {channel.assembledChars?.toLocaleString()} chars
              </span>
            </div>
          </div>
        )}
        <div className="pt-1">
          <Link
            to={channel.route}
            className="inline-flex items-center text-sm font-medium text-botscrew-500 hover:text-botscrew-600"
          >
            {isActive ? 'Configure' : 'Connect'} →
          </Link>
        </div>
      </div>
    </div>
  );
}
