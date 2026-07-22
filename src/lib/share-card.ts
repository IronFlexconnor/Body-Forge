// Branded PR share card: renders a 1080×1350 (4:5, Instagram-friendly) canvas
// and shares it via the Web Share API, falling back to a download.
// Every shared card is organic marketing — logo, result, and app name travel together.

export type PRCardData = {
  exercise: string;
  weight: number;
  unit: string;
  reps: number;
  /** e.g. "weight" | "e1rm" */
  kind?: string;
  userName?: string | null;
};

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Same geometry as BrandMark, scaled: s = width of the 512 grid
  const k = s / 512;
  const grad = ctx.createLinearGradient(x, y, x + s, y + s);
  grad.addColorStop(0, "#59E3D2");
  grad.addColorStop(1, "#0FA5A0");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // bar with spike
  ctx.strokeStyle = grad;
  ctx.lineWidth = 34 * k;
  ctx.beginPath();
  ctx.moveTo(x + 120 * k, y + 322 * k);
  ctx.lineTo(x + 204 * k, y + 322 * k);
  ctx.lineTo(x + 256 * k, y + 196 * k);
  ctx.lineTo(x + 308 * k, y + 322 * k);
  ctx.lineTo(x + 392 * k, y + 322 * k);
  ctx.stroke();
  // plates
  ctx.fillStyle = grad;
  const plate = (px: number) => {
    ctx.beginPath();
    ctx.roundRect(x + px * k, y + 240 * k, 40 * k, 164 * k, 20 * k);
    ctx.fill();
  };
  plate(76);
  plate(396);
  // spark
  ctx.fillStyle = "#9BEFE3";
  ctx.beginPath();
  ctx.arc(x + 256 * k, y + 150 * k, 14 * k, 0, Math.PI * 2);
  ctx.fill();
}

export async function sharePRCard(data: PRCardData): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "failed";

    // Background: deep navy with teal glows
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#101725");
    bg.addColorStop(0.55, "#131E30");
    bg.addColorStop(1, "#0E2E38");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = (cx: number, cy: number, r: number, alpha: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(43, 212, 196, ${alpha})`);
      g.addColorStop(1, "rgba(43, 212, 196, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };
    glow(W * 0.85, H * 0.12, 420, 0.22);
    glow(W * 0.1, H * 0.92, 380, 0.16);

    const display = '800 %s "Bricolage Grotesque", "Inter", system-ui, sans-serif';
    const sans = '600 %s "Inter", system-ui, sans-serif';
    const font = (tpl: string, px: number) => tpl.replace("%s", `${px}px`);

    // Header: mark + wordmark
    drawMark(ctx, 72, 48, 132);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = font(display, 56);
    ctx.textBaseline = "middle";
    ctx.fillText("Body Forge", 220, 114);
    ctx.fillStyle = "#59E3D2";
    ctx.font = font(sans, 30);
    ctx.fillText("AI COACH", 222, 160);

    // PR banner
    ctx.fillStyle = "#59E3D2";
    ctx.font = font(sans, 40);
    ctx.fillText(data.kind === "e1rm" ? "NEW REP PR" : "NEW PR", 84, 420);

    // Exercise name (wrap at ~2 lines)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = font(display, 92);
    const words = data.exercise.split(" ");
    let line = "";
    let ly = 530;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W - 168 && line) {
        ctx.fillText(line, 84, ly);
        line = w;
        ly += 104;
      } else line = test;
    }
    ctx.fillText(line, 84, ly);

    // The number — hero of the card
    ctx.font = font(display, 220);
    const grad = ctx.createLinearGradient(84, ly + 120, 84, ly + 340);
    grad.addColorStop(0, "#7BEDE0");
    grad.addColorStop(1, "#1CB3A8");
    ctx.fillStyle = grad;
    ctx.fillText(`${data.weight}${data.unit}`, 84, ly + 250);
    ctx.fillStyle = "#B9C6D4";
    ctx.font = font(sans, 56);
    ctx.fillText(`× ${data.reps} reps`, 96, ly + 400);

    // Footer
    ctx.fillStyle = "#7B8AA0";
    ctx.font = font(sans, 32);
    const when = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    ctx.fillText(`${data.userName ? data.userName + " · " : ""}${when}`, 84, H - 140);
    ctx.fillStyle = "#59E3D2";
    ctx.fillText("Forged with my AI coach", 84, H - 84);

    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return "failed";
    const file = new File([blob], "body-forge-pr.png", { type: "image/png" });

    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "New PR — Body Forge" });
        return "shared";
      } catch {
        // user cancelled or share failed — fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "body-forge-pr.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
