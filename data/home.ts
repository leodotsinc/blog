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
    "Backend Engineer",
    "Cloud Native Nerd",
    "AI Tinkerer",
  ],
  current: { role: "Tech Lead", company: "Getnet (Santander)" },
  lede:
    "I've written software for air traffic control and financial rails — the kind that is not allowed to fall over. Today I lead a squad at Getnet, Santander's payments arm, building platform services on Kubernetes and wiring AI into the parts that actually deserve it.",
} as const;

export const impact = [
  { value: "2017", label: "shipping since", hint: "First production commit" },
  { value: "99.9%", label: "uptime", hint: "Cloud-native payments platform" },
  { value: "40%", label: "faster incident response", hint: "Splunk + Apigee observability" },
  { value: "30%", label: "less dev time", hint: "Micro-frontend architecture" },
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
