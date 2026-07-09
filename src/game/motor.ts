// Resolução lógica fixa (retrato, iPhone-first); o canvas escala pra caber na tela.
export const LARGURA = 390;
export const ALTURA = 780;

export interface Cena {
  atualizar(dt: number): void;
  desenhar(ctx: CanvasRenderingContext2D): void;
  aoTocar(x: number, y: number): void;
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

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.ajustarTamanho();
    window.addEventListener("resize", () => this.ajustarTamanho());

    this.canvas.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) * LARGURA) / r.width;
      const y = ((ev.clientY - r.top) * ALTURA) / r.height;
      this.cena?.aoTocar(x, y);
    });
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
    const quadro = (agora: number) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      this.cena?.atualizar(dt);
      if (this.cena) this.cena.desenhar(this.ctx);
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }
}
