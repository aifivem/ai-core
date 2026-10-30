import { AnimatePresence, motion } from "motion/react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCity, faPlay, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import type { Branding } from "@aicore-fivem/shared"
import {
  PillBar,
  PillButton,
  ScreenHeader,
  Vignette,
  columnDelay,
  screenEnter,
} from "../../components/Screen"
import { useLang } from "../../lib/lang"
import { cn } from "../../lib/utils"
import { play, selectCard } from "./actions"
import { CharacterCard, CreateCard } from "./CharacterCard"
import { CharacterDetails } from "./CharacterDetails"
import { CreateDialog } from "./CreateDialog"
import { DeleteDialog } from "./DeleteDialog"
import { update, useScreen } from "./store"

/** Server name, subtitle and tagline, bottom left. */
function Brand({ branding }: { branding: Branding }) {
  const tagline = [branding.tagline, branding.taglineSub]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className="flex items-center gap-[1.2vh]">
      <FontAwesomeIcon icon={faCity} className="text-[3.2vh] text-tgi-green" />
      <div className="flex flex-col gap-[0.3vh]">
        <span className="text-[1.6vh] leading-[1.2] font-bold uppercase">
          {branding.name} {branding.subtitle}
        </span>
        {tagline && (
          <span className="text-[1.3vh] leading-[1.3] text-text-3">
            {tagline}
          </span>
        )}
      </div>
    </div>
  )
}

/** A refused action (a lang key), top centre (tgiann NotifBox line). */
function ErrorLine({ text }: { text: string }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: "-2vh" }}
      animate={{ opacity: 1, y: "0vh" }}
      exit={{
        opacity: 0,
        y: "-1.2vh",
        transition: { duration: 0.15, ease: "easeOut" },
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute inset-x-0 top-[9vh] mx-auto w-max max-w-[44vh] rounded-[0.5vh] border-l-[0.4vh] border-l-danger-solid bg-black/70 px-[1.5vh] py-[1vh] text-center text-[1.5vh] leading-[1.4]"
    >
      {text}
    </motion.div>
  )
}

/** Character select (docs/design.md, tgiann-multichar): title and details left, slot row bottom centre, actions bottom right. */
export function CharacterScreen() {
  const t = useLang()
  const { open, screen, selected, view, busy, error, portraits, scene } =
    useScreen()
  if (!open || !screen) return null

  const slots = Array.from({ length: screen.slots }, (_, i) => i + 1)
  const card = screen.characters.find((c) => c.id === selected)
  const deleting =
    view.kind === "delete"
      ? screen.characters.find((c) => c.id === view.characterId)
      : undefined

  return (
    <div className={cn("absolute inset-0 animate-fade", !scene && "bg-page")}>
      {!scene && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(./backgrounds/${screen.branding.background}.jpg)`,
          }}
        />
      )}
      <Vignette variant={scene ? "sceneRadial" : "radial"} />
      <Vignette variant={scene ? "sceneLeft" : "left"} />

      {view.kind === "create" ? (
        <CreateDialog slot={view.slot} />
      ) : (
        <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-[4vh] p-[2.4vh]">
          <motion.div
            {...screenEnter}
            transition={columnDelay(0)}
            className="flex min-h-0 flex-col justify-between"
          >
            <ScreenHeader
              title={t("CHAR_TITLE")}
              desc={t("CHAR_SUBTITLE", screen.characters.length, screen.slots)}
            />
            <CharacterDetails card={card} />
            <Brand branding={screen.branding} />
          </motion.div>
          <motion.div
            {...screenEnter}
            transition={columnDelay(1)}
            className="flex min-h-0 items-end justify-center gap-[2vh] pb-[1vh]"
          >
            {slots.map((slot) => {
              const character = screen.characters.find((c) => c.slot === slot)
              if (!character)
                return (
                  <CreateCard
                    key={slot}
                    busy={busy}
                    onCreate={() =>
                      update({ view: { kind: "create", slot }, error: null })
                    }
                  />
                )
              return (
                <CharacterCard
                  key={slot}
                  card={character}
                  portrait={portraits[character.id]}
                  selected={selected === character.id}
                  busy={busy}
                  onSelect={() => selectCard(character.id)}
                  onPlay={() => void play(character.id)}
                />
              )
            })}
          </motion.div>
          <motion.div
            {...screenEnter}
            transition={columnDelay(2)}
            className="flex min-h-0 flex-col items-end justify-end"
          >
            {card && (
              <PillBar>
                {screen.canDelete && (
                  <PillButton
                    label={t("CHAR_DELETE")}
                    icon={faTrashCan}
                    variant="danger"
                    iconOnly
                    disabled={card.online || busy}
                    onClick={() =>
                      update({
                        view: { kind: "delete", characterId: card.id },
                        error: null,
                      })
                    }
                  />
                )}
                <PillButton
                  label={t("CHAR_PLAY")}
                  icon={faPlay}
                  disabled={card.online}
                  pending={busy}
                  onClick={() => void play(card.id)}
                />
              </PillBar>
            )}
          </motion.div>
        </div>
      )}

      <DeleteDialog card={deleting} />
      <AnimatePresence>
        {error && <ErrorLine key={error} text={t(error)} />}
      </AnimatePresence>
    </div>
  )
}
