import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

export class Enemy {
  constructor(player) {
    this.player = player;
    this.speed = 5; // Units per second.

    // Create a red sphere as the enemy.
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);

    // Spawn the enemy at a random position on a circle of radius 40.
    const spawnDistance = 40;
    const angle = Math.random() * Math.PI * 2;
    this.mesh.position.set(
      Math.cos(angle) * spawnDistance,
      1,
      Math.sin(angle) * spawnDistance
    );
  }

  update(delta) {
    // Move enemy toward the player's position.
    const direction = this.player.mesh.position.clone().sub(this.mesh.position).normalize();
    this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
  }
}
