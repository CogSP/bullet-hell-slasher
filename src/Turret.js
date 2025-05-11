import * as THREE from 'three';
import { Bullet } from './Bullet.js';

export class Turret {
  /**
   * @param {THREE.Vector3} pos    world-space position where the base sits
   * @param {THREE.Scene}   scene
   * @param {EnemySpawner}  spawner – to query enemies
   */
  constructor(pos, scene, spawner) {
    /* ── tuning ───────────────────────────────────────────── */
    this.fireRate   = 2;          // rps  (shots / second)
    this.range      = 25;         // m
    this.turnSpeed  = 4;          // rad s-1

    /* ── simple geometry (base + barrel) ─────────────────── */
    const baseGeo  = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 12);
    const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8);
    const mat      = new THREE.MeshStandardMaterial({ color: 0x555555 });
    this.base      = new THREE.Mesh(baseGeo, mat);
    this.barrel    = new THREE.Mesh(barrelGeo, mat);

    // pivot barrel so Z+ is forward
    this.barrel.rotation.z = Math.PI * 0.5;
    this.barrel.position.y = 0.6;          // atop the base
    this.barrel.position.z = 0.8;

    this.object = new THREE.Group();
    this.object.add(this.base);
    this.object.add(this.barrel);
    this.object.position.copy(pos);
    scene.add(this.object);

    /* ── bookkeeping ───────────────────────────────────────── */
    this.scene     = scene;
    this.spawner   = spawner;
    this.cooldown  = 0;   // seconds until next shot
  }

  /** call every frame */
  update(dt) {
    /* find the closest enemy in range */
    let closest = null;
    let closestDistSq = this.range * this.range;

    for (const e of this.spawner.enemies) {
      const dSq = e.mesh.position.distanceToSquared(this.object.position);
      if (dSq < closestDistSq) {
        closest = e;
        closestDistSq = dSq;
      }
    }
    if (!closest) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      return;                    // no target in range
    }

    /* rotate barrel towards target */
    const toTarget = closest.mesh.position.clone()
                       .sub(this.object.position)
                       .setY(0)                    // keep flat
                       .normalize();

    const currentDir = new THREE.Vector3(0, 0, 1) // barrel’s local +Z
                         .applyQuaternion(this.object.quaternion);

    const angle = currentDir.angleTo(toTarget);
    const maxStep = this.turnSpeed * dt;

    if (angle > 0.001) {
      const axis = currentDir.clone().cross(toTarget).normalize();
      const step = Math.min(maxStep, angle);
      this.object.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(axis, step)
      );
    }

    /* fire if aimed & cooldown expired */
    this.cooldown -= dt;
    if (angle < 0.15 && this.cooldown <= 0) {
      const muzzle = new THREE.Vector3(0, 0.6, 1.1) // front of barrel
                       .applyMatrix4(this.object.matrixWorld);
      const dir    = toTarget;         // already unit length

      new Bullet(muzzle, dir, this.scene);   // speed defaults to 60
      this.cooldown = 1 / this.fireRate;
    }
  }
}
