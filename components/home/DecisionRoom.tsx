"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Check, GitBranch, Layers, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { architectureDecisions } from "@/data/architecture-decisions";
import styles from "./decision-room.module.css";

export default function DecisionRoom() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const scenario = architectureDecisions[scenarioIndex];
  const decision = scenario.options[optionIndex];

  return (
    <div id="decision-room" className={styles.room}>
      <div className={styles.masthead}>
        <span><GitBranch size={15} aria-hidden /> Architecture decision room</span>
        <span>CONTEXT CHANGES THE ANSWER</span>
      </div>
      <div className={styles.scenarios} role="group" aria-label="Architecture scenarios">
        {architectureDecisions.map((item, index) => (
          <Button key={item.id} variant="ghost" aria-pressed={scenarioIndex === index}
            onClick={() => { setScenarioIndex(index); setOptionIndex(0); }}>
            {item.label}<ArrowUpRight size={14} aria-hidden />
          </Button>
        ))}
      </div>
      <div className={styles.workspace}>
        <div className={styles.brief}>
          <p className={styles.overline}>The brief / {scenario.id}</p>
          <h3>{scenario.title}</h3>
          <p className={styles.context}>{scenario.context}</p>
          <p className={styles.constraint}><span aria-hidden /><span>{scenario.constraint}</span></p>
          <fieldset className={styles.choices}>
            <legend>{scenario.question}</legend>
            {scenario.options.map((option, index) => (
              <Button key={option.id} variant="outline" aria-pressed={optionIndex === index}
                onClick={() => setOptionIndex(index)}>
                <span className={styles.radio} aria-hidden>{optionIndex === index ? <Check size={12} /> : null}</span>
                <span>{option.label}</span><MoveRight size={15} aria-hidden />
              </Button>
            ))}
          </fieldset>
          <p className={styles.hint}>Choose a path. Inspect what you gain — and what you take on.</p>
        </div>
        <div className={styles.result} aria-live="polite" aria-atomic="true">
          <div className={styles.resultHeading}><span><Layers size={14} aria-hidden /> {decision.tag}</span><span aria-hidden>ADR / 0{scenarioIndex + 1}</span></div>
          <h4>{decision.title}</h4>
          <div className={styles.blueprint} role="img" aria-label={`${decision.nodes.join(" → ")}. ${decision.boundary}`}>
            <div className={styles.nodes} aria-hidden>
              {decision.nodes.map((node, index) => (
                <div key={node} className={styles.nodeGroup}>
                  <div className={styles.node}><span>0{index + 1}</span><strong>{node}</strong></div>
                  {index < decision.nodes.length - 1 ? <ArrowDown className={styles.connector} size={17} /> : null}
                </div>
              ))}
            </div>
            <p aria-hidden>{decision.boundary}</p>
          </div>
          <dl className={styles.tradeoffs}>
            <div><dt><span className={styles.gainDot} />You gain</dt><dd>{decision.gain}</dd></div>
            <div><dt><span className={styles.costDot} />You take on</dt><dd>{decision.cost}</dd></div>
            <div><dt><GitBranch size={12} aria-hidden />Revisit when</dt><dd>{decision.revisit}</dd></div>
          </dl>
        </div>
      </div>
      <div className={styles.footer}><span>Illustrative scenarios. Every choice carries a cost.</span><a href="#architecture-lab">Put a design under pressure <ArrowUpRight size={14} aria-hidden /></a></div>
    </div>
  );
}
