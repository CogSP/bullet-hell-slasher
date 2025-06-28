# Rogue-Like Shooter – Three.js Project

A top-down rogue-like built with **Three.js** from scratch. The game mixes arcade action with light RPG mechanics (XP, levels, power-ups) while showcasing several real-time graphics techniques and gameplay systems.

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

### Bullets • Kinetic Energy

Every projectile is a tiny cylinder + glow sprite:

```js
const energy = 0.5 * m * |v|²;
const damage = 0.02 * energy;   // proportional scaling
```

No square root is taken (`lengthSq`), keeping the inner loop cheap.

Trails are **sprite-pooled** (`TRAIL_POOL_SIZE = 64`) to avoid GC / WebGL buffer churn.

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
* Optional features (`Molotov` class) are lazy-imported:

```js
const { Molotov } = await import('./Molotov.js');
```

Browsers parallelise fetches – main thread never stalls.

---


### Controls reference

| Key / Mouse | Action                        |
| ----------- | ----------------------------- |
| **W A S D** | Move / run (always sprint)    |
| **Mouse L** | Knife attack                  |
| **1**       | Place Turret (drag & release) |
| **2**       | Throw Molotov (drag)          |
| **3**       | Drink Potion                  |
| **Q / E**   | Rotate camera                 |
| **C**       | Toggle follow / fixed camera  |
| **R**       | Restart after death           |

---

Enjoy hacking and extend as you please :)

[//]: # "anchor links"
[@bobbyroe/animated-text-effect]: https://github.com/bobbyroe/animated-text-effect?tab=readme-ov-file
