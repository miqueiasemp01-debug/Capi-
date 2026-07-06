import type { GuardiaDef, Raridade, SaveData } from "./tipos";

const MULTIPLICADOR_RARIDADE: Record<Raridade, number> = {
  comum: 1,
  rara: 1.5,
  epica: 2.2,
  lendaria: 3.2,
};

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
  return guardia.danoBase * (1 + 0.3 * (nivel - 1));
}

export function valorDeCombate(guardia: GuardiaDef, nivel: number): number {
  return danoDaGuardia(guardia, nivel) * nivel * MULTIPLICADOR_RARIDADE[guardia.raridade];
}

export function danoDoToque(nivel: number): number {
  return 2 + (nivel - 1);
}

export function custoEvoluirGuardia(nivelAtual: number): number {
  return 10 * nivelAtual;
}

export function custoEvoluirToque(nivelAtual: number): number {
  return 12 * nivelAtual;
}

// A régua central do jogo: é este número que o jogador compara com o
// "poder recomendado" da fase antes de entrar.
export function poderDaEquipe(guardias: GuardiaDef[], dados: SaveData): number {
  const somaGuardias = guardias.reduce(
    (soma, g) => soma + valorDeCombate(g, nivelDaGuardia(dados, g.id)),
    0,
  );
  return Math.round(somaGuardias + dados.toqueNivel * 4);
}
