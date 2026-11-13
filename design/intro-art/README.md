# IITransit intro art

Source of truth for the landing page illustration. Nothing in this folder is bundled; the app uses
generated files under `src/landing/`.

| Path | What it is |
| --- | --- |
| `final/iit-transit-final-frame-desktop.svg` | Desktop scene, 1600 × 900 (approved) |
| `final/iit-transit-final-frame-mobile.svg` | Mobile scene, 800 × 1480 (approved) |
| `final/iit-bhubaneswar-main-building.svg`, `railway-station.svg`, `shared-car.svg`, `students.svg` | Components |
| `final/themed/*.app.svg` | Same art with colour roles as CSS classes, for inlining in React |
| `final/themed/*.svg` | Same, with an embedded light/dark style, for standalone viewing |
| `final/preview/*.light.svg`, `*.dark.svg` | Colours baked in (used to make `public/og-image.png`) |
| `final/iitransit-art.css` | Theme stylesheet (copy lives at `src/landing/styles/iitransit-art.css`) |
| `final/theme.py` | The palette: colour roles with light and dark values. Re-run after any art change |
| `final/build_final.py`, `src/build_frames.py` | Compose the scenes from the components |
| `figures/figures.py` | Draws the three students and their seated versions |

Rebuild order after an art change (Python 3, plus `rsvg-convert` only for PNG previews):

1. `cd figures && python3 figures.py`
2. `cd ../src && python3 build_frames.py && python3 build_final.py`
3. `cd ../final && python3 theme.py`
