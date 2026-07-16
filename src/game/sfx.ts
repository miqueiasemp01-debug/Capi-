// Áudio 100% sintetizado (WebAudio) — zero arquivos, zero peso no build.
// Contexto central único, limite de vozes (protege o desempenho e o ouvido)
// e mute persistente. Nasce no 1º gesto do usuário (regra do iOS) e falha
// sempre em silêncio: som nunca pode derrubar o jogo.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let trilhaGain: GainNode | null = null;
let ruidoBuffer: AudioBuffer | null = null;
let mutado = false;
let vozesAtivas = 0;
const LIMITE_VOZES = 14;

export type ClimaMusical = "mapa" | "fase" | "chefe" | "caixa" | "surto" | "calma";
let climaMusical: ClimaMusical = "mapa";
let passoTrilha = 0;
let proximaNotaEm = 0;
let relogioTrilha: number | null = null;

function garantirContexto(): AudioContext | null {
  try {
    if (!ctx) {
      const Construtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Construtor) return null;
      ctx = new Construtor();
      masterGain = ctx.createGain();
      masterGain.gain.value = mutado ? 0 : 0.9;
      masterGain.connect(ctx.destination);
      trilhaGain = ctx.createGain();
      trilhaGain.gain.value = 1;
      trilhaGain.connect(masterGain);

      // buffer de ruído reutilizável (chicote, splash, zumbido)
      const tamanho = Math.floor(ctx.sampleRate * 0.4);
      ruidoBuffer = ctx.createBuffer(1, tamanho, ctx.sampleRate);
      const dados = ruidoBuffer.getChannelData(0);
      for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1;
      iniciarRelogioDaTrilha(ctx);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function definirMute(valor: boolean): void {
  mutado = valor;
  if (masterGain && ctx) masterGain.gain.setTargetAtTime(valor ? 0 : 0.9, ctx.currentTime, 0.01);
}

export function estaMutado(): boolean {
  return mutado;
}

// ---------------------------------------------------------------- trilha

const PROGRESSOES: Record<ClimaMusical, number[][]> = {
  mapa: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]],
  fase: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
  chefe: [[50, 53, 57, 62], [48, 52, 55, 60], [46, 50, 53, 58], [48, 51, 55, 60]],
  caixa: [[65, 69, 72, 76], [67, 71, 74, 79], [64, 68, 71, 76], [69, 72, 76, 81]],
  surto: [[50, 53, 56, 60], [48, 51, 55, 59], [46, 50, 53, 57], [47, 50, 54, 58]],
  calma: [[60, 64, 67, 72], [62, 65, 69, 74], [64, 67, 71, 76], [67, 71, 74, 79]],
};

const BPM: Record<ClimaMusical, number> = {
  mapa: 104,
  fase: 122,
  chefe: 128,
  caixa: 116,
  surto: 88,
  calma: 108,
};

function frequenciaMidi(nota: number): number {
  return 440 * 2 ** ((nota - 69) / 12);
}

function iniciarRelogioDaTrilha(c: AudioContext): void {
  if (relogioTrilha !== null) return;
  proximaNotaEm = c.currentTime + 0.06;
  relogioTrilha = window.setInterval(() => {
    if (!ctx || !trilhaGain) return;
    const horizonte = ctx.currentTime + 0.48;
    while (proximaNotaEm < horizonte) {
      agendarPassoDaTrilha(ctx, proximaNotaEm);
      proximaNotaEm += 60 / BPM[climaMusical] / 2;
      passoTrilha = (passoTrilha + 1) % 16;
    }
  }, 120);
}

function agendarPassoDaTrilha(c: AudioContext, quando: number): void {
  if (!trilhaGain || mutado) return;
  const passo = passoTrilha;
  const acordes = PROGRESSOES[climaMusical];
  const acorde = acordes[Math.floor(passo / 4)];
  const duracaoPasso = 60 / BPM[climaMusical] / 2;
  const ativo = climaMusical !== "surto" || passo % 2 === 0;

  // Camada quente e sustentada: dá identidade sem disputar com os efeitos.
  if (passo % 4 === 0) {
    acorde.slice(0, 3).forEach((nota, indice) => {
      tom(trilhaGain!, c, {
        freq: frequenciaMidi(nota - 12),
        dur: duracaoPasso * 3.8,
        vol: climaMusical === "chefe" ? 0.018 : 0.014,
        tipo: indice === 0 ? "sine" : "triangle",
        inicioEm: quando,
      });
    });
    tom(trilhaGain, c, {
      freq: frequenciaMidi(acorde[0] - 24),
      dur: duracaoPasso * 1.7,
      vol: climaMusical === "chefe" ? 0.065 : 0.045,
      tipo: "triangle",
      inicioEm: quando,
      glideFreq: frequenciaMidi(acorde[0] - 24) * 0.98,
    });
  }

  if (ativo && (climaMusical !== "mapa" || passo % 2 === 0)) {
    const desenho = climaMusical === "chefe"
      ? [0, 0, 1, 0, 2, 1, 3, 1]
      : [0, 2, 1, 3, 2, 1, 3, 2];
    const oitava = climaMusical === "caixa" || climaMusical === "calma" ? 12 : 0;
    tom(trilhaGain, c, {
      freq: frequenciaMidi(acorde[desenho[passo % desenho.length]] + oitava),
      dur: duracaoPasso * 0.72,
      vol: climaMusical === "fase" ? 0.038 : 0.03,
      tipo: "triangle",
      inicioEm: quando,
    });
  }

  if ((climaMusical === "fase" || climaMusical === "chefe") && passo % 4 === 0) {
    tom(trilhaGain, c, {
      freq: climaMusical === "chefe" ? 105 : 125,
      dur: 0.14,
      vol: climaMusical === "chefe" ? 0.075 : 0.05,
      tipo: "sine",
      glideFreq: 48,
      inicioEm: quando,
    });
  }
  if ((climaMusical === "fase" || climaMusical === "chefe" || climaMusical === "caixa") && passo % 2 === 1) {
    ruido(trilhaGain, c, 0.055, climaMusical === "chefe" ? 0.022 : 0.014, 4200, "highpass", quando);
  }
}

export function definirClimaMusical(clima: ClimaMusical): void {
  if (climaMusical === clima) return;
  climaMusical = clima;
  passoTrilha = 0;
  if (ctx) proximaNotaEm = ctx.currentTime + 0.04;
}

// Toca uma voz respeitando o limite; devolve destino pra conectar ou null.
function abrirVoz(): { ctx: AudioContext; destino: GainNode } | null {
  const c = garantirContexto();
  if (!c || !masterGain || mutado) return null;
  if (vozesAtivas >= LIMITE_VOZES) return null;
  vozesAtivas++;
  return { ctx: c, destino: masterGain };
}

function fecharVozEm(c: AudioContext, quando: number): void {
  const restante = Math.max(0, quando - c.currentTime);
  window.setTimeout(() => {
    vozesAtivas = Math.max(0, vozesAtivas - 1);
  }, restante * 1000 + 60);
}

interface OpcoesTom {
  freq: number;
  fim?: number;
  dur: number;
  vol: number;
  tipo?: OscillatorType;
  inicioAtraso?: number;
  glideFreq?: number;
  inicioEm?: number;
}

function tom(destino: AudioNode, c: AudioContext, o: OpcoesTom): void {
  const inicio = (o.inicioEm ?? c.currentTime) + (o.inicioAtraso ?? 0);
  const fim = inicio + o.dur;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.tipo ?? "sine";
  osc.frequency.setValueAtTime(o.freq, inicio);
  if (o.glideFreq) osc.frequency.exponentialRampToValueAtTime(o.glideFreq, fim);
  g.gain.setValueAtTime(0.0001, inicio);
  g.gain.exponentialRampToValueAtTime(o.vol, inicio + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, fim);
  osc.connect(g);
  g.connect(destino);
  osc.start(inicio);
  osc.stop(fim + 0.03);
}

function ruido(
  destino: AudioNode,
  c: AudioContext,
  dur: number,
  vol: number,
  corte: number,
  tipo: BiquadFilterType = "bandpass",
  inicioEm?: number,
): void {
  if (!ruidoBuffer) return;
  const inicio = inicioEm ?? c.currentTime;
  const fonte = c.createBufferSource();
  fonte.buffer = ruidoBuffer;
  const filtro = c.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = corte;
  filtro.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, inicio);
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  fonte.connect(filtro);
  filtro.connect(g);
  g.connect(destino);
  fonte.start(inicio);
  fonte.stop(inicio + dur + 0.02);
}

// ---------------------------------------------------------------- ataques

// Capi: gongo suave dourado (fundamental grave + harmônico, decaimento longo).
export function somOndaCapi(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 174, dur: 0.9, vol: 0.16, tipo: "sine", glideFreq: 130 });
  tom(v.destino, v.ctx, { freq: 349, dur: 0.7, vol: 0.07, tipo: "sine" });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.9);
}

// Boiadeira: estalo seco do chicote (ruído curtíssimo + tom que sobe).
export function somChicote(): void {
  const v = abrirVoz();
  if (!v) return;
  ruido(v.destino, v.ctx, 0.09, 0.5, 2600, "highpass");
  ruido(v.destino, v.ctx, 0.13, 0.13, 620, "bandpass");
  tom(v.destino, v.ctx, { freq: 320, dur: 0.08, vol: 0.12, tipo: "square", glideFreq: 900 });
  tom(v.destino, v.ctx, { freq: 120, dur: 0.11, vol: 0.08, tipo: "triangle", glideFreq: 82 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.12);
}

// Sonequinha: sino etéreo da paralisia (dó agudo com brilho e shimmer).
export function somParalisia(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 1046, dur: 0.5, vol: 0.1, tipo: "sine" });
  tom(v.destino, v.ctx, { freq: 1568, dur: 0.4, vol: 0.05, tipo: "sine", inicioAtraso: 0.04 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.55);
}

// Estagiário: splash do café (ruído médio filtrado + "plop").
export function somCafe(): void {
  const v = abrirVoz();
  if (!v) return;
  ruido(v.destino, v.ctx, 0.16, 0.28, 900, "bandpass");
  tom(v.destino, v.ctx, { freq: 420, dur: 0.12, vol: 0.08, tipo: "triangle", glideFreq: 240 });
  tom(v.destino, v.ctx, { freq: 1760, dur: 0.15, vol: 0.035, tipo: "sine", inicioAtraso: 0.025, glideFreq: 1320 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.2);
}

// Toque de Calma: toque cristalino curtinho.
export function somToque(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 660, dur: 0.14, vol: 0.09, tipo: "triangle", glideFreq: 880 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.16);
}

// ---------------------------------------------------------------- inimigos

export function somPiranhaNasce(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 240, dur: 0.14, vol: 0.09, tipo: "square", glideFreq: 120 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.16);
}

export function somMarimbondo(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 190, dur: 0.22, vol: 0.06, tipo: "sawtooth", glideFreq: 210 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.24);
}

export function somCelular(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 90, dur: 0.18, vol: 0.1, tipo: "square" });
  tom(v.destino, v.ctx, { freq: 1320, dur: 0.1, vol: 0.06, tipo: "sine", inicioAtraso: 0.16 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.3);
}

// Dormir: sininho + ronquinho fofo.
export function somDormir(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 880, dur: 0.18, vol: 0.08, tipo: "sine", glideFreq: 1100 });
  tom(v.destino, v.ctx, { freq: 150, dur: 0.28, vol: 0.05, tipo: "triangle", glideFreq: 110, inicioAtraso: 0.1 });
  ruido(v.destino, v.ctx, 0.34, 0.025, 320, "lowpass");
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.4);
}

// ---------------------------------------------------------------- eventos

// Chefão entra: acorde grave e ameaçador.
export function somChefao(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 65, dur: 1.1, vol: 0.16, tipo: "sawtooth" });
  tom(v.destino, v.ctx, { freq: 98, dur: 1.0, vol: 0.1, tipo: "sine" });
  tom(v.destino, v.ctx, { freq: 130, dur: 0.9, vol: 0.07, tipo: "sine", inicioAtraso: 0.08 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 1.1);
}

// Vitória / conquista: arpejo maior subindo (dó-mi-sol-dó).
export function somConquista(): void {
  const v = abrirVoz();
  if (!v) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tom(v.destino, v.ctx, { freq: f, dur: 0.5, vol: 0.16, tipo: "triangle", inicioAtraso: i * 0.09 });
  });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.9);
}

export function somDerrota(): void {
  const v = abrirVoz();
  if (!v) return;
  [392, 330, 262].forEach((f, i) => {
    tom(v.destino, v.ctx, { freq: f, dur: 0.4, vol: 0.12, tipo: "sine", inicioAtraso: i * 0.12 });
  });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.7);
}

// UI: clique suave.
export function somClique(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 520, dur: 0.05, vol: 0.06, tipo: "sine", glideFreq: 640 });
  tom(v.destino, v.ctx, { freq: 1040, dur: 0.045, vol: 0.025, tipo: "triangle", inicioAtraso: 0.012 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.07);
}

// Surto: acorde dissonante descendente e sinistro (O Surto leva a Sonequinha).
export function somSurto(): void {
  const v = abrirVoz();
  if (!v) return;
  tom(v.destino, v.ctx, { freq: 220, dur: 0.9, vol: 0.14, tipo: "sawtooth", glideFreq: 70 });
  tom(v.destino, v.ctx, { freq: 233, dur: 0.9, vol: 0.1, tipo: "square", glideFreq: 80 });
  ruido(v.destino, v.ctx, 0.5, 0.12, 500, "lowpass");
  fecharVozEm(v.ctx, v.ctx.currentTime + 0.9);
}

// Abertura de caixa: tique-tique de suspense subindo.
export function somCaixaSuspense(): void {
  const v = abrirVoz();
  if (!v) return;
  for (let i = 0; i < 6; i++) {
    tom(v.destino, v.ctx, { freq: 400 + i * 90, dur: 0.06, vol: 0.05, tipo: "triangle", inicioAtraso: i * 0.22 });
  }
  fecharVozEm(v.ctx, v.ctx.currentTime + 1.4);
}

// Revelação por raridade: fanfarra maior/mais brilhante quanto mais raro.
export function somRevelacao(lendaria: boolean): void {
  const v = abrirVoz();
  if (!v) return;
  const notas = lendaria ? [523, 659, 784, 1047, 1319] : [440, 554, 659];
  notas.forEach((f, i) => {
    tom(v.destino, v.ctx, { freq: f, dur: 0.6, vol: lendaria ? 0.18 : 0.12, tipo: "triangle", inicioAtraso: i * 0.08 });
  });
  if (lendaria) tom(v.destino, v.ctx, { freq: 2093, dur: 0.5, vol: 0.08, tipo: "sine", inicioAtraso: 0.4 });
  fecharVozEm(v.ctx, v.ctx.currentTime + 1.1);
}
