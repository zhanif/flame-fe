import { apiCall } from './client';

export type Access = 'everyone' | 'moderator' | 'admin';

export interface BotInfo {
  name: string | null;
  avatar_url: string | null;
  invite_url: string;
}

export interface Me {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export interface UserGuild {
  id: string;
  name: string;
  icon_url: string | null;
  member_count: number | null;
  bot_present: boolean;
  access: Access;
}

export type ModuleSection = 'management' | 'utilities';

export interface ModuleEntry {
  id: string;
  name: string;
  description: string;
  section: ModuleSection;
  installed: boolean;
  commands: { name: string; kind: 'slash' | 'message' }[];
}

export type SlashState = 'live' | 'missing' | 'stale';

export interface SlashCommand {
  name: string;
  /** `slash` is typed as /name, `message` lives in a message's right-click menu. */
  kind: 'slash' | 'message' | 'user';
  module_id: string | null;
  state: SlashState;
}

export interface GuildSettings {
  language: string;
  timezone: string;
  /** What a text command starts with, e.g. `f!` in `f!ping`. */
  prefix: string;
  admin_role_ids: string[];
  moderator_role_ids: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  /** Tier the role grants by its Discord permissions alone. */
  access: 'everyone' | 'moderator' | 'admin';
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface UserProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  kind: 'user' | 'system';
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor: UserProfile;
  action: string;
  entity: string | null;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface QuoteEntry {
  id: string;
  number: number;
  content: string;
  channel_id: string;
  message_id: string;
  author?: UserProfile;
  creator?: UserProfile;
  published: boolean;
  deleted: boolean;
  deleted_at: string | null;
  delete_reason: string | null;
  deleted_by?: UserProfile;
  message_created_at: string;
  created_at: string;
}

export interface QuoteDeleteResult {
  number: number;
  removed: number;
  failed: number;
}

export interface QuoteSettings {
  publish_channel_id: string | null;
}

export interface AuditFilters {
  actions: string[];
  actors: UserProfile[];
}

export interface AuditQuery {
  page: number;
  limit: number;
  /** ISO instants. */
  from?: string;
  to?: string;
  action?: string;
  actor?: string;
  q?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const api = {
  botInfo: () => apiCall<BotInfo>('/bot/info'),
  me: () => apiCall<Me>('/auth/me'),
  logout: () => apiCall<{ success: boolean }>('/auth/logout', 'POST'),
  guilds: () => apiCall<UserGuild[]>('/users/@me/guilds'),

  modules: (guildId: string) => apiCall<ModuleEntry[]>(`/guilds/${guildId}/modules`),
  installModule: (guildId: string, moduleId: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/modules/${moduleId}/install`, 'POST'),
  uninstallModule: (guildId: string, moduleId: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/modules/${moduleId}`, 'DELETE'),

  slash: (guildId: string) => apiCall<{ commands: SlashCommand[] }>(`/guilds/${guildId}/slash`),
  slashRegister: (guildId: string, name: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/slash/commands/${encodeURIComponent(name)}`, 'PUT'),
  slashPrune: (guildId: string) => apiCall<{ removed: string[] }>(`/guilds/${guildId}/slash/prune`, 'POST'),
  slashUnregister: (guildId: string, name: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/slash/commands/${encodeURIComponent(name)}`, 'DELETE'),

  settings: (guildId: string) => apiCall<GuildSettings>(`/guilds/${guildId}/settings`),
  updateSettings: (guildId: string, patch: Partial<GuildSettings>) =>
    apiCall<GuildSettings>(`/guilds/${guildId}/settings`, 'PUT', patch),
  roles: (guildId: string) => apiCall<DiscordRole[]>(`/guilds/${guildId}/roles`),
  channels: (guildId: string) => apiCall<DiscordChannel[]>(`/guilds/${guildId}/channels`),

  auditLogs: (guildId: string, query: AuditQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return apiCall<{ logs: AuditLogEntry[]; pagination: Pagination }>(`/guilds/${guildId}/audit-logs?${params}`);
  },
  quotes: (guildId: string, query: { page: number; limit: number }) =>
    apiCall<{ quotes: QuoteEntry[]; pagination: Pagination }>(`/guilds/${guildId}/m/quotes/quotes?page=${query.page}&limit=${query.limit}`),
  deleteQuote: (guildId: string, id: string, reason: string) =>
    apiCall<QuoteDeleteResult>(`/guilds/${guildId}/m/quotes/quotes/${id}`, 'DELETE', { reason }),
  quoteSettings: (guildId: string) => apiCall<QuoteSettings>(`/guilds/${guildId}/m/quotes/settings`),
  updateQuoteSettings: (guildId: string, publishChannelId: string | null) =>
    apiCall<QuoteSettings>(`/guilds/${guildId}/m/quotes/settings`, 'PUT', { publish_channel_id: publishChannelId }),
  auditFilters: (guildId: string) => apiCall<AuditFilters>(`/guilds/${guildId}/audit-logs/filters`),
};
