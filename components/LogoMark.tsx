type LogoMarkProps = {
  className?: string;
  color?: string;
};

export default function LogoMark({ className = "size-8", color = "currentColor" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 42V12h8v22h20v8z" fill={color} />
      <path
        d="M22 30c4-3 8 3 12 0s8 3 10 1"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22 23c4-3 8 3 12 0s8 3 10 1"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
