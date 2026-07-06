import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import type { FaseDef, GuardiaDef, InimigoDef } from "../game/tipos";
import { GUARDIAS, fasePorId, inimigoPorId } from "../game/conteudo";
import { danoDaGuardia, danoDoToque, nivelDaGuardia } from "../game/economia";
import { desenharCapi, desenharGuardia, desenharInimigo } from "../game/desenhos";
import { desenharBotao, dentroDoBotao, tracarRetanguloArredondado, type Botao } from "../game/ui";
import { t } from "../i18n/textos";

const CENTRO_X = LARGURA / 2;
const CENTRO_Y = 375;
const RAIO_CAPI = 30;
const RAIO_GUARDIAS = 95;
const DISTANCIA_SPAWN = 480;
const JANELA_COMBO = 1.5;
const RAIO_TOQUE = 24;

interface Inimigo {
  def: InimigoDef;
  x: number;
  y: number;
  hp: number;
  faseZig: number;
  lentoAte: number;
  presoAte: number;
  estado: "nadando" | "dormindo";
  dormiuEm: number;
}

interface EventoSpawn {
  tempo: number;
  tipo: string;
}

interface GuardiaEmCampo {
  def: GuardiaDef;
  nivel: number;
  x: number;
  y: number;
  proximoAtaque: number;
  habilidadeProntaEm: number;
  botao: { x: number; y: number; raio: number };
}

interface Raio {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cor: string;
  fim: number;
}

interface Flutuante {
  texto: string;
  x: number;
  y: number;
  nasceu: number;
  cor: string;
}

interface Onda {
  x: number;
  y: number;
  nasceu: number;
  cor: string;
}

type EstadoFase = "jogando" | "vitoria" | "derrota";

export class CenaFase implements Cena {
  private readonly fase: FaseDef;
  private tempo = 0;
  private estado: EstadoFase = "jogando";
  private calma: number;
  private capimColetado = 0;
  private combo = 0;
  private ultimoAcerto = -99;
  private estrelas = 0;

  private readonly eventos: EventoSpawn[];
  private proximoEvento = 0;
  private inimigos: Inimigo[] = [];
  private readonly guardias: GuardiaEmCampo[];
  private raios: Raio[] = [];
  private flutuantes: Flutuante[] = [];
  private ondas: Onda[] = [];
  private botoesFim: Botao[] = [];

  constructor(
    private readonly jogo: Jogo,
    faseId: string,
  ) {
    this.fase = fasePorId(faseId);
    this.calma = this.fase.calmaMax;

    this.eventos = this.fase.spawns
      .flatMap((s) =>
        Array.from({ length: s.quantidade }, (_, i) => ({
          tempo: s.tempo + i * s.intervalo,
          tipo: s.tipo,
        })),
      )
      .sort((a, b) => a.tempo - b.tempo);

    this.guardias = GUARDIAS.map((def, indice) => {
      const rad = (def.anguloGrau * Math.PI) / 180;
      return {
        def,
        nivel: nivelDaGuardia(jogo.dados, def.id),
        x: CENTRO_X + Math.cos(rad) * RAIO_GUARDIAS,
        y: CENTRO_Y + Math.sin(rad) * RAIO_GUARDIAS,
        proximoAtaque: 0,
        habilidadeProntaEm: 0,
        botao: { x: 130 + indice * 130, y: 715, raio: 32 },
      };
    });
  }

  // ---------------------------------------------------------------- lógica

  atualizar(dt: number): void {
    this.tempo += dt;
    if (this.estado !== "jogando") return;

    while (
      this.proximoEvento < this.eventos.length &&
      this.eventos[this.proximoEvento].tempo <= this.tempo
    ) {
      this.criarInimigo(this.eventos[this.proximoEvento].tipo);
      this.proximoEvento++;
    }

    this.moverInimigos(dt);
    this.atacarComGuardias();
    this.limparEfeitos();

    if (this.tempo - this.ultimoAcerto > JANELA_COMBO) this.combo = 0;

    const acabaramSpawns = this.proximoEvento >= this.eventos.length;
    const semNadadores = !this.inimigos.some((i) => i.estado === "nadando");
    if (acabaramSpawns && semNadadores) this.vencer();
  }

  private criarInimigo(tipo: string): void {
    const def = inimigoPorId(tipo);
    const angulo = Math.random() * Math.PI * 2;
    this.inimigos.push({
      def,
      x: CENTRO_X + Math.cos(angulo) * DISTANCIA_SPAWN,
      y: CENTRO_Y + Math.sin(angulo) * DISTANCIA_SPAWN,
      hp: def.hp,
      faseZig: Math.random() * Math.PI * 2,
      lentoAte: 0,
      presoAte: 0,
      estado: "nadando",
      dormiuEm: 0,
    });
  }

  private moverInimigos(dt: number): void {
    for (const inimigo of this.inimigos) {
      if (inimigo.estado !== "nadando") continue;
      if (inimigo.presoAte > this.tempo) continue;

      const paraX = CENTRO_X - inimigo.x;
      const paraY = CENTRO_Y - inimigo.y;
      const dist = Math.hypot(paraX, paraY) || 1;
      const fator = inimigo.lentoAte > this.tempo ? 0.6 : 1;
      const vel = inimigo.def.velocidade * fator;

      inimigo.x += (paraX / dist) * vel * dt;
      inimigo.y += (paraY / dist) * vel * dt;

      if (inimigo.def.comportamento === "zigzag") {
        const perpX = -paraY / dist;
        const perpY = paraX / dist;
        const balanco = Math.sin(this.tempo * 5 + inimigo.faseZig) * 55 * dt;
        inimigo.x += perpX * balanco;
        inimigo.y += perpY * balanco;
      }

      if (dist < RAIO_CAPI + inimigo.def.raio) {
        this.calma -= inimigo.def.dano;
        this.flutuantes.push({
          texto: `-${inimigo.def.dano}`,
          x: CENTRO_X,
          y: CENTRO_Y - 44,
          nasceu: this.tempo,
          cor: "#ff8a95",
        });
        inimigo.estado = "dormindo"; // esbarrou na paz da Capi e desistiu
        inimigo.dormiuEm = this.tempo;
        if (this.calma <= 0) {
          this.calma = 0;
          this.perder();
          return;
        }
      }
    }
  }

  private atacarComGuardias(): void {
    for (const guardia of this.guardias) {
      if (this.tempo < guardia.proximoAtaque) continue;

      let alvo: Inimigo | null = null;
      let menorDist = guardia.def.alcance;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando") continue;
        const dist = Math.hypot(inimigo.x - guardia.x, inimigo.y - guardia.y);
        if (dist < menorDist) {
          menorDist = dist;
          alvo = inimigo;
        }
      }
      if (!alvo) continue;

      guardia.proximoAtaque = this.tempo + guardia.def.cadenciaS;
      this.raios.push({
        x0: guardia.x,
        y0: guardia.y,
        x1: alvo.x,
        y1: alvo.y,
        cor: guardia.def.cor,
        fim: this.tempo + 0.15,
      });
      if (guardia.def.id === "sonequinha") alvo.lentoAte = this.tempo + 1;
      this.causarDano(alvo, danoDaGuardia(guardia.def, guardia.nivel));
    }
  }

  private causarDano(inimigo: Inimigo, dano: number): void {
    inimigo.hp -= dano;
    if (inimigo.hp <= 0 && inimigo.estado === "nadando") this.adormecer(inimigo);
  }

  private adormecer(inimigo: Inimigo): void {
    inimigo.estado = "dormindo";
    inimigo.dormiuEm = this.tempo;
    this.capimColetado += inimigo.def.capim;
    this.flutuantes.push(
      { texto: "💤", x: inimigo.x, y: inimigo.y - 14, nasceu: this.tempo, cor: "#cfe6ff" },
      {
        texto: `+${inimigo.def.capim}🌿`,
        x: inimigo.x,
        y: inimigo.y + 8,
        nasceu: this.tempo + 0.12,
        cor: "#9fdf8f",
      },
    );
  }

  private limparEfeitos(): void {
    this.inimigos = this.inimigos.filter(
      (i) => i.estado === "nadando" || this.tempo - i.dormiuEm < 1.1,
    );
    this.raios = this.raios.filter((r) => r.fim > this.tempo);
    this.flutuantes = this.flutuantes.filter((f) => this.tempo - f.nasceu < 1.2);
    this.ondas = this.ondas.filter((o) => this.tempo - o.nasceu < 0.45);
  }

  private vencer(): void {
    this.estado = "vitoria";
    const proporcao = this.calma / this.fase.calmaMax;
    this.estrelas = proporcao >= 0.8 ? 3 : proporcao >= 0.5 ? 2 : 1;

    const dados = this.jogo.dados;
    dados.capim += this.fase.capimVitoria + this.capimColetado;
    dados.faseMaxima = Math.max(dados.faseMaxima, this.fase.numero);
    dados.estrelas[this.fase.id] = Math.max(dados.estrelas[this.fase.id] ?? 0, this.estrelas);
    this.jogo.salvar();
  }

  private perder(): void {
    this.estado = "derrota";
    this.jogo.dados.capim += this.capimColetado;
    this.jogo.salvar();
  }

  // ---------------------------------------------------------------- toque

  aoTocar(x: number, y: number): void {
    if (this.estado !== "jogando") {
      for (const botao of this.botoesFim) {
        if (!dentroDoBotao(botao, x, y)) continue;
        if (botao.acao === "equipe") this.jogo.irPara({ tela: "equipe" });
        if (botao.acao === "repetir") this.jogo.irPara({ tela: "fase", faseId: this.fase.id });
      }
      return;
    }

    for (const guardia of this.guardias) {
      const dist = Math.hypot(x - guardia.botao.x, y - guardia.botao.y);
      if (dist <= guardia.botao.raio) {
        this.usarHabilidade(guardia);
        return;
      }
    }

    this.toqueDeCalma(x, y);
  }

  private toqueDeCalma(x: number, y: number): void {
    let alvo: Inimigo | null = null;
    let menorDist = Infinity;
    for (const inimigo of this.inimigos) {
      if (inimigo.estado !== "nadando") continue;
      const dist = Math.hypot(inimigo.x - x, inimigo.y - y);
      if (dist <= inimigo.def.raio + RAIO_TOQUE && dist < menorDist) {
        menorDist = dist;
        alvo = inimigo;
      }
    }

    if (!alvo) {
      this.combo = 0;
      this.ondas.push({ x, y, nasceu: this.tempo, cor: "rgba(255,255,255,0.5)" });
      return;
    }

    this.combo = this.tempo - this.ultimoAcerto <= JANELA_COMBO ? this.combo + 1 : 1;
    this.ultimoAcerto = this.tempo;

    const bonus = 1 + 0.12 * Math.min(this.combo - 1, 10);
    const dano = danoDoToque(this.jogo.dados.toqueNivel) * bonus;
    this.ondas.push({ x: alvo.x, y: alvo.y, nasceu: this.tempo, cor: "rgba(255,235,170,0.9)" });
    this.causarDano(alvo, dano);
  }

  private usarHabilidade(guardia: GuardiaEmCampo): void {
    if (this.tempo < guardia.habilidadeProntaEm) return;
    const hab = guardia.def.habilidade;

    if (hab.tipo === "imobilizar_forte") {
      let alvo: Inimigo | null = null;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando") continue;
        if (!alvo || inimigo.def.hp > alvo.def.hp || (inimigo.def.hp === alvo.def.hp && inimigo.hp > alvo.hp)) {
          alvo = inimigo;
        }
      }
      if (!alvo) return;
      alvo.presoAte = this.tempo + hab.duracaoS;
      this.ondas.push({ x: alvo.x, y: alvo.y, nasceu: this.tempo, cor: guardia.def.cor });
      this.flutuantes.push({ texto: "🪢", x: alvo.x, y: alvo.y - 18, nasceu: this.tempo, cor: "#fff" });
    } else {
      let pegouAlguem = false;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando") continue;
        const dist = Math.hypot(inimigo.x - CENTRO_X, inimigo.y - CENTRO_Y);
        if (dist <= 185) {
          inimigo.presoAte = Math.max(inimigo.presoAte, this.tempo + hab.duracaoS);
          this.flutuantes.push({ texto: "💤", x: inimigo.x, y: inimigo.y - 16, nasceu: this.tempo, cor: "#d9c9ff" });
          pegouAlguem = true;
        }
      }
      if (!pegouAlguem) return;
      this.ondas.push({ x: CENTRO_X, y: CENTRO_Y, nasceu: this.tempo, cor: guardia.def.cor });
    }

    guardia.habilidadeProntaEm = this.tempo + hab.recargaS;
  }

  // --------------------------------------------------------------- desenho

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.desenharLago(ctx);

    for (const guardia of this.guardias) desenharGuardia(ctx, guardia.def, guardia.x, guardia.y);
    desenharCapi(ctx, CENTRO_X, CENTRO_Y, RAIO_CAPI, this.tempo);

    for (const raio of this.raios) {
      ctx.strokeStyle = raio.cor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(raio.x0, raio.y0);
      ctx.lineTo(raio.x1, raio.y1);
      ctx.stroke();
    }

    for (const inimigo of this.inimigos) {
      desenharInimigo(ctx, inimigo.def, inimigo.x, inimigo.y, this.tempo, inimigo.estado === "dormindo");
      if (inimigo.estado === "nadando" && inimigo.hp < inimigo.def.hp) {
        const larguraBarra = inimigo.def.raio * 2;
        const proporcao = Math.max(0, inimigo.hp / inimigo.def.hp);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(inimigo.x - larguraBarra / 2, inimigo.y - inimigo.def.raio - 9, larguraBarra, 4);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(inimigo.x - larguraBarra / 2, inimigo.y - inimigo.def.raio - 9, larguraBarra * proporcao, 4);
      }
    }

    for (const onda of this.ondas) {
      const idade = (this.tempo - onda.nasceu) / 0.45;
      ctx.strokeStyle = onda.cor;
      ctx.globalAlpha = 1 - idade;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(onda.x, onda.y, 12 + idade * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const flutuante of this.flutuantes) {
      const idade = Math.max(0, this.tempo - flutuante.nasceu);
      ctx.globalAlpha = Math.max(0, 1 - idade / 1.2);
      ctx.fillStyle = flutuante.cor;
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.fillText(flutuante.texto, flutuante.x, flutuante.y - idade * 30);
      ctx.globalAlpha = 1;
    }

    this.desenharHud(ctx);
    this.desenharBotoesHabilidade(ctx);
    if (this.estado !== "jogando") this.desenharFim(ctx);
  }

  private desenharLago(ctx: CanvasRenderingContext2D): void {
    const gradiente = ctx.createRadialGradient(CENTRO_X, CENTRO_Y, 60, CENTRO_X, CENTRO_Y, 420);
    gradiente.addColorStop(0, "#1d6b52");
    gradiente.addColorStop(1, "#0b3d2e");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const raio = 70 + i * 60 + Math.sin(this.tempo * 1.5 + i) * 4;
      ctx.beginPath();
      ctx.arc(CENTRO_X, CENTRO_Y, raio, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private desenharHud(ctx: CanvasRenderingContext2D): void {
    // barra de Calma
    const larguraBarra = 190;
    const x0 = CENTRO_X - larguraBarra / 2;
    tracarRetanguloArredondado(ctx, x0 - 4, 16, larguraBarra + 8, 24, 12);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    const proporcao = Math.max(0, this.calma / this.fase.calmaMax);
    if (proporcao > 0) {
      tracarRetanguloArredondado(ctx, x0, 20, larguraBarra * proporcao, 16, 8);
      ctx.fillStyle = proporcao > 0.5 ? "#7dd3a0" : proporcao > 0.25 ? "#e5b74a" : "#e06a5a";
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${t("hud_calma")} ${this.calma}/${this.fase.calmaMax}`, CENTRO_X, 28);

    ctx.textAlign = "left";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillText(`${t("fase_rotulo")} ${this.fase.id}`, 14, 28);

    ctx.textAlign = "right";
    ctx.fillStyle = "#9fdf8f";
    ctx.fillText(`🌿 ${this.capimColetado}`, LARGURA - 14, 28);

    if (this.combo >= 2 && this.estado === "jogando") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.fillText(`${t("hud_combo")} x${this.combo}`, CENTRO_X, 58);
    }
  }

  private desenharBotoesHabilidade(ctx: CanvasRenderingContext2D): void {
    for (const guardia of this.guardias) {
      const { x, y, raio } = guardia.botao;
      const pronta = this.tempo >= guardia.habilidadeProntaEm;

      ctx.beginPath();
      ctx.arc(x, y, raio, 0, Math.PI * 2);
      ctx.fillStyle = pronta ? guardia.def.cor : "#3c4a52";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pronta ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)";
      ctx.stroke();

      if (!pronta) {
        const restante = guardia.habilidadeProntaEm - this.tempo;
        const fracao = restante / guardia.def.habilidade.recargaS;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, raio, -Math.PI / 2, -Math.PI / 2 + fracao * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guardia.def.nome[0], x, y + 1);

      ctx.font = "600 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(guardia.def.habilidade.nome, x, y + raio + 13);
    }
  }

  private desenharFim(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(6, 26, 20, 0.78)";
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const painel = { x: 35, y: 225, w: LARGURA - 70, h: 320 };
    tracarRetanguloArredondado(ctx, painel.x, painel.y, painel.w, painel.h, 20);
    ctx.fillStyle = "#12442f";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();

    const vitoria = this.estado === "vitoria";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = vitoria ? "#9fdf8f" : "#ff9aa4";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(vitoria ? t("fase_vitoria") : t("fase_derrota"), CENTRO_X, painel.y + 45);

    this.botoesFim = [];

    if (vitoria) {
      ctx.font = "400 38px system-ui, sans-serif";
      const estrelasTexto = "★".repeat(this.estrelas) + "☆".repeat(3 - this.estrelas);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(estrelasTexto, CENTRO_X, painel.y + 105);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 17px system-ui, sans-serif";
      ctx.fillText(
        `${t("fase_capim_ganho")}: +${this.fase.capimVitoria + this.capimColetado} 🌿`,
        CENTRO_X,
        painel.y + 160,
      );

      const continuar: Botao = { x: painel.x + 30, y: painel.y + 200, w: painel.w - 60, h: 52, acao: "equipe" };
      desenharBotao(ctx, continuar, t("botao_continuar"), { cor: "#3d9c63" });
      this.botoesFim.push(continuar);

      const repetir: Botao = { x: painel.x + 30, y: painel.y + 262, w: painel.w - 60, h: 40, acao: "repetir" };
      desenharBotao(ctx, repetir, t("botao_repetir"), { cor: "#26604a", tamanhoFonte: 15 });
      this.botoesFim.push(repetir);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 15px system-ui, sans-serif";
      ctx.fillText(t("fase_derrota_dica"), CENTRO_X, painel.y + 95);

      if (this.capimColetado > 0) {
        ctx.fillStyle = "#9fdf8f";
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.fillText(`${t("fase_capim_ganho")}: +${this.capimColetado} 🌿`, CENTRO_X, painel.y + 130);
      }

      // o botão do plano: derrota vira convite pra evoluir, não beco sem saída
      const evoluir: Botao = { x: painel.x + 30, y: painel.y + 170, w: painel.w - 60, h: 56, acao: "equipe" };
      desenharBotao(ctx, evoluir, `${t("botao_evoluir")} 🌿`, { cor: "#3d9c63", tamanhoFonte: 20 });
      this.botoesFim.push(evoluir);

      const repetir: Botao = { x: painel.x + 30, y: painel.y + 240, w: painel.w - 60, h: 44, acao: "repetir" };
      desenharBotao(ctx, repetir, t("botao_repetir"), { cor: "#26604a", tamanhoFonte: 15 });
      this.botoesFim.push(repetir);
    }
  }
}
