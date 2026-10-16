import { ImageResponse } from "next/og";

export const alt = "CODEX AI Consulting, agencia de inteligencia artificial en México";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0a0a0a", color: "#eee9df", fontFamily: "serif" }}>
        <div style={{ display: "flex", fontSize: 40, letterSpacing: 6 }}>CODEX</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.02 }}>Inteligencia artificial que opera tu negocio.</div>
          <div style={{ display: "flex", marginTop: 36, height: 2, width: 420, background: "linear-gradient(90deg,#c9a55a,rgba(201,165,90,0))" }} />
          <div style={{ marginTop: 28, fontSize: 30, color: "#8e887c", fontFamily: "sans-serif" }}>Agentes, plataformas, tiendas, apps y automatización. México.</div>
        </div>
      </div>
    ),
    size,
  );
}
