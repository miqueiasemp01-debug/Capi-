import curva from "../data/curva.json";
import chefesJson from "../data/chefes.json";
import inimigosJson from "../data/inimigos.json";
import type { Bioma, ChefeDef, FaseGerada, InimigoDef, InimigoInstancia } from "./tipos";

const CHEFES = chefesJson as unknown as ChefeDef[];
const INIMIGOS = new Map((inimigosJson as unknown as InimigoDef[]).map((i) => [i.id, i]));

// PRNG determinístico (mulberry32): mesma seed → mesma fase, sempre.
// É o que garante que a "fase 7" seja idêntica pra todo mundo, sem guardar dado.
function criarRng(seed: number): () => number {
  let estado = seed >>> 0;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ehChefe(numero: number): boolean {
  return numero % 10 === 0;
}

export function poderRecomendado(numero: number): number {
  const base = curva.poderBase * curva.poderCrescimento ** (numero - 1);
  // chefão exige um pouco mais de poder que a fase comum vizinha
  return Math.round(ehChefe(numero) ? base * 1.15 : base);
}

export function capituloDaFase(numero: number): number {
  return Math.floor((numero - 1) / 20) + 1;
}

export function biomaDaFase(numero: number): Bioma {
  const capitulo = capituloDaFase(numero);
  const faixa = curva.biomas.find((b) => capitulo <= b.ateCapitulo) ?? curva.biomas[curva.biomas.length - 1];
  return { id: faixa.id, nome: faixa.nome, cor: faixa.cor };
}

// escala geométrica dos stats: acompanha o poder recomendado, então o
// tempo-pra-derrubar cada inimigo fica ~constante quando o jogador está no nível.
function escalaInimigo(numero: number): number {
  return curva.poderCrescimento ** (numero - 1);
}

function pesosDoTrecho(numero: number): Record<string, number> {
  const trecho = curva.mixPorTrecho.find((m) => numero <= m.ateFase) ?? curva.mixPorTrecho[curva.mixPorTrecho.length - 1];
  return trecho.pesos;
}

// Dispensador proporcional por déficit: em vez de sortear (que deixa uma fase
// azarada rolar muitos celulares), entrega sempre o tipo mais "atrasado" em
// relação ao seu peso. Composição quase idêntica entre fases → baixa variância.
function criarDispensador(pesos: Record<string, number>): () => string {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  const tipos = Object.keys(pesos);
  const alvo = Object.fromEntries(tipos.map((k) => [k, pesos[k] / total]));
  const dados = Object.fromEntries(tipos.map((k) => [k, 0]));
  let n = 0;
  return () => {
    n++;
    let melhor = tipos[0];
    let maiorDeficit = -Infinity;
    for (const tipo of tipos) {
      const deficit = alvo[tipo] * n - dados[tipo];
      if (deficit > maiorDeficit) {
        maiorDeficit = deficit;
        melhor = tipo;
      }
    }
    dados[melhor]++;
    return melhor;
  };
}

function instanciaInimigo(def: InimigoDef, escala: number, jitter: number): InimigoInstancia {
  return {
    id: def.id,
    nome: def.nome,
    // jitter de HP por inimigo: quebra a ressonância de "golpes p/ matar"
    // (senão todos do mesmo tipo morrem no mesmo golpe) e dá variedade.
    hp: Math.max(1, Math.round(def.hp * escala * jitter)),
    velocidade: def.velocidade,
    // dano de contato fixo e baixo: a dificuldade é a CORRIDA DE DPS (limpar
    // antes de acumular). A evolução de Calma é uma folga extra pra quem a compra.
    dano: def.dano,
    raio: def.raio,
    comportamento: def.comportamento,
    capim: def.capim,
    cor: def.cor,
    ehChefe: false,
  };
}

function chefeDaFase(numero: number): ChefeDef {
  // cicla os 3 arquétipos: fase 10→boto, 20→celularzão, 30→apressada, 40→boto…
  const indice = (numero / 10 - 1) % CHEFES.length;
  return CHEFES[indice];
}

function instanciaChefe(chefe: ChefeDef, poderHpRef: number): InimigoInstancia {
  // HP do chefe = múltiplo do "orçamento de dano" recomendado da fase
  return {
    id: chefe.id,
    nome: chefe.nome,
    hp: Math.round(poderHpRef * chefe.hpMultiplicador),
    velocidade: chefe.velocidade,
    dano: chefe.danoContato,
    raio: chefe.raio,
    comportamento: "tanque",
    capim: 30,
    cor: chefe.cor,
    ehChefe: true,
    chefe,
  };
}

export function gerarFase(numero: number): FaseGerada {
  const rng = criarRng(numero * 2654435761);
  const escala = escalaInimigo(numero);
  const recomendado = poderRecomendado(numero);
  const chefe = ehChefe(numero);

  // crescimento CONTÍNUO por fase (não em degraus de 10): evita saltos de
  // dificuldade perto de 50% de vitória — o serrilhado do sawtooth.
  const duracaoS = Math.min(
    curva.duracaoMaxS,
    curva.duracaoBaseS + (numero - 1) * (curva.duracaoCrescPor10 / 10),
  );
  const calmaMax = Math.round(curva.calmaBase + (numero - 1) * (curva.calmaCrescimentoPor10 / 10));

  const capimVitoria = Math.round(curva.capimBase * curva.capimCrescimento ** (numero - 1));
  const gemasVitoria = chefe
    ? curva.chefeGemasBase + Math.floor((numero / 10 - 1)) * curva.chefeGemasCrescPor10
    : 0;

  const eventos: FaseGerada["eventos"] = [];

  // Orçamento de ameaça escala COM a escala dos inimigos: assim a CONTAGEM de
  // afobados fica ~constante entre fases (o que muda é o quão tankudos são),
  // mantendo a dificuldade estável em vez de cair com o número da fase.
  const orcMinuto =
    curva.orcamentoBasePorMinuto * (1 + (curva.orcamentoCrescPor10Pct / 100) * Math.floor((numero - 1) / 10));
  let orcamento = (orcMinuto / 60) * duracaoS * escala * (chefe ? 0.55 : 1);

  const dispensar = criarDispensador(pesosDoTrecho(numero));
  const inicioSpawns = 1.2;
  const fimSpawns = duracaoS - (chefe ? 8 : 3);
  let tempo = inicioSpawns;
  let seguranca = 0;
  while (orcamento > 0 && tempo < fimSpawns && seguranca++ < 600) {
    const tipo = dispensar();
    const def = INIMIGOS.get(tipo);
    if (!def) break;
    orcamento -= def.custo * escala;
    eventos.push({ tempo, inimigo: instanciaInimigo(def, escala, 0.88 + rng() * 0.24) });
    // cadência: mais apertada conforme a fase avança dentro dela mesma.
    // variância baixa (0,9–1,1) pra fases vizinhas terem dificuldade parecida.
    const progresso = (tempo - inicioSpawns) / (fimSpawns - inicioSpawns);
    const intervalo = (0.82 - 0.34 * progresso) * (0.9 + rng() * 0.2);
    tempo += Math.max(0.3, intervalo);
  }

  if (chefe) {
    // referência de HP do chefe: dano/s recomendado × ciclo, aproximado por recomendado
    const chefeDef = chefeDaFase(numero);
    eventos.push({ tempo: 2.5, inimigo: instanciaChefe(chefeDef, recomendado) });
  }

  eventos.sort((a, b) => a.tempo - b.tempo);

  return {
    numero,
    capitulo: capituloDaFase(numero),
    bioma: biomaDaFase(numero),
    poderRecomendado: recomendado,
    calmaMax,
    capimVitoria,
    gemasVitoria,
    ehChefe: chefe,
    chefe: chefe ? chefeDaFase(numero) : null,
    duracaoS,
    eventos,
  };
}
