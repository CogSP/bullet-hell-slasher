import * as THREE from 'three';

/* ───────────────────────── shaders (unchanged) ───────────────────────── */
const _VS = `uniform float pointMultiplier;
attribute float size, angle;  attribute vec4 aColor;
varying vec4 vColor; varying vec2 vAngle;
void main(){
  vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
  gl_Position     = projectionMatrix * mvPosition;
  gl_PointSize    = size * pointMultiplier / gl_Position.w;
  vAngle = vec2(cos(angle), sin(angle));  vColor = aColor; }`;

const _FS = `uniform sampler2D diffuseTexture;
varying vec4 vColor; varying vec2 vAngle;
void main(){
  vec2 coords=(gl_PointCoord-0.5)*mat2(vAngle.x,vAngle.y,-vAngle.y,vAngle.x)+0.5;
  gl_FragColor = texture2D(diffuseTexture,coords)*vColor;}`;

/* ───────────────────────── helper spline ────────────────────────────── */
function getLinearSpline(lerp){
  const pts=[];  const _lerp=lerp;
  return {
    addPoint:(t,d)=>pts.push([t,d]),
    getValueAt(t){
      let p1=0;
      for(let i=0;i<pts.length;i++){ if(pts[i][0]>=t) break; p1=i; }
      const p2=Math.min(pts.length-1,p1+1);
      if(p1===p2) return pts[p1][1];
      return _lerp((t-pts[p1][0])/(pts[p2][0]-pts[p1][0]), pts[p1][1], pts[p2][1]);
    }
  };
}

/* ---------------------------------------------------------------------- */
function getParticles(params){
  const { 
    camera, emitter, parent, 
    rate=60, 
    mode="smoke", 
    texture,
    bodyRadius = 0.6,
    bodyHeight = 1.8,
    maxVelocity,
    maxLife,
    maxSize,
    radius,
    colour
  } = params;

  let emitting = true;

  /* --- preset table ---------------------------------------------------- */
  const PRESET_BASE={
    fire :{
      tex : texture ?? 'src/img/fire.png',
      blend:THREE.AdditiveBlending,
      radius:0.5, maxLife:1.5, maxSize:1.2,
      alpha:[ [0,0],[0.6,1],[1,0] ],
      colour:[ [0,new THREE.Color(0xffffff)],
               [1,new THREE.Color(0xff8030)] ],
      size:[ [0,0],[1,1] ],
      velocity:()=>new THREE.Vector3(0,1.5,0)
    },
    smoke:{
      tex : texture ?? 'src/img/smoke.png',
      blend:THREE.NormalBlending,
      radius:0.4, maxLife:1.4, maxSize:1.8,
      alpha:[ [0,0],[0.3,0.8],[1,0] ],
      colour:[ [0,new THREE.Color(0x666666)],
               [1,new THREE.Color(0x000000)] ],
      size:[ [0,0.4],[1,2] ],
      velocity:()=>new THREE.Vector3(
                    (Math.random()-0.5)*0.2,
                    0.6+Math.random()*0.4,
                    (Math.random()-0.5)*0.2)
    },
    aura :{
        tex : texture ?? 'src/img/circle.png',
        blend:THREE.AdditiveBlending,
        radius:0.6, maxLife:0.8, maxSize:0.018, maxVelocity:2,
        alpha:[ [0,0],[0.2,0.9],[1,0] ],
        colour:[ [0,new THREE.Color(0x44d7ff)],
                [1,new THREE.Color(0xffffff)] ],
        // size stays constant (no growth
        size:[ [0,1],[1,1] ],
        velocity : function (dir){
            const v = this.maxVelocity;
            return new THREE.Vector3(
                (Math.random()*2-1)*v,
                (Math.random()*2-1)*v,
                (Math.random()*2-1)*v
            );
        }
    }
  };
  
  const PRESET = { ...PRESET_BASE[mode] }; 

  if (maxVelocity !== undefined) PRESET.maxVelocity = maxVelocity;
  if (maxLife     !== undefined) PRESET.maxLife     = maxLife;
  if (maxSize     !== undefined) PRESET.maxSize     = maxSize;
  if (radius      !== undefined) PRESET.radius      = radius;
  if (colour      !== undefined) PRESET.colour      = colour;


  /* --- material -------------------------------------------------------- */
  const uniforms={
    diffuseTexture:{ value:new THREE.TextureLoader().load(PRESET.tex) },
    pointMultiplier:{ value:window.innerHeight/(2*Math.tan(30*Math.PI/180)) }
  };
  const mat=new THREE.ShaderMaterial({
    uniforms, vertexShader:_VS, fragmentShader:_FS,
    blending:PRESET.blend, depthTest:true, depthWrite:false,
    transparent:true, vertexColors:true
  });


  /* geometry container */
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  geom.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
  geom.setAttribute('aColor', new THREE.Float32BufferAttribute([], 4));
  geom.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

  const points = new THREE.Points(geom,mat);  
  parent.add(points);

  /* splines ------------------------------------------------------------- */
  const alphaSpline=getLinearSpline((t,a,b)=>a+t*(b-a));
  PRESET.alpha.forEach(p=>alphaSpline.addPoint(...p));

  const colourSpline=getLinearSpline((t,a,b)=>a.clone().lerp(b,t));
  PRESET.colour.forEach(p=>colourSpline.addPoint(...p));

  const sizeSpline=getLinearSpline((t,a,b)=>a+t*(b-a));
  PRESET.size.forEach(p=>sizeSpline.addPoint(...p));

  /* ── helper so callers can change the gradient later ───────────── */
  function setColourStops(stops /* array [[t, THREE.Color], …] */) {
    // clear the old spline
    colourSpline._pts = [];              // <- add _pts to the spline object
    for (const [t, c] of stops) colourSpline.addPoint(t, c);
  }

  /* particle pool */
  let pool=[]; let acc=0;

  /* spawn --------------------------------------------------------------- */
  function addParticles(dt){

    if (!emitting) return;

    acc+=dt; 
    const n=Math.floor(acc*rate); 
    acc-=n/rate;

    for(let i=0;i<n;i++){
      
      const life = (Math.random()*0.75+0.25)*PRESET.maxLife;

      // initialize pos and dir
      let pos, dir;

      if (mode === "fire") {
        dir=new THREE.Vector3(Math.random()*2-1,0,Math.random()*2-1).normalize();
        pos=new THREE.Vector3().copy(dir)
                    .multiplyScalar(PRESET.radius*(0.3+0.7*Math.random()));
        pos.y += (Math.random()-0.5)*0.4;
        pos.add(emitter.position);
      }

      else if (mode === "aura") {
        // ───── NEW: pick a random point inside the cylinder ───────────────
        pos = new THREE.Vector3(
            (Math.random()*2 - 1) * bodyRadius,          // x ∈ [-R, R]
            (Math.random()      ) * bodyHeight - bodyHeight * 0.5, // y ∈ [-H/2, H/2]
            (Math.random()*2 - 1) * bodyRadius           // z ∈ [-R, R]
        );

        // move from local to world space (anchor is at chest-height)
        //pos.add(emitter.getWorldPosition(new THREE.Vector3()));

        // velocity points outward from the player’s centre so the orbs “fly off”
        dir = pos.clone().sub(emitter.getWorldPosition(new THREE.Vector3()))
                          .normalize();
      }

      pool.push({
        position:pos, 
        size:(Math.random()*0.5+0.5)*PRESET.maxSize,
        colour:new THREE.Color(), 
        alpha:1.0, 
        life, 
        maxLife:life,
        rotation:Math.random()*Math.PI*2, 
        rotationRate:Math.random()*0.01-0.005,
        velocity:(mode==="fire")?PRESET.velocity()
                :(mode==="aura")?PRESET.velocity(dir):PRESET.velocity()
      });
    }
  }

  /* integrate ----------------------------------------------------------- */
  function updateParticles(dt){
    for(const p of pool) p.life-=dt;
    pool=pool.filter(p=>p.life>0);

    for(const p of pool){
      const t=1-p.life/p.maxLife;
      p.rotation+=p.rotationRate;
      p.alpha        = alphaSpline.getValueAt(t);
      p.currentSize  = p.size*sizeSpline.getValueAt(t);
      p.colour.copy(  colourSpline.getValueAt(t));
      p.position.addScaledVector(p.velocity,dt);

      /* drag */
      const drag=p.velocity.clone().multiplyScalar(dt*0.1);
      ['x','y','z'].forEach(c=>{
        drag[c]=Math.sign(p.velocity[c])*Math.min(Math.abs(drag[c]),Math.abs(p.velocity[c]));
      });
      p.velocity.sub(drag);
    }

    /* sort back-to-front for transparency */
    pool.sort((a,b)=>camera.position.distanceTo(b.position)-
                     camera.position.distanceTo(a.position));
  }


  /* push data to GPU ---------------------------------------------------- */
  function upload(){
    const pos=[],size=[],col=[],ang=[];
    for(const p of pool){
      pos.push(p.position.x,p.position.y,p.position.z);
      size.push(p.currentSize);
      col.push(p.colour.r,p.colour.g,p.colour.b,p.alpha);
      ang.push(p.rotation);
    }
    geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geom.setAttribute('size'    ,new THREE.Float32BufferAttribute(size,1));
    geom.setAttribute('aColor'  ,new THREE.Float32BufferAttribute(col ,4));
    geom.setAttribute('angle'   ,new THREE.Float32BufferAttribute(ang ,1));
    ['position','size','aColor','angle'].forEach(k=>geom.attributes[k].needsUpdate=true);
  }

  /* public -------------------------------------------------------------- */
  function update(dt){
    addParticles(dt);  updateParticles(dt);  upload();
  }
  return { update, setColourStops };
}

export { getParticles };
