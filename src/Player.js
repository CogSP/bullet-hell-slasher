import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { AnimationUtils } from 'three';
import { getParticles } from './getParticles.js';

export class Player {
  constructor(scene, gameCamera) {
    this.scene = scene;
    this.gameCamera = gameCamera; // Store the camera reference for particle effects.
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
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.staminaRegenRate = 15;     // Stamina per second when not running
    this.staminaDrainRate = 25;     // Stamina per second while running
    this.canRun = true;             // Flag to prevent running when stamina is depleted


    const loader = new GLTFLoader();
    loader.load(
      'assets/player/low_poly_soldier/scene.gltf',
      (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.position.set(0, 1.5, 0);
        this.mesh.scale.set(0.07, 0.07, 0.07);
        this.scene.add(this.mesh);

        this.smokeAnchor = new THREE.Object3D();
        this.smokeAnchor.position.set(0, 1.2, 0);
        this.mesh.add(this.smokeAnchor);

        this.smokeEffect = getParticles({
          camera : this.gameCamera,
          emitter: this.smokeAnchor,
          parent : this.smokeAnchor,
          rate   : 5,
          texture: 'src/img/circle.png',
          mode   : 'aura',
        });
        this.smokeEnabled = false;

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
    if (this.mixer) this.mixer.update(delta);
    if (!this.mesh) return;
  
    // Handle knife attack
    if (input['KeyK'] && this.actions.knife && !this.isAttacking) {
      this.fadeToAction('knife');
      this.actions.knife.timeScale = knifeAttackSpeedMultiplier;
      this.isAttacking = true;
      input['KeyK'] = false;
      console.log('Knife attack triggered with multiplier:', knifeAttackSpeedMultiplier);
      return;
    }
  
    // Gather input
    let forwardInput = 0;
    let rightInput = 0;
    if (input['KeyW']) forwardInput += 1;
    if (input['KeyS']) forwardInput -= 1;
    if (input['KeyD']) rightInput += 1;
    if (input['KeyA']) rightInput -= 1;
  
    const cameraForward = new THREE.Vector3(-Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));
    const cameraRight = new THREE.Vector3(Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(cameraForward, forwardInput);
    moveDir.addScaledVector(cameraRight, rightInput);
  
    const isTryingToRun = input['ShiftLeft'] && this.canRun;
    let currentSpeed = this.speed;
  
    if (moveDir.length() > 0) {
      moveDir.normalize();
  
      if (!this.isAttacking) {
        if (isTryingToRun && this.actions.run) {
          this.fadeToAction('run');
          currentSpeed *= 1.8;
          this.actions.run.timeScale = 1;
  
          // Drain stamina while running
          this.stamina -= this.staminaDrainRate * delta;
          if (this.stamina <= 0) {
            this.stamina = 0;
            this.canRun = false;
          }
        } else if (this.actions.walk) {
          this.fadeToAction('walk');
          this.actions.run.timeScale = 1;
        }
      }
  
      this.velocity.copy(moveDir).multiplyScalar(currentSpeed);
      const movement = moveDir.clone().multiplyScalar(currentSpeed * delta);
      this.mesh.position.add(movement);
  
      const targetPosition = this.mesh.position.clone().add(moveDir);
      targetPosition.y = this.mesh.position.y;
      this.mesh.lookAt(targetPosition);
    } else {
      this.velocity.set(0, 0, 0);
      if (!this.isAttacking && this.actions.idle) {
        this.fadeToAction('idle');
      }
    }
  
    if (!isTryingToRun) {
      this.stamina += this.staminaRegenRate * delta;
      if (this.stamina >= this.maxStamina) {
        this.stamina = this.maxStamina;
        this.canRun = true;
      }
    }
  
    // Knife damage logic
    if (this.activeAction === this.actions.knife && !this.knifeDamageApplied) {
      if (this.onKnifeHit) this.onKnifeHit(1);
      this.knifeDamageApplied = true;
    }
  
    // Buff glow
    this.setBuffEffect(knifeAttackSpeedMultiplier > 1);
  
    if (this.smokeEffect && this.smokeEnabled) {
      this.smokeEffect.update(delta);
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

    if (this.smokeEffect) {
      this.smokeEnabled = enabled;
    }
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

  showDamageEffects(amount) {
    this.flashRed();
    if (this.game && this.game.ui) {
      this.game.ui.flashDamageOverlay();
      this.game.ui.showFloatingMessage(`-${amount} HP`, this.mesh.position.clone());
    }
  }
 
  takeDamage(amount, visualDelayMs = 700) {
    this.health -= amount;

    // schedule the flash/UI after the desired delay
    if (visualDelayMs > 0) {
      setTimeout(() => this.showDamageEffects(amount), visualDelayMs);
    } else {
      this.showDamageEffects(amount);
    }

    if (this.health <= 0) {
      console.log("Game Over!");
      // game-over logic …
    }
  }

  flashRed(duration = 0.25) {
    if (!this.mesh) return;
  
    // turn every visible mesh red and remember its colour
    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
  
        // store backup ONCE
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
  
        child.material.color.set(0xff0000);
      }
    });
  
    // restore after the delay
    setTimeout(() => this.resetColor(), duration * 1000);
  }
  
  resetColor() {
    if (!this.mesh) return;
  
    this.mesh.traverse(child => {
      if (
        child.isMesh &&
        child.material &&
        child.material.color &&
        child.userData.originalColor          // <-- same key!
      ) {
        //child.material.color.copy(child.userData.originalColor);
        child.material.color.set(0xffffff);
      }
    });
  }
  
}
