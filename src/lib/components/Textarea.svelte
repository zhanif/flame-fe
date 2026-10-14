<script lang="ts">
  import { control } from '$lib/ui';
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type Props = HTMLTextareaAttributes & { mono?: boolean };

  let { value = $bindable(''), mono = false, class: className = '', ...rest }: Props = $props();
</script>

<textarea
  bind:value
  spellcheck="false"
  class="{control} w-full px-3 py-2.5 text-sm leading-6 resize-y {mono ? 'font-mono' : ''} {className}"
  {...rest}
></textarea>
