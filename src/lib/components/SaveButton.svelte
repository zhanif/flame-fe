<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { Save } from '@lucide/svelte';

  // The one Save button of every form and settings page: an icon and "Save changes", "Saving…" while it runs.
  let { saving = false, disabled = false, onclick }: { saving?: boolean; disabled?: boolean; onclick: () => void | Promise<unknown> } = $props();
</script>

<Button variant="primary" {onclick} disabled={disabled || saving}>
  <Save class="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save changes'}
</Button>
