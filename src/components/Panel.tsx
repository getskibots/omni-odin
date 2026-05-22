import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  eyebrow?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, eyebrow, right, children, className = '' }: Props) {
  return (
    <section className={`bg-white rounded-xl shadow-card border border-slate-100 ${className}`}>
      {(title || eyebrow || right) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            {eyebrow && <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{eyebrow}</div>}
            {title && <h3 className="text-base font-semibold text-ink-900 mt-0.5">{title}</h3>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
