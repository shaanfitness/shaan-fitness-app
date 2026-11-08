# Home page film

The home page hero is a short film rendered ahead of time in Blender (Cycles) and scrubbed by scroll in the browser
(`src/site/hero/FilmHero.tsx`). One continuous shot: the street at blue hour, up PNR Enclave to the 5th floor sign,
through the glass into reception, across the gym floor, and into the assessment scan.

- `scene.py` builds the whole scene in code (building, reception, gym floor, lights, camera path, scan) and renders
  any frames: `python3 scene.py --fmt land|port --frames 0-159 --scale 1 --spp 8 --out out/land`
- `encode.py` turns the PNG frames into WebP in `public/film/{land,port}/NNN.webp` (160 frames each).
- `logo.json` is the traced logo (same paths as `src/site/hero/logoPaths.ts`).

Needs `pip install bpy` (Blender as a Python module, 5.x) and, next to this folder in `../fonts` and `../mh`:

- Fonts (SIL Open Font License): Manrope and Bodoni Moda from github.com/google/fonts, as static instances
  `Manrope-ExtraBold.ttf`, `Manrope-SemiBold.ttf`, `BodoniModa-96-Medium.ttf` (fontTools `instancer`).
- The human body (CC0): MakeHuman's `base.obj` and the macro/shape `.target` files named in `scene.py`, from
  github.com/makehumancommunity/makehuman (`makehuman/data/3dobjs`, `makehuman/data/targets`).

Rendering takes about 20 seconds a frame per format on 2 CPU cores. The 3D building and rooms are an
interpretation, not a survey of the real studio; with photos of the space, the scene can be matched to it.
