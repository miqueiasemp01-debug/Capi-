import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { FASES, GUARDIAS } from "../game/conteudo";
import {
  custoEvoluirGuardia,
  custoEvoluirToque,
  danoDaGuardia,
  danoDoToque,
  estagioDaGuardia,
  nivelDaGuardia,
  poderDaEquipe,
} from "../game/economia";
import { desenharBotao, dentroDoBotao, tracarRetanguloArredondado, type Botao } from "../game/ui";
import { t, type ChaveTexto } from "../i18n/textos";

const NOME_ESTAGIO: Record<string, ChaveTexto> = {
  filhote: "estagio_filhote",
  adulta: "estagio_adulta",
  plena: "estagio_plena",
};

export class CenaEquipe implements Cena {
  private botoes: Botao[] = [];
  private faseSelecionada: number;

  constructor(private readonly jogo: Jogo) {
    this.faseSelecionada = Math.min(jogo.dados.faseMaxima + 1, FASES.length);
  }

  atualizar(_dt: number): void {}

  aoTocar(x: number, y: number): void {
    for (const botao of this.botoes) {
      if (!dentroDoBotao(botao, x, y)) continue;
      this.executar(botao.acao);
      return;
    }
  }

  private executar(acao: string): void {
    const dados = this.jogo.dados;

    if (acao === "titulo") {
      this.jogo.irPara({ tela: "titulo" });
    } else if (acao === "jogar") {
      const fase = FASES[this.faseSelecionada - 1];
      this.jogo.irPara({ tela: "fase", faseId: fase.id });
    } else if (acao.startsWith("sel:")) {
      this.faseSelecionada = Number(acao.slice(4));
    } else if (acao === "evoluir:toque") {
      const custo = custoEvoluirToque(dados.toqueNivel);
      if (dados.capim >= custo) {
        dados.capim -= custo;
        dados.toqueNivel++;
        this.jogo.salvar();
      }
    } else if (acao.startsWith("evoluir:")) {
      const id = acao.slice(8);
      const nivel = nivelDaGuardia(dados, id);
      const custo = custoEvoluirGuardia(nivel);
      if (dados.capim >= custo) {
        dados.capim -= custo;
        dados.guardiaNiveis[id] = nivel + 1;
        this.jogo.salvar();
      }
    }
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.botoes = [];
    const dados = this.jogo.dados;

    const gradiente = ctx.createLinearGradient(0, 0, 0, ALTURA);
    gradiente.addColorStop(0, "#14503a");
    gradiente.addColorStop(1, "#0b3d2e");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    // cabeçalho
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(t("equipe_titulo"), 18, 40);

    ctx.textAlign = "right";
    ctx.fillStyle = "#9fdf8f";
    ctx.font = "700 19px system-ui, sans-serif";
    ctx.fillText(`🌿 ${dados.capim}`, LARGURA - 18, 40);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(t("equipe_capitulo"), 18, 64);

    this.desenharCartaoDaFase(ctx, 18, 84);
    this.desenharSeletorDeFases(ctx, 18, 218);
    this.desenharCartaoDoToque(ctx, 18, 300);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[0], 18, 402);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[1], 18, 504);

    const jogar: Botao = { x: 40, y: 640, w: LARGURA - 80, h: 58, acao: "jogar" };
    desenharBotao(ctx, jogar, `${t("equipe_jogar")} 1-${this.faseSelecionada} ▶`, {
      cor: "#3d9c63",
      tamanhoFonte: 20,
    });
    this.botoes.push(jogar);

    const voltar: Botao = { x: 40, y: 712, w: LARGURA - 80, h: 36, acao: "titulo" };
    desenharBotao(ctx, voltar, t("botao_voltar"), { cor: "#1d5c3e", tamanhoFonte: 14 });
    this.botoes.push(voltar);
  }

  private desenharCartaoDaFase(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const fase = FASES[this.faseSelecionada - 1];
    const poder = poderDaEquipe(GUARDIAS, this.jogo.dados);
    const proporcao = poder / fase.poderRecomendado;
    const cor = proporcao >= 1 ? "#7dd3a0" : proporcao >= 0.7 ? "#e5b74a" : "#e06a5a";
    const dica: ChaveTexto =
      proporcao >= 1
        ? "equipe_dica_poder_ok"
        : proporcao >= 0.7
          ? "equipe_dica_poder_baixo"
          : "equipe_dica_poder_muito_baixo";

    const w = LARGURA - 36;
    tracarRetanguloArredondado(ctx, x, y, w, 118, 16);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 19px system-ui, sans-serif";
    ctx.fillText(`${t("fase_rotulo")} 1-${this.faseSelecionada}`, x + 16, y + 28);

    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillStyle = cor;
    ctx.fillText(`${t("equipe_poder")}: ${poder}`, x + 16, y + 58);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`${t("equipe_recomendado")}: ${fase.poderRecomendado}`, x + 16, y + 80);

    ctx.fillStyle = cor;
    ctx.font = "500 12px system-ui, sans-serif";
    ctx.fillText(t(dica), x + 16, y + 103);
  }

  private desenharSeletorDeFases(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dados = this.jogo.dados;
    const larguraChip = 62;
    const folga = (LARGURA - 36 - larguraChip * FASES.length) / (FASES.length - 1);

    for (const fase of FASES) {
      const i = fase.numero - 1;
      const chipX = x + i * (larguraChip + folga);
      const desbloqueada = fase.numero <= dados.faseMaxima + 1;
      const selecionada = fase.numero === this.faseSelecionada;

      const chip: Botao = { x: chipX, y, w: larguraChip, h: 58, acao: `sel:${fase.numero}` };
      tracarRetanguloArredondado(ctx, chip.x, chip.y, chip.w, chip.h, 12);
      ctx.fillStyle = selecionada ? "#3d9c63" : desbloqueada ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.35)";
      ctx.fill();
      if (selecionada) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.fillStyle = desbloqueada ? "#ffffff" : "rgba(255,255,255,0.35)";
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.fillText(desbloqueada ? `${fase.numero}` : "🔒", chipX + larguraChip / 2, y + 22);

      const estrelas = dados.estrelas[fase.id] ?? 0;
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillStyle = "#ffd166";
      ctx.fillText(
        desbloqueada ? "★".repeat(estrelas) + "☆".repeat(3 - estrelas) : "",
        chipX + larguraChip / 2,
        y + 42,
      );

      if (desbloqueada) this.botoes.push(chip);
    }
  }

  private cartaoBase(ctx: CanvasRenderingContext2D, x: number, y: number, altura: number): void {
    tracarRetanguloArredondado(ctx, x, y, LARGURA - 36, altura, 16);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();
  }

  private botaoEvoluir(ctx: CanvasRenderingContext2D, y: number, acao: string, custo: number): void {
    const podePagar = this.jogo.dados.capim >= custo;
    const botao: Botao = { x: LARGURA - 148, y: y + 24, w: 118, h: 44, acao };
    desenharBotao(ctx, botao, `${t("equipe_evoluir")} ${custo}🌿`, {
      cor: podePagar ? "#3d9c63" : "#33524a",
      desativado: !podePagar,
      tamanhoFonte: 14,
    });
    if (podePagar) this.botoes.push(botao);
  }

  private desenharCartaoDoToque(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dados = this.jogo.dados;
    this.cartaoBase(ctx, x, y, 88);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.fillText(`👆 ${t("equipe_toque_de_calma")}`, x + 16, y + 28);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(
      `${t("equipe_nivel")} ${dados.toqueNivel} · ${t("equipe_dano")} ${danoDoToque(dados.toqueNivel)}`,
      x + 16,
      y + 56,
    );

    this.botaoEvoluir(ctx, y, "evoluir:toque", custoEvoluirToque(dados.toqueNivel));
  }

  private desenharCartaoDaGuardia(
    ctx: CanvasRenderingContext2D,
    guardia: (typeof GUARDIAS)[number],
    x: number,
    y: number,
  ): void {
    const dados = this.jogo.dados;
    const nivel = nivelDaGuardia(dados, guardia.id);
    this.cartaoBase(ctx, x, y, 88);

    ctx.beginPath();
    ctx.arc(x + 30, y + 44, 17, 0, Math.PI * 2);
    ctx.fillStyle = guardia.cor;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(guardia.nome[0], x + 30, y + 45);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.fillText(guardia.nome, x + 58, y + 28);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(
      `${t(NOME_ESTAGIO[estagioDaGuardia(nivel)])} · ${t("equipe_nivel")} ${nivel} · ${t("equipe_dano")} ${danoDaGuardia(guardia, nivel).toFixed(1)}`,
      x + 58,
      y + 52,
    );

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 11px system-ui, sans-serif";
    const ataque = guardia.ataque.length > 34 ? `${guardia.ataque.slice(0, 33)}…` : guardia.ataque;
    ctx.fillText(ataque, x + 58, y + 72);

    this.botaoEvoluir(ctx, y, `evoluir:${guardia.id}`, custoEvoluirGuardia(nivel));
  }
}
