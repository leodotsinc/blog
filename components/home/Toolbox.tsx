"use client";

import { useState } from "react";
import { ArrowUpRight, Blocks, Braces, Cpu, Network, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./toolbox.module.css";

const shelves = [
  {
    id: "ai", label: "AI & agents", icon: Sparkles,
    title: "A second brain. A human in charge.",
    caption: "Tools and patterns for work you can inspect.",
    items: [
      { name: "Codex", detail: "Code → review → iterate", icon: Terminal },
      { name: "Claude / ChatGPT", detail: "Reasoning & exploration", icon: Sparkles },
      { name: "MCP / Retrieval", detail: "Tools & grounded context", icon: Network },
      { name: "Evals", detail: "Measure before trusting", icon: Cpu },
    ],
  },
  {
    id: "build", label: "Build", icon: Braces,
    title: "Choose the tool after the problem.",
    caption: "From a service boundary to the last pixel.",
    items: [
      { name: "Java / Spring", detail: "Services & domain logic", icon: Braces },
      { name: "Go / Python", detail: "Services & automation", icon: Terminal },
      { name: "TypeScript", detail: "Contracts across the stack", icon: Blocks },
      { name: "React / Next.js", detail: "Interfaces with intent", icon: Cpu },
    ],
  },
  {
    id: "operate", label: "Operate", icon: Network,
    title: "Production is part of the design.",
    caption: "Ship it. Observe it. Keep it understandable.",
    items: [
      { name: "Kubernetes", detail: "Workload orchestration", icon: Blocks },
      { name: "AWS / GCP", detail: "Cloud infrastructure", icon: Network },
      { name: "RabbitMQ", detail: "Asynchronous workloads", icon: Cpu },
      { name: "Splunk / Apigee", detail: "Visibility & API boundaries", icon: Terminal },
    ],
  },
] as const;

export default function Toolbox() {
  const [active, setActive] = useState(0);
  const shelf = shelves[active];
  return (
    <div id="toolbox" className={styles.toolbox}>
      <div className={styles.eyebrow}><span>The toolbox</span><span aria-hidden>↗</span></div>
      <div role="group" aria-label="Toolbox categories" className={styles.categories}>
        {shelves.map(({ id, label, icon: Icon }, index) => (
          <Button key={id} variant="ghost" size="sm" aria-pressed={active === index} onClick={() => setActive(index)}>
            <Icon aria-hidden />{label}
          </Button>
        ))}
      </div>
      <div className={styles.shelf} aria-live="polite" aria-atomic="true">
        <h3>{shelf.title}</h3><p>{shelf.caption}</p>
        <ul>{shelf.items.map(({ name, detail, icon: Icon }) => (
          <li key={name}><span className={styles.icon}><Icon aria-hidden size={17} /></span><span><strong>{name}</strong><small>{detail}</small></span></li>
        ))}</ul>
      </div>
      <a className={styles.link} href="#decision-room">See the thinking behind the tools <ArrowUpRight size={14} aria-hidden /></a>
    </div>
  );
}
