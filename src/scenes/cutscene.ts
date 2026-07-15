import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import { marcarCutsceneVista } from "../game/evento";
import { desenharGuardia } from "../game/desenhos";
import { guardiaPorId } from "../game/conteudo";
import { desenharBotao, tracarRetanguloArredondado, type Botao } from "../game/ui";
import * as sfx from "../game/sfx";
import { t } from "../i18n/textos";

// Mini-cutscene em canvas. "surto" = 2 painéis (a Sonequinha é levada);
// "cura" = painel único de celebração ("ela voltou!").
export class CenaCutscene implements Cena {
  private tempo = 0;
  private painel = 0;
  private readonly totalPaineis: number;
  private botao: Botao | null = null;
  private soouEntrada = false;

  constructor(
    private readonly jogo: Jogo,
    private readonly tipo: "surto" | "cura",
  ) {
    this.totalPaineis = tipo === "surto" ? 2 : 1;
  }

  atualizar(dt: number): void {
    this.tempo += dt;
    if (!this.soouEntrada && this.tempo > 0.15) {
      this.soouEntrada = true;
      if (this.tipo === "surto") sfx.somSurto();
      else sfx.somConquista();
    }
  }

  aoTocar(x: number, y: number): void {
    if (this.botao && x >= this.botao.x && x <= this.botao.x + this.botao.w && y >= this.botao.y && y <= this.botao.y + this.botao.h) {
      sfx.somClique();
      this.avancar();
      return;
    }
    // tocar em qualquer lugar avança os painéis de história
    if (this.tempo > 0.5) this.avancar();
  }

  private avancar(): void {
    if (this.painel < this.totalPaineis - 1) {
      this.painel++;
      this.tempo = 0;
      this.soouEntrada = false;
      if (this.tipo === "surto") sfx.somSurto();
      return;
    }
    // fim da cutscene
    marcarCutsceneVista(this.jogo.dados, this.tipo);
    this.jogo.salvar();
    this.jogo.irPara({ tela: "mapa" });
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    // fundo escuro dramático
    const fundo = ctx.createLinearGradient(0, 0, 0, ALTURA);
    if (this.tipo === "surto") {
      fundo.addColorStop(0, "#2a1230");
      fundo.addColorStop(1, "#0a0410");
    } else {
      fundo.addColorStop(0, "#16563f");
      fundo.addColorStop(1, "#0b3d2e");
    }
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    if (this.tipo === "surto") this.desenharSurto(ctx);
    else this.desenharCura(ctx);

    // botão / dica de avançar
    const entrou = Math.min(1, this.tempo / 0.5);
    ctx.globalAlpha = entrou;
    const ultimo = this.painel === this.totalPaineis - 1;
    this.botao = { x: 60, y: ALTURA - 120, w: LARGURA - 120, h: 54, acao: "avancar" };
    desenharBotao(ctx, this.botao, ultimo ? (this.tipo === "surto" ? "Aceitar missão" : "Continuar") : "Continuar ▶", { cor: "#3d9c63" });
    ctx.globalAlpha = 1;
  }

  private desenharSurto(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // título tremendo
    const treme = Math.sin(this.tempo * 40) * 2 * Math.max(0, 1 - this.tempo);
    ctx.fillStyle = "#e0463d";
    ctx.font = "800 30px system-ui, sans-serif";
    ctx.fillText(t("surto_titulo"), LARGURA / 2 + treme, 90);

    // painel de arte no centro
    const cx = LARGURA / 2;
    const cy = 320;

    if (this.painel === 0) {
      // Sonequinha bocejando, ainda em paz
      const sq = guardiaPorId("sonequinha");
      if (sq) desenharGuardia(ctx, sq, cx, cy, this.tempo);
      // "Zzz" saindo
      ctx.fillStyle = "rgba(200,200,255,0.8)";
      ctx.font = "700 26px system-ui, sans-serif";
      ctx.fillText("z", cx + 45, cy - 40 - (this.tempo * 20) % 40);
      this.legenda(ctx, t("surto_painel1"));
    } else {
      // painel 2: espiral do Surto engolindo, olhos de espiral
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.tempo * 3);
      ctx.strokeStyle = "rgba(180, 90, 220, 0.7)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 8; a += 0.2) {
        const r = a * 6;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // olhos de espiral
      for (const lado of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + lado * 18, cy);
        ctx.rotate(-this.tempo * 5);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.2) {
          const r = a * 1.6;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      this.legenda(ctx, t("surto_painel2"));
    }

    // pontinhos de painel
    for (let i = 0; i < this.totalPaineis; i++) {
      ctx.beginPath();
      ctx.arc(LARGURA / 2 - 12 + i * 24, ALTURA - 150, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === this.painel ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.fill();
    }
  }

  private desenharCura(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // raios de luz girando atrás
    ctx.save();
    ctx.translate(LARGURA / 2, 300);
    ctx.rotate(this.tempo * 0.6);
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.fillStyle = "rgba(255, 230, 150, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(240, -24);
      ctx.lineTo(240, 24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const sq = guardiaPorId("sonequinha");
    if (sq) desenharGuardia(ctx, sq, LARGURA / 2, 300, this.tempo, "plena");

    const pop = 1 + 0.2 * Math.max(0, 1 - this.tempo / 0.4);
    ctx.save();
    ctx.translate(LARGURA / 2, 130);
    ctx.scale(pop, pop);
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 34px system-ui, sans-serif";
    ctx.fillText(t("cura_titulo"), 0, 0);
    ctx.restore();

    this.legenda(ctx, t("cura_texto"));
  }

  private legenda(ctx: CanvasRenderingContext2D, texto: string): void {
    const y = 440;
    tracarRetanguloArredondado(ctx, 30, y, LARGURA - 60, 70, 14);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // quebra simples em 2 linhas se longo
    const palavras = texto.split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const p of palavras) {
      if ((atual + " " + p).length > 34) {
        linhas.push(atual);
        atual = p;
      } else atual = atual ? atual + " " + p : p;
    }
    if (atual) linhas.push(atual);
    linhas.forEach((l, i) => ctx.fillText(l, LARGURA / 2, y + 35 + (i - (linhas.length - 1) / 2) * 20));
  }
}
