import { defineConfig, loadEnv, type Plugin } from "vite";

const CLIENT_KEY_PENDENTE = "PREENCHER_CLIENT_KEY_DO_PORTAL";

function integracaoTikTok(clientKey: string): Plugin {
  const configuracao = {
    client_key: clientKey,
    orientation: "VERTICAL",
    navbar: {
      bgColorLight: "#0b3d2e",
      bgColorDark: "#0b3d2e",
    },
    dev: { host: "localhost", port: 4173 },
    build: { outputDir: "dist-tiktok", htmlEntry: "index.html" },
  };

  return {
    name: "capivara-tiktok-html-runtime",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const chave = JSON.stringify(clientKey);
        const sdk = [
          '<script src="https://connect.tiktok-minis.com/game/sdk.js"></script>',
          `<script>window.__CAPI_TIKTOK_CLIENT_KEY__=${chave};if(window.__CAPI_TIKTOK_CLIENT_KEY__!==${JSON.stringify(CLIENT_KEY_PENDENTE)}&&window.TTMinis?.game?.init){window.TTMinis.game.init({clientKey:window.__CAPI_TIKTOK_CLIENT_KEY__});}</script>`,
        ].join("\n    ");
        return html.replace("<head>", `<head>\n    ${sdk}`);
      },
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "minigame.config.json",
        source: `${JSON.stringify(configuracao, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const tiktok = mode === "tiktok";
  const env = loadEnv(mode, ".", "VITE_");
  const clientKey = env.VITE_TIKTOK_CLIENT_KEY?.trim() || CLIENT_KEY_PENDENTE;

  return {
    base: tiktok ? "./" : "/Capi-/",
    plugins: tiktok ? [integracaoTikTok(clientKey)] : [],
    build: {
      outDir: tiktok ? "dist-tiktok" : "dist",
      target: "es2020",
    },
  };
});
