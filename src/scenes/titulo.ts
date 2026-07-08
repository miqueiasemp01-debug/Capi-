import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { desenharCapi, desenharImagemCobrindo } from "../game/desenhos";
import { imagem } from "../game/imagens";
import { t } from "../i18n/textos";

export class CenaTitulo implements Cena {
  private tempo = 0;
  private fundoFallback: CanvasGradient | null = null;

  constructor(private readonly jogo: Jogo) {}

  atualizar(dt: number): void {
    this.tempo += dt;
  }

  aoTocar(_x: number, _y: number): void {
    this.jogo.irPara({ tela: "equipe" });
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    const arte = imagem("splash");
    if (arte) {
      desenharImagemCobrindo(ctx, arte, 1.02 + 0.012 * Math.sin(this.tempo * 0.7));
      // escurece topo e base pra legibilidade
      const sombra = ctx.createLinearGradient(0, 0, 0, ALTURA);
      sombra.addColorStop(0, "rgba(20,10,30,0.5)");
      sombra.addColorStop(0.3, "rgba(0,0,0,0)");
      sombra.addColorStop(0.75, "rgba(0,0,0,0)");
      sombra.addColorStop(1, "rgba(10,20,25,0.55)");
      ctx.fillStyle = sombra;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    } else {
      if (!this.fundoFallback) {
        this.fundoFallback = ctx.createLinearGradient(0, 0, 0, ALTURA);
        this.fundoFallback.addColorStop(0, "#16563f");
        this.fundoFallback.addColorStop(1, "#0b3d2e");
      }
      ctx.fillStyle = this.fundoFallback;
      ctx.fillRect(0, 0, LARGURA, ALTURA);

      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(LARGURA / 2, 430, 50 + i * 45 + Math.sin(this.tempo * 1.4 + i) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      desenharCapi(ctx, LARGURA / 2, 430, 52, this.tempo);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // título com sombra dura (padrão mobile)
    ctx.font = "800 36px system-ui, sans-serif";
    ctx.fillStyle = "rgba(40, 20, 5, 0.85)";
    ctx.fillText(t("titulo_jogo"), LARGURA / 2, 143, LARGURA - 28);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(t("titulo_jogo"), LARGURA / 2, 139, LARGURA - 28);

    ctx.font = "700 19px system-ui, sans-serif";
    ctx.fillStyle = "rgba(40, 20, 5, 0.85)";
    ctx.fillText(t("titulo_subtitulo"), LARGURA / 2, 183);
    ctx.fillStyle = "#aef29b";
    ctx.fillText(t("titulo_subtitulo"), LARGURA / 2, 180);

    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(this.tempo * 3);
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(t("titulo_toque"), LARGURA / 2, ALTURA - 110);
    ctx.globalAlpha = 1;
  }
}
