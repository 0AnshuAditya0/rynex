export function SectionTag({ index, label, dark = false }: { index: string; label: string; dark?: boolean }) {
  return (
    <div>
      <p className={`font-mono text-xs font-bold tracking-[0.25em] ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
        <span className="text-blue-700">/{index}</span> {label}
      </p>
      <div className="mt-2 h-0.5 w-48 bg-gradient-to-r from-blue-700 from-[48px] to-neutral-200" />
    </div>
  );
}

export function CornerMarks({ light = false }: { light?: boolean }) {
  const pos = ["left-1 top-0.5", "right-1 top-0.5", "bottom-0.5 left-1", "bottom-0.5 right-1"];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {pos.map((p) => (
        <span
          key={p}
          className={`absolute font-mono text-xs leading-none ${light ? "text-blue-400" : "text-blue-600/60"} ${p}`}
        >
          +
        </span>
      ))}
    </span>
  );
}
