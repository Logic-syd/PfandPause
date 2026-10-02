export default function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    undo: (
      <>
        <path
          d="M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12"
          transform="translate(0 -2)"
        />
      </>
    ),
    restart: (
      <>
        <path d="M4 9a8 8 0 1 1 0 7M4 3v6h6" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <circle cx="15" cy="17" r="3" fill="currentColor" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    leaf: (
      <>
        <path d="M5 19Q1 5 20 4Q22 20 5 19Zm0 0L15 9" />
      </>
    ),
    grid: (
      <>
        {[4, 14].flatMap((x) =>
          [4, 14].map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" />
          )),
        )}
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    sound: (
      <>
        <path d="m4 9 4 0 5-4v14l-5-4H4Zm13-1a6 6 0 0 1 0 8" />
      </>
    ),
    mute: (
      <>
        <path d="m4 9 4 0 5-4v14l-5-4H4Zm13 0 5 6m-5 0 5-6" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="10" width="12" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Zm3 5h6m-6 4h6m-6 4h3" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8M6 9v12h12V9m-8 12v-7h4v7" />
      </>
    ),
    heart: <path d="M12 20 4 12C-2 5 8 0 12 7c4-7 14-2 8 5Z" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    sparkle: (
      <>
        <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Zm7 0v4m-2-2h4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.leaf}
    </svg>
  );
}
