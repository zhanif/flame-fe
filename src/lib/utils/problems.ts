/** The long reasons the API gives for a role or channel the bot cannot manage, as the few words a picker has room for.
 *  The full text stays as the tooltip. */
export const shortRoleProblem = (problem: string): string => {
  if (problem.includes('integration')) return 'Integration';
  if (problem.includes('above')) return 'Above the bot';
  if (problem.includes('Manage Roles')) return 'Needs Manage Roles';
  return 'Unavailable';
};

export const shortChannelProblem = (problem: string): string => {
  if (problem.includes('View Channel')) return 'No access';
  if (problem.includes('Manage Roles')) return 'Needs Manage Roles';
  return 'Unavailable';
};

/** What kind of problem it is, which decides how the item looks: an integration role is linked (it is not ours to
 *  touch), a role above the bot is locked, and a missing permission only dims it (the page warns about it). */
export type ProblemKind = 'integration' | 'above' | 'permission';

export const problemKind = (problem: string): ProblemKind => {
  if (problem.includes('integration')) return 'integration';
  if (problem.includes('above')) return 'above';
  return 'permission';
};
