import type { EstadoEvento, EstadoJornada, SaveData } from "./tipos";

const CHAVE = "capivara-impossivel:save:v1";

function eventoPadrao(): EstadoEvento {
  return {
    sonequinha: "normal",
    resgateAte: 0,
    reabreEm: 0,
    cutsceneSurtoVista: false,
    cutsceneCuraVista: false,
    ofertaSerenaVista: false,
    serena: "nenhuma",
    serenaAte: 0,
    caixaLiberada: false,
  };
}

function jornadaPadrao(): EstadoJornada {
  return { reforcoInicialConcedido: false };
}

export function criarSavePadrao(): SaveData {
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
    gemasChefeRecebidas: {},
    pityLendaria: 0,
    evento: eventoPadrao(),
    jornada: jornadaPadrao(),
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

interface EventoLegado extends Partial<EstadoEvento> {
  cutsceneVista?: boolean;
}

type SaveBruto = Partial<Omit<SaveData, "evento" | "jornada">> & {
  evento?: EventoLegado;
  jornada?: Partial<EstadoJornada>;
};

// Migração robusta e idempotente: mantém toda a economia existente e apenas
// cria os livros-razão que impedem recompensas premium repetidas.
export function migrarSave(bruto: SaveBruto): SaveData {
  const padrao = criarSavePadrao();
  const dados: SaveData = {
    ...padrao,
    ...bruto,
    evento: padrao.evento,
    jornada: padrao.jornada,
  };
  const eventoAntigo = bruto.evento ?? {};
  const estadoSonequinha = eventoAntigo.sonequinha ?? padrao.evento.sonequinha;
  const oferta = eventoAntigo.serena ?? padrao.evento.serena;
  const flagLegada = eventoAntigo.cutsceneVista === true;
  dados.evento = {
    sonequinha: estadoSonequinha,
    resgateAte: eventoAntigo.resgateAte ?? 0,
    reabreEm: eventoAntigo.reabreEm ?? 0,
    cutsceneSurtoVista:
      eventoAntigo.cutsceneSurtoVista ?? (flagLegada && estadoSonequinha !== "normal"),
    cutsceneCuraVista:
      eventoAntigo.cutsceneCuraVista ?? (flagLegada && estadoSonequinha === "curada"),
    ofertaSerenaVista:
      eventoAntigo.ofertaSerenaVista ?? (flagLegada && oferta !== "nenhuma"),
    serena: oferta,
    serenaAte: eventoAntigo.serenaAte ?? 0,
    caixaLiberada: eventoAntigo.caixaLiberada ?? false,
  };
  dados.bonusEstrela3 = bruto.bonusEstrela3 ?? {};
  dados.gemasChefeRecebidas = { ...(bruto.gemasChefeRecebidas ?? {}) };

  // faseMaxima comprova que todos os chefes anteriores já foram vencidos e
  // pagos pela versão 2.2. Marcá-los não altera o saldo, só impede pagar de novo.
  for (let fase = 10; fase <= dados.faseMaxima; fase += 10) {
    dados.gemasChefeRecebidas[String(fase)] = true;
  }
  for (const [fase, estrelas] of Object.entries(dados.estrelas ?? {})) {
    const numero = Number(fase);
    if (estrelas > 0 && numero > 0 && numero % 10 === 0) {
      dados.gemasChefeRecebidas[fase] = true;
    }
  }

  // posse: garante as iniciais + quaisquer guardiãs já evoluídas em saves antigos
  const possuidas = new Set(bruto.guardiasPossuidas ?? ["boiadeira", "sonequinha"]);
  possuidas.add("boiadeira");
  possuidas.add("sonequinha");
  for (const id of Object.keys(bruto.guardiaNiveis ?? {})) possuidas.add(id);

  const reforcoJaDevido =
    bruto.jornada?.reforcoInicialConcedido === true || dados.faseMaxima >= 3 || possuidas.has("estagiario");
  if (reforcoJaDevido) possuidas.add("estagiario");
  dados.guardiasPossuidas = [...possuidas];
  dados.jornada = { reforcoInicialConcedido: reforcoJaDevido };
  dados.pityLendaria = bruto.pityLendaria ?? 0;
  return dados;
}

class SaveLocal implements Save {
  carregar(): SaveData {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return criarSavePadrao();
      return migrarSave(JSON.parse(bruto) as SaveBruto);
    } catch {
      return criarSavePadrao();
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
