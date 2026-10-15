<script lang="ts">
  import Combobox from '$lib/components/Combobox.svelte';
  import type { DiscordRole } from '$lib/api/endpoints';
  import { problemKind, shortRoleProblem } from '$lib/problems';
  import { Link2, Lock } from '@lucide/svelte';

  // Choosing ONE role: a dropdown you can type in to search (several roles at once is
  // RolePicker, with chips). The first entry (`none`) is the empty choice. `exclude` hides
  // roles that are already taken. `manageable` is for a role the bot will grant or take.
  let {
    roles,
    exclude = [],
    value = $bindable(''),
    none = 'Pick a role',
    label = 'Role',
    manageable = false,
    disabled = false,
    class: className = '',
  }: { roles: DiscordRole[]; exclude?: string[]; value?: string; none?: string; label?: string; manageable?: boolean; disabled?: boolean; class?: string } = $props();

  // An integration role is linked, a role above the bot is locked; a missing permission only dims it.
  const badgeOf = (problem: string) => {
    const kind = problemKind(problem);
    return kind === 'integration' ? { badge: Link2 } : kind === 'above' ? { badge: Lock } : {};
  };
  const options = $derived([
    { value: '', label: none },
    ...roles.filter(r => !exclude.includes(r.id)).map(r => ({
      value: r.id,
      label: r.name,
      color: r.color,
      // A role the bot cannot grant or take is listed with the reason, but cannot be picked.
      ...(manageable && r.problem ? { disabled: true, hint: shortRoleProblem(r.problem), tooltip: r.problem, ...badgeOf(r.problem) } : {}),
    })),
  ]);
</script>

<Combobox bind:value {options} placeholder="Search roles..." {label} {disabled} class={className} />
