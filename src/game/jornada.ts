import type { SaveData } from "./tipos";
import {
  cutsceneCuraPendente,
  cutsceneSurtoPendente,
  deveSurtar,
  iniciarSurto,
  sincronizarEvento,
} from "./evento";
import { agora } from "./tempo";

export const REFORCO_INICIAL_ID = "estagiario";

export function concederReforcoInicialSeDevido(dados: SaveData): boolean {
  if (dados.faseMaxima < 3) return false;

  let mudou = false;
  if (!dados.guardiasPossuidas.includes(REFORCO_INICIAL_ID)) {
    dados.guardiasPossuidas.push(REFORCO_INICIAL_ID);
    mudou = true;
  }
  if (!dados.jornada.reforcoInicialConcedido) {
    dados.jornada.reforcoInicialConcedido = true;
    mudou = true;
  }
  return mudou;
}

// Único ponto de preparação persistente usado no carregamento, mapa e rotas.
// A ordem é importante: o reforço entra antes de o Surto bloquear a Sonequinha.
export function prepararFundacaoJornada(dados: SaveData, instante = agora()): boolean {
  let mudou = sincronizarEvento(dados, instante);
  if (concederReforcoInicialSeDevido(dados)) mudou = true;
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
