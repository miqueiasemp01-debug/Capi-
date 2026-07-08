import type { GuardiaDef, InimigoDef } from "./tipos";
import { LARGURA, ALTURA } from "./motor";
import { imagem } from "./imagens";

// Desenha uma imagem cobrindo a tela inteira (tipo background-size: cover),
// com zoom e deslocamento opcionais pra parallax.
export function desenharImagemCobrindo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  zoom = 1,
  dx = 0,
  dy = 0,
): void {
  const escala = Math.max(LARGURA / img.naturalWidth, ALTURA / img.naturalHeight) * zoom;
  const w = img.naturalWidth * escala;
  const h = img.naturalHeight * escala;
  ctx.drawImage(img, (LARGURA - w) / 2 + dx, (ALTURA - h) / 2 + dy, w, h);
}

function sombraNaAgua(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raioX: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, raioX, raioX * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8, 40, 46, 0.3)";
  ctx.fill();
  ctx.restore();
}

// Capi meditando: sprite com respiração (squash sutil), ou procedural.
export function desenharCapi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
  tempo: number,
): void {
  const pulso = 1 + 0.06 * Math.sin(tempo * 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, raio * 1.55 * pulso, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 240, 200, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const sprite = imagem("capi");
  if (sprite) {
    const respiracao = 1 + 0.028 * Math.sin(tempo * 1.8);
    const altura = raio * 3.1;
    const largura = altura * (sprite.naturalWidth / sprite.naturalHeight);
    sombraNaAgua(ctx, x, y + raio * 1.15, raio * 1.25);
    ctx.save();
    ctx.translate(x, y + raio * 1.3); // âncora nos pés
    ctx.scale(2 - respiracao, respiracao);
    ctx.drawImage(sprite, -largura / 2, -altura, largura, altura);
    ctx.restore();
    return;
  }

  // ---- fallback procedural (Sessão 1) ----
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y + raio * 0.55, raio * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = "#2e7d54";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fillStyle = "#a5714b";
  ctx.fill();

  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + lado * raio * 0.62, y - raio * 0.72, raio * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#8a5a3a";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(x, y + raio * 0.38, raio * 0.55, raio * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c08d63";
  ctx.fill();
  ctx.fillStyle = "#5b3d28";
  ctx.beginPath();
  ctx.arc(x - raio * 0.16, y + raio * 0.3, 2.2, 0, Math.PI * 2);
  ctx.arc(x + raio * 0.16, y + raio * 0.3, 2.2, 0, Math.PI * 2);
  ctx.fill();

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

let contadorBob = 0;
const fasesBob = new Map<string, number>();

function faseDoBob(id: string): number {
  let fase = fasesBob.get(id);
  if (fase === undefined) {
    fase = contadorBob++ * 2.1;
    fasesBob.set(id, fase);
  }
  return fase;
}

// Guardiã: sprite balançando na água, ou procedural na vitória-régia.
export function desenharGuardia(
  ctx: CanvasRenderingContext2D,
  def: GuardiaDef,
  x: number,
  y: number,
  tempo: number,
): void {
  const sprite = imagem(def.id);
  if (sprite) {
    const bob = Math.sin(tempo * 2 + faseDoBob(def.id)) * 2;
    const altura = 58;
    const largura = altura * (sprite.naturalWidth / sprite.naturalHeight);
    sombraNaAgua(ctx, x, y + 26, 24);
    ctx.drawImage(sprite, x - largura / 2, y - altura + 22 + bob, largura, altura);
    return;
  }

  // ---- fallback procedural (Sessão 1) ----
  ctx.save();
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

// Inimigo: sprite com squash & stretch ao apanhar, virado pra direção do
// movimento; sem sprite, cai no desenho procedural da Sessão 1.
export function desenharInimigo(
  ctx: CanvasRenderingContext2D,
  def: InimigoDef,
  x: number,
  y: number,
  tempo: number,
  dormindo: boolean,
  atingidoHa: number,
  indoParaDireita: boolean,
): void {
  const sprite = imagem(def.id);
  if (sprite) {
    let escalaX = 1;
    let escalaY = 1;
    if (atingidoHa >= 0 && atingidoHa < 0.25) {
      const k = Math.sin(atingidoHa * 26) * 0.16 * (1 - atingidoHa / 0.25);
      escalaX = 1 + k;
      escalaY = 1 - k;
    }
    const altura = def.raio * 2.7;
    const largura = altura * (sprite.naturalWidth / sprite.naturalHeight);
    ctx.save();
    ctx.translate(x, y);
    if (dormindo) {
      ctx.globalAlpha = 0.55;
      ctx.rotate(0.18);
    }
    // a arte olha pra esquerda: espelha quando nada pra direita
    ctx.scale(indoParaDireita ? -escalaX : escalaX, escalaY);
    ctx.drawImage(sprite, -largura / 2, -altura / 2, largura, altura);
    ctx.restore();
    return;
  }

  // ---- fallback procedural (Sessão 1) ----
  ctx.save();
  if (dormindo) ctx.globalAlpha = 0.55;

  let dx = x;
  let dy = y;
  if (def.comportamento === "tanque" && !dormindo) {
    dx += Math.sin(tempo * 40) * 1.5;
    dy += Math.cos(tempo * 37) * 1.2;
  }

  if (def.comportamento === "tanque") {
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
      ctx.beginPath();
      ctx.moveTo(dx + def.raio * 0.8, dy);
      ctx.lineTo(dx + def.raio * 1.7, dy - def.raio * 0.7);
      ctx.lineTo(dx + def.raio * 1.7, dy + def.raio * 0.7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const bater = dormindo ? 0 : Math.sin(tempo * 25) * 3;
      ctx.beginPath();
      ctx.ellipse(dx - 4, dy - def.raio - 2 + bater, 7, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(dx + 4, dy - def.raio - 2 - bater, 7, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
