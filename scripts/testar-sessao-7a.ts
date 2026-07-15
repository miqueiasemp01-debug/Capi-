import { GUARDIAS } from "../src/game/conteudo";
import {
  marcarCutsceneVista,
  REABERTURA_MS,
  sincronizarEvento,
  tentarCurarSonequinha,
} from "../src/game/evento";
import { guardiasAtivas } from "../src/game/evento";
import { verificarNavegacao } from "../src/game/jornada";
import { gerarFase } from "../src/game/procedural";
import { concederRecompensasDaVitoria } from "../src/game/recompensas";
import { criarSavePadrao, migrarSave } from "../src/game/save";

function afirmar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

function igual<T>(recebido: T, esperado: T, mensagem: string): void {
  if (recebido !== esperado) {
    throw new Error(`${mensagem}: esperado ${String(esperado)}, recebido ${String(recebido)}`);
  }
}

function testar(nome: string, teste: () => void): void {
  teste();
  console.log(`✓ ${nome}`);
}

testar("save novo mantém as duas guardiãs iniciais antes da fase 3", () => {
  const dados = criarSavePadrao();
  igual(dados.guardiasPossuidas.join(","), "boiadeira,sonequinha", "equipe inicial");
  afirmar(!dados.jornada.reforcoInicialConcedido, "reforço não pode nascer concedido");
  igual(Object.keys(dados.gemasChefeRecebidas).length, 0, "livro-razão deve iniciar vazio");
});

testar("Próxima fase após a 3 passa pelo reforço e pela cutscene do Surto", () => {
  const dados = criarSavePadrao();
  const instante = 1_000_000;
  const recompensa = concederRecompensasDaVitoria(dados, gerarFase(3), 2, 0, 0, instante);

  afirmar(recompensa.reforcoInicialConcedido, "fase 3 deve conceder reforço");
  afirmar(dados.guardiasPossuidas.includes("estagiario"), "Estagiário deve entrar na equipe");
  igual(dados.evento.sonequinha, "surtada", "Surto deve iniciar na vitória da fase 3");

  // É exatamente esta verificação compartilhada que main.ts executa quando o
  // botão “Próxima fase” pede a pré-fase 4.
  const navegacao = verificarNavegacao(dados, instante + 1);
  igual(navegacao.cutscene, "surto", "Próxima fase deve ser interceptada");

  marcarCutsceneVista(dados, "surto");
  igual(verificarNavegacao(dados, instante + 2).cutscene, null, "rota deve liberar após a cutscene");
  const ativas = guardiasAtivas(GUARDIAS, dados).map((g) => g.id).sort();
  igual(ativas.join(","), "boiadeira,estagiario", "equipe após retirada da Sonequinha");
});

testar("save antigo preserva saldo, elenco, progresso e recompensas já pagas", () => {
  const dados = migrarSave({
    capim: 987,
    gemas: 123,
    faseMaxima: 20,
    estrelas: { "10": 2, "20": 1 },
    guardiasPossuidas: ["boiadeira", "sonequinha", "luz_da_calma"],
    guardiaNiveis: { boiadeira: 4, luz_da_calma: 2 },
    pityLendaria: 37,
    evento: {
      sonequinha: "curada",
      resgateAte: 0,
      reabreEm: 0,
      cutsceneVista: true,
      serena: "ativa",
      serenaAte: 9_999_999,
      caixaLiberada: true,
    },
  });

  igual(dados.capim, 987, "capim antigo");
  igual(dados.gemas, 123, "gemas antigas");
  igual(dados.pityLendaria, 37, "pity antigo");
  igual(dados.guardiaNiveis.boiadeira, 4, "nível antigo");
  afirmar(dados.guardiasPossuidas.includes("luz_da_calma"), "guardiã antiga deve permanecer");
  afirmar(dados.guardiasPossuidas.includes("estagiario"), "save fase 3+ recebe o reforço devido");
  afirmar(dados.gemasChefeRecebidas["10"] && dados.gemasChefeRecebidas["20"], "chefes antigos devem estar pagos");
  afirmar(dados.evento.cutsceneSurtoVista, "flag legada do Surto");
  afirmar(dados.evento.cutsceneCuraVista, "flag legada da cura");
  afirmar(dados.evento.ofertaSerenaVista, "flag legada da oferta");

  const gemasAntes = dados.gemas;
  const replay = concederRecompensasDaVitoria(dados, gerarFase(10), 1, 0, 0, 2_000_000);
  igual(replay.gemasChefeGanhas, 0, "chefe antigo não pode pagar novamente");
  igual(dados.gemas, gemasAntes, "saldo antigo não pode ser recalculado");
});

testar("prazo expira dentro da fase 10 e bloqueia a cura", () => {
  const dados = criarSavePadrao();
  dados.faseMaxima = 3;
  const inicio = 5_000_000;
  verificarNavegacao(dados, inicio);
  marcarCutsceneVista(dados, "surto");
  const janelaDaEntrada = dados.evento.resgateAte;

  afirmar(sincronizarEvento(dados, janelaDaEntrada), "expiração deve mudar o evento");
  igual(dados.evento.sonequinha, "perdida", "estado após o prazo");
  igual(dados.evento.reabreEm, janelaDaEntrada + REABERTURA_MS, "reabertura deve contar do prazo real");
  afirmar(!tentarCurarSonequinha(dados, janelaDaEntrada, janelaDaEntrada + 1), "cura atrasada deve falhar");

  const reabertura = dados.evento.reabreEm;
  afirmar(sincronizarEvento(dados, reabertura), "missão deve reabrir após 24h");
  igual(dados.evento.sonequinha, "surtada", "estado da nova chance");
  afirmar(dados.evento.resgateAte > reabertura, "nova janela precisa ter prazo fresco");
  afirmar(!tentarCurarSonequinha(dados, janelaDaEntrada, reabertura + 1), "fase da janela antiga não vale na nova");
});

testar("cura válida separa as flags de cura e oferta da Serena", () => {
  const dados = criarSavePadrao();
  dados.faseMaxima = 3;
  const inicio = 10_000_000;
  verificarNavegacao(dados, inicio);
  marcarCutsceneVista(dados, "surto");
  const janelaDaEntrada = dados.evento.resgateAte;
  dados.faseMaxima = 9;

  const recompensa = concederRecompensasDaVitoria(
    dados,
    gerarFase(10),
    1,
    0,
    janelaDaEntrada,
    janelaDaEntrada - 1,
  );
  afirmar(recompensa.curouSonequinha, "vitória dentro da mesma janela deve curar");
  igual(dados.evento.sonequinha, "curada", "estado curado");
  afirmar(dados.evento.caixaLiberada, "cura deve manter liberação da Caixa");
  afirmar(!dados.evento.cutsceneCuraVista, "cutscene de cura deve ficar pendente");
  afirmar(!dados.evento.ofertaSerenaVista, "oferta deve ter flag independente");
  igual(verificarNavegacao(dados, janelaDaEntrada - 1).cutscene, "cura", "navegação deve priorizar cura");
});

testar("replay de chefe concede capim, mas nunca gemas extras", () => {
  const dados = criarSavePadrao();
  const fase10 = gerarFase(10);
  const primeira = concederRecompensasDaVitoria(dados, fase10, 1, 4, 0, 30_000_000);
  igual(primeira.gemasChefeGanhas, fase10.gemasVitoria, "primeiro pagamento do chefe");
  const gemasDepoisDaPrimeira = dados.gemas;
  const capimDepoisDaPrimeira = dados.capim;

  const replay = concederRecompensasDaVitoria(dados, fase10, 1, 4, 0, 30_000_001);
  igual(replay.gemasChefeGanhas, 0, "replay não paga gemas");
  igual(dados.gemas, gemasDepoisDaPrimeira, "gemas devem permanecer iguais");
  afirmar(dados.capim > capimDepoisDaPrimeira, "replay deve continuar pagando capim");
});

console.log("\nSessão 7A: 6 cenários e todas as travas funcionais passaram.");
