import { useId, type CSSProperties } from "react";
import { bottles } from "../data/bottles";
import { bottlePackaging, packagingText } from "../i18n";
import type { BottleType } from "../game/types";

/** Large, different pictograms keep the six types readable without color. */
export function Pattern({ type }: { type: BottleType }) {
  switch (type) {
    case "water":
      return (
        <>
          <circle cx="29" cy="78" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="39" cy="75" r="2.3" fill="currentColor" />
          <circle cx="38" cy="84" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M24 89Q29 85 34 89T44 89" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "lemon":
      return (
        <>
          <path d="M23 84Q22 76 30 73Q39 70 44 78L46 80L43 82Q42 90 33 91Q26 91 24 87Z" fill="currentColor" />
          <path d="m32 79 6-3m-3 6 6-1m-8 5 4 2m-7-10-1 7" stroke={bottles.lemon.labelFill} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "currant":
      return (
        <>
          <path d="M34 74V85m0-7-6 2m6 1 6 2m-6 2-5 3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M34 75Q33 69 42 71Q40 77 34 75" fill="currentColor" />
          <g fill="currentColor">
            <circle cx="27" cy="80" r="3.4" />
            <circle cx="40" cy="83" r="3.4" />
            <circle cx="28" cy="88" r="3.4" />
            <circle cx="35" cy="91" r="3.4" />
          </g>
        </>
      );
    case "apple":
      return (
        <>
          <path d="M34 78C23 71 20 84 27 91Q30 94 34 91Q39 94 43 87C49 76 40 73 34 78Z" fill="currentColor" />
          <path d="M34 78V71m0 4q1-7 8-5q-1 6-8 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M28 80q-3 2-1 6" stroke={bottles.apple.labelFill} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "malt":
      return (
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 93V74m-7 18-3-14m17 14 3-14" />
          <path d="M34 81q-7-1-6-6q6 1 6 6Zm0 6q-7-1-6-6q6 1 6 6Zm0-6q7-1 6-6q-6 1-6 6Zm0 6q7-1 6-6q-6 1-6 6Z" fill="currentColor" strokeWidth=".6" />
          <path d="m24 81-3-4m5 10-4-4m22-2 3-4m-5 10 4-4" />
        </g>
      );
    case "kola":
      return (
        <>
          <path d="M24 82a10 10 0 0 0 20 0Z" fill="currentColor" />
          <path d="M34 83v6m-2-6-4 3m8-3 4 3" stroke={bottles.kola.labelFill} strokeWidth="1.5" />
          <path d="m29 73 10 5m-1-5 2 6-6-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

const labelPaths = {
  oval: "M34 63C55 63 55 103 34 103C13 103 13 63 34 63Z",
  ticket: "M20 64H48V103H20Z",
  round: "M34 61Q52 61 52 78V91Q52 105 34 105Q16 105 16 91V78Q16 61 34 61Z",
  shield: "M16 66Q34 61 52 66V95Q46 104 34 107Q22 104 16 95Z",
  diagonal: "M19 67L49 62V99L19 104Z",
};

export default function Bottle({
  type,
  className = "",
  style,
}: {
  type: BottleType;
  className?: string;
  style?: CSSProperties;
}) {
  const b = bottles[type];
  const id = useId().replace(/:/g, "");
  const print = bottlePackaging[type];
  const neckY = b.capY + 16;
  return (
    <svg
      className={`bottle bottle-${type} ${className}`}
      style={style}
      viewBox="0 0 68 124"
      fill="none"
      aria-hidden="true"
      data-bottle-type={type}
    >
      <defs>
        <linearGradient id={`${id}-glass`} x1="13" y1="60" x2="55" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor={b.shade} />
          <stop offset=".22" stopColor={b.glass} />
          <stop offset=".65" stopColor={b.glass} />
          <stop offset="1" stopColor={b.shade} />
        </linearGradient>
        <clipPath id={`${id}-body`}><path d={b.path} /></clipPath>
      </defs>
      <ellipse cx="34" cy="119" rx="21" ry="2.6" fill="#36473419" />
      <path d={b.path} fill={`url(#${id}-glass)`} stroke={b.edge} strokeWidth="1.6" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-body)`}>
        <path d="M15 111Q34 117 54 111M15 107Q34 112 54 107" stroke={b.edge} strokeOpacity=".35" strokeWidth="1.3" />
        <path d={b.shine} stroke="#fffdf1" strokeOpacity=".62" strokeWidth="2.6" strokeLinecap="round" />
        {type === "water" && (
          <g fill={b.edge} fillOpacity=".42">
            {[45, 51, 57].flatMap((y, row) => [24, 31, 38, 45].map((x) => (
              <circle key={`${x}-${y}`} cx={x + (row % 2 ? -1 : 0)} cy={y} r="1.2" />
            )))}
          </g>
        )}
        {type === "currant" && <path d="M16 54H52M16 58H52" stroke={b.edge} strokeOpacity=".25" strokeWidth="1.5" />}
        <rect x="23" y={neckY} width="22" height={type === "kola" ? 15 : 10} rx="1" fill={b.color} />
        <path d={`M27 ${neckY + 3}h14M27 ${neckY + 7}h14`} stroke={b.light} strokeOpacity=".65" strokeWidth=".7" />
      </g>
      {b.crown ? (
        <path d={`M${b.capX} ${b.capY + 7}l1-5 2 1 2-2h${b.capW - 10}l2 2 2-1 1 5Z`} fill={b.color} stroke={b.edge} strokeWidth="1.3" strokeLinejoin="round" />
      ) : (
        <g>
          <rect x={b.capX} y={b.capY} width={b.capW} height="8" rx="1.8" fill={b.light} stroke={b.edge} strokeWidth="1.3" />
          <path d={`M${b.capX + 2} ${b.capY + 3}h${b.capW - 4}m-${b.capW - 4} 2h${b.capW - 4}`} stroke={b.color} strokeOpacity=".6" strokeWidth=".9" />
        </g>
      )}
      <path d={labelPaths[b.label]} fill={b.labelFill} stroke={b.edge} strokeWidth=".8" />
      <g fill={b.labelInk} textAnchor="middle" fontFamily="'Avenir Next', 'Segoe UI', sans-serif">
        <text x="34" y="70" fontSize="3" fontWeight="650" letterSpacing=".55">{packagingText.shopName}</text>
        <g style={{ color: b.labelInk }}><Pattern type={type} /></g>
        <text x="34" y="99" fontSize={type === "kola" || type === "currant" ? "4" : "4.5"} fontWeight="800" letterSpacing=".35">{print.label}</text>
      </g>
      <text x="34" y="111" fill={b.edge} fontSize="3.1" fontWeight="700" textAnchor="middle" letterSpacing=".3">{print.volume} · {packagingText.returnable}</text>
    </svg>
  );
}
