// The graphics chip, read once from a throwaway context. Kept apart from the 3D code so the page can decide
// whether to download that code at all.
let probed = false
let name = ''
let webgl2 = false

function probe() {
  if (probed) return
  probed = true
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    webgl2 = !!gl
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl && info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* unknown chip */ }
}

/** The graphics chip's name, or '' when the browser won't say. */
export function gpuName(): string { probe(); return name }

/** Whether the browser can draw WebGL 2 at all. */
export function hasWebgl2(): boolean { probe(); return webgl2 }

/** No graphics chip (some old PCs, remote desktops, speed-test robots): the processor would have to draw the 3D,
 *  freezing the page for seconds, so the flat logo stays. */
export const softwareGpu = () => /SwiftShader|llvmpipe|softpipe|Basic Render/i.test(gpuName())

/** Set when recording the sequence in a headless browser: full quality whatever the chip. */
export const fixedQuality = () => (window as { __sfFixedQuality?: boolean }).__sfFixedQuality === true
