import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { GUARDIAS } from "../game/conteudo";
import {
  CAPI_CALMA_POR_NIVEL,
  calmaMaximaBonus,
  custoEvoluirCapiAtaque,
  custoEvoluirCapiCalma,
  custoEvoluirGuardia,
  custoEvoluirToque,
  danoDaCapi,
  danoDaGuardia,
  danoDoToque,
  estagioDaGuardia,
  nivelDaGuardia,
  poderDaEquipe,
} from "../game/economia";
import { imagem } from "../game/imagens";
import { desenharPilulaRecurso } from "../game/icones";
import { desenharEstrela } from "../game/desenhos";
import { somConquista, somClique } from "../game/sfx";
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

const Y_CAPI = 74;
const Y_TOQUE = 200;
const Y_GUARDIAS = [298, 396];

function formatarDano(valor: number): string {
  const arredondado = Math.round(valor * 10) / 10;
  return Number.isInteger(arredondado)
    ? String(arredondado)
    : arredondado.toFixed(1).replace(".", ",");
}

interface Celebracao {
  inicio: number;
  texto: string;
  yCartao: number;
  novoEstagio: boolean;
}

export class CenaEquipe implements Cena {
  private botoes: Botao[] = [];
  private tempo = 0;
  private fundo: CanvasGradient | null = null;
  private poderExibido = -1;
  private celebracao: Celebracao | null = null;

  constructor(private readonly jogo: Jogo) {
    if (!jogo.dados.tutoriais["evoluir"] && jogo.dados.faseMaxima >= 1) {
      mostrarToast(t("tutorial_evoluir"));
      jogo.dados.tutoriais["evoluir"] = true;
      jogo.salvar();
    }
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    const poderReal = poderDaEquipe(GUARDIAS, this.jogo.dados);
    if (this.poderExibido < 0) this.poderExibido = poderReal;
    this.poderExibido += (poderReal - this.poderExibido) * Math.min(1, dt * 5);
    if (Math.abs(poderReal - this.poderExibido) < 0.05) this.poderExibido = poderReal;
    if (this.celebracao && this.tempo - this.celebracao.inicio > 1.6) this.celebracao = null;
  }

  aoTocar(x: number, y: number): void {
    for (const botao of this.botoes) {
      if (!dentroDoBotao(botao, x, y)) continue;
      registrarPressao(botao.acao);
      somClique();
      this.executar(botao.acao);
      return;
    }
  }

  private executar(acao: string): void {
    const dados = this.jogo.dados;

    if (acao === "mapa") {
      this.jogo.irPara({ tela: "mapa" });
    } else if (acao === "evoluir:toque") {
      this.comprar(custoEvoluirToque(dados.toqueNivel), () => dados.toqueNivel++, t("celebra_dano_toque"), Y_TOQUE, false);
    } else if (acao === "evoluir:capi_ataque") {
      this.comprar(custoEvoluirCapiAtaque(dados.capiAtaqueNivel), () => dados.capiAtaqueNivel++, t("celebra_dano_capi"), Y_CAPI, false);
    } else if (acao === "evoluir:capi_calma") {
      this.comprar(custoEvoluirCapiCalma(dados.capiCalmaNivel), () => dados.capiCalmaNivel++, t("celebra_calma"), Y_CAPI, false);
    } else if (acao.startsWith("evoluir:")) {
      const id = acao.slice(8);
      const nivel = nivelDaGuardia(dados, id);
      const indice = GUARDIAS.findIndex((g) => g.id === id);
      const novoEstagio = estagioDaGuardia(nivel + 1) !== estagioDaGuardia(nivel);
      this.comprar(
        custoEvoluirGuardia(nivel),
        () => (dados.guardiaNiveis[id] = nivel + 1),
        t("celebra_dano_guardia"),
        Y_GUARDIAS[indice] ?? Y_TOQUE,
        novoEstagio,
      );
    }
  }

  private comprar(custo: number, aplicar: () => void, texto: string, yCartao: number, novoEstagio: boolean): void {
    if (this.jogo.dados.capim < custo) return;
    this.jogo.dados.capim -= custo;
    aplicar();
    this.jogo.salvar();
    this.celebracao = { inicio: this.tempo, texto, yCartao, novoEstagio };
    somConquista();
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

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(t("equipe_titulo"), 18, 36);

    desenharPilulaRecurso(ctx, LARGURA - 14, 34, "capim", dados.capim);
    desenharPilulaRecurso(ctx, LARGURA - 110, 34, "gema", dados.gemas);

    this.desenharCartaoDaCapi(ctx, 18, Y_CAPI);
    this.desenharCartaoDoToque(ctx, 18, Y_TOQUE);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[0], 18, Y_GUARDIAS[0]);
    this.desenharCartaoDaGuardia(ctx, GUARDIAS[1], 18, Y_GUARDIAS[1]);

    // poder total, com contagem animada
    const poder = poderDaEquipe(GUARDIAS, dados);
    const poderMostrado = this.poderExibido < 0 ? poder : this.poderExibido;
    const contando = Math.abs(poder - poderMostrado) >= 0.5;
    ctx.textAlign = "center";
    ctx.font = contando ? "800 22px system-ui, sans-serif" : "800 20px system-ui, sans-serif";
    ctx.fillStyle = contando ? "#ffd166" : "#ffffff";
    ctx.fillText(`⚡ ${t("equipe_poder")}: ${Math.round(poderMostrado)}`, LARGURA / 2, 520);

    const mapa: Botao = { x: 40, y: 636, w: LARGURA - 80, h: 58, acao: "mapa" };
    desenharBotao(ctx, mapa, `◀ ${t("mapa_titulo")}`, { cor: "#3d9c63", tamanhoFonte: 20 });
    this.botoes.push(mapa);

    desenharToasts(ctx, 585);
    this.desenharCelebracao(ctx);
  }

  private desenharCelebracao(ctx: CanvasRenderingContext2D): void {
    const c = this.celebracao;
    if (!c) return;
    const idade = this.tempo - c.inicio;

    const flash = Math.max(0, 1 - idade / 0.3);
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 252, 235, ${0.6 * flash})`;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }

    const entrada = Math.min(1, idade / 0.18);
    const escala = entrada * (1 + 0.35 * Math.sin(entrada * Math.PI));
    const saida = Math.max(0, Math.min(1, (1.6 - idade) / 0.35));
    ctx.save();
    ctx.globalAlpha = saida;
    ctx.translate(LARGURA / 2, 300);
    ctx.rotate(-0.05);
    ctx.scale(escala, escala);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 34px system-ui, sans-serif";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(60, 30, 0, 0.9)";
    ctx.strokeText(c.texto, 0, 0);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(c.texto, 0, 0);
    if (c.novoEstagio) {
      ctx.font = "800 22px system-ui, sans-serif";
      ctx.lineWidth = 6;
      ctx.strokeText(t("celebra_estagio"), 0, 38);
      ctx.fillStyle = "#aef29b";
      ctx.fillText(t("celebra_estagio"), 0, 38);
    }
    ctx.restore();

    if (c.novoEstagio) {
      const pop = Math.min(1, idade / 0.35);
      const raio = 16 * pop * (1 + 0.4 * Math.sin(pop * Math.PI));
      ctx.save();
      ctx.globalAlpha = saida;
      desenharEstrela(ctx, 46, c.yCartao + 18, raio, "#ffd166", idade * 3);
      ctx.restore();
    }
  }

  private cartaoBase(ctx: CanvasRenderingContext2D, x: number, y: number, altura: number): void {
    tracarRetanguloArredondado(ctx, x, y, LARGURA - 36, altura, 16);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();
  }

  // botão de evoluir compacto, alinhável em X (Capi tem dois lado a lado)
  private botaoEvoluir(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, acao: string, custo: number, rotulo: string): void {
    const podePagar = this.jogo.dados.capim >= custo;
    const botao: Botao = { x, y, w, h: 40, acao };
    desenharBotao(ctx, botao, `${rotulo} ${custo}`, {
      cor: podePagar ? "#3d9c63" : "#33524a",
      desativado: !podePagar,
      tamanhoFonte: 12,
      icone: "capim",
    });
    if (podePagar) this.botoes.push(botao);
  }

  private desenharCartaoDaCapi(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dados = this.jogo.dados;
    this.cartaoBase(ctx, x, y, 116);

    desenharRetrato(ctx, imagem("retrato-capi"), "#f2b53c", "#a5714b", "C", x + 12, y + 14, 56);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 17px system-ui, sans-serif";
    ctx.fillText(t("equipe_capi"), x + 80, y + 26);

    // linha de Ataque (Onda Dourada)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(`🌊 ${t("equipe_capi_ataque")} Nv.${dados.capiAtaqueNivel}`, x + 80, y + 48);
    ctx.fillStyle = "#9fdf8f";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(
      `${t("equipe_dano")} ${formatarDano(danoDaCapi(dados.capiAtaqueNivel))} → ${formatarDano(danoDaCapi(dados.capiAtaqueNivel + 1))}`,
      x + 80,
      y + 64,
    );

    // linha de Calma máxima
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(`💚 ${t("equipe_capi_calma")} Nv.${dados.capiCalmaNivel}`, x + 80, y + 84);
    ctx.fillStyle = "#9fdf8f";
    ctx.font = "700 12px system-ui, sans-serif";
    const calmaAgora = 10 + calmaMaximaBonus(dados.capiCalmaNivel);
    ctx.fillText(`${calmaAgora} → ${calmaAgora + CAPI_CALMA_POR_NIVEL}`, x + 80, y + 100);

    // dois botões de evolução separados
    const larguraB = 92;
    this.botaoEvoluir(ctx, LARGURA - 24 - larguraB, y + 40, larguraB, "evoluir:capi_ataque", custoEvoluirCapiAtaque(dados.capiAtaqueNivel), "🌊");
    this.botaoEvoluir(ctx, LARGURA - 24 - larguraB, y + 84, larguraB, "evoluir:capi_calma", custoEvoluirCapiCalma(dados.capiCalmaNivel), "💚");

    if (dados.capim >= Math.min(custoEvoluirCapiAtaque(dados.capiAtaqueNivel), custoEvoluirCapiCalma(dados.capiCalmaNivel))) {
      desenharBadge(ctx, x + 70, y + 16, this.tempo);
    }
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
    ctx.fillText(`${t("equipe_nivel")} ${dados.toqueNivel}`, x + 16, y + 54);

    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillStyle = "#9fdf8f";
    ctx.fillText(
      `${t("equipe_dano")} ${formatarDano(danoDoToque(dados.toqueNivel))} → ${formatarDano(danoDoToque(dados.toqueNivel + 1))}`,
      x + 16,
      y + 74,
    );

    this.botaoEvoluir(ctx, LARGURA - 148, y + 24, 118, "evoluir:toque", custo, t("equipe_evoluir"));
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

    desenharRetrato(
      ctx, imagem(`retrato-${guardia.id}`), CORES_RARIDADE[guardia.raridade],
      guardia.cor, guardia.nome[0], x + 12, y + 15, 60,
    );
    if (podeEvoluir) desenharBadge(ctx, x + 70, y + 18, this.tempo);

    const estagio = estagioDaGuardia(nivel);
    const totalEstrelas = estagio === "plena" ? 3 : estagio === "adulta" ? 2 : 1;
    for (let i = 0; i < totalEstrelas; i++) {
      desenharEstrela(ctx, x + 28 + i * 14 - (totalEstrelas - 1) * 7, y + 76, 6, "#ffd166");
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.fillText(guardia.nome, x + 84, y + 24);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(`${t(NOME_ESTAGIO[estagio])} · ${t("equipe_nivel")} ${nivel}`, x + 84, y + 46, 132);

    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillStyle = "#9fdf8f";
    ctx.fillText(
      `${t("equipe_dano")} ${formatarDano(danoDaGuardia(guardia, nivel))} → ${formatarDano(danoDaGuardia(guardia, nivel + 1))}`,
      x + 84,
      y + 68,
      132,
    );

    this.botaoEvoluir(ctx, LARGURA - 148, y + 24, 118, `evoluir:${guardia.id}`, custo, t("equipe_evoluir"));
  }
}
