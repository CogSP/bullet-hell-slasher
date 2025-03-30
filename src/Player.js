import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';


export class Player {
  constructor() {
    this.health = 100;
    // Create a green sphere as the player node.
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 1.5, 0);
  }

  takeDamage(amount) {
    this.health -= amount;
    console.log(`Player Health: ${this.health}`);
    if (this.health <= 0) {
      console.log('Game Over!');
      // Implement game over logic here.
    }
  }
}
