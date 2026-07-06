export interface Botao {
  x: number;
  y: number;
  w: number;
  h: number;
  acao: string;
}

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

export interface EstiloBotao {
  cor: string;
  corTexto?: string;
  desativado?: boolean;
  tamanhoFonte?: number;
}

export function desenharBotao(
  ctx: CanvasRenderingContext2D,
  b: Botao,
  rotulo: string,
  estilo: EstiloBotao,
): void {
  const { cor, corTexto = "#ffffff", desativado = false, tamanhoFonte = 17 } = estilo;
  ctx.save();
  ctx.globalAlpha = desativado ? 0.45 : 1;
  tracarRetanguloArredondado(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h / 2));
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.fillStyle = corTexto;
  ctx.font = `700 ${tamanhoFonte}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(rotulo, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}
