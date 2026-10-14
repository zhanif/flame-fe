<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { TriangleAlert } from '@lucide/svelte';
  import type { Component, Snippet } from 'svelte';

  // "Are you sure?" for an action that removes, stops or overwrites something. Every such button opens this
  // instead of acting on the click; the text says what goes away and what stays. `busy` keeps it open and
  // disabled while the request runs.
  let {
    show,
    title,
    confirmLabel,
    busyLabel,
    busy = false,
    icon: Icon = TriangleAlert,
    tone = 'danger',
    disabled = false,
    onConfirm,
    onClose,
    children,
  }: {
    show: boolean;
    title: string;
    confirmLabel: string;
    busyLabel?: string;
    busy?: boolean;
    icon?: Component<any>;
    tone?: 'danger' | 'primary';
    /** For a reason the action cannot go ahead, shown in `children`. */
    disabled?: boolean;
    onConfirm: () => void | Promise<unknown>;
    onClose: () => void;
    children: Snippet;
  } = $props();
</script>

<Modal {show} onClose={() => !busy && onClose()}>
  <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
    <Icon class="w-4 h-4 shrink-0 {tone === 'danger' ? 'text-red-400' : 'text-orange-400'}" />{title}
  </h3>
  <div class="mt-3 text-xs leading-relaxed text-zinc-400">{@render children()}</div>
  <div class="mt-5 flex justify-end gap-2">
    <Button variant="ghost" onclick={onClose} disabled={busy}>Cancel</Button>
    <Button variant={tone} onclick={onConfirm} disabled={busy || disabled}>{busy ? (busyLabel ?? 'Working…') : confirmLabel}</Button>
  </div>
</Modal>
