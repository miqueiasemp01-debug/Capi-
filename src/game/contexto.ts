import type { SaveData } from "./tipos";

export type Destino =
  | { tela: "titulo" }
  | { tela: "equipe" }
  | { tela: "fase"; faseId: string };

// Contexto compartilhado entre as cenas: estado do jogador + navegação.
// O roteamento concreto vive em main.ts pra evitar imports circulares.
export interface Jogo {
  dados: SaveData;
  salvar(): void;
  irPara(destino: Destino): void;
}
