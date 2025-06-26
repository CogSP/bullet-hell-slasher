import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { loadingMgr } from './LoadingMgr.js';

export class Enemy {
  constructor(scene, player, staticColliders, pathfinder, mass = 1) {
    this.mass = mass
    this.player = player;
    this.scene = scene;
    this.staticColliders = staticColliders;
    this.pathfinder = pathfinder;
    this.path       = [];   // world-space way-points
    this.nextWP     = 0;    // index in the path
    this.maxHealth = 3;
    this.health = 30;
    this.speed = 30;
    this.mass = 1;                   // tweak later
    this.velocity  = new THREE.Vector3(); // will hold knock-back & sliding
    this.radius = 0.2;
    this.isAttacking = false; // flag to track attack state
    this.hasDamaged = false;  // flag to track if damage was applied in current cycle
    this.lastAttackCycleTime = 0; // store last attack animation time for detecting a new loop

    // Load a GLTF zombie model.
    this.mesh = new THREE.Group(); // Temporary placeholder until the model is loaded.
    this.mixer = null; // Will hold the AnimationMixer
    this.walkAction = null;
    this.attackAction = null;

    const loader = new GLTFLoader(loadingMgr);
    // https://www.fab.com/listings/733760dc-83ac-483e-a75b-223c8a36be97
    loader.load('assets/zombie_commoner/scene.gltf', (gltf) => {
      gltf.scene.scale.set(0.05, 0.05, 0.05);
      this.mesh.add(gltf.scene);
      
      if (gltf.animations && gltf.animations.length) {
        // Assume we use the first clip.
        const originalClip = gltf.animations[0];
        
        const fps = 30; 
        // Create the walk animation clip from the original animation.
        const walkStartFrame = 25 * fps;
        const walkEndFrame = 27 * fps;
        const walkClip = THREE.AnimationUtils.subclip(originalClip, 'walk', walkStartFrame, walkEndFrame, fps);

        // Create the attack animation clip using the provided time interval [38.80, 40.6] seconds.
        const attackStartFrame = Math.floor(38.80 * fps); // 38.80 sec * 30 = 1164 frames
        const attackEndFrame = Math.floor(40.6 * fps);    // 40.6 sec * 30 = 1218 frames
        const attackClip = THREE.AnimationUtils.subclip(originalClip, 'attack', attackStartFrame, attackEndFrame, fps);
        
        // Create the AnimationMixer and set up both actions.
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        this.walkAction = this.mixer.clipAction(walkClip);
        this.attackAction = this.mixer.clipAction(attackClip);
        
        // Set looping behavior (repeat for continuous animations).
        this.walkAction.setLoop(THREE.LoopRepeat);
        this.attackAction.setLoop(THREE.LoopRepeat);
        
        // Start with the walk animation.
        this.walkAction.play();
      }
    }, undefined, (error) => {
      console.error('Error loading GLTF model:', error);
    });
    

    // Old code: the spawner now decides the position,
    // so we don't set the position here.
    // Set an initial spawn position (adjust as needed).
    // const spawnDistance = 40;
    // const angle = Math.random() * Math.PI * 2;
    // this.mesh.position.set(
    //   Math.cos(angle) * spawnDistance,
    //   0, // Adjust Y based on your model.
    //   Math.sin(angle) * spawnDistance
    // );

    // --- Health Bar Creation ---
    // (Existing health bar code here)
    this.healthBarGroup = new THREE.Group();
    const hbWidth = 2;
    const hbHeight = 0.3;
    const bgGeometry = new THREE.PlaneGeometry(hbWidth, hbHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.healthBarBG = new THREE.Mesh(bgGeometry, bgMaterial);
    const fgGeometry = new THREE.PlaneGeometry(hbWidth, hbHeight);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.healthBarFG = new THREE.Mesh(fgGeometry, fgMaterial);
    this.healthBarFG.position.z = 0.01;
    this.healthBarGroup.add(this.healthBarBG);
    this.healthBarGroup.add(this.healthBarFG);
    this.healthBarGroup.position.set(0, 1.8, 0);
    this.mesh.add(this.healthBarGroup);

    // For gradual health bar animation.
    this.currentHealthFraction = 1;
    this.targetHealthFraction = 1;
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health < 0) this.health = 0;
    this.targetHealthFraction = this.health / this.maxHealth;
    if (this.health <= 0) {
      return true;
    }
    return false;
  }

  pathfinding_logic(delta) {
    
    this.repathTimer = (this.repathTimer ?? 0) - delta;
    const targetPos  = this.player.mesh.position;

    // refresh the path every 1-2 s, or when the target moved a lot
    if (this.repathTimer <= 0 || targetPos.distanceToSquared(this.goal ?? new THREE.Vector3()) > 25) {
      this.path = this.pathfinder.findPath(this.mesh.position, targetPos, this.scene);
      this.nextWP = 0;
      this.goal = targetPos.clone();

      // repath timer based on distance to target
      // the farther the player, the less sensitive the path needs to be to small movements
      const distSq = targetPos.distanceToSquared(this.goal ?? new THREE.Vector3());
      const baseTime = 5.0;
      const distFactor = THREE.MathUtils.clamp(distSq / 100, 0.5, 2.0);
      // random value between 0.8 and 1.2, creating a random "jitter" to
      // avoid all enemies to recalculate at the exact same time
      this.repathTimer = baseTime * distFactor * (0.8 + Math.random() * 0.4);
    }

    // get current waypoint
    if (this.nextWP < this.path.length) {
      const wp = this.path[this.nextWP];

      
      // 2. steer toward it
      const dir = wp.clone().sub(this.mesh.position);
      const dist = dir.length();

      dir.y = 0; // flatten
      // dir.normalize();

      // smooth look at the waypoint
      // using lookAt will cause to have a hard snap-look
      // that looks bad
      this.smooth_look_at(dir.clone().normalize(), dist, delta);

      if (dist < 2.5) { // if we are 0.5 units away from the waypoint let's start moving to the next one
        this.nextWP++;
      } else {
      
        dir.normalize();

        // Euler integration of acceleration
        this.velocity.addScaledVector(dir.multiplyScalar(this.speed), delta);
        
      }
    }
  }

  yawFromDir(dir) {
    return Math.atan2(dir.x, dir.z);
  }

  smooth_look_at(dir, dist, delta) {

    /* Quaternion Slerp */

    const forward = new THREE.Vector3(0, 0, 1); 

    // Compute target quaternion to look along toWP
    const targetQuat = new THREE.Quaternion()
      .setFromUnitVectors(forward, dir);

    // Slerp from current to target, with a turnSpeed factor
    // a turnSpeed of 1 rad/s means a full 180° turn takes 3 seconds: it can feel too
    // sluggish when the player's close, so we branch in two cases:
    const closeThreshold = 10;
    const turnSpeed = dist < closeThreshold ? 4 : 1;
    this.mesh.quaternion.slerp(targetQuat, Math.min(1, delta * turnSpeed));

  }

  updateHealthBar(delta, camera) {
    // Update the health bar.
    const lerpSpeed = 5;
    this.currentHealthFraction = THREE.MathUtils.lerp(
      this.currentHealthFraction,
      this.targetHealthFraction,
      delta * lerpSpeed
    );
    this.healthBarFG.scale.x = this.currentHealthFraction;
    this.healthBarFG.position.x = -(1 - this.currentHealthFraction);
    if (camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  update(delta, camera) {

    if (!this.pathfinder) return;

    // before position update
    // every frame the velocity decays by a small percentage, like air resistance
    this.velocity.lerp(new THREE.Vector3(), delta * 0.1);   // cheap air-drag

    // move by whatever velocity they currently have
    const nextPos = this.mesh.position.clone().addScaledVector(this.velocity, delta);

    // Check the distance to the player to determine if the enemy should attack.
    const distanceToPlayer = this.mesh.position.distanceTo(this.player.mesh.position); 
    const attackThreshold = 5; // Adjust threshold distance as needed

    if (distanceToPlayer < attackThreshold) {
      if (!this.isAttacking && this.walkAction && this.attackAction) {
        this.isAttacking = true;
        this.walkAction.fadeOut(0.2);
        this.attackAction.reset().fadeIn(0.2).play();
      }
    } else {
      if (this.isAttacking && this.walkAction && this.attackAction) {
        this.isAttacking = false;
        this.attackAction.fadeOut(0.2);
        this.walkAction.reset().fadeIn(0.2).play();
      }
    }

    /* simple air-drag so they eventually stop */
    this.velocity.multiplyScalar(Math.exp(-4 * delta)); // 4 ≈ damping factor
    
    // used during collision detection
    const tmpBox = new THREE.Box3();


    let blocked = false;
    for (const box of this.staticColliders) {
      // expand by the zombie’s personal radius so he stops a little early
      tmpBox.copy(box).expandByScalar( this.radius );

      if (tmpBox.containsPoint(nextPos)) {
        blocked = true;
        break;                            // no need to test others
      }
    }

    if (!blocked) {
      // free to move
      this.mesh.position.copy(nextPos);
    } else {
      // super-simple slide: zero the component that points into the obstacle
      // (optional – delete if you just want them to stop)
      this.velocity.set(0, 0, 0);
    }
        
    this.pathfinding_logic(delta);

    this.updateHealthBar(delta, camera);

    // Update the animation mixer.
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}
