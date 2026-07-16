import { Motor } from "./game/motor";
import { save } from "./game/save";
import type { Destino, Jogo } from "./game/contexto";
import { instalarColetorDeErros } from "./game/erros";
import { definirMute } from "./game/sfx";
import { CenaSplash } from "./scenes/splash";
import { CenaTitulo } from "./scenes/titulo";
import { CenaEquipe } from "./scenes/equipe";
import { CenaMapa } from "./scenes/mapa";
import { CenaFase } from "./scenes/fase";
import { CenaCutscene } from "./scenes/cutscene";
import { CenaCaixa } from "./scenes/caixa";
import { CenaPreFase } from "./scenes/pre-fase";
import { prepararFundacaoJornada, verificarNavegacao } from "./game/jornada";
import { criarDadosVitrine, FASE_VITRINE } from "./game/vitrine";

instalarColetorDeErros();

const container = document.getElementById("app");
if (!container) throw new Error("#app não encontrado");

const motor = new Motor(container);
const modoVitrine = new URLSearchParams(window.location.search).has("vitrine");
const dadosCarregados = modoVitrine ? criarDadosVitrine() : save.carregar();
if (prepararFundacaoJornada(dadosCarregados) && !modoVitrine) save.salvar(dadosCarregados);

const jogo: Jogo = {
  dados: dadosCarregados,
  modoVitrine,
  salvar() {
    if (!modoVitrine) save.salvar(jogo.dados);
  },
  irPara(destino: Destino) {
    const verificacao = verificarNavegacao(jogo.dados);
    if (verificacao.mudou) jogo.salvar();

    if (destino.tela !== "cutscene" && verificacao.cutscene) {
      motor.trocarCena(new CenaCutscene(jogo, verificacao.cutscene));
      return;
    }

    if (destino.tela === "titulo") motor.trocarCena(new CenaTitulo(jogo));
    else if (destino.tela === "mapa") motor.trocarCena(new CenaMapa(jogo));
    else if (destino.tela === "equipe") motor.trocarCena(new CenaEquipe(jogo));
    else if (destino.tela === "caixa") motor.trocarCena(new CenaCaixa(jogo));
    else if (destino.tela === "cutscene") motor.trocarCena(new CenaCutscene(jogo, destino.tipo));
    else {
      const numero = Math.max(1, Math.min(Math.floor(destino.numero), jogo.dados.faseMaxima + 1));
      if (destino.tela === "pre_fase") motor.trocarCena(new CenaPreFase(jogo, numero));
      else motor.trocarCena(new CenaFase(jogo, numero));
    }
  },
};

// aplica a preferência de mute salva
definirMute(jogo.dados.mute);

motor.trocarCena(new CenaSplash(
  jogo,
  modoVitrine ? { tela: "pre_fase", numero: FASE_VITRINE } : { tela: "titulo" },
));
motor.iniciar();
