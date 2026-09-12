"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Database, Layers3, Radio, RotateCcw, Server, Unplug, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BURST_SIZE, QUEUE_CAPACITY, createLab, labReducer } from "@/lib/architecture-lab";
import SectionLabel from "./SectionLabel";
import styles from "./architecture-lab.module.css";

export default function ArchitectureLab() {
  const [state, dispatch] = useReducer(labReducer, undefined, createLab);
  const experiment = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const outstanding = state.queue.length + state.inFlight.length;
  const running = visible && pageVisible && !state.offline && outstanding > 0;
  const full = outstanding === QUEUE_CAPACITY;
  const recovered = state.sent > 0 && outstanding === 0;
  const accepted = state.sent - state.rejected;

  useEffect(() => {
    const node = experiment.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    observer.observe(node);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => dispatch({ type: "tick" }), 800);
    return () => clearInterval(timer);
  }, [running]);

  const lesson = full
    ? { number: "03", title: "A boundary is a feature.", text: "When capacity is full, the gateway refuses new work explicitly. A bounded system can recover. An unbounded queue just moves the failure somewhere else.", principle: "Backpressure over wishful thinking" }
    : state.offline
      ? { number: "02", title: "The queue buys you time.", text: "The workers are down. Accepted events stay in the queue, including work that was not yet acknowledged. Restore the workers to pick up where they left off.", principle: "Acknowledge after commit" }
      : recovered
        ? { number: "04", title: "Recovery is the real test.", text: "Every accepted event has reached the store. IDs keep retries from becoming duplicate commits in this model. The interesting part is what happens after the failure.", principle: "Make recovery a first-class path" }
        : { number: "01", title: "Decouple the pace.", text: "A burst arrives all at once. Workers consume at their own pace. Try taking them down mid-flight, then add capacity and bring them back.", principle: "Absorb bursts. Keep work accounted for." };
  const status = state.offline ? "Workers offline" : running ? "Processing events" : recovered ? "Queue drained" : "Ready for anything";

  return (
    <section id="architecture" className={styles.section} aria-labelledby="lab-title">
      <div className={styles.intro}>
        <div>
          <SectionLabel index="01">Architecture, hands-on</SectionLabel>
          <h2 id="lab-title">Go ahead.<br /><span>Pull the plug.</span></h2>
        </div>
        <p>Anyone can draw a happy path.<br />I care about what happens when it breaks.<br /><strong>Here, you get to find out.</strong></p>
      </div>

      <div id="architecture-lab" ref={experiment} className={styles.console} data-offline={state.offline} data-running={running}>
        <div className={styles.consoleHeader}>
          <span className={styles.consoleName}><span className={styles.crosshair} aria-hidden>+</span> RESILIENCE LAB <span className={styles.edition}>/ 001</span></span>
          <span className={styles.status} role="status"><i aria-hidden />{status}</span>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <Button className={styles.send} onClick={() => dispatch({ type: "burst" })}><Zap />Send {BURST_SIZE} events</Button>
            <Button variant="outline" className={styles.outage} onClick={() => dispatch({ type: "outage" })} aria-pressed={state.offline}>
              {state.offline ? <Check /> : <Unplug />}{state.offline ? "Restore workers" : "Stop workers"}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Reset experiment" title="Reset experiment" onClick={() => dispatch({ type: "reset" })}><RotateCcw /></Button>
          </div>
          <div className={styles.capacity} role="group" aria-label="Worker capacity">
            <span>Workers</span>
            {[1, 3, 6].map(count => <Button key={count} variant="ghost" size="sm" aria-label={`${count} workers`} aria-pressed={state.workers === count} onClick={() => dispatch({ type: "workers", count })}>{count}</Button>)}
          </div>
        </div>

        <div className={styles.workspace}>
          <div className={styles.stage}>
            <div className={styles.stageLabel}><span>EVENT-DRIVEN SYSTEM</span><span aria-hidden>01 — 04</span></div>
            <div className={styles.topology} role="group" aria-label="Events flow from a gateway into a bounded queue, through workers, and into a store">
              <div className={`${styles.node} ${styles.gateway}`} data-limited={full}>
                <Radio /><span className={styles.nodeIndex}>01</span><strong>Gateway</strong><small>{full ? "RATE LIMITED" : "ACCEPTING"}</small>
              </div>
              <div className={`${styles.connector} ${styles.routeA}`} aria-hidden><i /><ArrowRight /></div>
              <div className={`${styles.node} ${styles.queue}`}>
                <Layers3 /><span className={styles.nodeIndex}>02</span><strong>Durable queue</strong>
                <div className={styles.queueSlots} aria-hidden>{Array.from({ length: QUEUE_CAPACITY }, (_, i) => <span key={i} data-filled={i < state.queue.length} />)}</div>
                <small>{state.queue.length} WAITING <span>/ {QUEUE_CAPACITY} MAX IN SYSTEM</span></small>
              </div>
              <div className={`${styles.connector} ${styles.routeB}`} aria-hidden><i /><ArrowRight /></div>
              <div className={`${styles.node} ${styles.workers}`}>
                <Server /><span className={styles.nodeIndex}>03</span><strong>Worker pool</strong>
                <div className={styles.workerList} aria-hidden>{Array.from({ length: state.workers }, (_, i) => <span key={i} data-busy={!state.offline && i < state.inFlight.length}><i /><span>W{String(i + 1).padStart(2, "0")}</span><em>{state.offline ? "OFFLINE" : i < state.inFlight.length ? "BUSY" : "IDLE"}</em></span>)}</div>
                <small>{state.offline ? "UNAVAILABLE" : `${state.inFlight.length} PROCESSING`}</small>
              </div>
              <div className={`${styles.connector} ${styles.routeC}`} aria-hidden><i /><ArrowRight /></div>
              <div className={`${styles.node} ${styles.store}`}>
                <Database /><span className={styles.nodeIndex}>04</span><strong>Store</strong><b data-testid="lab-committed">{state.completed.length}</b><small>COMMITTED</small>
              </div>
            </div>
            <div className={styles.accounting} aria-live="off">
              <div><span>Accepted</span><strong data-testid="lab-accepted">{accepted}</strong></div>
              <div><span>In flight</span><strong data-testid="lab-inflight">{state.inFlight.length}</strong></div>
              <div><span>Waiting</span><strong data-testid="lab-waiting">{state.queue.length}</strong></div>
              <div><span>Rate limited</span><strong data-testid="lab-rejected">{state.rejected}</strong></div>
            </div>
          </div>

          <aside className={styles.insight} aria-live="polite" aria-atomic="true">
            <div className={styles.insightEyebrow}><span>THE DESIGN DECISION</span><span>{lesson.number}</span></div>
            <h3>{lesson.title}</h3><p>{lesson.text}</p>
            <div className={styles.principle}><ArrowDown /><span>{lesson.principle}</span></div>
          </aside>
        </div>

        <div className={styles.bottom}>
          <div className={styles.terminal} aria-label="Recent experiment events">
            {state.logs.map(log => <div key={log.id}><span>{String(log.id).padStart(3, "0")}</span><b>{log.tag}</b><p>{log.message}</p></div>)}
          </div>
          <p className={styles.disclaimer}>Interactive model, running in your browser.<br />In-memory state. Not production telemetry.</p>
        </div>
      </div>

      <div className={styles.footnote}><p><span>THE POINT</span> Reliability is a set of decisions, made before the incident.</p><Link href="/projects/cloud-native-microservices">Read the real case study <ArrowUpRight /></Link></div>
    </section>
  );
}
