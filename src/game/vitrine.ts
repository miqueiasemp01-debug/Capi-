import { GUARDIAS } from "./conteudo";
import { TOTAL_EVOLUCAO_2 } from "./fragmentos";
import { criarSavePadrao } from "./save";
import type { SaveData } from "./tipos";

export const FASE_VITRINE = 30;

// Estado descartável para apresentação. Ele nunca é gravado pelo roteador e,
// por isso, não disputa nem migra o save real do aparelho.
export function criarDadosVitrine(): SaveData {
  const dados = criarSavePadrao();
  const ids = GUARDIAS.map((guardia) => guardia.id);

  dados.capim = 50_000;
  dados.gemas = 2_500;
  // Perto do poder recomendado da fase 30: dá tempo de observar ataques e
  // habilidades, enquanto Calma extra perdoa erros durante a demonstração.
  dados.toqueNivel = 2;
  dados.capiAtaqueNivel = 2;
  dados.capiCalmaNivel = 6;
  dados.guardiaNiveis = Object.fromEntries(ids.map((id) => [id, 2]));
  dados.guardiasPossuidas = [...ids];
  dados.fragmentosGuardia = Object.fromEntries(ids.map((id) => [id, TOTAL_EVOLUCAO_2]));
  dados.faseMaxima = FASE_VITRINE - 1;
  dados.estrelas = Object.fromEntries(
    Array.from({ length: FASE_VITRINE - 1 }, (_, indice) => [String(indice + 1), 3]),
  );
  dados.bonusEstrela3 = Object.fromEntries(
    Array.from({ length: FASE_VITRINE - 1 }, (_, indice) => [String(indice + 1), true]),
  );
  dados.gemasChefeRecebidas = { "10": true, "20": true };
  dados.pityLendaria = 99;
  dados.partidasConcluidas = 99;
  dados.caixasGratisDisponiveis = 10;
  dados.evento = {
    sonequinha: "curada",
    resgateAte: 0,
    reabreEm: 0,
    cutsceneSurtoVista: true,
    cutsceneCuraVista: true,
    ofertaSerenaVista: true,
    serena: "comprada",
    serenaAte: 0,
    caixaLiberada: true,
  };
  dados.jornada = {
    reforcoInicialConcedido: true,
    migracaoEstagiarioShardsConcluida: true,
  };
  dados.tutoriais = { toque: true, habilidade: true, evoluir: true };
  dados.mute = false;

  return dados;
}
