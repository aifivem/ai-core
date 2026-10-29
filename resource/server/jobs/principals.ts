/**
 * Mirrors memberships into FiveM ACL principals so any resource, ai or not, can check them with
 * `IsPlayerAceAllowed(src, "ai.job.police")` or `"ai.job.police.2"` (grade). ACLs are not persistent: they are
 * added when a character loads or changes, and removed when it unloads. Needs the `command.add_principal` and
 * `command.remove_principal` ACEs for resource.ai-core (permission.cfg).
 */

const principal = (kind: "job" | "gang", name: string, grade?: number): string =>
  grade === undefined ? `ai.${kind}.${name}` : `ai.${kind}.${name}.${grade}`;

/** Group principals of one membership: the name itself and every grade up to the player's. */
function groups(kind: "job" | "gang", name: string, grade: number): string[] {
  const list = [principal(kind, name)];
  for (let g = 0; g <= grade; g++) list.push(principal(kind, name, g));
  return list;
}

export function addMembership(source: number, kind: "job" | "gang", name: string, grade: number): void {
  for (const group of groups(kind, name, grade)) ExecuteCommand(`add_principal player.${source} ${group}`);
}

export function removeMembership(source: number, kind: "job" | "gang", name: string, grade: number): void {
  for (const group of groups(kind, name, grade)) ExecuteCommand(`remove_principal player.${source} ${group}`);
}
