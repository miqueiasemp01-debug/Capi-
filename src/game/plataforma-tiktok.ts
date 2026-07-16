type ResultadoAnuncio = "concluido" | "cancelado" | "indisponivel" | "erro";

interface FechamentoAnuncio {
  isEnded?: boolean;
}

interface ErroTikTok {
  error?: {
    error_code?: number;
    error_msg?: string;
  };
}

interface AnuncioRecompensadoTikTok {
  show(): Promise<void>;
  onClose(callback: (resultado: FechamentoAnuncio) => void): void;
  offClose?(callback: (resultado: FechamentoAnuncio) => void): void;
  onError(callback: (erro: ErroTikTok) => void): void;
  offError?(callback: (erro: ErroTikTok) => void): void;
}

interface JogoTikTok {
  createRewardedVideoAd(opcoes: { adUnitId: string }): AnuncioRecompensadoTikTok;
  setLoadingProgress?(opcoes: { progress: number }): void;
  login?(opcoes: {
    success(resultado: { code: string }): void;
    fail(erro: ErroTikTok): void;
    complete?(): void;
  }): void;
}

declare global {
  interface Window {
    TTMinis?: { game?: JogoTikTok };
  }
}

function jogoTikTok(): JogoTikTok | null {
  return window.TTMinis?.game ?? null;
}

export function informarCarregamentoTikTok(progresso: number): void {
  try {
    jogoTikTok()?.setLoadingProgress?.({ progress: Math.max(0, Math.min(1, progresso)) });
  } catch {
    // GitHub Pages e navegadores comuns não possuem o container do TikTok.
  }
}

export function anuncioRecompensadoConfigurado(): boolean {
  return Boolean(
    jogoTikTok()?.createRewardedVideoAd &&
    import.meta.env.VITE_TIKTOK_REWARDED_AD_UNIT_ID?.trim(),
  );
}

export async function exibirAnuncioRecompensadoCom(
  jogo: JogoTikTok | null,
  adUnitId: string | undefined,
): Promise<ResultadoAnuncio> {
  if (!jogo?.createRewardedVideoAd || !adUnitId) return "indisponivel";

  try {
    const anuncio = jogo.createRewardedVideoAd({ adUnitId });
    return await new Promise<ResultadoAnuncio>((resolver) => {
      let resolveu = false;
      const finalizar = (resultado: ResultadoAnuncio): void => {
        if (resolveu) return;
        resolveu = true;
        anuncio.offClose?.(aoFechar);
        anuncio.offError?.(aoErro);
        resolver(resultado);
      };
      const aoFechar = (resultado: FechamentoAnuncio): void => {
        finalizar(resultado.isEnded === true ? "concluido" : "cancelado");
      };
      const aoErro = (_erro: ErroTikTok): void => finalizar("erro");

      anuncio.onClose(aoFechar);
      anuncio.onError(aoErro);
      void anuncio.show().catch(() => finalizar("erro"));
    });
  } catch {
    return "erro";
  }
}

export function exibirAnuncioRecompensado(): Promise<ResultadoAnuncio> {
  return exibirAnuncioRecompensadoCom(
    jogoTikTok(),
    import.meta.env.VITE_TIKTOK_REWARDED_AD_UNIT_ID?.trim(),
  );
}

let loginEmAndamento: Promise<boolean> | null = null;

// O code é entregue somente ao backend configurado; tokens e client_secret
// nunca passam pelo bundle. O endpoint deve trocar o code e criar uma sessão
// HttpOnly, além de validar origem/estado no servidor.
export function iniciarLoginSilenciosoTikTok(): Promise<boolean> {
  if (loginEmAndamento) return loginEmAndamento;
  const jogo = jogoTikTok();
  const endpoint = import.meta.env.VITE_TIKTOK_SESSION_ENDPOINT?.trim();
  if (!jogo?.login || !endpoint) return Promise.resolve(false);

  loginEmAndamento = new Promise<boolean>((resolver) => {
    jogo.login!({
      success: ({ code }) => {
        void fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }).then((resposta) => resolver(resposta.ok)).catch(() => resolver(false));
      },
      fail: () => resolver(false),
    });
  }).finally(() => {
    loginEmAndamento = null;
  });

  return loginEmAndamento;
}

export type { ResultadoAnuncio };
