import type { Raridade } from "./tipos";
import { desenharIconeCapim, desenharIconeGema } from "./icones";

export interface Botao {
  x: number;
  y: number;
  w: number;
  h: number;
  acao: string;
}

export const CORES_RARIDADE: Record<Raridade, string> = {
  comum: "#8fa3ad",
  rara: "#4da3e8",
  epica: "#b06fe0",
  lendaria: "#f2b53c",
};

export function dentroDoBotao(b: Botao, x: number, y: number): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function tracarRetanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function escurecer(cor: string, fator: number): string {
  const n = parseInt(cor.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * fator);
  const g = Math.round(((n >> 8) & 255) * fator);
  const b = Math.round((n & 255) * fator);
  return `rgb(${r},${g},${b})`;
}

// ---- animação de apertar: registrada quando a ação executa, o desenho
// afunda o botão por ~130ms no quadro seguinte.
const pressoes = new Map<string, number>();

export function registrarPressao(acao: string): void {
  pressoes.set(acao, performance.now());
}

function afundamento(acao: string, profundidade: number): number {
  const quando = pressoes.get(acao);
  if (quando === undefined) return 0;
  return performance.now() - quando < 130 ? profundidade : 0;
}

export interface EstiloBotao {
  cor: string;
  corTexto?: string;
  desativado?: boolean;
  tamanhoFonte?: number;
  icone?: "capim" | "gema";
}

// Botão "gordo": sombra dura embaixo, brilho no topo, afunda ao apertar.
export function desenharBotao(
  ctx: CanvasRenderingContext2D,
  b: Botao,
  rotulo: string,
  estilo: EstiloBotao,
): void {
  const { cor, corTexto = "#ffffff", desativado = false, tamanhoFonte = 17, icone } = estilo;
  const profundidade = Math.min(5, Math.max(3, b.h * 0.09));
  const afundo = desativado ? 0 : afundamento(b.acao, profundidade - 1);
  const raio = Math.min(16, b.h / 2 - 1);

  ctx.save();
  ctx.globalAlpha = desativado ? 0.5 : 1;

  // sombra dura
  tracarRetanguloArredondado(ctx, b.x, b.y + profundidade, b.w, b.h - profundidade, raio);
  ctx.fillStyle = escurecer(cor, 0.5);
  ctx.fill();

  // corpo
  tracarRetanguloArredondado(ctx, b.x, b.y + afundo, b.w, b.h - profundidade, raio);
  ctx.fillStyle = cor;
  ctx.fill();

  // brilho no topo
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(b.x, b.y + afundo, b.w, (b.h - profundidade) * 0.42);
  ctx.restore();

  ctx.fillStyle = corTexto;
  ctx.font = `800 ${tamanhoFonte}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const yTexto = b.y + afundo + (b.h - profundidade) / 2 + 1;
  if (icone) {
    const larguraTexto = ctx.measureText(rotulo).width;
    const tamanhoIcone = tamanhoFonte * 0.95;
    const deslocamento = (tamanhoIcone + 6) / 2;
    ctx.fillText(rotulo, b.x + b.w / 2 - deslocamento, yTexto);
    const xIcone = b.x + b.w / 2 - deslocamento + larguraTexto / 2 + 6 + tamanhoIcone / 2;
    if (icone === "capim") desenharIconeCapim(ctx, xIcone, yTexto - 1, tamanhoIcone);
    else desenharIconeGema(ctx, xIcone, yTexto, tamanhoIcone);
  } else {
    ctx.fillText(rotulo, b.x + b.w / 2, yTexto);
  }
  ctx.restore();
}

// Retrato quadrado com moldura arredondada colorida (raridade) e sombra dura.
export function desenharRetrato(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  corMoldura: string,
  corFallback: string,
  inicial: string,
  x: number,
  y: number,
  tamanho: number,
): void {
  const raio = tamanho * 0.22;
  const borda = Math.max(3, tamanho * 0.055);

  ctx.save();
  tracarRetanguloArredondado(ctx, x, y + 3, tamanho, tamanho, raio);
  ctx.fillStyle = escurecer(corMoldura, 0.45);
  ctx.fill();

  tracarRetanguloArredondado(ctx, x, y, tamanho, tamanho, raio);
  ctx.fillStyle = corMoldura;
  ctx.fill();

  const xi = x + borda;
  const yi = y + borda;
  const ti = tamanho - borda * 2;
  tracarRetanguloArredondado(ctx, xi, yi, ti, ti, raio * 0.7);
  ctx.save();
  ctx.clip();
  if (img) {
    ctx.fillStyle = "#1c3a2e";
    ctx.fillRect(xi, yi, ti, ti);
    ctx.drawImage(img, xi, yi, ti, ti);
  } else {
    ctx.fillStyle = corFallback;
    ctx.fillRect(xi, yi, ti, ti);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(ti * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(inicial, xi + ti / 2, yi + ti / 2 + 1);
  }
  ctx.restore();
  ctx.restore();
}

// Badge vermelho pulsando ("dá pra evoluir!").
export function desenharBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tempo: number,
): void {
  const raio = 9 * (1 + 0.14 * Math.sin(tempo * 6));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fillStyle = "#e0463d";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", x, y + 1);
  ctx.restore();
}
