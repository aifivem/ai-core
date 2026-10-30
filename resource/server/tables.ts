// Generated from sql/main.sql by aicore-db-types (the build runs it). Do not edit: change the SQL and build.

/** Row of each table as @aicore-fivem/mysql returns it. */
export type Tables = {
  ai_core_users: {
    id: number;
    fivem: string;
    license: string | null;
    discord: string | null;
    name: string;
    char_slots: number | null;
    created_at: number;
    last_seen: number;
  };
  ai_core_characters: {
    id: number;
    user_id: number;
    citizenid: string;
    slot: number;
    firstname: string;
    lastname: string;
    birthdate: number;
    sex: string;
    nationality: string;
    pos_x: number | null;
    pos_y: number | null;
    pos_z: number | null;
    pos_h: number | null;
    metadata: string;
    created_at: number;
    last_played: number | null;
    deleted_at: number | null;
  };
  ai_core_accounts: {
    id: number;
    owner_type: string;
    owner_id: string;
    name: string;
    balance: number | string;
  };
  ai_core_transactions: {
    id: number | string;
    account_id: number;
    amount: number | string;
    balance_after: number | string;
    reason: string;
    actor: string | null;
    created_at: number;
  };
  ai_core_character_jobs: {
    char_id: number;
    job: string;
    grade: number;
  };
  ai_core_character_gangs: {
    char_id: number;
    gang: string;
    grade: number;
    active: boolean;
  };
};

/** What an INSERT needs: columns with a default, NULL or AUTO_INCREMENT may be left out. */
export type TableInserts = {
  ai_core_users: {
    id?: number;
    fivem: string;
    license?: string | null;
    discord?: string | null;
    name?: string;
    char_slots?: number | null;
    created_at?: number;
    last_seen?: number;
  };
  ai_core_characters: {
    id?: number;
    user_id: number;
    citizenid: string;
    slot: number;
    firstname: string;
    lastname: string;
    birthdate: number;
    sex: string;
    nationality?: string;
    pos_x?: number | null;
    pos_y?: number | null;
    pos_z?: number | null;
    pos_h?: number | null;
    metadata?: string;
    created_at?: number;
    last_played?: number | null;
    deleted_at?: number | null;
  };
  ai_core_accounts: {
    id?: number;
    owner_type: string;
    owner_id: string;
    name: string;
    balance?: number | string;
  };
  ai_core_transactions: {
    id?: number | string;
    account_id: number;
    amount: number | string;
    balance_after: number | string;
    reason: string;
    actor?: string | null;
    created_at?: number;
  };
  ai_core_character_jobs: {
    char_id: number;
    job: string;
    grade?: number;
  };
  ai_core_character_gangs: {
    char_id: number;
    gang: string;
    grade?: number;
    active?: boolean;
  };
};
