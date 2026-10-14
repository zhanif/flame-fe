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
  /** Why the bot cannot grant or take this role (above its role, managed...), or null. */
  problem: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  /** For a thread: the channel it lives in. */
  parent_name: string | null;
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

/** Someone a role rule leaves alone: one user, or everyone who holds one role. */
export interface RoleExemption {
  target_type: 'user' | 'role';
  target_id: string;
  user?: UserProfile;
}

export interface BoosterRoleFlags {
  assign_on_boost: boolean;
  remove_on_unboost: boolean;
  guard: boolean;
}

export interface BoosterRoleRule extends BoosterRoleFlags {
  role_id: string;
  /** Why the bot cannot manage the role, or null. */
  problem: string | null;
}

export interface BoosterRules {
  /** What stops the module from working right now, e.g. a missing permission. */
  warnings: string[];
  log_channel_id: string | null;
  roles: BoosterRoleRule[];
  exceptions: RoleExemption[];
}

export interface AntiTamperRules {
  warnings: string[];
  report_channel_id: string | null;
  roles: { role_id: string; problem: string | null }[];
  exceptions: RoleExemption[];
}

export interface AutoremoverConfig {
  enabled: boolean;
  ttl_seconds: number;
  target_ids: string[];
  /** Why the bot cannot delete in the watched place (a missing permission, a place that is gone). */
  warnings: string[];
  limits: { min_ttl_seconds: number; max_ttl_seconds: number; max_targets: number };
}

export type AutoremoverView = 'scheduled' | 'history';

export interface AutoremoverItem {
  id: string;
  channel_id: string;
  message_id: string;
  author?: UserProfile;
  /** The file names. */
  summary: string;
  delete_at: string;
  status: 'pending' | 'deleted' | 'failed' | 'cancelled';
  error: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface OcrProviderInfo {
  id: string;
  label: string;
  configured: boolean;
}

export interface OcrDetectionConfig {
  enabled: boolean;
  report_channel_id: string | null;
  threshold: number;
  target_ids: string[];
  warnings: string[];
  provider: OcrProviderInfo;
  limits: { min_threshold: number; max_threshold: number; max_targets: number };
}

export interface OcrTerm {
  term: string;
  is_regex: boolean;
  created_at: string;
}

export interface OcrTerms {
  /** How many terms Flame's default list has (a server gets a copy when it installs the module). */
  default_count: number;
  terms: OcrTerm[];
}

export interface OcrDetectionItem {
  id: string;
  channel_id: string;
  message_id: string;
  author?: UserProfile;
  attachment_name: string;
  status: 'pending' | 'safe' | 'flagged' | 'handled' | 'failed';
  matched_terms: string[];
  handled_by?: UserProfile;
  handled_action: 'deleted' | 'ignored' | 'timeout' | null;
  error: string | null;
  created_at: string;
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

/** The exceptions and sweep endpoints are the same for every module that guards roles. */
const roleRules = <Rules>(moduleId: string) => {
  const base = (guildId: string) => `/guilds/${guildId}/m/${moduleId}`;
  return {
    rules: (guildId: string) => apiCall<Rules>(`${base(guildId)}/rules`),
    addException: (guildId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<Rules>(`${base(guildId)}/exceptions`, 'POST', target),
    removeException: (guildId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<Rules>(`${base(guildId)}/exceptions/${target.target_type}/${target.target_id}`, 'DELETE'),
    removeRole: (guildId: string, roleId: string) => apiCall<Rules>(`${base(guildId)}/roles/${roleId}`, 'DELETE'),
  };
};

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
  booster: {
    ...roleRules<BoosterRules>('booster'),
    setLogChannel: (guildId: string, channelId: string | null) =>
      apiCall<BoosterRules>(`/guilds/${guildId}/m/booster/log-channel`, 'PUT', { log_channel_id: channelId }),
    saveRole: (guildId: string, roleId: string, flags: BoosterRoleFlags) =>
      apiCall<BoosterRules>(`/guilds/${guildId}/m/booster/roles/${roleId}`, 'PUT', flags),
  },
  antiTamper: {
    ...roleRules<AntiTamperRules>('anti-tamper'),
    setReportChannel: (guildId: string, channelId: string | null) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/report-channel`, 'PUT', { report_channel_id: channelId }),
    addRole: (guildId: string, roleId: string) => apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/roles/${roleId}`, 'PUT'),
  },
  autoremover: {
    config: (guildId: string) => apiCall<AutoremoverConfig>(`/guilds/${guildId}/m/autoremover/config`),
    updateConfig: (guildId: string, config: Pick<AutoremoverConfig, 'enabled' | 'ttl_seconds' | 'target_ids'>) =>
      apiCall<AutoremoverConfig>(`/guilds/${guildId}/m/autoremover/config`, 'PUT', config),
    items: (guildId: string, query: { view: AutoremoverView; page: number; limit: number }) =>
      apiCall<{ items: AutoremoverItem[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/autoremover/items?view=${query.view}&page=${query.page}&limit=${query.limit}`,
      ),
    cancel: (guildId: string, id: string) => apiCall<{ success: boolean }>(`/guilds/${guildId}/m/autoremover/items/${id}`, 'DELETE'),
  },
  ocrDetection: {
    config: (guildId: string) => apiCall<OcrDetectionConfig>(`/guilds/${guildId}/m/ocr-detection/config`),
    updateConfig: (guildId: string, config: Pick<OcrDetectionConfig, 'enabled' | 'report_channel_id' | 'threshold' | 'target_ids'>) =>
      apiCall<OcrDetectionConfig>(`/guilds/${guildId}/m/ocr-detection/config`, 'PUT', config),
    terms: (guildId: string) => apiCall<OcrTerms>(`/guilds/${guildId}/m/ocr-detection/terms`),
    addTerm: (guildId: string, term: string, isRegex: boolean) =>
      apiCall<OcrTerms>(`/guilds/${guildId}/m/ocr-detection/terms`, 'POST', { term, is_regex: isRegex }),
    restoreDefaults: (guildId: string) => apiCall<OcrTerms & { restored: number }>(`/guilds/${guildId}/m/ocr-detection/terms/defaults`, 'POST'),
    removeTerm: (guildId: string, term: string) => apiCall<OcrTerms>(`/guilds/${guildId}/m/ocr-detection/terms`, 'DELETE', { term }),
    detections: (guildId: string, query: { page: number; limit: number; status?: string }) =>
      apiCall<{ items: OcrDetectionItem[]; pending: number; pagination: Pagination }>(
        `/guilds/${guildId}/m/ocr-detection/detections?page=${query.page}&limit=${query.limit}${query.status ? `&status=${query.status}` : ''}`,
      ),
  },
  auditFilters: (guildId: string) => apiCall<AuditFilters>(`/guilds/${guildId}/audit-logs/filters`),
};
