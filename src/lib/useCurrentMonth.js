'use client';
import { useSyncExternalStore, useCallback } from 'react';

// Tiny global store — không cần thêm zustand/context.
let state = { monthId: null, months: [] };
const listeners = new Set();

function emit() { for (const l of listeners) l(); }

function set(partial) {
  state = { ...state, ...partial };
  if (typeof window !== 'undefined' && partial.monthId !== undefined) {
    if (partial.monthId) localStorage.setItem('mp_monthId', partial.monthId);
    else localStorage.removeItem('mp_monthId');
  }
  emit();
}

async function fetchMonths() {
  const res = await fetch('/api/months');
  if (!res.ok) return;
  const list = await res.json();
  let monthId = state.monthId;
  if (typeof window !== 'undefined' && !monthId) {
    monthId = localStorage.getItem('mp_monthId');
  }
  const exists = list.some(m => m._id === monthId);
  if (!exists) monthId = list[0]?._id || null;
  set({ months: list, monthId });
}

function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot() { return state; }
function getServerSnapshot() { return { monthId: null, months: [] }; }

export function useCurrentMonth() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMonthId = useCallback(id => set({ monthId: id }), []);
  const reload = useCallback(() => fetchMonths(), []);
  return { ...s, setMonthId, reload };
}
