# Direção de arte — Capivara Impossível

Fonte de verdade visual criada na sessão de polimento de julho de 2026.

## Regra central

- As artes existentes de Capi Zen, Boiadeira, Sonequinha, Piranha Afobada e
  fundo do lago são referências definitivas.
- Personagens usam acabamento 3D cinematográfico fofo, formas arredondadas,
  materiais táteis, leitura imediata em tela pequena e expressões familiares.
- Guardiãs capivaras mantêm as proporções faciais das referências e o pequeno
  pássaro amarelo como mascote, salvo quando a história pede explicitamente o
  contrário.
- Inimigos parecem afobados, nunca violentos: sobrancelhas expressivas, suor e
  urgência cômica. Ao perder, dormem.
- Interface usa Pantanal em teal/verde, vidro escuro, bordas por raridade,
  dourado para conquista e botões grandes com sombra curta.
- Textos, números e botões são sempre desenhados em Canvas; nunca fazem parte
  de imagens geradas.

## Assets desta sessão

| Asset-fonte | Uso |
|---|---|
| `assets/estagiario.png` | Guardião com caneca de café |
| `assets/grande_serena.png` | Lendária da oferta direta |
| `assets/luz_da_calma.png` | Lendária máxima da Caixa |
| `assets/marimbondo.png` | Inimigo zigue-zague |
| `assets/celular_surto.png` | Inimigo tanque |
| `assets/boto.png` | Chefe mergulhador |
| `assets/celularzao.png` | Chefe invocador |
| `assets/apressada.png` | Chefe de investida e futura redimida |
| `assets/caixa-surto.png` | Caixa fechada |
| `assets/caixa-surto-aberta.png` | Caixa aberta |
| `assets/mapa-pantanal.png` | Fundo vertical da jornada |

O pipeline `npm run assets` recorta, otimiza e publica as versões WebP. Os PNGs
transparentes são os mestres editáveis e não devem ser substituídos por WebPs.

## Prompts finais

Modo usado: gerador de imagens integrado, com as artes aprovadas locais como
referências de estilo quando aplicável. Sprites foram pedidos sobre chroma key
uniforme e recortados localmente com matte suave e despill.

### Base das guardiãs

> Polished cinematic 3D animated-family-film character render, soft tactile
> fur, rounded toy-like proportions, same visual language and facial
> proportions as the approved Capi guardians; centered full body, generous
> padding, warm studio character lighting, no text, logo or watermark, one
> tiny yellow bird mascot; perfectly uniform magenta chroma-key background
> with no shadow, gradient, texture, floor plane or halo.

- **Estagiário:** jovem capivara marrom, óculos redondos grandes, camisa creme,
  gravata azul frouxa, bolsa de trabalho e caneca cerâmica grande cheia de café;
  expressão adoravelmente preocupada; pássaro com minigravata.
- **Grande Serena:** capivara idosa de pelo cinza-prateado, sobrancelhas
  prateadas, olhos fechados, xale marfim com acabamento dourado, bordado solar
  e pingente de âmbar; mãos abertas; pássaro com manto marfim e dourado.
- **Luz da Calma:** capivara azul-lua, focinho branco, estrela de cristal na
  testa, capas em camadas como ondas, pingentes dourados e orbe perolado entre
  as patas; materiais opacos e silhueta nítida; pássaro com coroa de estrelas.

### Base dos inimigos e chefes

> Polished cinematic 3D animated-family-film creature render matching the
> approved Piranha Afobada; tactile rounded toy-like forms, comic urgency,
> family-friendly; centered full silhouette with generous padding; perfectly
> uniform green chroma-key background with no shadow, water, gradient, texture,
> floor plane or halo; no text, digits, logo, trademark or watermark.

- **Marimbondo:** corpo rechonchudo amarelo e marrom, quatro asas foscas,
  antenas tortas, sobrancelhas grandes, patas cerradas e gota de suor.
- **Celular do Surto:** smartphone vertical com capa roxa, tela azul, rosto
  estressado, braços de cabo USB-C, aletas de vibração e três notificações
  vermelhas sem números.
- **Boto Apressado:** boto-cor-de-rosa arqueado em movimento, focinho longo,
  expressão atrasada, gota de suor e cronômetro vermelho no pescoço.
- **Celularzão:** tablet-phone gigante com capa carvão/roxa, tela azul-escura,
  antenas com notificações vermelhas, quatro braços de cabo, alto-falantes e
  aletas de vibração; presença de chefe cômico, sem lacaios separados.
- **A Apressada:** capivara feminina atlética em corrida, pelo laranja,
  jaqueta vermelho-alaranjada com costura de raio, legging teal, tênis vermelhos,
  cachecol ao vento e smartwatch sem texto; sem pássaro antes da redenção.

### Caixa do Surto

> Single chunky premium cute-game treasure chest, polished cinematic 3D prop,
> deep plum-purple lacquered wood, warm brushed-gold bands and rounded corner
> caps, spiral lock with lightning notch, purple side handles and magenta enamel;
> centered front three-quarter view on perfectly uniform green chroma-key,
> no shadow, floor, particles, glow outside the silhouette, text or watermark.

A versão aberta preserva exatamente identidade, câmera, materiais e proporções;
apenas levanta a tampa, revela interior violeta acolchoado e permanece vazia
para a recompensa ser desenhada dinamicamente.

### Mapa do Pantanal

> Vertical Pantanal journey background matching the approved lake: polished
> stylized 3D-painted mobile-game environment, broad turquoise S-shaped river,
> lush rounded islands, giant lily pads, pink/yellow flowers, capim, smooth
> stones, small wooden bridges, warm sunrise, clean central journey corridor,
> darker safe areas for header and bottom navigation; environment only, no
> characters, enemies, UI, nodes, text, numbers, logo or watermark.

## Identidade dos ataques

- Boiadeira: chicote curvo de couro, extensão rápida e estalo claro no alvo.
- Estagiário: caneca inteira em arco, com alça, café visível e respingo.
- Sonequinha: onda branca lenta.
- Grande Serena e Luz da Calma: orbes dourado e azul-celeste, respectivamente.
- Capi Zen: onda dourada radial.
