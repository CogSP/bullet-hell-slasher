import * as THREE from 'three';

/**
 * Draws a tiny triangular arrow at (cx, cy) pointing toward (vx, vy).
 * `vx,vy` should already be in minimap space (i.e. after camera rotation).
 */
function drawPlayerArrow(ctx, cx, cy, vx, vy, colour = '#0f0') {

    // If the vector is almost zero, skip (player not yet oriented)
    const mag = Math.hypot(vx, vy);
    if (mag < 1e-5) return;

    // Angle in canvas space  (note: canvas Y-axis points down)
    const ang = Math.atan2(-vx, vy);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);           // point arrow along the facing vector
    ctx.fillStyle = colour;

    // simple isosceles triangle (tip at top)
    ctx.beginPath();
    ctx.moveTo(0, -9);   // tip higher
    ctx.lineTo(-6,  6);    // wider base
    ctx.lineTo( 6,  6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}


export class Minimap {
  /**
   * @param {number} worldSize – length of one side of your ground plane (1000)
   * @param {number} sizePx    – square canvas size on screen (e.g. 160 px)
   */
  constructor(worldSize = 1000, sizePx = 160) {
    this.worldSize = worldSize;
    this.sizePx    = sizePx;
    this.halfWorld = worldSize * 0.5;

    /* create canvas element */
    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.canvas.height = sizePx;
    Object.assign(this.canvas.style, {
      position: 'absolute',
      bottom  : '90px',     // leave room for bottom HUD
      left    : '10px',
      border  : '2px solid #fff',
      background: 'rgba(0,0,0,0.35)',
      imageRendering: 'pixelated'   // crisp 1-px dots
    });
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
  }

  /** Converts a world-space X/Z pair to minimap pixel coords. */
  _toMap(x, z) {
    return {
      px: ((x + this.halfWorld) / this.worldSize) * this.sizePx,
      py: this.sizePx - ((z + this.halfWorld) / this.worldSize) * this.sizePx
    };
  }

  /**
   * Draw current frame.
   * @param {THREE.Object3D} player
   * @param {Enemy[]}       enemies  – objects with `.mesh.position`
   * @param {HeartPickup[]} pickups  – objects with `.mesh.position`
   */
  update(player, enemies = [], pickups = [], cameraAngle = 0) {
    if (!player?.mesh) return;

    const g = this.ctx;
    g.clearRect(0, 0, this.sizePx, this.sizePx);

    // put the player at the centre
    const cx = this.sizePx * 0.5;
    const cy = this.sizePx * 0.5;

    /* rotation matrix: world->map, so that camera-forward is "up" */
    const rot   = - cameraAngle - Math.PI * 0.5;   // extra −90° (forward → up)

    const cosA  = Math.cos(rot);
    const sinA  = Math.sin(rot);

    const scale = this.sizePx / this.worldSize;   // px per world unit

    const drawDot = (x, z, size, colour) => {
        const dx = (x - player.mesh.position.x);
        const dz = (z - player.mesh.position.z);

        // rotate
        const rx = dx * cosA - dz * sinA;
        const rz = dx * sinA + dz * cosA;

        const px = cx - rx * scale;
        const py = cy - rz * scale; // minus: +z (forward) is up

        g.fillStyle = colour;
        g.fillRect(px - size * 0.5, py - size * 0.5, size, size);
    };

    /* items */
    pickups.forEach(p => drawDot(p.mesh.position.x, p.mesh.position.z, 4, '#ff5'));

    /* enemies */
    enemies.forEach(e => drawDot(e.mesh.position.x, e.mesh.position.z, 6, '#f44'));

    /* player */
    g.fillStyle = '#0f0';
    g.beginPath();
    g.arc(cx, cy, 5, 0, Math.PI * 2);
    g.fill();

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.mesh.quaternion);

    const vx =  forward.x * cosA - forward.z * sinA;
    const vy =  forward.x * sinA + forward.z * cosA;

    drawPlayerArrow(g, cx, cy, vx, vy);
   }
}
