import type { FaseGerada, SaveData } from "./tipos";
import { tentarCurarSonequinha } from "./evento";
import { prepararFundacaoJornada } from "./jornada";
import { agora } from "./tempo";

export interface RecompensasDaVitoria {
  capimGanho: number;
  gemasChefeGanhas: number;
  gemasBonus3: number;
  reforcoInicialConcedido: boolean;
  curouSonequinha: boolean;
}

export function concederRecompensasDaVitoria(
  dados: SaveData,
  fase: FaseGerada,
  estrelas: number,
  capimColetado: number,
  janelaResgateAoEntrar = 0,
  instante = agora(),
): RecompensasDaVitoria {
  const capimGanho = fase.capimVitoria + capimColetado;
  const chave = String(fase.numero);
  const reforcoAntes = dados.jornada.reforcoInicialConcedido;

  dados.capim += capimGanho;

  let gemasChefeGanhas = 0;
  if (fase.ehChefe && fase.gemasVitoria > 0 && !dados.gemasChefeRecebidas[chave]) {
    dados.gemasChefeRecebidas[chave] = true;
    dados.gemas += fase.gemasVitoria;
    gemasChefeGanhas = fase.gemasVitoria;
  }

  let gemasBonus3 = 0;
  if (estrelas === 3 && !dados.bonusEstrela3[chave]) {
    dados.bonusEstrela3[chave] = true;
    dados.gemas += 2;
    gemasBonus3 = 2;
  }

  dados.estrelas[chave] = Math.max(dados.estrelas[chave] ?? 0, estrelas);
  dados.faseMaxima = Math.max(dados.faseMaxima, fase.numero);

  prepararFundacaoJornada(dados, instante);

  const curouSonequinha =
    fase.ehChefe && fase.numero === 10
      ? tentarCurarSonequinha(dados, janelaResgateAoEntrar, instante)
      : false;

  return {
    capimGanho,
    gemasChefeGanhas,
    gemasBonus3,
    reforcoInicialConcedido: !reforcoAntes && dados.jornada.reforcoInicialConcedido,
    curouSonequinha,
  };
}
