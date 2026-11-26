import { Flame, Layers, Settings2, Sparkles } from '@lucide/svelte';
import type { Component } from 'svelte';

/** The sections of the item configuration, in sidebar order. Each carries its heading and the one line under
 *  it, so the real panel and the skeleton shown while it loads stay in step. */
export type ItemConfigSection = 'general' | 'rarity' | 'affinity' | 'effect';

export const ITEM_CONFIG_SECTIONS: { id: ItemConfigSection; label: string; icon: Component<any>; description: string }[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings2,
    description: 'How a typed item name is matched to an item, and how forgiving it is with typos.',
  },
  {
    id: 'rarity',
    label: 'Rarity',
    icon: Layers,
    description: "Tiers an item can have. A higher level is rarer, and it scales an effect's severity.",
  },
  {
    id: 'affinity',
    label: 'Elements',
    icon: Flame,
    description: 'What an item is attuned to. A combined element is built from base elements.',
  },
  {
    id: 'effect',
    label: 'Effects',
    icon: Sparkles,
    description: 'The effects an item can use. They are built in, so this is a reference of what is available.',
  },
];

/** The one-line description of a section, for the panel that shows it. */
export function itemConfigSection(id: ItemConfigSection) {
  return ITEM_CONFIG_SECTIONS.find(section => section.id === id) ?? ITEM_CONFIG_SECTIONS[0];
}
