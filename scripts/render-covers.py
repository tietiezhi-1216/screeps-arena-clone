import bpy, math, random, sys
mode = sys.argv[-1]
random.seed({'swamp':3,'flag':5,'collect':7}[mode])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device='CPU'
sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.render.filepath = f'/workspace/covers/{mode}.png'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look='AgX - Medium High Contrast'
def mat(name, col, em=0, rough=.7):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough
    if em: b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = em
    return m
def h(x): x=x.lstrip('#'); return tuple((int(x[i:i+2],16)/255)**2.2 for i in (0,2,4))
M = dict(ground=mat('g',h('#2a3342')), plain=mat('p',h('#324055')), wall=mat('w',h('#141a24')), swamp=mat('s',h('#3d4a22'),rough=.25),
  red=mat('r',h('#E5484D'),3), blue=mat('b',h('#4c9aff'),3), redb=mat('rb',h('#7a2326')), blueb=mat('bb',h('#22406e')), gold=mat('y',h('#e8e8e8'),4), white=mat('wh',h('#cfd6e0')))
def box(x,y,z,sx,sy,sz,m,bev=.08):
    bpy.ops.mesh.primitive_cube_add(location=(x,y,z)); o=bpy.context.object; o.scale=(sx/2,sy/2,sz/2)
    bpy.ops.object.transform_apply(scale=True)
    if bev: md=o.modifiers.new('b','BEVEL'); md.width=bev; md.segments=3
    o.data.materials.append(m); return o
def cyl(x,y,z,r,d,m,v=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r,depth=d,location=(x,y,z),vertices=v); o=bpy.context.object; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def sph(x,y,z,r,m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=(x,y,z)); o=bpy.context.object; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
N=14
box(0,0,-.3,N*2+2,N*2+2,.6,M['ground'],.2)
occ=set()
for i in range(-N,N):
  for j in range(-N,N):
    r=random.random(); x,y=i+.5,j+.5
    d=math.hypot(i,j)
    if r<.09 and d>3: box(x,y,.45,.96,.96,.9+random.random()*.6,M['wall']); occ.add((i,j))
    elif r<.30 and mode=='swamp': box(x,y,.03,1,1,.06,M['swamp'],0)
    else: box(x,y,.02,.94,.94,.04,M['plain'],.03)
def creep(x,y,team):
    sph(x,y,.45,.38,M[team+'b']); sph(x,y,.78,.16,M[team])
def spawn(x,y,team):
    cyl(x,y,.35,1.1,.7,M[team+'b']); cyl(x,y,.75,.7,.2,M[team]); 
for t,sx in (('blue',-1),('red',1)):
    if mode!='collect': spawn(sx*9,sx*-4,t)
    for k in range(6):
        creep(sx*(5-k%3*1.6)+random.uniform(-.4,.4), sx*(-2+k*1.2)*.8, t)
if mode=='flag':
    for (x,y,t) in [(-6,6,'blue'),(6,-6,'red'),(0,0,'white'),(-3,-7,'red'),(3,7,'blue')]:
        cyl(x,y,1.5,.06,3,M['white'],12); box(x+.5,y,2.6,1,.08,.7,M[t],0); cyl(x,y,.1,.6,.2,M[t+'b'] if t!='white' else M['wall'])
if mode=='collect':
    cyl(0,0,.6,1.6,1.2,M['ground']); cyl(0,0,1.25,1.1,.15,M['red'])
    for k in range(10):
        a=k/10*6.28; r=5+random.random()*4; box(math.cos(a)*r,math.sin(a)*r,.4,.5,.5,.5,M['gold'],.05)
if mode=='swamp':
    for k in range(5): box(random.uniform(-8,8),random.uniform(-8,8),.25,.4,.4,.4,M['gold'],.05)
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=24
co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(22,-22,20); co.rotation_euler=(math.radians(55),0,math.radians(45))
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(*h('#1C2533'),1); w.node_tree.nodes['Background'].inputs[1].default_value=.6
sun=bpy.data.lights.new('s','SUN'); sun.energy=3.5; sun.angle=.15; so=bpy.data.objects.new('s',sun); sc.collection.objects.link(so); so.rotation_euler=(math.radians(45),math.radians(15),math.radians(-30))
bpy.ops.render.render(write_still=True)
