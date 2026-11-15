# Shaan Fitness home film: the logo as a machine, rendered with Cycles. One continuous shot in five beats:
#   0-39   the emblem assembles itself out of smoke (plays by itself on a first visit)
#   40     the hero frame: red, blue and chrome on black, white-blue smoke behind
#   40-76  slow move round to the front
#   76-112 macro glide over the armour plates, bolts and the ring
#   112-136 push in on the blue turbine core
#   136-164 the metal gives way to a glowing wireframe under a dusk sky
#   164-191 sunrise: the solid emblem, backlit, low angle
# Every frame's state is computed from the frame number, so any frame renders on its own.
#
#   python3 emblem.py --fmt land|port --frames 0-191|0,40,96 --scale 1.0 --spp 8 --out DIR
import bpy, bmesh, math, random, sys, os, re, json, time, argparse
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--fmt', default='land')
ap.add_argument('--frames', default='40')
ap.add_argument('--scale', type=float, default=0.5)
ap.add_argument('--spp', type=int, default=4)
ap.add_argument('--out', default=os.path.join(HERE, 'look'))
ap.add_argument('--w', type=int, default=0)
ap.add_argument('--h', type=int, default=0)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
N = 192
HOME = 40

rng = random.Random(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COLL = sc.collection

# ---------------------------------------------------------------- small helpers
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def kelvin(t):
    t = t / 100
    r = 255 if t <= 66 else 329.698727446 * ((t - 60) ** -0.1332047592)
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * ((t - 60) ** -0.0755148492)
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    return lin('#%02x%02x%02x' % tuple(int(max(0, min(255, v))) for v in (r, g, b)))

def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

def mix(a, b, t): return a + (b - a) * t

def link(ob):
    COLL.objects.link(ob); return ob

def node_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    return m, m.node_tree

FADE = []          # value nodes: 1 = solid, 0 = gone (the wireframe chapter)
def fadeable(m):
    nt = m.node_tree; out = nt.nodes['Material Output']
    src = out.inputs['Surface'].links[0].from_socket
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    v = nt.nodes.new('ShaderNodeValue'); v.outputs[0].default_value = 1.0; FADE.append(v)
    nt.links.new(v.outputs[0], mx.inputs['Fac']); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(src, mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m

def metal(name, color, rough, metallic=1.0, coat=0.0, coat_rough=0.05, detail='plain', scratch=0.12, panel=0.0, aniso=0.0):
    """A machined surface: fine scratches in the roughness, optional panel lines and brushed grain."""
    m, nt = node_mat(name)
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metallic
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = coat_rough
    N_ = nt.nodes.new; L = nt.links.new
    tc = N_('ShaderNodeTexCoord')
    # scratches: stretched noise in the roughness
    mp = N_('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (22, 22, 22) if detail == 'flake' else (0.05, 2.5, 2.5)
    L(tc.outputs['Object'], mp.inputs['Vector'])
    vec = mp.outputs['Vector']
    if detail == 'ring':      # lathe-turned: grain follows the circle
        ln = N_('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L(tc.outputs['Object'], ln.inputs[0])
        cmb = N_('ShaderNodeCombineXYZ'); L(ln.outputs['Value'], cmb.inputs['X'])
        mp2 = N_('ShaderNodeMapping'); mp2.inputs['Scale'].default_value = (4, 1, 1); L(cmb.outputs['Vector'], mp2.inputs['Vector'])
        vec = mp2.outputs['Vector']
    nz = N_('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = 3
    L(vec, nz.inputs['Vector'])
    mr = N_('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = max(0.03, rough - scratch); mr.inputs['To Max'].default_value = min(1, rough + scratch)
    L(nz.outputs['Fac'], mr.inputs['Value']); L(mr.outputs['Result'], b.inputs['Roughness'])
    bp = N_('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.0 if detail == 'ring' else (0.2 if detail == 'flake' else 0.08); bp.inputs['Distance'].default_value = 0.0003 if detail == 'flake' else 0.0006
    L(nz.outputs['Fac'], bp.inputs['Height'])
    normal = bp.outputs['Normal']
    if panel:                 # recessed panel lines, like armour plating
        br = N_('ShaderNodeTexBrick'); br.offset = 0.5
        br.inputs['Scale'].default_value = panel; br.inputs['Mortar Size'].default_value = 0.012; br.inputs['Mortar Smooth'].default_value = 0.2
        br.inputs['Brick Width'].default_value = 0.9; br.inputs['Row Height'].default_value = 0.34
        br.inputs['Color1'].default_value = (1, 1, 1, 1); br.inputs['Color2'].default_value = (1, 1, 1, 1); br.inputs['Mortar'].default_value = (0, 0, 0, 1)
        rot = N_('ShaderNodeMapping'); rot.inputs['Rotation'].default_value = (0, 0, math.radians(24)); L(tc.outputs['Object'], rot.inputs['Vector'])
        L(rot.outputs['Vector'], br.inputs['Vector'])
        bp2 = N_('ShaderNodeBump'); bp2.inputs['Strength'].default_value = 1.0; bp2.inputs['Distance'].default_value = 0.003
        L(br.outputs['Color'], bp2.inputs['Height']); L(normal, bp2.inputs['Normal']); normal = bp2.outputs['Normal']
        # the groove itself is darker and rougher
        dk = N_('ShaderNodeMixRGB'); dk.blend_type = 'MULTIPLY'; dk.inputs['Fac'].default_value = 1.0
        dk.inputs['Color1'].default_value = (*lin(color), 1)
        gm = N_('ShaderNodeMapRange'); gm.inputs['To Min'].default_value = 0.25; gm.inputs['To Max'].default_value = 1.0
        L(br.outputs['Color'], gm.inputs['Value'])
        cb = N_('ShaderNodeCombineColor'); L(gm.outputs['Result'], cb.inputs[0]); L(gm.outputs['Result'], cb.inputs[1]); L(gm.outputs['Result'], cb.inputs[2])
        L(cb.outputs['Color'], dk.inputs['Color2']); L(dk.outputs['Color'], b.inputs['Base Color'])
    L(normal, b.inputs['Normal'])
    return fadeable(m)

def emissive(name, color, strength):
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    m['sn'] = e.name
    return m
def set_emit(m, s):
    if m['sn'] == '@S': m.node_tree.nodes['S'].outputs[0].default_value = s
    else: m.node_tree.nodes[m['sn']].inputs['Strength'].default_value = s

def area_light(name, loc, sx, sy, energy, color, look=(0, 0, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = sx; ld.size_y = sy; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); ob.location = loc
    ob.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    link(ob); ob['base'] = energy; return ob

# ---------------------------------------------------------------- the logo's outlines as clean polygons
LOGO = json.load(open(os.path.join(HERE, 'logo.json')))

def parse_path(d):
    toks = re.findall(r'[MLCZ]|-?\d*\.?\d+', d)
    subs, cur, cmd, i = [], None, None, 0
    while i < len(toks):
        t = toks[i]
        if t in 'MLCZ':
            cmd = t; i += 1
            if cmd == 'Z' and cur: subs.append(cur); cur = None
            continue
        f = lambda k: float(toks[i + k])
        if cmd == 'M': cur = [('M', (f(0), f(1)))]; i += 2; cmd = 'L'
        elif cmd == 'L': cur.append(('L', (f(0), f(1)))); i += 2
        elif cmd == 'C': cur.append(('C', (f(0), f(1)), (f(2), f(3)), (f(4), f(5)))); i += 6
    return subs

def polygon(sub, step=4):
    """Sampled outline in emblem units: x right, y up, centred on the logo's centre."""
    pts = []; p = None
    for seg in sub:
        if seg[0] in 'ML': p = seg[1]; pts.append(p)
        else:
            c1, c2, e = seg[1], seg[2], seg[3]
            for k in range(1, step + 1):
                t = k / step; a = (1 - t) ** 3; b = 3 * (1 - t) ** 2 * t; c = 3 * (1 - t) * t * t; d = t ** 3
                pts.append((a * p[0] + b * c1[0] + c * c2[0] + d * e[0], a * p[1] + b * c1[1] + c * c2[1] + d * e[1]))
            p = e
    P = np.array([(x - 256.0, 256.0 - y) for x, y in pts])
    keep = [0]
    for i in range(1, len(P)):
        if np.linalg.norm(P[i] - P[keep[-1]]) >= 0.8: keep.append(i)
    P = P[keep]
    if np.linalg.norm(P[0] - P[-1]) < 0.8: P = P[:-1]
    # drop points that add nothing (nearly straight), keep corners
    out = []
    n = len(P)
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        u = b - a; v = c - b
        cr = abs(u[0] * v[1] - u[1] * v[0]) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9)
        if cr > 0.02 or np.linalg.norm(u) > 3.0: out.append(b)
    return np.array(out)

def area(P):
    x, y = P[:, 0], P[:, 1]; return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))

def inset(P, d):
    """Move the outline inward by d (outward when negative), with a mitre limit."""
    sgn = 1.0 if area(P) > 0 else -1.0
    e1 = P - np.roll(P, 1, 0); e2 = np.roll(P, -1, 0) - P
    unit = lambda v: v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)
    e1 = unit(e1); e2 = unit(e2)
    n1 = np.stack([-e1[:, 1], e1[:, 0]], 1); n2 = np.stack([-e2[:, 1], e2[:, 0]], 1)
    m = unit(n1 + n2); c = np.clip((m * n1).sum(1), 0.55, 1.0)
    return P + sgn * d * m / c[:, None]

def inside(p, P):
    x, y = p; n = len(P); c = False
    for i in range(n):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1: c = not c
    return c

def edge_dist(p, P):
    p = np.array(p); a = P; b = np.roll(P, -1, 0); ab = b - a
    t = np.clip(((p - a) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-9), 0, 1)
    return float(np.min(np.linalg.norm(a + ab * t[:, None] - p, axis=1)))

U = 2.0 / 512.0                 # one logo unit in metres: the logo's box is 2 m wide
ROOT = bpy.data.objects.new('emblem', None); link(ROOT)
ROOT.rotation_euler = (math.pi / 2, 0, 0)     # the logo's plane stands up; its front faces -Y (the camera)
C0 = Vector((0, 0, 1.6))
ROOT.location = C0; ROOT.scale = (U, U, U)

def prism(name, P, z0, z1, ch, mat, parent):
    """A plate: the outline extruded from z0 to z1 with a chamfered front edge."""
    T = inset(P, ch); n = len(P)
    bm = bmesh.new()
    B = [bm.verts.new((x, y, z0)) for x, y in P]
    S = [bm.verts.new((x, y, z1 - ch)) for x, y in P]
    Tt = [bm.verts.new((x, y, z1)) for x, y in T]
    ccw = area(P) > 0
    def quad(a, b, c, d):
        try: bm.faces.new((a, b, c, d) if ccw else (d, c, b, a))
        except ValueError: pass
    for i in range(n):
        j = (i + 1) % n
        quad(B[i], B[j], S[j], S[i]); quad(S[i], S[j], Tt[j], Tt[i])
    for f in bm.faces: f.smooth = False      # flat walls: smooth normals on these long thin faces shade as black triangles
    try:
        bm.faces.new(Tt if ccw else Tt[::-1]).smooth = False; bm.faces.new(B[::-1] if ccw else B).smooth = False
    except ValueError: pass
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.5: e.smooth = False
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); link(ob); ob.parent = parent
    return ob

def ribbon(name, P, d0, d1, z, mat, parent):
    a = inset(P, d0); b = inset(P, d1); n = len(P)
    bm = bmesh.new(); Av = [bm.verts.new((x, y, z)) for x, y in a]; Bv = [bm.verts.new((x, y, z)) for x, y in b]
    for i in range(n):
        j = (i + 1) % n
        try: bm.faces.new((Av[i], Av[j], Bv[j], Bv[i]))
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); link(ob); ob.parent = parent
    return ob

def lathe(name, profile, mats, parent, pick=None, steps=72):
    """A solid of revolution round the X axis from (x, r) profile points."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, r, 0)) for x, r in profile]
    es = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(1, 0, 0), angle=math.tau, steps=steps, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
        if pick: f.material_index = pick(f)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.6: e.smooth = False
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.new(name, me); link(ob); ob.parent = parent
    return ob

# ---------------------------------------------------------------- materials
M = dict(
    red=metal('paint_red', '#C8101E', 0.36, 0.18, coat=1.0, coat_rough=0.16, detail='flake', scratch=0.05),
    blue=metal('paint_blue', '#0F63DC', 0.36, 0.18, coat=1.0, coat_rough=0.16, detail='flake', scratch=0.05),
    red_in=metal('inlay_red', '#7E0A14', 0.22, 0.9, scratch=0.1),
    blue_in=metal('inlay_blue', '#0A3F92', 0.22, 0.9, scratch=0.1),
    chrome=metal('pearl', '#F3F4F6', 0.32, 0.0, coat=0.5, coat_rough=0.24, detail='ring', scratch=0.04),
    gun=metal('gunmetal', '#1B1D21', 0.40, 0.95, scratch=0.14),
    steel=metal('steel', '#9EA2A8', 0.24, 1.0, scratch=0.1),
    dark=metal('dark', '#0B0C0E', 0.5, 0.9, scratch=0.1),
    plate=metal('plate_red', '#A30D19', 0.38, 0.15, coat=0.5, coat_rough=0.2, scratch=0.1),
    bar=metal('bar_red', '#9C0D18', 0.28, 0.85, coat=0.3, scratch=0.1),
)
SEAM_R = emissive('seam_red', lin('#FF4A2A'), 0.0)
SEAM_B = emissive('seam_blue', lin('#3DB6FF'), 0.0)
def radial_emissive(name, c_in, c_out, r0, r1, power=1.0):
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    tc = nt.nodes.new('ShaderNodeTexCoord'); ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(tc.outputs['Object'], ln.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = r0; mr.inputs['From Max'].default_value = r1; mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0
    nt.links.new(ln.outputs['Value'], mr.inputs['Value'])
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power; nt.links.new(mr.outputs['Result'], pw.inputs[0])
    col = nt.nodes.new('ShaderNodeMixRGB'); col.inputs['Color1'].default_value = (*c_out, 1); col.inputs['Color2'].default_value = (*c_in, 1); nt.links.new(pw.outputs[0], col.inputs['Fac'])
    v = nt.nodes.new('ShaderNodeValue'); v.name = 'S'; v.outputs[0].default_value = 0.0
    fl = nt.nodes.new('ShaderNodeMath'); fl.operation = 'MULTIPLY_ADD'; fl.inputs[1].default_value = 0.92; fl.inputs[2].default_value = 0.08; nt.links.new(pw.outputs[0], fl.inputs[0])
    st = nt.nodes.new('ShaderNodeMath'); st.operation = 'MULTIPLY'; nt.links.new(fl.outputs[0], st.inputs[0]); nt.links.new(v.outputs[0], st.inputs[1])
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(col.outputs['Color'], e.inputs['Color']); nt.links.new(st.outputs[0], e.inputs['Strength'])
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    m['sn'] = '@S'
    return m
CORE_E = radial_emissive('core_glow', lin('#6FC6FF'), lin('#0B3FA8'), 24, 92, 1.6)
LENS_E = radial_emissive('core_lens', lin('#F2FAFF'), lin('#2EA8FF'), 2, 15.6, 1.2)
WIRE_E = emissive('wire', lin('#8FD8FF'), 0.0)
SPARK_E = emissive('spark', lin('#FFB86A'), 6.0)

# ---------------------------------------------------------------- build the emblem
PARTS = []          # dict(root, kind, home pivot, order)
POLY = {}           # name -> armour outline, for bolts and wires
BOLT = None
def bolt_mesh():
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=1.9, radius2=1.75, depth=1.5)
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('bolt'); bm.to_mesh(me); bm.free(); me.materials.append(M['gun'])
    return me
BOLT = bolt_mesh()
def bolt(p, z, parent, s=1.0):
    ob = bpy.data.objects.new('bolt', BOLT); link(ob); ob.parent = parent
    ob.location = (p[0], p[1], z + 0.7 * s); ob.scale = (s, s, s); ob.rotation_euler = (0, 0, rng.uniform(0, 1))
    return ob

Z_BACK, Z_CH, Z_AR = -15.0, 2.0, 6.5      # chassis back, chassis front, armour front (logo units)
from shapely.geometry import Polygon as SPoly
def offsets(P, d):
    """A robust inward offset: the outlines left after shrinking by d, largest first."""
    g = SPoly(P).buffer(0).buffer(-d, join_style=2, mitre_limit=2.0)
    geoms = [g] if g.geom_type == 'Polygon' else list(getattr(g, 'geoms', []))
    out = [np.array(q.exterior.coords[:-1]) for q in geoms if not q.is_empty and q.area > 60]
    return sorted(out, key=lambda a: -abs(area(a)))
TIER = {}           # name -> (outlines of the raised panel, its height)
def plate_part(name, sub, color):
    P = polygon(sub, 10 if color == 'white' else 4)     # the ring wants round curves; the letters' small corners must stay coarse or the inset folds over
    hold = bpy.data.objects.new(name, None); link(hold); hold.parent = ROOT
    is_ring = color == 'white'
    back = Z_BACK if is_ring else -3.0
    prism(name + '_chassis', P, back, Z_CH, 0.7, M['gun'], hold)
    Ar = inset(P, 1.9)
    prism(name + '_armour', Ar, Z_CH - 0.2, Z_AR, 0.9, M['chrome'] if is_ring else M[color], hold)
    if not is_ring:
        ribbon(name + '_seam', P, 0.85, 1.45, Z_CH + 0.06, SEAM_R if color == 'red' else SEAM_B, hold)
    # a raised panel inside a bolted rim, so edges catch the light up close
    d, h = (5.0, 1.0) if is_ring else (9.0, 1.5)
    T2 = offsets(P, d)
    for k, q in enumerate(T2):
        prism(f'{name}_panel{k}', q, Z_AR - 0.2, Z_AR + h, 0.6, M['chrome'] if is_ring else M[color], hold)
    TIER[name] = (T2, h)
    print(name, 'panels', len(T2), flush=True)
    POLY[name] = Ar
    c = P.mean(0)
    PARTS.append(dict(root=hold, kind=color, c=Vector((c[0], c[1], 0)), P=P, name=name))
    return hold, Ar

ring_parts = []
for k, sub in enumerate(parse_path(LOGO['white'])):
    ring_parts.append(plate_part(f'ring{k}', sub, 'white'))
red_subs = parse_path(LOGO['red'])
s_part = plate_part('S', red_subs[4], 'red')
f_part = plate_part('F', parse_path(LOGO['blue'])[0], 'blue')

# bolts along the ring, and at the corners of the S and F plates
for hold, Ar in ring_parts:
    rad = np.linalg.norm(Ar, axis=1); rm = (rad.min() + rad.max()) / 2
    for deg in range(0, 360, 15):
        p = (rm * math.cos(math.radians(deg)), rm * math.sin(math.radians(deg)))
        if inside(p, Ar) and edge_dist(p, Ar) > 4.2: bolt(p, Z_AR + 1.0, hold)
for hold, Ar in (s_part, f_part):
    n = len(Ar); placed = []
    for i in range(n):
        a, b, c = Ar[i - 1], Ar[i], Ar[(i + 1) % n]
        u = (b - a) / (np.linalg.norm(b - a) + 1e-9); v = (c - b) / (np.linalg.norm(c - b) + 1e-9)
        if u @ v < 0.45:                       # a real corner
            bis = (v - u); bis = bis / (np.linalg.norm(bis) + 1e-9)
            for sgn in (1, -1):
                p = b + sgn * bis * 6.5
                if inside(p, Ar) and edge_dist(p, Ar) > 3.4 and all(np.linalg.norm(p - q) > 14 for q in placed):
                    placed.append(p); bolt(p, Z_AR, hold, 0.8); break

# the barbell, in the round: bar through the middle, bumper plates, collars
BAR_Y = 256.0 - 259.0
def bumper(name, x, R, T, parent):
    h = T / 2; c = 1.4
    prof = [(-h * .9, 6.6), (-h * .9, .30 * R), (-h * .5, .34 * R), (-h * .5, .76 * R), (-h, .81 * R), (-h, R - c), (-h + c, R),
            (h - c, R), (h, R - c), (h, .81 * R), (h * .5, .76 * R), (h * .5, .34 * R), (h * .9, .30 * R), (h * .9, 6.6)]
    def pick(f):
        r = max(math.hypot(v.co.y, v.co.z) for v in f.verts); return 1 if r <= .31 * R + 1e-3 else 0
    ob = lathe(name, prof, [M['plate'], M['steel']], parent, pick)
    ob.location = (x, BAR_Y, BAR_Z)
    return ob
bar_hold = bpy.data.objects.new('bar', None); link(bar_hold); bar_hold.parent = ROOT
BAR_Z = -5.0
for sgn in (-1, 1):
    rod = lathe(f'bar_rod{sgn}', [(-61, 0.01), (-61, 6.2), (61, 6.2), (61, 0.01)], [M['bar']], bar_hold, steps=40)
    rod.location = (sgn * 153, BAR_Y, BAR_Z)
for sgn in (-1, 1):
    col = lathe(f'collar{sgn}', [(-2.2, 6.3), (-2.2, 9.6), (-1.4, 10.2), (1.4, 10.2), (2.2, 9.6), (2.2, 6.3)], [M['steel']], bar_hold, steps=40)
    col.location = (sgn * 159.5, BAR_Y, BAR_Z)
    cap = lathe(f'sleeve{sgn}', [(-7, 6.3), (-7, 7.6), (-6.2, 8.2), (6.2, 8.2), (7, 7.6), (7, 0.01), (6.2, 0.01), (6.2, 6.3)], [M['steel']], bar_hold, steps=40)
    cap.location = (sgn * 208.0, BAR_Y, BAR_Z)
PARTS.append(dict(root=bar_hold, kind='bar', c=Vector((0, BAR_Y, 0)), name='bar'))
PLATES = []
for name, cx, R, T in (('pl_l1', 74.5, 53, 11.4), ('pl_l2', 87.2, 53, 11.4), ('pl_l0', 60.5, 34.5, 10.4),
                       ('pl_r1', 425.2, 53, 11.4), ('pl_r2', 439.0, 53, 11.4), ('pl_r0', 452.0, 34.5, 10.4)):
    hold = bpy.data.objects.new(name, None); link(hold); hold.parent = ROOT
    bumper(name + '_m', cx - 256.0, R, T, hold)
    PLATES.append(dict(root=hold, x=cx - 256.0, R=R, T=T, name=name))

# the core: a turbine behind the letters, inside the ring
core = bpy.data.objects.new('core', None); link(core); core.parent = ROOT
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=97, radius2=97, depth=1.2)
me = bpy.data.meshes.new('core_back'); bm.to_mesh(me); bm.free(); me.materials.append(M['dark'])
ob = bpy.data.objects.new('core_back', me); link(ob); ob.parent = core; ob.location = (0, 0, Z_BACK + 0.6)
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=90)
me = bpy.data.meshes.new('core_glow'); bm.to_mesh(me); bm.free(); me.materials.append(CORE_E)
ob = bpy.data.objects.new('core_glow', me); link(ob); ob.parent = core; ob.location = (0, 0, Z_BACK + 1.4)
FINS = bpy.data.objects.new('fins', None); link(FINS); FINS.parent = core
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x * 58, v.co.y * 1.3, v.co.z * 8.5))
fin_me = bpy.data.meshes.new('fin'); bm.to_mesh(fin_me); bm.free(); fin_me.materials.append(M['steel'])
for k in range(44):
    a = k / 44 * math.tau
    ob = bpy.data.objects.new('fin', fin_me); link(ob); ob.parent = FINS
    ob.location = (61 * math.cos(a), 61 * math.sin(a), Z_BACK + 6.2); ob.rotation_euler = Euler((math.radians(22), 0, a), 'XYZ')
for r in (33, 62, 91):
    ring = lathe(f'core_ring{r}', [(-1.3, r - 1.4), (-1.3, r + 1.4), (1.3, r + 1.4), (1.3, r - 1.4)], [M['steel']], core, steps=96)
    ring.rotation_euler = (0, math.pi / 2, 0); ring.location = (0, 0, Z_BACK + 10.6)
hub = lathe('core_hub', [(-6, 0.01), (-6, 27), (4, 27), (6, 24), (6, 17), (4.6, 16), (4.6, 0.01)], [M['gun']], core, steps=64)
hub.rotation_euler = (0, -math.pi / 2, 0); hub.location = (0, 0, Z_BACK + 7)
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=15.6)
me = bpy.data.meshes.new('core_lens'); bm.to_mesh(me); bm.free(); me.materials.append(LENS_E)
ob = bpy.data.objects.new('core_lens', me); link(ob); ob.parent = core; ob.location = (0, 0, Z_BACK + 11.8)
PARTS.append(dict(root=core, kind='core', c=Vector((0, 0, 0)), name='core'))

# ---------------------------------------------------------------- the wireframe twin
def wire_curves():
    cu = bpy.data.curves.new('wire', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.34; cu.bevel_resolution = 0; cu.resolution_u = 1
    def line(pts, cyclic=False):
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1); sp.use_cyclic_u = cyclic
        for p, q in zip(sp.points, pts): p.co = (q[0], q[1], q[2], 1)
    def circle(cx, cy, cz, r, axis='x', n=48):
        pts = []
        for k in range(n):
            a = k / n * math.tau
            pts.append((cx, cy + r * math.cos(a), cz + r * math.sin(a)) if axis == 'x' else (cx + r * math.cos(a), cy + r * math.sin(a), cz))
        line(pts, True)
    for name, Ar in POLY.items():
        back = Z_BACK if name.startswith('ring') else -3.0
        thin = Ar[::2] if len(Ar) > 80 else Ar
        line([(x, y, Z_AR) for x, y in thin], True); line([(x, y, back) for x, y in thin], True)
        n = len(Ar)
        for i in range(n):                       # uprights at the corners
            a, b, c = Ar[i - 1], Ar[i], Ar[(i + 1) % n]
            u = (b - a) / (np.linalg.norm(b - a) + 1e-9); v = (c - b) / (np.linalg.norm(c - b) + 1e-9)
            if u @ v < 0.75: line([(b[0], b[1], Z_AR), (b[0], b[1], back)])
        # a mesh of lines across the face
        x0, y0 = Ar.min(0); x1, y1 = Ar.max(0)
        for horizontal in (True, False):
            lo, hi = (y0, y1) if horizontal else (x0, x1)
            t = math.ceil(lo / 9.0) * 9.0
            while t < hi:
                xs = []
                for i in range(n):
                    p, q = Ar[i], Ar[(i + 1) % n]
                    a, b = (p[1], q[1]) if horizontal else (p[0], q[0])
                    if (a > t) != (b > t):
                        s = (t - a) / (b - a); xs.append((p[0] + s * (q[0] - p[0])) if horizontal else (p[1] + s * (q[1] - p[1])))
                xs.sort()
                for k in range(0, len(xs) - 1, 2):
                    if xs[k + 1] - xs[k] > 1.5:
                        line([(xs[k], t, Z_AR), (xs[k + 1], t, Z_AR)] if horizontal else [(t, xs[k], Z_AR), (t, xs[k + 1], Z_AR)])
                t += 9.0
    for pl in PLATES:
        for dx in (-pl['T'] / 2, pl['T'] / 2):
            for rr in (pl['R'], pl['R'] * .78, pl['R'] * .32): circle(pl['x'] + dx, BAR_Y, BAR_Z, rr)
        for k in range(12):
            a = k / 12 * math.tau; y = BAR_Y + pl['R'] * math.cos(a); z = BAR_Z + pl['R'] * math.sin(a)
            line([(pl['x'] - pl['T'] / 2, y, z), (pl['x'] + pl['T'] / 2, y, z)])
    for k in range(6):
        a = k / 6 * math.tau; [line([(sg * 92, BAR_Y + 6.2 * math.cos(a), BAR_Z + 6.2 * math.sin(a)), (sg * 214, BAR_Y + 6.2 * math.cos(a), BAR_Z + 6.2 * math.sin(a))]) for sg in (-1, 1)]
    for x in (-214, -160, 160, 214): circle(x, BAR_Y, BAR_Z, 6.2, n=16)
    for r in (33, 62, 91): circle(0, 0, Z_BACK + 10.6, r, axis='z', n=72)
    for k in range(22):
        a = k / 22 * math.tau; line([(32 * math.cos(a), 32 * math.sin(a), Z_BACK + 8), (90 * math.cos(a), 90 * math.sin(a), Z_BACK + 8)])
    cu.materials.append(WIRE_E)
    ob = bpy.data.objects.new('wire', cu); link(ob); ob.parent = ROOT
    return ob
WIRE = wire_curves()

# sparks thrown as the big parts lock
SPARKS = []
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
for v in bm.verts: v.co = Vector((v.co.x * 0.7, v.co.y * 0.7, v.co.z * 7))
sp_me = bpy.data.meshes.new('spark'); bm.to_mesh(sp_me); bm.free(); sp_me.materials.append(SPARK_E)

# ---------------------------------------------------------------- the assembly (frames 0-39)
def ease_back(t, s=1.4):
    t = min(1.0, max(0.0, t)) - 1; return t * t * ((s + 1) * t + s) + 1
def ease_out(t):
    t = min(1.0, max(0.0, t)); return 1 - (1 - t) ** 3

AWAY = Matrix.Translation((0, -2e6, 0))
LOCK = {}           # name -> frame it locks
def schedule():
    order = ['core', 'bar', 'ring2', 'ring1', 'ring0', 'S', 'F']
    t = {'core': (0, 10), 'bar': (2, 16), 'ring2': (6, 20), 'ring1': (9, 23), 'ring0': (12, 26), 'S': (16, 30), 'F': (20, 34)}
    for p in PARTS: p['t0'], p['t1'] = t[p['name']]; LOCK[p['name']] = p['t1']
    for i, pl in enumerate(sorted(PLATES, key=lambda q: abs(q['x']))):
        pl['t0'] = 14 + i * 2.6; pl['t1'] = pl['t0'] + 11; LOCK[pl['name']] = pl['t1']
schedule()
for name in ('S', 'F', 'ring0', 'ring1', 'ring2'):
    part = next(p for p in PARTS if p['name'] == name)
    for j in range(8):
        ob = bpy.data.objects.new('spark', sp_me); link(ob); ob.parent = ROOT
        P = part['P']; o = P[rng.randrange(len(P))]
        d = Vector((o[0] - part['c'].x, o[1] - part['c'].y, rng.uniform(4, 16))).normalized()
        SPARKS.append(dict(ob=ob, at=LOCK[name], o=Vector((o[0], o[1], Z_AR)), d=d, v=rng.uniform(5, 11)))

def assemble(f):
    for p in PARTS:
        u = (f - p['t0']) / (p['t1'] - p['t0']); e = ease_back(u)
        r = p['root']; k = p['kind']; c = p['c']
        if u >= 1: r.matrix_local = Matrix.Identity(4); continue
        if u <= 0 and k not in ('core',): r.matrix_local = AWAY; continue
        if k == 'white':           # the ring's sections swing in round the centre, from behind
            ang = math.radians(mix(150 if c.x > 0 else -150, 0, e)); back = mix(-70, 0, e)
            r.matrix_local = Matrix.Translation((0, 0, back)) @ Matrix.Rotation(ang, 4, 'Z')
        elif k in ('red', 'blue'):  # the letter plates unfold on a hinge and press in
            axis = 'X' if k == 'red' else 'Y'; ang = math.radians(mix(-115 if k == 'red' else 115, 0, e))
            piv = Vector((c.x, c.y + 60, 0)) if k == 'red' else Vector((c.x + 70, c.y, 0))
            r.matrix_local = Matrix.Translation((0, 0, mix(46, 0, e))) @ Matrix.Translation(piv) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-piv)
        elif k == 'bar':            # the bar slides through, spinning
            r.matrix_local = Matrix.Translation((mix(-520, 0, ease_out(u)), 0, 0)) @ Matrix.Translation((0, BAR_Y, BAR_Z)) @ Matrix.Rotation(mix(6, 0, ease_out(u)), 4, 'X') @ Matrix.Translation((0, -BAR_Y, -BAR_Z))
        elif k == 'core':
            s = mix(0.6, 1.0, ease_out(u)); r.matrix_local = Matrix.Translation((0, 0, mix(-60, 0, ease_out(u)))) @ Matrix.Scale(s, 4)
    for pl in PLATES:               # the plates load on from each end
        u = (f - pl['t0']) / (pl['t1'] - pl['t0']); r = pl['root']
        if u >= 1: r.matrix_local = Matrix.Identity(4); continue
        if u <= 0: r.matrix_local = AWAY; continue
        side = 1 if pl['x'] > 0 else -1; e = ease_back(u, 1.0)
        piv = Vector((pl['x'], BAR_Y, BAR_Z))
        r.matrix_local = Matrix.Translation((side * mix(330, 0, e), 0, 0)) @ Matrix.Translation(piv) @ Matrix.Rotation(mix(5, 0, e), 4, 'X') @ Matrix.Translation(-piv)
    for s in SPARKS:
        age = f - s['at']; on = 0 <= age <= 7
        s['ob'].hide_render = not on
        if on:
            s['ob'].location = s['o'] + s['d'] * (s['v'] * age) + Vector((0, -0.35 * age * age, 0))
            s['ob'].rotation_euler = s['d'].to_track_quat('Z', 'Y').to_euler(); s['ob'].scale = (1, 1, max(0.05, 1 - age / 7))

def open_doors(f):
    o = smooth(108, 122, f) * (1 - smooth(132, 144, f))
    if o <= 0: return
    for p in PARTS:
        if p['name'] == 'S':
            piv = Vector((0, 74, Z_CH)); p['root'].matrix_local = Matrix.Translation(piv) @ Matrix.Rotation(math.radians(58 * o), 4, 'X') @ Matrix.Translation(-piv) @ Matrix.Translation((0, 0, 10 * o))
        elif p['name'] == 'F':
            piv = Vector((100, 0, Z_CH)); p['root'].matrix_local = Matrix.Translation(piv) @ Matrix.Rotation(math.radians(-62 * o), 4, 'Y') @ Matrix.Translation(-piv) @ Matrix.Translation((0, 0, 10 * o))

# ---------------------------------------------------------------- smoke, on cards
def smoke_mat(name, seed, core_pos, tint_core, tint_edge, dscale=(1, 0, 1), core_r=(0.2, 2.6), edge_r=(2.2, 4.6)):
    m, nt = node_mat(name)
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    N_ = nt.nodes.new; L = nt.links.new
    tc = N_('ShaderNodeTexCoord')
    w = N_('ShaderNodeValue'); w.name = 'W'
    warp = N_('ShaderNodeTexNoise'); warp.noise_dimensions = '4D'; warp.inputs['Scale'].default_value = 0.55; warp.inputs['Detail'].default_value = 2
    off = N_('ShaderNodeVectorMath'); off.operation = 'ADD'; off.inputs[1].default_value = (seed * 7.3, seed * 3.1, 0)
    L(tc.outputs['Object'], off.inputs[0]); L(off.outputs[0], warp.inputs['Vector']); L(w.outputs[0], warp.inputs['W'])
    sc_ = N_('ShaderNodeVectorMath'); sc_.operation = 'SCALE'; sc_.inputs['Scale'].default_value = 1.7; L(warp.outputs['Color'], sc_.inputs[0])
    add = N_('ShaderNodeVectorMath'); add.operation = 'ADD'; L(off.outputs[0], add.inputs[0]); L(sc_.outputs[0], add.inputs[1])
    nz = N_('ShaderNodeTexNoise'); nz.noise_dimensions = '4D'; nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 7; nz.inputs['Roughness'].default_value = 0.62
    L(add.outputs[0], nz.inputs['Vector']); L(w.outputs[0], nz.inputs['W'])
    ramp = N_('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.46; ramp.color_ramp.elements[1].position = 0.74
    L(nz.outputs['Fac'], ramp.inputs['Fac'])
    # brighter round the emblem, nothing at the card's edge
    fl = N_('ShaderNodeVectorMath'); fl.operation = 'MULTIPLY'; fl.inputs[1].default_value = dscale; L(tc.outputs['Object'], fl.inputs[0])
    d = N_('ShaderNodeVectorMath'); d.operation = 'DISTANCE'; d.inputs[1].default_value = tuple(a * b for a, b in zip(core_pos, dscale)); L(fl.outputs[0], d.inputs[0])
    corem = N_('ShaderNodeMapRange'); corem.interpolation_type = 'SMOOTHSTEP'
    corem.inputs['From Min'].default_value = core_r[0]; corem.inputs['From Max'].default_value = core_r[1]; corem.inputs['To Min'].default_value = 1.0; corem.inputs['To Max'].default_value = 0.0
    L(d.outputs['Value'], corem.inputs['Value'])
    edge = N_('ShaderNodeMapRange'); edge.interpolation_type = 'SMOOTHSTEP'
    edge.inputs['From Min'].default_value = edge_r[0]; edge.inputs['From Max'].default_value = edge_r[1]; edge.inputs['To Min'].default_value = 1.0; edge.inputs['To Max'].default_value = 0.0
    L(d.outputs['Value'], edge.inputs['Value'])
    col = N_('ShaderNodeMixRGB'); col.inputs['Color1'].default_value = (*tint_edge, 1); col.inputs['Color2'].default_value = (*tint_core, 1); L(corem.outputs['Result'], col.inputs['Fac'])
    st = N_('ShaderNodeValue'); st.name = 'S'; st.outputs[0].default_value = 1.0
    a1 = N_('ShaderNodeMath'); a1.operation = 'MULTIPLY'; L(ramp.outputs['Color'], a1.inputs[0]); L(edge.outputs['Result'], a1.inputs[1])
    cm = N_('ShaderNodeMath'); cm.operation = 'MULTIPLY_ADD'; cm.inputs[1].default_value = 0.85; cm.inputs[2].default_value = 0.15; L(corem.outputs['Result'], cm.inputs[0])
    a2 = N_('ShaderNodeMath'); a2.operation = 'MULTIPLY'; L(a1.outputs[0], a2.inputs[0]); L(cm.outputs[0], a2.inputs[1])
    a3 = N_('ShaderNodeMath'); a3.operation = 'MULTIPLY'; a3.use_clamp = True; L(a2.outputs[0], a3.inputs[0]); L(st.outputs[0], a3.inputs[1])
    em = N_('ShaderNodeEmission'); L(col.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
    tr = N_('ShaderNodeBsdfTransparent'); mx = N_('ShaderNodeMixShader')
    L(a3.outputs[0], mx.inputs['Fac']); L(tr.outputs[0], mx.inputs[1]); L(em.outputs[0], mx.inputs[2])
    L(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m
SMOKE = []
def card(name, y, size, seed, core_pos, tint_core, tint_edge, k, **kw):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    m = smoke_mat(name, seed, core_pos, tint_core, tint_edge, **kw); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); link(ob); ob.location = (0, y, 1.6); ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.scale = (size, size, 1)
    # object coordinates are in the card's own units; work in metres
    for n in m.node_tree.nodes:
        if n.type == 'TEX_COORD': n.object = ROOT_M
    ob.visible_shadow = False; ob.visible_glossy = False
    SMOKE.append(dict(ob=ob, m=m, k=k)); return ob
ROOT_M = bpy.data.objects.new('metres', None); link(ROOT_M); ROOT_M.location = C0   # a metre-scaled frame at the emblem
WHITE_BLUE = lin('#CFE6FF'); DEEP = lin('#1B2740'); WARM = lin('#FFD9B0')
card('smoke_far', 2.6, 14, 1.0, (0.15, 0, 0.1), WHITE_BLUE, DEEP, 1.0, core_r=(0.1, 1.7), edge_r=(1.2, 3.0))
card('smoke_mid', 1.5, 12, 2.0, (-0.1, 0, 0.0), WHITE_BLUE, DEEP, 0.8, core_r=(0.1, 1.4), edge_r=(1.0, 2.4))
card('smoke_near', 0.75, 10, 3.0, (0.0, 0, 0.1), WHITE_BLUE, DEEP, 0.5, core_r=(0.1, 1.1), edge_r=(0.8, 1.9))
card('smoke_front', -1.5, 9, 4.0, (0.0, 0, -0.3), lin('#9FB4D0'), DEEP, 0.08, core_r=(0.1, 1.2), edge_r=(0.8, 1.8))

# floating dust
DUST = []
DUST_E = emissive('dust', lin('#DCE8FF'), 0.8)
for i in range(70):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rng.uniform(0.0015, 0.005))
    me = bpy.data.meshes.new('d'); bm.to_mesh(me); bm.free(); me.materials.append(DUST_E)
    ob = bpy.data.objects.new('dust', me); link(ob)
    base = Vector((rng.uniform(-2.6, 2.6), rng.uniform(-2.6, 1.2), rng.uniform(0.5, 2.9)))
    ob.location = base; DUST.append((ob, base, rng.uniform(0, 6.28)))

# ---------------------------------------------------------------- lights for the dark chapters
KEY = area_light('key', (-2.6, -3.4, 4.2), 3.0, 3.0, 210, kelvin(5600), C0)
RIM_B = area_light('rim_blue', (2.6, 1.9, 2.6), 0.5, 3.2, 420, lin('#7FC4FF'), C0)
RIM_R = area_light('rim_red', (-2.8, 1.7, 1.2), 0.5, 2.6, 200, lin('#FF7A5A'), C0)
FILL = area_light('fill', (1.2, -4.0, 0.4), 3.0, 1.6, 40, kelvin(4600), C0)
TOP = area_light('top', (0.0, 0.2, 4.6), 2.6, 0.5, 120, kelvin(6000), C0)
BOX_F = area_light('box_front', (0.6, -5.5, 4.4), 6.0, 2.2, 90, kelvin(6200), C0)
BOX_L = area_light('box_left', (-4.4, -1.6, 1.8), 0.7, 4.0, 110, kelvin(6500), C0)
BOX_R = area_light('box_right', (4.4, -1.8, 2.0), 0.7, 4.0, 110, lin('#BFDCFF'), C0)
STUDIO = [KEY, RIM_B, RIM_R, FILL, TOP, BOX_F, BOX_L, BOX_R]
for ob in (KEY, FILL, BOX_F, BOX_L, BOX_R): ob.visible_glossy = False
for ob in (BOX_L, BOX_R, FILL): ob.data.use_shadow = False      # or the bumper plates throw hard wedges across the letters
SUN_FILL = area_light('sun_fill', (-3.2, -4.2, 2.2), 4.0, 3.0, 0, lin('#FFD2A6'), C0)

# ---------------------------------------------------------------- dusk and sunrise
SUN_AZ = math.radians(-6)      # where the sun rises, seen from the emblem: behind it, a little to the left
def sun_dir(elev):
    e = math.radians(elev); return Vector((math.sin(SUN_AZ) * math.cos(e), math.cos(SUN_AZ) * math.cos(e), math.sin(e)))
world = bpy.data.worlds.new('sky'); sc.world = world
try: world.use_nodes = True
except Exception: pass
wn = world.node_tree; bg = wn.nodes['Background']
WN = wn.nodes.new; WL = wn.links.new
wtc = WN('ShaderNodeTexCoord'); nrm = WN('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; WL(wtc.outputs['Generated'], nrm.inputs[0])
sepw = WN('ShaderNodeSeparateXYZ'); WL(nrm.outputs[0], sepw.inputs['Vector'])
def ramp(stops):
    r = WN('ShaderNodeValToRGB'); cr = r.color_ramp
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = (*lin(stops[0][1]), 1)
    cr.elements[1].position = stops[-1][0]; cr.elements[1].color = (*lin(stops[-1][1]), 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos); e.color = (*lin(col), 1)
    WL(sepw.outputs['Z'], r.inputs['Fac']); return r
r_dusk = ramp([(0.0, '#7A3A2A'), (0.03, '#4A2A3A'), (0.10, '#1E1F3C'), (0.35, '#0B1126'), (1.0, '#04060F')])
r_day = ramp([(0.0, '#F2A25E'), (0.04, '#C96F4A'), (0.11, '#6E4A5E'), (0.26, '#2C3760'), (0.55, '#141E44'), (1.0, '#080C22')])
DAYV = WN('ShaderNodeValue'); DAYV.outputs[0].default_value = 0.0
grad = WN('ShaderNodeMixRGB'); WL(DAYV.outputs[0], grad.inputs['Fac']); WL(r_dusk.outputs['Color'], grad.inputs['Color1']); WL(r_day.outputs['Color'], grad.inputs['Color2'])
SUNV = WN('ShaderNodeCombineXYZ')
dot = WN('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; WL(nrm.outputs[0], dot.inputs[0]); WL(SUNV.outputs[0], dot.inputs[1])
dmax = WN('ShaderNodeMath'); dmax.operation = 'MAXIMUM'; dmax.inputs[1].default_value = 0.0; WL(dot.outputs['Value'], dmax.inputs[0])
def glow(power, gain):
    pw = WN('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power; WL(dmax.outputs[0], pw.inputs[0])
    g = WN('ShaderNodeMath'); g.operation = 'MULTIPLY'; g.inputs[1].default_value = gain; WL(pw.outputs[0], g.inputs[0]); return g
g_wide = glow(5, 0.45); g_mid = glow(40, 1.0); g_core = glow(900, 3.0)
gsum = WN('ShaderNodeMath'); gsum.operation = 'ADD'; WL(g_wide.outputs[0], gsum.inputs[0]); WL(g_mid.outputs[0], gsum.inputs[1])
gscaled = WN('ShaderNodeMath'); gscaled.operation = 'MULTIPLY'; WL(gsum.outputs[0], gscaled.inputs[0]); WL(DAYV.outputs[0], gscaled.inputs[1])
gcol = WN('ShaderNodeMixRGB'); gcol.blend_type = 'ADD'; WL(gscaled.outputs[0], gcol.inputs['Fac']); WL(grad.outputs['Color'], gcol.inputs['Color1']); gcol.inputs['Color2'].default_value = (*lin('#FF9A52'), 1)
cscaled = WN('ShaderNodeMath'); cscaled.operation = 'MULTIPLY'; WL(g_core.outputs[0], cscaled.inputs[0]); WL(DAYV.outputs[0], cscaled.inputs[1])
ccol = WN('ShaderNodeMixRGB'); ccol.blend_type = 'ADD'; WL(cscaled.outputs[0], ccol.inputs['Fac']); WL(gcol.outputs['Color'], ccol.inputs['Color1']); ccol.inputs['Color2'].default_value = (*lin('#FFE2B8'), 1)
# long clouds low in the sky: dark bodies, lit warm where they are near the sun
wmap = WN('ShaderNodeMapping'); wmap.inputs['Scale'].default_value = (1.4, 1.4, 11.0); WL(nrm.outputs[0], wmap.inputs['Vector'])
cl = WN('ShaderNodeTexNoise'); cl.inputs['Scale'].default_value = 2.2; cl.inputs['Detail'].default_value = 9; cl.inputs['Roughness'].default_value = 0.58; WL(wmap.outputs['Vector'], cl.inputs['Vector'])
clr = WN('ShaderNodeValToRGB'); clr.color_ramp.elements[0].position = 0.5; clr.color_ramp.elements[1].position = 0.72; WL(cl.outputs['Fac'], clr.inputs['Fac'])
band = WN('ShaderNodeMapRange'); band.interpolation_type = 'SMOOTHSTEP'
band.inputs['From Min'].default_value = 0.015; band.inputs['From Max'].default_value = 0.12; band.inputs['To Min'].default_value = 0.0; band.inputs['To Max'].default_value = 1.0; WL(sepw.outputs['Z'], band.inputs['Value'])
band2 = WN('ShaderNodeMapRange'); band2.interpolation_type = 'SMOOTHSTEP'
band2.inputs['From Min'].default_value = 0.28; band2.inputs['From Max'].default_value = 0.62; band2.inputs['To Min'].default_value = 1.0; band2.inputs['To Max'].default_value = 0.0; WL(sepw.outputs['Z'], band2.inputs['Value'])
cf1 = WN('ShaderNodeMath'); cf1.operation = 'MULTIPLY'; WL(clr.outputs['Color'], cf1.inputs[0]); WL(band.outputs['Result'], cf1.inputs[1])
cfac = WN('ShaderNodeMath'); cfac.operation = 'MULTIPLY'; WL(cf1.outputs[0], cfac.inputs[0]); WL(band2.outputs['Result'], cfac.inputs[1])
cdark = WN('ShaderNodeMixRGB'); cdark.blend_type = 'MULTIPLY'; cdark.inputs['Fac'].default_value = 1.0; WL(ccol.outputs['Color'], cdark.inputs['Color1']); cdark.inputs['Color2'].default_value = (0.34, 0.26, 0.33, 1)
clit = WN('ShaderNodeMixRGB'); clit.blend_type = 'ADD'; WL(g_mid.outputs[0], clit.inputs['Fac']); WL(cdark.outputs['Color'], clit.inputs['Color1']); clit.inputs['Color2'].default_value = (*lin('#FF8A4A'), 1)
cfs = WN('ShaderNodeMath'); cfs.operation = 'MULTIPLY'; cfs.inputs[1].default_value = 0.8; WL(cfac.outputs[0], cfs.inputs[0])
cmix = WN('ShaderNodeMixRGB'); WL(cfs.outputs[0], cmix.inputs['Fac']); WL(ccol.outputs['Color'], cmix.inputs['Color1']); WL(clit.outputs['Color'], cmix.inputs['Color2'])
# what the paint and metal mirror in the dark chapters: a smooth studio sweep, seen by reflections only
SKYS = WN('ShaderNodeValue'); SKYS.outputs[0].default_value = 0.0
skyc = WN('ShaderNodeVectorMath'); skyc.operation = 'SCALE'; WL(cmix.outputs['Color'], skyc.inputs[0]); WL(SKYS.outputs[0], skyc.inputs['Scale'])
zr = WN('ShaderNodeMapRange'); zr.inputs['From Min'].default_value = -1; zr.inputs['From Max'].default_value = 1; WL(sepw.outputs['Z'], zr.inputs['Value'])
sweep = WN('ShaderNodeValToRGB'); cr = sweep.color_ramp
cr.elements[0].position = 0.0; cr.elements[0].color = (*lin('#04060A'), 1); cr.elements[1].position = 1.0; cr.elements[1].color = (*lin('#FFFFFF'), 1)
for pos, col in ((0.46, '#080B11'), (0.56, '#3F4A5A'), (0.72, '#B9C6D8')):
    e = cr.elements.new(pos); e.color = (*lin(col), 1)
WL(zr.outputs['Result'], sweep.inputs['Fac'])
# a cool side and a warm side, so the sweep is not grey
side = WN('ShaderNodeMapRange'); side.inputs['From Min'].default_value = -1; side.inputs['From Max'].default_value = 1; WL(sepw.outputs['X'], side.inputs['Value'])
tint = WN('ShaderNodeMixRGB'); tint.inputs['Color1'].default_value = (*lin('#FFD9C8'), 1); tint.inputs['Color2'].default_value = (*lin('#C8E2FF'), 1); WL(side.outputs['Result'], tint.inputs['Fac'])
swt = WN('ShaderNodeMixRGB'); swt.blend_type = 'MULTIPLY'; swt.inputs['Fac'].default_value = 1.0; WL(sweep.outputs['Color'], swt.inputs['Color1']); WL(tint.outputs['Color'], swt.inputs['Color2'])
lp = WN('ShaderNodeLightPath'); STUDV = WN('ShaderNodeValue'); STUDV.outputs[0].default_value = 0.0
gl = WN('ShaderNodeMath'); gl.operation = 'MULTIPLY'; WL(lp.outputs['Is Glossy Ray'], gl.inputs[0]); WL(STUDV.outputs[0], gl.inputs[1])
sws = WN('ShaderNodeVectorMath'); sws.operation = 'SCALE'; WL(swt.outputs['Color'], sws.inputs[0]); WL(gl.outputs[0], sws.inputs['Scale'])
wsum = WN('ShaderNodeVectorMath'); wsum.operation = 'ADD'; WL(skyc.outputs[0], wsum.inputs[0]); WL(sws.outputs[0], wsum.inputs[1])
WL(wsum.outputs[0], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0
SUN = bpy.data.lights.new('sun', 'SUN'); SUN.angle = math.radians(2.5); SUN.color = lin('#FFB070'); SUN.energy = 0.0
SUN_OB = bpy.data.objects.new('sun', SUN); link(SUN_OB)

# wet ground: dark, glossy in patches, so the sky and the emblem lie in it
gm, gnt = node_mat('ground')
gb = gnt.nodes['Principled BSDF']; gb.inputs['Base Color'].default_value = (*lin('#0F0D0C'), 1)
gtc = gnt.nodes.new('ShaderNodeTexCoord'); gn = gnt.nodes.new('ShaderNodeTexNoise'); gn.inputs['Scale'].default_value = 0.35; gn.inputs['Detail'].default_value = 6
gnt.links.new(gtc.outputs['Object'], gn.inputs['Vector'])
grr = gnt.nodes.new('ShaderNodeMapRange'); grr.inputs['From Min'].default_value = 0.4; grr.inputs['From Max'].default_value = 0.62; grr.inputs['To Min'].default_value = 0.03; grr.inputs['To Max'].default_value = 0.24
gnt.links.new(gn.outputs['Fac'], grr.inputs['Value']); gnt.links.new(grr.outputs['Result'], gb.inputs['Roughness'])
gn2 = gnt.nodes.new('ShaderNodeTexNoise'); gn2.inputs['Scale'].default_value = 9.0; gn2.inputs['Detail'].default_value = 5; gnt.links.new(gtc.outputs['Object'], gn2.inputs['Vector'])
gbp = gnt.nodes.new('ShaderNodeBump'); gbp.inputs['Strength'].default_value = 0.12; gbp.inputs['Distance'].default_value = 0.01
gnt.links.new(gn2.outputs['Fac'], gbp.inputs['Height']); gnt.links.new(gbp.outputs['Normal'], gb.inputs['Normal'])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3000)
me = bpy.data.meshes.new('ground'); bm.to_mesh(me); bm.free(); me.materials.append(gm)
GROUND = bpy.data.objects.new('ground', me); link(GROUND); GROUND.location = (0, 0, 1.0)
HAZE = []
NO_GROUND = bpy.data.collections.new('no_ground'); NO_GROUND.objects.link(GROUND)
NO_GROUND.collection_objects[0].light_linking.link_state = 'EXCLUDE'
for ob in STUDIO + [SUN_FILL]: ob.light_linking.receiver_collection = NO_GROUND

# ---------------------------------------------------------------- camera
cam_d = bpy.data.cameras.new('cam'); CAM = bpy.data.objects.new('cam', cam_d); link(CAM); sc.camera = CAM
cam_d.clip_start = 0.02; cam_d.clip_end = 2000; cam_d.dof.use_dof = True
# frame: azimuth, elevation, distance, target (right, up) from the emblem's centre, lens, f-stop, emblem turn
KEYS = {
    'land': [
        (0,   -36,  6, 5.4, -0.75,  0.02, 50, 5.6, -10),
        (40,  -22,  4, 4.6, -0.66,  0.00, 52, 5.6,  -6),
        (76,    8,  2, 4.8, -0.62,  0.02, 52, 5.6,   4),
        (94,   30, 16, 1.05, -0.36, 0.16, 58, 2.4,  10),
        (110, -16, 10, 1.00,  0.14, 0.20, 56, 2.4,   2),
        (126, -20, -8, 1.02, -0.16, -0.04, 40, 2.8,   0),
        (146, -34,  6, 4.4, -0.62,  0.02, 46, 5.6,  -8),
        (168,  22, -4, 3.5, -0.50,  0.10, 40, 6.3,   6),
        (191,  13, -3, 4.1, -0.58,  0.14, 38, 6.3,   2),
    ],
    'port': [
        (0,   -42,  8, 5.8,  0.00, -0.80, 40, 5.6, -14),
        (40,  -30,  5, 4.7,  0.02, -0.72, 42, 5.6, -10),
        (76,   18,  3, 4.5,  0.00, -0.70, 42, 5.6,   8),
        (94,   30, 16, 1.15, -0.22, -0.04, 50, 2.4, 10),
        (110, -16, 10, 1.10,  0.10,  0.04, 50, 2.4,  2),
        (126, -20, -8, 1.15, -0.10, -0.26, 36, 2.8,  0),
        (146, -36,  6, 5.0,  0.00, -0.74, 38, 5.6, -10),
        (168,  26, -5, 4.3,  0.00, -0.60, 34, 6.3,  8),
        (191,  16, -3, 5.0,  0.00, -0.66, 32, 6.3,  3),
    ],
}

def catmull(keys, t):
    fr = [k[0] for k in keys]
    i = max(0, min(len(fr) - 2, int(np.searchsorted(fr, t, side='right')) - 1))
    p0, p1, p2, p3 = (np.array(keys[j][1:], float) for j in (max(i - 1, 0), i, i + 1, min(i + 2, len(keys) - 1)))
    u = (t - fr[i]) / (fr[i + 1] - fr[i]); u2, u3 = u * u, u * u * u
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)

def set_frame(f, fmt):
    az, el, dist, tx, tz, lens, fstop, turn = catmull(KEYS[fmt], f)
    if os.environ.get('DEBUG_CAM'): az, el, dist, tx, tz, lens, fstop, turn = (float(v) for v in os.environ['DEBUG_CAM'].split(','))
    a, e = math.radians(az), math.radians(el)
    ROOT.rotation_euler = Euler((math.pi / 2, 0, math.radians(turn)), 'XYZ')
    ROOT.location = C0 + Vector((0, 0, 0.012 * math.sin(f * 0.11)))
    pos = C0 + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    right = Vector((math.cos(a), math.sin(a), 0))
    tgt = C0 + right * tx + Vector((0, 0, tz))
    CAM.location = pos; d = tgt - pos
    CAM.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_d.lens = lens; cam_d.dof.focus_distance = (C0 - pos).length if dist > 2 else max(0.25, dist - 0.02); cam_d.dof.aperture_fstop = fstop

    assemble(f)
    open_doors(f)
    born = smooth(0, 30, f)                               # the scene comes up out of the dark
    macro = smooth(80, 94, f) * (1 - smooth(132, 146, f))
    core_t = smooth(108, 124, f) * (1 - smooth(132, 144, f))
    wire = smooth(138, 150, f) * (1 - smooth(160, 172, f))
    dusk = smooth(134, 150, f)
    day = smooth(158, 176, f)

    for v in FADE: v.outputs[0].default_value = 1 - 0.94 * wire
    set_emit(WIRE_E, 3.2 * wire); WIRE.hide_render = wire < 0.01
    seam = 0.14 + 0.5 * macro + 0.6 * core_t + 0.9 * smooth(32, 40, f) * (1 - smooth(40, 54, f))
    set_emit(SEAM_R, 1.6 * seam * born * (1 - wire)); set_emit(SEAM_B, 2.0 * seam * born * (1 - wire))
    set_emit(CORE_E, (1.3 * smooth(2, 14, f) + 2.2 * core_t) * (1 - 0.5 * day)); set_emit(LENS_E, 1.5 * smooth(4, 16, f) + 1.6 * core_t)
    FINS.rotation_euler = (0, 0, 0.02 * f + 6.0 * (1 - smooth(0, 26, f)) ** 2)

    studio = born * (1 - 0.88 * day) * (1 - 0.5 * wire)
    for ob in STUDIO: ob.data.energy = ob['base'] * studio * (0.55 if (ob is KEY and macro > 0.5) else 1.0)
    SUN_FILL.data.energy = 520 * day
    for s in SMOKE:
        s['m'].node_tree.nodes['S'].outputs[0].default_value = s['k'] * born * (1 - 0.55 * macro) * (1 - dusk) * 1.25
        s['m'].node_tree.nodes['W'].outputs[0].default_value = f * 0.012
        s['ob'].hide_render = dusk > 0.99
    for s in HAZE:
        s['m'].node_tree.nodes['S'].outputs[0].default_value = s['k'] * (0.25 * dusk + 0.55 * day)
        s['m'].node_tree.nodes['W'].outputs[0].default_value = f * 0.01
        s['ob'].hide_render = dusk < 0.01
    GROUND.hide_render = dusk < 0.01
    sd = sun_dir(mix(-0.5, 4.2, day))
    SUNV.inputs[0].default_value, SUNV.inputs[1].default_value, SUNV.inputs[2].default_value = sd.x, sd.y, sd.z
    SUN_OB.rotation_euler = (-sd).to_track_quat('-Z', 'Y').to_euler(); SUN.energy = 5.5 * day
    DAYV.outputs[0].default_value = day
    SKYS.outputs[0].default_value = dusk * mix(0.55, 1.0, day)
    STUDV.outputs[0].default_value = 1.6 * born * (1 - dusk)
    for ob, base, ph in DUST:
        ob.location = base + Vector((0.04 * math.sin(f * 0.04 + ph), 0.0, 0.004 * f))
    set_emit(DUST_E, 0.8 * born * (1 - dusk))
    for ob, base, ph in DUST: ob.hide_render = dusk > 0.5
    sc.view_settings.exposure = mix(0.0, -0.7, day)

# ---------------------------------------------------------------- render
sc.render.engine = 'CYCLES'
cy = sc.cycles; cy.device = 'CPU'
cy.samples = A.spp; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.05
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.diffuse_bounces = 2; cy.glossy_bounces = 4; cy.transmission_bounces = 2; cy.transparent_max_bounces = 16
cy.sample_clamp_indirect = 4.0; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 0.3
sc.render.use_persistent_data = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
W_, H_ = (A.w, A.h) if A.w else ((1280, 720) if A.fmt == 'land' else (720, 1280))
sc.render.resolution_x = W_; sc.render.resolution_y = H_; sc.render.resolution_percentage = int(A.scale * 100)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'

def frames(spec):
    out = []
    for part in spec.split(','):
        if '-' in part: a, b = part.split('-'); out += list(range(int(a), int(b) + 1))
        else: out.append(int(part))
    return out

os.makedirs(A.out, exist_ok=True)
for f in frames(A.frames):
    path = os.path.join(A.out, f'{A.fmt}_{f:03d}.png')
    if os.path.exists(path) and os.environ.get('SKIP_EXISTING'): continue
    t0 = time.time(); set_frame(f, A.fmt); sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'frame {f} {time.time() - t0:.1f}s', flush=True)
