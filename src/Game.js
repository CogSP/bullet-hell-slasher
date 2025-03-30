import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

import { Player } from './Player.js';
import { EnemySpawner } from './EnemySpawner.js';
import { UI } from './UI.js';

export class Game {
  constructor(container) {
    this.container = container;

    // Create the scene and set a background color.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202020);

    // Setup camera.
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 50, 50);
    this.camera.lookAt(0, 0, 0);

    // Setup renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Clock for delta time.
    this.clock = new THREE.Clock();

    // Create the player (central node) and add it to the scene.
    this.player = new Player();
    this.scene.add(this.player.mesh);

    // Enemy spawner to handle enemy creation.
    this.enemySpawner = new EnemySpawner(this.scene, this.player);

    // UI overlay for health and score.
    this.ui = new UI();

    // Lighting for the scene.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 50, 50);
    this.scene.add(directionalLight);

    // Listen for window resize.
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    // Update the enemy spawner.
    this.enemySpawner.update(delta);

    // Update each enemy and check for collisions with the player.
    for (let enemy of this.enemySpawner.enemies) {
      enemy.update(delta);
      const distance = enemy.mesh.position.distanceTo(this.player.mesh.position);
      if (distance < 2) { // Collision threshold.
        this.player.takeDamage(1);
        this.enemySpawner.removeEnemy(enemy);
      }
    }

    // Update the UI with current health and score.
    this.ui.update(this.player.health, this.enemySpawner.score);

    // Render the scene.
    this.renderer.render(this.scene, this.camera);
  }
}
