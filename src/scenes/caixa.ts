import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import type { PremioCaixa } from "../game/gacha";
import { CUSTO_CAIXA, ODDS, PITY_MAXIMO, abrirCaixa } from "../game/gacha";
import { guardiaPorId } from "../game/conteudo";
import { desenharLendariaProcedural } from "../game/desenhos";
import { desenharPilulaRecurso, desenharIconeGema } from "../game/icones";
import { desenharBotao, tracarRetanguloArredondado, dentroDoBotao, registrarPressao, type Botao } from "../game/ui";
import * as sfx from "../game/sfx";
import { t } from "../i18n/textos";

type Estado = "pronto" | "abrindo" | "revelado";
const DURACAO_SUSPENSE = 1.5;

export class CenaCaixa implements Cena {
  private tempo = 0;
  private estado: Estado = "pronto";
  private abriuEm = 0;
  private premio: PremioCaixa | null = null;
  private mostrarChances = false;
  private botoes: Botao[] = [];
  private fundo: CanvasGradient | null = null;

  constructor(private readonly jogo: Jogo) {}

  atualizar(dt: number): void {
    this.tempo += dt;
    if (this.estado === "abrindo" && this.tempo - this.abriuEm >= DURACAO_SUSPENSE) {
      this.estado = "revelado";
      sfx.somRevelacao(this.premio?.tipo === "lendaria");
    }
  }

  aoTocar(x: number, y: number): void {
    if (this.mostrarChances) {
      this.mostrarChances = false;
      return;
    }
    for (const b of this.botoes) {
      if (!dentroDoBotao(b, x, y)) continue;
      registrarPressao(b.acao);
      sfx.somClique();
      this.executar(b.acao);
      return;
    }
  }

  private executar(acao: string): void {
    const dados = this.jogo.dados;
    if (acao === "mapa") {
      this.jogo.irPara({ tela: "mapa" });
    } else if (acao === "chances") {
      this.mostrarChances = true;
    } else if (acao === "abrir") {
      if (dados.gemas < CUSTO_CAIXA) return;
      dados.gemas -= CUSTO_CAIXA;
      this.premio = abrirCaixa(dados);
      this.jogo.salvar();
      this.estado = "abrindo";
      this.abriuEm = this.tempo;
      sfx.somCaixaSuspense();
    } else if (acao === "denovo") {
      this.estado = "pronto";
      this.premio = null;
    }
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.botoes = [];
    const dados = this.jogo.dados;

    if (!this.fundo) {
      this.fundo = ctx.createLinearGradient(0, 0, 0, ALTURA);
      this.fundo.addColorStop(0, "#3a2450");
      this.fundo.addColorStop(1, "#140a20");
    }
    ctx.fillStyle = this.fundo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.fillText(t("caixa_titulo"), 18, 40);
    desenharPilulaRecurso(ctx, LARGURA - 14, 38, "gema", dados.gemas);

    if (this.estado === "revelado") this.desenharRevelacao(ctx);
    else this.desenharCaixaFechada(ctx);

    // pity sempre visível
    ctx.textAlign = "center";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`${t("caixa_pity")} ${dados.pityLendaria}/${PITY_MAXIMO}`, LARGURA / 2, 470);
    const larguraBarra = 240;
    const bx = (LARGURA - larguraBarra) / 2;
    tracarRetanguloArredondado(ctx, bx, 482, larguraBarra, 8, 4);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    tracarRetanguloArredondado(ctx, bx, 482, larguraBarra * (dados.pityLendaria / PITY_MAXIMO), 8, 4);
    ctx.fillStyle = "#ffd166";
    ctx.fill();

    // botões
    if (this.estado === "pronto") {
      const podePagar = dados.gemas >= CUSTO_CAIXA;
      const abrir: Botao = { x: 50, y: 560, w: LARGURA - 100, h: 60, acao: "abrir" };
      desenharBotao(ctx, abrir, podePagar ? `${t("caixa_abrir")} · ${CUSTO_CAIXA}` : t("caixa_sem_gemas"), {
        cor: podePagar ? "#b06fe0" : "#4a4a5a", desativado: !podePagar, tamanhoFonte: 20, icone: podePagar ? "gema" : undefined,
      });
      if (podePagar) this.botoes.push(abrir);

      const chances: Botao = { x: 50, y: 628, w: (LARGURA - 110) / 2, h: 42, acao: "chances" };
      desenharBotao(ctx, chances, t("caixa_ver_chances"), { cor: "#5a4a70", tamanhoFonte: 13 });
      this.botoes.push(chances);
      const voltar: Botao = { x: 60 + (LARGURA - 110) / 2, y: 628, w: (LARGURA - 110) / 2, h: 42, acao: "mapa" };
      desenharBotao(ctx, voltar, t("botao_mapa"), { cor: "#5a4a70", tamanhoFonte: 13 });
      this.botoes.push(voltar);
    } else if (this.estado === "revelado") {
      const podePagar = dados.gemas >= CUSTO_CAIXA;
      const denovo: Botao = { x: 50, y: 590, w: LARGURA - 100, h: 54, acao: podePagar ? "denovo" : "mapa" };
      desenharBotao(ctx, denovo, podePagar ? `Abrir outra · ${CUSTO_CAIXA}` : t("botao_mapa"), {
        cor: "#b06fe0", tamanhoFonte: 18, icone: podePagar ? "gema" : undefined,
      });
      this.botoes.push(denovo);
      const voltar: Botao = { x: 50, y: 652, w: LARGURA - 100, h: 38, acao: "mapa" };
      desenharBotao(ctx, voltar, t("botao_mapa"), { cor: "#5a4a70", tamanhoFonte: 13 });
      this.botoes.push(voltar);
    }

    if (this.mostrarChances) this.desenharChances(ctx);
  }

  private desenharCaixaFechada(ctx: CanvasRenderingContext2D): void {
    const cx = LARGURA / 2;
    const cy = 260;
    const abrindo = this.estado === "abrindo";
    const p = abrindo ? (this.tempo - this.abriuEm) / DURACAO_SUSPENSE : 0;

    ctx.save();
    ctx.translate(cx, cy);
    // treme e brilha durante o suspense
    if (abrindo) {
      ctx.translate(Math.sin(this.tempo * 40) * p * 6, 0);
      const brilho = 0.3 + 0.7 * p;
      ctx.shadowColor = `rgba(255, 220, 120, ${brilho})`;
      ctx.shadowBlur = 30 * p;
    }
    const bob = Math.sin(this.tempo * 2) * 4;
    ctx.translate(0, abrindo ? 0 : bob);

    // baú
    const w = 120;
    const h = 90;
    tracarRetanguloArredondado(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fillStyle = "#8a5a3a";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffd24a";
    ctx.stroke();
    // tampa
    tracarRetanguloArredondado(ctx, -w / 2, -h / 2 - 14, w, 26, 10);
    ctx.fillStyle = "#a5714b";
    ctx.fill();
    ctx.stroke();
    // fechadura
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a3a";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!abrindo) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.fillText("Prêmios: capim, gemas ou uma Lendária!", cx, cy + 90);
    }
  }

  private desenharRevelacao(ctx: CanvasRenderingContext2D): void {
    const cx = LARGURA / 2;
    const cy = 250;
    const p = this.premio!;
    const idade = this.tempo - this.abriuEm - DURACAO_SUSPENSE;
    const pop = Math.min(1, idade / 0.35) * (1 + 0.3 * Math.max(0, 1 - idade / 0.35));

    const lendaria = p.tipo === "lendaria";
    const cor = lendaria ? "#f2b53c" : p.tipo === "gemas" ? "#8fdcff" : "#9fdf8f";

    // raios coloridos por raridade
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.tempo);
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.fillStyle = lendaria ? "rgba(255, 210, 74, 0.16)" : "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(220, -20);
      ctx.lineTo(220, 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    if (lendaria) {
      const g = guardiaPorId(p.id);
      if (g) desenharLendariaProcedural(ctx, g, 0, 6, this.tempo);
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t("caixa_lendaria"), 0, -60);
    } else if (p.tipo === "gemas") {
      desenharIconeGema(ctx, 0, 0, 60);
    } else {
      ctx.font = "700 52px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌿", 0, 0);
    }
    ctx.restore();

    // rótulo do prêmio
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = cor;
    ctx.font = "800 22px system-ui, sans-serif";
    let texto = "";
    if (p.tipo === "capim") texto = `+${p.qtd} capim`;
    else if (p.tipo === "gemas") texto = `+${p.qtd} gemas`;
    else if (p.duplicada) texto = guardiaPorId(p.id)?.nome ?? "Lendária";
    else texto = guardiaPorId(p.id)?.nome ?? "Lendária";
    ctx.fillText(texto, cx, 360);

    if (lendaria && p.duplicada) {
      ctx.fillStyle = "#9fdf8f";
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillText(t("caixa_duplicata"), cx, 388);
    } else if (lendaria) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 13px system-ui, sans-serif";
      ctx.fillText(guardiaPorId(p.id)?.ataque ?? "", cx, 388, LARGURA - 40);
    }
  }

  private desenharChances(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    const px = 40;
    const py = 240;
    const pw = LARGURA - 80;
    const ph = 260;
    tracarRetanguloArredondado(ctx, px, py, pw, ph, 18);
    ctx.fillStyle = "#241634";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(t("caixa_odds_titulo"), LARGURA / 2, py + 34);

    ctx.font = "600 15px system-ui, sans-serif";
    ODDS.forEach((o, i) => {
      const y = py + 76 + i * 40;
      ctx.textAlign = "left";
      ctx.fillStyle = i === 0 ? "#ffd166" : "#e8e8f0";
      ctx.fillText(o.rotulo, px + 20, y);
      ctx.textAlign = "right";
      ctx.fillText(o.pct, px + pw - 20, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText(`Lendária garantida na ${PITY_MAXIMO}ª caixa · toque pra fechar`, LARGURA / 2, py + ph - 26);
  }
}
