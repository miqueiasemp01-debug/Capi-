import { relatarErroFatal } from "./erros";

// Resolução lógica fixa (retrato, iPhone-first); o canvas escala pra caber na tela.
export const LARGURA = 390;
export const ALTURA = 780;

export interface Cena {
  atualizar(dt: number): void;
  desenhar(ctx: CanvasRenderingContext2D): void;
  aoTocar(x: number, y: number): void;
  // opcionais: cenas que rolam (mapa) implementam pra receber o arrasto
  aoArrastarInicio?(x: number, y: number): void;
  aoArrastar?(x: number, y: number): void;
  aoArrastarFim?(): void;
}

export class Motor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly container: HTMLElement;
  private cena: Cena | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = LARGURA * dpr;
    this.canvas.height = ALTURA * dpr;
    container.appendChild(this.canvas);

    // Gancho apenas de desenvolvimento para a revisão visual automatizada do
    // Canvas. O Vite remove este bloco da versão publicada.
    if (import.meta.env.DEV) {
      (window as Window & { __capiCapturarQuadro?: () => string }).__capiCapturarQuadro =
        () => this.canvas.toDataURL("image/png");
      const captura = document.createElement("button");
      captura.id = "capi-capturar-quadro";
      captura.setAttribute("aria-label", "Capturar quadro do jogo");
      captura.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:.01;z-index:99;padding:0;border:0";
      captura.addEventListener("click", () => {
        captura.dataset.quadro = this.canvas.toDataURL("image/png");
      });
      container.appendChild(captura);
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.ajustarTamanho();
    window.addEventListener("resize", () => this.ajustarTamanho());
    this.instalarPonteiros();
  }

  private coord(ev: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) * LARGURA) / r.width,
      y: ((ev.clientY - r.top) * ALTURA) / r.height,
    };
  }

  // Ponteiro unificado: distingue TOQUE (dispara no up, curto) de ARRASTO
  // (move o suficiente). Assim o mapa desliza sem abrir fase por engano.
  private instalarPonteiros(): void {
    let baixo = false;
    let inicioX = 0;
    let inicioY = 0;
    let moveu = false;
    const LIMIAR = 8;

    this.canvas.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const { x, y } = this.coord(ev);
      baixo = true;
      moveu = false;
      inicioX = x;
      inicioY = y;
      this.canvas.setPointerCapture?.(ev.pointerId);
      this.cena?.aoArrastarInicio?.(x, y);
    });
    this.canvas.addEventListener("pointermove", (ev) => {
      if (!baixo) return;
      const { x, y } = this.coord(ev);
      if (Math.hypot(x - inicioX, y - inicioY) > LIMIAR) moveu = true;
      this.cena?.aoArrastar?.(x, y);
    });
    const soltar = (ev: PointerEvent) => {
      if (!baixo) return;
      baixo = false;
      const { x, y } = this.coord(ev);
      this.cena?.aoArrastarFim?.();
      if (!moveu) this.cena?.aoTocar(x, y);
    };
    this.canvas.addEventListener("pointerup", soltar);
    this.canvas.addEventListener("pointercancel", soltar);
  }

  trocarCena(cena: Cena): void {
    this.cena = cena;
  }

  private ajustarTamanho(): void {
    const escala = Math.min(
      this.container.clientWidth / LARGURA,
      this.container.clientHeight / ALTURA,
    );
    this.canvas.style.width = `${Math.floor(LARGURA * escala)}px`;
    this.canvas.style.height = `${Math.floor(ALTURA * escala)}px`;
  }

  iniciar(): void {
    let ultimo = performance.now();
    let errosSeguidos = 0;
    const quadro = (agora: number) => {
      // reagenda ANTES de qualquer trabalho: mesmo que o corpo lance,
      // o loop nunca morre em silêncio (a causa do "congela mudo").
      requestAnimationFrame(quadro);
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      try {
        this.cena?.atualizar(dt);
        if (this.cena) this.cena.desenhar(this.ctx);
        errosSeguidos = 0;
      } catch (erro) {
        // um soluço isolado a gente engole; falha persistente vira tela amigável
        console.error("[Capi] erro no quadro:", erro);
        if (++errosSeguidos >= 10) relatarErroFatal(erro);
      }
    };
    requestAnimationFrame(quadro);
  }
}
