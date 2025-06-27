import * as THREE from 'three';
import { getParticles } from './getParticles.js';

export class Molotov {
    constructor (pos, scene, camera, game) {
        this.radius        = 30;          // burn area
        this.damagePerSec  = 150;          // DPS to each enemy inside
        this.lifetime      = 8;          // seconds fire lasts
        this.game          = game;       // Game instance to access enemies
        this.scene  = scene;
        this.camera = camera;
        this.timer  = 0;                 // elapsed time
        this.enemies = null;             // filled in by Game every frame

        /* visual : scorch decal + particles ----------------------------- */
        /* master container so we can delete everything in one call */
        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const geo = new THREE.CircleGeometry(this.radius, 32);
        const mat = new THREE.MeshBasicMaterial({ color:0x662200, opacity:0.0,
                                                    transparent:true, depthWrite:false });
        this.decal = new THREE.Mesh(geo, mat);
        this.decal.rotation.x = -Math.PI/2;
        // this.decal.position.copy(pos);
        // this.scene.add(this.decal);
        this.group.add(this.decal);

        /* fire sprites */
        this.fire = getParticles({
            camera,
            emitter: this.decal,
            parent : this.group,
            rate   : 120,
            texture: 'src/img/fire.png',
            mode: 'fire'
        });
    }

    /* called once per frame ------------------------------------------------ */
    update (dt) {
        this.timer += dt;
        this.fire.update(dt);

        const centre = this.group.position;
        const rSq = this.radius * this.radius;
            
        /* burn all enemies currently inside radius */
        if (this.enemies) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                if (!e.mesh) continue;


                const distSq = e.mesh.position.distanceToSquared(centre);
                if (distSq < rSq) {
                    /* ---------- quadratic fall-off -------------------------------- */
                    const dist = Math.sqrt(distSq);            // metres from centre
                    const t    = 1 - dist / this.radius;       // 1 → centre, 0 → edge
                    const dmg  = this.damagePerSec * t * t * dt;
                    /* -------------------------------------------------------------- */

                    const dead = e.takeDamage(dmg);
                    if (dead && this.game) {
                    this.game.enemySpawner.removeEnemy(e);
                    this.game.registerEnemyKill(e);
                    }
                }
            }

            /* expire */
            if (this.timer >= this.lifetime) {
                this.scene.remove(this.group);
                this.fire = null;        // GC – Game will filter nulls
                return true;             // “I’m done, remove me”
            }
            return false;
        }
    }
}
