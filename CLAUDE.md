# Capivara Impossível — memória do projeto
Jogo: defesa zen p/ TikTok Mini Games. Capi medita no centro; guardiãs defendem;
jogador toca inimigos p/ acalmar. Doc completo: docs/plano-v2.md (LER antes de decidir).
Protótipo de referência: referencia/prototipo-v02.html

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
