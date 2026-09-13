# Blog — plano atual

## Hero e desempenho

- Hero e métricas usam fluxo vertical; preservar o nome inteiro e métricas legíveis de 320 px a desktop.
- Mobile, ponteiro de toque, hardware com até quatro núcleos e movimento reduzido usam arte estática. WebGL fica restrito a desktop compatível, pausado fora da viewport e em abas ocultas.
- No modo estático, o texto não embaralha e o conteúdo não usa parallax nem fade no scroll. O relógio atualiza somente seu próprio componente.
- Datas de publicações usam UTC explicitamente para manter o HTML do servidor e do navegador idênticos.

## Experiência da home

- O CTA principal abre o Resilience Lab: uma simulação local de fila limitada, falha de workers, recuperação e aumento de capacidade. Manter explícito que o estado fica em memória e não representa telemetria de produção.
- A lógica está em `lib/architecture-lab.ts`; a interface deve refletir esse estado. Cada evento enviado precisa estar concluído, em processamento, na fila ou recusado. Falhas devolvem trabalho não confirmado; a recuperação não duplica commits.
- O laboratório só avança após ação do visitante, enquanto estiver visível e a aba estiver ativa. Respeitar movimento reduzido e manter os controles utilizáveis por toque e teclado.
- Os previews dos projetos ilustram as arquiteturas descritas nos respectivos MDX. Atualizar esses mapas quando os estudos de caso mudarem; não apresentar diagramas ilustrativos como screenshots de produção.
- O Architecture Decision Room em `#decision-room` apresenta três cenários hipotéticos (produto, pagamentos e IA), com duas alternativas cada. Texto e diagramas vêm de `data/architecture-decisions.ts`; mostrar ganhos, custos e critérios para rever cada escolha, sem inventar resultados de clientes. Interações locais, sem chamadas de IA ou loops de animação.
- O toolbox em `#toolbox` usa categorias legíveis de IA/agentes, desenvolvimento e operação. Preservar a quebra natural dos textos e os controles por teclado; não voltar ao anel 3D com etiquetas sobrepostas.

## Tema e integração Spotify

- A onda de tema parte do centro medido do botão, inclusive por teclado e no cabeçalho compacto. Atualizar tema e ícone antes da captura; o ícone tem seu próprio `view-transition-name`. Cliques concorrentes são ignorados até terminar; movimento reduzido e navegadores sem View Transitions trocam diretamente.
- O sobrenome mantém folga horizontal no elemento com gradiente para não cortar a tinta do último glifo com tracking negativo.
- Credenciais do Spotify ficam exclusivamente no `.env` da VPS. A renovação de 2026-09-13 validou as chaves, renovou a autorização revogada e confirmou uma faixa no endpoint público. O retorno OAuth já cadastrado é `http://127.0.0.1:8888/`, usado pelo helper. Trocar o client secret não recupera um refresh token revogado.
- O container roda como `node` via Compose; manter `.next/cache` gravável por esse usuário na imagem para a otimização de imagens.
- Preservar proprietário, grupo e permissões do `.env` ao rotacionar credenciais. Na VPS, `leo:docker` com modo `640` mantém leitura para o usuário `deploy`; forçar `600` bloqueia o workflow. Backups e arquivos temporários da sincronização usam umask `077`.

## Validação

- Para mudanças no laboratório, executar `yarn test:lab` com Node 24+ e verificar no navegador rajadas, capacidade cheia, falha, recuperação, reset, teclado e pausa fora da viewport.
- Antes de publicar mudanças no hero, executar `yarn build` e verificar o build de produção no navegador em 320, 390, 768 e 1440 px.
- Conferir nome, métricas, scroll, botão principal, resize e movimento reduzido. Verificar hidratação em UTC e America/Sao_Paulo.
- Para alterações nas novas experiências, verificar as seis combinações do Decision Room, as três categorias do toolbox e seus textos em 320, 390, 768 e 1440 px. Testar tema nas duas direções, por clique e teclado, com cabeçalho aberto e compacto; conferir a origem real da onda e o ícone durante a transição.
- Build e health check do workflow não substituem verificação visual. A verificação atual usou Chromium com emulação mobile; desempenho em iPhone físico ainda depende de validação no aparelho.
