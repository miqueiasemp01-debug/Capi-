// Simulador de balanceamento das fases PROCEDURAIS. Para cada fase, acha o
// nível de equipe cujo Poder ≈ poderRecomendado e mede a taxa de vitória ali
// e um nível acima (Monte Carlo). Alvo: fase comum 65–75% no recomendado;
// chefão 45–55% no recomendado e ≥90% um nível acima.
// Uso: npm run simular

import guardiasJson from "../src/data/guardias.json";
import type { GuardiaDef, SaveData } from "../src/game/tipos";
import { gerarFase, ehChefe, poderRecomendado } from "../src/game/procedural";
import {
  CAPI_INTERVALO_ONDA_S,
  danoDaCapi,
  danoDaGuardia,
  danoDoToque,
  poderDaEquipe,
} from "../src/game/economia";

declare const process: { argv: string[] };

// Baseline de calibragem = só as 2 guardiãs iniciais (lendárias são raras,
// não entram no poder recomendado das fases).
const GUARDIAS = (guardiasJson as unknown as GuardiaDef[]).filter(
  (g) => g.id === "boiadeira" || g.id === "sonequinha",
);

const RODADAS = 250;
const PASSO = 0.1;
const DISTANCIA_SPAWN = 480;
const RAIO_CHEGADA = 42;
const ALCANCE_ONDA_CAPI = 150;
const JANELA_COMBO = 1.5;

interface InimigoSim {
  hp: number;
  dist: number;
  velocidade: number;
  dano: number;
  raio: number;
  ehChefe: boolean;
  arquetipo: string;
  submerso: boolean;
  faseCiclo: number;
  cicloS: number;
}

const SAVE1: SaveData = {
  capim: 0, gemas: 0, toqueNivel: 1, capiAtaqueNivel: 1, capiCalmaNivel: 1,
  guardiaNiveis: Object.fromEntries(GUARDIAS.map((g) => [g.id, 1])),
  guardiasPossuidas: GUARDIAS.map((g) => g.id),
  faseMaxima: 0, estrelas: {}, bonusEstrela3: {}, pityLendaria: 0,
  gemasChefeRecebidas: {},
  evento: {
    sonequinha: "normal", resgateAte: 0, reabreEm: 0,
    cutsceneSurtoVista: false, cutsceneCuraVista: false, ofertaSerenaVista: false,
    serena: "nenhuma", serenaAte: 0, caixaLiberada: false,
  },
  jornada: { reforcoInicialConcedido: false },
  tutoriais: {}, mute: true,
};
const PODER_BASE = poderDaEquipe(GUARDIAS, SAVE1);

// Em vez de casar um nível inteiro (saltos de 1,5× criam serrilhado), escalo
// o dano da equipe por um multiplicador pra bater EXATO o poder-alvo. Como a
// escala dos inimigos e o recomendado crescem juntos, a taxa fica ~constante
// entre fases e calibramos um único ratio.
function simularUmaVez(numero: number, dmgMult: number, calmaBonus: number, rng: () => number): boolean {
  const fase = gerarFase(numero);

  const precisao = Math.min(0.98, Math.max(0.55, 0.85 + (rng() - 0.5) * 0.25));
  const toquesPorSegundo = 1.3 + rng() * 0.6;
  // "habilidade" do jogador nesta partida: foco, mira, uso de habilidade.
  // Variância larga (0,6–1,45) porque jogadores reais variam MUITO — é o que
  // espalha o resultado num gradiente em vez de degrau 0/100.
  const habilidade = 0.6 + rng() * 0.85;

  const recargasGuardia = GUARDIAS.map(() => 0);
  let proximaOndaCapi = CAPI_INTERVALO_ONDA_S;
  let proximoToque = 0.4;
  let combo = 0;
  let ultimoAcerto = -99;

  let calma = fase.calmaMax + calmaBonus;

  let proximo = 0;
  const vivos: InimigoSim[] = [];

  const danoGuardiaTotalPorAtaque = GUARDIAS.map((g) => danoDaGuardia(g, 1) * dmgMult * habilidade);
  const danoCapi = danoDaCapi(1) * dmgMult * habilidade;
  const danoToqueBase = danoDoToque(1) * dmgMult * habilidade;

  for (let tempo = 0; tempo < 400; tempo += PASSO) {
    while (proximo < fase.eventos.length && fase.eventos[proximo].tempo <= tempo) {
      const inst = fase.eventos[proximo].inimigo;
      vivos.push({
        hp: inst.hp,
        dist: DISTANCIA_SPAWN,
        velocidade: inst.velocidade,
        dano: inst.dano,
        raio: inst.raio,
        ehChefe: inst.ehChefe,
        arquetipo: inst.chefe?.arquetipo ?? "",
        submerso: false,
        faseCiclo: 0,
        cicloS: inst.chefe?.cicloS ?? 3.5,
      });
      proximo++;
    }

    // movimento + submersão de chefe mergulhador
    for (const e of vivos) {
      if (e.ehChefe && e.arquetipo === "mergulhador") {
        const f = (tempo - e.faseCiclo) % e.cicloS;
        e.submerso = f < e.cicloS * 0.45;
        if (!e.submerso) e.dist -= e.velocidade * PASSO;
      } else if (e.ehChefe && e.arquetipo === "investida") {
        const f = (tempo - e.faseCiclo) % e.cicloS;
        e.dist -= e.velocidade * PASSO * (f < e.cicloS * 0.55 ? 0.35 : 2.4);
      } else {
        e.dist -= e.velocidade * PASSO;
      }
    }
    vivos.sort((a, b) => a.dist - b.dist);
    const atacaveis = () => vivos.filter((e) => !e.submerso);

    // guardiãs
    for (let g = 0; g < GUARDIAS.length; g++) {
      recargasGuardia[g] -= PASSO;
      if (recargasGuardia[g] > 0) continue;
      const alcance = GUARDIAS[g].alcance;
      const alvo = atacaveis().find((e) => DISTANCIA_SPAWN - e.dist >= DISTANCIA_SPAWN - alcance - 60 || e.dist <= alcance + 60);
      if (!alvo) continue;
      recargasGuardia[g] = GUARDIAS[g].cadenciaS;
      alvo.hp -= danoGuardiaTotalPorAtaque[g];
    }

    // onda dourada da Capi: área
    proximaOndaCapi -= PASSO;
    if (proximaOndaCapi <= 0) {
      proximaOndaCapi = CAPI_INTERVALO_ONDA_S;
      for (const e of atacaveis()) {
        if (e.dist <= ALCANCE_ONDA_CAPI) e.hp -= danoCapi;
      }
    }

    // toque do jogador
    proximoToque -= PASSO;
    if (proximoToque <= 0 && atacaveis().length > 0) {
      proximoToque = 1 / toquesPorSegundo;
      if (rng() < precisao) {
        combo = tempo - ultimoAcerto <= JANELA_COMBO ? combo + 1 : 1;
        ultimoAcerto = tempo;
        const alvo = atacaveis()[0];
        alvo.hp -= danoToqueBase * (1 + 0.12 * Math.min(combo - 1, 10));
      } else {
        combo = 0;
      }
    }

    // remove mortos
    for (let i = vivos.length - 1; i >= 0; i--) if (vivos[i].hp <= 0) vivos.splice(i, 1);

    // chegada na Capi
    for (let i = vivos.length - 1; i >= 0; i--) {
      const e = vivos[i];
      if (e.submerso) continue;
      if (e.dist <= RAIO_CHEGADA) {
        calma -= e.dano;
        if (e.ehChefe) {
          e.dist = 120;
          e.faseCiclo = tempo;
        } else {
          vivos.splice(i, 1);
        }
      }
    }

    if (calma <= 0) return false;
    if (proximo >= fase.eventos.length && vivos.length === 0) return true;
  }
  return false;
}

// "um nível acima" ≈ uma evolução completa da equipe (~1,45× de poder)
const FATOR_NIVEL_ACIMA = 1.45;

function taxa(numero: number, dmgMult: number): number {
  let v = 0;
  // teste conservador: jogador focado em ATAQUE, sem bônus de Calma. Quem
  // investir na Calma da Capi terá folga além disto (fica mais fácil).
  const calmaBonus = 0;
  for (let r = 0; r < RODADAS; r++) {
    const rng = criarRng(r * 7919 + Math.round(dmgMult * 1000) * 104729 + numero * 1299709);
    if (simularUmaVez(numero, dmgMult, calmaBonus, rng)) v++;
  }
  return Math.round((v / RODADAS) * 100);
}

function criarRng(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

const args = process.argv.slice(2);
const ate = args[0] ? Number(args[0]) : 30;

console.log("Capivara Impossível — taxa de vitória por fase (procedural)\n");
console.log("fase | tipo   | poderRec | vit@rec | vit@rec+1");
console.log("-".repeat(52));

let comunsOk = 0;
let comuns = 0;
for (let n = 1; n <= ate; n++) {
  const rec = poderRecomendado(n);
  // nenhum jogador real fica abaixo da equipe nível 1: o piso do teste é 1×.
  const multRec = Math.max(1, rec / PODER_BASE);
  const noRec = taxa(n, multRec);
  const acima = taxa(n, multRec * FATOR_NIVEL_ACIMA);
  const chefe = ehChefe(n);
  const tipo = chefe ? "CHEFÃO" : "comum ";
  const alvoOk = chefe
    ? noRec >= 45 && noRec <= 55 && acima >= 90
    : noRec >= 65 && noRec <= 75;
  if (!chefe) {
    comuns++;
    if (alvoOk) comunsOk++;
  }
  const marca = alvoOk ? "✓" : "·";
  console.log(
    `${String(n).padStart(4)} | ${tipo} | ${String(rec).padStart(8)} | ${String(noRec).padStart(6)}% | ${String(acima).padStart(6)}% ${marca}`,
  );
}
console.log(`\ncomuns na faixa 65–75%: ${comunsOk}/${comuns}`);
