import type { CSSProperties } from "react";
import { bottles } from "../data/bottles";
import type { BottleType } from "../game/types";
export function Pattern({ type }: { type: BottleType }) {
  switch (type) {
    case "water":
      return (
        <>
          <path d="m34 72 8 10-8 10-8-10Z" fill="currentColor" />
          <path d="m29 83 5-6" stroke="#fff" strokeWidth="1.6" />
        </>
      );
    case "lemon":
      return (
        <>
          <circle cx="34" cy="82" r="6" fill="currentColor" />
          {[0, 45, 90, 135].map((a) => (
            <path
              key={a}
              d="M34 70v3m0 18v3"
              transform={`rotate(${a} 34 82)`}
              stroke="currentColor"
              strokeWidth="2"
            />
          ))}
        </>
      );
    case "berry":
      return (
        <>
          <path d="m32 75 5-5m-3 5 7-1" stroke="currentColor" strokeWidth="2" />
          <g fill="currentColor">
            <circle cx="30" cy="81" r="5" />
            <circle cx="39" cy="81" r="5" />
            <circle cx="34" cy="89" r="5" />
          </g>
        </>
      );
    case "orange":
      return (
        <>
          <path d="M23 78a11 11 0 0 0 22 0Z" fill="currentColor" />
          <path
            d="M34 79v8m-2-7-5 4m9-4 5 4"
            stroke="#fff7e8"
            strokeWidth="1.5"
          />
        </>
      );
    case "cola":
      return (
        <path
          d="m34 70 3.5 7.5 8.5 1-6.2 5.8 1.7 8.7-7.5-4.3-7.5 4.3 1.7-8.7-6.2-5.8 8.5-1Z"
          fill="currentColor"
        />
      );
    case "mint":
      return (
        <>
          <path d="M25 91Q22 73 43 72Q46 91 25 91" fill="currentColor" />
          <path d="m25 92 13-14" stroke="#fff7e8" strokeWidth="1.5" />
        </>
      );
  }
}
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
  return (
    <svg
      className={`bottle ${className}`}
      style={style}
      viewBox="0 0 68 124"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="34" cy="118" rx="21" ry="3" fill="#273e3020" />
      <path d={b.path} fill={b.color} stroke="#34473e" strokeWidth="1.8" />
      <path
        d="M29 19v15m-5 20v45"
        stroke="#fff"
        strokeOpacity=".33"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x={b.capX}
        y="6"
        width={b.capW}
        height="8"
        rx="2"
        fill={b.light}
        stroke="#34473e"
        strokeWidth="1.8"
      />
      <path
        d={`M${b.capX + 4} 8v4m4-4v4m4-4v4`}
        stroke={b.color}
        strokeWidth="1"
      />
      <rect
        x="19"
        y="66"
        width="30"
        height="33"
        rx="4"
        fill="#fff9e8"
        stroke="#34473e"
        strokeWidth="1"
      />
      <g style={{ color: b.color }}>
        <Pattern type={type} />
      </g>
      <path
        d="M26 105h16"
        stroke="#fff"
        strokeOpacity=".25"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
