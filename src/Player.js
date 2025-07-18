import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { AnimationUtils } from 'three';
import { getParticles } from './getParticles.js';
import { loadingMgr } from './LoadingMgr.js';

export class Player {
  constructor(scene, gameCamera) {
    this.scene = scene;
    this.gameCamera = gameCamera; // Store the camera reference for particle effects.
    this.health = 100;
    this.alive = true;
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
    this.maxMana = 100;
    this.mana = this.maxMana;
    // this.stamina = this.maxStamina;
    // this.staminaRegenRate = 15;     // Stamina per second when not running
    // this.staminaDrainRate = 25;     // Stamina per second while running
    // this.canRun = true;             // Flag to prevent running when stamina is depleted
    this.level       = 1;         // starts at Lv-1
    this.xp          = 0;         // current XP
    this.xpToNext    = 50;        // XP needed for Lv-up (first tier)
    this._mod = { knifeSpeed: 1, moveSpeed: 1 };

    const loader = new GLTFLoader(loadingMgr);
    loader.load(
      'assets/player/low_poly_soldier/scene.gltf',
      (gltf) => {
        this.mesh = gltf.scene;
        // this is needed to make the model cast shadows
        this.mesh.traverse(o => {
          if (o.isMesh) {
            o.castShadow    = true;   // they can cast
            o.receiveShadow = true;   // …and receive, if you want contact-darkening
          }
        });         
        this.mesh.position.set(0, 1.5, 0);
        this.mesh.scale.set(0.07, 0.07, 0.07);
        this.mesh.castShadow = true; // TODO: check why this is not working: it should allow player to receive shadows

        this.scene.add(this.mesh);

        this.auraAnchor = new THREE.Object3D();
        this.auraAnchor.position.set(0, 1.2, 0);
        this.mesh.add(this.auraAnchor);

        this.auraEffect = getParticles({
          camera : this.gameCamera,
          emitter: this.auraAnchor,
          parent : this.auraAnchor,
          rate   : 50,
          texture: 'src/img/circle.png',
          mode   : 'aura', // this is the preset
          bodyRadius: 30,
          bodyHeight: 350,

          // overrides
          maxSize: 0.03,
          radius: 0.5,
          colour: [
            [0, new THREE.Color(0xffff00)],
            [1, new THREE.Color(0xffff00)],
          ]
        });
        this.auraEnabled = false;

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
          console.error('No animations found in the model.');
        }
      },
      undefined,
      (error) => {
        console.error('An error occurred loading the model:', error);
      }
    );
  }


  // public helpers for buffs & debuffs
  addTempModifier(kind, mult = 1) {
    if (this._mod[kind] === undefined) this._mod[kind] = 1;
    this._mod[kind] *= mult;
  }
  removeTempModifier(kind, mult = 1) {
    if (this._mod[kind] === undefined) return;
    this._mod[kind] /= mult;
  }
  get knifeMult() { return this._mod.knifeSpeed ?? 1; }
  get moveMult()  { return this._mod.moveSpeed  ?? 1; }

  /* how many % of the ring should be filled right now? */
  get xpPct() { return (this.xp / this.xpToNext) * 100; }

  /** add experience, returns true if a level-up happened */
  addXP(amount = 1) {
    this.xp += amount;

    let levelled = false;
    while (this.xp >= this.xpToNext) {
      this.xp     -= this.xpToNext;
      this.level  += 1;
      this.xpToNext = Math.floor(this.xpToNext * 1.25); // harder each tier
      levelled = true;
    }
    return levelled;
  }



  spendMana(amount) {
    if (this.mana >= amount) {
      this.mana -= amount;
      return true;
    }

    // not enough – tell the user once per click
    if (this.game && this.game.ui) {
      this.game.ui.showFloatingMessage(
        "Not enough mana!",
        this.mesh ? this.mesh.position.clone() : new THREE.Vector3()
      );
    }

    return false;
  }

  regenMana(delta, rate = 10) {
    this.mana += rate * delta;
    if (this.mana > this.maxMana) this.mana = this.maxMana;
  }

  update(delta, input, cameraAngle) {

    if (!this.alive) return;
    if (this.mixer) this.mixer.update(delta);
    if (!this.mesh) return;
  
    // Handle knife attack
    if (input['MouseLeft'] && this.actions.knife && !this.isAttacking) {
      this.fadeToAction('knife');
      this.actions.knife.timeScale = this.knifeMult; // uses the getter
      this.isAttacking = true;
      input['MouseLeft'] = false;
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
  

    let currentSpeed = this.speed * 1.8 * this.moveMult; // uses the getter

    if (moveDir.length() > 0) {
        moveDir.normalize();

        if (!this.isAttacking) {
          if (this.actions.run) {
            this.fadeToAction('run');
            this.actions.run.timeScale = 1;
          }
        }

      this.velocity.copy(moveDir).multiplyScalar(currentSpeed);
      const movement = moveDir.clone().multiplyScalar(currentSpeed * delta);
      this.mesh.position.add(movement);

      const nextPos = this.mesh.position.clone()

      const targetPosition = this.mesh.position.clone().add(moveDir);
      targetPosition.y = this.mesh.position.y;
      this.mesh.lookAt(targetPosition);

      // simple sphere-vs-box test (treat player as 0.75-unit radius capsule head)
      const playerRadius = 0.75;
      let blocked = false;

      const tmp = new THREE.Box3();
      for ( const box of this.game.staticColliders) {
        // expand box by the player radius → cheaper than real capsule test
        tmp.copy(box).expandByScalar(playerRadius);
        if ( tmp.containsPoint(nextPos) ) {
          blocked = true;
          break;
        }
      }

      if ( !blocked ) {
        this.mesh.position.copy( nextPos );
      }
      else {
        this.mesh.position.sub(movement); // undo the last movement
      }

    } else {
      this.velocity.set(0, 0, 0);
      if (!this.isAttacking && this.actions.idle) {
        this.fadeToAction('idle');
      }
    }

  
    // Knife damage logic
    if (this.activeAction === this.actions.knife && !this.knifeDamageApplied) {
      if (this.onKnifeHit) this.onKnifeHit(80);
      this.knifeDamageApplied = true;
    }
  
    // Buff glow
    this.setBuffEffect(this.knifeMult > 1);
  
    if (this.auraEffect && this.auraEnabled) {
      this.auraEffect.update(delta);
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

    if (this.auraEffect) {
      this.auraEnabled = enabled;
      this.auraAnchor.visible = enabled;
      if (!enabled && this.auraEffect.geometry) {
        this.auraEffect.geometry.setDrawRange(0, 0);
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

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  showDamageEffects(amount) {
    this.flashRed();
    if (this.game && this.game.ui) {
      this.game.ui.flashDamageOverlay();
      this.game.ui.showFloatingMessage(`-${amount} HP`, this.mesh.position.clone());
    }
  }
 
  takeDamage(amount, visualDelayMs = 700) {

    if (!this.alive) return;
    
    this.health -= amount;

    // schedule the flash/UI after the desired delay
    if (visualDelayMs > 0) {
      setTimeout(() => this.showDamageEffects(amount), visualDelayMs);
    } else {
      this.showDamageEffects(amount);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {

    if (!this.alive) return; // already dead

    this.alive = false;

    /* optional: play a death animation or simply freeze */
    if (this.actions.idle) this.fadeToAction('idle');

    /* Tell the Game singleton */
    this.game?.onPlayerDeath?.();
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
