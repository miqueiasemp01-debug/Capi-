import type { GuardiaDef, SaveData } from "./tipos";
import { agora, HORA } from "./tempo";

export const JANELA_RESGATE_MS = 6 * HORA;
export const REABERTURA_MS = 24 * HORA;
export const OFERTA_SERENA_MS = 48 * HORA;

export const FASE_GATILHO_SURTO = 3; // 1ª vitória com faseMaxima >= 3
export const FASE_RESGATE = 10; // vencer o chefão da 10 cura

// Aplica as transições que dependem do tempo. Idempotente — chame à vontade
// (todo quadro do mapa/fase). Retorna true se algo mudou (pra salvar).
export function sincronizarEvento(dados: SaveData, instante = agora()): boolean {
  const e = dados.evento;
  let mudou = false;

  if (e.sonequinha === "surtada" && instante >= e.resgateAte) {
    // expirou a janela de 6h: sem perda permanente, reabre em 24h
    const fimDaJanela = e.resgateAte > 0 ? e.resgateAte : instante;
    e.sonequinha = "perdida";
    e.reabreEm = fimDaJanela + REABERTURA_MS;
    mudou = true;
  }
  if (e.sonequinha === "perdida" && instante >= e.reabreEm) {
    // nova chance: missão reabre com janela fresca de 6h
    e.sonequinha = "surtada";
    e.resgateAte = instante + JANELA_RESGATE_MS;
    e.reabreEm = 0;
    mudou = true;
  }
  if (e.serena === "ativa" && instante >= e.serenaAte) {
    e.serena = "expirada";
    mudou = true;
  }
  return mudou;
}

// A Sonequinha deve ter surtado? (1ª vitória com faseMaxima >= 3, ainda normal)
export function deveSurtar(dados: SaveData): boolean {
  return (
    dados.evento.sonequinha === "normal" &&
    dados.faseMaxima >= FASE_GATILHO_SURTO &&
    dados.guardiasPossuidas.includes("sonequinha")
  );
}

export function iniciarSurto(dados: SaveData, instante = agora()): boolean {
  if (!deveSurtar(dados)) return false;
  dados.evento.sonequinha = "surtada";
  dados.evento.resgateAte = instante + JANELA_RESGATE_MS;
  dados.evento.reabreEm = 0;
  dados.evento.cutsceneSurtoVista = false;
  dados.evento.caixaLiberada = true;
  if (dados.evento.serena === "nenhuma") {
    dados.evento.serena = "ativa";
    dados.evento.serenaAte = instante + OFERTA_SERENA_MS;
    dados.evento.ofertaSerenaVista = false;
  }
  return true;
}

export function sonequinhaBloqueada(dados: SaveData): boolean {
  return dados.evento.sonequinha === "surtada" || dados.evento.sonequinha === "perdida";
}

// Missão de resgate ativa (janela de 6h correndo)?
export function missaoResgateAtiva(dados: SaveData, instante = agora()): boolean {
  return dados.evento.sonequinha === "surtada" && instante < dados.evento.resgateAte;
}

// Cura atômica: a fase só vale para a mesma janela em que foi iniciada.
export function tentarCurarSonequinha(
  dados: SaveData,
  janelaAoEntrar: number,
  instante = agora(),
): boolean {
  sincronizarEvento(dados, instante);
  if (
    janelaAoEntrar <= 0 ||
    dados.evento.resgateAte !== janelaAoEntrar ||
    !missaoResgateAtiva(dados, instante)
  ) {
    return false;
  }

  dados.evento.sonequinha = "curada";
  dados.evento.resgateAte = 0;
  dados.evento.reabreEm = 0;
  dados.evento.cutsceneCuraVista = false;
  dados.evento.caixaLiberada = true;
  return true;
}

export function cutsceneSurtoPendente(dados: SaveData): boolean {
  return dados.evento.sonequinha !== "normal" && !dados.evento.cutsceneSurtoVista;
}

export function cutsceneCuraPendente(dados: SaveData): boolean {
  return dados.evento.sonequinha === "curada" && !dados.evento.cutsceneCuraVista;
}

export function marcarCutsceneVista(dados: SaveData, tipo: "surto" | "cura"): void {
  if (tipo === "surto") dados.evento.cutsceneSurtoVista = true;
  else dados.evento.cutsceneCuraVista = true;
}

export function marcarOfertaSerenaVista(dados: SaveData): void {
  dados.evento.ofertaSerenaVista = true;
}

export function ofertaSerenaAtiva(dados: SaveData, instante = agora()): boolean {
  return (
    dados.evento.serena === "ativa" &&
    instante < dados.evento.serenaAte &&
    !dados.guardiasPossuidas.includes("grande_serena")
  );
}

export function msRestantesResgate(dados: SaveData, instante = agora()): number {
  return dados.evento.resgateAte - instante;
}
export function msRestantesReabertura(dados: SaveData, instante = agora()): number {
  return dados.evento.reabreEm - instante;
}
export function msRestantesOferta(dados: SaveData, instante = agora()): number {
  return dados.evento.serenaAte - instante;
}

// Guardiãs que entram em campo / contam no Poder: possuídas e não bloqueadas.
export function guardiasAtivas(todas: GuardiaDef[], dados: SaveData): GuardiaDef[] {
  return todas.filter((g) => {
    if (!dados.guardiasPossuidas.includes(g.id)) return false;
    if (g.id === "sonequinha" && sonequinhaBloqueada(dados)) return false;
    return true;
  });
}
