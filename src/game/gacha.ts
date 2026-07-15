import type { SaveData } from "./tipos";

export const CUSTO_CAIXA = 25;
export const CHANCE_LENDARIA = 0.005; // 0,5%
export const PITY_MAXIMO = 80; // lendária garantida na 80ª
export const CONSOLO_DUPLICATA = 500; // capim por duplicata de lendária
export const LENDARIA_DA_CAIXA = "luz_da_calma";

// Odds exatas pro botão "Ver chances" (transparência é lei do projeto).
export const ODDS: { rotulo: string; pct: string }[] = [
  { rotulo: "Luz da Calma (Lendária)", pct: "0,5%" },
  { rotulo: "Gemas (2–6)", pct: "34,7%" },
  { rotulo: "Capim (30–120)", pct: "64,8%" },
];

export type PremioCaixa =
  | { tipo: "capim"; qtd: number }
  | { tipo: "gemas"; qtd: number }
  | { tipo: "lendaria"; id: string; duplicada: boolean; capimConsolo: number };

// Abre uma caixa. NÃO cobra as gemas (a cena faz isso antes). Muta o save:
// pity, posse e recompensas. Sorteio honesto com pity garantido na 80ª.
export function abrirCaixa(dados: SaveData): PremioCaixa {
  dados.pityLendaria++;
  const garantida = dados.pityLendaria >= PITY_MAXIMO;

  if (garantida || Math.random() < CHANCE_LENDARIA) {
    dados.pityLendaria = 0;
    const jaTem = dados.guardiasPossuidas.includes(LENDARIA_DA_CAIXA);
    if (jaTem) {
      dados.capim += CONSOLO_DUPLICATA;
      return { tipo: "lendaria", id: LENDARIA_DA_CAIXA, duplicada: true, capimConsolo: CONSOLO_DUPLICATA };
    }
    dados.guardiasPossuidas.push(LENDARIA_DA_CAIXA);
    return { tipo: "lendaria", id: LENDARIA_DA_CAIXA, duplicada: false, capimConsolo: 0 };
  }

  if (Math.random() < 0.35) {
    const qtd = 2 + Math.floor(Math.random() * 5); // 2–6
    dados.gemas += qtd;
    return { tipo: "gemas", qtd };
  }
  const qtd = 30 + Math.floor(Math.random() * 91); // 30–120
  dados.capim += qtd;
  return { tipo: "capim", qtd };
}
