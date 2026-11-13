import { apiCall } from './client';

export type Access = 'everyone' | 'moderator' | 'admin';

export interface BotInfo {
  name: string | null;
  avatar_url: string | null;
  invite_url: string;
}

/** How the bot looks in one server: its nickname and avatar there, and the ones it has everywhere else. */
export interface BotProfile {
  /** Setting the bot's own avatar in a server is a premium feature; the nickname is not. */
  premium: boolean;
  /** What members see: the server nickname when set, else the bot's own name. */
  name: string;
  nickname: string | null;
  avatar_url: string;
  has_guild_avatar: boolean;
  global_name: string;
  global_avatar_url: string;
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
  /** Installed and turned on. A turned-off module keeps its data but does nothing. */
  enabled: boolean;
  commands: { name: string; kind: 'slash' | 'message' }[];
}

export type SlashState = 'live' | 'missing' | 'stale';

/** One part of what a slash command takes: a subcommand group, a subcommand, or an option (a parameter). */
export interface SlashOption {
  kind: 'group' | 'subcommand' | 'option';
  name: string;
  description: string;
  /** What an option holds (`text`, `number`, `member`...); empty for a group or a subcommand. */
  type: string;
  required: boolean;
  choices: string[];
  options: SlashOption[];
}

export interface SlashCommand {
  name: string;
  description: string;
  options: SlashOption[];
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
  /** Why the bot cannot manage the channel's permissions (View Channel and Manage Roles in it), or null when it can. */
  problem?: string | null;
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
  /** What stops quotes from working right now (a missing permission). */
  warnings: string[];
}

/** Someone a role rule leaves alone: one user, or everyone who holds one role. */
export type ExceptionScope = 'all' | 'roles' | 'channels';

export interface RoleExemption {
  target_type: 'user' | 'role';
  target_id: string;
  user?: UserProfile;
  /** Anti Tamper's global exceptions: what it applies to (protected roles, protected channels, or both). */
  scope?: ExceptionScope;
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
  /** The server-wide switches: a kind that is off is not enforced at all. */
  roles_enabled: boolean;
  channels_enabled: boolean;
  /** Each protected role with its own (local) exceptions: who may hold only that role. `enabled` off pauses just this one. */
  roles: { role_id: string; enabled: boolean; problem: string | null; exceptions: RoleExemption[] }[];
  /** Protected channels (their permissions), each with its own (local) exceptions. */
  channels: { channel_id: string; enabled: boolean; problem: string | null; overwrites: number; exceptions: RoleExemption[] }[];
  /** Global exceptions: who is left alone by every protected role and/or channel, as their scope says. */
  exceptions: RoleExemption[];
}

/** One permission overwrite of a channel: who it is for, and the permissions it allows and denies. */
export interface OverwriteDetail {
  id: string;
  type: 'role' | 'member';
  name: string | null;
  color: string | null;
  allow: string[];
  deny: string[];
  user?: UserProfile;
}

export interface ChannelPermissions {
  saved: OverwriteDetail[];
  current: OverwriteDetail[];
  same: boolean;
}

export interface AntiTamperLog {
  id: string;
  kind: 'role' | 'channel';
  result: 'reverted' | 'failed' | 'unverified';
  created_at: string;
  channel_id: string | null;
  role_ids: string[];
  /** The member who held the role (a role log). */
  member?: UserProfile;
  /** Who gave the role, or who changed the channel, when known. */
  by?: UserProfile;
  reason: string | null;
}

/** What can be removed: messages with an image, with a video, with any file, or every message. */
export type AutoremoverKind = 'image' | 'video' | 'file' | 'message';

export interface AutoremoverConfig {
  enabled: boolean;
  ttl_seconds: number;
  target_ids: string[];
  /** A message is removed when it matches any of these. */
  remove_kinds: AutoremoverKind[];
  exclude_mods: boolean;
  exclude_admins: boolean;
  exclude_pinned: boolean;
  /** Why the bot cannot delete in the watched place (a missing permission, a place that is gone). */
  warnings: string[];
  limits: { min_ttl_seconds: number; max_ttl_seconds: number; max_targets: number };
}

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
  /** The most terms a server's blocklist can have. */
  terms: OcrTerm[];
}

export interface OcrDetectionItem {
  id: string;
  channel_id: string;
  message_id: string;
  author?: UserProfile;
  attachment_name: string;
  attachment_url: string;
  status: 'pending' | 'safe' | 'flagged' | 'handled' | 'failed';
  matched_terms: string[];
  handled_by?: UserProfile;
  handled_action: 'deleted' | 'ignored' | 'timeout' | null;
  handled_reason: string | null;
  error: string | null;
  created_at: string;
}

export interface RoleColorEntry {
  id: string;
  name: string;
  command_name: string;
  role_id: string;
  max_colors: number;
  description: string | null;
  /** Why the bot cannot change the role, or null. */
  problem: string | null;
  /** The colors the role has now (empty when it has none). */
  current: string[];
}

export interface RoleColors {
  /** Whether the server has Enhanced Role Colors, which more than one color needs. */
  enhanced: boolean;
  colors: RoleColorEntry[];
  warnings: string[];
}

export type RoleColorInput = Pick<RoleColorEntry, 'name' | 'command_name' | 'role_id' | 'max_colors' | 'description'>;

export interface RoleColorChange {
  id: string;
  color_id: string;
  color_name: string;
  user?: UserProfile;
  before: string[];
  after: string[];
  created_at: string;
}

export type FileKind = 'image' | 'video' | 'audio' | 'other';

export interface FileCollectionEntry {
  id: string;
  name: string;
  command_name: string;
  description: string | null;
  file_types: FileKind[];
  entry_style: 'separate' | 'grouped';
  max_files: number;
  max_entries: number | null;
  count_rejected: boolean;
  allow_upvotes: boolean;
  require_reject_reason: boolean;
  show_reject_reason: boolean;
  approve_role_id: string | null;
  reject_role_id: string | null;
  publish_reaction: string | null;
  /** The forum where `panel` opens a thread per round. */
  submission_forum_id: string | null;
  /** Why the bot cannot grant its roles, if it cannot. */
  problems: string[];
}

export interface FileCollections {
  max_collections: number;
  collections: FileCollectionEntry[];
  warnings: string[];
}

export type FileCollectionInput = Omit<FileCollectionEntry, 'id' | 'problems'>;

export interface FileSubmissionGroup {
  collection_id: string;
  collection_name: string;
  tag: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  last_at: string;
}

export interface FileSubmissionRow {
  id: string;
  collection_name: string;
  tag: string;
  user?: UserProfile;
  submitted_by?: UserProfile;
  file_count: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  upvotes: number | null;
  reviewer?: UserProfile;
  reviewed_at: string | null;
  files: { url: string; name: string; type: string | null }[];
  created_at: string;
}

/** One name and value block of an announcement's embed. */
export interface AnnouncementField {
  name: string;
  value: string;
  inline: boolean;
}

export interface AnnouncementFields {
  /** Plain message text above the embed. */
  content: string | null;
  title: string | null;
  body: string | null;
  color: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  footer: string | null;
  fields: AnnouncementField[];
  mention_role_ids: string[];
  mention_everyone: boolean;
  /** The message text starts on a new line after the mentions. */
  mention_newline: boolean;
}

/** What a variable is asked as when its template is sent. */
export type AnnouncementVariableType = 'text' | 'number' | 'link' | 'user' | 'role' | 'channel';

export interface AnnouncementTemplateEntry extends AnnouncementFields {
  id: string;
  name: string;
  sub_command_name: string;
  channel_id: string | null;
  /** The `{names}` asked for when it is sent. */
  variables: string[];
  /** The type of each variable, by name. */
  variable_types: Record<string, AnnouncementVariableType>;
  /** A line of help under each variable's box, by name. */
  variable_descriptions: Record<string, string>;
  /** The faint example inside each variable's box, by name. */
  variable_placeholders: Record<string, string>;
}

export interface AnnouncementTemplates {
  templates: AnnouncementTemplateEntry[];
  max_templates: number;
  /** What stops announcements from being sent right now (a missing permission). */
  warnings: string[];
}

export interface AnnouncementEntry extends AnnouncementFields {
  id: string;
  template_name: string | null;
  channel_id: string;
  message_id: string;
  status: 'sent' | 'deleted';
  sent_by?: UserProfile;
  created_at: string;
  edited_at: string | null;
}

/** `flame`: answers come from the service Flame offers. `own`: from one the server brings. */
export type ChatMode = 'flame' | 'own';

export interface ChatCompletionLimits {
  context_messages: [number, number];
  context_minutes: [number, number];
  max_input_chars: [number, number];
  temperature: [number, number];
  top_p: [number, number];
  penalty: [number, number];
  max_tokens: [number, number];
  user_daily_limit: [number, number];
  guild_daily_limit: [number, number];
  max_channels: number;
}

export interface ChatPreset {
  id: string;
  label: string;
  base_url: string;
  model: string;
}

export interface ChatCompletionConfig {
  enabled: boolean;
  channel_ids: string[];
  mode: ChatMode;
  base_url: string | null;
  model: string | null;
  system_prompt: string | null;
  temperature: number | null;
  top_p: number | null;
  presence_penalty: number | null;
  frequency_penalty: number | null;
  max_tokens: number | null;
  context_messages: number;
  context_minutes: number;
  max_input_chars: number;
  user_daily_limit: number;
  guild_daily_limit: number;
}

/** The settings as the dashboard gets them: whether a key is stored (its last characters), never the key. */
export interface ChatCompletionView extends ChatCompletionConfig {
  has_api_key: boolean;
  api_key_hint: string | null;
  warnings: string[];
  premium: boolean;
  limits: Record<ChatMode, ChatCompletionLimits>;
  presets: ChatPreset[];
  flame: {
    configured: boolean;
    model: string;
    used_today: number;
    daily_limit: number;
    guild_used_today: number;
    guild_daily_limit: number;
  };
  default_prompt: string;
}

export interface ChatCompletionTest {
  ok: true;
  ms: number;
  reply: string;
}

/** How many answers one member got today, with the name and avatar to show. */
export interface ChatCompletionMemberUsage {
  user: UserProfile;
  today: number;
  all_time: number;
}

/** The Statistic tab: today's answers for this server, and per member. */
export interface ChatCompletionStats {
  used_today: number;
  /** The answers the server gets a day; 0 means no limit. */
  daily_limit: number;
  /** The answers each member gets a day; 0 means no limit. */
  member_daily_limit: number;
  members_today: number;
  /** Flame's own service across every server, or null while the server brings its own key. */
  shared: { used_today: number; daily_limit: number } | null;
  /** Most answers first. */
  members: ChatCompletionMemberUsage[];
  /** Answers per period, in chronological order, for the line chart. */
  series: { label: string; count: number }[];
}

/** A band of the board and the ink written on it. */
export interface BingoBand {
  color: string;
  text: string;
}

/** Bingo: the 12 questions of one round, their points and how the board looks. */
export interface BingoBoardStyle {
  background: string;
  /** The cell body under the band. */
  tile: string;
  /** The question text on that body. */
  text: string;
  title_color: string;
  subtitle_color: string;
  /** The band of the nine main cells, and of the bonus cells 10, 11 and 12. */
  box: BingoBand;
  bonus_1: BingoBand;
  bonus_2: BingoBand;
  bonus_3: BingoBand;
  radius: number;
  show_numbers: boolean;
  show_points: boolean;
}

export interface BingoBoard {
  title: string;
  subtitle: string;
  footer: string;
  /** 12 questions, index 0 is question 1. */
  questions: string[];
  /** 12 point values, a wrong answer costs the same. */
  points: number[];
  style: BingoBoardStyle;
}

/** A board: saved on its own, and one can be assigned to a round. `updated_at` is null until it is saved
 *  for the first time, and `id` is empty for the empty board a round starts from. */
export interface BingoDesign {
  id: string;
  round_id: string | null;
  round_tag: string | null;
  board: BingoBoard;
  updated_at: string | null;
}

export type BingoRoundStatus = 'open' | 'closed' | 'ignored';
export type BingoTogetherMode = 'off' | 'positive' | 'negative';

export interface BingoRound {
  id: string;
  tag: string;
  thread_id: string;
  thread_name: string;
  status: BingoRoundStatus;
  together_mode: BingoTogetherMode;
  design_id: string | null;
  has_design: boolean;
  board_ready: boolean;
  has_answers: boolean;
  /** The 12 correct answers, once they are set. */
  correct_answers: string | null;
  entries: number;
  ranked_entries: number;
  top_score: number | null;
  created_at: string;
}

export interface BingoLimits {
  question: number;
  title: number;
  subtitle: number;
  footer: number;
  points: number;
  regex: number;
}

export interface BingoConfig {
  channel_id: string | null;
  tag_regex: string | null;
  participant_role_id: string | null;
  newcomer_role_id: string | null;
  positive_role_id: string | null;
  negative_role_id: string | null;
  announce_board: boolean;
  upper_threshold: number | null;
  lower_threshold: number | null;
  warnings: string[];
  defaults: { board: BingoBoard };
  limits: BingoLimits;
}

export interface BingoEntry {
  id: string;
  user_id: string;
  user_name: string;
  answers: string;
  score: number;
  final_score: number;
  is_ranked: boolean;
  position: number | null;
  created_at: string;
}

export interface BingoEntries {
  entries: BingoEntry[];
  correct_answers: string | null;
  pagination: Pagination;
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
  module?: string;
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
    addException: (guildId: string, target: Pick<RoleExemption, 'target_type' | 'target_id' | 'scope'>) =>
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
  setModuleEnabled: (guildId: string, moduleId: string, enabled: boolean) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/modules/${moduleId}/enabled`, 'PUT', { enabled }),
  uninstallModule: (guildId: string, moduleId: string) => apiCall<{ success: boolean }>(`/guilds/${guildId}/modules/${moduleId}`, 'DELETE'),

  slash: (guildId: string) => apiCall<{ commands: SlashCommand[] }>(`/guilds/${guildId}/slash`),
  slashRegister: (guildId: string, name: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/slash/commands/${encodeURIComponent(name)}`, 'PUT'),
  slashPurge: (guildId: string, all: boolean) => apiCall<{ removed: string[] }>(`/guilds/${guildId}/slash/purge`, 'POST', { all }),
  slashUnregister: (guildId: string, name: string) =>
    apiCall<{ success: boolean }>(`/guilds/${guildId}/slash/commands/${encodeURIComponent(name)}`, 'DELETE'),

  settings: (guildId: string) => apiCall<GuildSettings>(`/guilds/${guildId}/settings`),
  botProfile: (guildId: string) => apiCall<BotProfile>(`/guilds/${guildId}/bot-profile`),
  updateBotProfile: (guildId: string, patch: { nickname?: string | null; avatar?: string | null }) =>
    apiCall<BotProfile>(`/guilds/${guildId}/bot-profile`, 'PUT', patch),
  updateSettings: (guildId: string, patch: Partial<GuildSettings>) => apiCall<GuildSettings>(`/guilds/${guildId}/settings`, 'PUT', patch),
  roles: (guildId: string) => apiCall<DiscordRole[]>(`/guilds/${guildId}/roles`),
  channels: (guildId: string) => apiCall<DiscordChannel[]>(`/guilds/${guildId}/channels`),

  auditLogs: (guildId: string, query: AuditQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return apiCall<{ logs: AuditLogEntry[]; pagination: Pagination }>(`/guilds/${guildId}/audit-logs?${params}`);
  },
  quotes: (guildId: string, query: { page: number; limit: number; status?: string; search?: string }) =>
    apiCall<{ quotes: QuoteEntry[]; pagination: Pagination }>(
      `/guilds/${guildId}/m/quotes/quotes?page=${query.page}&limit=${query.limit}${query.status ? `&status=${query.status}` : ''}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`,
    ),
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
    setProtection: (guildId: string, kind: 'roles' | 'channels', enabled: boolean) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/protection/${kind}`, 'PUT', { enabled }),
    setRoleEnabled: (guildId: string, roleId: string, enabled: boolean) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/roles/${roleId}/enabled`, 'PUT', { enabled }),
    setChannelEnabled: (guildId: string, channelId: string, enabled: boolean) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}/enabled`, 'PUT', { enabled }),
    addChannel: (guildId: string, channelId: string) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}`, 'PUT'),
    removeChannel: (guildId: string, channelId: string) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}`, 'DELETE'),
    channelPermissions: (guildId: string, channelId: string) =>
      apiCall<ChannelPermissions>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}/permissions`),
    restoreChannel: (guildId: string, channelId: string) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}/restore`, 'POST'),
    lockChannel: (guildId: string, channelId: string) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}/lock`, 'POST'),
    addChannelException: (guildId: string, channelId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/channels/${channelId}/exceptions`, 'POST', target),
    removeChannelException: (guildId: string, channelId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<AntiTamperRules>(
        `/guilds/${guildId}/m/anti-tamper/channels/${channelId}/exceptions/${target.target_type}/${target.target_id}`,
        'DELETE',
      ),
    logs: (guildId: string, query: { page: number; limit: number }) =>
      apiCall<{ logs: AntiTamperLog[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/anti-tamper/logs?page=${query.page}&limit=${query.limit}`,
      ),
    addRoleException: (guildId: string, roleId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<AntiTamperRules>(`/guilds/${guildId}/m/anti-tamper/roles/${roleId}/exceptions`, 'POST', target),
    removeRoleException: (guildId: string, roleId: string, target: Pick<RoleExemption, 'target_type' | 'target_id'>) =>
      apiCall<AntiTamperRules>(
        `/guilds/${guildId}/m/anti-tamper/roles/${roleId}/exceptions/${target.target_type}/${target.target_id}`,
        'DELETE',
      ),
  },
  autoremover: {
    config: (guildId: string) => apiCall<AutoremoverConfig>(`/guilds/${guildId}/m/autoremover/config`),
    updateConfig: (
      guildId: string,
      config: Pick<
        AutoremoverConfig,
        'enabled' | 'ttl_seconds' | 'target_ids' | 'remove_kinds' | 'exclude_mods' | 'exclude_admins' | 'exclude_pinned'
      >,
    ) => apiCall<AutoremoverConfig>(`/guilds/${guildId}/m/autoremover/config`, 'PUT', config),
    items: (guildId: string, query: { status?: string; page: number; limit: number }) =>
      apiCall<{ items: AutoremoverItem[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/autoremover/items?page=${query.page}&limit=${query.limit}${query.status ? `&status=${query.status}` : ''}`,
      ),
    cancel: (guildId: string, id: string) => apiCall<{ success: boolean }>(`/guilds/${guildId}/m/autoremover/items/${id}`, 'DELETE'),
  },
  chatCompletion: {
    config: (guildId: string) => apiCall<ChatCompletionView>(`/guilds/${guildId}/m/chat-completion/config`),
    /** `api_key`: left out keeps the stored key, null removes it, text replaces it. */
    updateConfig: (guildId: string, body: ChatCompletionConfig & { api_key?: string | null }) =>
      apiCall<ChatCompletionView>(`/guilds/${guildId}/m/chat-completion/config`, 'PUT', body),
    test: (guildId: string) => apiCall<ChatCompletionTest>(`/guilds/${guildId}/m/chat-completion/test`, 'POST'),
    stats: (guildId: string, range?: string) =>
      apiCall<ChatCompletionStats>(`/guilds/${guildId}/m/chat-completion/stats${range ? `?range=${range}` : ''}`),
  },
  ocrDetection: {
    config: (guildId: string) => apiCall<OcrDetectionConfig>(`/guilds/${guildId}/m/ocr-detection/config`),
    updateConfig: (guildId: string, config: Pick<OcrDetectionConfig, 'enabled' | 'report_channel_id' | 'threshold' | 'target_ids'>) =>
      apiCall<OcrDetectionConfig>(`/guilds/${guildId}/m/ocr-detection/config`, 'PUT', config),
    terms: (guildId: string) => apiCall<OcrTerms>(`/guilds/${guildId}/m/ocr-detection/terms`),
    saveTerms: (guildId: string, terms: { term: string; is_regex: boolean }[]) =>
      apiCall<OcrTerms>(`/guilds/${guildId}/m/ocr-detection/terms`, 'PUT', { terms }),
    restoreDefaults: (guildId: string) =>
      apiCall<OcrTerms & { restored: number }>(`/guilds/${guildId}/m/ocr-detection/terms/defaults`, 'POST'),
    deleteMessage: (guildId: string, id: string) =>
      apiCall<{ ok: boolean }>(`/guilds/${guildId}/m/ocr-detection/detections/${id}/delete`, 'POST'),
    ignore: (guildId: string, id: string, reason: string) =>
      apiCall<{ ok: boolean }>(`/guilds/${guildId}/m/ocr-detection/detections/${id}/ignore`, 'POST', { reason }),
    detections: (guildId: string, query: { page: number; limit: number; status?: string }) =>
      apiCall<{ items: OcrDetectionItem[]; pending: number; pagination: Pagination }>(
        `/guilds/${guildId}/m/ocr-detection/detections?page=${query.page}&limit=${query.limit}${query.status ? `&status=${query.status}` : ''}`,
      ),
  },
  fileSubmissions: {
    collections: (guildId: string) => apiCall<FileCollections>(`/guilds/${guildId}/m/file-submissions/collections`),
    create: (guildId: string, input: FileCollectionInput) =>
      apiCall<FileCollections>(`/guilds/${guildId}/m/file-submissions/collections`, 'POST', input),
    update: (guildId: string, id: string, input: FileCollectionInput) =>
      apiCall<FileCollections>(`/guilds/${guildId}/m/file-submissions/collections/${id}`, 'PUT', input),
    remove: (guildId: string, id: string) => apiCall<FileCollections>(`/guilds/${guildId}/m/file-submissions/collections/${id}`, 'DELETE'),
    groups: (guildId: string, query: { page: number; limit: number; collectionId?: string }) =>
      apiCall<{ groups: FileSubmissionGroup[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/file-submissions/submissions/groups?page=${query.page}&limit=${query.limit}${query.collectionId ? `&collection_id=${query.collectionId}` : ''}`,
      ),
    submissions: (guildId: string, query: { page: number; limit: number; status: string; collectionId: string; tag: string }) =>
      apiCall<{ submissions: FileSubmissionRow[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/file-submissions/submissions?page=${query.page}&limit=${query.limit}&status=${query.status}&collection_id=${query.collectionId}&tag=${encodeURIComponent(query.tag)}`,
      ),
    approve: (guildId: string, id: string) =>
      apiCall<FileSubmissionRow>(`/guilds/${guildId}/m/file-submissions/submissions/${id}/approve`, 'POST'),
    reject: (guildId: string, id: string, reason: string) =>
      apiCall<FileSubmissionRow>(`/guilds/${guildId}/m/file-submissions/submissions/${id}/reject`, 'POST', { reason }),
    upvotes: (guildId: string, id: string, upvotes: number) =>
      apiCall<FileSubmissionRow>(`/guilds/${guildId}/m/file-submissions/submissions/${id}/upvotes`, 'POST', { upvotes }),
  },
  announcements: {
    templates: (guildId: string) => apiCall<AnnouncementTemplates>(`/guilds/${guildId}/m/announcements/templates`),
    createTemplate: (guildId: string, body: Record<string, unknown>) =>
      apiCall<AnnouncementTemplates>(`/guilds/${guildId}/m/announcements/templates`, 'POST', body),
    updateTemplate: (guildId: string, id: string, body: Record<string, unknown>) =>
      apiCall<AnnouncementTemplates>(`/guilds/${guildId}/m/announcements/templates/${id}`, 'PUT', body),
    removeTemplate: (guildId: string, id: string) =>
      apiCall<AnnouncementTemplates>(`/guilds/${guildId}/m/announcements/templates/${id}`, 'DELETE'),
    list: (guildId: string, query: { page: number; limit: number }) =>
      apiCall<{ announcements: AnnouncementEntry[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/announcements/announcements?page=${query.page}&limit=${query.limit}`,
      ),
    send: (guildId: string, body: Record<string, unknown>) =>
      apiCall<AnnouncementEntry>(`/guilds/${guildId}/m/announcements/announcements`, 'POST', body),
    edit: (guildId: string, id: string, body: Record<string, unknown>) =>
      apiCall<AnnouncementEntry>(`/guilds/${guildId}/m/announcements/announcements/${id}`, 'PUT', body),
    remove: (guildId: string, id: string) =>
      apiCall<{ success: boolean }>(`/guilds/${guildId}/m/announcements/announcements/${id}`, 'DELETE'),
  },
  roleColors: {
    list: (guildId: string) => apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/colors`),
    create: (guildId: string, input: RoleColorInput) => apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/colors`, 'POST', input),
    update: (guildId: string, id: string, input: RoleColorInput) =>
      apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/colors/${id}`, 'PUT', input),
    remove: (guildId: string, id: string) => apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/colors/${id}`, 'DELETE'),
    revert: (guildId: string, changeId: string) =>
      apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/changes/${changeId}/revert`, 'POST'),
    apply: (guildId: string, id: string, colors: string[]) =>
      apiCall<RoleColors>(`/guilds/${guildId}/m/role-colors/colors/${id}/apply`, 'POST', { colors }),
    changes: (guildId: string, query: { page: number; limit: number; colorId?: string }) =>
      apiCall<{ changes: RoleColorChange[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/role-colors/changes?page=${query.page}&limit=${query.limit}${query.colorId ? `&color_id=${query.colorId}` : ''}`,
      ),
  },
  bingo: {
    config: (guildId: string) => apiCall<BingoConfig>(`/guilds/${guildId}/m/bingo/config`),
    saveConfig: (guildId: string, patch: Record<string, unknown>) =>
      apiCall<BingoConfig>(`/guilds/${guildId}/m/bingo/config`, 'PUT', patch),
    testRegex: (guildId: string, pattern: string, text: string) =>
      apiCall<{ match: string | null; index: number | null }>(`/guilds/${guildId}/m/bingo/config/test-regex`, 'POST', { pattern, text }),
    rescan: (guildId: string) => apiCall<{ found: number; created: number }>(`/guilds/${guildId}/m/bingo/channel/rescan`, 'POST'),
    rounds: (guildId: string, query: { page: number; limit: number; status?: string }) =>
      apiCall<{ rounds: BingoRound[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/bingo/threads?page=${query.page}&limit=${query.limit}${query.status ? `&status=${query.status}` : ''}`,
      ),
    round: (guildId: string, id: string) => apiCall<{ round: BingoRound; design: BingoDesign }>(`/guilds/${guildId}/m/bingo/threads/${id}`),
    designs: (guildId: string, query: { page: number; limit: number }) =>
      apiCall<{ designs: BingoDesign[]; pagination: Pagination }>(
        `/guilds/${guildId}/m/bingo/designs?page=${query.page}&limit=${query.limit}`,
      ),
    design: (guildId: string, id: string) => apiCall<BingoDesign>(`/guilds/${guildId}/m/bingo/designs/${id}`),
    createDesign: (guildId: string, body: { board: BingoBoard; round_id: string | null }) =>
      apiCall<BingoDesign & { rescored: number }>(`/guilds/${guildId}/m/bingo/designs`, 'POST', body),
    updateDesign: (guildId: string, id: string, body: { board: BingoBoard; round_id: string | null }) =>
      apiCall<BingoDesign & { rescored: number }>(`/guilds/${guildId}/m/bingo/designs/${id}`, 'PUT', body),
    removeDesign: (guildId: string, id: string) => apiCall<{ removed: boolean }>(`/guilds/${guildId}/m/bingo/designs/${id}`, 'DELETE'),
    saveDesign: (guildId: string, id: string, board: BingoBoard) =>
      apiCall<BingoDesign & { rescored: number }>(`/guilds/${guildId}/m/bingo/threads/${id}/design`, 'PUT', { board }),
    postBoard: (guildId: string, id: string) => apiCall<BingoRound>(`/guilds/${guildId}/m/bingo/threads/${id}/board`, 'POST'),
    answers: (guildId: string, id: string, answers: string) =>
      apiCall<{ rescored: number }>(`/guilds/${guildId}/m/bingo/threads/${id}/answers`, 'POST', { answers }),
    together: (guildId: string, id: string, mode: BingoTogetherMode) =>
      apiCall<{ granted: number; removed: number }>(`/guilds/${guildId}/m/bingo/threads/${id}/together`, 'POST', { mode }),
    setStatus: (guildId: string, id: string, status: BingoRoundStatus) =>
      apiCall<BingoRound>(`/guilds/${guildId}/m/bingo/threads/${id}`, 'PUT', { status }),
    remove: (guildId: string, id: string) => apiCall<{ removed: boolean }>(`/guilds/${guildId}/m/bingo/threads/${id}`, 'DELETE'),
    entries: (guildId: string, id: string, query: { page: number; limit: number }) =>
      apiCall<BingoEntries>(`/guilds/${guildId}/m/bingo/threads/${id}/entries?page=${query.page}&limit=${query.limit}`),
    exportAnswers: (guildId: string, id: string) =>
      apiCall<{ files: { name: string; data: string }[] }>(`/guilds/${guildId}/m/bingo/threads/${id}/export`, 'POST'),
  },
  auditFilters: (guildId: string) => apiCall<AuditFilters>(`/guilds/${guildId}/audit-logs/filters`),
};
