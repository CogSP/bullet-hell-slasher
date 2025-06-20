// import * as THREE from 'three';

// const _VS = `
// uniform float pointMultiplier;

// attribute float size;
// attribute float angle;
// attribute vec4 aColor;

// varying vec4 vColor;
// varying vec2 vAngle;

// void main() {
//   vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

//   gl_Position = projectionMatrix * mvPosition;
//   gl_PointSize = size * pointMultiplier / gl_Position.w;

//   vAngle = vec2(cos(angle), sin(angle));
//   vColor = aColor;
// }`;

// const _FS = `
// uniform sampler2D diffuseTexture;

// varying vec4 vColor;
// varying vec2 vAngle;

// void main() {
//   vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
//   gl_FragColor = texture2D(diffuseTexture, coords) * vColor;
// }`;


// function getLinearSpline(lerp) {

//   const points = [];
//   const _lerp = lerp;

//   function addPoint(t, d) {
//     points.push([t, d]);
//   }

//   function getValueAt(t) {
//     let p1 = 0;

//     for (let i = 0; i < points.length; i++) {
//       if (points[i][0] >= t) {
//         break;
//       }
//       p1 = i;
//     }

//     const p2 = Math.min(points.length - 1, p1 + 1);

//     if (p1 == p2) {
//       return points[p1][1];
//     }

//     return _lerp(
//       (t - points[p1][0]) / (
//         points[p2][0] - points[p1][0]),
//       points[p1][1], points[p2][1]);
//   }
//   return { addPoint, getValueAt };
// }

// function getParticleSystem(params) {
//   const { camera, emitter, parent, rate, texture, mode } = params;
//   const uniforms = {
//     diffuseTexture: {
//       value: new THREE.TextureLoader().load(texture)
//     },
//     pointMultiplier: {
//       value: window.innerHeight / (2.0 * Math.tan(30.0 * Math.PI / 180.0))
//     }
//   };
//   const _material = new THREE.ShaderMaterial({
//     uniforms: uniforms,
//     vertexShader: _VS,
//     fragmentShader: _FS,
//     blending: mode === 'fire'
//            ? THREE.AdditiveBlending            // bright / emissive
//            : THREE.NormalBlending,             // soft alpha for smoke
//     depthTest: true,
//     depthWrite: false,
//     transparent: true,
//     vertexColors: true
//   });

//   let _particles = [];

//   const geometry = new THREE.BufferGeometry();
//   geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
//   geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
//   geometry.setAttribute('aColor', new THREE.Float32BufferAttribute([], 4));
//   geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

//   const _points = new THREE.Points(geometry, _material);

//   parent.add(_points);

//   const alphaSpline = getLinearSpline((t, a, b) => {
//     return a + t * (b - a);
//   });
//   if (mode === 'fire') {
//     alphaSpline.addPoint(0.0, 0.0);
//     alphaSpline.addPoint(0.6, 1.0);
//     alphaSpline.addPoint(1.0, 0.0);
//   } else {                        // smoke – slower fade-out
//     alphaSpline.addPoint(0.0, 0.0);
//     alphaSpline.addPoint(0.3, 0.8);
//     alphaSpline.addPoint(1.0, 0.0);
//   }

//   const colorSpline = getLinearSpline((t, a, b) => {
//     const c = a.clone();
//     return c.lerp(b, t);
//   });
//   if (mode === 'fire') {
//     colorSpline.addPoint(0.0, new THREE.Color(0xffffff));
//     colorSpline.addPoint(1.0, new THREE.Color(0xff8030));
//   } else {                        // smoke – grey that darkens
//     colorSpline.addPoint(0.0, new THREE.Color(0x666666));
//     colorSpline.addPoint(1.0, new THREE.Color(0x000000));
//   }

//   const sizeSpline = getLinearSpline((t, a, b) => {
//     return a + t * (b - a);
//   });
//   if (mode === 'fire') {
//     sizeSpline.addPoint(0.0, 0.0);
//     sizeSpline.addPoint(1.0, 1.0);
//   } else {                        // smoke balloons out
//     sizeSpline.addPoint(0.0, 0.6);   // starts noticeable
//     sizeSpline.addPoint(1.0, 2.2);   // grows bigger before vanishing
//   }
//   // max point size = 512; => console.log(ctx.getParameter(ctx.ALIASED_POINT_SIZE_RANGE));
//   const maxLife  = mode === 'fire' ? 1.5 : 0.8; /* AURA-SMOKE: stay close, grow quickly, fade fast */
//   const maxSize  = mode === 'fire' ? 1.2 : 1.0;
//   const radius   = mode === 'fire' ? 0.5 : 0.6;
//   let gdfsghk = 0.0;
//   function _AddParticles(timeElapsed) {
//     gdfsghk += timeElapsed;
//     const n = Math.floor(gdfsghk * rate);
//     gdfsghk -= n / rate;
//     for (let i = 0; i < n; i += 1) {
//         /* ---- spawn on a ring around the Y-axis (aura) ---- */
//         const dir = new THREE.Vector3(Math.random()*2-1, 0, Math.random()*2-1).normalize();
//         const pos = dir.clone().multiplyScalar(radius * (0.3 + 0.7*Math.random())); // ring
//         pos.y += (Math.random()-0.5) * 0.4;                                // slight height jitter
//         const life = (Math.random() * 0.75 + 0.25) * maxLife;
//         _particles.push({
//             position: new THREE.Vector3(
//                 (Math.random() * 2 - 1) * radius,
//                 (Math.random() * 2 - 1) * radius,
//                 (Math.random() * 2 - 1) * radius).add(emitter.position),
//             size: (Math.random() * 0.5 + 0.5) * maxSize,
//             colour: new THREE.Color(),
//             alpha: 1.0,
//             life: life,
//             maxLife: life,
//             rotation: Math.random() * 2.0 * Math.PI,
//             rotationRate: Math.random() * 0.01 - 0.005,
//             velocity: mode === 'fire'
//                     ? new THREE.Vector3(0, 1.5, 0)
//                     : new THREE.Vector3()
//                         .copy(dir).multiplyScalar(0.4)   // tangential
//                         .add(new THREE.Vector3(0,
//                             0.8+Math.random()*0.4, 0)),
//         });
//     }
//   }

//   function _UpdateGeometry() {
//     const positions = [];
//     const sizes = [];
//     const colours = [];
//     const angles = [];

//     for (let p of _particles) {
//       positions.push(p.position.x, p.position.y, p.position.z);
//       colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
//       sizes.push(p.currentSize);
//       angles.push(p.rotation);
//     }

//     geometry.setAttribute(
//       'position', new THREE.Float32BufferAttribute(positions, 3));
//     geometry.setAttribute(
//       'size', new THREE.Float32BufferAttribute(sizes, 1));
//     geometry.setAttribute(
//       'aColor', new THREE.Float32BufferAttribute(colours, 4));
//     geometry.setAttribute(
//       'angle', new THREE.Float32BufferAttribute(angles, 1));

//     geometry.attributes.position.needsUpdate = true;
//     geometry.attributes.size.needsUpdate = true;
//     geometry.attributes.aColor.needsUpdate = true;
//     geometry.attributes.angle.needsUpdate = true;
//   }
//   _UpdateGeometry();

//   function _UpdateParticles(timeElapsed) {
//     for (let p of _particles) {
//       p.life -= timeElapsed;
//     }

//     _particles = _particles.filter(p => {
//       return p.life > 0.0;
//     });

//     for (let p of _particles) {
//       const t = 1.0 - p.life / p.maxLife;
//       p.rotation += p.rotationRate;
//       p.alpha = alphaSpline.getValueAt(t);
//       p.currentSize = p.size * sizeSpline.getValueAt(t);
//       p.colour.copy(colorSpline.getValueAt(t));

//       p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

//       const drag = p.velocity.clone();
//       drag.multiplyScalar(timeElapsed * 0.1);
//       drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
//       drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
//       drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
//       p.velocity.sub(drag);
//     }

//     _particles.sort((a, b) => {
//       const d1 = camera.position.distanceTo(a.position);
//       const d2 = camera.position.distanceTo(b.position);

//       if (d1 > d2) {
//         return -1;
//       }
//       if (d1 < d2) {
//         return 1;
//       }
//       return 0;
//     });
//   }

//   function update(timeElapsed) {
//     _AddParticles(timeElapsed);
//     _UpdateParticles(timeElapsed);
//     _UpdateGeometry();
//   }
//   return { update };
// }

// export { getParticleSystem };


/* getParticles.js -------------------------------------------------- */
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
  const { camera, emitter, parent, rate=60, mode="smoke", texture } = params;

  /* --- preset table ---------------------------------------------------- */
  const PRESET={
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
        //blend:THREE.AdditiveBlending,
        radius:0.6, maxLife:0.8, maxSize:0.018, maxVelocity:0.5,
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
  }[mode] ?? PRESET.smoke;

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

  /* particle pool */
  let pool=[]; let acc=0;

  /* spawn --------------------------------------------------------------- */
  function addParticles(dt){
    acc+=dt; 
    const n=Math.floor(acc*rate); 
    acc-=n/rate;

    // TODO: to tweak until it looks good
    const BODY_RADIUS = 60; 
    const BODY_HEIGHT = 300;
    //

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
            (Math.random()*2 - 1) * BODY_RADIUS,          // x ∈ [-R, R]
            (Math.random()      ) * BODY_HEIGHT - BODY_HEIGHT * 0.5, // y ∈ [-H/2, H/2]
            (Math.random()*2 - 1) * BODY_RADIUS           // z ∈ [-R, R]
        );

        // move from local to world space (anchor is at chest-height)
        pos.add(emitter.getWorldPosition(new THREE.Vector3()));

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
  return { update };
}

export { getParticles };
