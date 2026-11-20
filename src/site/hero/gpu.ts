// The graphics chip, read once from a throwaway context. Kept apart from the 3D code so the page can decide
// whether to download that code at all.
let name: string | null = null

/** The graphics chip's name, or '' when the browser won't say. */
export function gpuName(): string {
  if (name !== null) return name
  name = ''
  try {
    const probe = document.createElement('canvas').getContext('webgl2')
    const info = probe?.getExtension('WEBGL_debug_renderer_info')
    if (probe && info) name = String(probe.getParameter(info.UNMASKED_RENDERER_WEBGL))
    probe?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* unknown chip */ }
  return name
}

/** No graphics chip (some old PCs, remote desktops, speed-test robots): the processor would have to draw the 3D,
 *  freezing the page for seconds, so the flat logo stays. */
export const softwareGpu = () => /SwiftShader|llvmpipe|softpipe|Basic Render/i.test(gpuName())

/** Set when recording the sequence in a headless browser: full quality whatever the chip. */
export const fixedQuality = () => (window as { __sfFixedQuality?: boolean }).__sfFixedQuality === true
