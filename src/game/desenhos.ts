import type { GuardiaDef, InimigoDef } from "./tipos";

// Capi meditando: corpo marrom, olhos fechados em paz, aura pulsando.
export function desenharCapi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
  tempo: number,
): void {
  ctx.save();

  const pulso = 1 + 0.06 * Math.sin(tempo * 2);
  ctx.beginPath();
  ctx.arc(x, y, raio * 1.55 * pulso, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 240, 200, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // vitória-régia da Capi
  ctx.beginPath();
  ctx.arc(x, y + raio * 0.55, raio * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = "#2e7d54";
  ctx.fill();

  // corpo
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fillStyle = "#a5714b";
  ctx.fill();

  // orelhas
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + lado * raio * 0.62, y - raio * 0.72, raio * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#8a5a3a";
    ctx.fill();
  }

  // focinho
  ctx.beginPath();
  ctx.ellipse(x, y + raio * 0.38, raio * 0.55, raio * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c08d63";
  ctx.fill();
  ctx.fillStyle = "#5b3d28";
  ctx.beginPath();
  ctx.arc(x - raio * 0.16, y + raio * 0.3, 2.2, 0, Math.PI * 2);
  ctx.arc(x + raio * 0.16, y + raio * 0.3, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // olhos fechados (zen)
  ctx.strokeStyle = "#4a3020";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + lado * raio * 0.34, y - raio * 0.12, raio * 0.17, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

export function desenharGuardia(
  ctx: CanvasRenderingContext2D,
  def: GuardiaDef,
  x: number,
  y: number,
): void {
  ctx.save();

  // vitória-régia
  ctx.beginPath();
  ctx.arc(x, y + 10, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#2e7d54";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.arc(x, y + 10, 26, -0.18 * Math.PI, 0.18 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = "#1d5c3e";
  ctx.fill();

  // corpo da guardiã
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fillStyle = def.cor;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.nome[0], x, y + 1);

  ctx.restore();
}

export function desenharInimigo(
  ctx: CanvasRenderingContext2D,
  def: InimigoDef,
  x: number,
  y: number,
  tempo: number,
  dormindo: boolean,
): void {
  ctx.save();
  if (dormindo) ctx.globalAlpha = 0.55;

  let dx = x;
  let dy = y;
  if (def.comportamento === "tanque" && !dormindo) {
    // o Celular do Surto "vibra"
    dx += Math.sin(tempo * 40) * 1.5;
    dy += Math.cos(tempo * 37) * 1.2;
  }

  if (def.comportamento === "tanque") {
    // retângulo de celular
    const w = def.raio * 1.4;
    const h = def.raio * 2.1;
    ctx.fillStyle = def.cor;
    ctx.fillRect(dx - w / 2, dy - h / 2, w, h);
    ctx.fillStyle = dormindo ? "#3a4450" : "#bfe3ff";
    ctx.fillRect(dx - w / 2 + 3, dy - h / 2 + 4, w - 6, h - 12);
  } else {
    ctx.beginPath();
    ctx.arc(dx, dy, def.raio, 0, Math.PI * 2);
    ctx.fillStyle = def.cor;
    ctx.fill();

    if (def.comportamento === "linha") {
      // cauda de piranha
      ctx.beginPath();
      ctx.moveTo(dx + def.raio * 0.8, dy);
      ctx.lineTo(dx + def.raio * 1.7, dy - def.raio * 0.7);
      ctx.lineTo(dx + def.raio * 1.7, dy + def.raio * 0.7);
      ctx.closePath();
      ctx.fill();
    } else {
      // asas de marimbondo
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const bater = dormindo ? 0 : Math.sin(tempo * 25) * 3;
      ctx.beginPath();
      ctx.ellipse(dx - 4, dy - def.raio - 2 + bater, 7, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(dx + 4, dy - def.raio - 2 - bater, 7, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // olhos: bravos acordado, fechados dormindo
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  if (dormindo) {
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dx + lado * 5 - 3, dy - 3);
      ctx.lineTo(dx + lado * 5 + 3, dy - 3);
      ctx.stroke();
    }
  } else {
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dx + lado * 7, dy - 7);
      ctx.lineTo(dx + lado * 2, dy - 4);
      ctx.stroke();
    }
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(dx - 4, dy - 2, 1.8, 0, Math.PI * 2);
    ctx.arc(dx + 4, dy - 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
