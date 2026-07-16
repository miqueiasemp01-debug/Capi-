import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { biomaDaFase, ehChefe, poderRecomendado } from "../game/procedural";
import { GUARDIAS, guardiaPorId } from "../game/conteudo";
import { poderDaEquipe } from "../game/economia";
import {
  guardiasAtivas,
  marcarOfertaSerenaVista,
  missaoResgateAtiva,
  msRestantesOferta,
  msRestantesReabertura,
  msRestantesResgate,
  ofertaSerenaAtiva,
} from "../game/evento";
import { prepararFundacaoJornada, verificarNavegacao } from "../game/jornada";
import { desenharBotao, desenharPainelVidro, tracarRetanguloArredondado, dentroDoBotao, registrarPressao, type Botao } from "../game/ui";
import { desenharPilulaRecurso } from "../game/icones";
import { desenharFundoPantanal, desenharLendariaProcedural } from "../game/desenhos";
import { imagem } from "../game/imagens";
import { estaMutado, definirMute, somClique } from "../game/sfx";
import { ehDebug, adiantarUmaHora, formatarIntervalo } from "../game/tempo";
import { FASE_RESGATE } from "../game/evento";
import { t } from "../i18n/textos";

const ESPACO_NO = 96;
const Y_TRILHA = 300;
const FASES_VISIVEIS_ALEM = 6;
const PRECO_SERENA = "R$ 5,99";

export class CenaMapa implements Cena {
  private tempo = 0;
  private scrollX = 0;
  private scrollAlvo = 0;
  private arrastando = false;
  private arrastouDe = 0;
  private scrollInicio = 0;
  private maxFaseMostrada: number;
  private botoes: Botao[] = [];
  private mostrarOferta = false;
  private avisoCompraAte = -9;

  constructor(private readonly jogo: Jogo) {
    if (prepararFundacaoJornada(jogo.dados)) jogo.salvar();
    // A oferta tem flag própria e só abre automaticamente uma vez.
    if (ofertaSerenaAtiva(jogo.dados) && !jogo.dados.evento.ofertaSerenaVista) this.mostrarOferta = true;

    this.maxFaseMostrada = Math.max(8, jogo.dados.faseMaxima + FASES_VISIVEIS_ALEM);
    const atual = jogo.dados.faseMaxima + 1;
    this.scrollAlvo = this.scrollDoNo(atual);
    this.scrollX = this.scrollAlvo;
  }

  private scrollDoNo(numero: number): number {
    return (numero - 1) * ESPACO_NO - LARGURA / 2 + 40;
  }
  private limitarScroll(v: number): number {
    return Math.max(this.scrollDoNo(1), Math.min(this.scrollDoNo(this.maxFaseMostrada), v));
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    const verificacao = verificarNavegacao(this.jogo.dados);
    if (verificacao.mudou) this.jogo.salvar();
    if (this.mostrarOferta && !ofertaSerenaAtiva(this.jogo.dados)) this.mostrarOferta = false;
    if (verificacao.cutscene) {
      this.jogo.irPara({ tela: "cutscene", tipo: verificacao.cutscene });
      return;
    }
    if (!this.arrastando) this.scrollX += (this.scrollAlvo - this.scrollX) * Math.min(1, dt * 8);
  }

  aoTocar(x: number, y: number): void {
    if (this.mostrarOferta) {
      this.tocarNaOferta(x, y);
      return;
    }
    for (const b of this.botoes) {
      if (dentroDoBotao(b, x, y)) {
        somClique();
        registrarPressao(b.acao);
        this.executar(b.acao);
        return;
      }
    }
    const numero = this.noNaPosicao(x, y);
    if (numero !== null && numero <= this.jogo.dados.faseMaxima + 1) {
      somClique();
      this.jogo.irPara({ tela: "pre_fase", numero });
    }
  }

  private executar(acao: string): void {
    if (acao === "equipe") this.jogo.irPara({ tela: "equipe" });
    else if (acao === "caixa") this.jogo.irPara({ tela: "caixa" });
    else if (acao === "oferta") this.mostrarOferta = true;
    else if (acao === "mute") definirMute(this.alternarMute());
    else if (acao === "esq") this.scrollAlvo = this.limitarScroll(this.scrollAlvo - ESPACO_NO * 3);
    else if (acao === "dir") this.scrollAlvo = this.limitarScroll(this.scrollAlvo + ESPACO_NO * 3);
    else if (acao === "debug1h") adiantarUmaHora();
  }

  private alternarMute(): boolean {
    const novo = !estaMutado();
    this.jogo.dados.mute = novo;
    this.jogo.salvar();
    return novo;
  }

  private noNaPosicao(x: number, y: number): number | null {
    for (let n = 1; n <= this.maxFaseMostrada; n++) {
      const nx = (n - 1) * ESPACO_NO - this.scrollX;
      const ny = Y_TRILHA + Math.sin(n * 0.9) * 42;
      const r = ehChefe(n) ? 34 : 26;
      if (Math.hypot(x - nx, y - ny) <= r + 6) return n;
    }
    return null;
  }

  aoArrastarInicio(x: number): void {
    this.arrastando = true;
    this.arrastouDe = x;
    this.scrollInicio = this.scrollX;
  }
  aoArrastar(x: number): void {
    if (!this.arrastando || this.mostrarOferta) return;
    const d = this.arrastouDe - x;
    this.scrollX = this.limitarScroll(this.scrollInicio + d);
    this.scrollAlvo = this.scrollX;
  }
  aoArrastarFim(): void {
    this.arrastando = false;
  }

  // -------------------------------------------------------------- desenho

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.botoes = [];
    const dados = this.jogo.dados;

    const faseCentral = Math.max(1, Math.round(this.scrollX / ESPACO_NO) + 1);
    const bioma = biomaDaFase(faseCentral);
    desenharFundoPantanal(ctx, this.tempo, 0.08);
    ctx.fillStyle = `${bioma.cor}18`;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    this.desenharBanner(ctx);

    // trilha
    ctx.strokeStyle = "rgba(4, 40, 37, 0.42)";
    ctx.lineWidth = 10;
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let n = 1; n <= this.maxFaseMostrada; n++) {
      const nx = (n - 1) * ESPACO_NO - this.scrollX;
      const ny = Y_TRILHA + Math.sin(n * 0.9) * 42;
      if (n === 1) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,232,165,0.7)";
    ctx.lineWidth = 4;
    ctx.setLineDash([2, 14]);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let n = 1; n <= this.maxFaseMostrada; n++) {
      const nx = (n - 1) * ESPACO_NO - this.scrollX;
      const ny = Y_TRILHA + Math.sin(n * 0.9) * 42;
      if (n === 1) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const atual = dados.faseMaxima + 1;
    for (let n = 1; n <= this.maxFaseMostrada; n++) {
      const nx = (n - 1) * ESPACO_NO - this.scrollX;
      if (nx < -60 || nx > LARGURA + 60) continue;
      const ny = Y_TRILHA + Math.sin(n * 0.9) * 42;
      const marcaResgate = n === FASE_RESGATE && missaoResgateAtiva(dados);
      this.desenharNo(ctx, n, nx, ny, n === atual, n <= atual, dados.estrelas[String(n)] ?? 0, marcaResgate);
    }

    // cabeçalho
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(bioma.nome, 18, 96);
    desenharPilulaRecurso(ctx, LARGURA - 14, 96, "capim", dados.capim);
    desenharPilulaRecurso(ctx, LARGURA - 110, 96, "gema", dados.gemas);

    // setas
    const setaEsq: Botao = { x: 6, y: Y_TRILHA - 24, w: 40, h: 48, acao: "esq" };
    const setaDir: Botao = { x: LARGURA - 46, y: Y_TRILHA - 24, w: 40, h: 48, acao: "dir" };
    this.desenharSeta(ctx, setaEsq, "‹");
    this.desenharSeta(ctx, setaDir, "›");
    this.botoes.push(setaEsq, setaDir);

    // rodapé: [Caixa?] Equipe + mute
    const temCaixa = dados.evento.caixaLiberada;
    desenharPainelVidro(ctx, 10, ALTURA - 130, LARGURA - 20, 108, 22, "#7dd3a0", 0.64);
    if (temCaixa) {
      const caixa: Botao = { x: 16, y: ALTURA - 96, w: 96, h: 60, acao: "caixa" };
      const rotuloCaixa = dados.caixasGratisDisponiveis > 0
        ? `   Grátis ×${dados.caixasGratisDisponiveis}`
        : `   ${t("mapa_caixa")}`;
      desenharBotao(ctx, caixa, rotuloCaixa, { cor: "#b06fe0", tamanhoFonte: 14 });
      const arteCaixa = imagem("caixa-surto");
      if (arteCaixa) {
        const h = 32;
        const w = h * (arteCaixa.naturalWidth / arteCaixa.naturalHeight);
        ctx.drawImage(arteCaixa, caixa.x + 5, caixa.y + 12, w, h);
      }
      this.botoes.push(caixa);
      const equipe: Botao = { x: 122, y: ALTURA - 96, w: LARGURA - 200, h: 60, acao: "equipe" };
      desenharBotao(ctx, equipe, `⚔ ${t("mapa_equipe")}`, { cor: "#3d9c63", tamanhoFonte: 17 });
      this.botoes.push(equipe);
    } else {
      const equipe: Botao = { x: 40, y: ALTURA - 96, w: LARGURA - 120, h: 60, acao: "equipe" };
      desenharBotao(ctx, equipe, `⚔ ${t("mapa_equipe")}`, { cor: "#3d9c63", tamanhoFonte: 20 });
      this.botoes.push(equipe);
    }

    const mute: Botao = { x: LARGURA - 72, y: ALTURA - 94, w: 56, h: 56, acao: "mute" };
    this.desenharMute(ctx, mute);
    this.botoes.push(mute);

    // poder (guardiãs ATIVAS)
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`⚡ ${t("equipe_poder")}: ${poderDaEquipe(guardiasAtivas(GUARDIAS, dados), dados)}`, LARGURA / 2, ALTURA - 116);

    // botão de debug +1h
    if (ehDebug()) {
      const b: Botao = { x: 8, y: 8, w: 48, h: 30, acao: "debug1h" };
      tracarRetanguloArredondado(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t("debug_hora"), b.x + b.w / 2, b.y + b.h / 2);
      this.botoes.push(b);
    }

    if (this.mostrarOferta) this.desenharOferta(ctx);
  }

  // Banner de topo: muda conforme o estado do evento.
  private desenharBanner(ctx: CanvasRenderingContext2D): void {
    const dados = this.jogo.dados;
    const x = 14;
    const y = 116;
    const w = LARGURA - 28;
    const h = 44;

    let cor = "rgba(0,0,0,0.28)";
    let borda = "rgba(255,255,255,0.25)";
    let acao: string | null = null;

    if (missaoResgateAtiva(dados)) {
      cor = "rgba(120, 30, 30, 0.55)";
      borda = "#e0463d";
    } else if (dados.evento.sonequinha === "perdida") {
      cor = "rgba(60, 40, 80, 0.5)";
      borda = "rgba(180,140,220,0.5)";
    } else if (ofertaSerenaAtiva(dados)) {
      cor = "rgba(90, 70, 20, 0.55)";
      borda = "#ffd24a";
      acao = "oferta";
    }

    desenharPainelVidro(ctx, x, y, w, h, 12, borda.startsWith("#") ? borda : "#9ac8b5", 0.62);
    tracarRetanguloArredondado(ctx, x, y, w, h, 12);
    ctx.fillStyle = cor;
    ctx.fill();

    ctx.textBaseline = "middle";
    if (missaoResgateAtiva(dados)) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.fillText(t("missao_salve_titulo"), x + 12, y + 15);
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(t("missao_salve_desc"), x + 12, y + 32);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 16px system-ui, sans-serif";
      ctx.fillText(`⏳ ${formatarIntervalo(msRestantesResgate(dados))}`, x + w - 12, y + 22);
    } else if (dados.evento.sonequinha === "perdida") {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillText(t("missao_reabre"), LARGURA / 2, y + 15);
      ctx.fillStyle = "#c9a2e0";
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.fillText(`${t("missao_reabre_em")} ${formatarIntervalo(msRestantesReabertura(dados))}`, LARGURA / 2, y + 32);
    } else if (ofertaSerenaAtiva(dados)) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.fillText(t("oferta_banner"), x + 12, y + 16);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.fillText("Toque para ver a oferta", x + 12, y + 32);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.fillText(`⏳ ${formatarIntervalo(msRestantesOferta(dados))}`, x + w - 12, y + 22);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText(`✨ ${t("mapa_banner_evento")}`, LARGURA / 2, y + 22);
    }

    if (acao) this.botoes.push({ x, y, w, h, acao });
  }

  private desenharNo(
    ctx: CanvasRenderingContext2D,
    numero: number,
    x: number,
    y: number,
    atual: boolean,
    liberada: boolean,
    estrelas: number,
    marcaResgate: boolean,
  ): void {
    const chefe = ehChefe(numero);
    const r = chefe ? 32 : 25;

    if (atual || marcaResgate) {
      const pulso = 1 + 0.18 * Math.sin(this.tempo * 4);
      ctx.beginPath();
      ctx.ellipse(x, y + 5, r * 1.65 * pulso, r * 0.72 * pulso, 0, 0, Math.PI * 2);
      ctx.fillStyle = marcaResgate ? "rgba(224, 70, 61, 0.34)" : "rgba(255, 220, 130, 0.3)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.ellipse(x, y + 8, r * 1.18, r * 0.62, -0.08, 0, Math.PI * 2);
    ctx.fillStyle = liberada ? (atual ? "#c7a33a" : "#2f8d61") : "rgba(22,55,48,0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(213,245,197,0.42)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (!liberada) ctx.fillStyle = "rgba(20,30,26,0.75)";
    else if (chefe) ctx.fillStyle = "#b5462f";
    else ctx.fillStyle = atual ? "#f0b93c" : "#3d9c63";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = chefe ? "#ffd24a" : "rgba(255,255,255,0.7)";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!liberada) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText("🔒", x, y + 1);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${chefe ? 18 : 17}px system-ui, sans-serif`;
      ctx.fillText(String(numero), x, y + 1);
    }

    if (chefe) {
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText(marcaResgate ? "🆘" : "👑", x, y - r - 8);
    }

    if (estrelas > 0) {
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillStyle = "#ffd166";
      ctx.fillText("★".repeat(estrelas), x, y + r + 11);
    } else if (liberada && !atual) {
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("☆☆☆", x, y + r + 11);
    }

    if (atual) {
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`⚡${poderRecomendado(numero)}`, x, y + r + 24);
    }
  }

  private desenharSeta(ctx: CanvasRenderingContext2D, b: Botao, seta: string): void {
    tracarRetanguloArredondado(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "800 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seta, b.x + b.w / 2, b.y + b.h / 2);
  }

  private desenharMute(ctx: CanvasRenderingContext2D, b: Botao): void {
    tracarRetanguloArredondado(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fillStyle = "#1d5c3e";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(estaMutado() ? "🔇" : "🔊", b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  // ------------------------------------------------------- oferta da Serena

  private tocarNaOferta(x: number, y: number): void {
    const comprar: Botao = { x: 50, y: 480, w: LARGURA - 100, h: 56, acao: "comprar" };
    const fechar: Botao = { x: 50, y: 544, w: LARGURA - 100, h: 40, acao: "fechar" };
    if (dentroDoBotao(comprar, x, y)) {
      somClique();
      // O GitHub Pages não possui identidade, pedido server-side nem SDK IAP.
      // Nunca conceder uma compra real por um clique local: o botão apresenta
      // a oferta e deixa explícito onde a transação segura será habilitada.
      this.avisoCompraAte = this.tempo + 3;
    } else if (dentroDoBotao(fechar, x, y)) {
      somClique();
      marcarOfertaSerenaVista(this.jogo.dados);
      this.jogo.salvar();
      this.mostrarOferta = false;
    }
  }

  private desenharOferta(ctx: CanvasRenderingContext2D): void {
    const dados = this.jogo.dados;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const px = 34;
    const py = 130;
    const pw = LARGURA - 68;
    const ph = 485;
    desenharPainelVidro(ctx, px, py, pw, ph, 24, "#ffd24a", 0.9);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.fillText(t("oferta_serena_titulo"), LARGURA / 2, py + 34);

    const serena = guardiaPorId("grande_serena");
    const arteSerena = imagem("grande_serena");
    if (arteSerena) {
      const h = 150;
      const w = h * (arteSerena.naturalWidth / arteSerena.naturalHeight);
      const flutuar = Math.sin(this.tempo * 2) * 3;
      const aura = ctx.createRadialGradient(LARGURA / 2, py + 130, 12, LARGURA / 2, py + 130, 88);
      aura.addColorStop(0, "rgba(255, 231, 145, 0.48)");
      aura.addColorStop(0.55, "rgba(255, 196, 70, 0.2)");
      aura.addColorStop(1, "rgba(255, 196, 70, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(LARGURA / 2, py + 130, 88, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = this.tempo * 0.35 + i * Math.PI / 4;
        ctx.globalAlpha = 0.48 + 0.22 * Math.sin(this.tempo * 2 + i);
        ctx.fillStyle = "#ffe69a";
        ctx.beginPath();
        ctx.arc(LARGURA / 2 + Math.cos(a) * 72, py + 130 + Math.sin(a) * 58, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = "rgba(255, 210, 80, 0.5)";
      ctx.shadowBlur = 24;
      ctx.drawImage(arteSerena, LARGURA / 2 - w / 2, py + 52 + flutuar, w, h);
      ctx.restore();
    } else if (serena) desenharLendariaProcedural(ctx, serena, LARGURA / 2, py + 130, this.tempo);

    ctx.fillStyle = "#fff";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(t("oferta_serena_nome"), LARGURA / 2, py + 210);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(t("oferta_serena_desc"), LARGURA / 2, py + 236, pw - 30);

    // Compra direta em dinheiro; gemas continuam exclusivas para a Caixa.
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.fillText(PRECO_SERENA, LARGURA / 2, py + 274);

    // contador
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(`⏳ ${t("oferta_expira")} ${formatarIntervalo(msRestantesOferta(dados))}`, LARGURA / 2, py + 302);

    ctx.fillStyle = this.tempo < this.avisoCompraAte ? "#ffd166" : "rgba(255,255,255,0.68)";
    ctx.font = "650 12px system-ui, sans-serif";
    ctx.fillText(t("oferta_tiktok_indisponivel"), LARGURA / 2, py + 330, pw - 28);

    const comprar: Botao = { x: 50, y: 480, w: LARGURA - 100, h: 56, acao: "comprar" };
    desenharBotao(ctx, comprar, `${t("oferta_comprar")} ${PRECO_SERENA}`, {
      cor: "#3d9c63", tamanhoFonte: 18,
    });
    const fechar: Botao = { x: 50, y: 544, w: LARGURA - 100, h: 40, acao: "fechar" };
    desenharBotao(ctx, fechar, t("botao_voltar"), { cor: "#5a4a70", tamanhoFonte: 14 });
  }
}
