import Link from "next/link";
import { ArrowUpRight, Boxes, Network, Workflow } from "lucide-react";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import styles from "./case-studies.module.css";

export type WorkItem = {
  slug: string;
  title: string;
  description: string;
  year: string;
  tags: string[];
  featured?: boolean;
};

function ArchitectureSketch({ distributed }: { distributed: boolean }) {
  return (
    <div className={styles.sketch} data-kind={distributed ? "services" : "modules"} role="img" aria-label={distributed ? "Architecture sketch: API gateway connects payment, account, and fraud services through an event backbone" : "Architecture sketch: an application shell composes independently deployed React, Vue, and Angular modules"}>
      <div className={styles.sketchLabel}>{distributed ? <Network /> : <Boxes />}<span>ARCHITECTURE SKETCH</span><span>{distributed ? "FIG. 01" : "FIG. 02"}</span></div>
      <div className={styles.entry}><i />{distributed ? "API gateway" : "Application shell"}<span>{distributed ? "APIGEE" : "MODULE FEDERATION"}</span></div>
      <div className={styles.trunk} />
      <div className={styles.services}>{(distributed ? ["Payments", "Accounts", "Fraud"] : ["React", "Vue", "Angular"]).map((name, i) => <div key={name}><span>0{i+1}</span><strong>{name}</strong><i /></div>)}</div>
      <div className={styles.foundation}><Workflow /><span>{distributed ? "Event backbone" : "Independent deployments"}</span><span>{distributed ? "ASYNC BY DESIGN" : "ONE SHELL · MANY TEAMS"}</span></div>
    </div>
  );
}

export default function WorkSection({ items }: { items: WorkItem[] }) {
  return (
    <section id="work" className="relative mx-auto w-full max-w-[73rem] scroll-mt-24 px-6 py-24 sm:px-9 xl:px-0">
      <Reveal><SectionLabel index="04">Selected work</SectionLabel></Reveal>
      <Reveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Behind the interface.<br /><span className="text-muted-foreground">Under real constraints.</span></h2>
          <Link href="/projects" className={styles.allProjects}>All projects <ArrowUpRight /></Link>
        </div>
      </Reveal>
      <div className={styles.grid}>
        {items.map((item, index) => (
          <Reveal key={item.slug} delay={index * 0.06}>
            <Link href={`/projects/${item.slug}`} className={styles.card}>
              <ArchitectureSketch distributed={item.slug === "cloud-native-microservices"} />
              <div className={styles.body}>
                <div className={styles.meta}><span>{String(index + 1).padStart(2, "0")} / {item.slug === "cloud-native-microservices" ? "DISTRIBUTED SYSTEMS" : "FRONTEND ARCHITECTURE"}</span><span>{item.year}</span></div>
                <h3>{item.title}</h3><p>{item.description}</p>
                <div className={styles.tags}>{item.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
                <div className={styles.read}><span>Explore the architecture</span><ArrowUpRight /></div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
