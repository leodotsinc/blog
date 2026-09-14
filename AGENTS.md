# Blog — plano atual

## Hero e desempenho

- Hero e métricas usam fluxo vertical; preservar o nome inteiro e métricas legíveis de 320 px a desktop.
- O hero usa uma escultura metálica do monograma: duas molduras contínuas em L e seis pontes, com volume e bordas arredondadas. A coreografia de 18 segundos apresenta o símbolo, separa e gira as peças, recompõe e repousa. Movimento autônomo, sem botão ou ação necessária; manter o símbolo reconhecível durante os momentos de repouso. Abaixo de 1024 px, a figura entra no fluxo entre o nome e a apresentação.
- A cena usa 11 draw calls, 4200 triângulos e 90 partículas suaves. Antialiasing e DPR até 1,5 no mobile/toque/hardware com até quatro núcleos, e até 2 no desktop; não sacrificar a nitidez das bordas voltando ao DPR 1 em telas densas. Os materiais físicos refletem um estúdio procedural convertido uma vez em um mapa PMREM de 256 px. Não há download de HDR, bloom, sombras em passes extras ou blur de viewport. O grain pertence ao fundo, sem sobrepor o metal.
- `HeroArtwork` observa a própria visibilidade, o estado da aba e `home-locked`; `HeroCanvas` usa um loop sob demanda. Pausar fora da tela e sob o menu, preservar o instante da cena e limitar o delta ao retomar. Mudanças de tema e resize ainda podem desenhar um quadro.
- A inicialização aguarda visibilidade e um intervalo ocioso; o SVG fica presente enquanto os materiais compilam com `compileAsync`. Depois de iniciada, a cena continua montada sob o menu para evitar recompilação na reabertura. Movimento reduzido apresenta o monograma 3D montado e estático. Carregamento, ausência ou perda de WebGL usam o símbolo vetorial original, também sem controle. Não tratar todo celular como movimento reduzido.
- Os materiais Three compartilham os mesmos uniforms diretamente: R3F 9.6 copia os wrappers numéricos ao receber uniforms por JSX, o que congelava a deformação quando o código atualizava somente o objeto original. Descartar geometrias e materiais ao desmontar.
- No mobile, preservar as entradas do nome, textos, botões e seções. Scramble, parallax e fade do conteúdo continuam restritos ao desktop compatível. O relógio atualiza somente seu próprio componente.
- Datas de publicações usam UTC explicitamente para manter o HTML do servidor e do navegador idênticos.

## Experiência da home

- O CTA principal abre o Resilience Lab: uma simulação local de fila limitada, falha de workers, recuperação e aumento de capacidade. Manter explícito que o estado fica em memória e não representa telemetria de produção.
- A lógica está em `lib/architecture-lab.ts`; a interface deve refletir esse estado. Cada evento enviado precisa estar concluído, em processamento, na fila ou recusado. Falhas devolvem trabalho não confirmado; a recuperação não duplica commits.
- O laboratório só avança após ação do visitante, enquanto estiver visível e a aba estiver ativa. Respeitar movimento reduzido e manter os controles utilizáveis por toque e teclado.
- Os previews dos projetos ilustram as arquiteturas descritas nos respectivos MDX. Atualizar esses mapas quando os estudos de caso mudarem; não apresentar diagramas ilustrativos como screenshots de produção.
- O Architecture Decision Room em `#decision-room` apresenta três cenários hipotéticos (produto, pagamentos e IA), com duas alternativas cada. Texto e diagramas vêm de `data/architecture-decisions.ts`; mostrar ganhos, custos e critérios para rever cada escolha, sem inventar resultados de clientes. Interações locais, sem chamadas de IA ou loops de animação.
- O toolbox em `#toolbox` usa categorias legíveis de IA/agentes, desenvolvimento e operação. Preservar a quebra natural dos textos e os controles por teclado; não voltar ao anel 3D com etiquetas sobrepostas.

## Menu e primeira interação

- O cabeçalho anima a largura real entre 208 px e 100% de um pai limitado a 1168 px. Não animar `max-width` até 1168 px numa barra limitada pela viewport: em 390 px isso fazia a expansão visível acabar em 45 ms. Preservar duração de 550 ms, easing, padding e limiar de scroll; o limite desktop fica no pai.
- Na medição local de produção em 390 px, os dois sentidos passaram a chegar a menos de 1 px do destino em aproximadamente 399/392 ms. Conferidos também 320, 768 e 1440 px, resize, inversão do scroll durante a animação, menu e origem da onda de tema. Medições em Chromium, sem alegar execução em iPhone físico.

- Manter a cortina, entrada em cascata, auroras em movimento, gradiente ativo e transformação do ícone. A cortina usa dois elementos com `translateY` opostos; evitar remontar e animar `clip-path` de uma viewport com filtros grandes no primeiro clique.
- O menu fica montado, mas fechado usa `inert`, `aria-hidden`, `visibility: hidden` e animações pausadas; relógio só atualiza aberto. Reabrir começa no topo. O callback de fechamento é estável para não reinstalar o bloqueio de scroll a cada atualização do cabeçalho.
- Links do overlay pré-carregam por intenção (mouse ou foco), sem pré-carregar todas as rotas quando o menu aparece. A medição local de produção em 390 px passou de 19 requisições extras na primeira abertura para zero; esse resultado não equivale a medir FPS em iPhone físico.
- A suavidade das auroras vem dos próprios gradientes, preservando o deslocamento sem filtros de blur de 110 px. Hover com desfoque pertence apenas a `(hover: hover) and (pointer: fine)`; toque não deve deixar links desfocados. Sublinhados animam escala e opacidade, com espaço para a tipografia, sem largura zerada e recorte do texto.
- Validado em Chromium de 320 a 1440 px: primeira abertura/reabertura, cortina e cascata em progresso, movimento das auroras, duas direções de tema, Escape, navegação por clique/teclado e fechamento após mudança de rota. A linha rosa relatada no Safari não foi reproduzida nesse navegador; confirmar a correção de composição no aparelho.

## Tema e integração Spotify

- A onda de tema parte do centro medido do botão, inclusive por teclado e no cabeçalho compacto. Atualizar tema e ícone antes da captura; o ícone tem seu próprio `view-transition-name`. Cliques concorrentes são ignorados até terminar; movimento reduzido e navegadores sem View Transitions trocam diretamente.
- O sobrenome mantém folga horizontal no elemento com gradiente para não cortar a tinta do último glifo com tracking negativo.
- Credenciais do Spotify ficam exclusivamente no `.env` da VPS. A renovação de 2026-09-13 validou as chaves, renovou a autorização revogada e confirmou uma faixa no endpoint público. O retorno OAuth já cadastrado é `http://127.0.0.1:8888/`, usado pelo helper. Trocar o client secret não recupera um refresh token revogado.
- O container roda como `node` via Compose; manter `.next/cache` gravável por esse usuário na imagem para a otimização de imagens.
- Preservar proprietário, grupo e permissões do `.env` ao rotacionar credenciais. Na VPS, `leo:docker` com modo `640` é o estado preservado e conferido pelo helper de deploy; mudanças de modo/proprietário exigem manutenção explícita. Backups e arquivos temporários da sincronização usam umask `077`.

## Validação

- Para mudanças no laboratório, executar `yarn test:lab` com Node 24+ e verificar no navegador rajadas, capacidade cheia, falha, recuperação, reset, teclado e pausa fora da viewport.
- Antes de publicar mudanças no hero, executar `yarn build` e verificar o build de produção no navegador em 320, 390, 768 e 1440 px.
- Conferir nome, métricas, scroll, botão principal, resize e movimento reduzido. Verificar hidratação em UTC e America/Sao_Paulo.
- Para alterações nas novas experiências, verificar as seis combinações do Decision Room, as três categorias do toolbox e seus textos em 320, 390, 768 e 1440 px. Testar tema nas duas direções, por clique e teclado, com cabeçalho aberto e compacto; conferir a origem real da onda e o ícone durante a transição.
- Monograma conferido no build de produção em 320, 390, 768, 1024 e 1440 px, nos dois temas, montado e separado. Verificar o ciclo automático completo, a silhueta nos extremos e ausência de controles antigos. Movimento reduzido e fallback foram exercitados por parâmetros locais de teste, removidos antes da publicação; isso não equivale a mudar a preferência do sistema operacional ou provocar uma perda real do contexto WebGL.
- No Chromium local, com DPR 2, uma janela estável de 240 quadros registrou mediana de 16,6 ms e p95 de 19,2 ms. Em 390 px com DPR 1,5, janelas estáveis registraram mediana de 16,7 ms e p95 de 18,9–19,5 ms. O contador parou em 1337 sob o menu e em 1354 fora da seção; a retomada preservou o tempo. Movimento reduzido ficou em um quadro, desenhando apenas mais um na troca de tema. Instrumentação removida antes de publicar. Essas medidas não representam desempenho em iPhone físico, GPU móvel ou latência total da primeira interação.
- O lint legado está bloqueado pela configuração FlatCompat / Next 16; a tentativa com configuração nativa também falhou em minimatch/brace-expansion das dependências existentes. Não declarar lint verde com base no build; alinhar a correção do tooling em uma tarefa própria.
- Build e health check do workflow não substituem verificação visual. A verificação atual usou Chromium em larguras de celular; desempenho em iPhone físico ainda depende de validação no aparelho.

## D2 — contrato de publicação aplicado

- Blog **0.1.0** implantado em 14/09/2026, commit `01990f4d3d0b16fa5832b4340e4da477c9387e4e`, após CI `34864714015` e imagem qualificada no build `34865012930`. A [release v0.1.0](https://github.com/leodotsinc/blog/releases/tag/v0.1.0) registra o manifesto verificado e o digest. Este registro é histórico; confirmar a versão em produção antes de operar.
- Deploy depende da CI bem-sucedida do SHA atual de main. SemVer parte da última release publicada e verificada: mudanças comuns PATCH, `feat:` MINOR e breaking changes MAJOR. Tags/releases só são publicadas após health e identidade do runtime. Falha de publicação exige reutilizar o artefato original; não reconstruir outra imagem com a mesma versão nem sobrescrever tags.
- Helper e chave dedicada com comando forçado já instalados. O bootstrap inicial foi concluído; não repeti-lo nem usar o deploy compartilhado legado como fallback. Operação, recuperação, checkpoints e estado da rotina pertencem ao repo privado `vps-bootstrap`.
- `/api/health` não chama Spotify; `/api/version` expõe apenas versão, commit e build, com no-store. A validação real incluiu health/version públicos, Spotify, hero em 1440/390 px, menu e navegação. O teste de repetição pela chave restrita preservou o container; isso não é uma execução de rollout em runner GitHub nem restore independente.
- Next 16.3.3, Sharp 0.35.4 e libheif 1.23.2 foram qualificados na imagem; PNG/JPEG e `/_next/image` exercitados. A troca preservou hero, conteúdo e credenciais. O aviso de depreciação `THREE.Clock` já existia antes; o lint mantém a limitação acima.
- `scripts/sync-spotify-env.sh` está aposentado e recusa antes de rede/escritas. Rotação de credenciais exige manutenção própria com lock, checkpoint e validação, sem versão fictícia do app; o helper de refresh token foi preservado.
