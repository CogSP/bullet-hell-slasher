import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { Player } from './Player.js';
import { EnemySpawner } from './EnemySpawner.js';
import { UI } from './UI.js';
import { Bullet } from './Bullet.js';
import { HeartPickup } from './HeartPickup.js';


export class Game {
  constructor(container) {
    this.container = container;

    // Create the scene and set a background color.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202020);
    

    // // Load a ground texture using TextureLoader
    // const textureLoader = new THREE.TextureLoader();
    // // https://www.fab.com/listings/42e25675-17ba-4205-a155-bd9216519ca1
    // const groundTexture = textureLoader.load('assets/ground/japanese_shrine_stone_floor_ugrxbjkfa_ue_high/Textures/T_ugrxbjkfa_4K_B.png'); // update with your texture path
    
    // // Enable repeat wrapping so the texture tiles across the surface
    // groundTexture.wrapS = THREE.RepeatWrapping;
    // groundTexture.wrapT = THREE.RepeatWrapping;

    // // Set the repeat factors (adjust these to cover the map with the desired detail)
    // groundTexture.repeat.set(100, 100); // increase for more tiling

    // // Optionally, improve texture quality at oblique angles
    // groundTexture.anisotropy = 16;

    /* ---------- PBR cobblestone ground (Step-1) ---------- */
    const texLoader = new THREE.TextureLoader();

    const gColor  = texLoader.load('assets/ground/pbr/ground_albedo.jpg');
    const gNormal = texLoader.load('assets/ground/pbr/ground_normal.png');
    const gRough  = texLoader.load('assets/ground/pbr/ground_rough.jpg');
    const gAO     = texLoader.load('assets/ground/pbr/ground_ao.png');   // if you have it

    // colour textures must be flagged as sRGB so lighting looks right
    gColor.colorSpace = THREE.SRGBColorSpace;

    // tile the texture across the plane (fewer, larger tiles than before)
    const TILE_REPEAT = 40;
    [gColor, gNormal, gRough, gAO].forEach(t => {
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(TILE_REPEAT, TILE_REPEAT);
        t.anisotropy = 16;
      }
    });

    const groundMaterial = new THREE.MeshStandardMaterial({
      map:           gColor,
      normalMap:     gNormal,
      roughnessMap:  gRough,
      aoMap:         gAO ?? undefined,
      roughness:     1                             // let the texture drive it
    });

    // dial the bump strength up or down if needed
    groundMaterial.normalScale.set(0.9, 0.9);
    /* ----------------------------------------------------- */



    // Create a large plane geometry for the ground (e.g., 1000 x 1000 units)
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);

    //const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; // Make the plane horizontal.
    groundMesh.position.y = 0; // Set at ground level.

    // Optionally, allow the ground to receive shadows
    groundMesh.receiveShadow = true;

    // Add the ground to the scene
    this.scene.add(groundMesh);

    // Setup camera.
    const aspect = container.clientWidth / container.clientHeight;
    const viewSize = 100; // Adjust this value to zoom in/out
    
    // Calculate orthographic parameters
    const left = -viewSize * aspect / 2;
    const right = viewSize * aspect / 2;
    const top = viewSize / 2;
    const bottom = -viewSize / 2;
    
    // Create an orthographic camera
    this.camera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 1000);
    
    // Position the camera for an isometric view.
    // A common setup is to rotate 45° around Y and 35.264° (arctan(1/√2)) above the horizontal.
    this.camera.position.set(20, 20, 20); 
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // --- New: Store initial camera state ---
    // Calculate the angle (in the XZ plane) from the camera's position.
    this.initialCameraAngle = Math.atan2(this.camera.position.z, this.camera.position.x); // ~45° in radians
    this.cameraAngle = this.initialCameraAngle;
    // Calculate the distance from the center (ignoring Y).
    this.cameraDistance = Math.sqrt(
      this.camera.position.x * this.camera.position.x +
      this.camera.position.z * this.camera.position.z
    );
    // Store the camera's height.
    this.cameraHeight = this.camera.position.y;
    
    // Setup renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    //this.renderer.setPixelRatio(window.devicePixelRatio); // Optional but recommended
    container.appendChild(this.renderer.domElement);

    // Clock for delta time.
    this.clock = new THREE.Clock();

    this.pickups = [];

    // Create the player.
    this.player = new Player(this.scene);
    this.player.game = this; // So player can access game and UI

    this.scene.add(this.player.mesh);

    // Set up a callback so that when the player’s knife attack reaches its hit moment,
    // we check for nearby enemies and apply damage.
    this.player.onKnifeHit = (damage) => {
      console.log('Knife hit! Damage:', damage);
      const knifeRange = 10; // Define your knife range.
      
      // Compute the player's forward direction (assuming local forward is -Z).
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.player.mesh.quaternion).normalize();
      
      this.enemySpawner.enemies.forEach(enemy => {
        // Compute the vector from the player to the enemy.
        const toEnemy = enemy.mesh.position.clone().sub(this.player.mesh.position);
        const distance = toEnemy.length();
        console.log('Distance to enemy:', distance);
        console.log('knifeRange:', knifeRange);
        
        if (distance < knifeRange) {
          // Normalize to get the direction.
          toEnemy.normalize();
          // Check if the enemy is in front of the player.
          if (forward.dot(toEnemy) > 0) { // dot > 0 means enemy is in front.
            console.log('Enemy hit! Damage:', damage);
            const enemyDead = enemy.takeDamage(damage);
            if (enemyDead) {
              // Remove enemy from scene if health reaches 0
              this.enemySpawner.removeEnemy(enemy);

              // Record the kill.
              this.registerEnemyKill(enemy);
            }
          }
        }
      });
    };
    
    

    // Enemy spawner to handle enemy creation.
    this.enemySpawner = new EnemySpawner(this.scene, this.player);

    // UI overlay for health and score.
    this.ui = new UI();
    this.ui.camera = this.camera;
    

    // Array to hold active bullets.
    this.bullets = [];

    // After initializing existing variables like this.bullets
    this.killTimestamps = [];             // Existing kill tracking for first powerup.
    this.attackVelocityBuffActive = false; // First powerup flag.
    this.attackVelocityBuffDuration = 15;  // First powerup duration (seconds).
    this.attackVelocityBuffTimer = 0;      // First powerup timer.
    this.attackVelocityBuffMultiplier = 2; // Buff multiplier for knife speed.

    // New variables for the second powerup:
    this.autoBulletKillCount = 0;          // Count of additional kills while first powerup is active.
    this.autoBulletPowerupActive = false;  // Second powerup flag.
    this.autoBulletPowerupDuration = 10;    // Duration for second powerup (seconds).
    this.autoBulletPowerupTimer = 0;       // Timer for the second powerup.
    this.autoBulletCooldown = 1;           // Interval between auto-shoot bursts (seconds).
    this.autoBulletCooldownTimer = 0;      // Timer for auto-shoot bursts.

    // Third powerup: Further increase knife animation speed.
    this.knifeSpeedPowerupActive = false;
    this.knifeSpeedPowerupDuration = 10;  // Duration in seconds (adjust as needed)
    this.knifeSpeedPowerupTimer = 0;
    this.knifeSpeedPowerupMultiplier = 2;  // Further multiplier for knife speed (e.g., from 2x to 6x total)
    this.knifeSpeedPowerupKillCount = 0; // Count of additional kills while auto bullet powerup is active.

    // Fourth powerup: Mega Auto Bullet Powerup.
    this.megaAutoBulletPowerupActive = false;
    this.megaAutoBulletPowerupDuration = 5;    // Duration in seconds (adjust as needed)
    this.megaAutoBulletPowerupTimer = 0;
    this.megaAutoBulletPowerupKillCount = 0;   // Count additional kills while auto bullet powerup is active.

    // Fifth powerup: Ultra Auto Bullet Powerup.
    this.ultraAutoBulletPowerupActive = false;
    this.ultraAutoBulletPowerupDuration = 5;    // Duration in seconds (adjust as needed)
    this.ultraAutoBulletPowerupTimer = 0;
    this.ultraAutoBulletPowerupKillCount = 0;   // Count additional kills while the mega powerup is active.

    // Sixth Powerup: BULLET HELL
    this.bulletHellActive = false;
    this.bulletHellDuration = 4;    // Duration of BULLET HELL in seconds.
    this.bulletHellTimer = 0;       // Timer for bullet hell.
    this.bulletHellKillCount = 0;   // Tracks extra kills while ultra powerup is active.

    // Create an input object to track key states.
    this.input = {};

    // Setup lighting.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 50, 50);
    this.scene.add(directionalLight);

    // Listen for window resize.
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // Listen for mouse clicks to shoot.
    this.container.addEventListener('click', (event) => this.onMouseClick(event));

    // Listen for keydown and keyup events.
    window.addEventListener('keydown', (event) => {
      this.input[event.code] = true;
    });
    window.addEventListener('keyup', (event) => {
      this.input[event.code] = false;
    });


    this.cameraFollow = true; // By default, camera follows the player.
    this.ui.onToggleCameraFollow = () => {
      this.cameraFollow = !this.cameraFollow;
      this.ui.showFloatingMessage("Camera " + (this.cameraFollow ? "Following" : "Fixed"), this.player.mesh.position.clone());
    };

  }

  registerEnemyKill(enemy) {
    const now = this.clock.elapsedTime;
    // Record the kill time.
    this.killTimestamps.push(now);
    // Remove kills older than 30 seconds.
    this.killTimestamps = this.killTimestamps.filter(ts => now - ts <= 30);
    
    // Check for the first powerup condition.
    if (!this.attackVelocityBuffActive && this.killTimestamps.length >= 5) {
      this.activateAttackVelocityBuff();
    }
    
    // When the first buff is active, track additional kills for the second powerup.
    if (this.attackVelocityBuffActive && !this.autoBulletPowerupActive) {
      this.autoBulletKillCount++;
      if (this.autoBulletKillCount >= 10) {
        this.activateAutoBulletPowerup();
        // Optionally, reset the counter.
        this.autoBulletKillCount = 0;
      }
    }

    // When auto bullet powerup is active, track kills for the third powerup.
    if (this.autoBulletPowerupActive && !this.knifeSpeedPowerupActive) {
      this.knifeSpeedPowerupKillCount++;
      if (this.knifeSpeedPowerupKillCount >= 5) {  // Trigger third powerup after 5 extra kills.
        this.activateKnifeSpeedPowerupThree();
        this.knifeSpeedPowerupKillCount = 0;
      }
    }

    // When auto bullet powerup is active, track kills for the mega auto bullet powerup.
    if (this.autoBulletPowerupActive && !this.megaAutoBulletPowerupActive) {
      this.megaAutoBulletPowerupKillCount++;
      if (this.megaAutoBulletPowerupKillCount >= 15) {  // Trigger mega powerup after 15 extra kills.
        this.activateMegaAutoBulletPowerup();
        this.megaAutoBulletPowerupKillCount = 0;
      }
    }
  
    // When the mega powerup is active, track kills for the ultra auto bullet powerup.
    if (this.megaAutoBulletPowerupActive && !this.ultraAutoBulletPowerupActive) {
      this.ultraAutoBulletPowerupKillCount++;
      if (this.ultraAutoBulletPowerupKillCount >= 10) {  // Trigger ultra powerup after 10 extra kills.
        this.activateUltraAutoBulletPowerup();
        this.ultraAutoBulletPowerupKillCount = 0;
      }
    }
  
    // When the ultra powerup is active, count extra kills for BULLET HELL.
    if (this.ultraAutoBulletPowerupActive && !this.bulletHellActive) {
      this.bulletHellKillCount++;
      if (this.bulletHellKillCount >= 10) {  // Trigger BULLET HELL after 10 extra kills.
        this.activateBulletHell();
        this.bulletHellKillCount = 0;
      }
    }


    const dropChance = 0.2; // 20% chance to drop a heart
    if (Math.random() < dropChance) {
      //console.log("💖 Spawning heart at", enemy.mesh.position);
      const heart = new HeartPickup(enemy.mesh.position.clone(), this.player);
      this.pickups.push(heart);
      this.scene.add(heart.mesh);
    }
  }

  activateBulletHell() {
    this.bulletHellActive = true;
    this.bulletHellTimer = this.bulletHellDuration;
    console.log("BULLET HELL Activated!");
    this.ui.showFloatingMessage(
      "🔥 BULLET HELL! 🔥",
      this.player.mesh.position.clone(),
      { fontSize: 'px', color: 'red', duration: 3 }
    );
  }

  activateUltraAutoBulletPowerup() {
    this.ultraAutoBulletPowerupActive = true;
    this.ultraAutoBulletPowerupTimer = this.ultraAutoBulletPowerupDuration;
    console.log("Ultra Auto Bullet Powerup Activated!");
    this.ui.showFloatingMessage("⚡ Ultra Auto Bullet Powerup Activated!", this.player.mesh.position.clone());
  }  

  activateMegaAutoBulletPowerup() {
    this.megaAutoBulletPowerupActive = true;
    this.megaAutoBulletPowerupTimer = this.megaAutoBulletPowerupDuration;
    console.log("Mega Auto Bullet Powerup Activated!");
    // Display a message on the screen.
    this.ui.showFloatingMessage("⚡ Mega Auto Bullet Powerup Activated!", this.player.mesh.position.clone());
  }
  
  activateAutoBulletPowerup() {
    this.autoBulletPowerupActive = true;
    this.autoBulletPowerupTimer = this.autoBulletPowerupDuration;
    console.log("Auto Bullet Powerup Activated!");
    // Display a message on screen.
    this.ui.showFloatingMessage("⚡ Auto Bullet Powerup Activated!", this.player.mesh.position.clone());
    // Reset the auto bullet cooldown so that the burst fires immediately.
    this.autoBulletCooldownTimer = 0;
  }

  activateKnifeSpeedPowerupThree() {
    this.knifeSpeedPowerupActive = true;
    this.knifeSpeedPowerupTimer = this.knifeSpeedPowerupDuration;
    console.log("Knife Speed Powerup Activated!");
    // Display a message on screen.
    this.ui.showFloatingMessage("⚡ Knife Speed Powerup Activated!", this.player.mesh.position.clone());
  }
  
  
  activateAttackVelocityBuff() {
    this.attackVelocityBuffActive = true;
    this.attackVelocityBuffTimer = this.attackVelocityBuffDuration;
    console.log("Attack velocity buff activated!");
    // Display a message on the screen.
    this.ui.showFloatingMessage("⚡ Knife Buff!", this.player.mesh.position.clone());
  }  

  onWindowResize() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const viewSize = 100; // Same value as before
    this.camera.left = -viewSize * aspect / 2;
    this.camera.right = viewSize * aspect / 2;
    this.camera.top = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  onMouseClick(event) {
    // Calculate normalized device coordinates (NDC)
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Set up a raycaster from the camera through the mouse position.
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Intersect with a horizontal plane at y = 0.
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (intersectionPoint) {
      const direction = intersectionPoint.sub(this.player.mesh.position).normalize();
      const bullet = new Bullet(this.player.mesh.position.clone(), direction);
      // Add the player's current velocity to the bullet.
      bullet.velocity.add(this.player.velocity);
      // Apply buff: increase bullet speed if the buff is active.
      if (this.attackVelocityBuffActive) {
        bullet.velocity.multiplyScalar(this.attackVelocityBuffMultiplier);
      }
      this.bullets.push(bullet);
      this.scene.add(bullet.mesh);
    }
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    // Determine the base knife attack multiplier from the first powerup.
    const baseKnifeSpeedMultiplier = this.attackVelocityBuffActive ? this.attackVelocityBuffMultiplier : 1;
    // If the third powerup is active, further multiply it.
    const finalKnifeAttackSpeedMultiplier = baseKnifeSpeedMultiplier * (this.knifeSpeedPowerupActive ? this.knifeSpeedPowerupMultiplier : 1);
    
    // Pass the final multiplier to the player update.
    this.player.update(delta, this.input, this.cameraAngle, finalKnifeAttackSpeedMultiplier);
    
    // Update the enemy spawner.
    this.enemySpawner.update(delta);

    // Update each enemy and check for enemy attacks
    for (let enemy of this.enemySpawner.enemies) {
      enemy.update(delta, this.camera);

      if (enemy.isAttacking && enemy.attackAction) {
        // Check if the attack animation has looped:
        // If the current attack action time is less than the last recorded time,
        // it means a new cycle has started.
        if (enemy.attackAction.time < enemy.lastAttackCycleTime) {
          enemy.hasDamaged = false;
        }
        enemy.lastAttackCycleTime = enemy.attackAction.time;
    
        // Define the coverage area for the enemy's attack.
        const attackRange = 5; // Adjust this value as needed.
        const distance = enemy.mesh.position.distanceTo(this.player.mesh.position);
    
        // If the player is within the attack range and damage hasn't been applied for this cycle:
        if (distance < attackRange && !enemy.hasDamaged) {
          this.player.takeDamage(1);
          enemy.hasDamaged = true;
        }
      } else {
        // Reset the damage flag when the enemy is not in attack state.
        enemy.hasDamaged = false;
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(delta);

      // Check collision between this bullet and all enemies.
      for (let j = this.enemySpawner.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemySpawner.enemies[j];
        // Calculate collision based on the sum of radii.
        const collisionDistance = bullet.radius + enemy.radius;
        const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
        if (distance < collisionDistance) {
          // Assume each bullet deals 1 damage.
          const enemyDead = enemy.takeDamage(1);
          if (enemyDead) {
            // Remove enemy from scene if health reaches 0.
            this.enemySpawner.removeEnemy(enemy);
            // Record the kill.
            this.registerEnemyKill(enemy);
          }
          // Remove the bullet after it hits.
          this.scene.remove(bullet.mesh);
          this.bullets.splice(i, 1);
          break;
        }
      }

      // Remove bullets that travel too far.
      if (bullet.mesh.position.distanceTo(this.player.mesh.position) > 100) {
        this.scene.remove(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // --- Auto Bullet Powerup Logic ---
    if (this.bulletHellActive) {
      // Update the bullet hell timer.
      this.bulletHellTimer -= delta;
      
      // Override parameters for BULLET HELL:
      //const bulletHellBulletCount = 64;         // Drastically increased bullet count.
      const bulletHellBulletCount = 256;
      const bulletHellSpeedMultiplier = 10;        // Much faster bullets.
      const bulletHellCooldown = 0.1;             // Very short cooldown between bursts.
      
      // Decrement the cooldown timer.
      this.autoBulletCooldownTimer -= delta;
      if (this.autoBulletCooldownTimer <= 0) {
        for (let i = 0; i < bulletHellBulletCount; i++) {
          const angle = i * (2 * Math.PI / bulletHellBulletCount);
          const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const bullet = new Bullet(this.player.mesh.position.clone(), direction);
          // Inherit the player's velocity.
          bullet.velocity.add(this.player.velocity);
          // Multiply the bullet speed.
          bullet.velocity.multiplyScalar(bulletHellSpeedMultiplier);
          // Enhance bullet appearance and damage:
          bullet.mesh.scale.set(2.5, 2.5, 2.5); // Bigger bullet.
          bullet.damage = 5;                   // Higher damage.
          this.bullets.push(bullet);
          this.scene.add(bullet.mesh);
        }
        // Reset the cooldown timer for BULLET HELL bursts.
        this.autoBulletCooldownTimer = bulletHellCooldown;
      }
      
      if (this.bulletHellTimer <= 0) {
        this.bulletHellActive = false;
        console.log("BULLET HELL expired.");
      }
    } else if (this.ultraAutoBulletPowerupActive) {
      // --- Ultra Auto Bullet Powerup Logic (if not in bullet hell) ---
      this.ultraAutoBulletPowerupTimer -= delta;
      const ultraBulletCount = 32;
      const ultraBulletSpeedMultiplier = 3;
      const ultraBulletCooldown = 0.2;
      
      this.autoBulletCooldownTimer -= delta;
      if (this.autoBulletCooldownTimer <= 0) {
        for (let i = 0; i < ultraBulletCount; i++) {
          const angle = i * (2 * Math.PI / ultraBulletCount);
          const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const bullet = new Bullet(this.player.mesh.position.clone(), direction);
          bullet.velocity.add(this.player.velocity);
          bullet.velocity.multiplyScalar(ultraBulletSpeedMultiplier);
          bullet.mesh.scale.set(2, 2, 2);
          bullet.damage = 3;
          this.bullets.push(bullet);
          this.scene.add(bullet.mesh);
        }
        this.autoBulletCooldownTimer = ultraBulletCooldown;
      }
      if (this.ultraAutoBulletPowerupTimer <= 0) {
        this.ultraAutoBulletPowerupActive = false;
        console.log("Ultra Auto Bullet Powerup expired.");
      }
    } else if (this.megaAutoBulletPowerupActive) {
      // --- Mega Auto Bullet Powerup Logic ---
      this.megaAutoBulletPowerupTimer -= delta;
      const megaBulletCount = 16;
      const megaBulletSpeedMultiplier = 2;
      const megaBulletCooldown = 0.3;
      
      this.autoBulletCooldownTimer -= delta;
      if (this.autoBulletCooldownTimer <= 0) {
        for (let i = 0; i < megaBulletCount; i++) {
          const angle = i * (2 * Math.PI / megaBulletCount);
          const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const bullet = new Bullet(this.player.mesh.position.clone(), direction);
          bullet.velocity.add(this.player.velocity);
          bullet.velocity.multiplyScalar(megaBulletSpeedMultiplier);
          this.bullets.push(bullet);
          this.scene.add(bullet.mesh);
        }
        this.autoBulletCooldownTimer = megaBulletCooldown;
      }
      if (this.megaAutoBulletPowerupTimer <= 0) {
        this.megaAutoBulletPowerupActive = false;
        console.log("Mega Auto Bullet Powerup expired.");
      }
    } else if (this.autoBulletPowerupActive) {
      // --- Normal Auto Bullet Powerup Logic ---
      this.autoBulletPowerupTimer -= delta;
      this.autoBulletCooldownTimer -= delta;
      if (this.autoBulletCooldownTimer <= 0) {
        const bulletCount = 8;
        for (let i = 0; i < bulletCount; i++) {
          const angle = i * (2 * Math.PI / bulletCount);
          const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const bullet = new Bullet(this.player.mesh.position.clone(), direction);
          bullet.velocity.add(this.player.velocity);
          this.bullets.push(bullet);
          this.scene.add(bullet.mesh);
        }
        this.autoBulletCooldownTimer = this.autoBulletCooldown;
      }
      if (this.autoBulletPowerupTimer <= 0) {
        this.autoBulletPowerupActive = false;
        console.log("Auto Bullet Powerup expired.");
      }
    }

    // --- Update pickups (e.g. health hearts) ---
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const heart = this.pickups[i];
      const collected = heart.update(delta);
      if (collected) {
        this.scene.remove(heart.mesh);
        this.pickups.splice(i, 1);
        this.ui.showFloatingMessage("+20 HP 💖", this.player.mesh.position.clone());
      }      
    }


    // --- First Powerup Timer Update ---
    if (this.attackVelocityBuffActive) {
      this.attackVelocityBuffTimer -= delta;
      if (this.attackVelocityBuffTimer <= 0) {
        this.attackVelocityBuffActive = false;
        console.log("Attack velocity buff expired.");
        // Optionally, reset kill timestamps and autoBulletKillCount.
        this.killTimestamps = [];
        this.autoBulletKillCount = 0;
      }
    }

    // Update the UI with current health and score.
    this.ui.update(this.player.health, this.enemySpawner.score, this.enemySpawner.currentWave);
    this.ui.updateStaminaBar((this.player.stamina / this.player.maxStamina) * 100);


    // Update camera based on input 
    const rotationSpeed = 1.0; // Radians per second

    if (this.input['KeyQ']) {
      // Rotate camera to the left.
      this.cameraAngle -= delta * rotationSpeed;
    }
    if (this.input['KeyE']) {
      // Rotate camera to the right.
      this.cameraAngle += delta * rotationSpeed;
    }
    if (this.input['KeyC']) {
      // Reset the camera to its original angle.
      this.cameraAngle = this.initialCameraAngle;
    }

    // Position the camera based on follow mode.
    if (this.cameraFollow && this.player.mesh) {
      // Follow mode: camera's position is offset from the player's position.
      this.camera.position.set(
        this.player.mesh.position.x + this.cameraDistance * Math.cos(this.cameraAngle),
        this.player.mesh.position.y + this.cameraHeight,
        this.player.mesh.position.z + this.cameraDistance * Math.sin(this.cameraAngle)
      );
      this.camera.lookAt(this.player.mesh.position);
    } else {
      // Fixed mode: camera stays relative to the origin.
      this.camera.position.set(
        this.cameraDistance * Math.cos(this.cameraAngle),
        this.cameraHeight,
        this.cameraDistance * Math.sin(this.cameraAngle)
      );
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    if (this.attackVelocityBuffActive) {
      this.attackVelocityBuffTimer -= delta;
      if (this.attackVelocityBuffTimer <= 0) {
        this.attackVelocityBuffActive = false;
        console.log("Attack velocity buff expired.");
        // Optionally clear kill timestamps or reset them.
        this.killTimestamps = [];
      }
    }
      
    // Update the third powerup timer.
    if (this.knifeSpeedPowerupActive) {
      this.knifeSpeedPowerupTimer -= delta;
      if (this.knifeSpeedPowerupTimer <= 0) {
        this.knifeSpeedPowerupActive = false;
        console.log("Knife Speed Powerup expired.");
      }
    }

    let powerupPercentage = 0;
    let powerupLabel = "";

    // Check for active powerups in order of priority.
    if (this.bulletHellActive) {
      powerupPercentage = (this.bulletHellTimer / this.bulletHellDuration) * 100;
      powerupLabel = "BULLET HELL"
    } else if (this.ultraAutoBulletPowerupActive) {
      powerupPercentage = (this.ultraAutoBulletPowerupTimer / this.ultraAutoBulletPowerupDuration) * 100;
      powerupLabel = "Ultra Auto Bullet";
    } else if (this.megaAutoBulletPowerupActive) {
      powerupPercentage = (this.megaAutoBulletPowerupTimer / this.megaAutoBulletPowerupDuration) * 100;
      powerupLabel = "Mega Auto Bullet";
    } else if (this.autoBulletPowerupActive) {
      powerupPercentage = (this.autoBulletPowerupTimer / this.autoBulletPowerupDuration) * 100;
      powerupLabel = "Auto Bullet";
    } else if (this.knifeSpeedPowerupActive) {
      powerupPercentage = (this.knifeSpeedPowerupTimer / this.knifeSpeedPowerupDuration) * 100;
      powerupLabel = "Knife Speed";
    } else if (this.attackVelocityBuffActive) {
      powerupPercentage = (this.attackVelocityBuffTimer / this.attackVelocityBuffDuration) * 100;
      powerupLabel = "Knife Buff";
    } else {
      powerupPercentage = 0;
      powerupLabel = "";
    }

    this.ui.updatePowerupBar(powerupPercentage, powerupLabel);


    // Render the scene.
    this.renderer.render(this.scene, this.camera);
  }
}
