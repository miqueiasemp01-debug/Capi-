import { criarSavePadrao } from "../src/game/save";
import {
  aplicarDuplicacaoDaPartida,
  pacoteDuplicavelDaVitoria,
  type ControleDuplicacao,
} from "../src/game/recompensa-anuncio";
import { exibirAnuncioRecompensadoCom } from "../src/game/plataforma-tiktok";

function afirmar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

const dados = criarSavePadrao();
dados.capim = 100;
dados.gemas = 7;
dados.caixasGratisDisponiveis = 2;
dados.pityLendaria = 33;
const controle: ControleDuplicacao = { aplicada: false };
const pacote = pacoteDuplicavelDaVitoria({
  capimGanho: 551,
  gemasChefeGanhas: 11,
  gemasBonus3: 2,
  ganhouCaixaGratis: true,
  curouSonequinha: true,
});

afirmar(aplicarDuplicacaoDaPartida(dados, pacote, controle), "o primeiro callback concluído deve duplicar");
afirmar(dados.capim === 651, "deve copiar todo o capim da missão");
afirmar(dados.gemas === 20, "deve copiar gemas do chefe e de 3 estrelas");
afirmar(dados.caixasGratisDisponiveis === 2, "não deve duplicar Caixa grátis");
afirmar(dados.pityLendaria === 33, "não deve alterar pity");
afirmar(!aplicarDuplicacaoDaPartida(dados, pacote, controle), "callback repetido deve ser idempotente");
afirmar(dados.capim === 651 && dados.gemas === 20, "callback repetido não pode pagar de novo");

const replay = criarSavePadrao();
const controleReplay: ControleDuplicacao = { aplicada: false };
aplicarDuplicacaoDaPartida(replay, { capim: 90, gemas: 0 }, controleReplay);
afirmar(replay.capim === 90, "replay deve duplicar somente o capim realmente recebido");
afirmar(replay.gemas === 0, "anúncio em replay não pode inventar gemas");

type Fechamento = (resultado: { isEnded?: boolean }) => void;
type Falha = (erro: object) => void;

function sdkFalso(resultado: "concluido" | "cancelado" | "erro") {
  let aoFechar: Fechamento = () => undefined;
  let aoErro: Falha = () => undefined;
  let callbacksRemovidos = 0;
  return {
    jogo: {
      createRewardedVideoAd: () => ({
        onClose: (callback: Fechamento) => { aoFechar = callback; },
        offClose: () => { callbacksRemovidos += 1; },
        onError: (callback: Falha) => { aoErro = callback; },
        offError: () => { callbacksRemovidos += 1; },
        show: async () => {
          if (resultado === "erro") aoErro({});
          else aoFechar({ isEnded: resultado === "concluido" });
          // O container pode repetir o callback; a ponte precisa resolver uma vez só.
          aoFechar({ isEnded: true });
        },
      }),
    },
    callbacksRemovidos: () => callbacksRemovidos,
  };
}

for (const [esperado, simulado] of [
  ["concluido", "concluido"],
  ["cancelado", "cancelado"],
  ["erro", "erro"],
] as const) {
  const sdk = sdkFalso(simulado);
  afirmar(
    await exibirAnuncioRecompensadoCom(sdk.jogo, "rewarded-teste") === esperado,
    `SDK ${simulado} deve retornar ${esperado}`,
  );
  afirmar(sdk.callbacksRemovidos() === 2, "ponte deve remover listeners ao concluir");
}

afirmar(
  await exibirAnuncioRecompensadoCom(null, "rewarded-teste") === "indisponivel",
  "fora do container TikTok o anúncio deve ficar indisponível",
);

console.log("✓ TikTok: 2× TUDO duplica capim e gemas, sem Caixa/pity e sem pagamento repetido.");
