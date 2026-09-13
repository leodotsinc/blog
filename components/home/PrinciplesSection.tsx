import DecisionRoom from "./DecisionRoom";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

export default function PrinciplesSection() {
  return (
    <section id="approach" className="relative mx-auto w-full max-w-[73rem] scroll-mt-24 px-6 py-28 sm:px-9 xl:px-0">
      <Reveal><SectionLabel index="02">How I operate</SectionLabel></Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-6 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Good architecture starts with <span className="text-muted-foreground">a better question.</span>
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Same engineer. Different constraints. Take a seat, make a call, and explore what each decision asks of the system.</p>
      </Reveal>
      <DecisionRoom />
    </section>
  );
}
