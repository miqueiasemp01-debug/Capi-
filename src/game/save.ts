import type { SaveData } from "./tipos";

const CHAVE = "capivara-impossivel:save:v1";

function savePadrao(): SaveData {
  return {
    capim: 0,
    gemas: 0,
    toqueNivel: 1,
    capiAtaqueNivel: 1,
    capiCalmaNivel: 1,
    guardiaNiveis: {},
    faseMaxima: 0,
    estrelas: {},
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

class SaveLocal implements Save {
  carregar(): SaveData {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return savePadrao();
      return { ...savePadrao(), ...(JSON.parse(bruto) as Partial<SaveData>) };
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
