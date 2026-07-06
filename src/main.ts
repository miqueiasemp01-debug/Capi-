import { Motor } from "./game/motor";
import { save } from "./game/save";
import type { Destino, Jogo } from "./game/contexto";
import { CenaTitulo } from "./scenes/titulo";
import { CenaEquipe } from "./scenes/equipe";
import { CenaFase } from "./scenes/fase";

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
    else if (destino.tela === "equipe") motor.trocarCena(new CenaEquipe(jogo));
    else motor.trocarCena(new CenaFase(jogo, destino.faseId));
  },
};

jogo.irPara({ tela: "titulo" });
motor.iniciar();
