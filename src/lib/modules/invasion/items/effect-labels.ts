import type { InvasionEffectDomain, InvasionEffectFamily, InvasionEffectType } from '$lib/api/endpoints';

/** Human labels for the effect's fixed enums, shared by the effect reference list and the item's effect editor. */
export const EFFECT_TYPE_LABELS: Record<InvasionEffectType, string> = {
  instant_self: 'Instant (Self)',
  instant_target: 'Instant (Target)',
  buff: 'Buff',
  debuff: 'Debuff',
  polarity: 'Polarity',
};

export const EFFECT_DOMAIN_LABELS: Record<InvasionEffectDomain, string> = {
  defensive: 'Defensive',
  offensive: 'Offensive',
  perception: 'Perception',
  amplifier: 'Amplifier',
  debilitator: 'Debilitator',
  control: 'Control',
  cleanser: 'Cleanser',
  denial: 'Denial',
  immunity: 'Immunity',
  revival: 'Revival',
  decisive: 'Decisive',
};

export const EFFECT_FAMILY_LABELS: Record<InvasionEffectFamily, string> = {
  proc_chance: 'Proc chance',
  turn_chance: 'Turn chance',
  cleansable: 'Cleansable',
};

export const familyLabel = (family: InvasionEffectFamily) => EFFECT_FAMILY_LABELS[family] ?? family;
