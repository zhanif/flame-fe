import type { AnnouncementField, AnnouncementFields, AnnouncementVariableType } from '$lib/api/endpoints';

/** What the announcement form edits: every field is text ('' for "not set"), so inputs bind to it directly. */
export interface Draft {
  content: string;
  title: string;
  body: string;
  color: string;
  image_url: string;
  thumbnail_url: string;
  footer: string;
  fields: AnnouncementField[];
  mention_role_ids: string[];
  mention_everyone: boolean;
  mention_newline: boolean;
}

/** A template can have at most this many `{variables}` (the server refuses more; a modal holds five boxes and one is the channel). */
export const MAX_VARIABLES = 3;

/** An announcement can have at most this many fields (Discord allows 25; the server enforces the same limit). */
export const MAX_FIELDS = 3;

export const emptyDraft = (): Draft => ({ content: '', title: '', body: '', color: '', image_url: '', thumbnail_url: '', footer: '', fields: [], mention_role_ids: [], mention_everyone: false, mention_newline: true });

export const draftOf = (entry: AnnouncementFields): Draft => ({
  content: entry.content ?? '',
  title: entry.title ?? '',
  body: entry.body ?? '',
  color: entry.color ?? '',
  image_url: entry.image_url ?? '',
  thumbnail_url: entry.thumbnail_url ?? '',
  footer: entry.footer ?? '',
  fields: (entry.fields ?? []).map(field => ({ ...field })),
  mention_role_ids: [...entry.mention_role_ids],
  mention_everyone: entry.mention_everyone,
  mention_newline: entry.mention_newline ?? true,
});

/** The request fields: '' becomes null. */
export const fieldsOf = (draft: Draft) => ({
  content: draft.content.trim() || null,
  title: draft.title.trim() || null,
  body: draft.body.trim() || null,
  color: draft.color || null,
  image_url: draft.image_url.trim() || null,
  thumbnail_url: draft.thumbnail_url.trim() || null,
  footer: draft.footer.trim() || null,
  fields: draft.fields.filter(field => field.name.trim() || field.value.trim()),
  mention_role_ids: draft.mention_role_ids,
  mention_everyone: draft.mention_everyone,
  mention_newline: draft.mention_newline,
});

/** The types a variable can have, with what each one asks for. The empty value is the default (text). */
export const VARIABLE_TYPES: { value: AnnouncementVariableType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'link', label: 'Link' },
  { value: 'user', label: 'Member' },
  { value: 'role', label: 'Role' },
  { value: 'channel', label: 'Channel' },
];

/** A variable's name as a person reads it: `chapter_number` is "Chapter Number". */
export const labelOf = (name: string): string =>
  name
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const VARIABLE = /\{([a-z][a-z0-9_]{0,19})\}/g;

/** The `{names}` in the message, title, body, footer and fields, once each. */
export const variablesIn = (draft: Pick<Draft, 'content' | 'title' | 'body' | 'footer' | 'fields'>): string[] => {
  const found = new Set<string>();
  for (const text of [draft.content, draft.title, draft.body, draft.footer, ...draft.fields.flatMap(field => [field.name, field.value])]) for (const match of text.matchAll(VARIABLE)) found.add(match[1]);
  return [...found];
};

/** The draft with each `{name}` replaced by its value (a name without a value stays as typed). */
export const fill = (draft: Draft, values: Record<string, string>): Draft => {
  const replace = (text: string) => text.replace(VARIABLE, (whole, name: string) => (values[name]?.trim() ? values[name] : whole));
  return {
    ...draft,
    content: replace(draft.content),
    title: replace(draft.title),
    body: replace(draft.body),
    footer: replace(draft.footer),
    fields: draft.fields.map(field => ({ ...field, name: replace(field.name), value: replace(field.value) })),
  };
};

/** Whether any part of the embed is filled in (a message of plain text has none). */
export const hasEmbed = (draft: Pick<Draft, 'title' | 'body' | 'image_url' | 'thumbnail_url' | 'footer' | 'fields'>): boolean =>
  !!(draft.title.trim() || draft.body.trim() || draft.image_url.trim() || draft.thumbnail_url.trim() || draft.footer.trim() || draft.fields.some(field => field.name.trim() || field.value.trim()));

/** Whether there is anything to send: a message or any part of the embed. */
export const hasContent = (draft: Draft): boolean => !!draft.content.trim() || hasEmbed(draft);
