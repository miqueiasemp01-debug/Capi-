export type Raridade = "comum" | "rara" | "epica" | "lendaria";

export type Comportamento = "linha" | "zigzag" | "tanque";

export interface InimigoDef {
  id: string;
  nome: string;
  hp: number;
  velocidade: number;
  dano: number;
  raio: number;
  comportamento: Comportamento;
  capim: number;
  cor: string;
}

export type TipoHabilidade = "imobilizar_forte" | "sono_area";

export interface HabilidadeDef {
  nome: string;
  tipo: TipoHabilidade;
  recargaS: number;
  duracaoS: number;
  descricao: string;
}

export interface GuardiaDef {
  id: string;
  nome: string;
  raridade: Raridade;
  anguloGrau: number;
  danoBase: number;
  cadenciaS: number;
  alcance: number;
  ataque: string;
  cor: string;
  habilidade: HabilidadeDef;
}

export interface SpawnDef {
  tempo: number;
  tipo: string;
  quantidade: number;
  intervalo: number;
}

export interface FaseDef {
  id: string;
  capitulo: number;
  numero: number;
  poderRecomendado: number;
  calmaMax: number;
  capimVitoria: number;
  spawns: SpawnDef[];
}

export interface SaveData {
  capim: number;
  toqueNivel: number;
  guardiaNiveis: Record<string, number>;
  faseMaxima: number;
  estrelas: Record<string, number>;
}
