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
import { imagem } from "../game/imagens";
import { desenharPilulaRecurso } from "../game/icones";
import { mostrarToast, desenharToasts } from "../game/toasts";
import {
  CORES_RARIDADE,
  desenharBadge,
  desenharBotao,
  desenharRetrato,
  dentroDoBotao,
  registrarPressao,
  tracarRetanguloArredondado,
  type Botao,
} from "../game/ui";
import { t, type ChaveTexto } from "../i18n/textos";

const NOME_ESTAGIO: Record<string, ChaveTexto> = {
  filhote: "estagio_filhote",
  adulta: "estagio_adulta",
  plena: "estagio_plena",
};

export class CenaEquipe implements Cena {
  private botoes: Botao[] = [];
  private faseSelecionada: number;
  private tempo = 0;
  private fundo: CanvasGradient | null = null;

  constructor(private readonly jogo: Jogo) {
    this.faseSelecionada = Math.min(jogo.dados.faseMaxima + 1, FASES.length);
    if (!jogo.dados.tutoriais["evoluir"] && jogo.dados.faseMaxima >= 1) {
      mostrarToast(t("tutorial_evoluir"));
      jogo.dados.tutoriais["evoluir"] = true;
      jogo.salvar();
    }
  }

  atualizar(dt: number): void {
    this.tempo += dt;
  }

  aoTocar(x: number, y: number): void {
    for (const botao of this.botoes) {
      if (!dentroDoBotao(botao, x, y)) continue;
      registrarPressao(botao.acao);
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

    if (!this.fundo) {
      this.fundo = ctx.createLinearGradient(0, 0, 0, ALTURA);
      this.fundo.addColorStop(0, "#14503a");
      this.fundo.addColorStop(1, "#0b3d2e");
    }
    ctx.fillStyle = this.fundo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    // cabeçalho: título + moedas
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(t("equipe_titulo"), 18, 36);

    desenharPilulaRecurso(ctx, LARGURA - 14, 34, "capim", dados.capim);
    desenharPilulaRecurso(ctx, LARGURA - 110, 34, "gema", dados.gemas);

    // capítulo + barra de progresso da campanha com estrela
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(t("equipe_capitulo"), 18, 62);
    this.desenharProgressoCampanha(ctx, 18, 76);

    this.desenharCartaoDaFase(ctx, 18, 96);
    this.desenharSeletorDeFases(ctx, 18, 216);
    this.desenharCartaoDoToque(ctx, 18, 288);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[0], 18, 386);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[1], 18, 486);

    const jogar: Botao = { x: 40, y: 636, w: LARGURA - 80, h: 58, acao: "jogar" };
    desenharBotao(ctx, jogar, `${t("equipe_jogar")} 1-${this.faseSelecionada} ▶`, {
      cor: "#3d9c63",
      tamanhoFonte: 20,
    });
    this.botoes.push(jogar);

    const voltar: Botao = { x: 40, y: 708, w: LARGURA - 80, h: 38, acao: "titulo" };
    desenharBotao(ctx, voltar, t("botao_voltar"), { cor: "#1d5c3e", tamanhoFonte: 14 });
    this.botoes.push(voltar);

    desenharToasts(ctx, 600);
  }

  private desenharProgressoCampanha(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dados = this.jogo.dados;
    const largura = 190;
    tracarRetanguloArredondado(ctx, x, y, largura, 10, 5);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    const progresso = Math.min(1, dados.faseMaxima / FASES.length);
    if (progresso > 0.02) {
      tracarRetanguloArredondado(ctx, x, y, largura * progresso, 10, 5);
      ctx.fillStyle = "#ffd166";
      ctx.fill();
    }
    ctx.textAlign = "left";
    ctx.font = "400 15px system-ui, sans-serif";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("★", x + largura + 6, y + 5);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${t("fase_rotulo")} ${dados.faseMaxima}/${FASES.length}`, x + largura + 26, y + 6);
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
    tracarRetanguloArredondado(ctx, x, y, w, 110, 16);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 19px system-ui, sans-serif";
    ctx.fillText(`${t("fase_rotulo")} 1-${this.faseSelecionada}`, x + 16, y + 26);

    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillStyle = cor;
    ctx.fillText(`${t("equipe_poder")}: ${poder}`, x + 16, y + 54);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`${t("equipe_recomendado")}: ${fase.poderRecomendado}`, x + 16, y + 76);

    ctx.fillStyle = cor;
    ctx.font = "500 12px system-ui, sans-serif";
    ctx.fillText(t(dica), x + 16, y + 97);
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
      tracarRetanguloArredondado(ctx, chip.x, chip.y + 3, chip.w, chip.h, 12);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
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
    const botao: Botao = { x: LARGURA - 148, y: y + 22, w: 118, h: 46, acao };
    desenharBotao(ctx, botao, `${t("equipe_evoluir")} ${custo}`, {
      cor: podePagar ? "#3d9c63" : "#33524a",
      desativado: !podePagar,
      tamanhoFonte: 14,
      icone: "capim",
    });
    if (podePagar) this.botoes.push(botao);
  }

  private desenharCartaoDoToque(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dados = this.jogo.dados;
    const custo = custoEvoluirToque(dados.toqueNivel);
    this.cartaoBase(ctx, x, y, 88);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.fillText(`👆 ${t("equipe_toque_de_calma")}`, x + 16, y + 28);
    if (dados.capim >= custo) desenharBadge(ctx, x + 8, y + 8, this.tempo);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(
      `${t("equipe_nivel")} ${dados.toqueNivel} · ${t("equipe_dano")} ${danoDoToque(dados.toqueNivel)}`,
      x + 16,
      y + 56,
    );

    this.botaoEvoluir(ctx, y, "evoluir:toque", custo);
  }

  private desenharCartaoDaGuardia(
    ctx: CanvasRenderingContext2D,
    guardia: (typeof GUARDIAS)[number],
    x: number,
    y: number,
  ): void {
    const dados = this.jogo.dados;
    const nivel = nivelDaGuardia(dados, guardia.id);
    const custo = custoEvoluirGuardia(nivel);
    const podeEvoluir = dados.capim >= custo;
    this.cartaoBase(ctx, x, y, 90);

    // retrato com moldura da raridade + badge de evolução
    desenharRetrato(
      ctx,
      imagem(`retrato-${guardia.id}`),
      CORES_RARIDADE[guardia.raridade],
      guardia.cor,
      guardia.nome[0],
      x + 12,
      y + 15,
      60,
    );
    if (podeEvoluir) desenharBadge(ctx, x + 70, y + 18, this.tempo);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.fillText(guardia.nome, x + 84, y + 26);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(
      `${t(NOME_ESTAGIO[estagioDaGuardia(nivel)])} · ${t("equipe_nivel")} ${nivel} · ${t("equipe_dano")} ${danoDaGuardia(guardia, nivel).toFixed(1)}`,
      x + 84,
      y + 50,
      132,
    );

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 11px system-ui, sans-serif";
    const ataque = guardia.ataque.length > 30 ? `${guardia.ataque.slice(0, 29)}…` : guardia.ataque;
    ctx.fillText(ataque, x + 84, y + 72, 132);

    this.botaoEvoluir(ctx, y, `evoluir:${guardia.id}`, custo);
  }
}
