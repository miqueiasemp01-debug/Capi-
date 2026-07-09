// Ícones "chunky" de moeda desenhados em canvas: contorno grosso, cores vivas
// e brilho — no padrão dos hits mobile, sem depender de emoji.

function folha(ctx: CanvasRenderingContext2D, comprimento: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-comprimento * 0.34, -comprimento * 0.5, 0, -comprimento);
  ctx.quadraticCurveTo(comprimento * 0.34, -comprimento * 0.5, 0, 0);
  ctx.closePath();
}

export function desenharIconeCapim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tamanho: number,
): void {
  ctx.save();
  ctx.translate(x, y + tamanho * 0.48);
  ctx.lineWidth = Math.max(2, tamanho * 0.16);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1d4d2b";

  for (const [angulo, comprimento, cor] of [
    [-0.6, tamanho * 0.78, "#3f9e4d"],
    [0.6, tamanho * 0.78, "#3f9e4d"],
    [0, tamanho, "#5bc763"],
  ] as const) {
    ctx.save();
    ctx.rotate(angulo);
    folha(ctx, comprimento);
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // brilho
  ctx.beginPath();
  ctx.ellipse(-tamanho * 0.1, -tamanho * 0.62, tamanho * 0.08, tamanho * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();
  ctx.restore();
}

export function desenharIconeGema(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tamanho: number,
): void {
  const p = (px: number, py: number): [number, number] => [x + px * tamanho, y + py * tamanho];
  ctx.save();
  ctx.lineWidth = Math.max(2, tamanho * 0.14);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#27356b";

  ctx.beginPath();
  ctx.moveTo(...p(-0.34, -0.42));
  ctx.lineTo(...p(0.34, -0.42));
  ctx.lineTo(...p(0.52, -0.05));
  ctx.lineTo(...p(0, 0.5));
  ctx.lineTo(...p(-0.52, -0.05));
  ctx.closePath();
  ctx.fillStyle = "#45b8f0";
  ctx.fill();
  ctx.stroke();

  // faceta superior mais clara
  ctx.beginPath();
  ctx.moveTo(...p(-0.34, -0.42));
  ctx.lineTo(...p(0.34, -0.42));
  ctx.lineTo(...p(0.52, -0.05));
  ctx.lineTo(...p(-0.52, -0.05));
  ctx.closePath();
  ctx.fillStyle = "#8fdcff";
  ctx.fill();

  // brilho
  ctx.beginPath();
  ctx.arc(...p(-0.16, -0.2), tamanho * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.restore();
}

// Pílula de recurso (fundo escuro + ícone + número), alinhada pela direita.
export function desenharPilulaRecurso(
  ctx: CanvasRenderingContext2D,
  xDireita: number,
  yCentro: number,
  tipo: "capim" | "gema",
  valor: number | string,
): void {
  const texto = String(valor);
  ctx.save();
  ctx.font = "700 15px system-ui, sans-serif";
  const larguraTexto = ctx.measureText(texto).width;
  const altura = 28;
  const largura = altura + larguraTexto + 12;
  const x = xDireita - largura;

  ctx.beginPath();
  const r = altura / 2;
  ctx.moveTo(x + r, yCentro - r);
  ctx.arcTo(x + largura, yCentro - r, x + largura, yCentro + r, r);
  ctx.arcTo(x + largura, yCentro + r, x, yCentro + r, r);
  ctx.arcTo(x, yCentro + r, x, yCentro - r, r);
  ctx.arcTo(x, yCentro - r, x + largura, yCentro - r, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fill();

  if (tipo === "capim") desenharIconeCapim(ctx, x + 15, yCentro - 1, 15);
  else desenharIconeGema(ctx, x + 15, yCentro, 15);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + altura, yCentro + 1);
  ctx.restore();
}
