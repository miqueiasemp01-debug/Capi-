import type { EstadoEvento, SaveData } from "./tipos";

const CHAVE = "capivara-impossivel:save:v1";

function eventoPadrao(): EstadoEvento {
  return {
    sonequinha: "normal",
    resgateAte: 0,
    reabreEm: 0,
    cutsceneVista: false,
    serena: "nenhuma",
    serenaAte: 0,
    caixaLiberada: false,
  };
}

function savePadrao(): SaveData {
  return {
    capim: 0,
    gemas: 0,
    toqueNivel: 1,
    capiAtaqueNivel: 1,
    capiCalmaNivel: 1,
    guardiaNiveis: {},
    guardiasPossuidas: ["boiadeira", "sonequinha"],
    faseMaxima: 0,
    estrelas: {},
    bonusEstrela3: {},
    pityLendaria: 0,
    evento: eventoPadrao(),
    tutoriais: {},
    mute: false,
  };
}

// O save fica atrás desta interface de propósito: hoje é localStorage,
// depois vira espelho na nuvem (Supabase) sem mexer em quem consome.
export interface Save {
  carregar(): SaveData;
  salvar(dados: SaveData): void;
}

// Migração robusta: mescla defaults com o save antigo, campo a campo, sem
// quebrar. Saves da Sessão 1–5 ganham posse padrão + estado de evento zerado.
function migrar(bruto: Partial<SaveData>): SaveData {
  const padrao = savePadrao();
  const dados: SaveData = { ...padrao, ...bruto };
  dados.evento = { ...padrao.evento, ...(bruto.evento ?? {}) };
  dados.bonusEstrela3 = bruto.bonusEstrela3 ?? {};
  // posse: garante as iniciais + quaisquer guardiãs já evoluídas em saves antigos
  const possuidas = new Set(bruto.guardiasPossuidas ?? ["boiadeira", "sonequinha"]);
  possuidas.add("boiadeira");
  possuidas.add("sonequinha");
  for (const id of Object.keys(bruto.guardiaNiveis ?? {})) possuidas.add(id);
  dados.guardiasPossuidas = [...possuidas];
  dados.pityLendaria = bruto.pityLendaria ?? 0;
  return dados;
}

class SaveLocal implements Save {
  carregar(): SaveData {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return savePadrao();
      return migrar(JSON.parse(bruto) as Partial<SaveData>);
    } catch {
      return savePadrao();
    }
  }

  salvar(dados: SaveData): void {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch {
      // sem storage disponível (modo privado antigo): o jogo segue sem persistir
    }
  }
}

export const save: Save = new SaveLocal();
