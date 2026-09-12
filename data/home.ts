/**
 * Content for the homepage. Everything narrative lives here so the
 * components stay dumb and the copy is easy to tweak.
 *
 * Career facts mirror data/resume/default.mdx — keep them in sync.
 */

export const hero = {
  name: "Leonardo Torres",
  location: "São Paulo, Brazil",
  timezone: "America/Sao_Paulo",
  /** Cycled through with a scramble effect under the name. */
  roles: [
    "Tech Lead",
    "Solutions Architect",
    "Distributed Systems",
    "Platform & Cloud",
    "Engineering Mentor",
  ],
  current: { role: "Tech Lead", company: "Getnet (Santander)" },
  lede:
    "From air traffic control to payment rails. I design the architecture, lead the team, and make the hard parts hold together.",
} as const;

export const impact = [
  { value: "9+", label: "years in production", hint: "Shipping since 2017" },
  {
    value: "2",
    label: "regulated domains",
    hint: "Aviation safety systems and payment rails",
  },
  { value: "99.9%", label: "platform uptime", hint: "Cloud-native payments platform" },
  {
    value: "40%",
    label: "faster incident response",
    hint: "Observability with Splunk and Apigee",
  },
] as const;

/**
 * What the page leads with. Frameworks come and go; this is the part that
 * survives a stack migration — and the part hiring teams actually read.
 */
export const principles = [
  {
    title: "Architecture before frameworks",
    body:
      "I design for the decisions that are expensive to reverse: service boundaries, data ownership, failure modes. The language is an implementation detail — postgraduate in Solutions Architecture, and it shows in how I scope a system before a line is written.",
    proof: "Postgraduate, Solutions Architecture · PUC",
  },
  {
    title: "Systems that are not allowed to fail",
    body:
      "Air traffic control at Embraer, then payment rails. Both are domains where a bug is not a ticket. That shaped how I treat correctness, observability and incident response — measurable in a 40% cut to response time and 99.9% uptime on a platform moving millions of transactions.",
    proof: "Aviation + payments · 99.9% uptime",
  },
  {
    title: "Leading a squad, not just a backlog",
    body:
      "As tech lead I own the technical direction: architecture calls, code review standards, delivery roadmap, and the engineers growing inside it. The job is making good decisions cheap to make and bad ones cheap to undo.",
    proof: "Tech Lead · Getnet (Santander)",
  },
  {
    title: "AI where it earns its keep",
    body:
      "I ship AI into processes with a real cost attached — automation and decision support inside a payments platform — not demos. Knowing where it does not belong is most of the value.",
    proof: "AI-driven initiatives since 2023",
  },
] as const;

export const stack = [
  "Java",
  "Spring Boot",
  "Python",
  "Go",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Kubernetes",
  "Docker",
  "AWS",
  "GCP",
  "SQL",
  "RabbitMQ",
  "Microservices",
  "Apigee",
  "Splunk",
  "Clean Architecture",
] as const;

export type TimelineEntry = {
  period: string;
  role: string;
  company: string;
  place: string;
  blurb: string;
  tech: string[];
};

export const timeline: TimelineEntry[] = [
  {
    period: "2025 — now",
    role: "Tech Lead",
    company: "Getnet · Santander",
    place: "São Paulo, BR",
    blurb:
      "Leading a squad across Santander's payment platform: high-volume transaction services in Java (Spring Boot and Quarkus) and Python on Kubernetes, an Angular front end, and AI woven into the processes that earn it.",
    tech: ["Java", "Quarkus", "Spring Boot", "Python", "Angular", "Kubernetes", "AWS"],
  },
  {
    period: "2023 — 2025",
    role: "Senior Software Engineer",
    company: "Fiserv",
    place: "São Paulo, BR",
    blurb:
      "Enterprise applications on Java, Python and Spring Boot orchestrated with Kubernetes, plus the AI-driven projects that automated the processes nobody enjoyed.",
    tech: ["Java", "Python", "Kubernetes", "AWS", "GCP", "Splunk"],
  },
  {
    period: "2022 — 2023",
    role: "Senior Software Engineer",
    company: "Iteris",
    place: "Remote",
    blurb:
      "Consulting for Fiserv: scalable backend services with a stubborn commitment to clean code and database schemas that stay fast under load.",
    tech: ["Java", "Spring Boot", "SQL", "REST"],
  },
  {
    period: "2018 — 2022",
    role: "Software Engineer",
    company: "Embraer",
    place: "São Paulo, BR",
    blurb:
      "Mission-critical air traffic control software. Microservices with Spring Boot, containerised with Docker, in an environment where a bug is not a ticket.",
    tech: ["Java", "C#", "Spring", "Docker", "Microservices"],
  },
  {
    period: "2017 — 2018",
    role: "Software Development Intern",
    company: "Calvin Klein",
    place: "São Paulo, BR",
    blurb:
      "Internal enterprise systems in Java and SQL — where I learned that production is a place with real people in it.",
    tech: ["Java", "SQL"],
  },
];

export const education = [
  {
    degree: "Postgraduate — Solutions Architecture",
    school: "Pontifical Catholic University",
    period: "2023 — 2024",
  },
  {
    degree: "BSc — Information Systems",
    school: "Mackenzie University",
    period: "2017 — 2020",
  },
] as const;

export const facts = [
  "Fluent in English, native Portuguese, advanced Spanish",
  "Postgraduate in Solutions Architecture",
  "Currently deep in Go and AWS certifications",
  "Movies and music keep the compiler warm",
] as const;
