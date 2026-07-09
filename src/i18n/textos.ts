import textos from "./pt-BR.json";

export type ChaveTexto = keyof typeof textos;

export function t(chave: ChaveTexto): string {
  return textos[chave];
}
