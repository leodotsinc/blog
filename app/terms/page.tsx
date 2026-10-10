import Link from "next/link";

import LegalPage from "@/components/legal/LegalPage";
import { legal } from "@/data/legal";

export const metadata = {
  title: "Termos de Uso — n8n email",
  description:
    "Termos de uso do aplicativo pessoal n8n email, operado por Leonardo Torres. Terms of use for the personal app n8n email.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      titlePt="Termos de Uso — n8n email"
      summaryTitle="Summary (English)"
      summary={
        <>
          <p>
            <strong>{legal.appName}</strong> is a personal-use app operated by{" "}
            {legal.operator} and is not offered to anyone else. These terms may
            change; the date above is the latest version. Contact:{" "}
            <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
            See also the <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </>
      }
    >
      <p>
        Estes termos se aplicam ao aplicativo pessoal{" "}
        <strong>{legal.appName}</strong>, operado por {legal.operator}. Contato:{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
      </p>

      <h2>Uso pessoal</h2>
      <p>
        O aplicativo é de uso pessoal do proprietário e não é oferecido a mais
        ninguém.
      </p>

      <h2>Alterações</h2>
      <p>
        Estes termos podem mudar. A data de última atualização, no topo da
        página, indica a versão vigente.
      </p>

      <h2>Privacidade</h2>
      <p>
        O tratamento de informações está descrito na{" "}
        <Link href="/privacy">Política de Privacidade</Link>.
      </p>
    </LegalPage>
  );
}
