import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { Player } from './Player.js';
import { EnemySpawner } from './EnemySpawner.js';
import { UI } from './UI.js';
import { Bullet } from './Bullet.js';
import { HeartPickup } from './HeartPickup.js';
import { Minimap } from './Minimap.js';
import { Turret } from './Turret.js';


export class Game {
    
  /**
   * Spawn one instance of a dungeon module.
   * @param {string} baseName  – the key in this.dungeonParts
   * @param {THREE.Vector3} pos
   * @param {number} ry        – yaw in radians  (optional)
   * @param {number} s         – uniform scale   (optional)
   * @returns {THREE.Object3D} – the new instance (so you can tweak it)
   */
  spawnDungeonPart(baseName, pos, ry = 0, s = 1) {

    const prefab = this.dungeonParts?.[baseName];
    if (!prefab) {
      console.warn(`Dungeon part "${baseName}" not found`);
      return null;
    }

    const inst = prefab.clone(true);        // deep clone, share geo+mat
    inst.position.copy(pos);
    inst.rotation.y = ry;
    inst.scale.setScalar(s);

    this.scene.add(inst);
    return inst;
  }

  constructor(container) {

    this.draggingTurret   = null;   // { img, ghost } when user is dragging
    this.turretPrefab     = null;   // loaded once, then cloned for the ghost

    this.container = container;

    // Create the scene and set a background color.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202020);

    /* ---------- PBR cobblestone ground ---------- */
    const texLoader = new THREE.TextureLoader();

    const gColor  = texLoader.load('assets/ground/pbr/ground_albedo.jpg');
    const gNormal = texLoader.load('assets/ground/pbr/ground_normal.png');
    const gRough  = texLoader.load('assets/ground/pbr/ground_rough.jpg');
    const gAO     = texLoader.load('assets/ground/pbr/ground_ao.png');

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

    /* ───── Load “modular_dungeon” glTF ─────────────────────────── */
    const loader = new GLTFLoader().setPath('assets/dungeon/modular_dungeon/');   // base path

    loader.load(
      'scene.gltf', 
      (gltf) => {
        this.dungeonRoot = gltf.scene; // keep a reference

        this.dungeonParts = {}

        this.dungeonRoot.traverse((o) => {
          if (!o.isMesh) return;
          // const base = o.name.replace(/[.\d_]+$/, '');

          // if (!this.dungeonParts[base]) {
            // this.dungeonParts[base] = o;
          this.dungeonParts[o.name.toLowerCase()] ??= o;   // keep original name
          // }

          /* optional tidy-ups that apply to *every* copy */
          o.castShadow = o.receiveShadow = true;
          o.material.toneMapped = false;        // emissive torch flames etc.
          o.material.side = THREE.FrontSide;    // cull hidden faces
        });

        /* Put the original kit outside the playable area so you don’t see it.
        (z = -999 is cheaper than deleting the hierarchy) */
        this.dungeonRoot.position.set(0, -999, 0);
        this.scene.add(this.dungeonRoot);

        console.log('Dungeon parts ready →', Object.keys(this.dungeonParts));   // peek in DevTools
        
        /* ---------- build an initial room ---------- */
        const tile = 6;     // each prefab wall is ~6 m wide
        const h    = 0;     // ground height (y)
    
        // Outer walls: 3×3 square
        for (let i = -1; i <= 1; i++) {
          // north & south
          this.spawnDungeonPart('object_4', new THREE.Vector3(i*tile, h, -2*tile));
          this.spawnDungeonPart('object_5', new THREE.Vector3(i*tile, h,  2*tile), Math.PI, 10);
          // west & east
          this.spawnDungeonPart('object_6', new THREE.Vector3(-2*tile, h, i*tile),  Math.PI/2);
          this.spawnDungeonPart('object_7', new THREE.Vector3( 2*tile, h, i*tile), -Math.PI/2);
        }
    
        // Door in the south wall
        this.spawnDungeonPart('object_9', new THREE.Vector3(0, h, 2*tile+0.01), Math.PI);
    
        // Torches in the four corners
        const torchH = 2.5;
        [
          [-2*tile+0.3, torchH, -2*tile+0.3],
          [ 2*tile-0.3, torchH, -2*tile+0.3],
          [-2*tile+0.3, torchH,  2*tile-0.3],
          [ 2*tile-0.3, torchH,  2*tile-0.3],
        ].forEach(([x,y,z]) => {
          const torch = this.spawnDungeonPart('object_11', new THREE.Vector3(x,y,z));
          torch.material.emissive.set(0xffb248);     // warm glow
        });
        /* ---------------------------------------------- */
      },
      undefined,
      (err) => console.error('Failed to load dungeon:', err)
    );

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
    this.camera.position.set(40, 40, 40); 
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

    this.cameraVel = new THREE.Vector3();   // starts at rest
    this.fixedCameraCenter = new THREE.Vector3(); // “orbit-about” point in fixed mode
    

    // Setup renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    //this.renderer.setPixelRatio(window.devicePixelRatio); // Optional but recommended
    container.appendChild(this.renderer.domElement);
    this.renderer.shadowMap.enabled = true; // Enable shadows

    // Clock for delta time.
    this.clock = new THREE.Clock();

    this.pickups = [];

    this.turrets = [];

    this.turretTokens = 1900;          // how many the player can still place
    this.molotovTokens = 1000;        // give player a few to start
    this.molotovs      = [];       // active instances
    this.draggingMolotov = null;   // {img, ghost}

    // Create the player.
    this.player = new Player(this.scene, this.camera);
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
            else {
              // Knock-back impulse when the knife hits
              const knockback = damage * 10;   // impulse magnitude
              enemy.velocity.add(              // Δv = J / m
                toEnemy.clone().multiplyScalar(knockback / enemy.mass)
              );
            }
          }
        }
      });
    };
    
    // Enemy spawner to handle enemy creation.
    this.enemySpawner = new EnemySpawner(this.scene, this.player, this);

    // UI overlay for health and score.
    this.ui = new UI();
    this.ui.updateTurretCount(this.turretTokens);   // initial 0
    this.ui.updateMolotovCount(this.molotovTokens); // initial 3
    this.ui.camera = this.camera;
    
    this.ui.setAvatar('assets/ui/avatar.png');
    // createPortrait()
    //     .then(png => this.ui.setAvatar(png))
    //     .catch(err => console.error('portrait error', err));

    /* ------ Minimap -------------------------------------------------- */
    this.minimap = new Minimap(1000 /* ground size */, 160 /* px */);

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

    this.container.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left click
        if (this.draggintTurret || this.draggingMolotov) return; // Don't attack while dragging
        this.input['MouseLeft'] = true;
      }
    });
    this.container.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.input['MouseLeft'] = false;
      }
    });

    window.addEventListener('mousemove', e => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Listen for keydown and keyup events.
    window.addEventListener('keydown', (event) => {
      this.input[event.code] = true;

      // Spells: 1 = turret, 2 = molotov (you can expand to 3, 4 later)
      switch (event.code) {
        case 'Digit1':
          this.ui.onStartTurretDrag?.();
          this.simulatePointerMoveAtMouse(); // trigger ghost placement
          break;
        case 'Digit2':
          this.ui.onStartMolotovDrag?.();
          this.simulatePointerMoveAtMouse();
          break;
        case 'Digit3':
          // Placeholder for spell 3
          break;
        case 'Digit4':
          // Placeholder for spell 4
          break;
      }
    });
    window.addEventListener('keyup', (event) => {
      this.input[event.code] = false;
    });


    /* ---------- DRAG-TO-PLACE TURRET ---------------------------------- */
    this.ui.onStartTurretDrag = () => {
      if (this.turretTokens <= 0) {
        return;
      }
      /* 1. create the little icon that follows the cursor (UI only) */
      const img = this.ui.turretBtn.cloneNode();
      img.style.cssText = `
        position:absolute; width:48px; height:48px; opacity:.7;
        pointer-events:none; transform:translate(-24px,-24px);`;
      document.body.appendChild(img);

      /* 2. create / clone a translucent green “ghost” in 3-D */
      let ghost;
      if (this.turretPrefab) {
        ghost = this.turretPrefab.clone(true);
        ghost.traverse(o => {
          if (o.isMesh) {
            o.material = o.material.clone();
            o.material.color.set(0x00ff00);
            o.material.opacity = 0.5;
            o.material.transparent = true;
            o.material.depthWrite = false;
          }
        });
      } else {
        /* fallback: simple cylinder if the model hasn’t loaded yet */
        ghost = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.5, 2, 24),
          new THREE.MeshBasicMaterial({ color:0x00ff00, opacity:0.5, transparent:true })
        );
      }
      this.scene.add(ghost);

      this.draggingTurret = { img, ghost };
    };

    window.addEventListener('pointermove', e => {
      if (!this.draggingTurret) return;

      /* move UI icon */
      this.draggingTurret.img.style.left = `${e.clientX}px`;
      this.draggingTurret.img.style.top  = `${e.clientY}px`;

      /* move 3-D ghost */
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc  = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width ) * 2 - 1,
        ((e.clientY - rect.top )  / rect.height) * -2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);

      const ground = new THREE.Plane(new THREE.Vector3(0,1,0), 0);      // y = 0
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(ground, hit)) {
        /* optional grid-snap */
        const grid = 2;  // size of your tiles
        hit.set(
          Math.round(hit.x / grid) * grid,
          0,
          Math.round(hit.z / grid) * grid
        );
        this.draggingTurret.ghost.position.copy(hit);
      }
    });

    window.addEventListener('pointerup', e => {
      if (!this.draggingTurret) return;

      /* if the ghost is sitting on the ground, place a real turret there */
      const pos = this.draggingTurret.ghost.position;
      // if (!isNaN(pos.x) && this.turretTokens > 0) {   // have a valid hit *and* a token
      const turretCost = 50;
      if (!isNaN(pos.x) && this.player.spendMana(turretCost)) {
        const turret = new Turret(
          pos.clone(),
          this.scene,
          this.enemySpawner,
          this.bullets
        );
        this.turrets.push(turret);

        this.addTurretToken(-1);              // 🔻 spend one token & refresh badge
      }

      /* clean up */
      this.scene.remove(this.draggingTurret.ghost);
      document.body.removeChild(this.draggingTurret.img);
      this.draggingTurret = null;
    });
    /* --------------------------------------------------------------- */


    /* ---------- DRAG-TO-PLACE MOLOTOV -------------------------------- */
    this.ui.onStartMolotovDrag = () => {
      if (this.molotovTokens <= 0) return;

      /* tiny cursor ghost – reuse turret icon style */
      const img = this.ui.molotovBtn.cloneNode();
      img.style.cssText = `
          position:absolute;width:48px;height:48px;opacity:.8;
          pointer-events:none;transform:translate(-24px,-24px);`;
      document.body.appendChild(img);

      /* 3-D ghost: just a red circle */
      const ghost = new THREE.Mesh(
          new THREE.CircleGeometry(4,32),
          new THREE.MeshBasicMaterial({color:0xff3300,opacity:0.4,
                                      transparent:true,depthWrite:false}));
      ghost.rotation.x = -Math.PI/2;
      this.scene.add(ghost);

      this.draggingMolotov = {img,ghost};
    };

    /* pointermove identical to turret logic but writing into draggingMolotov */
    window.addEventListener('pointermove',e=>{
      if(!this.draggingMolotov) return;
      const {img,ghost}=this.draggingMolotov;
      img.style.left=`${e.clientX}px`; img.style.top=`${e.clientY}px`;

      const rect=this.renderer.domElement.getBoundingClientRect();
      const ndc=new THREE.Vector2(
            ((e.clientX-rect.left)/rect.width)*2-1,
            ((e.clientY-rect.top )/rect.height)*-2+1);
      const ray=new THREE.Raycaster(); ray.setFromCamera(ndc,this.camera);
      const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
      const hit=new THREE.Vector3();
      if(ray.ray.intersectPlane(ground,hit)){
          const grid=2;
          hit.set(Math.round(hit.x/grid)*grid,0,
                  Math.round(hit.z/grid)*grid);
          ghost.position.copy(hit);
      }
    });

    window.addEventListener('pointerup', async e => {

      /* no drag in progress? */
      if (!this.draggingMolotov) return;

      /* unpack & remember where the ghost ended up ------------------ */
      const { img, ghost } = this.draggingMolotov;
      const dropPos = ghost.position.clone();   // store before we delete it!

      /* --- 1.  IMMEDIATE CLEAN-UP ---------------------------------- */
      this.scene.remove(ghost);                 // stop rendering
      ghost.geometry.dispose();                 // free GPU memory
      ghost.material.dispose();
      document.body.removeChild(img);           // remove cursor icon
      this.draggingMolotov = null;              // reset state

      // /* --- 2.  If we still have a token, spawn a Molotov ------------ */
      // if (this.molotovTokens > 0 && !isNaN(dropPos.x)) {
      const molotovCost = 50;
      if (!isNaN(dropPos.x) && this.player.spendMana(molotovCost)) {
        const { Molotov } = await import('./Molotov.js');
        const m = new Molotov(dropPos, this.scene, this.camera, this);
        this.molotovs.push(m);
        this.addMolotovToken(-1);
      }
    });
    /* ----------------------------------------------------------------- */



    this.ui.onToggleCameraFollow = () => {
      this.cameraFollow = !this.cameraFollow;
    
      if (!this.cameraFollow) {
        /* turning FOLLOW → FIXED
           remember the spot where we’ll keep looking,
           and stop the spring motion */
        this.fixedCameraCenter.copy(this.player.mesh.position);
        this.cameraVel.set(0, 0, 0);
      }
    
      this.ui.showFloatingMessage(
        "Camera " + (this.cameraFollow ? "Following" : "Fixed"),
        this.player.mesh.position.clone()
      );
    };
  }

  simulatePointerMoveAtMouse() {
    const evt = new PointerEvent('pointermove', {
      clientX: this.lastMouseX ?? window.innerWidth / 2,
      clientY: this.lastMouseY ?? window.innerHeight / 2
    });
    window.dispatchEvent(evt);
  }

  // Game.js – just under the constructor
  addTurretToken(count = 1, worldPos = null) {
    this.turretTokens += count;
    this.ui.updateTurretCount(this.turretTokens);

    const pos = worldPos ?? this.player.mesh.position.clone();
    this.ui.showFloatingMessage(`🛡️ +${count} Turret`, pos);
  }

  addMolotovToken(count=1, worldPos=null){
    this.molotovTokens += count;
    this.ui.updateMolotovCount(this.molotovTokens);
    const pos = worldPos ?? this.player.mesh.position.clone();
    this.ui.showFloatingMessage(`🔥 +${count} Molotov`, pos);
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
    const turretChance = 0.05 // 5% chance to drop a turret token
    if (Math.random() < dropChance) {
      //console.log("💖 Spawning heart at", enemy.mesh.position);
      const heart = new HeartPickup(enemy.mesh.position.clone(), this.player);
      this.pickups.push(heart);
      this.scene.add(heart.mesh);

      if (Math.random() < turretChance) {
        this.addTurretToken(1, enemy.mesh.position);
      }
    }

      /* give the player XP */
    const xpGained      = enemy.xpValue ?? 1;           // or whatever you like
    const didLevelUp    = this.player.addXP(xpGained);

    /* push the info to the HUD every kill */
    this.ui.updateLevelRing(
        this.player.level,
        this.player.xpPct
    );

    if (didLevelUp) {
      this.ui.showFloatingMessage(`LEVEL ${this.player.level}! 🆙`,
                                  this.player.mesh.position.clone());
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
    if (this.draggingTurret || this.draggingMolotov) return; // Don't shoot while dragging
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
      const bullet = new Bullet(this.player.mesh.position.clone(), direction, this.scene);
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

    /* ─── wait until the player mesh has been loaded ─── */
    if (!this.player.mesh) {          // still null? → skip logic this frame
      return;
    }

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
          // kinetic energy E = ½ m v²  (use v² = |v|² to avoid a sqrt) for bullet damage calculation
          const energy  = 0.5 * bullet.mass * bullet.velocity.lengthSq();
          const baseDmg = energy * 0.08;           // 0.08 ⇒ ≈1 damage at 25 m/s & 0.05 kg
          const dmg     = bullet.damage ?? baseDmg; // if power-ups set bullet.damage, use that
          const enemyDead = enemy.takeDamage(dmg);
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
          const bullet = new Bullet(this.player.mesh.position.clone(), direction, this.scene);
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
          const bullet = new Bullet(this.player.mesh.position.clone(), direction, this.scene);
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
          const bullet = new Bullet(this.player.mesh.position.clone(), direction, this.scene);
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
          const bullet = new Bullet(this.player.mesh.position.clone(), direction, this.scene);
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
        heart.destroy(this.scene);
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

   // Update the UI with health, score, wave *and* remaining turrets.
    this.ui.update(this.player.health,
                   this.enemySpawner.score,
                   this.enemySpawner.currentWave,
                   this.turretTokens);
    // this.ui.updateStaminaBar((this.player.stamina / this.player.maxStamina) * 100);

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
      // 1. reset desired angle
      this.cameraAngle = this.initialCameraAngle;
    
      // 2. kill any residual spring velocity
      this.cameraVel.set(0, 0, 0);
    
      // 3. (optional but nice) snap to the new target immediately
      const snapTarget = this.player.mesh.position.clone().add(
        new THREE.Vector3(
          this.cameraDistance * Math.cos(this.cameraAngle),
          this.cameraHeight,
          this.cameraDistance * Math.sin(this.cameraAngle)
        )
      );
      this.camera.position.copy(snapTarget);
      this.camera.lookAt(this.player.mesh.position);
    
      // 4. consume the keystroke so it runs only once
      this.input['KeyC'] = false;
    }
    

    // Position the camera based on follow mode.
    if (this.cameraFollow && this.player.mesh) {
      // // Follow mode: camera's position is offset from the player's position.
      // this.camera.position.set(
      //   this.player.mesh.position.x + this.cameraDistance * Math.cos(this.cameraAngle),
      //   this.player.mesh.position.y + this.cameraHeight,
      //   this.player.mesh.position.z + this.cameraDistance * Math.sin(this.cameraAngle)
      // );
      // this.camera.lookAt(this.player.mesh.position);

      /*------------------------------------------------------------
        Spring-damper camera smoothing
        x  = camera.position          (current state)
        xₜ = target                   (where we’d like the camera to be)
        v  = this.cameraVel           (velocity we integrate each frame)
    
        a = –k(x‒xₜ) – c v            (Hooke’s law + damping)
        v += a Δt
        x += v Δt
      ------------------------------------------------------------*/
    
      // 1) where should the camera eventually sit?
      const target = this.player.mesh.position.clone().add(
        new THREE.Vector3(
          this.cameraDistance * Math.cos(this.cameraAngle),
          this.cameraHeight,
          this.cameraDistance * Math.sin(this.cameraAngle)
        )
      );
    
      // 2) spring parameters (tweak to taste)
      const k = 12;    // stiffness  (how aggressively it pulls)
      const c = 8;     // damping    (how much it resists oscillation)
    
      // 3) acceleration = spring + damping
      const camAcc = target.clone().sub(this.camera.position).multiplyScalar(k)
                      .add(this.cameraVel.clone().multiplyScalar(-c));
    
      // 4) semi-implicit Euler integrate
      this.cameraVel.addScaledVector(camAcc, delta);       // v ← v + aΔt
      this.camera.position.addScaledVector(this.cameraVel, delta); // x ← x + vΔt
    
      // 5) always look at the player
      this.camera.lookAt(this.player.mesh.position);
    } else {
        // Fixed mode: orbit around the saved centre
        this.camera.position.set(
          this.fixedCameraCenter.x + this.cameraDistance * Math.cos(this.cameraAngle),
          this.fixedCameraCenter.y + this.cameraHeight,
          this.fixedCameraCenter.z + this.cameraDistance * Math.sin(this.cameraAngle)
        );
     this.camera.lookAt(this.fixedCameraCenter);
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

    // this.ui.updatePowerupBar(powerupPercentage, powerupLabel);
    

    // update turrets
    for (const t of this.turrets) t.update(delta);

    /* update Molotovs */
    for(let i=this.molotovs.length-1;i>=0;i--){
      const m=this.molotovs[i];
      m.enemies = this.enemySpawner.enemies;   // give live list each frame
      const dead = m.update(delta);
      if(dead){
        this.molotovs.splice(i,1);
      }
    }

    this.player.regenMana(delta);
    this.ui.updateManaBar((this.player.mana / this.player.maxMana) * 100);

    const headPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 15, 0));
    this.ui.updatePlayerBars(
      headPos,
      this.player.health,
      (this.player.mana / this.player.maxMana) * 100
    );

    this.ui.updateCenterHUD(
        this.player.health,
        (this.player.mana / this.player.maxMana) * 100,
        null                                               // ⇢ pass a URL if
    );                                                     //    you switch spells

    this.minimap.update(
      this.player,
      this.enemySpawner.enemies,
      this.pickups,
      this.cameraAngle
    );

    this.ui.updateLevelRing(this.player.level, this.player.xpPct);

    // Render the scene.
    this.renderer.render(this.scene, this.camera);
  }
}
