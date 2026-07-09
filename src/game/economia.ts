import type { GuardiaDef, Raridade, SaveData } from "./tipos";

const MULTIPLICADOR_RARIDADE: Record<Raridade, number> = {
  comum: 1,
  rara: 1.5,
  epica: 2.2,
  lendaria: 3.2,
};

// Crescimento multiplicativo: cada nível de guardiã = +50% de dano,
// cada nível do Toque = +40%. É isso que faz a evolução "se sentir".
export const GANHO_GUARDIA = 1.5;
export const GANHO_TOQUE = 1.4;

// Capi combatente: onda dourada radial automática.
export const GANHO_CAPI_ATAQUE = 1.4;
export const CAPI_DANO_BASE = 3;
export const CAPI_INTERVALO_ONDA_S = 3.4;
export const CAPI_CALMA_POR_NIVEL = 2;

export function nivelDaGuardia(dados: SaveData, guardiaId: string): number {
  return dados.guardiaNiveis[guardiaId] ?? 1;
}

// Estágios narrativos do plano: Filhote → Adulta → Plena.
export function estagioDaGuardia(nivel: number): "filhote" | "adulta" | "plena" {
  if (nivel >= 5) return "plena";
  if (nivel >= 3) return "adulta";
  return "filhote";
}

export function danoDaGuardia(guardia: GuardiaDef, nivel: number): number {
  return guardia.danoBase * GANHO_GUARDIA ** (nivel - 1);
}

export function danoDoToque(nivel: number): number {
  return 2 * GANHO_TOQUE ** (nivel - 1);
}

export function danoDaCapi(nivelAtaque: number): number {
  return CAPI_DANO_BASE * GANHO_CAPI_ATAQUE ** (nivelAtaque - 1);
}

export function calmaMaximaBonus(nivelCalma: number): number {
  return (nivelCalma - 1) * CAPI_CALMA_POR_NIVEL;
}

// Custos crescem mais rápido que o dano (1.9 > 1.5): cada evolução pede
// mais fases jogadas — a régua de "2 dias por desejo" do plano.
export function custoEvoluirGuardia(nivelAtual: number): number {
  return Math.round(25 * 1.9 ** (nivelAtual - 1));
}

export function custoEvoluirToque(nivelAtual: number): number {
  return Math.round(30 * 1.9 ** (nivelAtual - 1));
}

export function custoEvoluirCapiAtaque(nivelAtual: number): number {
  return Math.round(28 * 1.9 ** (nivelAtual - 1));
}

export function custoEvoluirCapiCalma(nivelAtual: number): number {
  return Math.round(22 * 1.85 ** (nivelAtual - 1));
}

export function valorDeCombate(guardia: GuardiaDef, nivel: number): number {
  // DPS efetivo ponderado pela raridade
  return (danoDaGuardia(guardia, nivel) / guardia.cadenciaS) * MULTIPLICADOR_RARIDADE[guardia.raridade];
}

// A régua central do jogo: é este número que o jogador compara com o
// "poder recomendado" da fase antes de entrar. Soma guardiãs + Toque + Capi.
export function poderDaEquipe(guardias: GuardiaDef[], dados: SaveData): number {
  const somaGuardias = guardias.reduce(
    (soma, g) => soma + valorDeCombate(g, nivelDaGuardia(dados, g.id)),
    0,
  );
  const dpsCapi = danoDaCapi(dados.capiAtaqueNivel) / CAPI_INTERVALO_ONDA_S * 1.6;
  return Math.round(somaGuardias + danoDoToque(dados.toqueNivel) * 2 + dpsCapi);
}
