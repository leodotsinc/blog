# Blog — plano atual

## Hero e desempenho

- Hero e métricas usam fluxo vertical; preservar o nome inteiro e métricas legíveis de 320 px a desktop.
- Mobile, ponteiro de toque, hardware com até quatro núcleos e movimento reduzido usam arte estática. WebGL fica restrito a desktop compatível, pausado fora da viewport e em abas ocultas.
- No modo estático, o texto não embaralha e o conteúdo não usa parallax nem fade no scroll. O relógio atualiza somente seu próprio componente.
- Datas de publicações usam UTC explicitamente para manter o HTML do servidor e do navegador idênticos.

## Validação

- Antes de publicar mudanças no hero, executar `yarn build` e verificar o build de produção no navegador em 320, 390, 768 e 1440 px.
- Conferir nome, métricas, scroll, botão principal, resize e movimento reduzido. Verificar hidratação em UTC e America/Sao_Paulo.
- Build e health check do workflow não substituem verificação visual. A verificação atual usou Chromium com emulação mobile; desempenho em iPhone físico ainda depende de validação no aparelho.
