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


# ---------------------------------------------------------------- prologue: the logo assembles itself
# 64 frames. 0-14 gold blueprint lines draw the logo; 10-34 the 15 metal pieces fly in and lock (small sparks);
# 34-48 a light sweep across the chrome as the camera moves round; 48 is the hero still; 48-63 the camera pushes in
# (the film dissolves from here into the street, in post).
P_N = 64
SCALE = 1.4 / 512
EMB_Z = 1.0
emb = bpy.data.objects.new('emblem', None); link(emb); emb.location = (0, 0, EMB_Z); emb.rotation_euler = (math.pi / 2, 0, 0)

MAT_P = dict(
    white=pbr('p_white', '#F0F0F2', 0.12, 1.0),
    red=pbr('p_red', '#8C0A15', 0.24, 0.55, coat=1.0),
    blue=pbr('p_blue', '#0A4C9C', 0.24, 0.55, coat=1.0),
)
DEPTH = dict(white=0.05, red=0.07, blue=0.08)
FRONT = dict(white=0.0, red=0.012, blue=0.018)
# the blueprint lines are revealed by a scanner sweeping left to right (world x), with a brighter leading edge
GOLD_LINE, _gl = node_mat('p_line')
for n in list(_gl.nodes):
    if n.type != 'OUTPUT_MATERIAL': _gl.nodes.remove(n)
_ge = _gl.nodes.new('ShaderNodeEmission'); _ge.inputs['Color'].default_value = (*lin('#D6B878'), 1)
_geo = _gl.nodes.new('ShaderNodeNewGeometry'); _sx = _gl.nodes.new('ShaderNodeSeparateXYZ'); _gl.links.new(_geo.outputs['Position'], _sx.inputs['Vector'])
SWEEP_X = _gl.nodes.new('ShaderNodeValue'); SWEEP_X.outputs[0].default_value = 9.0
LINE_STR = _gl.nodes.new('ShaderNodeValue'); LINE_STR.outputs[0].default_value = 0.0
_d = _gl.nodes.new('ShaderNodeMath'); _d.operation = 'SUBTRACT'; _gl.links.new(SWEEP_X.outputs[0], _d.inputs[0]); _gl.links.new(_sx.outputs['X'], _d.inputs[1])
_on = _gl.nodes.new('ShaderNodeMath'); _on.operation = 'GREATER_THAN'; _gl.links.new(_d.outputs[0], _on.inputs[0]); _on.inputs[1].default_value = 0.0
_edge = _gl.nodes.new('ShaderNodeMapRange'); _edge.inputs['From Min'].default_value = 0.0; _edge.inputs['From Max'].default_value = 0.18
_edge.inputs['To Min'].default_value = 3.0; _edge.inputs['To Max'].default_value = 1.0; _gl.links.new(_d.outputs[0], _edge.inputs['Value'])
_m1 = _gl.nodes.new('ShaderNodeMath'); _m1.operation = 'MULTIPLY'; _gl.links.new(_on.outputs[0], _m1.inputs[0]); _gl.links.new(_edge.outputs['Result'], _m1.inputs[1])
_m2 = _gl.nodes.new('ShaderNodeMath'); _m2.operation = 'MULTIPLY'; _gl.links.new(_m1.outputs[0], _m2.inputs[0]); _gl.links.new(LINE_STR.outputs[0], _m2.inputs[1])
_gl.links.new(_m2.outputs[0], _ge.inputs['Strength'])
_tr = _gl.nodes.new('ShaderNodeBsdfTransparent'); _mx = _gl.nodes.new('ShaderNodeMixShader')
_gl.links.new(_on.outputs[0], _mx.inputs['Fac']); _gl.links.new(_tr.outputs[0], _mx.inputs[1]); _gl.links.new(_ge.outputs[0], _mx.inputs[2])
_gl.links.new(_mx.outputs[0], _gl.nodes['Material Output'].inputs['Surface'])

def piece_curve(name, sub, cx, cy, fill, depth, bevel, mat):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D' if fill else '3D'; cu.resolution_u = 5
    cu.fill_mode = 'BOTH' if fill else 'FULL'
    cu.extrude = depth / 2 / SCALE if fill else 0.0
    cu.bevel_depth = bevel / SCALE; cu.bevel_resolution = 3 if fill else 2
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(sub) - 1); sp.use_cyclic_u = True
    for bp, pt in zip(sp.bezier_points, sub):
        bp.handle_left_type = bp.handle_right_type = 'FREE'
        bp.co = (pt['co'][0] - cx, cy - pt['co'][1], 0)
        bp.handle_left = (pt['hl'][0] - cx, cy - pt['hl'][1], 0)
        bp.handle_right = (pt['hr'][0] - cx, cy - pt['hr'][1], 0)
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu); ob.scale = (SCALE,) * 3
    link(ob); ob.parent = emb
    return ob, cu

rng = random.Random(11)
PIECES = []
for color in ('white', 'red', 'blue'):
    for k, sub in enumerate(parse_path(LOGO[color])):
        xs = [p['co'][0] for p in sub]; ys = [p['co'][1] for p in sub]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        home = Vector(((cx - 256) * SCALE, (256 - cy) * SCALE, FRONT[color]))     # in the emblem's local space
        ob, _ = piece_curve(f'pc_{color}{k}', sub, cx, cy, True, DEPTH[color], 0.0035, MAT_P[color])
        line, lcu = piece_curve(f'pl_{color}{k}', sub, cx, cy, False, 0, 0.0018, GOLD_LINE)
        line.location = home + Vector((0, 0, DEPTH[color] / 2 + 0.003))
        radial = Vector((home.x, home.y, 0))
        radial = radial.normalized() if radial.length > 1e-3 else Vector((rng.uniform(-1, 1), 1, 0)).normalized()
        start = home + radial * rng.uniform(1.2, 2.2) + Vector((0, 0, rng.choice([-1, 1]) * rng.uniform(0.6, 1.6)))
        spin = Euler((rng.uniform(-2.2, 2.2), rng.uniform(-2.2, 2.2), rng.uniform(-1.6, 1.6)))
        size = (max(xs) - min(xs)) * (max(ys) - min(ys))
        PIECES.append(dict(ob=ob, line=lcu, home=home, start=start, spin=spin, size=size))
# big pieces land last (ring, S, F), small parts first, so the shape builds up
PIECES.sort(key=lambda p: p['size'])
for i, p in enumerate(PIECES):
    p['t1'] = 18 + 16 * i / (len(PIECES) - 1)       # lands between frames 18 and 34
    p['t0'] = p['t1'] - 11
    p['draw0'] = 1 + 9 * i / len(PIECES)            # outline starts drawing

# sparks: short gold streaks thrown off as each piece locks
SPARK_M = emissive('p_spark', lin('#FFC27A'), 0.0)
spark_me = bpy.data.meshes.new('spark'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x * 0.0035, v.co.y * 0.0035, v.co.z * 0.03))
bm.to_mesh(spark_me); bm.free(); spark_me.materials.append(SPARK_M)
SPARKS = []
for p in PIECES[-6:]:                                # only the big pieces throw sparks
    for j in range(7):
        ob = bpy.data.objects.new('spk', spark_me); link(ob); ob.parent = emb
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 0.6))).normalized()
        SPARKS.append(dict(ob=ob, at=p['t1'], o=p['home'], d=d, v=rng.uniform(0.5, 1.1)))

# set: glossy black floor, a soft warm glow far behind, drifting dust, three lights and a sweep
box('p_floor', (-30, -30, 0.5), (30, 30, 0.52), pbr('p_floor', '#060607', 0.14))
glow_m, gnt = node_mat('p_glow')
for n in list(gnt.nodes):
    if n.type != 'OUTPUT_MATERIAL': gnt.nodes.remove(n)
ge = gnt.nodes.new('ShaderNodeEmission'); gtc = gnt.nodes.new('ShaderNodeTexCoord'); ggr = gnt.nodes.new('ShaderNodeTexGradient'); ggr.gradient_type = 'SPHERICAL'
gmp = gnt.nodes.new('ShaderNodeMapping'); gmp.inputs['Scale'].default_value = (1.6, 1.6, 1.6)
grp = gnt.nodes.new('ShaderNodeValToRGB')
grp.color_ramp.elements[0].color = (0, 0, 0, 1); grp.color_ramp.elements[1].position = 0.9; grp.color_ramp.elements[1].color = (*lin('#2a241c'), 1)
gnt.links.new(gtc.outputs['Object'], gmp.inputs['Vector']); gnt.links.new(gmp.outputs['Vector'], ggr.inputs['Vector'])
gnt.links.new(ggr.outputs['Fac'], grp.inputs['Fac']); gnt.links.new(grp.outputs['Color'], ge.inputs['Color'])
ge.inputs['Strength'].default_value = 0.9
gnt.links.new(ge.outputs[0], gnt.nodes['Material Output'].inputs['Surface'])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
gme = bpy.data.meshes.new('glow'); bm.to_mesh(gme); bm.free(); gme.materials.append(glow_m)
gob = bpy.data.objects.new('p_glowplane', gme); link(gob); gob.location = (0.4, 6.0, 1.2); gob.rotation_euler = (math.pi / 2, 0, 0); gob.scale = (5, 3, 1)
DUST_M = emissive('p_dust', lin('#E8D3A8'), 0.6)
DUST = []
for i in range(46):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rng.uniform(0.002, 0.006))
    dme = bpy.data.meshes.new('d'); bm.to_mesh(dme); bm.free(); dme.materials.append(DUST_M)
    ob = bpy.data.objects.new('dust', dme); link(ob)
    base = Vector((rng.uniform(-2.4, 2.4), rng.uniform(-2.2, 2.5), rng.uniform(0.6, 2.2)))
    ob.location = base; DUST.append((ob, base, rng.uniform(0, 6.28)))
P_LIGHTS = [
    area_light('p_key', (-1.6, -2.2, 2.4), 2.2, 2.2, 95, kelvin(4800), rot=(math.radians(50), 0, math.radians(-35))),
    area_light('p_rim_gold', (1.4, 1.2, 1.5), 0.25, 1.6, 90, kelvin(3000), rot=(math.radians(-70), 0, math.radians(140))),
    area_light('p_rim_blue', (-1.5, 1.0, 1.3), 0.25, 1.4, 70, lin('#4aa8ff'), rot=(math.radians(-70), 0, math.radians(-140))),
    area_light('p_fill', (0.6, -3.0, 0.6), 2.0, 1.0, 16, kelvin(4200), rot=(math.radians(85), 0, 0)),
]
box('p_reflector', (-2.2, -1.6, 3.2), (0.6, -0.6, 3.22), emissive('p_refl', kelvin(5000), 1.6))
SWEEP = area_light('p_sweep', (-2.0, -1.4, 1.6), 0.12, 2.6, 0.0, kelvin(5200), rot=(math.radians(60), 0, 0))

world = bpy.data.worlds.new('p_world'); sc.world = world
try: world.use_nodes = True
except Exception: pass
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.002, 0.002, 0.0025, 1)

cam_d = bpy.data.cameras.new('cam'); CAM = bpy.data.objects.new('cam', cam_d); link(CAM); sc.camera = CAM
cam_d.clip_start = 0.02; cam_d.dof.use_dof = True
P_KEYS = [
    (0,  (0.15, -3.5, 1.05), (0.0, 0.0, 1.0), 50),
    (16, (-0.75, -3.15, 0.92), (0.0, 0.0, 1.0), 54),
    (34, (0.55, -2.85, 1.12), (0.0, 0.0, 1.0), 58),
    (48, (0.62, -2.7, 1.08), (0.0, 0.0, 1.0), 58),
    (63, (0.18, -1.45, 1.03), (0.03, 0.0, 1.0), 48),
]

def ease_out_back(t, s=1.25):
    t -= 1; return t * t * ((s + 1) * t + s) + 1

def p_frame(f, fmt):
    pos = catmull([(k[0], np.array(k[1])) for k in P_KEYS], f)
    tgt = catmull([(k[0], np.array(k[2])) for k in P_KEYS], f)
    lens = catmull([(k[0], np.array([float(k[3])])) for k in P_KEYS], f)[0]
    CAM.location = Vector(pos); d = Vector(tgt) - Vector(pos)
    CAM.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    port = fmt == 'port'
    cam_d.lens = lens * (0.7 if port else 1.0)
    cam_d.shift_x = 0.0 if port else -0.14
    cam_d.shift_y = -0.1 if port else 0.0
    cam_d.dof.focus_distance = d.length
    cam_d.dof.aperture_fstop = 4.0 - 2.2 * smooth(50, 63, f)
    for p in PIECES:
        t = min(1.0, max(0.0, (f - p['t0']) / (p['t1'] - p['t0'])))
        p['ob'].hide_render = f < p['t0']
        e = ease_out_back(t) if t < 1 else 1.0
        loc = p['start'].lerp(p['home'], e)
        p['ob'].location = loc
        p['ob'].rotation_euler = Euler((p['spin'].x * (1 - e), p['spin'].y * (1 - e), p['spin'].z * (1 - e)))
    SWEEP_X.outputs[0].default_value = -1.0 + 2.4 * smooth(0, 11, f)
    LINE_STR.outputs[0].default_value = 2.0 * (1 - smooth(22, 36, f))
    for s in SPARKS:
        age = f - s['at']
        on = 0 <= age <= 8
        s['ob'].hide_render = not on
        if on:
            dist = s['v'] * age * 0.055
            pos3 = s['o'] + s['d'] * dist + Vector((0, -0.5 * 0.004 * age * age, 0))
            s['ob'].location = pos3
            s['ob'].rotation_euler = s['d'].to_track_quat('Z', 'Y').to_euler()
            s['ob'].scale = (1, 1, max(0.05, 1 - age / 8))
    SPARK_M.node_tree.nodes[SPARK_M['strength_node']].inputs['Strength'].default_value = 7.0
    for ob, base, ph in DUST:
        ob.location = base + Vector((0.03 * math.sin(f * 0.05 + ph), 0.0, 0.012 * f))
    sw = smooth(34, 50, f)
    SWEEP.location.x = -2.0 + 4.0 * sw
    SWEEP.data.energy = 110 * math.sin(math.pi * sw)
    sc.view_settings.exposure = -0.1

def catmull(points, t):
    fr = [p[0] for p in points]
    i = max(0, min(len(fr) - 2, int(np.searchsorted(fr, t, side='right')) - 1))
    p0 = points[max(i - 1, 0)][1]; p1 = points[i][1]; p2 = points[i + 1][1]; p3 = points[min(i + 2, len(points) - 1)][1]
    u = (t - fr[i]) / (fr[i + 1] - fr[i]); u2, u3 = u * u, u * u * u
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)

def smooth(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

sc.render.engine = 'CYCLES'
cy = sc.cycles; cy.device = 'CPU'
cy.samples = A.spp; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.05
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.diffuse_bounces = 2; cy.glossy_bounces = 3; cy.transmission_bounces = 2; cy.transparent_max_bounces = 8
cy.sample_clamp_indirect = 3.0; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 0.5
sc.render.use_persistent_data = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Base Contrast'
except Exception: pass
W_, H_ = (1280, 720) if A.fmt == 'land' else (720, 1280)
sc.render.resolution_x = W_; sc.render.resolution_y = H_; sc.render.resolution_percentage = int(A.scale * 100)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
os.makedirs(A.out, exist_ok=True)
for part in A.frames.split(','):
    rng_ = range(int(part.split('-')[0]), int(part.split('-')[-1]) + 1)
    for f in rng_:
        path = os.path.join(A.out, f'{A.fmt}_p{f:03d}.png')
        if os.path.exists(path) and os.environ.get('SKIP_EXISTING'): continue
        t0 = time.time(); p_frame(f, A.fmt); sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f'frame p{f} {time.time() - t0:.1f}s', flush=True)
