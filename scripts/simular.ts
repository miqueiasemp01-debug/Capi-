// Simulador de balanceamento — imprime a TAXA DE VITÓRIA por fase × nível
// de poder (Monte Carlo). É a régua pra calibrar o power gate com dados.
// Alvo desta calibragem: fases 1-2 fáceis, muro na fase 4, vitória
// confortável 1 nível acima do recomendado.
// Uso: npm run simular

import fasesJson from "../src/data/fases.json";
import guardiasJson from "../src/data/guardias.json";
import inimigosJson from "../src/data/inimigos.json";
import type { FaseDef, GuardiaDef, InimigoDef, SaveData } from "../src/game/tipos";
import { danoDaGuardia, danoDoToque, poderDaEquipe } from "../src/game/economia";

const FASES = fasesJson as unknown as FaseDef[];
const GUARDIAS = guardiasJson as unknown as GuardiaDef[];
const INIMIGOS = new Map((inimigosJson as unknown as InimigoDef[]).map((i) => [i.id, i]));

const RODADAS = 300;
const PASSO = 0.1;
const DISTANCIA_SPAWN = 480;
const RAIO_CHEGADA = 42;
const JANELA_COMBO = 1.5;

interface InimigoSim {
  def: InimigoDef;
  hp: number;
  dist: number;
}

interface Resultado {
  taxaVitoria: number;
  calmaMedia: number;
}

function simularUmaVez(fase: FaseDef, nivel: number, sorteio: () => number): boolean {
  const eventos = fase.spawns
    .flatMap((s) =>
      Array.from({ length: s.quantidade }, (_, i) => ({
        tempo: s.tempo + i * s.intervalo,
        tipo: s.tipo,
      })),
    )
    .sort((a, b) => a.tempo - b.tempo);

  // perfil do jogador desta rodada: precisão e velocidade de toque variam
  const precisao = Math.min(0.98, Math.max(0.55, 0.85 + (sorteio() - 0.5) * 0.25));
  const toquesPorSegundo = 1.3 + sorteio() * 0.6;
  const danoToqueBase = danoDoToque(nivel);

  const recargas = GUARDIAS.map(() => 0);
  let proximoToque = 0.4;
  let combo = 0;
  let ultimoAcerto = -99;

  let calma = fase.calmaMax;
  let proximo = 0;
  const vivos: InimigoSim[] = [];

  for (let tempo = 0; tempo < 400; tempo += PASSO) {
    while (proximo < eventos.length && eventos[proximo].tempo <= tempo) {
      const def = INIMIGOS.get(eventos[proximo].tipo);
      if (!def) throw new Error(`Inimigo desconhecido: ${eventos[proximo].tipo}`);
      vivos.push({ def, hp: def.hp, dist: DISTANCIA_SPAWN });
      proximo++;
    }

    for (const inimigo of vivos) inimigo.dist -= inimigo.def.velocidade * PASSO;
    vivos.sort((a, b) => a.dist - b.dist);

    // guardiãs: cada uma ataca o inimigo mais próximo dentro do alcance
    for (let g = 0; g < GUARDIAS.length; g++) {
      recargas[g] -= PASSO;
      if (recargas[g] > 0) continue;
      const guardia = GUARDIAS[g];
      const alvo = vivos.find((i) => i.dist <= guardia.alcance + 60);
      if (!alvo) continue;
      recargas[g] = guardia.cadenciaS;
      alvo.hp -= danoDaGuardia(guardia, nivel);
      if (alvo.hp <= 0) vivos.splice(vivos.indexOf(alvo), 1);
    }

    // Toque de Calma: acerta o mais próximo com a precisão sorteada; combo
    proximoToque -= PASSO;
    if (proximoToque <= 0 && vivos.length > 0) {
      proximoToque = 1 / toquesPorSegundo;
      if (sorteio() < precisao) {
        combo = tempo - ultimoAcerto <= JANELA_COMBO ? combo + 1 : 1;
        ultimoAcerto = tempo;
        const alvo = vivos[0];
        alvo.hp -= danoToqueBase * (1 + 0.12 * Math.min(combo - 1, 10));
        if (alvo.hp <= 0) vivos.shift();
      } else {
        combo = 0;
      }
    }

    for (let i = vivos.length - 1; i >= 0; i--) {
      if (vivos[i].dist <= RAIO_CHEGADA) {
        calma -= vivos[i].def.dano;
        vivos.splice(i, 1);
      }
    }

    if (calma <= 0) return false;
    if (proximo >= eventos.length && vivos.length === 0) return true;
  }
  return false;
}

// gerador determinístico pra tabela reprodutível
function criarSorteio(semente: number): () => number {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function simular(fase: FaseDef, nivel: number): Resultado {
  let vitorias = 0;
  for (let rodada = 0; rodada < RODADAS; rodada++) {
    const sorteio = criarSorteio(rodada * 7919 + nivel * 104729 + fase.numero * 1299709);
    if (simularUmaVez(fase, nivel, sorteio)) vitorias++;
  }
  return { taxaVitoria: vitorias / RODADAS, calmaMedia: 0 };
}

console.log("Capivara Impossível — taxa de vitória por fase × nível de poder\n");

const cabecalho = ["nível (poder)", ...FASES.map((f) => `  ${f.id}`)].join(" | ");
console.log(cabecalho);
console.log("-".repeat(cabecalho.length));

for (let nivel = 1; nivel <= 6; nivel++) {
  const dadosSim: SaveData = {
    capim: 0,
    gemas: 0,
    tutoriais: {},
    toqueNivel: nivel,
    guardiaNiveis: Object.fromEntries(GUARDIAS.map((g) => [g.id, nivel])),
    faseMaxima: 0,
    estrelas: {},
  };
  const poder = poderDaEquipe(GUARDIAS, dadosSim);
  const celulas = FASES.map((fase) => {
    const { taxaVitoria } = simular(fase, nivel);
    return `${Math.round(taxaVitoria * 100)}%`.padStart(5);
  });
  console.log([`nível ${nivel} (${String(poder).padStart(3)})`.padEnd(13), ...celulas].join(" | "));
}

console.log(`\nPoder recomendado: ${FASES.map((f) => `${f.id}=${f.poderRecomendado}`).join("  ")}`);
console.log(`(${RODADAS} rodadas por célula; toque com precisão 55-98% e 1,3-1,9 toques/s)`);
