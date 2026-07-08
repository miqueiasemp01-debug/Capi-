import { LARGURA } from "./motor";
import { tracarRetanguloArredondado } from "./ui";

// Toasts de tutorial: balão escuro arredondado, um por vez, fila global.
interface Toast {
  texto: string;
  inicio: number;
}

const DURACAO = 3.4;
const fila: Toast[] = [];

export function mostrarToast(texto: string): void {
  fila.push({ texto, inicio: -1 });
}

export function desenharToasts(ctx: CanvasRenderingContext2D, yCentro: number): void {
  const toast = fila[0];
  if (!toast) return;

  const agora = performance.now() / 1000;
  if (toast.inicio < 0) toast.inicio = agora;
  const idade = agora - toast.inicio;
  if (idade > DURACAO) {
    fila.shift();
    return;
  }

  const alfa = Math.min(1, idade / 0.25, (DURACAO - idade) / 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alfa);
  ctx.font = "600 14px system-ui, sans-serif";
  const larguraTexto = Math.min(ctx.measureText(toast.texto).width, LARGURA - 60);
  const largura = larguraTexto + 34;
  const altura = 40;
  const x = (LARGURA - largura) / 2;
  const deslize = (1 - Math.min(1, idade / 0.25)) * 10;

  tracarRetanguloArredondado(ctx, x, yCentro - altura / 2 + deslize, largura, altura, altura / 2);
  ctx.fillStyle = "rgba(18, 24, 28, 0.92)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(toast.texto, LARGURA / 2, yCentro + 1 + deslize, LARGURA - 60);
  ctx.restore();
}
