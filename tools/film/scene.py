# Shaan Fitness home film: one continuous shot, rendered with Cycles.
# Night street -> up the facade to the lit 5th floor -> through the glass into reception -> across the gym floor ->
# the assessment scan (a holographic body whose muscle groups light up). Every frame's camera, lights and scan state
# are computed here, so any frame can be rendered on its own.
#
#   python3 scene.py --fmt land|port --frames 0-159|0,40,80 --scale 1.0 --spp 8 --out DIR
import bpy, bmesh, math, random, sys, os, re, json, time, argparse
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.path.dirname(HERE)
ap = argparse.ArgumentParser()
ap.add_argument('--fmt', default='land')
ap.add_argument('--frames', default='0')
ap.add_argument('--scale', type=float, default=0.5)
ap.add_argument('--spp', type=int, default=4)
ap.add_argument('--out', default=os.path.join(HERE, 'look'))
ap.add_argument('--save', default='')
A = ap.parse_args()
N_FRAMES = 160

random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COLL = sc.collection

# ---------------------------------------------------------------- helpers
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def kelvin(t):
    t = t / 100
    r = 255 if t <= 66 else 329.698727446 * ((t - 60) ** -0.1332047592)
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * ((t - 60) ** -0.0755148492)
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    return lin('#%02x%02x%02x' % tuple(int(max(0, min(255, v))) for v in (r, g, b)))

def link(ob, coll=None):
    (coll or COLL).objects.link(ob); return ob

def node_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    return m, m.node_tree

def pbr(name, color, rough=0.5, metal=0.0, spec=0.5, coat=0.0, emit=None, estr=0.0, noise_rough=0.0, bump=0.0, scale=4.0):
    m, nt = node_mat(name)
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if coat: b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
    if noise_rough or bump:
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 6
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        if noise_rough:
            mr = nt.nodes.new('ShaderNodeMapRange')
            mr.inputs['To Min'].default_value = max(0.02, rough - noise_rough); mr.inputs['To Max'].default_value = min(1, rough + noise_rough)
            nt.links.new(nz.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
        if bump:
            bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.02
            nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m

def emissive(name, color, strength):
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    m['strength_node'] = e.name
    return m

def glass(name, tint='#cfd8dc', refl=0.10):
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = (*lin(tint), 1)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.02; gl.inputs['Color'].default_value = (0.9, 0.93, 0.95, 1)
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.25
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = refl; mr.inputs['To Max'].default_value = 0.85
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lw.outputs['Fresnel'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], mx.inputs['Fac'])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(gl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    m.blend_method = 'HASHED' if hasattr(m, 'blend_method') else None
    return m

def mesh_ob(name, bm, mat=None, coll=None, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    if mat: me.materials.append(mat)
    return link(ob, coll)

def box(name, mn, mx, mat, bevel=0.0, coll=None):
    mn = Vector(mn); mx = Vector(mx); s = mx - mn
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
    ob = mesh_ob(name, bm, mat, coll); ob.location = (mn + mx) / 2
    if bevel:
        md = ob.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    return ob

def cyl_mesh(name, r, depth, seg=32, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return me

def inst(name, me, loc, rot=(0, 0, 0), mat=None, scale=(1, 1, 1), coll=None):
    ob = bpy.data.objects.new(name, me); ob.location = loc; ob.rotation_euler = rot; ob.scale = scale
    if mat and not me.materials: me.materials.append(mat)
    return link(ob, coll)

def area_light(name, loc, size, size_y, energy, color, rot=(0, 0, 0), spread=None):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size_y
    ld.energy = energy; ld.color = color
    if spread: ld.spread = spread
    ob = bpy.data.objects.new(name, ld); ob.location = loc; ob.rotation_euler = rot
    link(ob); ob['base'] = energy; return ob

def spot(name, loc, energy, color, rot=(0, 0, 0), size=0.2, angle=70, blend=0.6):
    ld = bpy.data.lights.new(name, 'SPOT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = size
    ld.spot_size = math.radians(angle); ld.spot_blend = blend
    ob = bpy.data.objects.new(name, ld); ob.location = loc; ob.rotation_euler = rot
    link(ob); ob['base'] = energy; return ob

def point(name, loc, energy, color, size=0.1):
    ld = bpy.data.lights.new(name, 'POINT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = size
    ob = bpy.data.objects.new(name, ld); ob.location = loc
    link(ob); ob['base'] = energy; return ob

def text_ob(name, body, font, size, mat, loc, rot=(math.pi / 2, 0, 0), extrude=0.0, spacing=1.0, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = font; cu.size = size; cu.extrude = extrude
    cu.space_character = spacing; cu.align_x = align; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu); ob.location = loc; ob.rotation_euler = rot
    cu.materials.append(mat); return link(ob)

# ---------------------------------------------------------------- materials
FONT_SANS = bpy.data.fonts.load(os.path.join(SCR, 'fonts', 'Manrope-ExtraBold.ttf'))
FONT_SEMI = bpy.data.fonts.load(os.path.join(SCR, 'fonts', 'Manrope-SemiBold.ttf'))
FONT_SERIF = bpy.data.fonts.load(os.path.join(SCR, 'fonts', 'BodoniModa-96-Medium.ttf'))
WARM = kelvin(3000); NEUTRAL = kelvin(4600); SODIUM = kelvin(2300); COOL = kelvin(6500)
GOLD = '#D6B878'

M = dict(
    concrete=pbr('concrete', '#7b766e', 0.85, bump=0.15, scale=9),
    concrete_dark=pbr('concrete_dark', '#3d3a36', 0.85, bump=0.1, scale=9),
    bronze=pbr('bronze', '#2a2420', 0.45, 0.85),
    mullion=pbr('mullion', '#121214', 0.4, 0.8),
    asphalt=pbr('asphalt', '#1a1a1c', 0.32, noise_rough=0.22, bump=0.08, scale=2.5),
    pavement=pbr('pavement', '#4a4741', 0.7, noise_rough=0.15, bump=0.1, scale=3),
    curb=pbr('curb', '#6d6a64', 0.8),
    pole=pbr('pole', '#2b2c2f', 0.5, 0.7),
    glass=glass('glass'),
    glass_dark=glass('glass_dark', '#9aa4a8', 0.18),
    signpanel=pbr('signpanel', '#0e0e10', 0.45, 0.6),
    dark=pbr('dark', '#0b0b0d', 0.8),
    ceiling=pbr('ceiling', '#0f0f11', 0.9),
    wall=pbr('wall', '#1c1b1a', 0.85),
    rubber=pbr('rubber', '#161617', 0.88, noise_rough=0.06, bump=0.05, scale=40),
    stone_floor=pbr('stone_floor', '#2a2826', 0.22, noise_rough=0.12, scale=1.5),
    walnut=pbr('walnut', '#3b2a1f', 0.45, bump=0.05, scale=30),
    stone_top=pbr('stone_top', '#141416', 0.18, noise_rough=0.1, scale=2),
    gold=pbr('gold', GOLD, 0.28, 1.0),
    steel=pbr('steel', '#9a9ca0', 0.22, 1.0),
    black_steel=pbr('black_steel', '#18181a', 0.42, 0.85),
    chrome=pbr('chrome', '#d8dadc', 0.08, 1.0),
    pad=pbr('pad', '#121213', 0.55, coat=0.3),
    plate_black=pbr('plate_black', '#141415', 0.75),
    plate_red=pbr('plate_red', '#A8232A', 0.6),
    plate_blue=pbr('plate_blue', '#1D4E9E', 0.6),
    turf=pbr('turf', '#24412d', 0.95, bump=0.3, scale=90),
    paint_white=pbr('paint_white', '#cfcac0', 0.8),
    mirror=pbr('mirror', '#c8ccd0', 0.03, 1.0),
    slat=pbr('slat', '#1a1714', 0.55),
    leather=pbr('leather', '#2a2622', 0.5, coat=0.2),
    gold_paint=pbr('gold_paint', '#B8995A', 0.45, 0.6),
)
E = dict(
    strip=emissive('strip', NEUTRAL, 6.0),
    warm_strip=emissive('warm_strip', WARM, 5.0),
    lamp=emissive('lamp', SODIUM, 18.0),
    sign_white=emissive('sign_white', kelvin(3800), 5.5),
    sign_red=emissive('sign_red', lin('#ff2a2a'), 3.2),
    sign_blue=emissive('sign_blue', lin('#1aa6ff'), 3.2),
    halo=emissive('halo', WARM, 2.2),
    ring=emissive('ring', lin('#38b6ff'), 4.0),
)

# ---------------------------------------------------------------- logo from the traced vectors
LOGO = json.load(open(os.path.join(HERE, 'logo.json')))

def parse_path(d):
    toks = re.findall(r'[MLCZ]|-?\d*\.?\d+', d)
    subs, cur, cmd, i = [], None, None, 0
    while i < len(toks):
        t = toks[i]
        if t in 'MLCZ':
            cmd = t; i += 1
            if cmd == 'Z':
                if cur:
                    if len(cur) > 1 and (abs(cur[-1]['co'][0] - cur[0]['co'][0]) < 1e-6 and abs(cur[-1]['co'][1] - cur[0]['co'][1]) < 1e-6):
                        cur[0]['hl'] = cur[-1]['hl']; cur.pop()
                    subs.append(cur)
                cur = None
            continue
        f = lambda k: float(toks[i + k])
        if cmd == 'M':
            p = (f(0), f(1)); i += 2; cur = [dict(co=p, hl=p, hr=p)]; cmd = 'L'
        elif cmd == 'L':
            p = (f(0), f(1)); i += 2; cur.append(dict(co=p, hl=p, hr=p))
        elif cmd == 'C':
            c1, c2, p = (f(0), f(1)), (f(2), f(3)), (f(4), f(5)); i += 6
            cur[-1]['hr'] = c1; cur.append(dict(co=p, hl=c2, hr=p))
    return subs

def logo_part(name, d, mat, size, depth, bevel=0.0):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.resolution_u = 4
    cu.extrude = depth / 2 / (size / 512); cu.bevel_depth = bevel / (size / 512); cu.bevel_resolution = 2
    for sub in parse_path(d):
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(sub) - 1); sp.use_cyclic_u = True
        for bp, pt in zip(sp.bezier_points, sub):
            bp.handle_left_type = bp.handle_right_type = 'FREE'
            bp.co = (pt['co'][0] - 256, 256 - pt['co'][1], 0)
            bp.handle_left = (pt['hl'][0] - 256, 256 - pt['hl'][1], 0)
            bp.handle_right = (pt['hr'][0] - 256, 256 - pt['hr'][1], 0)
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu); ob.scale = (size / 512,) * 3
    return link(ob)

def logo(prefix, loc, size, depth, mats, rot=(math.pi / 2, 0, 0)):
    parent = bpy.data.objects.new(prefix, None); link(parent); parent.location = loc; parent.rotation_euler = rot
    for k in ('white', 'red', 'blue'):
        ob = logo_part(f'{prefix}_{k}', LOGO[k], mats[k], size, depth); ob.parent = parent
        ob.location = (0, 0, {'white': 0, 'red': depth * 0.15, 'blue': depth * 0.15}[k])
    return parent


# ---------------------------------------------------------------- extra materials
def room_mat(name, tone, st, blinds):
    # a lit room seen through glass: brighter toward the ceiling, sometimes with blinds
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*tone, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord'); sz = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sz.inputs['Vector'])
    g = nt.nodes.new('ShaderNodeMapRange'); g.inputs['To Min'].default_value = 0.35 * st; g.inputs['To Max'].default_value = st
    nt.links.new(sz.outputs['Z'], g.inputs['Value'])
    out = g.outputs['Result']
    if blinds:
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 14
        nt.links.new(tc.outputs['Generated'], wv.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 0.55; mr.inputs['To Max'].default_value = 1.0
        nt.links.new(wv.outputs['Fac'], mr.inputs['Value'])
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; nt.links.new(out, mul.inputs[0]); nt.links.new(mr.outputs['Result'], mul.inputs[1])
        out = mul.outputs[0]
    nt.links.new(out, e.inputs['Strength']); nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m

M['acrylic'] = pbr('acrylic', '#efece6', 0.32)
def rubber_mat():
    m, nt = node_mat('rubber2'); b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.86
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 260; nz.inputs['Detail'].default_value = 1
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.62; rp.color_ramp.elements[0].color = (*lin('#0e0e0f'), 1)
    rp.color_ramp.elements[1].position = 0.66; rp.color_ramp.elements[1].color = (*lin('#3a3a3d'), 1)
    nt.links.new(nz.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    return m
M['rubber'] = rubber_mat()
M['plate_red'] = pbr('plate_red2', '#9E1F26', 0.5, coat=0.25, bump=0.05, scale=60)
M['plate_blue'] = pbr('plate_blue2', '#1B4A96', 0.5, coat=0.25, bump=0.05, scale=60)
M['plate_black'] = pbr('plate_black2', '#121213', 0.62, coat=0.15, bump=0.05, scale=60)
M['wall_black'] = pbr('wall_black', '#0d0d0e', 0.75)
M['oak'] = pbr('oak', '#5a4330', 0.5, bump=0.04, scale=40)

# ---------------------------------------------------------------- the street and the building
Z5 = 18.6          # 5th floor finished floor level
Z5C = 23.0         # 5th floor ceiling
W = 14.0           # half width of the building
# the studio inside the 5th floor: 16 m x 12.8 m, about 2,200 sq ft
SX0, SX1, SY0, SY1 = -13.8, 2.2, 0.2, 12.8
RX1 = -9.4         # reception / assessment zone ends here (x)
RY = 5.0           # logo wall line (y)
box('road', (-80, -60, -0.2), (80, -6.5, 0), M['asphalt'])
box('pavement', (-80, -6.5, -0.2), (80, 0.5, 0.14), M['pavement'])
box('curb', (-80, -6.65, -0.2), (80, -6.45, 0.16), M['curb'])
for x in range(-70, 71, 9):
    box(f'lane{x}', (x, -33.1, 0), (x + 4.5, -32.9, 0.005), M['paint_white'])
# ground floor shops: glass fronts, warm interiors with shelves, quiet light boxes
shelf_m = pbr('shelf', '#2b2622', 0.6)
for i, x0 in enumerate([-14, -7, 0, 7]):
    box(f'shopcol{i}', (x0 - 0.3, -0.4, 0), (x0 + 0.3, 0.3, 4.6), M['concrete_dark'])
    box(f'shopglass{i}', (x0 + 0.3, 0.55, 0.14), (x0 + 6.7, 0.6, 3.5), M['glass'])
    tone = [kelvin(3200), kelvin(3800), kelvin(3000), kelvin(4200)][i]
    box(f'shopin{i}', (x0 + 0.3, 3.5, 0.14), (x0 + 6.7, 3.6, 3.5), room_mat(f'shopin{i}', tone, [0.9, 0.6, 1.0, 0.5][i], False))
    box(f'shopceil{i}', (x0 + 0.3, 0.6, 3.5), (x0 + 6.7, 3.6, 3.6), emissive(f'shopceil{i}', tone, 0.25))
    box(f'shopfloor{i}', (x0 + 0.3, 0.6, 0.0), (x0 + 6.7, 3.6, 0.15), M['stone_floor'])
    for k in range(3):
        box(f'shopshelf{i}{k}', (x0 + 0.8 + k * 2.0, 2.4, 0.15), (x0 + 1.9 + k * 2.0, 3.2, 1.9), shelf_m)
    box(f'shopsign{i}', (x0 + 0.8, -0.25, 3.8), (x0 + 6.2, -0.1, 4.3), emissive(f'shopsign{i}', kelvin(4200), 0.45))
box('shopcol_end', (13.7, -0.4, 0), (14.3, 0.3, 4.6), M['concrete_dark'])
box('canopy', (-14.4, -1.6, 4.4), (14.4, 0.3, 4.65), M['concrete_dark'])
# floors 1-4: slab bands, ribbon windows, bronze fins, rooms behind
levels = [4.6, 8.1, 11.6, 15.1]
for li, z in enumerate(levels):
    box(f'slab{li}', (-W - 0.2, -0.35, z - 0.05), (W + 0.2, 0.3, z + 0.55), M['concrete'])
    box(f'sill{li}', (-W - 0.2, -0.2, z + 0.55), (W + 0.2, 0.3, z + 1.0), M['concrete'])
    box(f'win{li}', (-W, 0.18, z + 1.0), (W, 0.2, z + 3.35), M['glass_dark'])
    x = -W
    while x < W - 0.1:
        box(f'fin{li}_{x:.1f}', (x - 0.06, -0.45, z + 0.55), (x + 0.06, 0.2, z + 3.5), M['bronze'])
        if random.random() < 0.55:
            tone = random.choice([kelvin(3000), kelvin(3500), kelvin(4000), kelvin(4800)])
            box(f'room{li}_{x:.1f}', (x + 0.1, 2.4, z + 0.6), (x + 2.7, 2.5, z + 3.3), room_mat(f'room{li}_{x:.1f}', tone, random.uniform(0.25, 0.7), random.random() < 0.45))
            box(f'rceil{li}_{x:.1f}', (x + 0.1, 0.25, z + 3.3), (x + 2.7, 2.5, z + 3.45), emissive(f'rc{li}_{x:.1f}', tone, 0.18))
        else:
            box(f'room{li}_{x:.1f}', (x + 0.1, 2.4, z + 0.6), (x + 2.7, 2.5, z + 3.3), M['dark'])
        x += 2.8
# warm uplights from the canopy graze the facade
for k, x in enumerate([-12.6, -7.0, -1.4, 4.2, 9.8]):
    spot(f'uplight{k}', (x, -0.9, 4.75), 1400, kelvin(3000), rot=(math.pi - 0.12, 0, 0), size=0.15, angle=38, blend=0.9)
box('slab5', (-W - 0.2, -0.35, Z5 - 0.1), (W + 0.2, 0.3, Z5 + 0.35), M['concrete'])
box('glass5', (-W, 0.12, Z5 + 0.3), (W, 0.14, Z5C - 0.1), M['glass'])
x = -W
while x <= W + 0.01:
    box(f'mul5_{x:.0f}', (x - 0.035, 0.0, Z5 + 0.3), (x + 0.035, 0.2, Z5C), M['mullion']); x += 2.0
box('transom5', (-W, 0.0, Z5C - 0.75), (W, 0.2, Z5C - 0.68), M['mullion'])
box('signband', (-W - 0.2, -0.4, Z5C), (W + 0.2, 0.3, Z5C + 2.3), M['signpanel'])
box('parapet_cap', (-W - 0.3, -0.5, Z5C + 2.3), (W + 0.3, 0.4, Z5C + 2.42), M['concrete'])
box('building_core', (-W, 3.7, 0), (W, 26, Z5 - 0.1), M['concrete_dark'])
box('building_side_l', (-W - 0.2, 0.3, 0), (-W, 26, Z5C + 2.4), M['concrete'])
box('building_side_r', (W, 0.3, 0), (W + 0.2, 26, Z5C + 2.4), M['concrete'])
box('roof', (-W, 0.3, Z5C + 2.1), (W, 26, Z5C + 2.3), M['concrete_dark'])
# the neighbouring office on the same floor, dim
box('office_wall', (SX1, 0.25, Z5), (SX1 + 0.15, SY1, Z5C), M['wall_black'])
box('office_back', (SX1 + 0.2, 6.0, Z5), (W, 6.1, Z5C - 0.1), room_mat('office_back', kelvin(4200), 0.32, True))
box('office_floor', (SX1, 0.2, Z5 - 0.05), (W, 12.8, Z5), M['dark'])
box('office_ceil', (SX1, 0.2, Z5C - 0.12), (W, 12.8, Z5C), emissive('office_ceil', kelvin(4200), 0.12))
# sign: halo-lit logo and channel letters, centred over the studio
logo('sign_logo', (-11.9, -0.43, Z5C + 1.15), 2.05, 0.0, dict(white=E['sign_white'], red=E['sign_red'], blue=E['sign_blue']))
text_ob('sign_text', 'SHAAN FITNESS', FONT_SANS, 1.22, E['sign_white'], (-4.2, -0.42, Z5C + 1.1), extrude=0.0, spacing=1.1)
spot('sign_wash', (-5.5, -3.0, Z5C + 3.6), 160, kelvin(3600), rot=(math.radians(38), 0, 0), size=2.5, angle=100)
# street lamps (sodium, soft)
for i, x in enumerate([-22, -4, 14]):
    box(f'lamppole{i}', (x - 0.07, -6.1, 0), (x + 0.07, -5.95, 8.2), M['pole'])
    box(f'lamparm{i}', (x - 0.06, -7.6, 8.05), (x + 0.06, -5.95, 8.18), M['pole'])
    box(f'lamphead{i}', (x - 0.22, -8.1, 7.95), (x + 0.22, -7.3, 8.1), M['pole'])
    box(f'lampglow{i}', (x - 0.18, -8.05, 7.93), (x + 0.18, -7.35, 7.95), E['lamp'])
    spot(f'lampspot{i}', (x, -7.7, 7.85), 1100, SODIUM, size=0.4, angle=125, blend=0.8)
for i, (x0, x1, h, d) in enumerate([(-40, -15, 17, 4), (15, 33, 28, 3), (33, 55, 13, 6), (-62, -40, 23, 9)]):
    box(f'nb{i}', (x0, d, 0), (x1, d + 24, h), M['concrete_dark'])
    for k in range(int((x1 - x0) / 3.2)):
        for fl in range(int(h / 3.4) - 1):
            if random.random() < 0.22:
                xx = x0 + 0.8 + k * 3.2; zz = 4.2 + fl * 3.4
                box(f'nbw{i}_{k}_{fl}', (xx, d - 0.02, zz), (xx + 1.8, d - 0.01, zz + 1.6), room_mat(f'nbw{i}_{k}_{fl}', random.choice([kelvin(3000), kelvin(4500)]), random.uniform(0.1, 0.3), True))
for i in range(14):
    x0 = -90 + i * 13 + random.uniform(-2, 2); h = random.uniform(10, 34)
    box(f'far{i}', (x0, 60, 0), (x0 + random.uniform(7, 12), 70, h), M['dark'])

# ---------------------------------------------------------------- the studio (5th floor)
INTERIOR_LIGHTS = []
box('floor_rubber', (RX1, SY0, Z5 - 0.05), (SX1, SY1, Z5), M['rubber'])
box('floor_stone', (SX0, SY0, Z5 - 0.05), (RX1, SY1, Z5 + 0.002), M['stone_floor'])
box('ceiling', (SX0, SY0, Z5C - 0.12), (SX1, SY1, Z5C), M['ceiling'])
box('backwall', (SX0, SY1, Z5), (SX1, SY1 + 0.25, Z5C), M['wall_black'])
box('leftwall', (SX0 - 0.25, SY0, Z5), (SX0, SY1, Z5C), M['wall_black'])
# gym ceiling: four linear lights running front to back, each backed by a matching area light
for j, x in enumerate([-8.0, -4.8, -1.6, 1.3]):
    box(f'strip{j}', (x - 0.05, 1.0, Z5C - 0.2), (x + 0.05, 12.0, Z5C - 0.12), E['strip'])
    INTERIOR_LIGHTS.append(area_light(f'strip_l{j}', (x, 6.5, Z5C - 0.25), 0.35, 11.0, 230, NEUTRAL))
# reception: warm downlights, three pendants, cove light over the logo wall
for j, (x, y) in enumerate([(-13.0, 1.4), (-10.3, 1.4), (-13.0, 3.6), (-10.0, 4.2)]):
    INTERIOR_LIGHTS.append(spot(f'recdown{j}', (x, y, Z5C - 0.15), 340, WARM, size=0.15, angle=85))
    box(f'recdl{j}', (x - 0.08, y - 0.08, Z5C - 0.13), (x + 0.08, y + 0.08, Z5C - 0.12), E['warm_strip'])
pend_me = cyl_mesh('pendant', 0.11, 0.32, 24)
for j, x in enumerate([-12.6, -11.6, -10.6]):
    inst(f'pendant{j}', pend_me, (x, 3.3, Z5C - 1.25), mat=M['gold'])
    box(f'pendcable{j}', (x - 0.004, 3.296, Z5C - 1.1), (x + 0.004, 3.304, Z5C - 0.12), M['black_steel'])
    box(f'pendglow{j}', (x - 0.09, 3.21, Z5C - 1.42), (x + 0.09, 3.39, Z5C - 1.41), E['warm_strip'])
    INTERIOR_LIGHTS.append(spot(f'pendspot{j}', (x, 3.3, Z5C - 1.45), 70, WARM, size=0.08, angle=75))
box('cove', (SX0, RY - 0.35, Z5C - 0.16), (RX1, RY - 0.25, Z5C - 0.13), E['warm_strip'])
INTERIOR_LIGHTS.append(area_light('cove_l', ((SX0 + RX1) / 2, RY - 0.3, Z5C - 0.2), 4.3, 0.2, 140, WARM, rot=(math.radians(18), 0, 0)))
# reception desk: fluted walnut front, black stone top, gold edge, soft under-glow
DX = -11.6; DY = 3.3
box('desk_body', (DX - 1.6, DY - 0.3, Z5), (DX + 1.6, DY + 0.45, Z5 + 1.02), M['walnut'], bevel=0.01)
flute = cyl_mesh('flute', 0.028, 0.96, 12)
for k in range(56):
    inst(f'flute{k}', flute, (DX - 1.565 + k * 0.0575, DY - 0.32, Z5 + 0.5), mat=M['walnut'])
box('desk_top', (DX - 1.75, DY - 0.45, Z5 + 1.02), (DX + 1.75, DY + 0.55, Z5 + 1.08), M['stone_top'], bevel=0.008)
box('desk_gold', (DX - 1.75, DY - 0.46, Z5 + 1.0), (DX + 1.75, DY - 0.445, Z5 + 1.02), M['gold'])
box('desk_glow', (DX - 1.5, DY - 0.38, Z5 + 0.01), (DX + 1.5, DY - 0.33, Z5 + 0.03), E['warm_strip'])
box('desk_monitor', (DX + 0.5, DY + 0.25, Z5 + 1.08), (DX + 1.1, DY + 0.29, Z5 + 1.45), M['black_steel'], bevel=0.005)
# logo wall: vertical oak slats, halo-lit logo, wordmark and tagline in gold
box('logowall_back', (SX0, RY, Z5), (RX1, RY + 0.3, Z5C), M['wall_black'])
slat_me = bpy.data.meshes.new('slat'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x * 0.045, v.co.y * 0.05, v.co.z * (Z5C - Z5)))
bm.to_mesh(slat_me); bm.free()
xx = SX0 + 0.05; k = 0
while xx < RX1 - 0.03:
    if not (DX - 1.15 < xx < DX + 1.15):
        inst(f'slat{k}', slat_me, (xx, RY - 0.03, (Z5 + Z5C) / 2), mat=M['oak'])
    xx += 0.09; k += 1
box('logo_panel', (DX - 1.15, RY - 0.06, Z5), (DX + 1.15, RY - 0.01, Z5C), M['wall_black'])
logo('wall_logo', (DX, RY - 0.2, Z5 + 2.45), 1.3, 0.05, dict(white=M['acrylic'], red=pbr('logo_red', '#C8101C', 0.35, coat=0.4), blue=pbr('logo_blue', '#0F7FD0', 0.35, coat=0.4)))
INTERIOR_LIGHTS.append(point('halo_l', (DX, RY - 0.09, Z5 + 2.45), 45, WARM, size=0.3))
text_ob('wall_word', 'SHAAN FITNESS', FONT_SANS, 0.2, M['gold'], (DX, RY - 0.07, Z5 + 1.55), extrude=0.006, spacing=1.25)
text_ob('wall_tag', 'YOUR TRUSTED HEALTH PARTNER', FONT_SEMI, 0.07, M['gold'], (DX, RY - 0.07, Z5 + 1.36), extrude=0.002, spacing=1.6)
INTERIOR_LIGHTS.append(spot('logowash', (DX, RY - 1.8, Z5C - 0.2), 280, WARM, rot=(math.radians(40), 0, 0), size=0.25, angle=50))
# lounge by the glass
box('bench', (SX0 + 0.3, 0.9, Z5), (SX0 + 2.3, 1.45, Z5 + 0.42), M['leather'], bevel=0.04)
vase = cyl_mesh('vase', 0.16, 1.1, 24, r2=0.09)
inst('vase', vase, (SX0 + 0.45, 2.1, Z5 + 0.55), mat=M['gold_paint'])

# ---------------------------------------------------------------- gym floor
# mirror and two-tier dumbbell rack along the back wall, five pillars painted above
box('mirror', (-8.8, SY1 - 0.03, Z5 + 0.45), (0.8, SY1 - 0.01, Z5 + 2.55), M['mirror'])
box('mirror_glow', (-8.8, SY1 - 0.05, Z5 + 0.43), (0.8, SY1 - 0.03, Z5 + 0.45), E['warm_strip'])
RY0 = SY1 - 0.85
box('rack_base', (-8.4, RY0, Z5), (0.4, RY0 + 0.7, Z5 + 0.08), M['black_steel'])
for k, x in enumerate([-8.3, -4.0, 0.3]):
    box(f'rack_leg{k}', (x - 0.04, RY0, Z5), (x + 0.04, RY0 + 0.7, Z5 + 0.85), M['black_steel'])
for t, (zz, yy) in enumerate([(Z5 + 0.45, RY0 + 0.15), (Z5 + 0.82, RY0 + 0.45)]):
    box(f'rack_shelf{t}', (-8.4, yy - 0.18, zz - 0.03), (0.4, yy + 0.18, zz), M['black_steel'])
    for k in range(9):
        r = 0.065 + 0.006 * k + 0.012 * t; ln = 0.08 + 0.006 * k
        head = cyl_mesh(f'dbh{t}{k}', r, ln, 6); handle = cyl_mesh(f'dbg{t}{k}', 0.017, 0.14, 12)
        for side in (0, 1):
            cx = -8.05 + k * 0.95 + side * 0.42
            for sgn in (-1, 1):
                inst(f'db{t}{k}{side}{sgn}', head, (cx + sgn * (0.07 + ln / 2), yy, zz + r * 0.87), rot=(0, math.pi / 2, 0), mat=M['plate_black'])
            inst(f'dbg{t}{k}{side}', handle, (cx, yy, zz + r * 0.87), rot=(0, math.pi / 2, 0), mat=M['chrome'])
text_ob('pillars', 'FORGE    BLAZE    FLOW    STRIKE    TRIBE', FONT_SERIF, 0.36, M['gold_paint'], (-4.0, SY1 - 0.02, Z5 + 3.2), spacing=1.12)
INTERIOR_LIGHTS.append(area_light('wallwash', (-4.0, SY1 - 2.0, Z5C - 0.3), 9.5, 0.4, 300, WARM, rot=(math.radians(-28), 0, 0)))
def plate_mesh(name):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=64, radius1=0.225, radius2=0.225, depth=0.055)
    edges = [e for e in bm.edges if all(abs(v.co.length - 0) > 0 and math.hypot(v.co.x, v.co.y) > 0.2 for v in e.verts) and abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
    bmesh.ops.bevel(bm, geom=edges, offset=0.009, segments=3, affect='EDGES', profile=0.5)
    me_ = bpy.data.meshes.new(name); bm.to_mesh(me_); bm.free()
    for p in me_.polygons: p.use_smooth = True
    return me_
PLATE_ME = {k: plate_mesh(f'plate_{k}') for k in ('plate_black', 'plate_red', 'plate_blue')}
HUB = cyl_mesh('hub', 0.07, 0.06, 32)
BAR = cyl_mesh('bar', 0.014, 1.31, 24); SLEEVE = cyl_mesh('sleeve', 0.025, 0.42, 32)
def bar(name, c, plates, rz=0.0):
    x, y, z = c
    holder = bpy.data.objects.new(name, None); link(holder); holder.location = c; holder.rotation_euler = (0, 0, rz)
    def put(nm, me_, lx, mat, sz=(1, 1, 1)):
        ob = inst(nm, me_, (lx, 0, 0), rot=(0, math.pi / 2, 0), mat=mat, scale=sz); ob.parent = holder
    put(name + '_bar', BAR, 0, M['steel'])
    for sgn in (-1, 1):
        put(f'{name}_sl{sgn}', SLEEVE, sgn * (0.655 + 0.21), M['chrome'])
        off = 0.68
        for pi, (col, th) in enumerate(plates):
            put(f'{name}_p{sgn}{pi}', PLATE_ME['plate_' + col], sgn * (off + th / 2), M['plate_' + col], (1, 1, th / 0.055))
            put(f'{name}_h{sgn}{pi}', HUB, sgn * (off + th / 2), M['steel'], (1, 1, th / 0.055 * 1.02))
            off += th + 0.004
def power_rack(px, py):
    # uprights along y (the rack faces -x, into the room)
    for dx in (-0.55, 0.55):
        for dy in (-0.6, 0.6):
            box(f'pr_up{px}{py}{dx}{dy}', (px + dx - 0.038, py + dy - 0.038, Z5), (px + dx + 0.038, py + dy + 0.038, Z5 + 2.3), M['black_steel'])
    for dx in (-0.55, 0.55):
        box(f'pr_top{px}{py}{dx}', (px + dx - 0.038, py - 0.64, Z5 + 2.26), (px + dx + 0.038, py + 0.64, Z5 + 2.34), M['black_steel'])
    for dy in (-0.6, 0.6):
        box(f'pr_side{px}{py}{dy}', (px - 0.6, py + dy - 0.038, Z5 + 2.26), (px + 0.6, py + dy + 0.038, Z5 + 2.34), M['black_steel'])
        box(f'pr_hook{px}{py}{dy}', (px - 0.68, py + dy - 0.05, Z5 + 1.35), (px - 0.55, py + dy + 0.05, Z5 + 1.42), M['steel'])
    bar(f'prbar{px}{py}', (px - 0.62, py, Z5 + 1.45), plates=[('black', 0.05), ('black', 0.05)], rz=math.pi / 2)
    for s in range(3):
        inst(f'pr_store{px}{py}{s}', PLATE_ME['plate_black'], (px + 0.2, py + 0.75 + 0.06 * s, Z5 + 0.45), rot=(math.pi / 2, 0, 0), mat=M['plate_black'])
for py in (5.2, 9.2):
    power_rack(1.15, py)
# lifting platform with a loaded bar: red 25s and blue 20s (competition colours, and the logo's)
PX, PY = -4.4, 5.6
box('platform', (PX - 1.5, PY - 1.2, Z5), (PX + 1.5, PY + 1.2, Z5 + 0.04), M['walnut'])
INTERIOR_LIGHTS.append(spot('platspot', (PX, PY - 0.3, Z5C - 0.2), 420, kelvin(3800), size=0.3, angle=48, blend=0.7))
INTERIOR_LIGHTS.append(spot('rackspot1', (0.3, 5.2, Z5C - 0.2), 200, kelvin(3800), size=0.3, angle=50, blend=0.7))
INTERIOR_LIGHTS.append(spot('rackspot2', (0.3, 9.2, Z5C - 0.2), 200, kelvin(3800), size=0.3, angle=50, blend=0.7))
box('platform_l', (PX - 1.5, PY - 1.2, Z5), (PX - 0.7, PY + 1.2, Z5 + 0.045), M['rubber'])
box('platform_r', (PX + 0.7, PY - 1.2, Z5), (PX + 1.5, PY + 1.2, Z5 + 0.045), M['rubber'])
bar('platbar', (PX, PY, Z5 + 0.27), plates=[('red', 0.068), ('blue', 0.062), ('black', 0.05)])
# benches, kettlebells, a cable station, turf lane with a sled
for k, (bx, by) in enumerate([(-6.6, 9.6), (-2.2, 9.6)]):
    box(f'bench_pad{k}', (bx - 0.14, by - 0.6, Z5 + 0.38), (bx + 0.14, by + 0.6, Z5 + 0.46), M['pad'], bevel=0.02)
    box(f'bench_frame{k}', (bx - 0.05, by - 0.5, Z5), (bx + 0.05, by + 0.5, Z5 + 0.38), M['black_steel'])
KB = bmesh.new(); bmesh.ops.create_uvsphere(KB, u_segments=24, v_segments=16, radius=0.1)
kb_me = bpy.data.meshes.new('kb'); KB.to_mesh(kb_me); KB.free()
for p in kb_me.polygons: p.use_smooth = True
for k in range(9):
    inst(f'kb{k}', kb_me, (-8.6 + k * 0.32, RY0 - 0.35, Z5 + 0.1), mat=M['plate_black'], scale=(1 + 0.03 * k,) * 3)
for dy in (-0.6, 0.6):   # cable station in the back-right corner
    box(f'cable_up{dy}', (1.5, 11.6 + dy - 0.04, Z5), (1.58, 11.6 + dy + 0.04, Z5 + 2.2), M['black_steel'])
box('cable_top', (1.5, 10.96, Z5 + 2.15), (1.58, 12.24, Z5 + 2.23), M['black_steel'])
box('cable_stack', (1.62, 11.4, Z5), (1.82, 11.8, Z5 + 1.1), M['black_steel'])
box('turf', (RX1 + 0.4, 0.6, Z5), (SX1 - 0.4, 2.4, Z5 + 0.012), M['turf'])
for k in range(6):
    box(f'turfline{k}', (RX1 + 0.8 + k * 2.0, 0.6, Z5 + 0.012), (RX1 + 0.86 + k * 2.0, 2.4, Z5 + 0.014), M['paint_white'])
box('sled_base', (-1.2, 1.1, Z5 + 0.01), (-0.4, 1.9, Z5 + 0.08), M['black_steel'], bevel=0.01)
box('sled_post', (-0.85, 1.45, Z5 + 0.08), (-0.75, 1.55, Z5 + 0.6), M['black_steel'])

# ---------------------------------------------------------------- assessment zone: scan pad + holographic body
PAD = Vector((DX, 9.4, Z5))
FACE = math.radians(64)          # the figure turns toward the camera's approach
box('scan_base', (PAD.x - 1.7, PAD.y - 1.7, Z5), (PAD.x + 1.7, PAD.y + 1.7, Z5 + 0.006), M['stone_top'])
pad_me = cyl_mesh('scanpad', 0.72, 0.06, 96); inst('scanpad', pad_me, (PAD.x, PAD.y, Z5 + 0.03), mat=M['black_steel'])
def ring(name, r, z, mat, thick=0.008):
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=False, radius=r, segments=160)
    me_ = bpy.data.meshes.new(name); bm.to_mesh(me_); bm.free()
    ob = inst(name, me_, (PAD.x, PAD.y, z), mat=mat); ob.modifiers.new('sk', 'SKIN')
    for v in me_.skin_vertices[0].data: v.radius = (thick, thick)
    return ob
HUD_M = emissive('hud', lin('#38b6ff'), 0.0)
ring('padring', 0.70, Z5 + 0.062, E['ring'])
HUD = [ring('hud1', 1.05, Z5 + 0.01, HUD_M, 0.004), ring('hud2', 1.45, Z5 + 0.01, HUD_M, 0.003)]
tick = bpy.data.meshes.new('tick'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x * 0.006, v.co.y * 0.09, v.co.z * 0.004))
bm.to_mesh(tick); bm.free()
for k in range(72):
    a = k / 72 * 2 * math.pi; r = 1.25
    HUD.append(inst(f'tick{k}', tick, (PAD.x + r * math.sin(a), PAD.y + r * math.cos(a), Z5 + 0.012), rot=(0, 0, -a), mat=HUD_M, scale=(1, 1.8 if k % 6 == 0 else 1, 1)))
SCAN_RING = ring('scanring', 0.74, Z5 + 0.1, E['ring'], 0.007)

def load_body():
    V, F = [], []
    groups, cur = {}, None
    for line in open(os.path.join(SCR, 'mh', 'base.obj')):
        if line.startswith('v '): V.append([float(t) for t in line.split()[1:4]])
        elif line.startswith('g '): cur = line.split()[1]; groups.setdefault(cur, set())
        elif line.startswith('f ') and cur == 'body':
            F.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
        elif line.startswith('f ') and cur and cur.startswith('joint'):
            groups[cur].update(int(t.split('/')[0]) - 1 for t in line.split()[1:])
    V = np.array(V)
    def target(name, w):
        for line in open(os.path.join(SCR, 'mh', name + '.target')):
            if line[0] in '#\n': continue
            p = line.split(); i = int(p[0]); V[i] += w * np.array([float(p[1]), float(p[2]), float(p[3])])
    target('universal-male-young-maxmuscle-averageweight', 1.0)
    for name, w in (('torso-vshape-incr', 0.9), ('torso-scale-horiz-incr', 0.25), ('hip-scale-horiz-decr', 0.55),
                    ('measure-shoulder-dist-incr', 0.7), ('measure-waist-circ-decr', 0.6), ('measure-hips-circ-decr', 0.7)):
        target(name, w)
    joints = {g: V[sorted(ix)].mean(0) for g, ix in groups.items() if g.startswith('joint') and ix}
    used = sorted({i for f in F for i in f}); remap = {o: n for n, o in enumerate(used)}
    return V[used], [[remap[i] for i in f] for f in F], joints

def muscle_masks(V, F, J):
    nrm = np.zeros_like(V)
    for f in F:
        a, b, c = V[f[0]], V[f[1]], V[f[2]]; n = np.cross(b - a, c - a)
        for i in f: nrm[i] += n
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    def seg_d(p, a, b):
        ab = b - a; t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    segs = {}
    for s in 'lr':
        segs[f'uarm_{s}'] = (J[f'joint-{s}-shoulder'], J[f'joint-{s}-elbow'], 0.55)
        segs[f'farm_{s}'] = (J[f'joint-{s}-elbow'], J[f'joint-{s}-hand'], 0.45)
        segs[f'thigh_{s}'] = (J[f'joint-{s}-upper-leg'], J[f'joint-{s}-knee'], 0.95)
        segs[f'shin_{s}'] = (J[f'joint-{s}-knee'], J[f'joint-{s}-ankle'], 0.62)
    segs['torso'] = (J['joint-pelvis'], J['joint-neck'], 1.55)
    segs['head'] = (J['joint-neck'], J['joint-head-2'], 0.95)
    names = list(segs); D = np.stack([seg_d(V, a, b) - r for a, b, r in segs.values()], 1)
    owner = np.array(names)[D.argmin(1)]
    y = V[:, 1]; fz = nrm[:, 2]; ax = np.abs(V[:, 0])
    torso = owner == 'torso'
    sh = np.minimum(np.linalg.norm(V - J['joint-l-shoulder'], axis=1), np.linalg.norm(V - J['joint-r-shoulder'], axis=1))
    pecs = torso & (y > 3.85) & (y < 5.2) & (fz > 0.2) & (ax < 1.75)
    delts = (sh < 0.85) & (ax > 1.2)
    arms = np.isin(owner, ['uarm_l', 'uarm_r', 'farm_l', 'farm_r']) & (sh >= 0.7)
    core = torso & (y > 1.25) & (y <= 3.85) & (fz > -0.25)
    legs = np.isin(owner, ['thigh_l', 'thigh_r', 'shin_l', 'shin_r']) | (torso & (y < 1.5) & (fz < -0.25))
    Mk = np.stack([pecs | delts, arms, core, legs], 1).astype(np.float32)
    nb = [[] for _ in range(len(V))]
    for f in F:
        for k in range(len(f)): nb[f[k]].append(f[(k + 1) % len(f)]); nb[f[k]].append(f[k - 1])
    nb = [np.array(n) for n in nb]
    for _ in range(5):
        Mk = 0.5 * Mk + 0.5 * np.stack([Mk[n].mean(0) if len(n) else Mk[i] for i, n in enumerate(nb)])
    return Mk

BV, BF, BJ = load_body()
MASK = muscle_masks(BV, BF, BJ)
def smooth_head(V, F, J, iters=70):
    neck = J['joint-neck'][1]
    w = np.clip((V[:, 1] - (neck + 0.45)) / 0.5, 0, 1)[:, None]   # 0 below the jaw, 1 on the head
    nb = [[] for _ in range(len(V))]
    for f in F:
        for k in range(len(f)): nb[f[k]].append(f[(k + 1) % len(f)]); nb[f[k]].append(f[k - 1])
    nb = [np.array(n) for n in nb]
    for _ in range(iters):
        avg = np.stack([V[n].mean(0) if len(n) else V[i] for i, n in enumerate(nb)])
        V = V + 0.6 * w * (avg - V)
    return V
BV = smooth_head(BV, BF, BJ)
S = 1.80 / (BV[:, 1].max() - BV[:, 1].min())
me = bpy.data.meshes.new('body'); me.from_pydata([tuple(v) for v in BV], [], BF); me.update()
_bm = bmesh.new(); _bm.from_mesh(me)
bmesh.ops.holes_fill(_bm, edges=_bm.edges[:], sides=80)      # close the eye and mouth openings
_bm.to_mesh(me); _bm.free(); me.update()
for p in me.polygons: p.use_smooth = True
ca = me.color_attributes.new('mA', 'FLOAT_COLOR', 'POINT')
for i, m4 in enumerate(MASK): ca.data[i].color = (float(m4[0]), float(m4[1]), float(m4[2]), float(m4[3]))
BODY = bpy.data.objects.new('body', me); link(BODY)
BODY.rotation_euler = (math.pi / 2, 0, FACE); BODY.scale = (S, S, S)
BODY.location = (PAD.x, PAD.y, Z5 + 0.065 - BV[:, 1].min() * S)
sub = BODY.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
holo, nt = node_mat('holo')
for n in list(nt.nodes):
    if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
N = nt.nodes.new; L = nt.links.new
lw = N('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.45
attr = N('ShaderNodeAttribute'); attr.attribute_name = 'mA'; attr.attribute_type = 'GEOMETRY'
sep = N('ShaderNodeSeparateColor'); L(attr.outputs['Color'], sep.inputs['Color'])
GV = {}
def val(name, v=0.0):
    n = N('ShaderNodeValue'); n.name = name; n.outputs[0].default_value = v; GV[name] = n; return n
def math_n(op, a, b=None, clamp=False):
    n = N('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    for k, x in enumerate((a, b)):
        if x is None: continue
        if isinstance(x, (int, float)): n.inputs[k].default_value = x
        else: L(x, n.inputs[k])
    return n.outputs[0]
msum = math_n('ADD', math_n('ADD', math_n('MULTIPLY', sep.outputs[0], val('g_chest').outputs[0]), math_n('MULTIPLY', sep.outputs[1], val('g_arms').outputs[0])),
              math_n('ADD', math_n('MULTIPLY', sep.outputs[2], val('g_core').outputs[0]), math_n('MULTIPLY', attr.outputs['Alpha'], val('g_legs').outputs[0])), clamp=True)
tc = N('ShaderNodeTexCoord'); sepz = N('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sepz.inputs['Vector'])
lines = math_n('POWER', math_n('ABSOLUTE', math_n('SINE', math_n('MULTIPLY', sepz.outputs['Y'], 11.0))), 24.0)
# muscle fibre striations: distorted bands, so lit groups read as muscle, not paint
geo = N('ShaderNodeNewGeometry')
cav = N('ShaderNodeMapRange'); cav.inputs['From Min'].default_value = 0.47; cav.inputs['From Max'].default_value = 0.53
cav.inputs['To Min'].default_value = 0.25; cav.inputs['To Max'].default_value = 1.35
L(geo.outputs['Pointiness'], cav.inputs['Value'])
wv = N('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'
wv.inputs['Scale'].default_value = 7.0; wv.inputs['Distortion'].default_value = 1.5; wv.inputs['Detail'].default_value = 1.0
L(tc.outputs['Object'], wv.inputs['Vector'])
fine = math_n('ADD', 0.82, math_n('MULTIPLY', wv.outputs['Fac'], 0.25))
fibre = math_n('MULTIPLY', cav.outputs['Result'], fine)
reveal = math_n('LESS_THAN', sepz.outputs['Y'], val('reveal_y', 99).outputs[0])
rim = math_n('POWER', lw.outputs['Facing'], 2.0)
blue = N('ShaderNodeEmission'); blue.inputs['Color'].default_value = (*lin('#3cb4ff'), 1)
blue_str = math_n('ADD', math_n('MULTIPLY', rim, 2.2), math_n('ADD', math_n('MULTIPLY', lines, 0.25), 0.05))
L(math_n('MULTIPLY', math_n('MULTIPLY', blue_str, math_n('SUBTRACT', 1.0, math_n('MULTIPLY', msum, 0.7))), val('holo_on', 1.0).outputs[0]), blue.inputs['Strength'])
red = N('ShaderNodeEmission'); red.inputs['Color'].default_value = (*lin('#ff6a3d'), 1)
musc_str = math_n('MULTIPLY', math_n('MULTIPLY', msum, fibre), math_n('ADD', 0.9, math_n('MULTIPLY', rim, 1.2)))
L(math_n('MULTIPLY', musc_str, GV['holo_on'].outputs[0]), red.inputs['Strength'])
add = N('ShaderNodeAddShader'); L(blue.outputs[0], add.inputs[0]); L(red.outputs[0], add.inputs[1])
tr = N('ShaderNodeBsdfTransparent')
op = math_n('MINIMUM', math_n('ADD', math_n('ADD', math_n('MULTIPLY', rim, 0.7), math_n('MULTIPLY', msum, 0.6)), 0.08), 1.0)
op = math_n('MULTIPLY', op, reveal)
mix = N('ShaderNodeMixShader'); L(op, mix.inputs['Fac']); L(tr.outputs[0], mix.inputs[1]); L(add.outputs[0], mix.inputs[2])
L(mix.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
me.materials.append(holo)
# a sparse wire cage, revealed with the body and fading as the muscles take over
cage = BODY.copy(); cage.data = BODY.data.copy(); cage.name = 'cage'; link(cage); cage.modifiers.clear()
dc = cage.modifiers.new('dec', 'DECIMATE'); dc.ratio = 0.07
wf = cage.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.014; wf.use_relative_offset = False
wmat, wnt = node_mat('wire')
for n in list(wnt.nodes):
    if n.type != 'OUTPUT_MATERIAL': wnt.nodes.remove(n)
we = wnt.nodes.new('ShaderNodeEmission'); we.inputs['Color'].default_value = (*lin('#3cb4ff'), 1); we.inputs['Strength'].default_value = 1.2
wtc = wnt.nodes.new('ShaderNodeTexCoord'); wsz = wnt.nodes.new('ShaderNodeSeparateXYZ'); wnt.links.new(wtc.outputs['Object'], wsz.inputs['Vector'])
wlt = wnt.nodes.new('ShaderNodeMath'); wlt.operation = 'LESS_THAN'; wnt.links.new(wsz.outputs['Y'], wlt.inputs[0]); wlt.inputs[1].default_value = 99
wtr = wnt.nodes.new('ShaderNodeBsdfTransparent'); wmx = wnt.nodes.new('ShaderNodeMixShader')
wm2 = wnt.nodes.new('ShaderNodeMath'); wm2.operation = 'MULTIPLY'; wnt.links.new(wlt.outputs[0], wm2.inputs[0]); wm2.inputs[1].default_value = 0.0
wnt.links.new(wm2.outputs[0], wmx.inputs['Fac']); wnt.links.new(wtr.outputs[0], wmx.inputs[1]); wnt.links.new(we.outputs[0], wmx.inputs[2])
wnt.links.new(wmx.outputs[0], wnt.nodes['Material Output'].inputs['Surface'])
cage.data.materials.clear(); cage.data.materials.append(wmat)
WIRE = dict(lt=wlt, op=wm2, em=we)
INTERIOR_LIGHTS.append(spot('scanspot', (PAD.x + 0.6, PAD.y - 0.6, Z5C - 0.2), 90, kelvin(5600), size=0.4, angle=45))

# ---------------------------------------------------------------- world (blue hour), camera, render
world = bpy.data.worlds.new('dusk'); sc.world = world
try: world.use_nodes = True
except Exception: pass
wn = world.node_tree; bg = wn.nodes['Background']
wtc2 = wn.nodes.new('ShaderNodeTexCoord'); sepw = wn.nodes.new('ShaderNodeSeparateXYZ'); wn.links.new(wtc2.outputs['Generated'], sepw.inputs['Vector'])
ramp = wn.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp
cr.elements[0].position = 0.0; cr.elements[0].color = (*lin('#5d4c4a'), 1)
cr.elements[1].position = 1.0; cr.elements[1].color = (*lin('#070b17'), 1)
for pos, col in ((0.06, '#3e4763'), (0.35, '#16203a')):
    e = cr.elements.new(pos); e.color = (*lin(col), 1)
wn.links.new(sepw.outputs['Z'], ramp.inputs['Fac']); wn.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0

cam_d = bpy.data.cameras.new('cam'); CAM = bpy.data.objects.new('cam', cam_d); link(CAM); sc.camera = CAM
cam_d.clip_start = 0.05; cam_d.clip_end = 400
cam_d.dof.use_dof = True

KEYS = [
    (0,   (-14.5, -27.0, 1.7),  (-6.5, 0.0, 15.5), 22),
    (14,  (-12.0, -20.5, 7.0),  (-7.5, 0.0, 19.5), 24),
    (28,  (-10.8, -13.0, 15.2), (-8.0, 0.0, 22.4), 26),
    (40,  (-11.3, -4.0, 20.3),  (-11.6, 3.0, 20.15), 28),
    (48,  (-11.5, -0.5, 20.22), (-11.6, 5.0, 20.4), 30),
    (60,  (-11.6, 1.2, 20.15),  (-11.6, 5.0, 20.75), 34),
    (72,  (-10.2, 1.9, 20.1),   (-4.2, 6.0, 19.5), 30),
    (84,  (-8.2, 2.5, 19.85),   (-3.2, 7.5, 19.1), 30),
    (98,  (-6.1, 4.25, 19.1),   (-3.7, 5.6, 18.95), 35),
    (110, (-6.6, 6.4, 19.6),    (-11.6, 9.4, 19.6), 32),
    (124, (-8.3, 8.0, 19.85),   (-11.6, 9.4, 19.6), 38),
    (140, (-9.25, 8.55, 20.15), (-11.6, 9.4, 19.95), 46),
    (159, (-7.9, 7.7, 19.75),   (-11.6, 9.4, 19.5), 36),
]

def catmull(points, t):
    fr = [p[0] for p in points]
    i = max(0, min(len(fr) - 2, int(np.searchsorted(fr, t, side='right')) - 1))
    p0 = points[max(i - 1, 0)][1]; p1 = points[i][1]; p2 = points[i + 1][1]; p3 = points[min(i + 2, len(points) - 1)][1]
    u = (t - fr[i]) / (fr[i + 1] - fr[i])
    u2, u3 = u * u, u * u * u
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)

def smooth(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

STRIP_N = E['strip'].node_tree.nodes[E['strip']['strength_node']]
RING_N = E['ring'].node_tree.nodes[E['ring']['strength_node']]
HUD_N = HUD_M.node_tree.nodes[HUD_M['strength_node']]
def set_frame(f, fmt):
    pos = catmull([(k[0], np.array(k[1])) for k in KEYS], f)
    tgt = catmull([(k[0], np.array(k[2])) for k in KEYS], f)
    lens = catmull([(k[0], np.array([float(k[3])])) for k in KEYS], f)[0]
    CAM.location = Vector(pos)
    d = Vector(tgt) - Vector(pos)
    CAM.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_d.lens = lens * ((0.97 - 0.15 * smooth(30, 46, f)) if fmt == 'port' else 1.0)
    cam_d.dof.focus_distance = d.length
    cam_d.dof.aperture_fstop = 8.0 if f < 42 else (2.8 if 90 <= f <= 104 else 4.5)
    scan = smooth(110, 122, f)
    sc.view_settings.exposure = EXPO + 0.35 * (1 - smooth(38, 50, f))
    for ob in INTERIOR_LIGHTS:
        ob.data.energy = ob['base'] * ((0.35 + 0.65 * scan) if ob.name == 'scanspot' else (1 - 0.4 * scan))
    STRIP_N.inputs['Strength'].default_value = 6.0 * (1 - 0.45 * scan)
    RING_N.inputs['Strength'].default_value = 0.8 + 2.6 * scan
    HUD_N.inputs['Strength'].default_value = 1.4 * scan
    for h in HUD: h.hide_render = scan < 0.02
    rv = smooth(114, 130, f)
    top, bot = BV[:, 1].max(), BV[:, 1].min()
    ry = bot - 0.3 + (top - bot + 0.6) * rv
    GV['reveal_y'].outputs[0].default_value = ry if rv < 1 else 99
    WIRE['lt'].inputs[1].default_value = ry if rv < 1 else 99
    WIRE['op'].inputs[1].default_value = 0.6 * (1 - 0.65 * smooth(130, 140, f))
    GV['holo_on'].outputs[0].default_value = 1.0
    on = f >= 113
    BODY.hide_render = not on; cage.hide_render = not on
    SCAN_RING.hide_render = not (113 <= f <= 131)
    SCAN_RING.location.z = Z5 + 0.08 + 1.88 * rv
    pulse = lambda a, b: smooth(a, a + 3, f) * (1 - 0.88 * smooth(b, b + 4, f))
    allon = 0.22 * smooth(152, 158, f)
    GV['g_chest'].outputs[0].default_value = 1.5 * pulse(128, 137) + allon
    GV['g_arms'].outputs[0].default_value = 1.5 * pulse(134, 143) + allon
    GV['g_core'].outputs[0].default_value = 1.5 * pulse(140, 148) + allon
    GV['g_legs'].outputs[0].default_value = 1.5 * pulse(145, 153) + allon

sc.render.engine = 'CYCLES'
cy = sc.cycles; cy.device = 'CPU'
cy.samples = A.spp; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.05
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
try: cy.denoising_prefilter = 'ACCURATE'
except Exception: pass
cy.max_bounces = 8; cy.diffuse_bounces = 2; cy.glossy_bounces = 2; cy.transmission_bounces = 4; cy.transparent_max_bounces = 24
cy.volume_bounces = 0; cy.sample_clamp_indirect = 3.0; cy.caustics_reflective = False; cy.caustics_refractive = False
cy.blur_glossy = 1.0
sc.render.use_persistent_data = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Base Contrast'
except Exception: pass
EXPO = float(os.environ.get('EXPOSURE', '-0.05'))
W_, H_ = (1280, 720) if A.fmt == 'land' else (720, 1280)
sc.render.resolution_x = W_; sc.render.resolution_y = H_; sc.render.resolution_percentage = int(A.scale * 100)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'

def frames(spec):
    out = []
    for part in spec.split(','):
        if '-' in part:
            a, b = part.split('-'); out += list(range(int(a), int(b) + 1))
        else: out.append(int(part))
    return out

os.makedirs(A.out, exist_ok=True)
for f in frames(A.frames):
    path = os.path.join(A.out, f'{A.fmt}_{f:03d}.png')
    if os.path.exists(path) and os.environ.get('SKIP_EXISTING'):
        continue
    t0 = time.time(); set_frame(f, A.fmt); sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'frame {f} {time.time() - t0:.1f}s', flush=True)
