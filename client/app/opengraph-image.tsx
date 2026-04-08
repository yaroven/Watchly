import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Watchly - Premium Streaming Service";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0b",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            background: "#fff",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "24px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderLeft: "30px solid #000",
              borderTop: "20px solid transparent",
              borderBottom: "20px solid transparent",
              marginLeft: "8px",
            }}
          />
        </div>
        <h1
          style={{
            fontSize: "100px",
            fontWeight: "900",
            color: "#fff",
            margin: 0,
            letterSpacing: "-4px",
          }}
        >
          Watchly
        </h1>
      </div>
      <p
        style={{
          fontSize: "40px",
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.4,
          fontWeight: "500",
        }}
      >
        Stream your favorite movies and series in premium quality. No ads. Just stories.
      </p>
      <div
        style={{
          marginTop: "60px",
          padding: "20px 40px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "100px",
          color: "#fff",
          fontSize: "24px",
          fontWeight: "600",
        }}
      >
        watchly.com
      </div>
    </div>,
    {
      ...size,
    },
  );
}
