import {
  Keybind,
  optionalExport,
  registerExport,
} from "@aicore-fivem/lib/client"
import { logSafe } from "@aicore-fivem/lib/shared"
import { CORE } from "@aicore-fivem/shared"
import { Locale, ResourceName } from "common"
import { NuiMessage } from "common/nui"

interface Prompt {
  resource: string
  id: string
}

/**
 * The prompts on the right of the screen ("[E] Browse the clothing store"), shown and hidden by any resource. One
 * rebindable interaction key acts on a focused ai-target marker first, else on the prompt on top (the last one
 * shown) and tells its resource; nobody polls keys per frame.
 */
class Prompts {
  private readonly list = new Map<string, Prompt>()
  private readonly key = new Keybind({
    name: "aicore_interact",
    description: Locale("KEYBIND_INTERACT"),
    defaultKey: "E",
    onPressed: () => this.press(),
  })

  show(resource: string, id: string, text: string): void {
    const key = `${resource}:${id}`
    this.list.delete(key)
    this.list.set(key, { resource, id })
    // A key bound to a mouse button or pad comes back as an icon code; the letter is shown only for keyboard keys.
    const label = this.key.currentKey
    SendNUIMessage({
      action: NuiMessage.promptShow,
      data: {
        key,
        text: logSafe(text, 120),
        button: /^[\w]{1,6}$/.test(label) ? label : "E",
      },
    })
  }

  hide(resource: string, id: string): void {
    const key = `${resource}:${id}`
    if (!this.list.delete(key)) return
    SendNUIMessage({ action: NuiMessage.promptHide, data: key })
  }

  /** A stopped resource takes its prompts with it. */
  drop(resource: string): void {
    // Deleting the visited entry while walking a Map is safe.
    for (const prompt of this.list.values())
      if (prompt.resource === resource) this.hide(resource, prompt.id)
  }

  private press(): void {
    if (IsNuiFocused() || IsPauseMenuActive()) return
    // A focused target marker goes first: one key for targets and prompts.
    if (optionalExport("ai-target")?.HandleInteract() === true) return
    const top = [...this.list.values()].at(-1)
    if (top) emit(CORE.clientPromptPressedEvent, top.resource, top.id)
  }
}

const prompts = new Prompts()

registerExport("ShowPrompt", (id: unknown, text: unknown) => {
  if (typeof id === "string" && typeof text === "string")
    prompts.show(GetInvokingResource() || ResourceName, id, text)
})
registerExport("HidePrompt", (id: unknown) => {
  if (typeof id === "string")
    prompts.hide(GetInvokingResource() || ResourceName, id)
})
on("onClientResourceStop", (resource: string) => prompts.drop(resource))
