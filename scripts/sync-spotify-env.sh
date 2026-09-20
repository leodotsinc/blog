#!/usr/bin/env bash
# Retired: production credentials must follow controlled Blog maintenance.

builtin printf '%s\n' \
  'Desativado: sync-spotify-env.sh não altera mais credenciais nem recria o Blog.' \
  'A rotação de produção aguarda manutenção controlada no repositório cloudbox-infra.' \
  'spotify-refresh-token.mjs continua disponível para obter o refresh token.' >&2
exit 1
