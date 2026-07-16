import type { SaveData } from "./tipos";
import { cutsceneCuraPendente, cutsceneSurtoPendente, deveSurtar, iniciarSurto, sincronizarEvento } from "./evento";
import { agora } from "./tempo";

// Único ponto de preparação persistente usado no carregamento, mapa e rotas.
export function prepararFundacaoJornada(dados: SaveData, instante = agora()): boolean {
  let mudou = sincronizarEvento(dados, instante);
  if (deveSurtar(dados) && iniciarSurto(dados, instante)) mudou = true;
  return mudou;
}

export function cutscenePendente(dados: SaveData): "surto" | "cura" | null {
  if (cutsceneCuraPendente(dados)) return "cura";
  if (cutsceneSurtoPendente(dados)) return "surto";
  return null;
}

export function verificarNavegacao(
  dados: SaveData,
  instante = agora(),
): { mudou: boolean; cutscene: "surto" | "cura" | null } {
  const mudou = prepararFundacaoJornada(dados, instante);
  return { mudou, cutscene: cutscenePendente(dados) };
}
