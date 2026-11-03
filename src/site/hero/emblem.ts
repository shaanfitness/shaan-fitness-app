// The hero: the Shaan Fitness logo as a 3D metal emblem in smoke, lit red and blue, glowing on its brightest edges,
// with a giant SHAAN far behind it. Scrolling plays the chapters:
//   pride    the emblem arrives out of the dark (on load), light sweeping over it
//   coached  the camera moves in close over the machined edges, then round to a three-quarter view
//   planned  the metal falls away to a glowing blue blueprint over a grid
//   ignite   the barbell burns hot and throws sparks
//   (exit)   the emblem breaks apart into embers that drift up as you scroll on into the site
// Loaded only in the browser after the page has painted; lighter on phones; one still frame for reduced motion.
// It watches its own frame rate: on a slow device it first renders fewer pixels, then drops the glow, and if that
// still isn't smooth it hands back to the flat logo.
import {
  ACESFilmicToneMapping, AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, EdgesGeometry, ExtrudeGeometry,
  Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, NormalBlending, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, PointsMaterial, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3,
  WebGLRenderer, type Material,
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { LOGO } from './logoPaths'

export interface Emblem { setProgress: (p: number) => void; stop: () => void }
interface Options {
  mobile: boolean
  still: boolean
  onReady: () => void
  /** The device can't keep up even at the lowest quality: the flat logo takes over. */
  onFail?: () => void
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const mix = (a: number, b: number, t: number) => a + (b - a) * t

// [progress, camX, camY, camZ, lookX, lookY, rotY, rotX]
const KEYS: number[][] = [
  [0.0, 0, 0.15, 7.6, 0, 0, -0.42, 0.1],
  [0.17, 0, 0.05, 6.6, 0, 0, -0.14, 0.04],
  [0.3, 0.75, 0.42, 2.5, -0.35, 0.32, 0.62, -0.02],
  [0.44, 2.0, 0.55, 4.7, 0, 0, 0.55, -0.06],
  [0.6, -2.6, 1.0, 5.5, 0, 0, -0.95, 0.12],
  [0.8, 0, 0.4, 6.3, 0, 0, 0, 0],
  [1.0, 0, 0.35, 7.0, 0, 0.2, 0.1, 0],
]
function pose(p: number) {
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++
  const a = KEYS[i], b = KEYS[i + 1]
  const t = smooth(a[0], b[0], p)
  const v = (k: number) => mix(a[k], b[k], t)
  return { x: v(1), y: v(2), z: v(3), lx: v(4), ly: v(5), ry: v(6), rx: v(7) }
}

const SMOKE_VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
const smokeFrag = (oct: number) => `
precision mediump float;
varying vec2 vUv;uniform float t;uniform float seed;uniform vec3 col;uniform float op;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<${oct};i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 p=vUv*3.+seed;
  vec2 q=vec2(fbm(p+vec2(0.,t*.05)),fbm(p+vec2(5.2,1.3)-t*.04));
  float f=fbm(p+2.2*q+vec2(t*.03,-t*.02));
  float edge=smoothstep(.5,.06,length(vUv-.5));
  float a=smoothstep(.42,.92,f)*edge*op;
  gl_FragColor=vec4(col*(.5+.7*f),a);
}`

function dotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

/** The giant SHAAN far behind the emblem: outlined letters, faintly filled. */
function wordTexture() {
  const c = document.createElement('canvas')
  c.width = 2048; c.height = 560
  const x = c.getContext('2d')!
  x.font = '900 470px "Archivo Variable", "Arial Black", sans-serif'
  const any = x as CanvasRenderingContext2D & { fontStretch?: string }
  if ('fontStretch' in any) any.fontStretch = 'expanded'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  const g = x.createLinearGradient(0, 60, 0, 520)
  g.addColorStop(0, 'rgba(242,239,233,.07)'); g.addColorStop(1, 'rgba(242,239,233,0)')
  x.fillStyle = g
  x.fillText('SHAAN', 1024, 300)
  x.lineWidth = 2
  x.strokeStyle = 'rgba(242,239,233,.14)'
  x.strokeText('SHAAN', 1024, 300)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

export function startEmblem(canvas: HTMLCanvasElement, opts: Options): Emblem | null {
  // Pinned to full quality, even on a software renderer (for recording the sequence in a headless browser).
  const fixed = (window as { __sfFixedQuality?: boolean }).__sfFixedQuality === true
  // No WebGL 2, or only a software renderer (an old or blocklisted GPU, where the first frame alone can freeze the
  // page for seconds): the flat logo stays.
  const ctx = canvas.getContext('webgl2', {
    alpha: false, antialias: !opts.mobile, depth: true, stencil: false, powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: !fixed,
  })
  if (!ctx) return null
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, context: ctx, antialias: !opts.mobile, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  let dpr = Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75)
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.setClearColor(0x030304, 1)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  // The studio lights in the reflection sit low and to the side, like stage footlights, so upward edges stay dark.
  scene.environmentRotation.set(Math.PI * 0.82, 0.6, 0)
  const camera = new PerspectiveCamera(opts.mobile ? 46 : 34, 1, 0.1, 100)

  // Giant word far behind.
  const wordTex = wordTexture()
  const wordMat = new MeshBasicMaterial({ map: wordTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false })
  const word = new Mesh(new PlaneGeometry(24, 6.56), wordMat)
  word.position.set(0, 0.35, -7.5)
  scene.add(word)

  // The emblem: each colour of the logo extruded, bevelled edges catching the light.
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${LOGO.white}"/><path d="${LOGO.red}"/><path d="${LOGO.blue}"/></svg>`)
  const holder = new Group()
  const emblem = new Group()
  holder.add(emblem)
  scene.add(holder)
  const S = 4.4 / 512
  emblem.scale.set(S, -S, S)
  emblem.position.set(-256 * S, 256 * S, 0)
  const faces = {
    white: new MeshPhysicalMaterial({ color: 0xe9e9ef, metalness: 1, roughness: 0.24, envMapIntensity: 0.45 }),
    red: new MeshPhysicalMaterial({ color: 0xd0101e, metalness: 0.78, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.6, emissive: new Color(0xff1020), emissiveIntensity: 0.04 }),
    blue: new MeshPhysicalMaterial({ color: 0x1192dc, metalness: 0.78, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.6, emissive: new Color(0x0a7fd0), emissiveIntensity: 0.04 }),
  }
  const sides = {
    white: new MeshPhysicalMaterial({ color: 0x8c8c96, metalness: 1, roughness: 0.26, envMapIntensity: 0.7 }),
    red: new MeshPhysicalMaterial({ color: 0x5c0710, metalness: 0.95, roughness: 0.24, envMapIntensity: 0.55 }),
    blue: new MeshPhysicalMaterial({ color: 0x06365a, metalness: 0.95, roughness: 0.24, envMapIntensity: 0.55 }),
  }
  const tint = { white: new Color(0xf2efe9), red: new Color(0xff3a3a), blue: new Color(0x34b4ff) }
  const depth = { white: 26, red: 40, blue: 40 }
  const order = ['white', 'red', 'blue'] as const
  const solids: Mesh[] = []
  const wires: LineSegments[] = []
  const wireMat = new LineBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
  const dustPos: number[] = [], dustCol: number[] = []
  emblem.updateMatrixWorld(true)
  svg.paths.forEach((path, i) => {
    const key = order[i]
    const geo = new ExtrudeGeometry(path.toShapes(), {
      depth: depth[key], bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: opts.mobile ? 2 : 4, curveSegments: opts.mobile ? 6 : 10,
    })
    geo.translate(0, 0, key === 'white' ? -depth[key] / 2 - 6 : -depth[key] / 2)
    // Transparent from the start (opaque at opacity 1), so the blueprint and the break-up can fade it without recompiling.
    faces[key].transparent = sides[key].transparent = true
    const mesh = new Mesh(geo, [faces[key], sides[key]])
    emblem.add(mesh)
    solids.push(mesh)
    const edges = new LineSegments(new EdgesGeometry(geo, 10), wireMat)
    emblem.add(edges)
    wires.push(edges)
    // Points on the surface, for breaking apart into embers at the end.
    const pa = geo.attributes.position as BufferAttribute
    const m = new Matrix4().copy(emblem.matrix)
    const v = new Vector3()
    const step = Math.max(1, Math.floor(pa.count / (opts.mobile ? 1400 : 3200)))
    for (let j = 0; j < pa.count; j += step) {
      v.fromBufferAttribute(pa, j).applyMatrix4(m)
      dustPos.push(v.x, v.y, v.z)
      dustCol.push(tint[key].r, tint[key].g, tint[key].b)
    }
  })
  const dustN = dustPos.length / 3
  const dustBase = new Float32Array(dustPos)
  const dustP = new Float32Array(dustPos)
  const dustDir = new Float32Array(dustN * 3)
  for (let i = 0; i < dustN; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.random() * 2 - 1
    dustDir[i * 3] = Math.cos(a) * Math.sqrt(1 - b * b) * 1.4 + dustBase[i * 3] * 0.35
    dustDir[i * 3 + 1] = Math.abs(b) * 1.2 + 0.6
    dustDir[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - b * b) * 1.4
  }
  const dustGeo = new BufferGeometry()
  dustGeo.setAttribute('position', new BufferAttribute(dustP, 3))
  dustGeo.setAttribute('color', new BufferAttribute(new Float32Array(dustCol), 3))
  const dot = dotTexture()
  const dustMat = new PointsMaterial({ map: dot, size: opts.mobile ? 0.05 : 0.035, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  const dust = new Points(dustGeo, dustMat)
  dust.visible = false
  holder.add(dust)

  // Blueprint: a grid behind the emblem and a scanning line.
  const gridGeo = new BufferGeometry()
  const gl: number[] = []
  for (let i = -8; i <= 8; i++) { gl.push(i * 0.5, -3, 0, i * 0.5, 3, 0); if (Math.abs(i) <= 6) gl.push(-4, i * 0.5, 0, 4, i * 0.5, 0) }
  gridGeo.setAttribute('position', new BufferAttribute(new Float32Array(gl), 3))
  const gridMat = new LineBasicMaterial({ color: 0x2f6dff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
  const grid = new LineSegments(gridGeo, gridMat)
  grid.position.z = -1.4
  holder.add(grid)

  // Lights.
  const red = new PointLight(0xff2a3a, 0, 30, 1.6); red.position.set(-4.5, 1.2, 3.2)
  const blue = new PointLight(0x2f8cff, 0, 30, 1.6); blue.position.set(4.6, -0.6, 3)
  const key = new PointLight(0xfff1dd, 0, 30, 1.8); key.position.set(0.5, 4.5, 4)
  // The barbell's plates burn hot in the last chapter.
  const hotL = new PointLight(0xff4a1a, 0, 5, 2); hotL.position.set(-2.1, 0, 0.9)
  const hotR = new PointLight(0xff4a1a, 0, 5, 2); hotR.position.set(2.1, 0, 0.9)
  holder.add(hotL, hotR)
  scene.add(red, blue, key)

  // Smoke.
  const smokes: Mesh[] = []
  const smokeCount = opts.mobile ? 4 : 7
  const frontCount = opts.mobile ? 1 : 2
  const frag = smokeFrag(opts.mobile ? 4 : 5)
  for (let i = 0; i < smokeCount; i++) {
    const front = i >= smokeCount - frontCount
    const mat = new ShaderMaterial({
      uniforms: { t: { value: 0 }, seed: { value: i * 7.13 }, col: { value: new Color(i % 3 === 0 ? 0x4a5468 : i % 3 === 1 ? 0x6a3a44 : 0x55555e) }, op: { value: 0 } },
      vertexShader: SMOKE_VERT, fragmentShader: frag, transparent: true, depthWrite: false, blending: NormalBlending,
    })
    const m = new Mesh(new PlaneGeometry(front ? 9 : 14, front ? 6 : 9), mat)
    m.position.set((i % 2 ? 1 : -1) * (1 + i * 0.4), -0.4 + (i % 3) * 0.5, front ? 2.4 : -1.6 - i * 0.6)
    m.rotation.z = i * 0.9
    m.userData.front = front
    scene.add(m)
    smokes.push(m)
  }

  // Embers drifting up, and sparks from the barbell.
  const emberN = opts.mobile ? 90 : 180
  const ember = new BufferGeometry()
  const ep = new Float32Array(emberN * 3)
  for (let i = 0; i < emberN; i++) { ep[i * 3] = (Math.random() - 0.5) * 14; ep[i * 3 + 1] = (Math.random() - 0.5) * 9; ep[i * 3 + 2] = (Math.random() - 0.5) * 6 }
  ember.setAttribute('position', new BufferAttribute(ep, 3))
  const emberMat = new PointsMaterial({ map: dot, color: 0xff6a3a, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  scene.add(new Points(ember, emberMat))
  const sparkN = opts.mobile ? 140 : 320
  const spark = new BufferGeometry()
  const sp = new Float32Array(sparkN * 3), sv = new Float32Array(sparkN * 3), life = new Float32Array(sparkN)
  const ends = [new Vector3(-2.05, 0, 0.3), new Vector3(2.05, 0, 0.3)]
  const respawn = (i: number) => {
    const e = ends[i % 2]
    sp[i * 3] = e.x; sp[i * 3 + 1] = e.y + (Math.random() - 0.5) * 0.5; sp[i * 3 + 2] = e.z
    sv[i * 3] = (e.x > 0 ? 1 : -1) * (0.6 + Math.random() * 2.2); sv[i * 3 + 1] = Math.random() * 2.4 - 0.4; sv[i * 3 + 2] = (Math.random() - 0.3) * 1.6
    life[i] = Math.random()
  }
  for (let i = 0; i < sparkN; i++) respawn(i)
  spark.setAttribute('position', new BufferAttribute(sp, 3))
  const sparkMat = new PointsMaterial({ map: dot, color: 0xffa040, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  holder.add(new Points(spark, sparkMat))

  // Bloom on the brightest edges.
  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(dpr)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new Vector2(256, 256), opts.mobile ? 0.26 : 0.38, 0.22, opts.mobile ? 1.1 : 1.0)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  let wide = true, level = 0
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
    wide = w / h > 1.05
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    const br = opts.mobile || level > 0 ? 0.5 : 0.75
    bloom.resolution.set(w * br, h * br)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  let target = 0, prog = 0
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const onMove = (e: PointerEvent) => { pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2; pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2 }
  window.addEventListener('pointermove', onMove, { passive: true })

  let t0 = performance.now()
  let last = t0, raf = 0, ready = false, visible = true, started = false, stopped = false
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting) })
  io.observe(canvas)

  const frame = (now: number) => {
    const raw = Math.min(0.25, (now - last) / 1000)
    const dt = Math.min(0.05, raw)
    last = now
    const time = opts.still ? 4 : (now - t0) / 1000
    // Follows the scroll smoothly, at the same pace whatever the frame rate.
    prog += (target - prog) * (opts.still ? 1 : 1 - Math.exp(-raw * 5.5))
    pointer.x += (pointer.tx - pointer.x) * 0.05
    pointer.y += (pointer.ty - pointer.y) * 0.05
    const p = prog
    const intro = opts.still ? 1 : smooth(0.1, 2.4, time)

    const pz = pose(p)
    const settle = smooth(0.74, 0.88, p)
    holder.position.set(wide ? mix(1.55, 0, settle) : 0, (wide ? mix(0, 0.45, settle) : 1.55) + Math.sin(time * 0.8) * 0.04, 0)
    holder.rotation.y = pz.ry + pointer.x * 0.12 + Math.sin(time * 0.4) * 0.035 + (1 - intro) * -0.9
    holder.rotation.x = pz.rx + pointer.y * 0.06 + Math.sin(time * 0.3) * 0.02
    holder.scale.setScalar(mix(0.86, 1, intro))
    camera.position.set(pz.x, pz.y, pz.z / (wide ? 1 : 0.78))
    camera.lookAt(holder.position.x * (wide ? 0.55 : 1) + pz.lx, holder.position.y * (wide ? 0.6 : 0.3) + pz.ly, 0)

    const coached = smooth(0.2, 0.32, p) * (1 - smooth(0.42, 0.5, p))
    const plan = smooth(0.5, 0.57, p) * (1 - smooth(0.68, 0.75, p))
    const ignite = smooth(0.76, 0.88, p)
    const breakup = smooth(0.9, 1, p)
    const sweep = Math.sin(time * 0.6)

    // In the last chapter the heat comes from the plates; the crimson key steps back so the chrome doesn't flare.
    red.intensity = intro * (58 + 30 * coached - 40 * plan) * (1 - 0.65 * ignite) * (wide ? 1 : 0.42)
    red.position.set((wide ? -4.5 : -6.5) + sweep * 1.4, 1.2 + holder.position.y, 3.2)
    blue.position.y = -0.6 + holder.position.y
    key.position.y = 4.5 + holder.position.y
    blue.intensity = intro * (44 + 40 * plan)
    key.intensity = intro * (8 + 12 * coached) * (1 - 0.85 * ignite)
    hotL.intensity = hotR.intensity = ignite * (1 - breakup) * (9 + Math.sin(time * 9) * 1.5)
    faces.red.emissiveIntensity = 0.04 + ignite * (0.32 + Math.sin(time * 7) * 0.04)
    faces.blue.emissiveIntensity = 0.06 + plan * 0.4

    wireMat.opacity = plan
    gridMat.opacity = plan * 0.35
    const solidOp = (1 - plan * 0.92) * (1 - breakup)
    for (const m of solids) {
      m.visible = solidOp > 0.01
      for (const mat of m.material as Material[]) { mat.opacity = solidOp; mat.depthWrite = solidOp > 0.5 }
    }
    for (const l of wires) l.visible = plan > 0.01

    // Breaking apart into embers.
    dust.visible = breakup > 0.001
    if (dust.visible) {
      const e = breakup * breakup
      for (let i = 0; i < dustN; i++) {
        const j = i * 3
        const wob = Math.sin(time * 2 + i) * 0.04 * e
        dustP[j] = dustBase[j] + dustDir[j] * e * 2.2 + wob
        dustP[j + 1] = dustBase[j + 1] + dustDir[j + 1] * e * 2.6
        dustP[j + 2] = dustBase[j + 2] + dustDir[j + 2] * e * 2.0
      }
      ;(dustGeo.attributes.position as BufferAttribute).needsUpdate = true
      dustMat.opacity = Math.min(0.75, breakup * 3) * (1 - smooth(0.8, 1, breakup))
    }

    wordMat.opacity = intro * (0.7 - 0.5 * coached - 0.6 * plan) * (1 - breakup * 0.6)
    word.position.x = -camera.position.x * 0.25

    for (let i = 0; i < smokes.length; i++) {
      const m = smokes[i]
      const u = (m.material as ShaderMaterial).uniforms
      u.t.value = time + i * 3
      m.rotation.z += dt * 0.012 * (i % 2 ? 1 : -1)
      u.op.value = (m.userData.front ? 0.14 : 0.4) * (0.35 + 0.65 * intro) * (1 - plan * 0.6) * (1 - breakup * 0.5)
    }

    for (let i = 0; i < emberN; i++) {
      ep[i * 3 + 1] += dt * (0.12 + (i % 5) * 0.03) * (1 + breakup * 3)
      ep[i * 3] += Math.sin(time * 0.5 + i) * dt * 0.05
      if (ep[i * 3 + 1] > 4.5) ep[i * 3 + 1] = -4.5
    }
    ;(ember.attributes.position as BufferAttribute).needsUpdate = true
    emberMat.opacity = (0.3 + 0.4 * intro + ignite * 0.3) * intro

    sparkMat.opacity = ignite * (1 - breakup)
    if (ignite > 0.01 && !opts.still) {
      for (let i = 0; i < sparkN; i++) {
        life[i] += dt * (0.5 + (i % 7) * 0.08)
        if (life[i] > 1) respawn(i)
        sv[i * 3 + 1] -= dt * 2.6
        sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt
      }
      ;(spark.attributes.position as BufferAttribute).needsUpdate = true
    }

    composer.render(dt)
    if (!ready) { ready = true; opts.onReady() }
  }
  // Quality steps: 0 full, 1 fewer pixels, 2 no glow and fewer pixels again. Measured over two-second windows
  // while the hero is on screen, after the first second (shaders compiling). 26 frames a second keeps a phone in
  // battery saver (capped at 30) at full quality.
  let winStart = 0, winFrames = 0, failed = false
  const govern = (now: number) => {
    if (fixed || failed) return
    if (!winStart) { winStart = now + 1000; winFrames = 0; return }
    if (now < winStart) return
    winFrames++
    const span = now - winStart
    if (span < 2000) return
    const fps = (winFrames * 1000) / span
    winStart = now; winFrames = 0
    if (fps >= 26) return
    if (level === 2) {
      if (fps < 12) { failed = true; opts.onFail?.() }
      return
    }
    level++
    dpr = level === 1 ? Math.min(dpr, 1) : Math.min(dpr, 0.75)
    if (level === 2) bloom.enabled = false
    renderer.setPixelRatio(dpr)
    composer.setPixelRatio(dpr)
    resize()
  }
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (!visible || document.hidden) { last = now; winStart = 0; return }
    frame(now)
    govern(now)
  }
  const start = () => {
    if (stopped || started) return
    started = true
    t0 = last = performance.now()
    if (opts.still) { frame(t0); frame(t0) } else raf = requestAnimationFrame(loop)
  }
  // Compile every shader before the first frame, in the background where the browser can (KHR_parallel_shader_compile),
  // so the page doesn't stall; elsewhere they compile with the first frame. The scene renders into the glow pipeline's buffer, not the screen, and three.js picks
  // shader variants by where they draw, so compile for that. The embers of the break-up are hidden until the end;
  // they're shown just for this so they don't stall the last chapter.
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    dust.visible = true
    renderer.setRenderTarget(composer.readBuffer)
    let compiling: Promise<unknown>
    try { compiling = renderer.compileAsync(scene, camera) } catch { compiling = Promise.resolve() }
    renderer.setRenderTarget(null)
    dust.visible = false
    compiling.catch(() => undefined).then(start)
  } else start()

  return {
    setProgress: (p: number) => { target = clamp(p); if (opts.still && started) frame(performance.now()) },
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      scene.traverse((o) => {
        const m = o as Mesh
        m.geometry?.dispose()
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
        mats.forEach((x) => x.dispose())
      })
      dot.dispose()
      wordTex.dispose()
      env.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
