import * as THREE from 'three';

export class HeartPickup {
  constructor(position, player) {
    this.player = player;
    this.radius = 1; // pickup radius
    this.magnetRange = 40;     // Distance to start flying toward the player
    this.healAmount = 20;
    this.bobTime = 0;

    // Heart geometry
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);

    // Use a material that supports emission and lighting
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4f4f,
      emissive: new THREE.Color(0xff4f4f),
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.2
    });

    this.material = material; // Save reference for pulsing update

    // Create mesh and position it
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.position.y += 1.5; // Hover slightly
  }

  update(delta) {
    this.bobTime += delta;

    // Hovering effect
    this.mesh.position.y += Math.sin(this.bobTime * 3) * delta * 0.5;

    // Glowing pulsing effect
    this.material.emissiveIntensity = Math.sin(this.bobTime * 4) * 0.3 + 0.7;

    // Pickup collision
    const dist = this.mesh.position.distanceTo(this.player.mesh.position);
    if (dist < this.radius) {
      this.player.heal(this.healAmount);
      return true; // Picked up
    }

    // If within magnet range, move toward player
    if (dist < this.magnetRange) {
      const direction = this.player.mesh.position.clone().sub(this.mesh.position).normalize();
      const speed = 40; // Adjust this for how fast the heart flies in
      this.mesh.position.add(direction.multiplyScalar(speed * delta));
    }

    return false;
  }
}
