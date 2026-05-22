interface Props {
  title: string;
}

export default function Placeholder({ title }: Props) {
  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">Coming soon.</p>
    </div>
  );
}
