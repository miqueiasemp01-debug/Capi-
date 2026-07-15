import type { GuardiaDef, SaveData } from "./tipos";
import { agora, HORA } from "./tempo";

export const JANELA_RESGATE_MS = 6 * HORA;
export const REABERTURA_MS = 24 * HORA;
export const OFERTA_SERENA_MS = 48 * HORA;

export const FASE_GATILHO_SURTO = 3; // 1ª vitória com faseMaxima >= 3
export const FASE_RESGATE = 10; // vencer o chefão da 10 cura

// Aplica as transições que dependem do tempo. Idempotente — chame à vontade
// (todo quadro do mapa/fase). Retorna true se algo mudou (pra salvar).
export function sincronizarEvento(dados: SaveData): boolean {
  const e = dados.evento;
  const t = agora();
  let mudou = false;

  if (e.sonequinha === "surtada" && t >= e.resgateAte) {
    // expirou a janela de 6h: sem perda permanente, reabre em 24h
    e.sonequinha = "perdida";
    e.reabreEm = t + REABERTURA_MS;
    mudou = true;
  }
  if (e.sonequinha === "perdida" && t >= e.reabreEm) {
    // nova chance: missão reabre com janela fresca de 6h
    e.sonequinha = "surtada";
    e.resgateAte = t + JANELA_RESGATE_MS;
    mudou = true;
  }
  if (e.serena === "ativa" && t >= e.serenaAte) {
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

export function iniciarSurto(dados: SaveData): void {
  dados.evento.sonequinha = "surtada";
  dados.evento.resgateAte = agora() + JANELA_RESGATE_MS;
  dados.evento.cutsceneVista = true;
}

export function sonequinhaBloqueada(dados: SaveData): boolean {
  return dados.evento.sonequinha === "surtada" || dados.evento.sonequinha === "perdida";
}

// Missão de resgate ativa (janela de 6h correndo)?
export function missaoResgateAtiva(dados: SaveData): boolean {
  return dados.evento.sonequinha === "surtada";
}

// Curar a Sonequinha (venceu o chefão da 10 na janela). Dispara oferta 48h.
export function curarSonequinha(dados: SaveData): void {
  dados.evento.sonequinha = "curada";
  dados.evento.caixaLiberada = true;
  if (dados.evento.serena === "nenhuma") {
    dados.evento.serena = "ativa";
    dados.evento.serenaAte = agora() + OFERTA_SERENA_MS;
  }
}

export function ofertaSerenaAtiva(dados: SaveData): boolean {
  return dados.evento.serena === "ativa" && !dados.guardiasPossuidas.includes("grande_serena");
}

export function msRestantesResgate(dados: SaveData): number {
  return dados.evento.resgateAte - agora();
}
export function msRestantesReabertura(dados: SaveData): number {
  return dados.evento.reabreEm - agora();
}
export function msRestantesOferta(dados: SaveData): number {
  return dados.evento.serenaAte - agora();
}

// Guardiãs que entram em campo / contam no Poder: possuídas e não bloqueadas.
export function guardiasAtivas(todas: GuardiaDef[], dados: SaveData): GuardiaDef[] {
  return todas.filter((g) => {
    if (!dados.guardiasPossuidas.includes(g.id)) return false;
    if (g.id === "sonequinha" && sonequinhaBloqueada(dados)) return false;
    return true;
  });
}
