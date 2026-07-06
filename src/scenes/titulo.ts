import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { desenharCapi } from "../game/desenhos";
import { t } from "../i18n/textos";

export class CenaTitulo implements Cena {
  private tempo = 0;

  constructor(private readonly jogo: Jogo) {}

  atualizar(dt: number): void {
    this.tempo += dt;
  }

  aoTocar(_x: number, _y: number): void {
    this.jogo.irPara({ tela: "equipe" });
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    const gradiente = ctx.createLinearGradient(0, 0, 0, ALTURA);
    gradiente.addColorStop(0, "#16563f");
    gradiente.addColorStop(1, "#0b3d2e");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(LARGURA / 2, 430, 50 + i * 45 + Math.sin(this.tempo * 1.4 + i) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    desenharCapi(ctx, LARGURA / 2, 430, 52, this.tempo);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px system-ui, sans-serif";
    ctx.fillText(t("titulo_jogo"), LARGURA / 2, 170);

    ctx.fillStyle = "#9fdf8f";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(t("titulo_subtitulo"), LARGURA / 2, 210);

    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.tempo * 3);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillText(t("titulo_toque"), LARGURA / 2, 620);
    ctx.globalAlpha = 1;
  }
}
