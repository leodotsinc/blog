import Link from "next/link";

import LegalPage from "@/components/legal/LegalPage";
import { legal } from "@/data/legal";

export const metadata = {
  title: "Política de Privacidade — n8n email",
  description:
    "Política de privacidade do aplicativo pessoal n8n email, operado por Leonardo Torres. Privacy policy for the personal app n8n email.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      titlePt="Política de Privacidade — n8n email"
      summaryTitle="Summary (English)"
      summary={
        <>
          <p>
            <strong>{legal.appName}</strong> is a personal-use app operated by{" "}
            {legal.operator}. Contact:{" "}
            <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
            It uses the Gmail read-only scope (<code>{legal.gmailScope}</code>)
            only for the owner&apos;s own mailboxes, to classify message
            importance. It handles no other people&apos;s data.
          </p>
          <p>
            It does not sell data. Stored data stays on the owner&apos;s
            private server. The only transfer off that server is to a
            classification service the owner chose, and only to classify the
            owner&apos;s own mail. That service may not use the data for
            advertising or to develop, improve, or train generalized AI or
            machine-learning models. No human reads this data except where
            Google&apos;s Limited Use rules allow it (the owner&apos;s own
            access, security, or a legal requirement).
          </p>
          <p>
            Copies kept for classification remain until the owner deletes them.
            To ask for deletion, email{" "}
            <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
            To revoke access, go to{" "}
            <a href={legal.revokeUrl}>{legal.revokeUrl}</a>.
          </p>
          <p>
            {legal.limitedUse.en.before}
            <a href={legal.googlePolicyUrl}>{legal.limitedUse.en.linkText}</a>
            {legal.limitedUse.en.after}
          </p>
          <p>
            This policy covers the {legal.appName} app. This site also uses the
            Umami analytics script served from {legal.analytics.host} to
            measure visits to its pages; it is separate from the app and has no
            access to Gmail data.
          </p>
        </>
      }
    >
      <p>
        Esta política descreve o aplicativo pessoal{" "}
        <strong>{legal.appName}</strong>, de uso pessoal, operado por{" "}
        {legal.operator}. Contato:{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
      </p>

      <h2>O que o aplicativo acessa e para quê</h2>
      <p>
        O aplicativo usa o escopo somente leitura do Gmail,{" "}
        <code>{legal.gmailScope}</code>, apenas nas caixas de entrada do próprio
        proprietário, para classificar a importância das mensagens. Ele não
        trata dados de outras pessoas.
      </p>

      <h2>Onde os dados ficam e com quem são tratados</h2>
      <p>
        O aplicativo não vende dados. Os dados armazenados ficam no servidor
        privado do proprietário. A única transferência para fora desse servidor
        é para um serviço de classificação escolhido pelo proprietário, e
        somente para classificar o e-mail do próprio proprietário. Esse serviço
        não pode usar os dados para publicidade nem para desenvolver, melhorar
        ou treinar modelos generalizados de IA ou aprendizado de máquina.
        Nenhuma pessoa lê esses dados, exceto nos casos permitidos pelas regras
        de Uso Limitado do Google (acesso do próprio proprietário, segurança ou
        exigência legal).
      </p>

      <h2>Por quanto tempo os dados ficam e como apagá-los</h2>
      <p>
        As cópias guardadas para classificação permanecem até o proprietário
        apagá-las. Para pedir a exclusão, escreva para{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>. Para
        revogar o acesso, use <a href={legal.revokeUrl}>{legal.revokeUrl}</a>.
      </p>

      <h2>Política de dados de usuário dos serviços de API do Google</h2>
      <p>
        {legal.limitedUse.pt.before}
        <a href={legal.googlePolicyUrl}>{legal.limitedUse.pt.linkText}</a>
        {legal.limitedUse.pt.after}
      </p>

      <h2>Este site</h2>
      <p>
        Esta política cobre o aplicativo {legal.appName}. Este site também usa o
        script de estatísticas Umami, servido de {legal.analytics.host}, para
        medir as visitas às suas páginas; ele é separado do aplicativo e não
        tem acesso aos dados do Gmail.
      </p>

      <h2>Termos</h2>
      <p>
        Veja também os <Link href="/terms">Termos de Uso</Link>.
      </p>
    </LegalPage>
  );
}
