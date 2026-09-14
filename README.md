This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This project uses [Yarn](https://yarnpkg.com/) as the package manager.

**1. Install dependencies:**

```bash
yarn install   
```

**2. Run the development server:**

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Contrato de releases — preparação D2

A CI própria valida PRs e pushes em `main`. O Deploy seleciona o SHA atual com CI aprovada, calcula SemVer a partir da última release verificada, constrói uma única imagem, qualifica essa imagem isoladamente e publica seu digest. O rollout usa apenas esse digest, preserva o `.env`, confere readiness e a identidade de versão/commit/build e só então publica tag e manifesto no GitHub.

`workflow_dispatch` começa com `prepare_only: true`: publica o artefato de build sem acessar produção. A ativação exige o bootstrap do helper dedicado e credencial SSH restrita, documentados no repo privado de infraestrutura; a presença deste código não significa que foram aplicados. Não usar o deploy compartilhado antigo como fallback. A produção precisa fornecer `BLOG_DEPLOY_KEY` e `BLOG_SSH_KNOWN_HOSTS` como secrets e `VPS_IP`, `SSH_PORT`, `DEPLOY_USER` como variables. Nunca usar `ssh-keyscan` no rollout para confiar automaticamente numa host key.

`GET /api/health` retorna somente status; `GET /api/version` retorna somente SemVer, commit completo e build ID com `Cache-Control: no-store`. As credenciais Spotify ficam exclusivamente no `.env` de produção. Qualificação de imagem e health não certificam a experiência visual, o provedor Spotify ou recuperação de desastre.

O legado `scripts/sync-spotify-env.sh` foi desativado e sempre recusa a sincronização; a rotação de credenciais de produção aguarda uma rotina de manutenção controlada no `vps-bootstrap`, enquanto `scripts/spotify-refresh-token.mjs` continua disponível para obter o refresh token.

Validação local do contrato: `node --test scripts/release-metadata.test.mjs` e `python3 -m unittest discover -s scripts -p 'test_release*.py'`. O build continua `yarn build`; o lint legado mantém a limitação registrada no AGENTS.
