export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

export const TOAST_MS = 5000;

let _toasts: Toast[] = $state([]);
let nextId = 1;

// Remaining time per toast, so hovering one pauses its countdown.
const timers = new Map<number, { handle: ReturnType<typeof setTimeout>; started: number; left: number }>();

function arm(id: number, left: number) {
  const handle = setTimeout(() => dismiss(id), left);
  timers.set(id, { handle, started: Date.now(), left });
}

export const toasts = {
  get list() {
    return _toasts;
  },
};

export function toast(kind: ToastKind, title: string, description?: string): void {
  const id = nextId++;
  _toasts = [..._toasts, { id, kind, title, description }];
  arm(id, TOAST_MS);
}

export function dismiss(id: number): void {
  const t = timers.get(id);
  if (t) clearTimeout(t.handle);
  timers.delete(id);
  _toasts = _toasts.filter(x => x.id !== id);
}

export function pause(id: number): void {
  const t = timers.get(id);
  if (!t) return;
  clearTimeout(t.handle);
  timers.set(id, { ...t, left: t.left - (Date.now() - t.started) });
}

export function resume(id: number): void {
  const t = timers.get(id);
  if (t) arm(id, Math.max(t.left, 800));
}
