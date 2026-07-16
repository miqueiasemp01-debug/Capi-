// Pipeline de assets: transforma os .jpg de /assets (arte IA em fundo verde)
// em sprites WebP transparentes + retratos quadrados em /public/img.
// O chroma key usa flood fill a partir das bordas: só remove o verde CONECTADO
// ao fundo — olhos verdes da piranha e folhas dentro do personagem sobrevivem.
// Uso: npm run assets

import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PASTA_ENTRADA = "assets";
const PASTA_SAIDA = "public/img";
const MANIFESTO = "src/data/imagens.json";
const ORCAMENTO_BYTES = 10 * 1024 * 1024;

// arquivo em /assets → id usado no jogo (ids de inimigos vêm de inimigos.json)
const PERSONAGENS = [
  { arquivo: "capi", id: "capi" },
  { arquivo: "boiadeira", id: "boiadeira" },
  { arquivo: "sonequinha", id: "sonequinha" },
  { arquivo: "estagiario", id: "estagiario" },
  { arquivo: "piranha", id: "piranha_afobada" },
  { arquivo: "marimbondo", id: "marimbondo" },
  { arquivo: "celular_surto", id: "celular_surto" },
  { arquivo: "grande_serena", id: "grande_serena" },
  { arquivo: "luz_da_calma", id: "luz_da_calma" },
];
const SPRITES = [
  { arquivo: "boto", id: "chefe-boto" },
  { arquivo: "celularzao", id: "chefe-celularzao" },
  { arquivo: "apressada", id: "chefe-apressada" },
  { arquivo: "caixa-surto", id: "caixa-surto" },
  { arquivo: "caixa-surto-aberta", id: "caixa-surto-aberta" },
];
const CENARIOS = [
  { arquivo: "fundo-lago", id: "fundo-lago" },
  { arquivo: "mapa-pantanal", id: "mapa-pantanal" },
  { arquivo: "splash", id: "splash" },
];

const LIMIAR_VERDE = 26; // "verdice" mínima pra virar fundo no flood fill
const ALTURA_SPRITE = 512;
const TAMANHO_RETRATO = 192;

function encontrarOrigem(nome) {
  for (const extensao of ["png", "jpg", "jpeg"]) {
    const caminho = join(PASTA_ENTRADA, `${nome}.${extensao}`);
    if (existsSync(caminho)) return caminho;
  }
  return null;
}

function verdice(r, g, b) {
  return g - Math.max(r, b);
}

// Remove o fundo verde: flood fill das bordas sobre pixels verdes,
// suaviza a borda (1px) e tira o "vazamento" verde do contorno.
function removerFundoVerde(dados, largura, altura) {
  const total = largura * altura;
  const fundo = new Uint8Array(total);
  const fila = new Int32Array(total);
  let inicio = 0;
  let fim = 0;

  const tentar = (indice) => {
    if (fundo[indice]) return;
    const p = indice * 4;
    if (verdice(dados[p], dados[p + 1], dados[p + 2]) > LIMIAR_VERDE) {
      fundo[indice] = 1;
      fila[fim++] = indice;
    }
  };

  for (let x = 0; x < largura; x++) {
    tentar(x);
    tentar((altura - 1) * largura + x);
  }
  for (let y = 0; y < altura; y++) {
    tentar(y * largura);
    tentar(y * largura + largura - 1);
  }

  while (inicio < fim) {
    const indice = fila[inicio++];
    const x = indice % largura;
    const y = (indice / largura) | 0;
    if (x > 0) tentar(indice - 1);
    if (x < largura - 1) tentar(indice + 1);
    if (y > 0) tentar(indice - largura);
    if (y < altura - 1) tentar(indice + largura);
  }

  for (let indice = 0; indice < total; indice++) {
    const p = indice * 4;
    if (fundo[indice]) {
      dados[p + 3] = 0;
      continue;
    }
    // pixel de borda (vizinho do fundo): suaviza e remove vazamento verde
    const x = indice % largura;
    const y = (indice / largura) | 0;
    const vizinhoFundo =
      (x > 0 && fundo[indice - 1]) ||
      (x < largura - 1 && fundo[indice + 1]) ||
      (y > 0 && fundo[indice - largura]) ||
      (y < altura - 1 && fundo[indice + largura]);
    if (vizinhoFundo) {
      const teto = Math.max(dados[p], dados[p + 2]);
      if (dados[p + 1] > teto) dados[p + 1] = teto;
      dados[p + 3] = 170;
    }
  }
}

function caixaVisivel(dados, largura, altura) {
  let x0 = largura;
  let y0 = altura;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (dados[(y * largura + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const folga = 4;
  x0 = Math.max(0, x0 - folga);
  y0 = Math.max(0, y0 - folga);
  x1 = Math.min(largura - 1, x1 + folga);
  y1 = Math.min(altura - 1, y1 + folga);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function processarPersonagem(arquivo, nome) {
  const origem = encontrarOrigem(arquivo);
  if (!origem) return null;

  const metadados = await sharp(origem).metadata();

  const { data, info } = await sharp(origem)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Artes antigas chegam em JPG com fundo verde. As novas já foram recortadas
  // em PNG, então preservar seu alfa evita uma segunda passagem destrutiva.
  if (!metadados.hasAlpha) removerFundoVerde(data, info.width, info.height);
  const caixa = caixaVisivel(data, info.width, info.height);
  if (!caixa) {
    console.warn(`  ⚠ ${nome}: nada sobrou após o chroma key, pulando`);
    return null;
  }

  const recortado = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(caixa)
    .png()
    .toBuffer();

  await sharp(recortado)
    .resize({ height: ALTURA_SPRITE, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(join(PASTA_SAIDA, `${nome}.webp`));

  // retrato: recorte quadrado da cabeça (topo do sprite, centralizado)
  const lado = Math.min(caixa.width, Math.round(caixa.height * 0.58));
  await sharp(recortado)
    .extract({
      left: Math.round((caixa.width - lado) / 2),
      top: Math.round(caixa.height * 0.02),
      width: lado,
      height: Math.min(lado, Math.floor(caixa.height * 0.98)),
    })
    .resize(TAMANHO_RETRATO, TAMANHO_RETRATO, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(join(PASTA_SAIDA, `retrato-${nome}.webp`));

  return [nome, `retrato-${nome}`];
}

async function processarSprite(arquivo, nome) {
  const origem = encontrarOrigem(arquivo);
  if (!origem) return null;
  const metadados = await sharp(origem).metadata();
  const { data, info } = await sharp(origem)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!metadados.hasAlpha) removerFundoVerde(data, info.width, info.height);
  const caixa = caixaVisivel(data, info.width, info.height);
  if (!caixa) return null;
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(caixa)
    .resize({ height: ALTURA_SPRITE, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(join(PASTA_SAIDA, `${nome}.webp`));
  return [nome];
}

async function processarCenario(arquivo, nome) {
  const origem = encontrarOrigem(arquivo);
  if (!origem) return null;
  await sharp(origem)
    .resize({ width: 780, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toFile(join(PASTA_SAIDA, `${nome}.webp`));
  return [nome];
}

mkdirSync(PASTA_SAIDA, { recursive: true });

const disponiveis = [];
for (const { arquivo, id } of CENARIOS) {
  const gerados = await processarCenario(arquivo, id);
  if (gerados) disponiveis.push(...gerados);
  else console.warn(`  ⚠ sem arte pra ${id} (fallback procedural)`);
}
for (const { arquivo, id } of PERSONAGENS) {
  if (disponiveis.includes(id)) continue;
  const gerados = await processarPersonagem(arquivo, id);
  if (gerados) disponiveis.push(...gerados);
  else console.warn(`  ⚠ sem arte pra ${id} (${arquivo}.jpg, fallback procedural)`);
}
for (const { arquivo, id } of SPRITES) {
  const gerados = await processarSprite(arquivo, id);
  if (gerados) disponiveis.push(...gerados);
  else console.warn(`  ⚠ sem arte pra ${id} (${arquivo}, fallback procedural)`);
}

writeFileSync(MANIFESTO, `${JSON.stringify(disponiveis.sort(), null, 2)}\n`);

let totalBytes = 0;
console.log("\nImagens geradas em public/img:");
for (const arquivo of readdirSync(PASTA_SAIDA).sort()) {
  const bytes = statSync(join(PASTA_SAIDA, arquivo)).size;
  totalBytes += bytes;
  console.log(`  ${arquivo.padEnd(30)} ${(bytes / 1024).toFixed(1)} KB`);
}
console.log(`  TOTAL: ${(totalBytes / 1024).toFixed(1)} KB (orçamento: ${ORCAMENTO_BYTES / 1024 / 1024} MB)`);

if (totalBytes > ORCAMENTO_BYTES) {
  console.error("✗ Estourou o orçamento de imagens!");
  process.exit(1);
}
console.log("✓ Dentro do orçamento.");
