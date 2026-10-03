/**
 * Inline SVG icons.
 *
 * Emoji are not icons here. They render at the font's whim, inherit colour badly, and a
 * screen reader announces them as prose. Everything below is `currentColor` at viewBox 24 so
 * it inherits whatever the surrounding control already sets.
 */

export type IconName = "mic" | "stop" | "send";

/** Drawn as outlines rather than fills so a 1.75 stroke reads the same at every size. */
const PATHS: Record<IconName, readonly string[]> = {
  mic: [
    "M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3z",
    "M5.5 11a6.5 6.5 0 0 0 13 0",
    "M12 17.5v3",
  ],
  stop: ["M8 8h8v8H8z"],
  send: ["M4.5 12 20 4.5l-4 15.5-4.5-6-7-2z"],
};

/** Labels are mandatory: an icon-only control has no text for assistive tech to announce. */
const LABEL: Record<IconName, string> = {
  mic: "Rekam suara",
  stop: "Hentikan rekaman",
  send: "Kirim pesan",
};

export interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-5"}
      role="img"
      aria-label={LABEL[name]}
      aria-hidden={false}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
