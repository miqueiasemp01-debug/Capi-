// Áudio sintetizado via WebAudio — zero arquivos, zero peso no build.
// O contexto nasce no primeiro toque (regra do iOS) e falha em silêncio.

let ctxAudio: AudioContext | null = null;

function contexto(): AudioContext | null {
  try {
    if (!ctxAudio) {
      const Construtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Construtor) return null;
      ctxAudio = new Construtor();
    }
    if (ctxAudio.state === "suspended") void ctxAudio.resume();
    return ctxAudio;
  } catch {
    return null;
  }
}

function nota(
  ctx: AudioContext,
  frequencia: number,
  inicio: number,
  duracao: number,
  volume: number,
  tipo: OscillatorType,
): void {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(ganho);
  ganho.connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.05);
}

// Arpejo de conquista (dó maior subindo) — o som de "evoluí!".
export function tocarSomConquista(): void {
  const ctx = contexto();
  if (!ctx) return;
  const agora = ctx.currentTime;
  const notas = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notas.forEach((frequencia, i) => {
    nota(ctx, frequencia, agora + i * 0.09, 0.5, 0.22, "triangle");
  });
  // brilho no topo
  nota(ctx, 2093, agora + 0.36, 0.35, 0.08, "sine");
}
