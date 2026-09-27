/** Shared abstract geometric backdrop (light blue-line style).
 * Decorative only — place inside a relative parent.
 */
export default function AbstractBg() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 700">
        <g stroke="rgba(29,78,216,0.1)" strokeWidth="1">
          <line x1="0" y1="90" x2="1440" y2="90" />
          <line x1="0" y1="610" x2="1440" y2="610" />
          <line x1="140" y1="0" x2="140" y2="700" />
          <line x1="1300" y1="0" x2="1300" y2="700" />
          <line x1="0" y1="700" x2="1440" y2="60" />
        </g>
        <circle cx="1220" cy="140" r="120" fill="none" stroke="rgba(29,78,216,0.16)" strokeWidth="1.5" />
        <circle cx="220" cy="560" r="150" fill="none" stroke="rgba(29,78,216,0.12)" strokeWidth="1" strokeDasharray="4 6" />
      </svg>
      <div className="absolute right-[9%] top-[14%] h-10 w-10 bg-blue-600/70" />
      <div className="absolute left-[6%] bottom-[16%] h-7 w-7 bg-blue-700/60" />
      <div className="absolute left-[14%] top-[20%] h-16 w-16 bg-blue-500/10" />
      <div className="absolute right-[18%] bottom-[12%] h-20 w-20 bg-blue-500/10" />
      <div
        className="absolute left-[4%] top-[38%] h-24 w-24"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.35) 1.2px, transparent 1.2px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        className="absolute right-[5%] top-[52%] h-24 w-24"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.3) 1.2px, transparent 1.2px)",
          backgroundSize: "14px 14px",
        }}
      />
      <span className="absolute left-[30%] top-[12%] font-mono text-xl leading-none text-blue-500/60">+</span>
      <span className="absolute right-[33%] top-[30%] font-mono text-xl leading-none text-blue-500/60">+</span>
      <span className="absolute left-[44%] bottom-[10%] font-mono text-xl leading-none text-blue-500/60">+</span>
    </div>
  );
}
