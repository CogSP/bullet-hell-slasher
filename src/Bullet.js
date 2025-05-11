import * as THREE from 'three';

import { GRAVITY } from './constants.js';

export class Bullet {
  constructor(pos, dir, speed = 25, mass = 0.05) {
    this.mass = mass;
    this.velocity = dir.clone().setLength(speed);
    this.position = pos.clone();
    this.radius   = 0.2;
    //this.speed = 20; // units per second
    this.direction = dir.clone().normalize();
    this.radius = 1; // radius for collision detection

    // Create a velocity vector starting with the bullet's base speed.
    //this.velocity = this.dir.clone().multiplyScalar(this.baseSpeed);

    // Create a small yellow sphere as the bullet.
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(pos);
  }

  update(dt) {
    //head-shots still hit because travel time is short, but long-range pot-shots need a little elevation.
    // v ← v + g Δt
    this.velocity.addScaledVector(GRAVITY, dt);
    // p ← p + v Δt
    this.mesh.position.addScaledVector(this.velocity, dt);
  }
}