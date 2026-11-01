import { App } from "./App";
import { AdminRoot } from "./features/admin/AdminRoot";
import { ItemPicker } from "./features/dialogs/ItemPicker";
import { Keyboard } from "./features/keyboard/Keyboard";
import { Welcome } from "./features/setup/Welcome";

/** The root route's view: every screen of the page, each showing itself when it is open. */
export function Root() {
  return (
    <>
      <App />
      <ItemPicker />
      <Keyboard />
      <AdminRoot />
      <Welcome />
    </>
  );
}
