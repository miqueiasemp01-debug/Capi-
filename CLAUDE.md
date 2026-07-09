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

## Fluxo
- Cada sessão: objetivo claro → implementar → deploy no GitHub Pages → dono testa no iPhone → commit.
- O dono opera SÓ pelo iPhone: nunca dar instruções que exijam terminal local; sempre entregar o link jogável no fim.
- Nunca terminar sessão com build quebrado. Commits pequenos com mensagem em PT-BR.
