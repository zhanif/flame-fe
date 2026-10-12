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

export interface ModuleEntry {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  commands: string[];
}

export type SlashState = 'live' | 'missing' | 'stale';

export interface SlashCommand {
  name: string;
  module_id: string | null;
  state: SlashState;
}

export interface GuildSettings {
  language: string;
  timezone: string;
  admin_role_ids: string[];
  moderator_role_ids: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
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
  slashPush: (guildId: string) => apiCall<{ registered: string[] }>(`/guilds/${guildId}/slash/push`, 'POST'),
  slashPrune: (guildId: string) => apiCall<{ removed: string[] }>(`/guilds/${guildId}/slash/prune`, 'POST'),

  settings: (guildId: string) => apiCall<GuildSettings>(`/guilds/${guildId}/settings`),
  updateSettings: (guildId: string, patch: Partial<GuildSettings>) =>
    apiCall<GuildSettings>(`/guilds/${guildId}/settings`, 'PUT', patch),
  roles: (guildId: string) => apiCall<DiscordRole[]>(`/guilds/${guildId}/roles`),

  auditLogs: (guildId: string, page: number) =>
    apiCall<{ logs: AuditLogEntry[]; pagination: Pagination }>(`/guilds/${guildId}/audit-logs?page=${page}&limit=20`),
};
