import type {
  CharacterView,
  OnlineRow,
  PlayersAction,
  SearchPage,
  StoredRow,
} from "../../../resource/common/adminPlayers";

/**
 * Browser preview only: answers of the Players section (`?view=admin#/admin/players`, `?char=<id>` for one
 * character; char 2 is offline). Edits answer ok without a delta; `&error=1` refuses them.
 */
const refuse = new URLSearchParams(window.location.search).get("error") === "1";

const NAMES = [
  ["Marcus", "Reed", "police", 3, true],
  ["Lena", "Okafor", "ambulance", 1, true],
  ["Tony", "Vasquez", "mechanic", 2, false],
  ["Ivy", "Chen", "unemployed", 0, false],
  ["Dmitri", "Volkov", "mechanic", 0, true],
  ["Sofia", "Marquez", "police", 1, false],
  ["Jamal", "Brooks", "unemployed", 0, false],
  ["Hana", "Sato", "ambulance", 2, true],
] as const;

const IDS = [1, 3, 4, 5, 6, 7, 8, 9];
const online: OnlineRow[] = NAMES.map(([first, last, job, grade, duty], i) => ({
  source: [3, 7, 12, 15, 21, 28, 34, 40][i] ?? i,
  charId: IDS[i] ?? i,
  citizenid: String(IDS[i] ?? i),
  name: `${first} ${last}`,
  account: `${first.toLowerCase()}_${last.toLowerCase().slice(0, 3)}`,
  job,
  grade,
  duty,
}));

const stored: StoredRow[] = [
  ...online.map((r) => ({
    charId: r.charId,
    citizenid: r.citizenid,
    name: r.name,
    account: r.account,
    lastPlayed: Date.now(),
    source: r.source,
  })),
  {
    charId: 2,
    citizenid: "2",
    name: "Johnny Silva",
    account: "johnny_s",
    lastPlayed: Date.now() - 86_400_000 * 3,
    source: null,
  },
  {
    charId: 11,
    citizenid: "11",
    name: "Joanna Price",
    account: "jo_price",
    lastPlayed: Date.now() - 86_400_000 * 40,
    source: null,
  },
  {
    charId: 14,
    citizenid: "14",
    name: "Jordan Hale",
    account: "jhale",
    lastPlayed: null,
    source: null,
  },
];

function view(charId: number): CharacterView | null {
  const row = stored.find((r) => r.charId === charId);
  if (!row) return null;
  const [firstname = "", lastname = ""] = row.name.split(" ");
  const live = online.find((r) => r.charId === charId);
  return {
    charId,
    citizenid: row.citizenid,
    slot: 1,
    firstname,
    lastname,
    birthdate: "1994-06-12",
    sex: "male",
    nationality: "American",
    user: {
      id: charId + 100,
      fivem: String(1_204_331 + charId),
      license: "3f2a9c41d0e8b7a6c5d4e3f2a1b0c9d8e7f6a5b4",
      discord: "301234567890123456",
      name: row.account,
    },
    source: live?.source ?? null,
    money: { cash: 2450, bank: 186_300, black_money: 0, crypto: 12 },
    jobs: live
      ? [
          { job: live.job === "unemployed" ? "mechanic" : live.job, grade: 2 },
          { job: live.job === "police" ? "mechanic" : "police", grade: 0 },
        ]
      : [{ job: "mechanic", grade: 1 }],
    duty: live?.duty ? live.job : null,
    gangs: [{ gang: "ballas", grade: 1 }],
    activeGang: "ballas",
    metadata: {
      hunger: 72,
      thirst: 64,
      stress: 8,
      armor: 0,
      isdead: false,
      bloodtype: "A+",
      callsign: "2-ADAM-12",
      licences: { driver: true, weapon: false },
    },
    position: { x: 215.76, y: -810.12, z: 30.73, heading: 157.5 },
    lastPlayed: row.lastPlayed,
  };
}

function search(query: string, cursor: number | null): SearchPage {
  const q = query.trim().toLowerCase();
  const rows = stored
    .filter(
      (r) =>
        r.name
          .toLowerCase()
          .split(" ")
          .some((part) => part.startsWith(q)) || r.citizenid === q,
    )
    .filter((r) => cursor === null || r.charId < cursor)
    .sort((a, b) => b.charId - a.charId);
  return { rows, next: null };
}

export function mockPlayers(action: PlayersAction, args: unknown[]): unknown {
  switch (action) {
    case "online":
      return online;
    case "search":
      return search(
        typeof args[0] === "string" ? args[0] : "",
        typeof args[1] === "number" ? args[1] : null,
      );
    case "open":
      return view(typeof args[0] === "number" ? args[0] : 0);
    case "close":
      return { ok: true };
    default:
      return refuse
        ? { ok: false, error: "ADMIN_PLAYERS_ERR_BUSY" }
        : { ok: true };
  }
}
