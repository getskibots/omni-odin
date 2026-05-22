import { jacksonHole } from '../data/parent';

export default function TopBar() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="text-sm text-slate-500">
        <span className="text-botscrew-500 hover:underline cursor-pointer">Home</span>
      </div>
      <div className="text-base font-semibold text-ink-900">{jacksonHole.name}</div>
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 text-sm rounded-md bg-action-500 hover:bg-action-600 text-white">
          Test AI chat
        </button>
        <button className="px-3 py-1.5 text-sm rounded-md bg-action-500 hover:bg-action-600 text-white">
          Test widget
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="h-7 w-7 rounded-full bg-slate-300" />
          <span className="text-sm text-slate-700">Brandon Quinn</span>
        </div>
      </div>
    </header>
  );
}
