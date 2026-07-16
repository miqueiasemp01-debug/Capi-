import { GUARDIAS } from "./conteudo";
import { adicionarFragmentos, guardiaNoMaximo, type ResultadoFragmentos } from "./fragmentos";
import type { SaveData } from "./tipos";

export const CUSTO_CAIXA = 25;
export const PITY_MAXIMO = 100;
export const PARTIDAS_POR_CAIXA_GRATIS = 10;
export const LENDARIA_DA_CAIXA = "luz_da_calma";
export const PESO_SERENA_COMPRADA = 2;

const CHANCE_CAPIM = 0.6;
const CHANCE_UM_FRAGMENTO = 0.35;
const CHANCE_DEZ_FRAGMENTOS = 0.045;
const CHANCE_DESTAQUE = 0.005;

// Odds públicas e exatas. A escolha da guardiã exclui as que já chegaram ao
// máximo; a Serena só entra depois de comprada e recebe peso 2×.
export const ODDS: { rotulo: string; pct: string }[] = [
  { rotulo: "Capim (escala com a jornada)", pct: "60%" },
  { rotulo: "1 fragmento de guardiã", pct: "35%" },
  { rotulo: "10 fragmentos", pct: "4,5%" },
  { rotulo: "10 frag. Luz da Calma", pct: "0,5%" },
];

export interface CandidatoFragmentos {
  id: string;
  peso: number;
}

export type PremioCaixa =
  | { tipo: "capim"; qtd: number }
  | {
      tipo: "fragmentos";
      id: string;
      qtd: number;
      garantidoPeloPity: boolean;
      resultado: ResultadoFragmentos;
    };

// Para 1 fragmento entram todas as guardiãs disponíveis. No prêmio de 10,
// lendárias ficam fora, exceto a Serena já comprada; a Luz tem o jackpot e o
// pity próprios. Isso mantém a lendária rara sem desperdiçar a compra da Serena.
export function candidatosAFragmentos(dados: SaveData, quantidade: 1 | 10): CandidatoFragmentos[] {
  return GUARDIAS
    .filter((guardia) => {
      if (guardiaNoMaximo(dados, guardia.id)) return false;
      if (guardia.id === "grande_serena" && !dados.guardiasPossuidas.includes(guardia.id)) return false;
      if (quantidade === 10 && guardia.raridade === "lendaria" && guardia.id !== "grande_serena") return false;
      return true;
    })
    .map((guardia) => ({
      id: guardia.id,
      peso: guardia.id === "grande_serena" ? PESO_SERENA_COMPRADA : 1,
    }));
}

function escolherPonderado(candidatos: CandidatoFragmentos[], rng: () => number): string | null {
  const pesoTotal = candidatos.reduce((total, candidato) => total + candidato.peso, 0);
  if (pesoTotal <= 0) return null;
  let ponto = Math.min(0.999999999, Math.max(0, rng())) * pesoTotal;
  for (const candidato of candidatos) {
    ponto -= candidato.peso;
    if (ponto < 0) return candidato.id;
  }
  return candidatos[candidatos.length - 1]?.id ?? null;
}

function faixaCapim(dados: SaveData): { minimo: number; maximo: number } {
  const capitulo = Math.max(0, Math.floor(dados.faseMaxima / 20));
  return {
    minimo: 40 + capitulo * 20,
    maximo: 100 + capitulo * 30,
  };
}

function premiarCapim(dados: SaveData, rng: () => number, bonus = 0): PremioCaixa {
  const { minimo, maximo } = faixaCapim(dados);
  const qtd = minimo + Math.floor(Math.min(0.999999999, Math.max(0, rng())) * (maximo - minimo + 1)) + bonus;
  dados.capim += qtd;
  return { tipo: "capim", qtd };
}

function premiarFragmentos(
  dados: SaveData,
  id: string,
  qtd: number,
  garantidoPeloPity: boolean,
): PremioCaixa {
  return {
    tipo: "fragmentos",
    id,
    qtd,
    garantidoPeloPity,
    resultado: adicionarFragmentos(dados, id, qtd),
  };
}

// Abre uma caixa sem cobrar. A cena decide entre consumir uma grátis ou 25
// gemas. Toda abertura conta no mesmo pity, inclusive as gratuitas.
export function abrirCaixa(dados: SaveData, rng: () => number = Math.random): PremioCaixa {
  dados.pityLendaria = Math.min(PITY_MAXIMO, dados.pityLendaria + 1);
  const garantida = dados.pityLendaria >= PITY_MAXIMO;
  const faixa = garantida ? 1 : Math.min(0.999999999, Math.max(0, rng()));

  if (garantida || faixa >= 1 - CHANCE_DESTAQUE) {
    const destaqueDisponivel = !guardiaNoMaximo(dados, LENDARIA_DA_CAIXA)
      ? LENDARIA_DA_CAIXA
      : escolherPonderado(candidatosAFragmentos(dados, 10), rng);
    if (destaqueDisponivel) {
      dados.pityLendaria = 0;
      return premiarFragmentos(dados, destaqueDisponivel, 10, garantida);
    }
    // Coleção elegível toda no máximo: não desperdiça o contador. Entrega
    // capim reforçado e deixa o pity pronto para uma futura guardiã.
    dados.pityLendaria = PITY_MAXIMO - 1;
    return premiarCapim(dados, rng, 400);
  }

  if (faixa < CHANCE_CAPIM) return premiarCapim(dados, rng);

  if (faixa < CHANCE_CAPIM + CHANCE_UM_FRAGMENTO) {
    const id = escolherPonderado(candidatosAFragmentos(dados, 1), rng);
    return id ? premiarFragmentos(dados, id, 1, false) : premiarCapim(dados, rng, 100);
  }

  if (faixa < CHANCE_CAPIM + CHANCE_UM_FRAGMENTO + CHANCE_DEZ_FRAGMENTOS) {
    const id = escolherPonderado(candidatosAFragmentos(dados, 10), rng);
    return id ? premiarFragmentos(dados, id, 10, false) : premiarCapim(dados, rng, 200);
  }

  // Proteção contra arredondamentos futuros nas faixas.
  return premiarCapim(dados, rng);
}

export function registrarPartidaConcluida(dados: SaveData): boolean {
  dados.partidasConcluidas++;
  if (dados.partidasConcluidas % PARTIDAS_POR_CAIXA_GRATIS !== 0) return false;
  dados.caixasGratisDisponiveis++;
  return true;
}

export function progressoParaCaixaGratis(dados: SaveData): number {
  return dados.partidasConcluidas % PARTIDAS_POR_CAIXA_GRATIS;
}

export function consumirCaixaGratis(dados: SaveData): boolean {
  if (dados.caixasGratisDisponiveis <= 0) return false;
  dados.caixasGratisDisponiveis--;
  return true;
}
