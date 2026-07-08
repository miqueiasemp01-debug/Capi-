// Simulador de balanceamento (versão semente).
// Roda uma aproximação headless de cada fase por nível de equipe e imprime
// o resultado — é a régua pra calibrar o power gate com dados, não no olho.
// Uso: npm run simular

import fasesJson from "../src/data/fases.json";
import guardiasJson from "../src/data/guardias.json";
import inimigosJson from "../src/data/inimigos.json";
import type { FaseDef, GuardiaDef, InimigoDef, SaveData } from "../src/game/tipos";
import { danoDaGuardia, danoDoToque, poderDaEquipe } from "../src/game/economia";

const FASES = fasesJson as unknown as FaseDef[];
const GUARDIAS = guardiasJson as unknown as GuardiaDef[];
const INIMIGOS = new Map((inimigosJson as unknown as InimigoDef[]).map((i) => [i.id, i]));

const DISTANCIA_SPAWN = 480;
const RAIO_CHEGADA = 42;
const TOQUES_POR_SEGUNDO = 1.6;
const PRECISAO_DO_JOGADOR = 0.85;
const PASSO = 0.1;

interface InimigoSim {
  def: InimigoDef;
  hp: number;
  dist: number;
}

function simularFase(fase: FaseDef, nivel: number): { vitoria: boolean; calmaRestante: number } {
  const eventos = fase.spawns
    .flatMap((s) =>
      Array.from({ length: s.quantidade }, (_, i) => ({
        tempo: s.tempo + i * s.intervalo,
        tipo: s.tipo,
      })),
    )
    .sort((a, b) => a.tempo - b.tempo);

  const dpsGuardias = GUARDIAS.reduce(
    (soma, g) => soma + danoDaGuardia(g, nivel) / g.cadenciaS,
    0,
  );
  const dpsToque = danoDoToque(nivel) * TOQUES_POR_SEGUNDO * PRECISAO_DO_JOGADOR;
  const dpsTotal = dpsGuardias + dpsToque;

  let calma = fase.calmaMax;
  let proximo = 0;
  const vivos: InimigoSim[] = [];

  for (let tempo = 0; tempo < 300; tempo += PASSO) {
    while (proximo < eventos.length && eventos[proximo].tempo <= tempo) {
      const def = INIMIGOS.get(eventos[proximo].tipo);
      if (!def) throw new Error(`Inimigo desconhecido: ${eventos[proximo].tipo}`);
      vivos.push({ def, hp: def.hp, dist: DISTANCIA_SPAWN });
      proximo++;
    }

    for (const inimigo of vivos) inimigo.dist -= inimigo.def.velocidade * PASSO;

    // todo o dano foca no inimigo mais próximo (aproximação do jogo real)
    let danoRestante = dpsTotal * PASSO;
    vivos.sort((a, b) => a.dist - b.dist);
    while (danoRestante > 0 && vivos.length > 0) {
      const alvo = vivos[0];
      const aplicado = Math.min(alvo.hp, danoRestante);
      alvo.hp -= aplicado;
      danoRestante -= aplicado;
      if (alvo.hp <= 0) vivos.shift();
    }

    for (let i = vivos.length - 1; i >= 0; i--) {
      if (vivos[i].dist <= RAIO_CHEGADA) {
        calma -= vivos[i].def.dano;
        vivos.splice(i, 1);
      }
    }

    if (calma <= 0) return { vitoria: false, calmaRestante: 0 };
    if (proximo >= eventos.length && vivos.length === 0) {
      return { vitoria: true, calmaRestante: calma };
    }
  }
  return { vitoria: false, calmaRestante: calma };
}

console.log("Capivara Impossível — simulador de balanceamento\n");

for (let nivel = 1; nivel <= 5; nivel++) {
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
  const linha = FASES.map((fase) => {
    const { vitoria, calmaRestante } = simularFase(fase, nivel);
    const marca = vitoria ? "V" : "D";
    return `${fase.id}:${marca}(${calmaRestante}/${fase.calmaMax})`;
  }).join("  ");
  console.log(`nível ${nivel} (poder ${String(poder).padStart(3)}) → ${linha}`);
}

console.log("\nRecomendado por fase:", FASES.map((f) => `${f.id}=${f.poderRecomendado}`).join("  "));
