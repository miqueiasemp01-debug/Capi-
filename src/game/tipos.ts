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

export type TipoHabilidade = "imobilizar_forte" | "sono_area" | "rajada_cafes";

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
  // passivas de lendárias (opcionais)
  auraDanoPct?: number; // Grande Serena: +X% de dano pra todas
  acalmaMaisForteS?: number; // Luz da Calma: acalma o comum mais forte a cada Xs
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

// Estado da Sonequinha na saga "O Surto ataca".
//  normal   → antes do evento (jogável)
//  surtada  → sequestrada, janela de resgate de 6h ativa (resgateAte)
//  perdida  → 6h expiraram; reabre sozinha em 24h (reabreEm)
//  curada   → resgatada de volta (a oferta já surgiu na captura)
export type EstadoSonequinha = "normal" | "surtada" | "perdida" | "curada";
export type EstadoOferta = "nenhuma" | "ativa" | "comprada" | "expirada";

export interface EstadoEvento {
  sonequinha: EstadoSonequinha;
  resgateAte: number; // timestamp virtual do fim da janela de 6h
  reabreEm: number; // timestamp virtual da reabertura (24h após expirar)
  cutsceneSurtoVista: boolean;
  cutsceneCuraVista: boolean;
  ofertaSerenaVista: boolean;
  serena: EstadoOferta;
  serenaAte: number; // timestamp virtual do fim da oferta de 48h
  caixaLiberada: boolean; // caixa do evento acessível (após a captura)
}

export interface EstadoJornada {
  reforcoInicialConcedido: boolean; // legado da 7A, usado somente para migração
  migracaoEstagiarioShardsConcluida: boolean;
}

export interface SaveData {
  capim: number;
  gemas: number;
  toqueNivel: number;
  capiAtaqueNivel: number;
  capiCalmaNivel: number;
  guardiaNiveis: Record<string, number>;
  guardiasPossuidas: string[]; // quais guardiãs o jogador tem
  fragmentosGuardia: Record<string, number>; // total vitalício: 10 desbloqueia; 20/40/90 evoluem
  faseMaxima: number;
  estrelas: Record<string, number>;
  bonusEstrela3: Record<string, boolean>; // fases que já pagaram +2 gemas por 3★
  gemasChefeRecebidas: Record<string, boolean>; // chefes que já pagaram gemas na 1ª vitória
  pityLendaria: number; // caixas desde o último prêmio em destaque (garante na 100ª)
  partidasConcluidas: number; // vitórias + derrotas concluídas; abandonar/recarregar não conta
  caixasGratisDisponiveis: number; // acumula uma a cada 10 partidas concluídas
  evento: EstadoEvento;
  jornada: EstadoJornada;
  tutoriais: Record<string, boolean>;
  mute: boolean;
}
