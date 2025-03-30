import { Enemy } from './Enemy.js';

export class EnemySpawner {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];
    this.spawnInterval = 2; // Spawn a new enemy every 2 seconds.
    this.spawnTimer = 0;
    this.score = 0;
  }

  update(delta) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const enemy = new Enemy(this.player);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }
  }

  removeEnemy(enemy) {
    // Remove enemy from the scene and the enemies array.
    this.scene.remove(enemy.mesh);
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
      this.score += 10; // Increase score when an enemy is removed.
    }
  }
}
