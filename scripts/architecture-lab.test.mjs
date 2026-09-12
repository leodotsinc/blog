import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab, labReducer, QUEUE_CAPACITY } from '../lib/architecture-lab.ts';
const act = (s, type, extra = {}) => labReducer(s, { type, ...extra });
const drain = (s) => { for (let i = 0; i < 30; i++) s = act(s, 'tick'); return s; };
const invariant = (s) => {
  const accepted = [...s.queue, ...s.inFlight, ...s.completed];
  assert.equal(new Set(accepted).size, accepted.length, 'No duplicate or lost ownership');
  assert.equal(accepted.length + s.rejected, s.sent, 'Every submitted event is accounted for');
  assert(s.queue.length + s.inFlight.length <= QUEUE_CAPACITY, 'Capacity stays bounded');
};
test('a burst drains completely without duplicate commits', () => {
  const s = drain(act(createLab(), 'burst'));
  invariant(s); assert.equal(s.completed.length, 12); assert.equal(s.queue.length, 0);
  assert.equal(act(s, 'tick'), s, 'Idle ticks do no work');
});
test('worker outage requeues in-flight work and recovery drains it', () => {
  let s = act(act(createLab(), 'burst'), 'tick');
  assert.equal(s.inFlight.length, 3);
  s = act(s, 'outage');
  assert.equal(s.queue.length, 12); assert.equal(s.inFlight.length, 0);
  assert.equal(act(s, 'tick'), s, 'Offline workers cannot make progress');
  s = drain(act(s, 'outage')); invariant(s); assert.equal(s.completed.length, 12);
});
test('bounded admission rejects excess, then accepts new work after recovery', () => {
  let s = act(createLab(), 'outage');
  for (let i = 0; i < 3; i++) s = act(s, 'burst');
  invariant(s); assert.equal(s.queue.length, 24); assert.equal(s.rejected, 12);
  s = drain(act(s, 'outage')); s = drain(act(s, 'burst'));
  invariant(s); assert.equal(s.completed.length, 36);
});
test('scaling preserves work; reset cancels the whole experiment', () => {
  let s = act(act(createLab(), 'burst'), 'tick');
  s = act(s, 'workers', { count: 6 }); s = act(s, 'tick');
  assert.equal(s.inFlight.length, 6); invariant(s);
  assert.deepEqual(act(s, 'reset'), createLab());
});
test('mixed failures and bursts preserve accounting at every step', () => {
  let s = createLab();
  for(let i = 0; i < 400; i++) {
    s = i % 11 === 0 ? act(s, 'outage') : i % 7 === 0 ? act(s, 'burst') : i % 5 === 0 ? act(s, 'workers', { count: [1,3,6][i%3] }) : act(s, 'tick');
    invariant(s);
  }
  if(s.offline) s = act(s, 'outage');
  s = drain(s); invariant(s); assert.equal(s.completed.length, s.sent-s.rejected);
});
