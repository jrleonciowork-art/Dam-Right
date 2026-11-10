import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14202B",
          borderRadius: 36,
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width="130"
          height="130"
        >
          <path d="M10 39V11h7.5v20.5H37V39z" fill="#5ED3DE" />
          <path
            d="M21 28c3.8-2.8 7.6 2.8 11.4 0s7.6 2.8 9.6 1"
            stroke="#5ED3DE"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M21 21c3.8-2.8 7.6 2.8 11.4 0s7.6 2.8 9.6 1"
            stroke="#5ED3DE"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
