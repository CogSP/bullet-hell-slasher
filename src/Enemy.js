import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

export class Enemy {
  constructor(player, mass = 1) {
    this.mass = mass
    this.player = player;
    this.maxHealth = 3;
    this.health = 3;
    this.speed = 15;
    this.mass = 1;                   // tweak later
    this.velocity  = new THREE.Vector3(); // will hold knock-back & sliding
    this.radius = 1;
    this.isAttacking = false; // flag to track attack state
    this.hasDamaged = false;  // flag to track if damage was applied in current cycle
    this.lastAttackCycleTime = 0; // store last attack animation time for detecting a new loop

    // Load a GLTF zombie model.
    this.mesh = new THREE.Group(); // Temporary placeholder until the model is loaded.
    this.mixer = null; // Will hold the AnimationMixer
    this.walkAction = null;
    this.attackAction = null;
    
    const loader = new GLTFLoader();
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
    

    // Set an initial spawn position (adjust as needed).
    const spawnDistance = 40;
    const angle = Math.random() * Math.PI * 2;
    this.mesh.position.set(
      Math.cos(angle) * spawnDistance,
      0, // Adjust Y based on your model.
      Math.sin(angle) * spawnDistance
    );

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

  update(delta, camera) {
    
    // before position update
    this.velocity.lerp(new THREE.Vector3(), delta * 0.1);   // cheap air-drag
    this.mesh.position.addScaledVector(this.velocity, delta);

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
    
    if (!this.isAttacking) {
      // accelerate toward the player
      const dir = this.player.mesh.position.clone().sub(this.mesh.position).normalize().multiplyScalar(this.speed);
      this.velocity.addScaledVector(dir, delta);
    }

    /* simple air-drag so they eventually stop */
    this.velocity.multiplyScalar(Math.exp(-4 * delta)); // 4 ≈ damping factor

    // move by whatever velocity they currently have
    this.mesh.position.addScaledVector(this.velocity, delta);
    
    
    // Ensure the enemy faces the player.
    this.mesh.lookAt(this.player.mesh.position);
    
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
    
    // Update the animation mixer.
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}
