import {
  isWeather,
  type CharacterScene,
  type SceneSpot,
} from "@aicore-fivem/shared";
import { bool, int, num, record, vec4 } from "./parse";

/** The character screen scene (settings section `characterScene`): parsing and the default scene. */

const spot = (
  x: number,
  y: number,
  z: number,
  heading: number,
  anim: string,
  clip: string,
  cam: [
    distance: number,
    height: number,
    angle: number,
    target: number,
    sway: number,
  ],
): SceneSpot => ({
  ped: { x, y, z, heading },
  anim,
  clip,
  camDistance: cam[0],
  camHeight: cam[1],
  camAngle: cam[2],
  targetHeight: cam[3],
  sway: cam[4],
  blur: false,
  blurNear: 0,
  blurFar: 2,
  blurStrength: 100,
});

/** A Vinewood hills terrace over the city at night, five characters side by side. */
export const DEFAULT_SCENE: CharacterScene = {
  fov: 50,
  time: { enabled: true, hour: 20, minute: 56, weather: "EXTRASUNNY" },
  spots: [
    spot(
      -281.1319,
      727.0618,
      207.8448,
      -20.9096,
      "timetable@mime@01_gc",
      "idle_a",
      [1.15, -0.05, 0, 0.4, 17],
    ),
    spot(
      -281.9063,
      727.9929,
      207.9987,
      -45.4143,
      "amb@world_human_leaning@male@wall@back@foot_up@idle_a",
      "idle_a",
      [1.15, 0.2, -46, 0.4, 20],
    ),
    spot(
      -282.8329,
      729.1763,
      208.039,
      -63.5697,
      "anim@scripted@freemode_npc@fix_agy_ig4_lamar@",
      "lean_wall_idle_03_lamar",
      [1, 0.2, 22, 0.4, 18],
    ),
    spot(
      -283.7728,
      730.2242,
      208.09,
      -64.6121,
      "amb@world_human_leaning@male@wall@back@hands_together@idle_b",
      "idle_e",
      [1.7, -0.1, 22, 0.25, 16],
    ),
    spot(
      -284.6422,
      731.1928,
      208.1435,
      -29.6066,
      "misscarstealfinale",
      "packer_idle_1_trevor",
      [1.75, 0.25, 10, 0.35, 19],
    ),
  ],
};

function readSpot(raw: unknown, fallback: SceneSpot): SceneSpot {
  const s = record(raw);
  return {
    ped: vec4(s.ped, fallback.ped),
    anim:
      typeof s.anim === "string" ? s.anim.trim().slice(0, 64) : fallback.anim,
    clip:
      typeof s.clip === "string" ? s.clip.trim().slice(0, 64) : fallback.clip,
    camDistance: num(s.camDistance, fallback.camDistance, 0.3, 15),
    camHeight: num(s.camHeight, fallback.camHeight, -2, 2),
    camAngle: num(s.camAngle, fallback.camAngle, -180, 180),
    targetHeight: num(s.targetHeight, fallback.targetHeight, -2, 3),
    sway: num(s.sway, fallback.sway, 0, 45),
    blur: bool(s.blur, fallback.blur),
    blurNear: num(s.blurNear, fallback.blurNear, 0, 50),
    blurFar: num(s.blurFar, fallback.blurFar, 0, 100),
    blurStrength: num(s.blurStrength, fallback.blurStrength, 0, 100),
  };
}

export function readScene(raw: unknown): CharacterScene {
  const s = record(raw);
  const time = record(s.time);
  const list = Array.isArray(s.spots) ? s.spots.slice(0, 10) : [];
  const spots = list.map((value, i) =>
    readSpot(value, DEFAULT_SCENE.spots[i] ?? DEFAULT_SCENE.spots[0]!),
  );
  return {
    fov: num(s.fov, DEFAULT_SCENE.fov, 20, 90),
    time: {
      enabled: bool(time.enabled, DEFAULT_SCENE.time.enabled),
      hour: int(time.hour, DEFAULT_SCENE.time.hour, 0, 23),
      minute: int(time.minute, DEFAULT_SCENE.time.minute, 0, 59),
      weather: isWeather(time.weather)
        ? time.weather
        : DEFAULT_SCENE.time.weather,
    },
    spots: spots.length ? spots : DEFAULT_SCENE.spots,
  };
}
