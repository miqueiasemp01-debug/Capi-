import manifesto from "../data/imagens.json";

// Cache global de sprites. Quem desenha pergunta por nome e trata null com
// fallback procedural — um asset faltando NUNCA quebra o jogo.
const cache = new Map<string, HTMLImageElement>();

export function imagem(nome: string): HTMLImageElement | null {
  return cache.get(nome) ?? null;
}

// Pré-carrega tudo que o manifesto (gerado pelo pipeline) lista.
// Erro de rede/404 conta como progresso e vira fallback silencioso.
export function carregarImagens(aoProgredir: (fracao: number) => void): Promise<void> {
  const nomes = manifesto as string[];
  if (nomes.length === 0) {
    aoProgredir(1);
    return Promise.resolve();
  }
  let feitos = 0;
  return new Promise((resolver) => {
    for (const nome of nomes) {
      const img = new Image();
      const concluir = (deuCerto: boolean) => {
        if (deuCerto) cache.set(nome, img);
        feitos++;
        aoProgredir(feitos / nomes.length);
        if (feitos === nomes.length) resolver();
      };
      img.onload = () => concluir(true);
      img.onerror = () => concluir(false);
      img.src = `${import.meta.env.BASE_URL}img/${nome}.webp`;
    }
  });
}
