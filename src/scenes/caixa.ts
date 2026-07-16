import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import type { PremioCaixa } from "../game/gacha";
import {
  CUSTO_CAIXA,
  ODDS,
  PARTIDAS_POR_CAIXA_GRATIS,
  PITY_MAXIMO,
  abrirCaixa,
  consumirCaixaGratis,
  progressoParaCaixaGratis,
} from "../game/gacha";
import { guardiaPorId } from "../game/conteudo";
import { desenharFundoPantanal, desenharLendariaProcedural } from "../game/desenhos";
import { imagem } from "../game/imagens";
import { desenharPilulaRecurso } from "../game/icones";
import { progressoDeFragmentos } from "../game/fragmentos";
import {
  CORES_RARIDADE,
  desenharBotao,
  desenharPainelVidro,
  desenharRetrato,
  tracarRetanguloArredondado,
  dentroDoBotao,
  registrarPressao,
  type Botao,
} from "../game/ui";
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

  constructor(private readonly jogo: Jogo) {
    sfx.definirClimaMusical("caixa");
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    if (this.estado === "abrindo" && this.tempo - this.abriuEm >= DURACAO_SUSPENSE) {
      this.estado = "revelado";
      const guardia = this.premio?.tipo === "fragmentos" ? guardiaPorId(this.premio.id) : null;
      sfx.somRevelacao(guardia?.raridade === "lendaria");
    }
  }

  aoTocar(x: number, y: number): void {
    if (this.mostrarChances) {
      this.mostrarChances = false;
      return;
    }
    for (const botao of this.botoes) {
      if (!dentroDoBotao(botao, x, y)) continue;
      registrarPressao(botao.acao);
      sfx.somClique();
      this.executar(botao.acao);
      return;
    }
  }

  private podeAbrir(): boolean {
    return this.jogo.dados.caixasGratisDisponiveis > 0 || this.jogo.dados.gemas >= CUSTO_CAIXA;
  }

  private executar(acao: string): void {
    const dados = this.jogo.dados;
    if (acao === "mapa") {
      this.jogo.irPara({ tela: "mapa" });
    } else if (acao === "chances") {
      this.mostrarChances = true;
    } else if (acao === "abrir") {
      const usouGratis = consumirCaixaGratis(dados);
      if (!usouGratis) {
        if (dados.gemas < CUSTO_CAIXA) return;
        dados.gemas -= CUSTO_CAIXA;
      }
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

    desenharFundoPantanal(ctx, this.tempo, 0.78, "37, 15, 55");
    for (let i = 0; i < 14; i++) {
      const x = 24 + ((i * 83) % 355);
      const y = 104 + ((i * 137) % 430) + Math.sin(this.tempo * 0.8 + i) * 8;
      ctx.globalAlpha = 0.1 + (i % 3) * 0.05;
      ctx.fillStyle = i % 2 ? "#ffd166" : "#d9c9ff";
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.fillText(t("caixa_titulo"), 18, 40);
    desenharPilulaRecurso(ctx, LARGURA - 14, 38, "gema", dados.gemas);

    ctx.textAlign = "center";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = dados.caixasGratisDisponiveis > 0 ? "#ffd166" : "rgba(255,255,255,0.72)";
    ctx.fillText(
      dados.caixasGratisDisponiveis > 0
        ? `🎁 ${dados.caixasGratisDisponiveis} ${dados.caixasGratisDisponiveis === 1 ? "Caixa grátis" : "Caixas grátis"}`
        : `${t("caixa_gratis_progresso")}: ${progressoParaCaixaGratis(dados)}/${PARTIDAS_POR_CAIXA_GRATIS}`,
      LARGURA / 2,
      78,
    );

    if (this.estado === "revelado") this.desenharRevelacao(ctx);
    else this.desenharCaixaFechada(ctx);

    ctx.textAlign = "center";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`${t("caixa_pity")} ${dados.pityLendaria}/${PITY_MAXIMO}`, LARGURA / 2, 470);
    const larguraBarra = 240;
    const bx = (LARGURA - larguraBarra) / 2;
    tracarRetanguloArredondado(ctx, bx, 482, larguraBarra, 8, 4);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    if (dados.pityLendaria > 0) {
      const larguraProgresso = Math.max(8, larguraBarra * (dados.pityLendaria / PITY_MAXIMO));
      tracarRetanguloArredondado(ctx, bx, 482, larguraProgresso, 8, 4);
      ctx.fillStyle = "#ffd166";
      ctx.fill();
    }

    if (this.estado === "pronto") {
      const gratis = dados.caixasGratisDisponiveis > 0;
      const podeAbrir = this.podeAbrir();
      const abrir: Botao = { x: 50, y: 560, w: LARGURA - 100, h: 60, acao: "abrir" };
      const rotulo = gratis
        ? t("caixa_abrir_gratis")
        : podeAbrir
          ? `${t("caixa_abrir")} · ${CUSTO_CAIXA}`
          : t("caixa_sem_gemas");
      desenharBotao(ctx, abrir, rotulo, {
        cor: podeAbrir ? "#b06fe0" : "#4a4a5a",
        desativado: !podeAbrir,
        tamanhoFonte: 20,
        icone: !gratis && podeAbrir ? "gema" : undefined,
      });
      if (podeAbrir) this.botoes.push(abrir);

      const chances: Botao = { x: 50, y: 628, w: (LARGURA - 110) / 2, h: 42, acao: "chances" };
      desenharBotao(ctx, chances, t("caixa_ver_chances"), { cor: "#5a4a70", tamanhoFonte: 13 });
      this.botoes.push(chances);
      const voltar: Botao = { x: 60 + (LARGURA - 110) / 2, y: 628, w: (LARGURA - 110) / 2, h: 42, acao: "mapa" };
      desenharBotao(ctx, voltar, t("botao_mapa"), { cor: "#5a4a70", tamanhoFonte: 13 });
      this.botoes.push(voltar);
    } else if (this.estado === "revelado") {
      const podeAbrir = this.podeAbrir();
      if (podeAbrir) {
        const denovo: Botao = { x: 50, y: 590, w: LARGURA - 100, h: 54, acao: "denovo" };
        desenharBotao(ctx, denovo, t("caixa_abrir_outra"), { cor: "#b06fe0", tamanhoFonte: 18 });
        this.botoes.push(denovo);
        const voltar: Botao = { x: 50, y: 652, w: LARGURA - 100, h: 38, acao: "mapa" };
        desenharBotao(ctx, voltar, t("botao_mapa"), { cor: "#5a4a70", tamanhoFonte: 13 });
        this.botoes.push(voltar);
      } else {
        const voltar: Botao = { x: 50, y: 620, w: LARGURA - 100, h: 54, acao: "mapa" };
        desenharBotao(ctx, voltar, t("botao_mapa"), { cor: "#b06fe0", tamanhoFonte: 18 });
        this.botoes.push(voltar);
      }
    }

    if (this.mostrarChances) this.desenharChances(ctx);
  }

  private desenharCaixaFechada(ctx: CanvasRenderingContext2D): void {
    const cx = LARGURA / 2;
    const cy = 260;
    const abrindo = this.estado === "abrindo";
    const p = abrindo ? (this.tempo - this.abriuEm) / DURACAO_SUSPENSE : 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 98, LARGURA, 344);
    ctx.clip();
    ctx.translate(cx, cy);
    if (abrindo) {
      ctx.translate(Math.sin(this.tempo * 40) * p * 6, 0);
      ctx.shadowColor = `rgba(255, 220, 120, ${0.3 + 0.7 * p})`;
      ctx.shadowBlur = 30 * p;
    }
    ctx.translate(0, abrindo ? 0 : Math.sin(this.tempo * 2) * 4);

    const arteCaixa = imagem("caixa-surto");
    if (arteCaixa) {
      const w = 232;
      const h = w * (arteCaixa.naturalHeight / arteCaixa.naturalWidth);
      ctx.drawImage(arteCaixa, -w / 2, -h / 2, w, h);
      ctx.restore();
      if (!abrindo) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.font = "600 14px system-ui, sans-serif";
        ctx.fillText(t("caixa_premios_resumo"), cx, cy + 105);
      }
      return;
    }

    const w = 120;
    const h = 90;
    tracarRetanguloArredondado(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fillStyle = "#8a5a3a";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffd24a";
    ctx.stroke();
    tracarRetanguloArredondado(ctx, -w / 2, -h / 2 - 14, w, 26, 10);
    ctx.fillStyle = "#a5714b";
    ctx.fill();
    ctx.stroke();
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
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.fillText(t("caixa_premios_resumo"), cx, cy + 90);
    }
  }

  private desenharRevelacao(ctx: CanvasRenderingContext2D): void {
    const cx = LARGURA / 2;
    const cy = 205;
    const premio = this.premio!;
    const idade = this.tempo - this.abriuEm - DURACAO_SUSPENSE;
    const pop = Math.min(1, idade / 0.35) * (1 + 0.3 * Math.max(0, 1 - idade / 0.35));
    const guardia = premio.tipo === "fragmentos" ? guardiaPorId(premio.id) : null;
    const lendaria = guardia?.raridade === "lendaria";

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

    const arteAberta = imagem("caixa-surto-aberta");
    if (arteAberta) {
      const h = 122;
      const w = h * (arteAberta.naturalWidth / arteAberta.naturalHeight);
      ctx.save();
      ctx.shadowColor = lendaria ? "rgba(255,210,74,0.7)" : "rgba(205,170,255,0.45)";
      ctx.shadowBlur = 26;
      ctx.drawImage(arteAberta, cx - w / 2, 260, w, h);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    if (premio.tipo === "capim") {
      ctx.font = "700 58px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌿", 0, 0);
    } else if (guardia) {
      const arteGuardia = imagem(guardia.id);
      if (arteGuardia) {
        const h = guardia.raridade === "lendaria" ? 126 : 106;
        const w = h * (arteGuardia.naturalWidth / arteGuardia.naturalHeight);
        ctx.drawImage(arteGuardia, -w / 2, -h / 2, w, h);
      } else if (guardia.raridade === "lendaria") {
        desenharLendariaProcedural(ctx, guardia, 0, 6, this.tempo);
      } else {
        desenharRetrato(
          ctx,
          imagem(`retrato-${guardia.id}`),
          CORES_RARIDADE[guardia.raridade],
          guardia.cor,
          guardia.nome[0],
          -45,
          -45,
          90,
        );
      }
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("🧩", 56, 48);
    }
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (premio.tipo === "capim") {
      ctx.fillStyle = "#9fdf8f";
      ctx.font = "800 24px system-ui, sans-serif";
      ctx.fillText(`+${premio.qtd} capim`, cx, 360);
      return;
    }

    const evoluiu = premio.resultado.evolucaoDepois > premio.resultado.evolucaoAntes;
    ctx.fillStyle = lendaria ? "#ffd166" : "#d9c9ff";
    ctx.font = "900 18px system-ui, sans-serif";
    const titulo = premio.resultado.desbloqueou
      ? t("caixa_guardia_desbloqueada")
      : evoluiu
        ? `${t("caixa_evolucao")} ${premio.resultado.evolucaoDepois}`
        : premio.garantidoPeloPity
          ? t("caixa_pity_conquistado")
          : `+${premio.qtd} ${t("caixa_fragmentos")}`;
    ctx.fillText(titulo, cx, 348);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.fillText(`${guardia?.nome ?? premio.id} · +${premio.qtd} 🧩`, cx, 378);

    const progresso = progressoDeFragmentos(this.jogo.dados, premio.id);
    ctx.fillStyle = progresso.noMaximo ? "#ffd166" : "rgba(255,255,255,0.78)";
    ctx.font = "650 13px system-ui, sans-serif";
    ctx.fillText(
      progresso.noMaximo
        ? t("caixa_evolucao_maxima")
        : `${t("caixa_proxima_evolucao")}: ${progresso.atual}/${progresso.necessario}`,
      cx,
      406,
    );
  }

  private desenharChances(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    const px = 32;
    const py = 190;
    const pw = LARGURA - 64;
    const ph = 390;
    desenharPainelVidro(ctx, px, py, pw, ph, 20, "#d9c9ff", 0.92);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(t("caixa_odds_titulo"), LARGURA / 2, py + 34);

    ctx.font = "600 14px system-ui, sans-serif";
    ODDS.forEach((o, i) => {
      const y = py + 78 + i * 42;
      ctx.textAlign = "left";
      ctx.fillStyle = i === ODDS.length - 1 ? "#ffd166" : "#e8e8f0";
      ctx.fillText(o.rotulo, px + 18, y, pw - 90);
      ctx.textAlign = "right";
      ctx.fillText(o.pct, px + pw - 18, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 12px system-ui, sans-serif";
    ctx.fillText(t("caixa_odds_serena"), LARGURA / 2, py + 270, pw - 30);
    ctx.fillText(`Pity na ${PITY_MAXIMO}ª · grátis também conta`, LARGURA / 2, py + 304);
    ctx.fillText(t("caixa_odds_maximo"), LARGURA / 2, py + 330, pw - 30);
    ctx.fillStyle = "#d9c9ff";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(t("caixa_toque_fechar"), LARGURA / 2, py + ph - 22);
  }
}
