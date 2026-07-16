import { guardiaPorId } from "../src/game/conteudo";
import { danoDaGuardia, recargaDaHabilidade } from "../src/game/economia";
import {
  abrirCaixa,
  candidatosAFragmentos,
  consumirCaixaGratis,
  PITY_MAXIMO,
  registrarPartidaConcluida,
} from "../src/game/gacha";
import {
  adicionarFragmentos,
  evolucaoDaGuardia,
  guardiaNoMaximo,
  multiplicadorDanoDaEvolucao,
} from "../src/game/fragmentos";
import { criarSavePadrao } from "../src/game/save";

function afirmar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

function igual<T>(recebido: T, esperado: T, mensagem: string): void {
  if (recebido !== esperado) {
    throw new Error(`${mensagem}: esperado ${String(esperado)}, recebido ${String(recebido)}`);
  }
}

function proximoDe(...valores: number[]): () => number {
  let indice = 0;
  return () => valores[indice++] ?? valores[valores.length - 1] ?? 0;
}

function testar(nome: string, teste: () => void): void {
  teste();
  console.log(`✓ ${nome}`);
}

testar("cada 10 partidas concluídas acumula uma Caixa grátis, inclusive replays", () => {
  const dados = criarSavePadrao();
  for (let i = 1; i <= 9; i++) afirmar(!registrarPartidaConcluida(dados), `partida ${i} não deve premiar`);
  afirmar(registrarPartidaConcluida(dados), "décima partida deve premiar");
  for (let i = 11; i <= 19; i++) afirmar(!registrarPartidaConcluida(dados), `partida ${i} não deve premiar`);
  afirmar(registrarPartidaConcluida(dados), "vigésima partida deve acumular outra");
  igual(dados.caixasGratisDisponiveis, 2, "duas caixas acumuladas");
  afirmar(consumirCaixaGratis(dados), "primeira caixa grátis deve ser consumível");
  igual(dados.caixasGratisDisponiveis, 1, "uma caixa restante");
});

testar("Caixa entrega capim sem devolver gemas e toda abertura avança o pity", () => {
  const dados = criarSavePadrao();
  dados.gemas = 50;
  const premio = abrirCaixa(dados, proximoDe(0.1, 0.5));
  igual(premio.tipo, "capim", "faixa de 60%");
  igual(dados.gemas, 50, "abrirCaixa nunca credita gemas");
  igual(dados.pityLendaria, 1, "pity após uma abertura");
});

testar("1 fragmento não desbloqueia e o jackpot aleatório de 10 pode desbloquear", () => {
  const unidade = criarSavePadrao();
  const premioUm = abrirCaixa(unidade, proximoDe(0.7, 0.6));
  afirmar(premioUm.tipo === "fragmentos", "resultado deve ser fragmento");
  igual(premioUm.id, "estagiario", "seleção controlada da guardiã");
  igual(premioUm.qtd, 1, "quantidade unitária");
  afirmar(!unidade.guardiasPossuidas.includes("estagiario"), "um fragmento não desbloqueia");

  const jackpot = criarSavePadrao();
  const premioDez = abrirCaixa(jackpot, proximoDe(0.97, 0.9));
  afirmar(premioDez.tipo === "fragmentos", "resultado deve ser fragmento");
  igual(premioDez.id, "estagiario", "jackpot controlado da guardiã");
  igual(premioDez.qtd, 10, "jackpot deve dar dez");
  afirmar(premioDez.resultado.desbloqueou, "dez fragmentos desbloqueiam");
  afirmar(jackpot.guardiasPossuidas.includes("estagiario"), "Estagiário entra somente pelo sorteio");
});

testar("100ª Caixa garante 10 fragmentos da Luz da Calma", () => {
  const dados = criarSavePadrao();
  dados.pityLendaria = PITY_MAXIMO - 1;
  const premio = abrirCaixa(dados, proximoDe(0.2));
  afirmar(premio.tipo === "fragmentos", "pity deve dar fragmentos");
  igual(premio.id, "luz_da_calma", "destaque garantido");
  igual(premio.qtd, 10, "quantidade que desbloqueia");
  afirmar(premio.garantidoPeloPity, "origem do prêmio deve ficar registrada");
  afirmar(dados.guardiasPossuidas.includes("luz_da_calma"), "Luz deve ser desbloqueada");
  igual(dados.pityLendaria, 0, "pity deve reiniciar");
});

testar("10 + 20 + 50 excedentes geram ×2/×4/×8 e recarga 1/2, 1/4 e 1/8", () => {
  const dados = criarSavePadrao();
  const boiadeira = guardiaPorId("boiadeira");
  afirmar(boiadeira, "Boiadeira precisa existir");
  igual(evolucaoDaGuardia(dados, "boiadeira"), 0, "base com 10 fragmentos totais");
  igual(danoDaGuardia(boiadeira, 1, 0), 3, "dano base");
  igual(recargaDaHabilidade(boiadeira, dados), 10, "recarga base");

  adicionarFragmentos(dados, "boiadeira", 10);
  igual(multiplicadorDanoDaEvolucao(evolucaoDaGuardia(dados, "boiadeira")), 2, "Evo 1");
  igual(recargaDaHabilidade(boiadeira, dados), 5, "recarga Evo 1");

  adicionarFragmentos(dados, "boiadeira", 20);
  igual(multiplicadorDanoDaEvolucao(evolucaoDaGuardia(dados, "boiadeira")), 4, "Evo 2");
  igual(recargaDaHabilidade(boiadeira, dados), 2.5, "recarga Evo 2");

  adicionarFragmentos(dados, "boiadeira", 50);
  igual(multiplicadorDanoDaEvolucao(evolucaoDaGuardia(dados, "boiadeira")), 8, "Evo 3");
  igual(recargaDaHabilidade(boiadeira, dados), 1.25, "recarga Evo 3 sem piso");
  igual(danoDaGuardia(boiadeira, 1, 3), 24, "dano ×8");
  afirmar(guardiaNoMaximo(dados, "boiadeira"), "90 totais é o máximo");
});

testar("Serena só entra após compra, com peso 2×, e máximas saem do pool", () => {
  const dados = criarSavePadrao();
  afirmar(!candidatosAFragmentos(dados, 1).some((c) => c.id === "grande_serena"), "Serena não comprada fica fora");

  dados.guardiasPossuidas.push("grande_serena");
  dados.fragmentosGuardia.grande_serena = 10;
  igual(candidatosAFragmentos(dados, 1).find((c) => c.id === "grande_serena")?.peso, 2, "peso Serena em 1 fragmento");
  igual(candidatosAFragmentos(dados, 10).find((c) => c.id === "grande_serena")?.peso, 2, "peso Serena em 10 fragmentos");

  dados.fragmentosGuardia.grande_serena = 90;
  afirmar(!candidatosAFragmentos(dados, 1).some((c) => c.id === "grande_serena"), "Serena máxima sai do pool");
});

console.log("\nSessão 7B: 6 cenários de Caixa, shards e evolução passaram.");
