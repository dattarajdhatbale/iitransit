interface ScreenshotProps {
  /** The app in its light theme. */
  light: { src: string; width: number; height: number };
  /** The app in its dark theme. Leave out where only the light version is ever shown. */
  dark?: { src: string; width: number; height: number };
  /** Keep the bottom of the screen in the app's background colour when the shot is shorter. */
  fit?: "cover" | "top";
}

// A real screenshot of the app inside a mock phone screen. With both versions given, the one that
// contrasts with the page shows (set by the phone's tone, see landing.css); the other is lazy and
// hidden, so the browser never downloads it.
export function Screenshot({ light, dark, fit = "cover" }: ScreenshotProps) {
  return (
    <div className={`lp-shot lp-shot-${fit}`}>
      <img className="lp-shot-l" src={light.src} width={light.width} height={light.height} alt="" loading="lazy" decoding="async" />
      {dark && <img className="lp-shot-d" src={dark.src} width={dark.width} height={dark.height} alt="" loading="lazy" decoding="async" />}
    </div>
  );
}

export const SHOTS = {
  homeLight: { src: "/landing/screens/home-light.webp", width: 600, height: 1103 },
  postLight: { src: "/landing/screens/post-light.webp", width: 600, height: 1120 },
};
