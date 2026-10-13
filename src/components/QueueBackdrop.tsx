export default function QueueBackdrop({ level }: { level: number }) {
  return <div className={`queue-backdrop pressure-${level}`} data-pressure={level} aria-hidden="true">
    {[0, 1].map(side => <svg key={side} className={`queue-figure queue-figure-${side}`} viewBox="0 0 140 220">
      <g fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="70" cy="38" r="21" />
        <path d="M42 80Q70 64 98 80L115 155L92 161L88 205H51L46 161L26 155Z" />
        <path d="M39 94L26 140L53 146M100 94L114 140L87 146M64 205L63 219M79 205L84 219" fill="none" />
      </g>
    </svg>)}
  </div>;
}
