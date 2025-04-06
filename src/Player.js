import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { AnimationUtils } from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.health = 100;
    this.speed = 10; // Movement speed.
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.mesh = null; // Loaded model.
    this.mixer = null;
    this.actions = {}; // Animation actions.
    this.activeAction = null;
    // Flag to ensure a single press triggers the full knife attack.
    this.isAttacking = false;
    // Callback to be set by Game for handling knife damage.
    this.onKnifeHit = null;

    const loader = new GLTFLoader();
    loader.load(
      'assets/player/low_poly_soldier/scene.gltf',
      (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.position.set(0, 1.5, 0);
        this.mesh.scale.set(0.07, 0.07, 0.07);
        this.scene.add(this.mesh);

        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.mesh);

          // Look up clips by name.
          const idleClip  = gltf.animations.find(clip => clip.name === 'rig|idle -loop');
          const walkClip  = gltf.animations.find(clip => clip.name === 'rig|walk -loop');
          const runClip   = gltf.animations.find(clip => clip.name === 'rig|run -loop');
          const knifeClip = gltf.animations.find(clip => clip.name === 'rig|knife_action');

          if (idleClip)  this.actions.idle  = this.mixer.clipAction(idleClip);
          if (walkClip)  this.actions.walk  = this.mixer.clipAction(walkClip);
          if (runClip)   this.actions.run   = this.mixer.clipAction(runClip);
          if (knifeClip) {
            const fps = 30; 
            const startFrame = fps; // Skip first 1 second.
            const endFrame = Math.floor(knifeClip.duration * fps);
            const trimmedKnifeClip = AnimationUtils.subclip(knifeClip, 'knife_trimmed', startFrame, endFrame, fps);
          
            this.actions.knife = this.mixer.clipAction(trimmedKnifeClip);
            this.actions.knife.setLoop(THREE.LoopOnce, 1);
            this.actions.knife.clampWhenFinished = true;
          }
          
          // Listen for the finished event to reset the knife flag.
          this.mixer.addEventListener('finished', (event) => {
            if (event.action === this.actions.knife) {
              console.log('Knife attack finished:', event.action.time);
              this.isAttacking = false;
              this.knifeDamageApplied = false; // Reset knife damage flag.
              // Reset the knife attack speed back to normal.
              this.actions.knife.timeScale = 1;
              // Optionally return to idle.
              if (this.actions.idle) {
                this.fadeToAction('idle');
              }
            }
          });          
          
          // Start with idle by default.
          if (this.actions.idle) {
            this.activeAction = this.actions.idle;
            this.activeAction.play();
          }
        } else {
          console.log('No animations found in the model.');
        }
      },
      undefined,
      (error) => {
        console.error('An error occurred loading the model:', error);
      }
    );
  }

  update(delta, input, cameraAngle, knifeAttackSpeedMultiplier) {
    // Update the animation mixer.
    if (this.mixer) {
      this.mixer.update(delta);
    }
    if (!this.mesh) return;
  
    // Handle knife attack: check for key K.
    if (input['KeyK'] && this.actions.knife && !this.isAttacking) {
      this.fadeToAction('knife');
      // Increase the knife attack speed by adjusting the timeScale.
      this.actions.knife.timeScale = knifeAttackSpeedMultiplier;
      this.isAttacking = true;
      input['KeyK'] = false;
      console.log('Knife attack triggered with multiplier:', knifeAttackSpeedMultiplier);
      return;
    }
  
    // Gather input values.
    let forwardInput = 0;
    let rightInput = 0;
    if (input['KeyW']) forwardInput += 1;
    if (input['KeyS']) forwardInput -= 1;
    if (input['KeyD']) rightInput += 1;
    if (input['KeyA']) rightInput -= 1;
  
    // Calculate camera's forward and right vectors (projected onto the XZ plane).
    // Forward points in the direction the camera is looking (toward the scene center).
    const cameraForward = new THREE.Vector3(-Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));
    // Right is perpendicular to forward.
    const cameraRight = new THREE.Vector3(Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
  
    // Combine inputs to get the movement direction.
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(cameraForward, forwardInput);
    moveDir.addScaledVector(cameraRight, rightInput);
  
    // If there's any input, normalize and apply movement.
    if (moveDir.length() > 0) {
      moveDir.normalize();
      this.velocity.copy(moveDir).multiplyScalar(this.speed);
      const movement = moveDir.clone().multiplyScalar(this.speed * delta);
      this.mesh.position.add(movement);
  
      // Rotate the player to face the movement direction.
      const targetPosition = this.mesh.position.clone().add(moveDir);
      targetPosition.y = this.mesh.position.y;
      this.mesh.lookAt(targetPosition);
  
      // Switch animations based on movement.
      if (!this.isAttacking) {
        if (input['ShiftLeft'] && this.actions.run) {
          this.fadeToAction('run');
        } else if (this.actions.walk) {
          this.fadeToAction('walk');
        }
      }
    } else {
      this.velocity.set(0, 0, 0);
      if (!this.isAttacking && this.actions.idle) {
        this.fadeToAction('idle');
      }
    }
    
    // Handle knife damage during the knife attack.
    if (this.activeAction === this.actions.knife) {
      if (!this.knifeDamageApplied) {
        const damage = 1;
        if (this.onKnifeHit) {
          this.onKnifeHit(damage);
        }
        this.knifeDamageApplied = true;
      }
    }

    // Update the graphical buff effect
    if (knifeAttackSpeedMultiplier > 1) {
      this.setBuffEffect(true);
    } else {
      this.setBuffEffect(false);
    }

  }
 
  
  setBuffEffect(enabled) {
    // Traverse through all children of the player's mesh.
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        // If enabling the effect, set an emissive color and intensity.
        if (enabled) {
          child.material.emissive = new THREE.Color(0xffff00); // Yellow glow.
          child.material.emissiveIntensity = 0.5;
        } else {
          // Reset emissive properties.
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }

  // Smooth crossfade between actions.
  fadeToAction(actionName) {
    const newAction = this.actions[actionName];
    if (!newAction || newAction === this.activeAction) return;
    
    const duration = 0.3;
    newAction.reset().play();
    if (this.activeAction) {
      this.activeAction.crossFadeTo(newAction, duration, false);
    }
    this.activeAction = newAction;
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
    console.log(`Healed! Current health: ${this.health}`);
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      console.log('Game Over!');
      // Implement game over logic.
    }
  }
}
