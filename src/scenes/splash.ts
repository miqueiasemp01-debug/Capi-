import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Destino, Jogo } from "../game/contexto";
import { carregarImagens, imagem } from "../game/imagens";
import { desenharImagemCobrindo } from "../game/desenhos";
import { tracarRetanguloArredondado } from "../game/ui";
import { t } from "../i18n/textos";
import { informarCarregamentoTikTok } from "../game/plataforma-tiktok";

const EXIBICAO_MINIMA = 0.9;

export class CenaSplash implements Cena {
  private tempo = 0;
  private alvo = 0; // progresso real do carregamento
  private exibido = 0; // progresso suavizado da barra
  private pronto = false;
  private saiu = false;

  constructor(
    private readonly jogo: Jogo,
    private readonly destino: Destino = { tela: "titulo" },
  ) {
    carregarImagens((fracao) => {
      this.alvo = fracao;
      informarCarregamentoTikTok(fracao);
    }).then(() => {
      this.pronto = true;
      informarCarregamentoTikTok(1);
    });
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    this.exibido += (this.alvo - this.exibido) * Math.min(1, dt * 10);
    if (!this.saiu && this.pronto && this.tempo >= EXIBICAO_MINIMA && this.exibido > 0.97) {
      this.saiu = true;
      this.jogo.irPara(this.destino);
    }
  }

  aoTocar(_x: number, _y: number): void {}

  desenhar(ctx: CanvasRenderingContext2D): void {
    const arte = imagem("splash");
    if (arte) {
      desenharImagemCobrindo(ctx, arte, 1 + 0.01 * Math.sin(this.tempo * 0.8));
    } else {
      ctx.fillStyle = "#0b3d2e";
      ctx.fillRect(0, 0, LARGURA, ALTURA);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t("titulo_jogo"), LARGURA / 2, ALTURA * 0.4);
    }

    // faixa escura embaixo pra barra
    const gradiente = ctx.createLinearGradient(0, ALTURA - 190, 0, ALTURA);
    gradiente.addColorStop(0, "rgba(0,0,0,0)");
    gradiente.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, ALTURA - 190, LARGURA, 190);

    const larguraBarra = 240;
    const x = (LARGURA - larguraBarra) / 2;
    const y = ALTURA - 96;

    tracarRetanguloArredondado(ctx, x - 3, y - 3, larguraBarra + 6, 20, 10);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    if (this.exibido > 0.02) {
      tracarRetanguloArredondado(ctx, x, y, larguraBarra * Math.min(1, this.exibido), 14, 7);
      ctx.fillStyle = "#7dd3a0";
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("carregando"), LARGURA / 2, y + 36);
  }
}
