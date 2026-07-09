import { LARGURA, ALTURA, type Cena } from "../game/motor";
import type { Jogo } from "../game/contexto";
import type { GuardiaDef, FaseGerada, InimigoInstancia } from "../game/tipos";
import { GUARDIAS } from "../game/conteudo";
import { gerarFase } from "../game/procedural";
import {
  CAPI_INTERVALO_ONDA_S,
  calmaMaximaBonus,
  danoDaCapi,
  danoDaGuardia,
  danoDoToque,
  estagioDaGuardia,
  nivelDaGuardia,
} from "../game/economia";
import { desenharCapi, desenharChefe, desenharGuardia, desenharImagemCobrindo, desenharInimigo } from "../game/desenhos";
import { imagem } from "../game/imagens";
import { desenharIconeCapim, desenharPilulaRecurso } from "../game/icones";
import { mostrarToast, desenharToasts } from "../game/toasts";
import * as sfx from "../game/sfx";
import {
  CORES_RARIDADE,
  desenharBotao,
  desenharRetrato,
  dentroDoBotao,
  registrarPressao,
  tracarRetanguloArredondado,
  type Botao,
} from "../game/ui";
import { t } from "../i18n/textos";

const CENTRO_X = LARGURA / 2;
const CENTRO_Y = 375;
const RAIO_CAPI = 30;
const RAIO_GUARDIAS = 95;
const DISTANCIA_SPAWN = 480;
const JANELA_COMBO = 1.5;
const RAIO_TOQUE = 24;
const ALCANCE_ONDA_CAPI = 150;

interface Inimigo {
  def: InimigoInstancia;
  x: number;
  y: number;
  hp: number;
  faseZig: number;
  lentoAte: number;
  presoAte: number;
  estado: "nadando" | "dormindo";
  dormiuEm: number;
  atingidoEm: number;
  indoParaDireita: boolean;
  // chefe
  submerso: boolean;
  faseCiclo: number;
}

interface GuardiaEmCampo {
  def: GuardiaDef;
  nivel: number;
  estagio: "filhote" | "adulta" | "plena";
  x: number;
  y: number;
  proximoAtaque: number;
  habilidadeProntaEm: number;
  botao: { x: number; y: number; raio: number };
}

// Projéteis/efeitos com identidade própria (o laser genérico morreu).
type TipoAtaque = "chicote" | "onda_branca" | "cafe" | "onda_capi";

interface Efeito {
  tipo: TipoAtaque;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cor: string;
  nasceu: number;
  duracao: number;
  raioMax?: number;
}

interface Flutuante {
  texto: string;
  x: number;
  y: number;
  nasceu: number;
  cor: string;
  comIconeCapim?: boolean;
  tamanho?: number;
}

interface Onda {
  x: number;
  y: number;
  nasceu: number;
  cor: string;
}

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  nasceu: number;
  cor: string;
}

type EstadoFase = "jogando" | "vitoria" | "derrota";

export class CenaFase implements Cena {
  private readonly fase: FaseGerada;
  private tempo = 0;
  private estado: EstadoFase = "jogando";
  private calma: number;
  private readonly calmaMax: number;
  private capimColetado = 0;
  private combo = 0;
  private ultimoAcerto = -99;
  private estrelas = 0;
  private tratados = 0;
  private totalInimigos: number;

  private proximoEvento = 0;
  private inimigos: Inimigo[] = [];
  private readonly guardias: GuardiaEmCampo[];
  private proximaOndaCapi = CAPI_INTERVALO_ONDA_S;
  private efeitos: Efeito[] = [];
  private flutuantes: Flutuante[] = [];
  private ondas: Onda[] = [];
  private particulas: Particula[] = [];
  private botoesFim: Botao[] = [];
  private vinheta: CanvasGradient | null = null;
  private fundoFallback: CanvasGradient | null = null;
  private chefeAnunciado = false;

  constructor(
    private readonly jogo: Jogo,
    numero: number,
  ) {
    this.fase = gerarFase(numero);
    this.calmaMax = this.fase.calmaMax + calmaMaximaBonus(jogo.dados.capiCalmaNivel);
    this.calma = this.calmaMax;
    this.totalInimigos = this.fase.eventos.length;

    this.guardias = GUARDIAS.map((def, indice) => {
      const rad = (def.anguloGrau * Math.PI) / 180;
      const nivel = nivelDaGuardia(jogo.dados, def.id);
      return {
        def,
        nivel,
        estagio: estagioDaGuardia(nivel),
        x: CENTRO_X + Math.cos(rad) * RAIO_GUARDIAS,
        y: CENTRO_Y + Math.sin(rad) * RAIO_GUARDIAS,
        proximoAtaque: 0,
        habilidadeProntaEm: 0,
        botao: { x: 130 + indice * 130, y: 712, raio: 32 },
      };
    });

    if (!jogo.dados.tutoriais["toque"]) {
      mostrarToast(t("tutorial_toque"));
      jogo.dados.tutoriais["toque"] = true;
      jogo.salvar();
    }
    if (this.fase.ehChefe) mostrarToast(`⚠️ ${this.fase.chefe?.nome ?? "Chefão"}!`);
  }

  // ---------------------------------------------------------------- lógica

  atualizar(dt: number): void {
    this.tempo += dt;
    if (this.estado !== "jogando") return;

    while (
      this.proximoEvento < this.fase.eventos.length &&
      this.fase.eventos[this.proximoEvento].tempo <= this.tempo
    ) {
      this.criarInimigo(this.fase.eventos[this.proximoEvento].inimigo);
      this.proximoEvento++;
    }

    this.moverInimigos(dt);
    this.ondaDaCapi();
    this.atacarComGuardias();
    this.limparEfeitos(dt);

    if (this.tempo - this.ultimoAcerto > JANELA_COMBO) this.combo = 0;

    if (this.tempo > 6 && !this.jogo.dados.tutoriais["habilidade"]) {
      mostrarToast(t("tutorial_habilidade"));
      this.jogo.dados.tutoriais["habilidade"] = true;
      this.jogo.salvar();
    }

    if (this.estado === "jogando") {
      const acabaramSpawns = this.proximoEvento >= this.fase.eventos.length;
      const semNadadores = !this.inimigos.some((i) => i.estado === "nadando");
      if (acabaramSpawns && semNadadores) this.vencer();
    }
  }

  private criarInimigo(def: InimigoInstancia): void {
    const angulo = Math.random() * Math.PI * 2;
    const x = CENTRO_X + Math.cos(angulo) * DISTANCIA_SPAWN;
    this.inimigos.push({
      def,
      x,
      y: CENTRO_Y + Math.sin(angulo) * DISTANCIA_SPAWN,
      hp: def.hp,
      faseZig: Math.random() * Math.PI * 2,
      lentoAte: 0,
      presoAte: 0,
      estado: "nadando",
      dormiuEm: 0,
      atingidoEm: -9,
      indoParaDireita: x < CENTRO_X,
      submerso: false,
      faseCiclo: Math.random() * Math.PI * 2,
    });
    if (def.ehChefe) {
      if (!this.chefeAnunciado) {
        sfx.somChefao();
        this.chefeAnunciado = true;
      }
    } else if (def.id === "piranha_afobada") sfx.somPiranhaNasce();
    else if (def.id === "marimbondo") sfx.somMarimbondo();
    else if (def.id === "celular_surto") sfx.somCelular();
  }

  private moverInimigos(dt: number): void {
    for (const inimigo of this.inimigos) {
      if (inimigo.estado !== "nadando") continue;

      if (inimigo.def.ehChefe) {
        this.moverChefe(inimigo, dt);
      } else if (inimigo.presoAte <= this.tempo) {
        this.moverComum(inimigo, dt);
      }

      if (inimigo.submerso) continue;
      const dist = Math.hypot(CENTRO_X - inimigo.x, CENTRO_Y - inimigo.y);
      if (dist < RAIO_CAPI + inimigo.def.raio) {
        this.calma -= inimigo.def.dano;
        this.flutuantes.push({
          texto: `-${inimigo.def.dano}`,
          x: CENTRO_X,
          y: CENTRO_Y - 44,
          nasceu: this.tempo,
          cor: "#ff8a95",
        });
        if (!inimigo.def.ehChefe) {
          inimigo.estado = "dormindo";
          inimigo.dormiuEm = this.tempo;
          this.tratados++;
        } else {
          // chefe recua ao bater, não dorme
          inimigo.x += (inimigo.x - CENTRO_X) * 0.4;
          inimigo.y += (inimigo.y - CENTRO_Y) * 0.4;
          inimigo.faseCiclo = this.tempo;
        }
        if (this.calma <= 0) {
          this.calma = 0;
          this.perder();
          return;
        }
      }
    }
  }

  private moverComum(inimigo: Inimigo, dt: number): void {
    const paraX = CENTRO_X - inimigo.x;
    const paraY = CENTRO_Y - inimigo.y;
    const dist = Math.hypot(paraX, paraY) || 1;
    const fator = inimigo.lentoAte > this.tempo ? 0.6 : 1;
    const vel = inimigo.def.velocidade * fator;

    inimigo.x += (paraX / dist) * vel * dt;
    inimigo.y += (paraY / dist) * vel * dt;
    inimigo.indoParaDireita = paraX > 0;

    if (inimigo.def.comportamento === "zigzag") {
      const perpX = -paraY / dist;
      const perpY = paraX / dist;
      const balanco = Math.sin(this.tempo * 5 + inimigo.faseZig) * 55 * dt;
      inimigo.x += perpX * balanco;
      inimigo.y += perpY * balanco;
    }
  }

  // Comportamento dos 3 arquétipos de chefe.
  private moverChefe(inimigo: Inimigo, dt: number): void {
    const arqu = inimigo.def.chefe?.arquetipo ?? "investida";
    const ciclo = inimigo.def.chefe?.cicloS ?? 3.5;
    const fase = (this.tempo - inimigo.faseCiclo) % ciclo;

    if (arqu === "mergulhador") {
      // Boto: mergulha metade do ciclo e reaparece perto da Capi
      const submerso = fase < ciclo * 0.45;
      if (submerso && !inimigo.submerso) {
        inimigo.submerso = true;
      } else if (!submerso && inimigo.submerso) {
        inimigo.submerso = false;
        const ang = Math.random() * Math.PI * 2;
        const r = 120 + Math.random() * 60;
        inimigo.x = CENTRO_X + Math.cos(ang) * r;
        inimigo.y = CENTRO_Y + Math.sin(ang) * r;
      }
      if (!inimigo.submerso) this.moverComum(inimigo, dt);
    } else if (arqu === "invocador") {
      // Celularzão: avança devagar e invoca notificações
      this.moverComum(inimigo, dt * 0.8);
      if (fase < dt) this.invocarNotificacao(inimigo);
    } else {
      // Apressada: para, telegrafa e investe
      if (fase < ciclo * 0.55) {
        this.moverComum(inimigo, dt * 0.35);
      } else {
        this.moverComum(inimigo, dt * 2.4); // investida
      }
    }
  }

  private invocarNotificacao(chefe: Inimigo): void {
    const escala = chefe.def.hp / 800 + 0.6;
    const ang = Math.random() * Math.PI * 2;
    this.inimigos.push({
      def: {
        id: "piranha_afobada",
        nome: "Notificação",
        hp: Math.max(6, Math.round(8 * escala)),
        velocidade: 78,
        dano: 1,
        raio: 11,
        comportamento: "linha",
        capim: 1,
        cor: "#bfe3ff",
        ehChefe: false,
      },
      x: chefe.x + Math.cos(ang) * 30,
      y: chefe.y + Math.sin(ang) * 30,
      hp: Math.max(6, Math.round(8 * escala)),
      faseZig: 0,
      lentoAte: 0,
      presoAte: 0,
      estado: "nadando",
      dormiuEm: 0,
      atingidoEm: -9,
      indoParaDireita: chefe.x < CENTRO_X,
      submerso: false,
      faseCiclo: 0,
    });
    this.totalInimigos++;
    sfx.somCelular();
  }

  // Onda dourada radial automática da Capi: dano em área.
  private ondaDaCapi(): void {
    if (this.tempo < this.proximaOndaCapi) return;
    this.proximaOndaCapi = this.tempo + CAPI_INTERVALO_ONDA_S;
    const dano = danoDaCapi(this.jogo.dados.capiAtaqueNivel);
    this.efeitos.push({
      tipo: "onda_capi",
      x0: CENTRO_X,
      y0: CENTRO_Y,
      x1: CENTRO_X,
      y1: CENTRO_Y,
      cor: "#ffd76a",
      nasceu: this.tempo,
      duracao: 0.6,
      raioMax: ALCANCE_ONDA_CAPI,
    });
    sfx.somOndaCapi();
    for (const inimigo of this.inimigos) {
      if (inimigo.estado !== "nadando" || inimigo.submerso) continue;
      const dist = Math.hypot(inimigo.x - CENTRO_X, inimigo.y - CENTRO_Y);
      if (dist <= ALCANCE_ONDA_CAPI) this.causarDano(inimigo, dano, "capi");
    }
  }

  private atacarComGuardias(): void {
    for (const guardia of this.guardias) {
      if (this.tempo < guardia.proximoAtaque) continue;

      let alvo: Inimigo | null = null;
      let menorDist = guardia.def.alcance;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando" || inimigo.submerso) continue;
        const dist = Math.hypot(inimigo.x - guardia.x, inimigo.y - guardia.y);
        if (dist < menorDist) {
          menorDist = dist;
          alvo = inimigo;
        }
      }
      if (!alvo) continue;

      guardia.proximoAtaque = this.tempo + guardia.def.cadenciaS;
      this.dispararAtaque(guardia, alvo);
      this.causarDano(alvo, danoDaGuardia(guardia.def, guardia.nivel), "guardia");
    }
  }

  // Cada guardiã tem projétil/efeito e som próprios.
  private dispararAtaque(guardia: GuardiaEmCampo, alvo: Inimigo): void {
    if (guardia.def.id === "boiadeira") {
      this.efeitos.push({
        tipo: "chicote", x0: guardia.x, y0: guardia.y - 14, x1: alvo.x, y1: alvo.y,
        cor: guardia.def.cor, nasceu: this.tempo, duracao: 0.18,
      });
      sfx.somChicote();
    } else if (guardia.def.id === "sonequinha") {
      // onda branca lenta que paralisa ao tocar
      this.efeitos.push({
        tipo: "onda_branca", x0: guardia.x, y0: guardia.y - 14, x1: alvo.x, y1: alvo.y,
        cor: "#eef3ff", nasceu: this.tempo, duracao: 0.5,
      });
      alvo.presoAte = Math.max(alvo.presoAte, this.tempo + 1.5);
      alvo.lentoAte = this.tempo + 1.5;
      sfx.somParalisia();
    } else {
      // Estagiário e futuras: café em arco
      this.efeitos.push({
        tipo: "cafe", x0: guardia.x, y0: guardia.y - 14, x1: alvo.x, y1: alvo.y,
        cor: guardia.def.cor, nasceu: this.tempo, duracao: 0.3,
      });
      sfx.somCafe();
    }
  }

  private causarDano(inimigo: Inimigo, dano: number, origem: "toque" | "guardia" | "capi"): void {
    inimigo.hp -= dano;
    inimigo.atingidoEm = this.tempo;

    const critico = origem === "toque" && this.combo >= 4;
    const base = origem === "toque" ? 15 : 12;
    this.flutuantes.push({
      texto: `${Math.max(1, Math.round(dano))}`,
      x: inimigo.x + (Math.random() * 16 - 8),
      y: inimigo.y - inimigo.def.raio - 6,
      nasceu: this.tempo,
      cor: critico ? "#ff9d3c" : origem === "toque" ? "#ffd166" : origem === "capi" ? "#ffe08a" : "#f2f7f2",
      tamanho: Math.min(36, base + dano * 0.55 + (critico ? 6 : 0)),
    });

    if (inimigo.hp <= 0 && inimigo.estado === "nadando") this.adormecer(inimigo);
  }

  private adormecer(inimigo: Inimigo): void {
    inimigo.estado = "dormindo";
    inimigo.dormiuEm = this.tempo;
    inimigo.submerso = false;
    this.tratados++;
    this.capimColetado += inimigo.def.capim;
    sfx.somDormir();
    this.flutuantes.push(
      { texto: "💤", x: inimigo.x, y: inimigo.y - 14, nasceu: this.tempo, cor: "#cfe6ff" },
      {
        texto: `+${inimigo.def.capim}`,
        x: inimigo.x,
        y: inimigo.y + 8,
        nasceu: this.tempo + 0.12,
        cor: "#9fdf8f",
        comIconeCapim: true,
      },
    );
    const qtd = inimigo.def.ehChefe ? 22 : 7;
    for (let i = 0; i < qtd; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const vel = 45 + Math.random() * (inimigo.def.ehChefe ? 130 : 55);
      this.particulas.push({
        x: inimigo.x,
        y: inimigo.y,
        vx: Math.cos(angulo) * vel,
        vy: Math.sin(angulo) * vel - 25,
        nasceu: this.tempo,
        cor: i % 3 === 0 ? "#ffd166" : "#8fdf8f",
      });
    }
  }

  private limparEfeitos(dt: number): void {
    this.inimigos = this.inimigos.filter(
      (i) => i.estado === "nadando" || this.tempo - i.dormiuEm < 1.1,
    );
    this.efeitos = this.efeitos.filter((e) => this.tempo - e.nasceu < e.duracao);
    this.flutuantes = this.flutuantes.filter((f) => this.tempo - f.nasceu < 1.2);
    this.ondas = this.ondas.filter((o) => this.tempo - o.nasceu < 0.45);
    this.particulas = this.particulas.filter((p) => this.tempo - p.nasceu < 0.7);
    for (const p of this.particulas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.5 * dt;
      p.vy *= 1 - 2.5 * dt;
    }
  }

  // Efeitos transitórios param de envelhecer aqui: sem isso, com o jogo pausado
  // na tela de fim, o "tempo" seguiria correndo e raios virariam negativos.
  private limparTransitorios(): void {
    this.efeitos = [];
    this.particulas = [];
    this.ondas = [];
    this.flutuantes = [];
  }

  private vencer(): void {
    this.estado = "vitoria";
    this.limparTransitorios();
    const proporcao = this.calma / this.calmaMax;
    this.estrelas = proporcao >= 0.8 ? 3 : proporcao >= 0.5 ? 2 : 1;
    sfx.somConquista();

    const dados = this.jogo.dados;
    dados.capim += this.fase.capimVitoria + this.capimColetado;
    dados.gemas += this.fase.gemasVitoria;
    dados.faseMaxima = Math.max(dados.faseMaxima, this.fase.numero);
    const chave = String(this.fase.numero);
    dados.estrelas[chave] = Math.max(dados.estrelas[chave] ?? 0, this.estrelas);
    this.jogo.salvar();
  }

  private perder(): void {
    this.estado = "derrota";
    this.limparTransitorios();
    sfx.somDerrota();
    this.jogo.dados.capim += this.capimColetado;
    this.jogo.salvar();
  }

  // ---------------------------------------------------------------- toque

  aoTocar(x: number, y: number): void {
    if (this.estado !== "jogando") {
      for (const botao of this.botoesFim) {
        if (!dentroDoBotao(botao, x, y)) continue;
        registrarPressao(botao.acao);
        sfx.somClique();
        if (botao.acao === "mapa") this.jogo.irPara({ tela: "mapa" });
        if (botao.acao === "equipe") this.jogo.irPara({ tela: "equipe" });
        if (botao.acao === "proxima") this.jogo.irPara({ tela: "fase", numero: this.fase.numero + 1 });
        if (botao.acao === "repetir") this.jogo.irPara({ tela: "fase", numero: this.fase.numero });
      }
      return;
    }

    for (const guardia of this.guardias) {
      const dist = Math.hypot(x - guardia.botao.x, y - guardia.botao.y);
      if (dist <= guardia.botao.raio + 4) {
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
      if (inimigo.estado !== "nadando" || inimigo.submerso) continue;
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
    sfx.somToque();
    this.causarDano(alvo, dano, "toque");
  }

  private usarHabilidade(guardia: GuardiaEmCampo): void {
    if (this.tempo < guardia.habilidadeProntaEm) return;
    const hab = guardia.def.habilidade;

    if (hab.tipo === "imobilizar_forte") {
      let alvo: Inimigo | null = null;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando" || inimigo.submerso) continue;
        if (!alvo || inimigo.def.hp > alvo.def.hp || (inimigo.def.hp === alvo.def.hp && inimigo.hp > alvo.hp)) {
          alvo = inimigo;
        }
      }
      if (!alvo) return;
      alvo.presoAte = this.tempo + hab.duracaoS;
      this.ondas.push({ x: alvo.x, y: alvo.y, nasceu: this.tempo, cor: guardia.def.cor });
      this.flutuantes.push({ texto: "🪢", x: alvo.x, y: alvo.y - 18, nasceu: this.tempo, cor: "#fff" });
      sfx.somChicote();
    } else {
      let pegouAlguem = false;
      for (const inimigo of this.inimigos) {
        if (inimigo.estado !== "nadando" || inimigo.submerso) continue;
        const dist = Math.hypot(inimigo.x - CENTRO_X, inimigo.y - CENTRO_Y);
        if (dist <= 185) {
          inimigo.presoAte = Math.max(inimigo.presoAte, this.tempo + hab.duracaoS);
          this.flutuantes.push({ texto: "💤", x: inimigo.x, y: inimigo.y - 16, nasceu: this.tempo, cor: "#d9c9ff" });
          pegouAlguem = true;
        }
      }
      if (!pegouAlguem) return;
      this.ondas.push({ x: CENTRO_X, y: CENTRO_Y, nasceu: this.tempo, cor: guardia.def.cor });
      sfx.somParalisia();
    }

    registrarPressao(`habilidade:${guardia.def.id}`);
    guardia.habilidadeProntaEm = this.tempo + hab.recargaS;
  }

  // --------------------------------------------------------------- desenho

  desenhar(ctx: CanvasRenderingContext2D): void {
    this.desenharLago(ctx);

    for (const guardia of this.guardias) {
      desenharGuardia(ctx, guardia.def, guardia.x, guardia.y, this.tempo, guardia.estagio);
    }
    desenharCapi(ctx, CENTRO_X, CENTRO_Y, RAIO_CAPI, this.tempo);

    this.desenharEfeitos(ctx);

    for (const inimigo of this.inimigos) {
      if (inimigo.def.ehChefe) {
        desenharChefe(ctx, inimigo.def, inimigo.x, inimigo.y, this.tempo, inimigo.submerso, inimigo.estado === "dormindo");
      } else {
        desenharInimigo(
          ctx, inimigo.def, inimigo.x, inimigo.y, this.tempo,
          inimigo.estado === "dormindo", this.tempo - inimigo.atingidoEm, inimigo.indoParaDireita,
        );
      }
      if (inimigo.estado === "nadando" && !inimigo.submerso && inimigo.hp < inimigo.def.hp) {
        const larguraBarra = inimigo.def.raio * 2;
        const proporcao = Math.max(0, inimigo.hp / inimigo.def.hp);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(inimigo.x - larguraBarra / 2, inimigo.y - inimigo.def.raio - 11, larguraBarra, 4);
        ctx.fillStyle = inimigo.def.ehChefe ? "#e0463d" : "#ffd166";
        ctx.fillRect(inimigo.x - larguraBarra / 2, inimigo.y - inimigo.def.raio - 11, larguraBarra * proporcao, 4);
      }
    }

    for (const particula of this.particulas) {
      const idade = (this.tempo - particula.nasceu) / 0.7;
      const raio = 3 * (1 - idade * 0.5);
      if (raio <= 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - idade);
      ctx.fillStyle = particula.cor;
      ctx.beginPath();
      ctx.arc(particula.x, particula.y, raio, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
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
      const tamanho = flutuante.tamanho ?? 16;
      const pop = 1 + 0.35 * Math.max(0, 1 - idade / 0.15);
      ctx.font = `800 ${Math.round(tamanho * pop)}px system-ui, sans-serif`;
      const yF = flutuante.y - idade * 30;
      ctx.fillText(flutuante.texto, flutuante.x, yF);
      if (flutuante.comIconeCapim) {
        const largura = ctx.measureText(flutuante.texto).width;
        desenharIconeCapim(ctx, flutuante.x + largura / 2 + 10, yF - 1, 13);
      }
      ctx.globalAlpha = 1;
    }

    this.desenharHud(ctx);
    this.desenharBotoesHabilidade(ctx);
    if (this.estado !== "jogando") this.desenharFim(ctx);
    desenharToasts(ctx, 632);
  }

  private desenharEfeitos(ctx: CanvasRenderingContext2D): void {
    for (const e of this.efeitos) {
      const p = (this.tempo - e.nasceu) / e.duracao;
      if (p < 0 || p >= 1) continue; // nunca desenha efeito vencido (raio negativo)
      ctx.save();
      if (e.tipo === "onda_capi") {
        // anel dourado expansivo a partir da Capi
        const raio = (e.raioMax ?? 150) * p;
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.strokeStyle = e.cor;
        ctx.lineWidth = 6 * (1 - p) + 1;
        ctx.beginPath();
        ctx.arc(e.x0, e.y0, raio, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - p) * 0.3;
        ctx.fillStyle = e.cor;
        ctx.beginPath();
        ctx.arc(e.x0, e.y0, raio, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.tipo === "chicote") {
        // linha reta que estala e some rápido
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = e.cor;
        ctx.lineWidth = 3.5 * (1 - p) + 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(e.x0, e.y0);
        ctx.lineTo(e.x1, e.y1);
        ctx.stroke();
        // estalo no alvo
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(e.x1, e.y1, 5 * (1 - p) + 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.tipo === "onda_branca") {
        // onda branca que viaja devagar até o alvo
        const cx = e.x0 + (e.x1 - e.x0) * p;
        const cy = e.y0 + (e.y1 - e.y0) * p;
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.strokeStyle = e.cor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 + p * 8, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // café em arco (parábola) com respingo no fim
        const cx = e.x0 + (e.x1 - e.x0) * p;
        const arco = -Math.sin(p * Math.PI) * 40;
        const cy = e.y0 + (e.y1 - e.y0) * p + arco;
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = e.cor;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private desenharLago(ctx: CanvasRenderingContext2D): void {
    const arte = imagem("fundo-lago");
    if (arte) {
      const dx = Math.sin(this.tempo * 0.13) * 6;
      const dy = Math.cos(this.tempo * 0.09) * 5;
      desenharImagemCobrindo(ctx, arte, 1.05, dx, dy);
      if (!this.vinheta) {
        this.vinheta = ctx.createRadialGradient(CENTRO_X, CENTRO_Y, 180, CENTRO_X, CENTRO_Y, 460);
        this.vinheta.addColorStop(0, "rgba(0,0,0,0)");
        this.vinheta.addColorStop(1, "rgba(4, 24, 18, 0.42)");
      }
      ctx.fillStyle = this.vinheta;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    } else {
      if (!this.fundoFallback) {
        this.fundoFallback = ctx.createRadialGradient(CENTRO_X, CENTRO_Y, 60, CENTRO_X, CENTRO_Y, 420);
        this.fundoFallback.addColorStop(0, this.fase.bioma.cor);
        this.fundoFallback.addColorStop(1, "#0b3d2e");
      }
      ctx.fillStyle = this.fundoFallback;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const raio = 70 + i * 60 + Math.sin(this.tempo * 1.5 + i) * 4;
      ctx.beginPath();
      ctx.arc(CENTRO_X, CENTRO_Y, raio, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private desenharHud(ctx: CanvasRenderingContext2D): void {
    const larguraBarra = 172;
    const x0 = CENTRO_X - larguraBarra / 2;
    tracarRetanguloArredondado(ctx, x0 - 4, 14, larguraBarra + 8, 24, 12);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fill();
    const proporcao = Math.max(0, this.calma / this.calmaMax);
    if (proporcao > 0) {
      tracarRetanguloArredondado(ctx, x0, 18, larguraBarra * proporcao, 16, 8);
      ctx.fillStyle = proporcao > 0.5 ? "#7dd3a0" : proporcao > 0.25 ? "#e5b74a" : "#e06a5a";
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${t("hud_calma")} ${Math.ceil(this.calma)}/${this.calmaMax}`, CENTRO_X, 26);

    ctx.textAlign = "left";
    ctx.font = "800 15px system-ui, sans-serif";
    ctx.fillStyle = "rgba(40, 20, 5, 0.8)";
    ctx.fillText(`${t("fase_rotulo")} ${this.fase.numero}`, 14, 28);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${t("fase_rotulo")} ${this.fase.numero}`, 14, 26);

    desenharPilulaRecurso(ctx, LARGURA - 12, 26, "capim", this.capimColetado);

    this.desenharCardDeMissao(ctx);

    if (this.combo >= 2 && this.estado === "jogando") {
      ctx.textAlign = "center";
      const escala = 1 + 0.12 * Math.max(0, 1 - (this.tempo - this.ultimoAcerto) * 4);
      ctx.save();
      ctx.translate(CENTRO_X, 150);
      ctx.scale(escala, escala);
      ctx.font = "800 19px system-ui, sans-serif";
      ctx.fillStyle = "rgba(40,20,5,0.8)";
      ctx.fillText(`${t("hud_combo")} x${this.combo}`, 0, 2);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`${t("hud_combo")} x${this.combo}`, 0, 0);
      ctx.restore();
    }
  }

  private desenharCardDeMissao(ctx: CanvasRenderingContext2D): void {
    const x = 14;
    const y = 46;
    const w = LARGURA - 28;
    const concluida = this.estado === "vitoria";
    const ehChefe = this.fase.ehChefe;

    tracarRetanguloArredondado(ctx, x, y, w, 44, 12);
    ctx.fillStyle = concluida ? "rgba(46, 125, 84, 0.92)" : ehChefe ? "rgba(90, 30, 40, 0.55)" : "rgba(0,0,0,0.38)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = concluida ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.14)";
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    if (concluida) {
      ctx.font = "800 15px system-ui, sans-serif";
      ctx.fillText(`✓ ${t("missao_concluida")}`, x + 14, y + 22);
    } else {
      ctx.fillText(ehChefe ? `👑 ${this.fase.chefe?.nome ?? t("missao_objetivo")}` : `🎯 ${t("missao_objetivo")}`, x + 14, y + 15);
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`${this.tratados}/${this.totalInimigos} afobados`, x + 14, y + 32);
    }

    ctx.textAlign = "right";
    ctx.font = "800 15px system-ui, sans-serif";
    ctx.fillStyle = "#c9f2b8";
    const textoRecompensa = `+${this.fase.capimVitoria}`;
    ctx.fillText(textoRecompensa, x + w - 32, y + 22);
    desenharIconeCapim(ctx, x + w - 20, y + 21, 15);

    const yBarra = y + 52;
    const larguraBarra = w - 30;
    tracarRetanguloArredondado(ctx, x, yBarra, larguraBarra, 8, 4);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    const progresso = this.totalInimigos ? this.tratados / this.totalInimigos : 1;
    if (progresso > 0.03) {
      tracarRetanguloArredondado(ctx, x, yBarra, larguraBarra * Math.min(1, progresso), 8, 4);
      ctx.fillStyle = "#ffd166";
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.font = "400 18px system-ui, sans-serif";
    ctx.fillStyle = concluida ? "#ffd166" : "rgba(255,255,255,0.55)";
    ctx.fillText(concluida ? "★" : "☆", x + larguraBarra + 14, yBarra + 4);
  }

  private desenharBotoesHabilidade(ctx: CanvasRenderingContext2D): void {
    for (const guardia of this.guardias) {
      const { x, y, raio } = guardia.botao;
      const tamanho = raio * 2;
      const pronta = this.tempo >= guardia.habilidadeProntaEm;
      const corMoldura = pronta ? CORES_RARIDADE[guardia.def.raridade] : "#46555e";

      desenharRetrato(
        ctx, imagem(`retrato-${guardia.def.id}`), corMoldura,
        guardia.def.cor, guardia.def.nome[0], x - raio, y - raio, tamanho,
      );

      if (!pronta) {
        const restante = guardia.habilidadeProntaEm - this.tempo;
        const fracao = Math.min(1, restante / guardia.def.habilidade.recargaS);
        ctx.save();
        tracarRetanguloArredondado(ctx, x - raio, y - raio, tamanho, tamanho, tamanho * 0.22);
        ctx.clip();
        ctx.fillStyle = "rgba(10, 14, 18, 0.62)";
        ctx.fillRect(x - raio, y - raio, tamanho, tamanho * fracao);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 17px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.ceil(restante).toString(), x, y);
      } else {
        const brilho = 0.5 + 0.5 * Math.sin(this.tempo * 5);
        ctx.save();
        tracarRetanguloArredondado(ctx, x - raio - 2, y - raio - 2, tamanho + 4, tamanho + 4, tamanho * 0.24);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255, 240, 180, ${0.35 + brilho * 0.5})`;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guardia.def.habilidade.nome, x, y + raio + 13);
    }
  }

  private desenharFim(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(6, 26, 20, 0.78)";
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const painel = { x: 35, y: 215, w: LARGURA - 70, h: 340 };
    tracarRetanguloArredondado(ctx, painel.x, painel.y + 6, painel.w, painel.h, 20);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
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
    ctx.fillText(vitoria ? t("fase_vitoria") : t("fase_derrota"), CENTRO_X, painel.y + 42);

    this.botoesFim = [];

    if (vitoria) {
      ctx.font = "400 38px system-ui, sans-serif";
      const estrelasTexto = "★".repeat(this.estrelas) + "☆".repeat(3 - this.estrelas);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(estrelasTexto, CENTRO_X, painel.y + 95);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px system-ui, sans-serif";
      const textoCapim = `+${this.fase.capimVitoria + this.capimColetado}`;
      ctx.fillText(textoCapim, CENTRO_X - 30, painel.y + 140);
      desenharIconeCapim(ctx, CENTRO_X - 30 + ctx.measureText(textoCapim).width / 2 + 12, painel.y + 139, 16);

      if (this.fase.gemasVitoria > 0) {
        // recompensa gorda do chefão: caixa + gemas
        ctx.fillStyle = "#8fdcff";
        ctx.font = "700 16px system-ui, sans-serif";
        ctx.fillText(`🎁 +${this.fase.gemasVitoria} 💎`, CENTRO_X + 40, painel.y + 140);
      }

      const proxima: Botao = { x: painel.x + 30, y: painel.y + 178, w: painel.w - 60, h: 52, acao: "proxima" };
      desenharBotao(ctx, proxima, t("botao_proxima"), { cor: "#3d9c63" });
      this.botoesFim.push(proxima);

      const mapa: Botao = { x: painel.x + 30, y: painel.y + 240, w: (painel.w - 74) / 2, h: 42, acao: "mapa" };
      desenharBotao(ctx, mapa, t("botao_mapa"), { cor: "#26604a", tamanhoFonte: 14 });
      this.botoesFim.push(mapa);

      const repetir: Botao = { x: painel.x + 44 + (painel.w - 74) / 2, y: painel.y + 240, w: (painel.w - 74) / 2, h: 42, acao: "repetir" };
      desenharBotao(ctx, repetir, t("botao_repetir"), { cor: "#26604a", tamanhoFonte: 14 });
      this.botoesFim.push(repetir);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 15px system-ui, sans-serif";
      ctx.fillText(t("fase_derrota_dica"), CENTRO_X, painel.y + 92);

      if (this.capimColetado > 0) {
        ctx.fillStyle = "#9fdf8f";
        ctx.font = "600 15px system-ui, sans-serif";
        const textoCapim = `${t("fase_capim_ganho")}: +${this.capimColetado}`;
        ctx.fillText(textoCapim, CENTRO_X - 10, painel.y + 124);
        desenharIconeCapim(ctx, CENTRO_X + ctx.measureText(textoCapim).width / 2 + 4, painel.y + 123, 14);
      }

      const evoluir: Botao = { x: painel.x + 30, y: painel.y + 158, w: painel.w - 60, h: 56, acao: "equipe" };
      desenharBotao(ctx, evoluir, t("botao_evoluir"), { cor: "#3d9c63", tamanhoFonte: 20, icone: "capim" });
      this.botoesFim.push(evoluir);

      const mapa: Botao = { x: painel.x + 30, y: painel.y + 226, w: (painel.w - 74) / 2, h: 42, acao: "mapa" };
      desenharBotao(ctx, mapa, t("botao_mapa"), { cor: "#26604a", tamanhoFonte: 14 });
      this.botoesFim.push(mapa);

      const repetir: Botao = { x: painel.x + 44 + (painel.w - 74) / 2, y: painel.y + 226, w: (painel.w - 74) / 2, h: 42, acao: "repetir" };
      desenharBotao(ctx, repetir, t("botao_repetir"), { cor: "#26604a", tamanhoFonte: 14 });
      this.botoesFim.push(repetir);
    }
  }
}
