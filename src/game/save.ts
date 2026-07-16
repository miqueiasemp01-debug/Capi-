import type { EstadoEvento, EstadoJornada, SaveData } from "./tipos";
import { custoEvoluirGuardia } from "./economia";
import { TOTAL_DESBLOQUEIO, TOTAL_FRAGMENTOS_MAXIMO } from "./fragmentos";
import { OFERTA_SERENA_MS } from "./evento";
import { agora } from "./tempo";

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
  return {
    reforcoInicialConcedido: false,
    migracaoEstagiarioShardsConcluida: true,
  };
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
    fragmentosGuardia: { boiadeira: TOTAL_DESBLOQUEIO, sonequinha: TOTAL_DESBLOQUEIO },
    faseMaxima: 0,
    estrelas: {},
    bonusEstrela3: {},
    gemasChefeRecebidas: {},
    pityLendaria: 0,
    partidasConcluidas: 0,
    caixasGratisDisponiveis: 0,
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
  const ofertaDevidaPelaCaptura = estadoSonequinha !== "normal" && oferta === "nenhuma";
  const flagLegada = eventoAntigo.cutsceneVista === true;
  dados.evento = {
    sonequinha: estadoSonequinha,
    resgateAte: eventoAntigo.resgateAte ?? 0,
    reabreEm: eventoAntigo.reabreEm ?? 0,
    cutsceneSurtoVista:
      eventoAntigo.cutsceneSurtoVista ?? (flagLegada && estadoSonequinha !== "normal"),
    cutsceneCuraVista:
      eventoAntigo.cutsceneCuraVista ?? (flagLegada && estadoSonequinha === "curada"),
    ofertaSerenaVista: ofertaDevidaPelaCaptura
      ? false
      : eventoAntigo.ofertaSerenaVista ?? (flagLegada && oferta !== "nenhuma"),
    serena: ofertaDevidaPelaCaptura ? "ativa" : oferta,
    serenaAte: ofertaDevidaPelaCaptura ? agora() + OFERTA_SERENA_MS : eventoAntigo.serenaAte ?? 0,
    caixaLiberada: (eventoAntigo.caixaLiberada ?? false) || estadoSonequinha !== "normal",
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

  // Posse: garante as iniciais + quaisquer guardiãs já evoluídas em saves antigos.
  const possuidas = new Set(bruto.guardiasPossuidas ?? ["boiadeira", "sonequinha"]);
  possuidas.add("boiadeira");
  possuidas.add("sonequinha");
  for (const id of Object.keys(bruto.guardiaNiveis ?? {})) possuidas.add(id);

  dados.fragmentosGuardia = { ...(bruto.fragmentosGuardia ?? {}) };
  const migracaoEstagiarioJaFeita = bruto.jornada?.migracaoEstagiarioShardsConcluida === true;
  const estagiarioFoiConcedidoNa7A =
    !migracaoEstagiarioJaFeita &&
    (bruto.jornada?.reforcoInicialConcedido === true || possuidas.has("estagiario"));

  // A 7A concedia o Estagiário automaticamente. A nova regra proíbe essa
  // garantia: convertemos somente essa concessão em 1 fragmento e devolvemos
  // exatamente o capim eventualmente gasto nele. A marca torna a migração
  // idempotente e impede crédito duplicado em carregamentos futuros.
  if (estagiarioFoiConcedidoNa7A) {
    possuidas.delete("estagiario");
    dados.fragmentosGuardia.estagiario = Math.max(1, dados.fragmentosGuardia.estagiario ?? 0);
    const nivelAntigo = Math.max(1, Math.floor(bruto.guardiaNiveis?.estagiario ?? 1));
    for (let nivel = 1; nivel < nivelAntigo; nivel++) dados.capim += custoEvoluirGuardia(nivel);
    delete dados.guardiaNiveis.estagiario;
  }

  // Toda posse antiga equivale ao desbloqueio de 10 fragmentos, sem conceder
  // evolução extra. Valores futuros são limitados ao máximo atual de 90.
  for (const id of possuidas) {
    dados.fragmentosGuardia[id] = Math.max(TOTAL_DESBLOQUEIO, dados.fragmentosGuardia[id] ?? 0);
  }
  for (const [id, total] of Object.entries(dados.fragmentosGuardia)) {
    dados.fragmentosGuardia[id] = Math.max(0, Math.min(TOTAL_FRAGMENTOS_MAXIMO, Math.floor(total)));
    if (id !== "grande_serena" && dados.fragmentosGuardia[id] >= TOTAL_DESBLOQUEIO) possuidas.add(id);
  }
  dados.guardiasPossuidas = [...possuidas];
  dados.jornada = {
    reforcoInicialConcedido: bruto.jornada?.reforcoInicialConcedido === true,
    migracaoEstagiarioShardsConcluida: true,
  };
  dados.pityLendaria = Math.max(0, Math.min(99, Math.floor(bruto.pityLendaria ?? 0)));
  dados.partidasConcluidas = Math.max(0, Math.floor(bruto.partidasConcluidas ?? 0));
  dados.caixasGratisDisponiveis = Math.max(0, Math.floor(bruto.caixasGratisDisponiveis ?? 0));
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
