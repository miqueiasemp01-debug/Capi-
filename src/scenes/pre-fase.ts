import { LARGURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { GUARDIAS } from "../game/conteudo";
import { guardiasAtivas } from "../game/evento";
import { nivelDaGuardia, poderDaEquipe } from "../game/economia";
import { evolucaoDaGuardia } from "../game/fragmentos";
import { gerarFase } from "../game/procedural";
import { imagem } from "../game/imagens";
import { desenharFundoPantanal } from "../game/desenhos";
import { desenharPilulaRecurso } from "../game/icones";
import {
  CORES_RARIDADE,
  desenharBotao,
  desenharPainelVidro,
  desenharRetrato,
  dentroDoBotao,
  registrarPressao,
  tracarRetanguloArredondado,
  type Botao,
} from "../game/ui";
import { definirClimaMusical, somClique } from "../game/sfx";
import { t } from "../i18n/textos";

export class CenaPreFase implements Cena {
  private readonly fase;
  private readonly equipe;
  private readonly poderAtual;
  private botoes: Botao[] = [];
  private tempo = 0;

  constructor(
    private readonly jogo: Jogo,
    private readonly numero: number,
  ) {
    this.fase = gerarFase(numero);
    definirClimaMusical("mapa");
    this.equipe = guardiasAtivas(GUARDIAS, jogo.dados);
    this.poderAtual = poderDaEquipe(this.equipe, jogo.dados);
  }

  atualizar(dt: number): void {
    this.tempo += dt;
  }

  aoTocar(x: number, y: number): void {
    for (const botao of this.botoes) {
      if (!dentroDoBotao(botao, x, y)) continue;
      registrarPressao(botao.acao);
      somClique();
      if (botao.acao === "jogar") this.jogo.irPara({ tela: "fase", numero: this.numero });
      else this.jogo.irPara({ tela: "mapa" });
      return;
    }
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.botoes = [];
    desenharFundoPantanal(ctx, this.tempo, 0.34);

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.fillText(`${t("fase_rotulo")} ${this.numero}`, 18, 38);
    desenharPilulaRecurso(ctx, LARGURA - 14, 38, "capim", this.jogo.dados.capim);
    desenharPilulaRecurso(ctx, LARGURA - 110, 38, "gema", this.jogo.dados.gemas);

    if (this.jogo.modoVitrine) {
      const larguraSelo = 196;
      tracarRetanguloArredondado(ctx, (LARGURA - larguraSelo) / 2, 53, larguraSelo, 20, 10);
      ctx.fillStyle = "rgba(255, 209, 102, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 209, 102, 0.65)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe39a";
      ctx.font = "800 10px system-ui, sans-serif";
      ctx.fillText("VITRINE · SAVE ISOLADO", LARGURA / 2, 63);
    }

    this.painel(ctx, 18, 76, LARGURA - 36, 158, this.fase.ehChefe ? "#ffd166" : "#7dd3a0");
    ctx.textAlign = "left";
    ctx.fillStyle = this.fase.ehChefe ? "#ffd166" : "#ffffff";
    ctx.font = "800 23px system-ui, sans-serif";
    ctx.fillText(this.fase.ehChefe ? `👑 ${this.fase.chefe?.nome ?? t("mapa_chefe")}` : this.fase.bioma.nome, 34, 108, 245);

    const arteDestaque = imagem(this.fase.ehChefe && this.fase.chefe ? `chefe-${this.fase.chefe.id}` : "piranha_afobada");
    if (arteDestaque) {
      const h = this.fase.ehChefe ? 112 : 78;
      const w = h * (arteDestaque.naturalWidth / arteDestaque.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = this.fase.ehChefe ? "rgba(255,205,80,0.42)" : "rgba(70,210,190,0.3)";
      ctx.shadowBlur = 18;
      ctx.drawImage(arteDestaque, LARGURA - 42 - w / 2, 118 - h / 2 + Math.sin(this.tempo * 2) * 2, w, h);
      ctx.restore();
    }

    const corPoder = this.poderAtual >= this.fase.poderRecomendado ? "#9fdf8f" : "#ffb08a";
    ctx.textAlign = "left";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(`${t("equipe_recomendado")}: ${this.fase.poderRecomendado}`, 36, 142);
    ctx.fillStyle = corPoder;
    ctx.font = "800 17px system-ui, sans-serif";
    ctx.fillText(`⚡ ${t("equipe_poder")}: ${this.poderAtual}`, 36, 164);

    const barraX = 36;
    const barraY = 181;
    const barraW = 218;
    tracarRetanguloArredondado(ctx, barraX, barraY, barraW, 12, 6);
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.fill();
    const fracao = Math.min(1, this.poderAtual / Math.max(1, this.fase.poderRecomendado));
    if (fracao > 0.02) {
      tracarRetanguloArredondado(ctx, barraX, barraY, Math.max(10, barraW * fracao), 12, 6);
      ctx.fillStyle = corPoder;
      ctx.fill();
    }
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      this.poderAtual >= this.fase.poderRecomendado
        ? t("equipe_dica_poder_ok")
        : t("equipe_dica_poder_baixo"),
      36,
      211,
    );

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(t("pre_fase_equipe"), 22, 266);
    this.desenharEquipe(ctx);

    this.painel(ctx, 18, 392, LARGURA - 36, 174, "#ffd166");
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(t("pre_fase_recompensas"), 34, 420);
    ctx.fillStyle = "#ffffff";
    ctx.font = "650 15px system-ui, sans-serif";
    ctx.fillText(`🌿 +${this.fase.capimVitoria} ${t("pre_fase_capim_base")}`, 36, 456);

    const chave = String(this.numero);
    let y = 488;
    if (this.fase.gemasVitoria > 0) {
      const jaRecebeu = this.jogo.dados.gemasChefeRecebidas[chave] === true;
      ctx.fillStyle = jaRecebeu ? "rgba(255,255,255,0.58)" : "#8fdcff";
      ctx.fillText(
        jaRecebeu
          ? `↻ ${t("pre_fase_replay_sem_gemas")}`
          : `💎 +${this.fase.gemasVitoria} ${t("pre_fase_primeira_vitoria")}`,
        36,
        y,
      );
      y += 30;
    }
    if (!this.jogo.dados.bonusEstrela3[chave]) {
      ctx.fillStyle = "#8fdcff";
      ctx.fillText(`★★★ +2 💎 ${t("pre_fase_primeira_3")}`, 36, y);
    }

    const jogar: Botao = { x: 42, y: 610, w: LARGURA - 84, h: 58, acao: "jogar" };
    desenharBotao(ctx, jogar, this.fase.ehChefe ? t("pre_fase_enfrentar") : t("equipe_jogar"), {
      cor: "#3d9c63",
      tamanhoFonte: 20,
    });
    const voltar: Botao = { x: 74, y: 682, w: LARGURA - 148, h: 44, acao: "mapa" };
    desenharBotao(ctx, voltar, `◀ ${t("botao_mapa")}`, { cor: "#26604a", tamanhoFonte: 15 });
    this.botoes.push(jogar, voltar);
  }

  private desenharEquipe(ctx: CanvasRenderingContext2D): void {
    const quantidade = Math.max(1, this.equipe.length);
    const espaco = Math.min(76, 340 / quantidade);
    const largura = espaco * quantidade;
    const inicio = (LARGURA - largura) / 2;
    const tamanho = Math.min(54, espaco - 10);

    this.equipe.forEach((guardia, indice) => {
      const centro = inicio + espaco * (indice + 0.5);
      desenharRetrato(
        ctx,
        imagem(`retrato-${guardia.id}`),
        CORES_RARIDADE[guardia.raridade],
        guardia.cor,
        guardia.nome[0],
        centro - tamanho / 2,
        286,
        tamanho,
      );
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 10px system-ui, sans-serif";
      const nome = guardia.nome.length > 10 ? `${guardia.nome.slice(0, 9)}…` : guardia.nome;
      ctx.fillText(nome, centro, 350);
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillText(`Nv.${nivelDaGuardia(this.jogo.dados, guardia.id)}`, centro, 368);
      const evolucao = evolucaoDaGuardia(this.jogo.dados, guardia.id);
      if (evolucao > 0) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "700 9px system-ui, sans-serif";
        ctx.fillText(`Evo ${evolucao} · ×${2 ** evolucao}`, centro, 382);
      }
    });
  }

  private painel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, destaque = "#7dd3a0"): void {
    desenharPainelVidro(ctx, x, y, w, h, 18, destaque, 0.72);
  }
}
