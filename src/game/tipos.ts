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
  custo: number;
  cor: string;
}

export type ArquetipoChefe = "mergulhador" | "invocador" | "investida";

export interface ChefeDef {
  id: string;
  nome: string;
  arquetipo: ArquetipoChefe;
  descricao: string;
  hpMultiplicador: number;
  danoContato: number;
  raio: number;
  velocidade: number;
  cor: string;
  cicloS: number;
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

// Um inimigo já resolvido pela geração procedural: stats escalados pra fase.
export interface InimigoInstancia {
  id: string;
  nome: string;
  hp: number;
  velocidade: number;
  dano: number;
  raio: number;
  comportamento: Comportamento;
  capim: number;
  cor: string;
  ehChefe: boolean;
  chefe?: ChefeDef;
}

export interface EventoGerado {
  tempo: number;
  inimigo: InimigoInstancia;
}

// Bioma/capítulo — muda o fundo e a cor do mapa.
export interface Bioma {
  id: string;
  nome: string;
  cor: string;
}

// Uma fase inteira produzida pelo gerador determinístico (seed = número).
export interface FaseGerada {
  numero: number;
  capitulo: number;
  bioma: Bioma;
  poderRecomendado: number;
  calmaMax: number;
  capimVitoria: number;
  gemasVitoria: number;
  ehChefe: boolean;
  chefe: ChefeDef | null;
  duracaoS: number;
  eventos: EventoGerado[];
}

export interface SaveData {
  capim: number;
  gemas: number;
  toqueNivel: number;
  capiAtaqueNivel: number;
  capiCalmaNivel: number;
  guardiaNiveis: Record<string, number>;
  faseMaxima: number;
  estrelas: Record<string, number>;
  tutoriais: Record<string, boolean>;
  mute: boolean;
}
