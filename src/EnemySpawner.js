import * as THREE from 'three';
import { Enemy } from './Enemy.js';


export class EnemySpawner {
  constructor(scene, player, game, pathfinder) {
    this.scene = scene;
    this.player = player;
    this.pathfinder = pathfinder;
    this.enemies = [];

    // Horde system
    this.currentWave = 1;
    this.enemiesPerWave = 10;   // Base number of enemies in the first wave
    //this.enemiesPerWave = 50000 // testing
    this.spawnedEnemies = 0;
    this.maxEnemiesInWave = this.enemiesPerWave;
    this.spawnInterval = 0.5;//100000000000 //0.5; // 10000000 
    this.spawnTimer = 0;
    this.game = game;

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

        const spawnPos = this.getFreeSpawnPosition(this.game.staticColliders, 1.0);
        if (!spawnPos) return; // No free spawn position found

        const enemy = new Enemy(
          this.scene,
          this.player, 
          this.game.staticColliders,
          this.pathfinder
        );

        // the spawner decides the position
        enemy.mesh.position.copy(spawnPos);

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

    // Optional: UI message
    if (this.player?.game?.ui?.showMessage) {
      this.player.game.ui.showMessage(`Wave ${this.currentWave} incoming!`, 2);
    }

    this.game.addTurretToken(2);

    // with probability 8% add a Molotov
    const molotovChance = 0.08;
    if(Math.random()<molotovChance){
      this.addMolotovToken(1, enemy.mesh.position);
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

  getFreeSpawnPosition (colliders, radius = 1, maxTry = 40) {

    const mapHalf = 240;              // your ground is 500×500 → ±250
    const tmpBox  = new THREE.Box3(); // reused each loop

    for (let i = 0; i < maxTry; i++) {

      // pick a random point somewhere on the map (— tweak as you like)
      const pos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(mapHalf * 2),
        0,
        THREE.MathUtils.randFloatSpread(mapHalf * 2)
      );

      // build a little AABB around that point (Y just needs to cover zombies)
      tmpBox.setFromCenterAndSize(
        pos,
        new THREE.Vector3(radius * 2, 4, radius * 2)
      );

      // collide with every static obstacle
      const hit = colliders.some(b => b.intersectsBox(tmpBox));
      if (!hit) return pos;           // success!
    }

    return null;                      // gave up – map is probably full
  }

}
