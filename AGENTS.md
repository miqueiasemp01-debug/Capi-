# Capivara Impossível — memória e regras do projeto para o Codex

Jogo: defesa zen p/ TikTok Mini Games. Capi medita no centro; guardiãs defendem;
jogador toca inimigos p/ acalmar. Doc completo: docs/plano-v2.md (LER antes de decidir).
Protótipo de referência: referencia/prototipo-v02.html

Este arquivo é a fonte de instruções do Codex para o projeto. O `CLAUDE.md`
permanece como memória histórica e todas as regras dele são preservadas aqui.

## Stack e regras

- TypeScript + Canvas 2D próprio + Vite. Sem frameworks de UI. Mobile-first (visar iPhone/Android baratos).
- Conteúdo é DADO: fases/ondas/guardiãs/preços em /src/data/*.json. Textos em /src/i18n/pt-BR.json.
- Orçamento de peso: build final < 10 MB (limite da plataforma é 50).
- Sem localStorage p/ economia real futura; abstrair Save atrás de interface (local agora, nuvem depois).
- Toda mudança de balanceamento passa pelo simulador (scripts/simular.ts).

## Fluxo (desde a Sessão 6)

- **Commit DIRETO na `main`, sem PR.** O deploy no GitHub Pages roda a cada push na main.
- **Trava obrigatória antes de todo push:** `npm run build` (inclui typecheck) **e** `npm run simular` têm de estar VERDES. Nunca fazer push com build quebrado ou simulador falhando.
- O dono opera SÓ pelo iPhone: nunca dar instruções que exijam terminal local; sempre entregar o link jogável no fim.
- Cada sessão: objetivo claro → implementar → trava verde → push na main → dono testa no iPhone. Commits pequenos com mensagem em PT-BR.
- Entregável final de cada sessão: link + resumo + checklist de teste.

## Regras obrigatórias do Codex

- Toda alteração, inclusive em documentação ou configuração, deve passar por `npm run build` e `npm run simular`.
- Nunca fazer push com testes, build ou simulador quebrados.
- Trabalhar e fazer commit diretamente na `main`, sem abrir pull request.
- O deploy é feito pelo GitHub Actions após o push na `main`; não substituir esse fluxo por publicação manual.
- Toda sessão deve terminar com o link jogável, um resumo do que foi feito e um checklist de teste para o dono executar no iPhone.
- Não excluir nem reescrever funcionalidades existentes sem justificar claramente a necessidade e o impacto.
- Verificar o jogo visualmente antes de publicar, com atenção ao fluxo mobile-first e a aparelhos iPhone/Android baratos.
- Manter compatibilidade com saves antigos: campos novos devem receber defaults seguros e qualquer mudança de formato precisa de migração sem perda de progresso.
- Mudanças de economia ou balanceamento precisam ser testadas no simulador, além das demais validações obrigatórias.
