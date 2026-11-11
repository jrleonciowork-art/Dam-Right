type LogoMarkProps = {
  className?: string;
  color?: string;
  withBackground?: boolean;
};

export default function LogoMark({
  className = "size-8",
  color = "#5ED3DE",
  withBackground = false,
}: LogoMarkProps) {
  const wallFill = color === "currentColor" ? "currentColor" : color || "#5ED3DE";

  return (
    <svg
      viewBox="0 0 620 528"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {withBackground && (
        <rect width="620" height="528" rx="56" fill="#061922" />
      )}
      {/* L Flood Wall */}
      <path
        d="M41 34H171V366H503V496H41V34Z"
        fill={wallFill}
      />
      {/* Top Wave */}
      <path
        d="M243 172C278 145 300 128 332 128C380 128 415 171 467 171C504 171 528 152 560 140"
        stroke="#387984"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Wave */}
      <path
        d="M243 275C278 248 300 231 332 231C380 231 415 274 467 274C504 274 528 255 560 243"
        stroke="#4BA6B1"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
