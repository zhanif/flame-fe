<script lang="ts">
  import { control } from '$lib/ui';
  import { type DateValue, getLocalTimeZone, parseDate, today } from '@internationalized/date';
  import { CalendarDays, ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import { Popover, RangeCalendar } from 'bits-ui';

  // One control for a date range: a trigger showing the range, and a popover with
  // quick presets plus a calendar. `from` / `to` are `YYYY-MM-DD` strings ('' = open end).
  let {
    from = $bindable(''),
    to = $bindable(''),
    onchange,
    class: className = '',
  }: { from?: string; to?: string; onchange?: () => void; class?: string } = $props();

  type Range = { start: DateValue | undefined; end: DateValue | undefined };

  const zone = getLocalTimeZone();
  const todayDate = today(zone);

  let open = $state(false);
  let value = $state<Range>({ start: undefined, end: undefined });
  let placeholder = $state<DateValue>(todayDate);

  const format = (date: DateValue) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date.toDate(zone));

  const label = $derived.by(() => {
    if (!from && !to) return '';
    if (from && to) return from === to ? format(parseDate(from)) : `${format(parseDate(from))} - ${format(parseDate(to))}`;
    return from ? `From ${format(parseDate(from))}` : `Until ${format(parseDate(to))}`;
  });

  // Each time it opens, the calendar starts from what is currently applied. This runs
  // on the open event, not in an effect, so it cannot loop with the calendar's own state.
  function syncFromProps() {
    value = { start: from ? parseDate(from) : undefined, end: to ? parseDate(to) : undefined };
    placeholder = value.start ?? todayDate;
  }

  function apply(start: DateValue, end: DateValue) {
    from = start.toString();
    to = end.toString();
    open = false;
    onchange?.();
  }

  function clear() {
    from = to = '';
    onchange?.();
  }

  const PRESETS: { label: string; range: () => { start: DateValue; end: DateValue } }[] = [
    { label: 'Today', range: () => ({ start: todayDate, end: todayDate }) },
    { label: 'Last 7 days', range: () => ({ start: todayDate.subtract({ days: 6 }), end: todayDate }) },
    { label: 'Last 30 days', range: () => ({ start: todayDate.subtract({ days: 29 }), end: todayDate }) },
    { label: 'This month', range: () => ({ start: todayDate.set({ day: 1 }), end: todayDate }) },
  ];
</script>

<div class="relative {className}">
  <Popover.Root bind:open onOpenChange={isOpen => isOpen && syncFromProps()}>
    <Popover.Trigger
      aria-label="Date range"
      title="Date range"
      class="{control} h-9 w-full pl-3 {label ? 'pr-8' : 'pr-3'} text-sm flex items-center gap-2 cursor-pointer text-left"
    >
      <CalendarDays class="w-4 h-4 shrink-0 text-zinc-500" />
      <span class="truncate {label ? 'text-zinc-100' : 'text-zinc-400'}">{label || 'Any date'}</span>
    </Popover.Trigger>

    <Popover.Portal>
      <Popover.Content
        align="start"
        sideOffset={6}
        class="pop z-50 flex gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/30 outline-none"
      >
        <div class="flex w-36 shrink-0 flex-col gap-1 border-r border-zinc-800 pr-4">
          {#each PRESETS as preset (preset.label)}
            <button
              type="button"
              class="menu-item h-9 rounded-lg px-3 text-left text-sm text-zinc-300 cursor-pointer outline-none transition-colors"
              onclick={() => {
                const { start, end } = preset.range();
                apply(start, end);
              }}
            >
              {preset.label}
            </button>
          {/each}
        </div>

        <RangeCalendar.Root
          bind:value
          bind:placeholder
          maxValue={todayDate}
          weekStartsOn={1}
          fixedWeeks
          locale="en-US"
          weekdayFormat="short"
          onValueChange={v => v.start && v.end && (v.start.toString() !== from || v.end.toString() !== to) && apply(v.start, v.end)}
        >
          {#snippet children({ months, weekdays })}
            <RangeCalendar.Header class="flex items-center justify-between mb-3">
              <RangeCalendar.PrevButton class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer">
                <ChevronLeft class="w-4 h-4" />
              </RangeCalendar.PrevButton>
              <RangeCalendar.Heading class="font-display text-sm font-bold text-zinc-100" />
              <RangeCalendar.NextButton class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer">
                <ChevronRight class="w-4 h-4" />
              </RangeCalendar.NextButton>
            </RangeCalendar.Header>

            {#each months as month (month.value)}
              <RangeCalendar.Grid class="border-collapse">
                <RangeCalendar.GridHead>
                  <RangeCalendar.GridRow>
                    {#each weekdays as day, i (i)}
                      <RangeCalendar.HeadCell class="w-8 pb-1.5 text-xs font-medium text-zinc-500">{day.slice(0, 2)}</RangeCalendar.HeadCell>
                    {/each}
                  </RangeCalendar.GridRow>
                </RangeCalendar.GridHead>
                <RangeCalendar.GridBody>
                  {#each month.weeks as week (week)}
                    <RangeCalendar.GridRow>
                      {#each week as date (date)}
                        <RangeCalendar.Cell {date} month={month.value} class="cal-cell">
                          <RangeCalendar.Day class="cal-day">{date.day}</RangeCalendar.Day>
                        </RangeCalendar.Cell>
                      {/each}
                    </RangeCalendar.GridRow>
                  {/each}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            {/each}
          {/snippet}
        </RangeCalendar.Root>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>

  {#if label}
    <button
      type="button"
      aria-label="Clear date range"
      title="Clear date range"
      onclick={clear}
      class="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-md text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-100 cursor-pointer"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  {/if}
</div>
