export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

let _toasts: Toast[] = $state([]);
let nextId = 1;

export const toasts = {
  get list() {
    return _toasts;
  },
};

export function toast(kind: Toast['kind'], message: string): void {
  const id = nextId++;
  _toasts = [..._toasts, { id, kind, message }];
  setTimeout(() => (_toasts = _toasts.filter(t => t.id !== id)), 4000);
}
