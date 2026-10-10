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
            {legal.operator}. It reads email through the Gmail read-only scope (
            <code>{legal.gmailScope}</code>) only for the owner&apos;s own
            mailboxes, to classify message importance (triage of the
            owner&apos;s own mail).
          </p>
          <p>
            It does not sell or share data. Data stays on the owner&apos;s
            private server. Third-party processing is limited to a
            classification service chosen by the owner. No data from other
            users is collected: the app is not offered to others.
          </p>
          <p>
            To revoke access, go to{" "}
            <a href={legal.revokeUrl}>myaccount.google.com/permissions</a>; the
            owner will delete stored data on request. Contact:{" "}
            <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
          </p>
          <p>
            The use of information received from Google APIs adheres to the{" "}
            <a href={legal.googlePolicyUrl}>
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </>
      }
    >
      <p>
        Esta política descreve como o aplicativo pessoal{" "}
        <strong>{legal.appName}</strong> trata informações. O aplicativo é de
        uso pessoal e é operado por {legal.operator}. Contato:{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
      </p>

      <h2>O que o aplicativo acessa e para quê</h2>
      <p>
        O aplicativo lê e-mails pelo escopo somente leitura do Gmail,{" "}
        <code>{legal.gmailScope}</code>, apenas nas caixas de entrada do próprio
        proprietário. O objetivo é classificar a importância das mensagens, ou
        seja, fazer a triagem do e-mail do próprio proprietário.
      </p>

      <h2>Onde os dados ficam</h2>
      <p>Os dados ficam no servidor privado do proprietário.</p>

      <h2>Venda e compartilhamento</h2>
      <p>
        O aplicativo não vende nem compartilha dados. O processamento por
        terceiros se limita a um serviço de classificação escolhido pelo
        proprietário.
      </p>

      <h2>Dados de outras pessoas</h2>
      <p>
        O aplicativo não coleta dados de outros usuários: ele não é oferecido a
        terceiros e serve apenas às caixas de entrada do proprietário.
      </p>

      <h2>Revogação de acesso e exclusão de dados</h2>
      <p>
        Para revogar o acesso, use{" "}
        <a href={legal.revokeUrl}>myaccount.google.com/permissions</a>. O
        proprietário apaga os dados armazenados mediante solicitação, pelo
        e-mail <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>
        .
      </p>

      <h2>Política de dados de usuário dos serviços de API do Google</h2>
      <p>
        O uso das informações recebidas das APIs do Google segue a{" "}
        <a href={legal.googlePolicyUrl}>
          Política de Dados de Usuário dos Serviços de API do Google
        </a>{" "}
        (Google API Services User Data Policy), incluindo os requisitos de Uso
        Limitado (Limited Use).
      </p>

      <h2>Termos</h2>
      <p>
        Veja também os <Link href="/terms">Termos de Uso</Link>.
      </p>
    </LegalPage>
  );
}
