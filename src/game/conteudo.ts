import fasesJson from "../data/fases.json";
import guardiasJson from "../data/guardias.json";
import inimigosJson from "../data/inimigos.json";
import type { FaseDef, GuardiaDef, InimigoDef } from "./tipos";

export const FASES = fasesJson as unknown as FaseDef[];
export const GUARDIAS = guardiasJson as unknown as GuardiaDef[];
export const INIMIGOS = inimigosJson as unknown as InimigoDef[];

export function fasePorId(id: string): FaseDef {
  const fase = FASES.find((f) => f.id === id);
  if (!fase) throw new Error(`Fase desconhecida: ${id}`);
  return fase;
}

export function inimigoPorId(id: string): InimigoDef {
  const inimigo = INIMIGOS.find((i) => i.id === id);
  if (!inimigo) throw new Error(`Inimigo desconhecido: ${id}`);
  return inimigo;
}
