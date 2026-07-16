import { GUARDIAS } from "../src/game/conteudo";
import { evolucaoDaGuardia } from "../src/game/fragmentos";
import { gerarFase } from "../src/game/procedural";
import { criarDadosVitrine, FASE_VITRINE } from "../src/game/vitrine";

function afirmar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

const primeira = criarDadosVitrine();
const segunda = criarDadosVitrine();
const ids = GUARDIAS.map((guardia) => guardia.id);

afirmar(ids.every((id) => primeira.guardiasPossuidas.includes(id)), "todas as guardiãs devem estar disponíveis");
afirmar(ids.every((id) => evolucaoDaGuardia(primeira, id) === 2), "todas devem começar em Evo 2");
afirmar(primeira.faseMaxima + 1 === FASE_VITRINE, "a fase 30 deve ser a próxima disponível");
afirmar(gerarFase(FASE_VITRINE).ehChefe, "a vitrine deve abrir em uma fase de chefão");
afirmar(primeira.caixasGratisDisponiveis >= 10, "a Caixa precisa estar explorável");
afirmar(primeira.pityLendaria === 99, "a próxima Caixa deve demonstrar o pity");

primeira.capim = 0;
afirmar(segunda.capim === 50_000, "cada abertura da vitrine precisa nascer isolada");

console.log("✓ Vitrine isolada: fase 30, cinco guardiãs, Evo 2, Caixa e pity prontos.");
