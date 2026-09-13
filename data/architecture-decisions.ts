/** Hypothetical design exercises, not descriptions of client infrastructure. */
export const architectureDecisions = [
  {
    id: "launch", label: "01 / Launch", title: "Four engineers. One moving target.",
    context: "The product is still finding its shape. The team needs to ship, and nobody is on a dedicated platform team.",
    constraint: "Optimize for learning speed",
    question: "Where do you draw the first boundary?",
    options: [
      {
        id: "modular", label: "A modular monolith", tag: "My starting point",
        title: "Keep the boundaries. Share the deploy.",
        nodes: ["Web / API", "Domain modules", "One database"], boundary: "ONE DEPLOYMENT · EXPLICIT MODULE OWNERSHIP",
        gain: "Refactor across modules and keep transactions local while the domain is changing.",
        cost: "The team shares a release cycle and one scaling unit. Module boundaries still need enforcement.",
        revisit: "Split a module when it needs its own scale, release cadence or accountable team.",
      },
      {
        id: "services", label: "Independent services", tag: "A different bet",
        title: "Buy independence. Budget for coordination.",
        nodes: ["API gateway", "Independent services", "Service-owned stores"], boundary: "SEPARATE DEPLOYMENTS · NETWORK BOUNDARIES",
        gain: "Teams can deploy and scale independently when service boundaries are already understood.",
        cost: "Network failures, distributed tracing, data consistency and deployment coordination arrive on day one.",
        revisit: "If most changes require touching every service, the boundaries may be working against the team.",
      },
    ],
  },
  {
    id: "payments", label: "02 / Payments", title: "The charge succeeded. The response didn't.",
    context: "A customer retries after a timeout. The payment provider might have accepted the first request. Your system needs to resolve the uncertainty.",
    constraint: "One intent, one charge",
    question: "How should the customer get an answer?",
    options: [
      {
        id: "async", label: "Accept & reconcile", tag: "For work that can finish later",
        title: "Acknowledge the intent. Track the outcome.",
        nodes: ["Idempotency key", "Intent + outbox", "Worker / provider"], boundary: "ATOMIC LOCAL WRITE · DEDUPLICATED DELIVERY",
        gain: "Persist the intent and outbox together, retry with the provider's idempotency key, and reconcile uncertain outcomes.",
        cost: "The UI must represent pending states. Delivery can repeat, so provider-side deduplication and reconciliation matter.",
        revisit: "If the provider lacks idempotency support, never blindly retry an uncertain charge. Reconcile first.",
      },
      {
        id: "sync", label: "Resolve in the request", tag: "For an immediate answer",
        title: "A shorter path. A tighter availability coupling.",
        nodes: ["Idempotency key", "Provider request", "Stored outcome"], boundary: "BOUNDED TIMEOUT · PERSISTENT REQUEST IDENTITY",
        gain: "Return a confirmed result immediately when the provider responds within the request budget.",
        cost: "A timeout still means unknown, not failed. Keep the same request identity and a reconciliation path.",
        revisit: "Frequent timeouts or slow providers are reasons to expose a pending state and move completion out of the request.",
      },
    ],
  },
  {
    id: "ai", label: "03 / AI", title: "The agent has a plan. Should it have the keys?",
    context: "An AI assistant proposes a change to a production workflow. Some actions are reversible. Others affect customers and money.",
    constraint: "Match autonomy to the consequence",
    question: "Where do you put the human?",
    options: [
      {
        id: "review", label: "Review before execution", tag: "My default for high impact",
        title: "Let the model propose. Make approval concrete.",
        nodes: ["Grounded context", "Proposal + checks", "Human approval"], boundary: "READ → PROPOSE → REVIEW → EXECUTE",
        gain: "Show the actual diff, evidence and intended effect before an authorized human approves a consequential action.",
        cost: "Review adds latency and can become a bottleneck. The proposal needs enough context to be meaningfully reviewed.",
        revisit: "Automate a narrow action only after its limits, failure handling and evaluation criteria are clear.",
      },
      {
        id: "bounded", label: "Bounded autonomy", tag: "For narrow, reversible work",
        title: "Give it a small job. Give it hard limits.",
        nodes: ["Allowed tools", "Policy + sandbox", "Audit / rollback"], boundary: "SCOPED PERMISSIONS · BUDGET · STOP CONDITIONS",
        gain: "Routine, reversible work can run without blocking on every step, inside explicitly enforced permissions.",
        cost: "A prompt is not an access control. Tool policy, isolation, evaluations, logs and rollback all need implementation.",
        revisit: "Escalate when the action exceeds its scope, loses supporting evidence or becomes hard to reverse.",
      },
    ],
  },
] as const;
