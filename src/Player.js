import * as THREE from 'three';

export class Player {
  constructor() {
    this.health = 100;
    this.speed = 10; // Movement speed (units per second).
    this.velocity = new THREE.Vector3(0, 0, 0); // Current velocity.

    // Create a green sphere as the player node.
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 1.5, 0);
  }

  // Call this every frame to update the player's position based on input.
  update(delta, input) {
    const direction = new THREE.Vector3();

    // WASD keys: 'KeyW' for forward (negative z), 'KeyS' for backward,
    // 'KeyA' for left (negative x), 'KeyD' for right.
    if (input['KeyW']) direction.z -= 1;
    if (input['KeyS']) direction.z += 1;
    if (input['KeyA']) direction.x -= 1;
    if (input['KeyD']) direction.x += 1;

    // Normalize to prevent faster diagonal movement.
    if (direction.length() > 0) {
      direction.normalize();
      // Store current velocity.
      this.velocity.copy(direction).multiplyScalar(this.speed);
      // Update position: speed * time * direction.
      const movement = direction.multiplyScalar(this.speed * delta);
      this.mesh.position.add(movement);
    } else {
      this.velocity.set(0, 0, 0);
    }
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
