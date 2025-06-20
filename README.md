# A Three.js Rogue Like Game

This project is a browser-based, single-player rogue-like game created for the "Interactive Graphics" (Sapienza University of Rome, a.y. 2025-2026) in Three.js.
You fight waves of goblin using your knife, tools and powerup, trying to survive as long as you can. The project is built with vanilla **Three.js** ES-modules—no frameworks, no build step—just clone, serve, and play.

<p align="center">
  <img src="assets/screenshots/gameplay.gif" width="600" alt="Gameplay preview">
</p>

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

## Tech Stack
| Category | Lib / Spec |
|----------|------------|
| 3D Engine | **[Three.js](https://threejs.org)** (ESM import) |
| Loaders   | `GLTFLoader`, `TextureLoader` |
| Assets    | Models & textures from **Poly Haven** and other sources |
| Tooling   | Vanilla JS ES Modules, optional [`live-server`](https://www.npmjs.com/package/live-server) for dev |

---

## Project Structure

````{verbatim}
.
├── assets/
│ ├── ...
├── src/
│ ├── Game.js # Main game loop & scene setup
│ ├── Player.js # Player controller
│ ├── EnemySpawner.js # Wave logic & AI routines
│ ├── Turret.js # Autonomous turret behaviour
│ ├── Bullet.js # Projectile physics
│ ├── UI.js # DOM-based HUD
│ └── utils/ # Math helpers, particle factory, etc.
├── index.html
└── README.md
````
