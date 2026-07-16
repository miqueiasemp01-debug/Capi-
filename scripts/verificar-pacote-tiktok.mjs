import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const pasta = "dist-tiktok";
const html = await readFile(join(pasta, "index.html"), "utf8");
const htmlWeb = await readFile(join("dist", "index.html"), "utf8");
const config = JSON.parse(await readFile(join(pasta, "minigame.config.json"), "utf8"));

function afirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

afirmar(config.orientation === "VERTICAL", "orientação TikTok deve ser VERTICAL");
afirmar(html.indexOf("connect.tiktok-minis.com/game/sdk.js") < html.indexOf('<meta charset='), "SDK precisa ser o primeiro script do head");
afirmar(html.includes("TTMinis.game.init"), "pacote precisa inicializar o Mini Games SDK");
afirmar(!html.includes('/Capi-/assets/'), "pacote TikTok deve usar caminhos relativos");
afirmar(!htmlWeb.includes("connect.tiktok-minis.com"), "build do GitHub Pages não deve carregar o SDK TikTok");

const arquivos = [];
async function listar(dir) {
  for (const nome of await readdir(dir)) {
    const caminho = join(dir, nome);
    const info = await stat(caminho);
    if (info.isDirectory()) await listar(caminho);
    else arquivos.push({ caminho, tamanho: info.size });
  }
}
await listar(pasta);

afirmar(arquivos.every((arquivo) => arquivo.tamanho > 0), "pacote não pode conter arquivos vazios");

for (const { caminho } of arquivos.filter((arquivo) => arquivo.caminho.endsWith(".js"))) {
  const codigo = await readFile(caminho, "utf8");
  afirmar(!/\beval\s*\(/.test(codigo), `${caminho} contém eval proibido`);
  afirmar(!/new\s+Function\s*\(/.test(codigo), `${caminho} contém Function constructor proibido`);
  afirmar(!/set(?:Timeout|Interval)\s*\(\s*["'`]/.test(codigo), `${caminho} usa temporizador com string`);
}

const total = arquivos.reduce((soma, arquivo) => soma + arquivo.tamanho, 0);
afirmar(total < 10 * 1024 * 1024, "pacote ultrapassou o orçamento interno de 10 MB");
const pendente = config.client_key === "PREENCHER_CLIENT_KEY_DO_PORTAL";
console.log(`✓ Pacote TikTok: SDK primeiro, web isolada, arquivos válidos e varredura segura (${(total / 1024 / 1024).toFixed(2)} MB).`);
if (pendente) console.log("⚠ clientKey ainda pendente; este pacote não deve ser submetido.");
