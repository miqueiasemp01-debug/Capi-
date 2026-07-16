import type { RecompensasDaVitoria } from "./recompensas";
import type { SaveData } from "./tipos";

export interface PacoteDuplicavel {
  capim: number;
  gemas: number;
}

export interface ControleDuplicacao {
  aplicada: boolean;
}

export function pacoteDuplicavelDaVitoria(recompensa: RecompensasDaVitoria): PacoteDuplicavel {
  return {
    capim: recompensa.capimGanho,
    gemas: recompensa.gemasChefeGanhas + recompensa.gemasBonus3,
  };
}

export function temRecompensaDuplicavel(pacote: PacoteDuplicavel): boolean {
  return pacote.capim > 0 || pacote.gemas > 0;
}

// Copia somente as moedas realmente pagas nesta partida. Livros-razão de
// primeira vitória, estrelas, Caixa grátis, pity e evento não são tocados.
export function aplicarDuplicacaoDaPartida(
  dados: SaveData,
  pacote: PacoteDuplicavel,
  controle: ControleDuplicacao,
): boolean {
  if (controle.aplicada || !temRecompensaDuplicavel(pacote)) return false;

  dados.capim += Math.max(0, Math.floor(pacote.capim));
  dados.gemas += Math.max(0, Math.floor(pacote.gemas));
  controle.aplicada = true;
  return true;
}
