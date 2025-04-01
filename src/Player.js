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
              // Reset flags when the knife attack finishes.
              console.log('Knife attack finished:', event.action.time);
              this.isAttacking = false;
              this.knifeDamageApplied = false; // Reset knife damage flag.
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

  update(delta, input) {
    // Update the animation mixer.

    if (this.mixer) {
      this.mixer.update(delta);
    }
    if (!this.mesh) return;

    // If K is pressed, trigger knife attack (only once).
    if (input['KeyK'] && this.actions.knife && !this.isAttacking) {
      this.fadeToAction('knife');
      this.isAttacking = true;
      input['KeyK'] = false;
      console.log('Knife attack triggered:', this.actions.knife.time);
      return;
    }

    // Handle movement.
    const direction = new THREE.Vector3();
    if (input['KeyW']) direction.z -= 1;
    if (input['KeyS']) direction.z += 1;
    if (input['KeyA']) direction.x -= 1;
    if (input['KeyD']) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      this.velocity.copy(direction).multiplyScalar(this.speed);
      const movement = direction.multiplyScalar(this.speed * delta);
      this.mesh.position.add(movement);

      // Orient the player to face the movement direction.
      const targetPosition = this.mesh.position.clone().add(direction);
      targetPosition.y = this.mesh.position.y;
      this.mesh.lookAt(targetPosition);

      // If not attacking, choose run or walk.
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
    
    if (this.activeAction === this.actions.knife) {
      if (!this.knifeDamageApplied) {
        const damage = 1
        if (this.onKnifeHit) {
          this.onKnifeHit(damage);
        }
        this.knifeDamageApplied = true;
      }
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

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      console.log('Game Over!');
      // Implement game over logic.
    }
  }
}
