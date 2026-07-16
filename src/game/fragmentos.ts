import type { SaveData } from "./tipos";

export const TOTAL_DESBLOQUEIO = 10;
export const TOTAL_EVOLUCAO_1 = 20;
export const TOTAL_EVOLUCAO_2 = 40;
export const TOTAL_EVOLUCAO_3 = 90;
export const TOTAL_FRAGMENTOS_MAXIMO = TOTAL_EVOLUCAO_3;

export type NivelEvolucaoFragmentos = 0 | 1 | 2 | 3;

export interface ProgressoFragmentos {
  atual: number;
  necessario: number;
  total: number;
  totalAteProxima: number;
  noMaximo: boolean;
}

export interface ResultadoFragmentos {
  totalAntes: number;
  totalDepois: number;
  quantidadeAplicada: number;
  evolucaoAntes: NivelEvolucaoFragmentos;
  evolucaoDepois: NivelEvolucaoFragmentos;
  desbloqueou: boolean;
}

export function totalDeFragmentos(dados: SaveData, guardiaId: string): number {
  return Math.max(0, Math.min(TOTAL_FRAGMENTOS_MAXIMO, Math.floor(dados.fragmentosGuardia[guardiaId] ?? 0)));
}

export function evolucaoPeloTotal(total: number): NivelEvolucaoFragmentos {
  if (total >= TOTAL_EVOLUCAO_3) return 3;
  if (total >= TOTAL_EVOLUCAO_2) return 2;
  if (total >= TOTAL_EVOLUCAO_1) return 1;
  return 0;
}

export function evolucaoDaGuardia(dados: SaveData, guardiaId: string): NivelEvolucaoFragmentos {
  return evolucaoPeloTotal(totalDeFragmentos(dados, guardiaId));
}

export function multiplicadorDanoDaEvolucao(evolucao: NivelEvolucaoFragmentos): number {
  return 2 ** evolucao;
}

export function divisorRecargaDaEvolucao(evolucao: NivelEvolucaoFragmentos): number {
  return 2 ** evolucao;
}

export function guardiaNoMaximo(dados: SaveData, guardiaId: string): boolean {
  return totalDeFragmentos(dados, guardiaId) >= TOTAL_FRAGMENTOS_MAXIMO;
}

export function progressoDeFragmentos(dados: SaveData, guardiaId: string): ProgressoFragmentos {
  const total = totalDeFragmentos(dados, guardiaId);
  if (total >= TOTAL_FRAGMENTOS_MAXIMO) {
    return { atual: 0, necessario: 0, total, totalAteProxima: TOTAL_FRAGMENTOS_MAXIMO, noMaximo: true };
  }

  const marcos = [TOTAL_DESBLOQUEIO, TOTAL_EVOLUCAO_1, TOTAL_EVOLUCAO_2, TOTAL_EVOLUCAO_3];
  const totalAteProxima = marcos.find((marco) => total < marco) ?? TOTAL_FRAGMENTOS_MAXIMO;
  const totalAnterior = totalAteProxima === TOTAL_DESBLOQUEIO
    ? 0
    : marcos[marcos.indexOf(totalAteProxima) - 1];
  return {
    atual: total - totalAnterior,
    necessario: totalAteProxima - totalAnterior,
    total,
    totalAteProxima,
    noMaximo: false,
  };
}

export function adicionarFragmentos(
  dados: SaveData,
  guardiaId: string,
  quantidade: number,
): ResultadoFragmentos {
  const totalAntes = totalDeFragmentos(dados, guardiaId);
  const evolucaoAntes = evolucaoPeloTotal(totalAntes);
  const totalDepois = Math.min(TOTAL_FRAGMENTOS_MAXIMO, totalAntes + Math.max(0, Math.floor(quantidade)));
  dados.fragmentosGuardia[guardiaId] = totalDepois;

  const tinhaGuardia = dados.guardiasPossuidas.includes(guardiaId);
  if (totalDepois >= TOTAL_DESBLOQUEIO && !tinhaGuardia) dados.guardiasPossuidas.push(guardiaId);

  return {
    totalAntes,
    totalDepois,
    quantidadeAplicada: totalDepois - totalAntes,
    evolucaoAntes,
    evolucaoDepois: evolucaoPeloTotal(totalDepois),
    desbloqueou: !tinhaGuardia && totalDepois >= TOTAL_DESBLOQUEIO,
  };
}
