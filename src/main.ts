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

instalarColetorDeErros();

const container = document.getElementById("app");
if (!container) throw new Error("#app não encontrado");

const motor = new Motor(container);

const jogo: Jogo = {
  dados: save.carregar(),
  salvar() {
    save.salvar(jogo.dados);
  },
  irPara(destino: Destino) {
    if (destino.tela === "titulo") motor.trocarCena(new CenaTitulo(jogo));
    else if (destino.tela === "mapa") motor.trocarCena(new CenaMapa(jogo));
    else if (destino.tela === "equipe") motor.trocarCena(new CenaEquipe(jogo));
    else if (destino.tela === "caixa") motor.trocarCena(new CenaCaixa(jogo));
    else if (destino.tela === "cutscene") motor.trocarCena(new CenaCutscene(jogo, destino.tipo));
    else motor.trocarCena(new CenaFase(jogo, destino.numero));
  },
};

// aplica a preferência de mute salva
definirMute(jogo.dados.mute);

motor.trocarCena(new CenaSplash(jogo));
motor.iniciar();
