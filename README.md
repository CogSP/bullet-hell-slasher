# Computer Graphics Sandbox

A playground for experimenting and prototyping real-time 3D graphics in Three.js. Mainly based on a top-down rogue-like game, developed for the "Interactive Graphics" course in Sapienza University of Rome, a.y. 2024-2025. The game was build from scratch, mixing arcade action with light RPG mechanics (XP, levels, power-ups) while showcasing several real-time graphics techniques and gameplay systems.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Layout](#project-layout)
3. [Core Systems](#core-systems)

   * [Camera spring-damper](#camera-system)
   * [Statistical spawning](#random-object-spawning)
   * [Bullet ballistics & kinetic energy](#bullets--kinetic-energy)
   * [Physics-based knock-back](#knockback)
   * [A\* path-finding](#a-path-finding)
   * [Particle effects](#particle-effects)
   * [Molotov damage fall‑off](#molotov-damage-fall-off)
   * [Loading screen & manager](#loadingscreen--loadingmgr)
   * [Minimap](#minimap)
4. [Programming Model](#programming-model)

   * [Event-driven input](#event-driven-input)
   * [Async asset loading](#asynchronous-loading--code-splitting)

---

## Quick Start

[Here](https://cogsp.github.io/rogue-like-ig/), or clone the repo and launch `index.html`.

## Project Layout

```
.
├── assets/                # GLTFs, textures, UI icons, fonts ...
├── src/
│   ├── Bullet.js
│   ├── constants.js
│   ├── Enemy.js
│   ├── EnemySpawner.js
│   ├── Game.js            # main game loop & orchestration
│   ├── getParticles.js    # GPU sprite system
│   ├── GridPathFinder.js  # A* on a binary grid
│   ├── HeartPickup.js
│   ├── LaserTextures.js
│   ├── LoadingMgr.js
│   ├── LoadingScreen.js
│   ├── main.js            # entry point
│   ├── Minimap.js
│   ├── Molotov.js
│   ├── Player.js
│   ├── Turret.js
│   └── UI.js              # DOM & CSS-only HUD
└── index.html
```

---

## Core Systems

### Camera System

*Two modes, toggled with `C`:*

* **Follow** – camera chases the player by simulating a mass–spring–damper:

  $$
  \mathbf a = -k(\mathbf x - \mathbf x_t)\;-\;c\mathbf v
  \quad\Longrightarrow\quad
  \mathbf v \leftarrow \mathbf v + \mathbf a\,\Delta t,\;
  \mathbf x \leftarrow \mathbf x + \mathbf v\,\Delta t
  $$

  * `k = 12` → stiffness; `c = 8` → damping.
  * Results in critically-damped motion – no camera “jitter” yet no parachute-like lag.

* **Fixed** – user pans with RMB drags; the camera orbits a *frozen centre*.

Keyboard shortcuts

| Key         | Action                    |
| ----------- | ------------------------- |
| `Q / E`     | Rotate camera ± about Y   |
| Mouse wheel | Zoom (orthographic scale) |
| RMB drag    | Pan in Fixed mode         |

<!-- <video src="demos/camera_system/camera_system_1k.mp4" width="640" controls loop></video> -->

![Camera System](demos/camera_system/camera_system_480.gif)

---

### Random Object Spawning

`Game.loadStaticRocks()` shows how to control RNG with statistics:

```js
const t = Math.random() ** 3;            // cubic bias → many small rocks
const scale = lerp(min, max, t);
```

Because $\small t=u^{3}$ (with $u\sim U(0,1)$), the PDF becomes $p(t)=\frac13t^{-2/3}$, sharply skewed toward 0 ⇒ most samples are tiny.

A similar approach is used for fences & trees – each tries up to *maxAttempts* times before giving up to avoid overlaps (simple Poisson disk).

---

### Bullets • Kinetic Energy & Ballistics

Each projectile is a 3‑part composite (tiny cylinder core + glow sprite + pooled trail) yet costs <1 ms per frame for hundreds of rounds.

```js
const E = 0.5 * m * v.lengthSq(); // kinetic energy (no costly sqrt)
const dmg = 0.02 * E;             // linear damage scale
```

#### Turret ballistics at a glance

|  Property         |  Value / behaviour                                                            |
| ----------------- | ----------------------------------------------------------------------------- |
| **Muzzle speed**  | `300 m s⁻¹`                                   |
| **Mass**          | `0.05 kg`                                                                     |
| **Gravity**       | Applied every frame → *true* parabolic drop (`g = 9.81 m s⁻²`).               |
| **Drag**          | *None* (commented out) – horizontal speed stays constant.                     |
| **Cull distance** | Deleted after travelling ≈ 200 m (squared radius = `40000`).                  |
| **Collision**     | Sphere‑sphere (full 3‑D distance).                                            |
| **Damage**        | Proportional to kinetic energy ⇒ *quadratic* boost if bullet speed is buffed. |
| **Tracer**        | 64‑sprite additive pool, stamped every 0.015 s and faded out.                 |

**Gameplay implications**

* Rounds exhibit **visible bullet‑drop** over long distances.
* **Air air implementation is commented** ⇒ range is essentially unlimited until the 200 m kill‑box reaps the entity, keeping GPU load bounded. To implement air drag, it would be a simple `this.velocity.multiplyScalar(1 - 0.01 * dt)`.
* Cheap maths: two vector adds for motion, one dot‑product for energy – ideal for large waves.


---

### Knockback

Knife hits and explosions impart a horizontal impulse $J$:

$$
\Delta\mathbf v = \frac{J}{m}\,\hat{\mathbf d},\qquad \hat{\mathbf d}\in\mathbb R^{2}
$$

Vertical components are nulled for simplicity (enemies aren’t true rigid bodies).

A small exponential air drag keeps velocity bounded:

```js
this.velocity.multiplyScalar(Math.exp(-4 * dt)); // τ ≈ 0.25 s
```

---

### A\* Path Finding

`GridPathFinder.js` is a minimalist **8-neighbour A\*** on a `Uint8Array`.

* *Convex hull* of every static prop is rasterised once.

* Heuristic: octile distance

  $$
  h = ( \sqrt2-1 )\min(|dx|,|dz|) + \max(|dx|,|dz|)
  $$

* Distance-based *adaptive repath timer*

  ```js
  const distFactor = clamp(dist² / 100, 0.5, 2.0);
  this.repathTimer = baseTime * distFactor * rand(0.8,1.2);
  ```

  Enemies far away waste fewer cycles on path refreshes.

<!-- <video src="demos/A_star/A_star_demo_1k.mp4" width="640" controls loop></video> -->

![A* demo](demos/A_star/A_star_demo_480.gif)

---

### Particle Effects

`getParticles()` is a **GPU billboarding** engine with custom shaders:

* Fire, smoke, electric aura presets
* Per-particle size, spin & colour driven by *linear spline* key-frames
* Single `THREE.Points` draw call – thousands of quads at <1 ms

Used by:

| Effect           | Preset  | Notes                         |
| ---------------- | ------- | ----------------------------- |
| Molotov flames   | `fire`  | 120 pps, additive blend       |
| Potion buff aura | `aura`  | Cyan orbits around the player |
| Molotov smoke    | `smoke` | Normal blend, depth-tested    |

---


### Molotov Damage Fall‑off

Each bottle spawns a **burn pool** (radius = 30 m, lifetime = 8 s).
Every frame we iterate over enemies inside the ring and apply a *quadratic* heat fall‑off:

$$
\bigl\langle \text{DPS}\_{\text{centre}}\bigr\rangle\;t^{2}\;\Delta t,
\qquad t = 1 - \frac{d}{R},\;0\le d\le R
$$

```js
const dist = enemy.pos.distanceTo(centre);
const t    = 1 - dist / radius;      // 0 … 1
const dmg  = damagePerSec * t * t * dt; // quadratic drop‑off
```

* **Centre** (t = 1) → full 150 DPS
* **Edge**   (t ≈ 0) → zero damage – gives players a buffer to escape
* Multiplied by `dt` → frame‑rate independent

Tweakable knobs:

| Parameter      | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `radius`       | Footprint of the fire puddle                    |
| `damagePerSec` | Peak DPS at the epicentre                       |
| power in `t^n` | 1 = linear, 2 = quadratic (default), 3+ steeper |

A scorch decal plus GPU‑particle fire & smoke presets sell the effect visually.

---

### LoadingScreen & LoadingMgr

* Custom WebGL renderer draws glassy *MISO* font + dash-offset outline.
* `LoadingMgr` mirrors `THREE.LoadingManager` progress → animated “xxx %”.
* Asset load + *first rendered frame* gate the fade-out – no white flash.

I started from **[@bobbyroe/animated-text-effect]** for the outline animation effect.

---

### Minimap

Pure `<canvas>` overlay:

* Player is always centre; world points are rotated by **−(camAngle+90°)** so camera-forward = “up”.
* `drawPlayerArrow()` draws a little isosceles triangle oriented with the projected facing vector.
* Enemy & pickup dots are 1-pixel squares for a crisp retro vibe (`imageRendering: pixelated`).

---

## Programming Model

### Event-Driven Input

*Mouse* & *keyboard* listeners are *registered once* in `Game.registerEventListeners()`.
Flags live in `this.input` → tight `update()` loops have **zero DOM queries**.

* Drag-and-drop build mode emits synthetic `pointermove` to reuse the same logic paths.
* Global `first-render-complete` allows LoadingMgr to finish only after the very first `renderer.render()` – reliable even on low-end hardware.

### Asynchronous Loading – Code-Splitting

* Heavy GLTFs are streamed with **per-folder `setPath()`** to cut URL spam.

Browsers parallelise fetches – main thread never stalls.

---


### Controls reference

| Key / Mouse | Action                            |
| ----------- | -----------------------------     |
| **W A S D** | Move / run (always sprint)        |
| **Mouse L** | Knife attack                      |
| **Mouse R** | Drag to move camera in fixed mode |
| **1**       | Place Turret (drag & release)     |
| **2**       | Throw Molotov (drag)              |
| **3**       | Drink Potion                      |
| **Q / E**   | Rotate camera                     |
| **C**       | Toggle follow / fixed camera      |
| **R**       | Restart after death               |
| **P**       | Pause                             |

---

Enjoy hacking and extend as you please :)

[//]: # "anchor links"
[@bobbyroe/animated-text-effect]: https://github.com/bobbyroe/animated-text-effect?tab=readme-ov-file
