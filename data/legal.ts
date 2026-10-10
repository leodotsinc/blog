export const legal = {
  appName: "n8n email",
  operator: "Leonardo Torres",
  contactEmail: "leonardo@leodots.com",
  lastUpdated: "2026-10-10",
  lastUpdatedPt: "10 de outubro de 2026",
  lastUpdatedEn: "October 10, 2026",
  gmailScope: "https://www.googleapis.com/auth/gmail.readonly",
  revokeUrl: "https://myaccount.google.com/permissions",
  googlePolicyUrl:
    "https://developers.google.com/terms/api-services-user-data-policy",
  // Google verification looks for this sentence; keep the wording exact.
  limitedUse: {
    en: {
      before:
        "n8n email's use and transfer of information received from Google APIs to any other app will adhere to the ",
      linkText: "Google API Services User Data Policy",
      after: ", including the Limited Use requirements.",
    },
    pt: {
      before:
        "O uso e a transferência, para qualquer outro aplicativo, das informações recebidas das APIs do Google seguirão a ",
      linkText:
        "Política de Dados de Usuário dos Serviços de API do Google (Google API Services User Data Policy)",
      after: ", incluindo os requisitos de Uso Limitado (Limited Use).",
    },
  },
  analytics: {
    host: "umami.leodots.dev",
  },
};
