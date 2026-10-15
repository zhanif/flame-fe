import { Folder, Hash, Megaphone, MessageSquare, MessagesSquare, Radio, Volume2 } from '@lucide/svelte';
import type { Component } from 'svelte';

// One icon per kind of channel, so a channel looks the same in a chip, a table and a picker:
// 0 text, 2 voice, 4 category, 5 announcement, 13 stage, 15 forum, 16 media, 10 / 11 / 12 threads.
const ICONS: Record<number, Component<any>> = { 0: Hash, 2: Volume2, 4: Folder, 5: Megaphone, 13: Radio, 15: MessagesSquare, 16: MessagesSquare, 10: MessageSquare, 11: MessageSquare, 12: MessageSquare };

export const channelIcon = (type: number | undefined): Component<any> => (type === undefined ? Hash : (ICONS[type] ?? Hash));
