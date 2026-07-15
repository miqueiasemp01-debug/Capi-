import type { SaveData } from "./tipos";

export type Destino =
  | { tela: "titulo" }
  | { tela: "mapa" }
  | { tela: "equipe" }
  | { tela: "caixa" }
  | { tela: "cutscene"; tipo: "surto" | "cura" }
  | { tela: "fase"; numero: number };

// Contexto compartilhado entre as cenas: estado do jogador + navegação.
// O roteamento concreto vive em main.ts pra evitar imports circulares.
export interface Jogo {
  dados: SaveData;
  salvar(): void;
  irPara(destino: Destino): void;
}
