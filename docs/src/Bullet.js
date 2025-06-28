import * as THREE from 'three';
import { GRAVITY }   from './constants.js';
import { laserTex }  from './LaserTextures.js';   // already loads all laser PNGs

/*─────────────────────────  trail sprite pool  ───────────────────────*/
const TRAIL_POOL_SIZE = 64;

const trailGeo = new THREE.PlaneGeometry(0.25, 0.25);
const trailMat = new THREE.MeshBasicMaterial({
  map         : laserTex[0],          // just reuse the first laser frame
  transparent : true,
  depthWrite  : false,
  blending    : THREE.AdditiveBlending,
  opacity     : 0
});

const trailPool = Array.from({ length: TRAIL_POOL_SIZE }, () => {
  const m = new THREE.Mesh(trailGeo, trailMat.clone());
  m.visible = false;
  return m;
});
let trailIndex = 0;
function getTrailSprite(scene)
{
  const s = trailPool[trailIndex];
  trailIndex = (trailIndex + 1) % TRAIL_POOL_SIZE;
  if (!s.parent) scene.add(s);
  s.visible = true;
  s.material.opacity = 0.8;
  return s;
}
/*──────────────────────────────────────────────────────────────────────*/

export class Bullet {
  constructor(pos, dir, scene, {
    speed        = 300, // this will influence the damage
    mass         = 0.05,
    heightOffset = 0
  } = {}) {

    /*―― basic physics ――*/
    this.mass     = mass;
    this.velocity = dir.clone().setLength(speed);
    this.radius   = 5.35;
    this.alive    = true;

    /*―― core mesh (tiny cylinder) ――*/
    const coreLen = 1.6, coreRad = 0.08;
    const coreGeo = new THREE.CylinderGeometry(coreRad, coreRad, coreLen, 6, 1, true);
    const coreMat = new THREE.MeshStandardMaterial({
      color            : 0xffb200,
      emissive         : 0xff7300,
      emissiveIntensity: 3,
      metalness        : 0.2,
      roughness        : 0.25
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );

    /*―― glow sprite ――*/
    const tex = laserTex[Math.floor(Math.random() * laserTex.length)];
    const glowMat = new THREE.SpriteMaterial({
      map        : tex,
      color      : 0xffffff,
      transparent: true,
      blending   : THREE.AdditiveBlending,
      depthWrite : false
    });
    this.glow = new THREE.Sprite(glowMat);

    // scale sprite once its image is available
    const setSize = () => {
      const aspect = tex.image.width / tex.image.height;
      const h = 0.8;
      this.glow.scale.set(h * aspect, h, 1);
    };
    if (tex.image && tex.image.width) setSize();
    else tex.addEventListener('update', setSize);

    /*―― group & placement ――*/
    this.mesh = new THREE.Group();
    this.mesh.add(this.core);
    this.mesh.add(this.glow);
    this.mesh.position
        .copy(pos)
        .addScaledVector(new THREE.Vector3(0, 1, 0), heightOffset);

    scene.add(this.mesh);

    /*―― bookkeeping ――*/
    this.scene      = scene;
    this.trailTimer = 0;
  }

  update(dt) {
    if (!this.alive) return;

    //this.velocity.addScaledVector(GRAVITY, dt);
    this.mesh.position.addScaledVector(this.velocity, dt);

    if (this.mesh.position.lengthSq() > 40000) {
      this.dispose();
      return;
    }

    /* trail */
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      getTrailSprite(this.scene).position.copy(this.mesh.position);
      this.trailTimer = 0.015;
    }
    trailPool.forEach(s => {
      if (s.visible) {
        s.material.opacity -= dt * 3;
        if (s.material.opacity <= 0) s.visible = false;
      }
    });
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
