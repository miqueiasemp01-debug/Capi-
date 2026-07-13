// Rede de segurança global: nenhum erro pode congelar o jogo em silêncio.
// Mostra uma tela amigável "Ops! Recarregar" por cima de tudo (é um DOM
// overlay, independente do canvas — funciona mesmo se o loop de render morreu).

let overlayAtivo = false;

function montarOverlay(detalhe: string): void {
  if (overlayAtivo) return;
  overlayAtivo = true;

  const fundo = document.createElement("div");
  fundo.setAttribute("role", "alertdialog");
  fundo.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:9999",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:18px",
    "padding:24px",
    "box-sizing:border-box",
    "background:rgba(8,40,30,0.92)",
    "color:#fff",
    "font-family:system-ui,sans-serif",
    "text-align:center",
  ].join(";");

  const emoji = document.createElement("div");
  emoji.textContent = "🦫";
  emoji.style.cssText = "font-size:64px;line-height:1";

  const titulo = document.createElement("div");
  titulo.textContent = "Ops! A Capi tropeçou.";
  titulo.style.cssText = "font-size:22px;font-weight:800";

  const sub = document.createElement("div");
  sub.textContent = "Seu progresso está salvo. É só recarregar pra continuar.";
  sub.style.cssText = "font-size:15px;opacity:0.85;max-width:300px;line-height:1.4";

  const botao = document.createElement("button");
  botao.textContent = "Recarregar";
  botao.style.cssText = [
    "margin-top:6px",
    "padding:14px 40px",
    "font-size:18px",
    "font-weight:800",
    "font-family:inherit",
    "color:#fff",
    "background:#3d9c63",
    "border:none",
    "border-radius:14px",
    "box-shadow:0 4px 0 #2a6e46",
    "cursor:pointer",
  ].join(";");
  botao.addEventListener("click", () => location.reload());

  const tecnico = document.createElement("div");
  tecnico.textContent = detalhe;
  tecnico.style.cssText =
    "margin-top:14px;font-size:11px;opacity:0.4;max-width:320px;word-break:break-word;font-family:monospace";

  fundo.append(emoji, titulo, sub, botao, tecnico);
  document.body.appendChild(fundo);
}

// Chamado tanto pelo loop (try/catch) quanto pelos listeners globais.
export function relatarErroFatal(erro: unknown): void {
  const detalhe = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  // registra no console pra depuração, mas NUNCA deixa a tela muda
  console.error("[Capi] erro fatal:", erro);
  try {
    montarOverlay(detalhe);
  } catch {
    // se até o overlay falhar, ao menos não propaga
  }
}

export function instalarColetorDeErros(): void {
  window.addEventListener("error", (ev) => {
    relatarErroFatal(ev.error ?? ev.message);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    relatarErroFatal(ev.reason);
  });
}
