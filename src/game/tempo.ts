// Relógio do jogo. Em modo normal = tempo real (Date.now). Com ?debug na URL,
// corre 360× mais rápido (6h viram 60s) + botão "+1h" — pra testar os fluxos
// de cronômetro sem esperar horas. Timestamps no save são "agora()" virtuais.

export const HORA = 3600_000;
export const MINUTO = 60_000;

const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const DEBUG = params.has("debug");
const FATOR = DEBUG ? 360 : 1;

const base = Date.now();
let offsetManual = 0;

// Tempo virtual atual. Normal: ≈ Date.now(). Debug: avança 360× + offset manual.
export function agora(): number {
  return base + (Date.now() - base) * FATOR + offsetManual;
}

export function ehDebug(): boolean {
  return DEBUG;
}

// botão "+1h" do modo debug
export function adiantarUmaHora(): void {
  offsetManual += HORA;
}

// "05:59" ou "1d 03:12" a partir de um intervalo em ms (>=0)
export function formatarIntervalo(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMin = Math.floor(ms / MINUTO);
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const min = totalMin % 60;
  const hhmm = `${String(horas).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return dias > 0 ? `${dias}d ${hhmm}` : hhmm;
}
