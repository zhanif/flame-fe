<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import ColorField from '$lib/components/ColorField.svelte';
  import EmbedPreview, { type Mention } from '$lib/components/EmbedPreview.svelte';
  import Input from '$lib/components/Input.svelte';
  import RolePicker from '$lib/components/RolePicker.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import type { DiscordChannel, DiscordRole } from '$lib/api/endpoints';
  import { label } from '$lib/ui';
  import Card from '$lib/components/Card.svelte';
  import Select from '$lib/components/Select.svelte';
  import { th } from '$lib/ui';
  import { labelOf, MAX_FIELDS, MAX_VARIABLES, VARIABLE_TYPES, variablesIn, type Draft } from './draft';

  // The fields of an announcement beside a live preview of it. The same form composes a message, edits a template
  // and edits a sent announcement; what differs (a name, a channel, the mentions) is switched on by the page.
  let {
    draft = $bindable(),
    roles,
    channels,
    channelId = $bindable(''),
    name = $bindable(''),
    types = $bindable({}),
    descriptions = $bindable({}),
    placeholders = $bindable({}),
    showName = false,
    showChannel = true,
    showMentions = true,
    canEveryone = false,
    templateHint = false,
    disabled = false,
  }: {
    draft: Draft;
    roles: DiscordRole[];
    channels: DiscordChannel[];
    channelId?: string;
    name?: string;
    /** The type of each `{variable}` (a template only); text unless set. */
    types?: Record<string, string>;
    /** A line of help under each `{variable}`'s box when it is asked for. */
    descriptions?: Record<string, string>;
    /** The faint example inside each `{variable}`'s box. */
    placeholders?: Record<string, string>;
    showName?: boolean;
    showChannel?: boolean;
    showMentions?: boolean;
    /** Only an admin may ping @everyone. */
    canEveryone?: boolean;
    /** A template: say that {names} become questions when it is sent. */
    templateHint?: boolean;
    disabled?: boolean;
  } = $props();

  const variables = $derived(variablesIn(draft));

  const mentionNames = $derived<Mention[]>([
    ...(draft.mention_everyone ? [{ name: '@everyone' }] : []),
    ...draft.mention_role_ids.map(id => {
      const role = roles.find(r => r.id === id);
      return { name: `@${role?.name ?? 'deleted role'}`, color: role?.color };
    }),
  ]);
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
  <div class="grid min-w-0 gap-4 sm:grid-cols-2">
    {#if showName}
      <div class="sm:col-span-2">
        <span class={label}>Name</span>
        <Input bind:value={name} maxlength={50} placeholder="Weekly update" aria-label="Template name" {disabled} />
        <p class="mt-1.5 text-xs text-zinc-500">What you pick in <span class="font-mono">/announce</span>.</p>
      </div>
    {/if}
    <div class="sm:col-span-2">
      <span class={label}>Message</span>
      <Textarea bind:value={draft.content} rows={3} maxlength={1500} placeholder="Plain text above the embed (optional)" aria-label="Message" {disabled} />
    </div>
    <div class="sm:col-span-2">
      <span class={label}>Title</span>
      <Input bind:value={draft.title} maxlength={256} placeholder="{'{event}'} starts {'{date}'}" aria-label="Title" {disabled} />
    </div>
    <div class="sm:col-span-2">
      <span class={label}>Body</span>
      <Textarea bind:value={draft.body} rows={6} maxlength={4000} placeholder="What you want to say. Markdown works: **bold**, [links](https://example.com)" aria-label="Body" {disabled} />
      {#if templateHint}
        <p class="mt-1.5 text-xs text-zinc-500">
          Put <span class="font-mono">{'{name}'}</span> where a value goes, in the message, title, body, footer or fields (up to 3 different ones). They are asked for each time it is sent.
        </p>
      {/if}
    </div>
    <div class="sm:col-span-2">
      <div class="flex items-center justify-between gap-3">
        <span class={label}>Fields <span class="font-normal normal-case text-zinc-500">{draft.fields.length} of {MAX_FIELDS}</span></span>
        <Button variant="ghost" size="sm" disabled={disabled || draft.fields.length >= MAX_FIELDS} title={draft.fields.length >= MAX_FIELDS ? `An announcement can have up to ${MAX_FIELDS} fields` : undefined} onclick={() => (draft.fields = [...draft.fields, { name: '', value: '', inline: false }])}>
          <Plus class="h-3.5 w-3.5" />Add field
        </Button>
      </div>
      {#if draft.fields.length}
        <ul class="mt-2 space-y-3">
          {#each draft.fields as field, i (i)}
            <li class="rounded-xl bg-zinc-800/40 p-3 ring-1 ring-zinc-800/60">
              <div class="flex items-center gap-2">
                <Input bind:value={field.name} maxlength={256} placeholder="Name" aria-label="Field {i + 1} name" {disabled} />
                <Button variant="ghost" size="icon" {disabled} onclick={() => (draft.fields = draft.fields.filter((_, n) => n !== i))} aria-label="Remove field {i + 1}"><Trash2 class="h-3.5 w-3.5" /></Button>
              </div>
              <Textarea bind:value={field.value} rows={2} maxlength={1024} placeholder="Value" aria-label="Field {i + 1} value" class="mt-2" {disabled} />
              <div class="mt-2 flex items-center gap-2">
                <Toggle on={field.inline} {disabled} label="Show field {i + 1} beside the next one" onclick={() => (field.inline = !field.inline)} />
                <span class="text-xs text-zinc-400">Inline Position</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <div class="sm:col-span-2">
      <ColorField bind:value={draft.color} label="Color" optional {disabled} />
    </div>
    <div>
      <span class={label}>Image</span>
      <Input bind:value={draft.image_url} maxlength={2000} placeholder="https://…" aria-label="Image link" {disabled} />
    </div>
    <div>
      <span class={label}>Thumbnail</span>
      <Input bind:value={draft.thumbnail_url} maxlength={2000} placeholder="https://…" aria-label="Thumbnail link" {disabled} />
    </div>
    <div class="sm:col-span-2">
      <span class={label}>Footer</span>
      <Input bind:value={draft.footer} maxlength={2048} placeholder="Small text at the bottom" aria-label="Footer" {disabled} />
    </div>
    {#if showChannel}
      <div class="sm:col-span-2">
        <span class={label}>Channel</span>
        <ChannelPicker {channels} bind:value={channelId} none={templateHint ? 'Pick when sending' : 'Pick a channel'} label="Channel" {disabled} class="w-full" />
      </div>
    {/if}
    {#if showMentions}
      <div class="sm:col-span-2">
        <span class={label}>Mentions</span>
        <RolePicker {roles} selected={draft.mention_role_ids} onchange={next => (draft.mention_role_ids = next)} max={10} placeholder="Roles to ping…" label="Roles to ping" {disabled} />
        <div class="mt-3 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs text-zinc-300">Ping @everyone</p>
            <p class="text-xs text-zinc-500">Whether or not to ping everyone.</p>
            {#if !canEveryone}<p class="text-xs text-zinc-500">Admins only.</p>{/if}
          </div>
          <Toggle on={draft.mention_everyone} disabled={disabled || !canEveryone} label="Ping @everyone" onclick={() => (draft.mention_everyone = !draft.mention_everyone)} />
        </div>
        <div class="mt-4 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs text-zinc-300">New line after the mentions</p>
            <p class="text-xs text-zinc-500">The message starts on its own line (after the mentions).</p>
          </div>
          <Toggle on={draft.mention_newline} {disabled} label="New line after the mentions" onclick={() => (draft.mention_newline = !draft.mention_newline)} />
        </div>
      </div>
    {/if}
  </div>

  <div class="min-w-0 space-y-2 lg:sticky lg:top-20 lg:self-start">
    <span class={label}>Preview</span>
    <EmbedPreview content={draft.content} title={draft.title} body={draft.body} color={draft.color} imageUrl={draft.image_url} thumbnailUrl={draft.thumbnail_url} footer={draft.footer} fields={draft.fields} mentions={mentionNames} mentionNewline={draft.mention_newline} />

    {#if templateHint && variables.length}
      <!-- What each {variable} is asked as when the template is sent. -->
      <span class="{label} block pt-2">Variables</span>
      {#if variables.length > MAX_VARIABLES}
        <p class="rounded-xl bg-orange-500/10 px-3 py-2 text-xs text-orange-400 ring-1 ring-orange-500/25">
          A template can have up to {MAX_VARIABLES} variables and this one has {variables.length}. Remove {variables.length - MAX_VARIABLES} to save it.
        </p>
      {/if}
      <Card flush>
        <table class="w-full divide-y divide-zinc-800/30 text-sm">
          <thead>
            <tr class="bg-zinc-800/20">
              <th class="{th} h-9">Variable</th>
              <th class="{th} h-9 w-40">Type</th>
            </tr>
          </thead>
          {#each variables as variable (variable)}
            <tbody>
              <tr>
                <td class="px-5 pb-1 pt-3">
                  <span class="block font-mono text-xs text-zinc-200">{'{'}{variable}{'}'}</span>
                  <span class="block text-[11px] text-zinc-500">Asked as {labelOf(variable)}</span>
                </td>
                <td class="px-5 pb-1 pt-2.5 align-top">
                  <Select
                    bind:value={() => (types[variable] && types[variable] !== 'text' ? types[variable] : ''), next => (types[variable] = next || 'text')}
                    options={VARIABLE_TYPES.filter(type => type.value !== 'text')}
                    placeholder="Text"
                    label="Type of {variable}"
                    defaulted
                    class="w-full"
                    {disabled}
                  />
                </td>
              </tr>
              <tr>
                <td colspan="2" class="space-y-2 px-5 pb-3 pt-1">
                  <Input bind:value={() => placeholders[variable] ?? '', next => (placeholders[variable] = next)} maxlength={100} placeholder="Placeholder (inside the box)" aria-label="Placeholder of {variable}" {disabled} />
                  <Textarea bind:value={() => descriptions[variable] ?? '', next => (descriptions[variable] = next)} rows={2} maxlength={100} placeholder="Description (under the box)" aria-label="Description of {variable}" {disabled} />
                </td>
              </tr>
            </tbody>
          {/each}
        </table>
      </Card>
    {/if}
  </div>
</div>
