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

## Validação

- Para mudanças no laboratório, executar `yarn test:lab` com Node 24+ e verificar no navegador rajadas, capacidade cheia, falha, recuperação, reset, teclado e pausa fora da viewport.
- Antes de publicar mudanças no hero, executar `yarn build` e verificar o build de produção no navegador em 320, 390, 768 e 1440 px.
- Conferir nome, métricas, scroll, botão principal, resize e movimento reduzido. Verificar hidratação em UTC e America/Sao_Paulo.
- Build e health check do workflow não substituem verificação visual. A verificação atual usou Chromium com emulação mobile; desempenho em iPhone físico ainda depende de validação no aparelho.
