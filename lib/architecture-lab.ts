export const QUEUE_CAPACITY = 24;
export const BURST_SIZE = 12;
export type LabLog = { id: number; tag: string; message: string };
export type LabState = {
  queue: number[];
  inFlight: number[];
  completed: number[];
  sent: number;
  rejected: number;
  nextId: number;
  offline: boolean;
  workers: number;
  sequence: number;
  logs: LabLog[];
};
export type LabAction =
  | { type: "burst" }
  | { type: "tick" }
  | { type: "outage" }
  | { type: "workers"; count: number }
  | { type: "reset" };

export function createLab(): LabState {
  return {
    queue: [], inFlight: [], completed: [], sent: 0, rejected: 0, nextId: 1,
    offline: false, workers: 3, sequence: 0,
    logs: [{ id: 0, tag: "READY", message: "Your experiment is ready. Send the first burst." }],
  };
}

function record(state: LabState, tag: string, message: string): LabState {
  const sequence = state.sequence + 1;
  return { ...state, sequence, logs: [{ id: sequence, tag, message }, ...state.logs].slice(0, 4) };
}

export function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case "reset": return createLab();
    case "burst": {
      const available = QUEUE_CAPACITY - state.queue.length - state.inFlight.length;
      const accepted = Math.min(BURST_SIZE, available);
      const rejected = BURST_SIZE - accepted;
      const jobs = Array.from({ length: accepted }, (_, i) => state.nextId + i);
      return record({
        ...state, queue: [...state.queue, ...jobs], nextId: state.nextId + BURST_SIZE,
        sent: state.sent + BURST_SIZE, rejected: state.rejected + rejected,
      }, rejected ? "LIMIT" : "ACCEPT", rejected
        ? `${accepted} accepted. ${rejected} returned to the sender: capacity is bounded.`
        : `${accepted} events accepted into the queue. Each has its own ID.`);
    }
    case "outage": {
      if (state.offline) return record({ ...state, offline: false }, "RECOVER", "Workers restored. Resume from the last unacknowledged event.");
      return record({ ...state, offline: true, queue: [...state.inFlight, ...state.queue], inFlight: [] }, "OFFLINE", "Workers stopped. Unacknowledged jobs returned to the queue.");
    }
    case "workers": {
      if (![1, 3, 6].includes(action.count) || action.count === state.workers) return state;
      return record({ ...state, workers: action.count }, "SCALE", `${action.count} workers selected. New capacity applies to the next batch.`);
    }
    case "tick": {
      if (state.offline || (!state.queue.length && !state.inFlight.length)) return state;
      const completed = [...new Set([...state.completed, ...state.inFlight])];
      const inFlight = state.queue.slice(0, state.workers);
      const queue = state.queue.slice(state.workers);
      const next = { ...state, completed, inFlight, queue };
      if (!inFlight.length) return record(next, "DRAINED", `All ${completed.length} accepted events committed. Nothing left in the queue.`);
      return record(next, state.inFlight.length ? "COMMIT" : "PROCESS", `${state.inFlight.length} committed · ${inFlight.length} processing · ${queue.length} waiting.`);
    }
  }
}
