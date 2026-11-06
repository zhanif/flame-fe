<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type BingoConfig } from '$lib/api/endpoints';
  import DesignsTab from '$lib/modules/bingo/DesignsTab.svelte';
  import RoundPage from '$lib/modules/bingo/RoundPage.svelte';
  import SettingsTab from '$lib/modules/bingo/SettingsTab.svelte';
  import ThreadsTab from '$lib/modules/bingo/ThreadsTab.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/url-param';
  import { Grid3x3, Info, Palette, Settings } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const tabParam = urlParam('tab', 'threads');
  const roundParam = urlParam('round');
  const designParam = urlParam('design');
  const forParam = urlParam('for');
  const tab = $derived(tabParam.value);

  let config: BingoConfig | null = $state(null);
  let info = $state(false);

  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    threads: {
      title: 'How a round works',
      steps: [
        { text: 'A staff member opens a thread in the bingo forum whose first message carries the tag. The thread becomes a round on its own.' },
        { text: 'Design the board in the Designs tab: the 12 questions, their points and the look of the card. Assign the design to a round when it is ready, then post it in the thread so members see what they are answering.' },
        { text: 'Members submit by sending their 12 answers in the thread, for example Y N Y N Y Y N N Y - - Y. A valid one is recorded at once and the first message of a member is their entry; a later one is refused until the earlier message is deleted.' },
        { text: 'Set the correct answers when they are known. Every entry is rescored and the table is ready, and /bingo view shows it in Discord.' },
      ],
    },
    designs: {
      title: 'How designs work',
      steps: [
        { text: 'A design is a stored board: 12 questions, their points and the look of the card. It exists on its own, before a round does.' },
        { text: 'Pick a round when saving to make the design that round\'s board. Leave it unassigned to keep the design as a library entry.' },
        { text: 'A round can have one design. Assigning another one is refused until the round\'s current design is unassigned.' },
        { text: 'A design can be saved as a draft. It can only be posted or scored when all 12 questions are filled in.' },
      ],
    },
    settings: {
      title: 'How detection works',
      steps: [
        { text: 'The forum decides where rounds live: only threads in that forum are looked at.' },
        { text: 'The tag pattern is a regular expression tested against a thread\'s first message. The first match is the round tag, so the pattern decides which threads count and what the round is called.' },
        { text: 'Threads made before the module was installed are picked up by scanning the forum once.' },
      ],
    },
  };

  const hint = $derived(HINTS[tab] ?? HINTS.threads);

  async function load() {
    try {
      config = await api.bingo.config(guildId);
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  onMount(load);

  function openRound(id: string) {
    roundParam.value = id;
  }

  function closeRound() {
    roundParam.value = '';
  }

  function openDesign(id: string, roundId = '') {
    roundParam.value = '';
    designParam.value = id || 'new';
    forParam.value = roundId;
    tabParam.value = 'designs';
  }

  function closeDesign() {
    const fromRound = forParam.value;
    designParam.value = '';
    forParam.value = '';
    if (fromRound) {
      roundParam.value = fromRound;
      tabParam.value = 'threads';
    }
  }
</script>

<PageHeader module="bingo" description="Bingo rounds in a forum thread" />

<div class="space-y-5">
  {#if roundParam.value && config}
    {#key roundParam.value}
      <RoundPage {guildId} roundId={roundParam.value} {isAdmin} onBack={closeRound} onOpenDesign={openDesign} />
    {/key}
  {:else if designParam.value && config}
    <DesignsTab
      {guildId}
      {config}
      {isAdmin}
      designId={designParam.value}
      initialRoundId={forParam.value}
      onOpen={openDesign}
      onClose={closeDesign}
    />
  {:else}
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <Tabs
        bind:value={tabParam.value}
        tabs={[
          { id: 'threads', label: 'Threads', icon: Grid3x3 },
          { id: 'designs', label: 'Designs', icon: Palette },
          { id: 'settings', label: 'Settings', icon: Settings },
        ]}
      />
      <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
    </div>

    <InfoPanel show={info} title={hint.title} tone="rose" steps={hint.steps} />

    {#if config}
      <WarningBanner warnings={config.warnings} />
    {/if}

    {#if !config}
      <Card><FormSkeleton fields={3} /></Card>
    {:else if tab === 'settings'}
      <SettingsTab {guildId} {config} {isAdmin} onSaved={next => (config = next)} />
    {:else if tab === 'designs'}
      <DesignsTab {guildId} {config} {isAdmin} designId="" initialRoundId="" onOpen={openDesign} onClose={closeDesign} />
    {:else}
      <ThreadsTab {guildId} {isAdmin} onOpen={openRound} />
    {/if}
  {/if}
</div>
