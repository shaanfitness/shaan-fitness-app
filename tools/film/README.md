# Home page film

The home page hero is a short film rendered ahead of time in Blender (Cycles) and played in the browser
(`src/site/hero/FilmHero.tsx`): 192 frames per screen shape, the logo as a machine on a black stage.

- Frames 0-39: the emblem assembles itself out of white smoke (the blue core spins up, the barbell slides in, the
  ring, the S and the F lock on). This part plays by itself on the first visit.
- Frame 40: the finished emblem. Scrolling starts here.
- 40-76 a slow move round to the front; 76-112 a close glide over the red plate; 108-132 the letters open like
  doors on the blue turbine core; 136-164 the metal gives way to a glowing blue wireframe at dusk; 164-191 sunrise.

Files:

- `emblem.py` builds everything in code from the traced logo and renders it:
  `python3 emblem.py --fmt land|port --frames 0-191 --scale 1 --spp 6 --out out`
  (1280×720 for `land`, 720×1280 for `port`; `SKIP_EXISTING=1` skips frames already in `out`.)
  Every frame's state is computed from its number, so any frame renders on its own.
- `post.py` finishes the frames (soft bloom, vignette, fine grain) and writes the WebP sequence the site plays:
  `python3 post.py out ../../public/film` (add `--blend` to fill frames not rendered yet from their neighbours).
- `logo.json` is the traced logo (same paths as `src/site/hero/logoPaths.ts`).

Needs `pip install bpy shapely numpy pillow` (Blender as a Python module, 5.x). No other assets: the smoke, sky,
ground and metal are procedural.

Rendering takes about 30 seconds a frame per format on 2 CPU cores.

The camera path is the `KEYS` table in `emblem.py`: frame, angle round, angle up, distance, look-at right, look-at
up, lens, f-stop, emblem turn. The chapters in `FilmHero.tsx` (`CHAPTER_AT`) follow the timeline in `set_frame`.
