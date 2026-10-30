export {
  bool,
  int,
  num,
  record,
  str,
  vec4,
  type Vec4,
} from "@aicore-fivem/lib/shared"

/** Lowercase ids for jobs, gangs and accounts: letters, digits, underscores, 2-32 long. */
export const ID_PATTERN = /^[a-z0-9_]{2,32}$/
