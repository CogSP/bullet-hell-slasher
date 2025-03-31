import * as THREE from 'three';

export class Bullet {
  constructor(position, direction) {
    this.speed = 20; // units per second
    this.direction = direction.clone().normalize();
    this.radius = 0.2; // radius for collision detection

    // Create a velocity vector starting with the bullet's base speed.
    this.velocity = this.direction.clone().multiplyScalar(this.baseSpeed);

    // Create a small yellow sphere as the bullet.
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
  }

  update(delta) {
    // Move the bullet along its normalized direction.
    this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));
  }
}
