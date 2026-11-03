// The hero's stage lights: a crimson key light and a blue rim light sweeping through haze, drawn by a tiny WebGL
// shader (no library). They follow the pointer a little and light the SHAAN letters as they pass. Runs at reduced
// resolution and about 30 frames a second, pauses when off screen or in a background tab, and draws one still frame
// for people who prefer reduced motion. Without WebGL the stylesheet's gradients stay.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FRAG = `
precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float s1;uniform float s2;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
float beam(vec2 q,vec2 src,float ang,float w){vec2 d=q-src;float a=atan(d.x,-d.y);
  return exp(-pow((a-ang)/w,2.))*smoothstep(1.9,.1,length(d));}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float asp=r.x/r.y;vec2 q=vec2(uv.x*asp,uv.y);
  float hz=fbm(q*2.1+vec2(t*.035,-t*.022));hz=.28+1.05*hz*hz;
  float b1=beam(q,vec2(asp*.8,1.18),s1,.15);
  float b2=beam(q,vec2(asp*.16,1.22),s2,.2);
  vec3 c=vec3(.006,.006,.012);
  c+=vec3(.93,.15,.22)*b1*hz;
  c+=vec3(.16,.3,1.)*b2*hz*.62;
  float fl=smoothstep(.32,0.,uv.y);
  c+=vec3(.9,.72,.45)*fl*(b1*.22+b2*.12);
  c*=smoothstep(1.45,.2,length((uv-vec2(.55,.45))*vec2(asp*.85,1.15)));
  c+=(h(gl_FragCoord.xy+fract(t))-.5)*.03;
  gl_FragColor=vec4(c,1.);
}`

export interface LightRig { stop: () => void }

/** Beam angles for a moment, shared by the shader and the letter lighting. */
function angles(t: number, mx: number, asp: number) {
  // Narrow (phone) screens get steeper beams so the two lights don't cross into one.
  const k = Math.min(1, asp * 1.25)
  const sway = Math.sin(t * 0.23) * 0.2 + (mx - 0.5) * 0.28
  return { a1: (-0.42 + sway) * k, a2: (0.4 - sway * 0.8) * k }
}

export function startLightRig(canvas: HTMLCanvasElement, host: HTMLElement, letters: HTMLElement[], still: boolean): LightRig | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
  if (!gl) return null
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = { r: gl.getUniformLocation(prog, 'r'), t: gl.getUniformLocation(prog, 't'), m: gl.getUniformLocation(prog, 'm'),
    s1: gl.getUniformLocation(prog, 's1'), s2: gl.getUniformLocation(prog, 's2') }

  const small = window.matchMedia('(max-width: 700px)').matches
  const scale = small ? 0.38 : 0.5
  let w = 0, h = 0, hostRect = host.getBoundingClientRect()
  let boxes: { left: number; width: number; top: number; height: number }[] = []
  const measure = () => {
    hostRect = host.getBoundingClientRect()
    w = Math.max(1, Math.round(hostRect.width * scale))
    h = Math.max(1, Math.round(hostRect.height * scale))
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)
    boxes = letters.map((l) => { const b = l.getBoundingClientRect(); return { left: b.left - hostRect.left, width: b.width, top: b.top - hostRect.top, height: b.height } })
  }
  measure()

  let mx = 0.5, tmx = 0.5
  const onMove = (e: PointerEvent) => { tmx = (e.clientX - hostRect.left) / Math.max(1, hostRect.width) }
  host.addEventListener('pointermove', onMove)

  const t0 = performance.now()
  let raf = 0, last = 0, frame = 0, visible = true, shown = false
  const draw = (now: number) => {
    const t = still ? 12 : (now - t0) / 1000
    mx += (tmx - mx) * 0.05
    const { a1, a2 } = angles(t, mx, hostRect.width / Math.max(1, hostRect.height))
    gl.uniform2f(u.r, w, h)
    gl.uniform1f(u.t, t)
    gl.uniform2f(u.m, mx, 0.5)
    gl.uniform1f(u.s1, a1)
    gl.uniform1f(u.s2, a2)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    // Where the crimson beam crosses the letters: light them from there.
    const H = hostRect.height, W = hostRect.width, asp = W / H
    for (let i = 0; i < letters.length; i++) {
      const b = boxes[i]
      if (!b) continue
      const yUp = 1 - (b.top + b.height * 0.4) / H
      const x = (asp * 0.8 + Math.tan(a1) * (1.18 - yUp)) / asp * W
      letters[i].style.setProperty('--lx', `${(((x - b.left) / b.width) * 100).toFixed(1)}%`)
    }
    if (!shown) { shown = true; canvas.classList.add('is-on') }
  }
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (!visible || document.hidden || now - last < 33) return
    last = now
    if (++frame % 20 === 0) boxes = letters.map((l) => { const b = l.getBoundingClientRect(); return { left: b.left - hostRect.left, width: b.width, top: b.top - hostRect.top, height: b.height } })
    draw(now)
  }
  const ro = new ResizeObserver(() => { measure(); if (still) draw(performance.now()) })
  ro.observe(host)
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting) })
  io.observe(host)
  const onScroll = () => { hostRect = host.getBoundingClientRect() }
  window.addEventListener('scroll', onScroll, { passive: true })
  if (still) draw(performance.now())
  else raf = requestAnimationFrame(loop)

  return {
    stop: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      host.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
