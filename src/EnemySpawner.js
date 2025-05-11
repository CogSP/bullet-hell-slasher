import { Enemy } from './Enemy.js';

export class EnemySpawner {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];

    // Horde system
    this.currentWave = 1;
    this.enemiesPerWave = 5;   // Base number of enemies in the first wave
    this.enemiesPerWave = 50000 // testing
    this.spawnedEnemies = 0;
    this.maxEnemiesInWave = this.enemiesPerWave;
    this.spawnInterval = 1.0;
    //this.spawnInterval = 0.5 // testing
    this.spawnTimer = 0;

    this.waveInProgress = true;
    this.nextWaveDelay = 5;
    this.waveCooldownTimer = 0;

    this.score = 0;
  }

  update(delta) {
    if (this.waveInProgress) {
      // Spawn logic during the wave
      this.spawnTimer += delta;

      if (this.spawnedEnemies < this.maxEnemiesInWave && this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const enemy = new Enemy(this.player);
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
        this.spawnedEnemies++;
      }

      // If all enemies have been spawned and killed, prepare next wave
      if (this.spawnedEnemies >= this.maxEnemiesInWave && this.enemies.length === 0) {
        this.waveInProgress = false;
        this.waveCooldownTimer = this.nextWaveDelay;
      }
    } else {
      // Wait before next wave
      this.waveCooldownTimer -= delta;
      if (this.waveCooldownTimer <= 0) {
        this.currentWave++;
        this.startNewWave();
      }
    }
  }

  startNewWave() {
    this.spawnedEnemies = 0;
    this.maxEnemiesInWave = this.enemiesPerWave + this.currentWave * 3; // scale enemy count
    this.spawnInterval = Math.max(0.2, 1.0 - this.currentWave * 0.05);   // faster spawn rate
    this.waveInProgress = true;

    console.log(`Wave ${this.currentWave} started with ${this.maxEnemiesInWave} enemies!`);

    // Optional: UI message
    if (this.player?.game?.ui?.showMessage) {
      this.player.game.ui.showMessage(`Wave ${this.currentWave} incoming!`, 2);
    }
  }

  removeEnemy(enemy) {
    this.scene.remove(enemy.mesh);
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
      this.score += 10;
    }
  }
}
