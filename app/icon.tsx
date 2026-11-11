import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#061922",
          borderRadius: 6,
        }}
      >
        <svg
          viewBox="0 0 620 528"
          width="26"
          height="22"
        >
          <path d="M41 34H171V366H503V496H41V34Z" fill="#5ED3DE" />
          <path
            d="M243 172C278 145 300 128 332 128C380 128 415 171 467 171C504 171 528 152 560 140"
            stroke="#387984"
            strokeWidth="54"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M243 275C278 248 300 231 332 231C380 231 415 274 467 274C504 274 528 255 560 243"
            stroke="#4BA6B1"
            strokeWidth="54"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
