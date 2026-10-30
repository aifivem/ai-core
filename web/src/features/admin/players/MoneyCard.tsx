import { useState } from "react";
import { faWallet } from "@fortawesome/free-solid-svg-icons";
import type {
  CharacterView,
  MoneyMode,
} from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { runAction } from "./actions";
import { useDefs } from "./defs";
import {
  formatMoney,
  Note,
  PCard,
  Row,
  Rows,
  useAction,
  type T,
} from "./parts";

/** Balances per account and one change form (add, remove or set, with the reason that goes into the ledger). */
export function MoneyCard({ view, t }: { view: CharacterView; t: T }) {
  const defs = useDefs();
  const accounts = Object.keys(view.money);
  const [account, setAccount] = useState(accounts[0] ?? "cash");
  const [mode, setMode] = useState<MoneyMode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { busy, note, run } = useAction();
  const n = Number(amount);
  const valid =
    amount.trim() !== "" &&
    Number.isSafeInteger(n) &&
    n >= (mode === "set" ? 0 : 1) &&
    reason.trim().length >= 3;

  const apply = async () => {
    const ok = await run(() =>
      runAction("money", [view.charId, account, mode, n, reason.trim()]),
    );
    if (ok) setAmount("");
  };

  return (
    <PCard
      icon={faWallet}
      title={t("ADMIN_PLAYERS_C_MONEY")}
      desc={t("ADMIN_PLAYERS_C_MONEY_DESC")}
    >
      <Rows>
        {accounts.map((name) => (
          <Row key={name} label={defs.account(name)}>
            <span className="font-semibold tabular-nums">
              {formatMoney(view.money[name] ?? 0)}
            </span>
          </Row>
        ))}
      </Rows>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-[1vh]">
        <Select
          value={account}
          aria-label={t("ADMIN_PLAYERS_C_MONEY")}
          options={accounts.map((name) => ({
            value: name,
            label: defs.account(name),
          }))}
          onChange={setAccount}
        />
        <Select
          value={mode}
          aria-label={t("ADMIN_PLAYERS_APPLY")}
          options={[
            { value: "add", label: t("ADMIN_PLAYERS_ADD") },
            { value: "remove", label: t("ADMIN_PLAYERS_REMOVE") },
            { value: "set", label: t("ADMIN_PLAYERS_SET") },
          ]}
          onChange={(m) => setMode(m === "remove" || m === "set" ? m : "add")}
        />
        <Input
          inputMode="numeric"
          value={amount}
          placeholder={t("ADMIN_PLAYERS_AMOUNT")}
          aria-label={t("ADMIN_PLAYERS_AMOUNT")}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>
      <div className="flex items-center gap-[1vh]">
        <Input
          value={reason}
          maxLength={64}
          placeholder={t("ADMIN_PLAYERS_REASON_PH")}
          aria-label={t("ADMIN_PLAYERS_REASON")}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button disabled={!valid} busy={busy} onClick={() => void apply()}>
          {t("ADMIN_PLAYERS_APPLY")}
        </Button>
      </div>
      <Note note={note} t={t} />
    </PCard>
  );
}
