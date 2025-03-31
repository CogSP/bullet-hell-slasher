import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { Player } from './Player.js';
import { EnemySpawner } from './EnemySpawner.js';
import { UI } from './UI.js';
import { Bullet } from './Bullet.js';

export class Game {
  constructor(container) {
    this.container = container;

    // Create the scene and set a background color.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202020);
    
    // Load a ground texture using TextureLoader
    const textureLoader = new THREE.TextureLoader();
    // https://www.fab.com/listings/42e25675-17ba-4205-a155-bd9216519ca1
    const groundTexture = textureLoader.load('assets/ground/japanese_shrine_stone_floor_ugrxbjkfa_ue_high/Textures/T_ugrxbjkfa_4K_B.png'); // update with your texture path

    // Enable repeat wrapping so the texture tiles across the surface
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;

    // Set the repeat factors (adjust these to cover the map with the desired detail)
    groundTexture.repeat.set(100, 100); // increase for more tiling

    // Optionally, improve texture quality at oblique angles
    groundTexture.anisotropy = 16;

    // Create a large plane geometry for the ground (e.g., 1000 x 1000 units)
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);

    const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
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
    
    // Optionally, if your model isn’t oriented as expected, apply an additional rotation.
    // For example, if your model’s front is facing the opposite direction:
    // this.camera.rotateY(Math.PI);
    

    // Setup renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Clock for delta time.
    this.clock = new THREE.Clock();

    // Create the player (central node) and add it to the scene.
    this.player = new Player();
    this.scene.add(this.player.mesh);

    // Enemy spawner to handle enemy creation.
    this.enemySpawner = new EnemySpawner(this.scene, this.player);

    // UI overlay for health and score.
    this.ui = new UI();

    // Array to hold active bullets.
    this.bullets = [];

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
      // Calculate direction from the player's current position to the intersection point.
      const direction = intersectionPoint.sub(this.player.mesh.position).normalize();
      // Create a new bullet from the player's current position.
      const bullet = new Bullet(this.player.mesh.position.clone(), direction);
      // Add the player's current velocity to the bullet's velocity.
      bullet.velocity.add(this.player.velocity);
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

    // Update player movement with the current input.
    this.player.update(delta, this.input);

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


    // Update each bullet.
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
            this.enemySpawner.removeEnemy(enemy);
            this.enemySpawner.score += 10;
          }
          // Remove the bullet after it hits.
          this.scene.remove(bullet.mesh);
          this.bullets.splice(i, 1);
          break;
        }
      }

      // Optionally, remove bullets that travel too far.
      if (bullet.mesh.position.distanceTo(this.player.mesh.position) > 100) {
        this.scene.remove(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // Update the UI with current health and score.
    this.ui.update(this.player.health, this.enemySpawner.score);

    // Render the scene.
    this.renderer.render(this.scene, this.camera);
  }
}
