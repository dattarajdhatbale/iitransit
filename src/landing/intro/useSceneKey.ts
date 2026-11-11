import type { SceneKey } from "../scenes/sceneGeometry";
import { useMediaQuery } from "./useMediaQuery";

// Portrait screens (phones, upright tablets) get the tall mobile scene; landscape screens get desktop.
// The scene follows rotation live.
export function useSceneKey(): SceneKey {
  return useMediaQuery("(orientation: portrait)") ? "mobile" : "desktop";
}
