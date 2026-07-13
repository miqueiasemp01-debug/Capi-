import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { biomaDaFase, ehChefe, poderRecomendado } from "../game/procedural";
import { GUARDIAS } from "../game/conteudo";
import { poderDaEquipe } from "../game/economia";
import { desenharBotao, tracarRetanguloArredondado, registrarPressao, type Botao } from "../game/ui";
import { desenharPilulaRecurso } from "../game/icones";
import { estaMutado, definirMute, somClique } from "../game/sfx";
import { t } from "../i18n/textos";

const ESPACO_NO = 96; // distância horizontal entre nós
const Y_TRILHA = 300;
const FASES_VISIVEIS_ALEM = 6; // quantas fases além da máxima aparecem

export class CenaMapa implements Cena {
  private tempo = 0;
  private scrollX = 0;
  private scrollAlvo = 0;
  private arrastando = false;
  private arrastouDe = 0;
  private scrollInicio = 0;
  private moveu = false;
  private maxFaseMostrada: number;
  private botoes: Botao[] = [];

  constructor(private readonly jogo: Jogo) {
    // mostra até um tanto além da última liberada; mínimo 8 nós
    this.maxFaseMostrada = Math.max(8, jogo.dados.faseMaxima + FASES_VISIVEIS_ALEM);
    // centraliza no nó "atual" (próxima fase a jogar)
    const atual = jogo.dados.faseMaxima + 1;
    this.scrollAlvo = this.scrollDoNo(atual);
    this.scrollX = this.scrollAlvo;
  }

  private scrollDoNo(numero: number): number {
    // posição X do nó no mundo, menos metade da tela pra centralizar
    return (numero - 1) * ESPACO_NO - LARGURA / 2 + 40;
  }

  private limitarScroll(v: number): number {
    const min = this.scrollDoNo(1);
    const max = this.scrollDoNo(this.maxFaseMostrada);
    return Math.max(min, Math.min(max, v));
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    if (!this.arrastando) {
      this.scrollX += (this.scrollAlvo - this.scrollX) * Math.min(1, dt * 8);
    }
  }

  // O motor só entrega toques simples; simulo arrasto por pointer aqui via
  // aoTocar (down) + heurística de distância no próprio clique não basta,
  // então uso os handlers de pointer globais registrados no construtor? Não —
  // mantemos simples: toque = tenta abrir nó; arrasto é feito por gesto nativo
  // interpretado como toques sucessivos. Para deslizar de fato, uso os botões
  // de seta nas bordas + arrasto por pointermove ligado ao canvas.
  aoTocar(x: number, y: number): void {
    // se tocou num botão de UI, executa
    for (const b of this.botoes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        somClique();
        registrarPressao(b.acao);
        this.executar(b.acao);
        return;
      }
    }
    // senão, tenta abrir um nó de fase
    const numero = this.noNaPosicao(x, y);
    if (numero !== null && numero <= this.jogo.dados.faseMaxima + 1) {
      somClique();
      this.jogo.irPara({ tela: "fase", numero });
    }
  }

  private executar(acao: string): void {
    if (acao === "equipe") this.jogo.irPara({ tela: "equipe" });
    else if (acao === "titulo") this.jogo.irPara({ tela: "titulo" });
    else if (acao === "mute") definirMute(this.alternarMute());
    else if (acao === "esq") this.scrollAlvo = this.limitarScroll(this.scrollAlvo - ESPACO_NO * 3);
    else if (acao === "dir") this.scrollAlvo = this.limitarScroll(this.scrollAlvo + ESPACO_NO * 3);
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

  // suporte a arrasto: chamados pelo motor via ponteiros (ver conexão em motor)
  aoArrastarInicio(x: number): void {
    this.arrastando = true;
    this.arrastouDe = x;
    this.scrollInicio = this.scrollX;
    this.moveu = false;
  }
  aoArrastar(x: number): void {
    if (!this.arrastando) return;
    const d = this.arrastouDe - x;
    if (Math.abs(d) > 6) this.moveu = true;
    this.scrollX = this.limitarScroll(this.scrollInicio + d);
    this.scrollAlvo = this.scrollX;
  }
  aoArrastarFim(): void {
    this.arrastando = false;
  }
  arrastouDeVerdade(): boolean {
    return this.moveu;
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.botoes = [];
    const dados = this.jogo.dados;

    // fundo do bioma do trecho central visível
    const faseCentral = Math.max(1, Math.round(this.scrollX / ESPACO_NO) + 1);
    const bioma = biomaDaFase(faseCentral);
    const grad = ctx.createLinearGradient(0, 0, 0, ALTURA);
    grad.addColorStop(0, bioma.cor);
    grad.addColorStop(1, "#0b3d2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    // banner de evento reservado no topo
    this.desenharBannerEvento(ctx);

    // trilha (linha ligando os nós)
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 6;
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

    // nós
    const atual = dados.faseMaxima + 1;
    for (let n = 1; n <= this.maxFaseMostrada; n++) {
      const nx = (n - 1) * ESPACO_NO - this.scrollX;
      if (nx < -60 || nx > LARGURA + 60) continue;
      const ny = Y_TRILHA + Math.sin(n * 0.9) * 42;
      this.desenharNo(ctx, n, nx, ny, n === atual, n <= atual, dados.estrelas[String(n)] ?? 0);
    }

    // cabeçalho
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(bioma.nome, 18, 96);
    desenharPilulaRecurso(ctx, LARGURA - 14, 96, "capim", dados.capim);
    desenharPilulaRecurso(ctx, LARGURA - 110, 96, "gema", dados.gemas);

    // setas de navegação
    const setaEsq: Botao = { x: 6, y: Y_TRILHA - 24, w: 40, h: 48, acao: "esq" };
    const setaDir: Botao = { x: LARGURA - 46, y: Y_TRILHA - 24, w: 40, h: 48, acao: "dir" };
    this.desenharSeta(ctx, setaEsq, "‹");
    this.desenharSeta(ctx, setaDir, "›");

    // rodapé: botão flutuante da Equipe + mute
    const equipe: Botao = { x: 40, y: ALTURA - 96, w: LARGURA - 120, h: 60, acao: "equipe" };
    desenharBotao(ctx, equipe, `⚔ ${t("mapa_equipe")}`, { cor: "#3d9c63", tamanhoFonte: 20 });
    this.botoes.push(equipe);

    const mute: Botao = { x: LARGURA - 72, y: ALTURA - 94, w: 56, h: 56, acao: "mute" };
    this.desenharMute(ctx, mute);
    this.botoes.push(mute, setaEsq, setaDir);

    // dica de poder atual (discreta)
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`⚡ ${t("equipe_poder")}: ${poderDaEquipe(GUARDIAS, dados)}`, LARGURA / 2, ALTURA - 118);
  }

  private desenharBannerEvento(ctx: CanvasRenderingContext2D): void {
    const x = 14;
    const y = 116;
    const w = LARGURA - 28;
    tracarRetanguloArredondado(ctx, x, y, w, 40, 12);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`✨ ${t("mapa_banner_evento")}`, LARGURA / 2, y + 20);
  }

  private desenharNo(
    ctx: CanvasRenderingContext2D,
    numero: number,
    x: number,
    y: number,
    atual: boolean,
    liberada: boolean,
    estrelas: number,
  ): void {
    const chefe = ehChefe(numero);
    const r = chefe ? 32 : 25;

    if (atual) {
      // halo pulsando no nó atual
      const pulso = 1 + 0.18 * Math.sin(this.tempo * 4);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5 * pulso, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 220, 130, 0.22)";
      ctx.fill();
    }

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
      // coroa
      ctx.fillStyle = "#ffd24a";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText("👑", x, y - r - 8);
    }

    // estrelas conquistadas
    if (estrelas > 0) {
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillStyle = "#ffd166";
      ctx.fillText("★".repeat(estrelas), x, y + r + 11);
    } else if (liberada && !atual) {
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("☆☆☆", x, y + r + 11);
    }

    // poder recomendado abaixo (discreto) no nó atual
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
}
