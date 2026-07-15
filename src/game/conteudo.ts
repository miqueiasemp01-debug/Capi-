import guardiasJson from "../data/guardias.json";
import inimigosJson from "../data/inimigos.json";
import type { GuardiaDef, InimigoDef } from "./tipos";

// Fases agora são procedurais (ver procedural.ts) — não há mais fases.json.
export const GUARDIAS = guardiasJson as unknown as GuardiaDef[];
export const INIMIGOS = inimigosJson as unknown as InimigoDef[];

export function guardiaPorId(id: string): GuardiaDef | undefined {
  return GUARDIAS.find((g) => g.id === id);
}

// Guardiãs base (iniciais). Lendárias vêm por evento/caixa.
export const GUARDIAS_INICIAIS = ["boiadeira", "sonequinha"];
export const LENDARIAS = ["grande_serena", "luz_da_calma"];
