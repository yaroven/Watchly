import { TitleService } from "@/app/services/title.service";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Watchly Content";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const { id } = params;

  let titleName = "Movie";
  let posterUrl = "";

  try {
    const title = await TitleService.getById(id);
    titleName = title.name;
    posterUrl = title.posterUrl || "";
  } catch (err) {
    console.error("Failed to fetch title for OG image", err);
  }

  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0b",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "60px",
      }}
    >
      {/* Left Side: Text Details */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#fff",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "16px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderLeft: "15px solid #000",
                borderTop: "10px solid transparent",
                borderBottom: "10px solid transparent",
                marginLeft: "4px",
              }}
            />
          </div>
          <span style={{ color: "#fff", fontSize: "32px", fontWeight: "700" }}>Watchly</span>
        </div>

        <h1
          style={{
            fontSize: "80px",
            fontWeight: "900",
            color: "#fff",
            margin: 0,
            lineHeight: 1.1,
            marginBottom: "24px",
          }}
        >
          {titleName}
        </h1>
        <p
          style={{
            fontSize: "32px",
            color: "#a1a1aa",
            margin: 0,
          }}
        >
          Now Streaming on Watchly
        </p>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: "16px",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "100px",
              color: "#fff",
              fontSize: "20px",
            }}
          >
            4K Ultra HD
          </div>
          <div
            style={{
              padding: "12px 24px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "100px",
              color: "#fff",
              fontSize: "20px",
            }}
          >
            Dolby Atmos
          </div>
        </div>
      </div>

      {/* Right Side: Poster Preview (Mockup) */}
      {posterUrl && (
        <div
          style={{
            width: "350px",
            height: "500px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          <img
            src={posterUrl}
            alt={titleName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}
    </div>,
    {
      ...size,
    },
  );
}
