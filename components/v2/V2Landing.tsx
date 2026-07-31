"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  DatabaseZap,
  Headphones,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import styles from "./v2.module.css";

const primaryHref = "https://aiassistente.com.br";

const heroMessages = [
  { side: "client", text: "Oi! Vocês atendem convênio e particular?", time: "09:41" },
  { side: "ai", text: "Atendemos particular. Posso consultar horários e já deixar sua avaliação agendada.", time: "09:41" },
  { side: "client", text: "Quero falar com alguém antes de marcar.", time: "09:42" },
  { side: "human", text: "Claro — sou a Marina. Assumi a conversa e posso te ajudar por aqui.", time: "09:42" },
];

const proofItems = [
  "Atendimento 24/7",
  "Transferência com contexto",
  "Agenda integrada",
  "Base de conhecimento",
  "Captura de leads",
  "Pronto para LGPD",
];

const features = [
  {
    icon: BrainCircuit,
    eyebrow: "Conhecimento que trabalha",
    title: "Sua base vira atendimento",
    text: "Conecte documentos, páginas e respostas do seu negócio. O assistente consulta a fonte certa antes de responder.",
    className: styles.featureKnowledge,
  },
  {
    icon: Headphones,
    eyebrow: "Handoff inteligente",
    title: "A IA sabe a hora de chamar gente",
    text: "Regras, intenção ou pedido do cliente acionam sua equipe — com todo o histórico, sem fazer ninguém repetir o caso.",
    className: styles.featureHandoff,
  },
  {
    icon: CalendarCheck,
    eyebrow: "Da conversa à agenda",
    title: "Horários preenchidos enquanto você dorme",
    text: "Consulte disponibilidade, colete os dados necessários e avance para o agendamento dentro do atendimento.",
    className: styles.featureAgenda,
  },
  {
    icon: Users,
    eyebrow: "Pipeline sempre ativo",
    title: "Capture e qualifique leads",
    text: "Transforme cada conversa em contexto comercial organizado para o próximo passo do seu time.",
    className: styles.featureLeads,
  },
  {
    icon: DatabaseZap,
    eyebrow: "Operação pronta para crescer",
    title: "Multi-tenant por arquitetura",
    text: "Dados, configurações e conhecimento separados por operação para escalar com controle.",
    className: styles.featureMulti,
  },
];

const steps = [
  ["01", "Conecte", "Adicione sua base, agenda e regras de atendimento."],
  ["02", "Personalize", "Defina tom de voz, limites e quando transferir."],
  ["03", "Atenda", "Publique, acompanhe e melhore com conversas reais."],
];

const testimonials = [
  {
    quote: "A equipe chega na conversa sabendo o que o cliente precisa. O atendimento começa do ponto certo, não do zero.",
    role: "Liderança de atendimento",
    segment: "Clínicas e serviços",
  },
  {
    quote: "As perguntas repetitivas ficam com a IA, mas casos sensíveis continuam com as pessoas certas do time.",
    role: "Operações",
    segment: "Negócios digitais",
  },
  {
    quote: "O lead não precisa esperar o horário comercial para tirar dúvidas e avançar para um agendamento.",
    role: "Comercial",
    segment: "Serviços profissionais",
  },
];

const plans = [
  {
    name: "Essencial",
    label: "Para começar",
    description: "Uma operação enxuta com atendimento inteligente e base própria.",
    items: ["Assistente com base de conhecimento", "Captura de leads", "Painel self-service"],
  },
  {
    name: "Pro",
    label: "Mais escolhido",
    description: "Para equipes que precisam unir automação, agenda e atendimento humano.",
    items: ["Tudo do Essencial", "Handoff para equipe", "Agenda e fluxos avançados", "Mais volume e integrações"],
    featured: true,
  },
  {
    name: "Scale",
    label: "Para escalar",
    description: "Múltiplas operações, governança e necessidades de maior volume.",
    items: ["Tudo do Pro", "Estrutura multi-tenant", "Controles e suporte prioritário"],
  },
];

const faqs = [
  ["A IA responde usando informações do meu negócio?", "Sim. Você conecta a base de conhecimento da empresa e define as orientações do assistente. Assim, ele responde com contexto próprio, em vez de improvisar respostas genéricas."],
  ["Quando a conversa passa para uma pessoa?", "Você define os gatilhos: solicitação explícita, tema sensível, baixa confiança ou regras específicas. A equipe recebe o histórico e continua do ponto em que a IA parou."],
  ["É possível capturar leads e agendar horários?", "Sim. O assistente pode coletar dados, qualificar interesse e conduzir o cliente ao agendamento durante a própria conversa."],
  ["Como funciona a segurança e a LGPD?", "A solução foi desenhada com isolamento entre operações, controle de acesso e práticas de proteção de dados. Os detalhes aplicáveis ao seu caso podem ser avaliados na configuração."],
  ["Preciso falar com vendas para começar?", "Não necessariamente. Há uma jornada self-service para escolher o plano, configurar a operação e publicar o assistente. Se precisar, nosso time ajuda nos cenários mais avançados."],
];

function Logo() {
  return (
    <Link href="/v2" className={styles.logo} aria-label="AI Assistente — início">
      <span className={styles.logoMark}><Sparkles size={17} /></span>
      <span>ai<span>assistente</span></span>
    </Link>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label="Alternar tema"
      onClick={() => mounted && setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function ChatWindow({ detailed = false }: { detailed?: boolean }) {
  const [visible, setVisible] = useState(detailed ? 4 : 1);

  useEffect(() => {
    if (detailed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setVisible(1);
      [1250, 2800, 4300].forEach((delay, index) => timers.push(setTimeout(() => setVisible(index + 2), delay)));
      timers.push(setTimeout(run, 8500));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [detailed]);

  return (
    <div className={`${styles.chatWindow} ${detailed ? styles.chatDetailed : ""}`}>
      <div className={styles.chatTop}>
        <div className={styles.avatar}><Bot size={19} /></div>
        <div><strong>Assistente da clínica</strong><span><i /> Online agora</span></div>
        <div className={styles.chatSecure}><LockKeyhole size={13} /> Seguro</div>
      </div>
      <div className={styles.chatBody}>
        <div className={styles.chatDate}>Hoje</div>
        {heroMessages.slice(0, visible).map((message, index) => (
          <div key={`${message.time}-${index}`} className={`${styles.messageRow} ${message.side === "client" ? styles.messageClient : ""}`}>
            {message.side !== "client" && <span className={`${styles.miniAvatar} ${message.side === "human" ? styles.humanAvatar : ""}`}>{message.side === "human" ? "M" : <Sparkles size={12} />}</span>}
            <div className={`${styles.bubble} ${styles[`bubble${message.side[0].toUpperCase()}${message.side.slice(1)}`]}`}>
              {message.side === "human" && <b>Marina • Humano</b>}
              <p>{message.text}</p><time>{message.time} ✓✓</time>
            </div>
          </div>
        ))}
        {!detailed && visible < 4 && <div className={styles.typing}><span /><span /><span /></div>}
        {detailed && (
          <div className={styles.handoffNotice}><Zap size={14} /> Conversa transferida em 8 segundos • contexto preservado</div>
        )}
      </div>
      <div className={styles.chatInput}><span>Digite uma mensagem...</span><button aria-label="Enviar mensagem"><Send size={17} /></button></div>
    </div>
  );
}

export default function V2Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div id="v2-page" className={styles.v2Page}>
      <div className={styles.aurora} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Navegação principal">
          <Logo />
          <div className={styles.navLinks}>
            <a href="#produto">Produto</a><a href="#como-funciona">Como funciona</a><a href="#seguranca">Segurança</a><a href="#planos">Planos</a>
          </div>
          <div className={styles.navActions}>
            <ThemeButton />
            <a href={primaryHref} className={styles.navCta}>Começar agora <ArrowRight size={15} /></a>
            <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
          {menuOpen && <div className={styles.mobileMenu}><a href="#produto" onClick={() => setMenuOpen(false)}>Produto</a><a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a><a href="#seguranca" onClick={() => setMenuOpen(false)}>Segurança</a><a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a><a href={primaryHref}>Começar agora</a></div>}
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span>Atendimento inteligente. Presença humana.</span></div>
            <h1>Conversa que resolve.<br /><em>Gente quando importa.</em></h1>
            <p className={styles.heroLead}>Transforme seu conhecimento em atendimento 24 horas, capture oportunidades e transfira cada conversa para uma pessoa — com contexto — no momento certo.</p>
            <div className={styles.heroActions}>
              <a href={primaryHref} className={styles.primaryButton}>Criar meu assistente <ArrowRight size={18} /></a>
              <a href="#demo" className={styles.secondaryButton}><MessageCircleMore size={18} /> Ver conversa ao vivo</a>
            </div>
            <div className={styles.heroFine}><span><Check size={14} /> Configuração self-service</span><span><Check size={14} /> Sem cartão para conhecer</span></div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.orbitLabel}><span><Clock3 size={14} /> IA atende 24/7</span></div>
            <ChatWindow />
            <div className={styles.floatCard}><span><Users size={17} /></span><div><b>Handoff concluído</b><small>Marina assumiu com contexto</small></div><Check size={16} /></div>
          </div>
        </section>

        <section className={styles.proof} aria-label="Benefícios da plataforma">
          <p>Uma operação contínua, do primeiro “oi” à resolução</p>
          <div className={styles.marquee}><div>{[...proofItems, ...proofItems].map((item, index) => <span key={`${item}-${index}`}><Sparkles size={13} /> {item}</span>)}</div></div>
        </section>

        <section className={`${styles.section} ${styles.demoSection}`} id="demo">
          <div className={styles.sectionIntro}>
            <span className={styles.kicker}>IA + equipe, na mesma conversa</span>
            <h2>Automatize o volume.<br /><em>Preserve o cuidado.</em></h2>
            <p>O assistente resolve o que já conhece. Quando a conversa exige julgamento, empatia ou decisão, sua equipe entra sem perder nenhum detalhe.</p>
          </div>
          <div className={styles.demoGrid}>
            <ChatWindow detailed />
            <div className={styles.demoTimeline}>
              <div><span>01</span><p><b>A IA entende e responde</b>Consulta sua base, coleta dados e conduz o próximo passo.</p></div>
              <div><span>02</span><p><b>O gatilho é identificado</b>Intenção sensível, dúvida fora de escopo ou pedido para falar com alguém.</p></div>
              <div><span>03</span><p><b>Uma pessoa assume com contexto</b>Histórico, dados e motivo da transferência chegam juntos.</p></div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.featuresSection}`} id="produto">
          <div className={styles.sectionIntroRow}><div><span className={styles.kicker}>Produto completo</span><h2>Mais que um chatbot.<br /><em>Uma operação de atendimento.</em></h2></div><p>Conhecimento, automação e pessoas conectados para atender melhor e avançar cada oportunidade.</p></div>
          <div className={styles.bento}>
            {features.map(({ icon: Icon, title, text, eyebrow, className }) => (
              <article className={`${styles.featureCard} ${className}`} key={title}>
                <div className={styles.featureIcon}><Icon size={21} /></div><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p>
                <div className={styles.featureDecoration} aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.stepsSection}`} id="como-funciona">
          <div className={styles.sectionIntro}><span className={styles.kicker}>Do zero ao atendimento</span><h2>Comece simples.<br /><em>Evolua com as conversas.</em></h2></div>
          <div className={styles.steps}>{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowRight size={20} /></article>)}</div>
        </section>

        <section className={styles.security} id="seguranca">
          <div className={styles.securityGlow} />
          <div className={styles.securityIcon}><ShieldCheck size={32} /></div>
          <div><span className={styles.kicker}>Segurança desde a base</span><h2>Confiança para o cliente.<br />Controle para sua operação.</h2></div>
          <p>Isolamento multi-tenant, controles de acesso e práticas alinhadas à LGPD para proteger dados e separar cada operação.</p>
          <div className={styles.securityTags}><span><LockKeyhole size={15} /> Dados protegidos</span><span><DatabaseZap size={15} /> Isolamento por tenant</span><span><ShieldCheck size={15} /> Pronto para LGPD</span></div>
        </section>

        <section className={`${styles.section} ${styles.testimonialsSection}`}>
          <div className={styles.sectionIntroRow}><div><span className={styles.kicker}>O impacto na rotina</span><h2>Menos repetição.<br /><em>Mais resolução.</em></h2></div><p>O valor aparece quando a tecnologia deixa a equipe focar no que realmente pede atenção humana.</p></div>
          <div className={styles.testimonials}>{testimonials.map((item) => <figure key={item.role}><MessageCircleMore size={21} /><blockquote>“{item.quote}”</blockquote><figcaption><span>{item.role}</span><small>{item.segment}</small></figcaption></figure>)}</div>
        </section>

        <section className={`${styles.section} ${styles.pricingSection}`} id="planos">
          <div className={styles.sectionIntro}><span className={styles.kicker}>Planos para o seu momento</span><h2>Comece por conta própria.<br /><em>Escale sem trocar de plataforma.</em></h2><p>Escolha o formato ideal, configure online e evolua conforme sua operação ganha volume.</p></div>
          <div className={styles.pricingGrid}>{plans.map((plan) => <article key={plan.name} className={plan.featured ? styles.planFeatured : ""}><span className={styles.planLabel}>{plan.label}</span><h3>{plan.name}</h3><p>{plan.description}</p><div className={styles.planPrice}>Planos flexíveis<small>preço conforme uso e recursos</small></div><ul>{plan.items.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul><a href={primaryHref}>{plan.featured ? "Começar agora" : "Conhecer plano"}<ArrowRight size={16} /></a></article>)}</div>
          <p className={styles.pricingNote}>Sem contratos confusos. Veja valores e condições atuais diretamente na plataforma.</p>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} id="faq">
          <div><span className={styles.kicker}>Dúvidas frequentes</span><h2>Antes de começar,<br /><em>vale saber.</em></h2><p>Não encontrou sua resposta? Fale com a gente e veja como a AI Assistente se encaixa na sua operação.</p><a href={primaryHref} className={styles.textLink}>Falar com o time <ArrowRight size={16} /></a></div>
          <div className={styles.faqList}>{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.ctaAurora} />
          <span className={styles.kicker}>Seu próximo atendimento pode ser melhor</span>
          <h2>A IA abre a conversa.<br /><em>Seu time cria a relação.</em></h2>
          <p>Coloque seu conhecimento para atender, seus leads para avançar e sua equipe para entrar quando realmente faz diferença.</p>
          <div className={styles.heroActions}><a href={primaryHref} className={styles.primaryButton}>Criar meu assistente <ArrowRight size={18} /></a><a href="#demo" className={styles.secondaryButton}>Rever demonstração</a></div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><Logo /><p>Atendimento inteligente, com toque humano.</p></div>
        <div><b>Produto</b><a href="#produto">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a></div>
        <div><b>Confiança</b><a href="#seguranca">Segurança e LGPD</a><a href="#faq">Perguntas frequentes</a></div>
        <div><b>Começar</b><a href={primaryHref}>Criar conta</a><a href={primaryHref}>Falar com o time</a></div>
        <small>© {new Date().getFullYear()} aiassistente.com.br. Todos os direitos reservados.</small>
      </footer>
    </div>
  );
}
