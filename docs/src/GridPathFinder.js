// A simple A* on a 2-D boolean grid
import * as THREE from 'three';

export class GridPathFinder {
  /**
   * @param {number} sizeX   number of cells in X
   * @param {number} sizeZ   number of cells in Z
   * @param {number} cell    world-space metres per cell (e.g. 1)
   */
  constructor(sizeX, sizeZ, cell = 1) {
    this.sizeX = sizeX; // columns
    this.sizeZ = sizeZ; // rows
    this.cell  = cell;

    // Origin offset so world-space (0,0) maps to grid-center
    this.offsetX = Math.floor(sizeX / 2);
    this.offsetZ = Math.floor(sizeZ / 2);

    this.grid  = new Uint8Array( sizeX * sizeZ ).fill(1); // true  = walkable, false = blocked

    this._debugLine = null; // track last path line drawn for debug so we can remove it later
    // track the current start / goal meshes so we can delete them next time */
    this._startMarker = null;
    this._goalMarker  = null;
  }


  // ─────────────────────────────────────────────────────────────────
  // A helper to draw every 0‐cell as a solid black square
  // ─────────────────────────────────────────────────────────────────
  drawObstacles(scene) {
    // single shared geometry & material
    const geo = new THREE.PlaneGeometry(this.cell, this.cell);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    for (let z = 0; z < this.sizeZ; z++) {
      for (let x = 0; x < this.sizeX; x++) {
        if (this.get(x, z) === 0) {
          const worldCenter = this.cellToWorld(new THREE.Vector2(x, z));
          const m = new THREE.Mesh(geo, mat);
          m.rotation.x = -Math.PI / 2;
          // lift it just above the ground so it isn’t z-fighting
          m.position.set(worldCenter.x, 0.01, worldCenter.z);
          scene.add(m);
        }
      }
    }
  }



  /** Debug: highlight a single cell in world‐space */
  highlightCell(cell, scene, color) {
    // cell: THREE.Vector2 grid index
    // color: hex
    const worldCenter = this.cellToWorld(cell);
    const geo = new THREE.PlaneGeometry(this.cell, this.cell);
    const mat = new THREE.MeshBasicMaterial({
      color, 
      transparent: true, 
      opacity: 0.5, 
      side: THREE.DoubleSide,
      wireframe: true
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI/2;           // lie flat
    m.position.set(worldCenter.x, 0.02, worldCenter.z);
    scene.add(m);
    return m;           // give the caller the mesh reference
}


  /**
 * Debug: draw cell boundaries as lines on the XZ plane.
 * @param {THREE.Scene} scene 
 */
  showGrid(scene) {
    const sizeX    = this.sizeX * this.cell;
    const sizeZ    = this.sizeZ * this.cell;
    const halfX    = sizeX / 2;
    const halfZ    = sizeZ / 2;
    const lineMat  = new THREE.LineBasicMaterial({ color: 0xffffff });
    const points   = [];

    // vertical lines
    for (let i = 0; i <= this.sizeX; i++) {
      const x = i * this.cell - halfX;
      points.length = 0;
      points.push(new THREE.Vector3(x, 0.01, -halfZ));
      points.push(new THREE.Vector3(x, 0.01,  halfZ));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
    }

    // horizontal lines
    for (let j = 0; j <= this.sizeZ; j++) {
      const z = j * this.cell - halfZ;
      points.length = 0;
      points.push(new THREE.Vector3(-halfX, 0.01, z));
      points.push(new THREE.Vector3( halfX, 0.01, z));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
    }
  }

  addCollider(box) {
    const mn = this.worldToCell(box.min);
    const mx = this.worldToCell(box.max);

    for (let gz = mn.y; gz <= mx.y; gz++) {
      for (let gx = mn.x; gx <= mx.x; gx++) {
        this.set(gx, gz, 0);
      }
    }
  }

  /** Convert a THREE.Vector3 or Vector2 in world-space to cell indices */
  worldToCell(v) {
    const x = Math.floor(v.x / this.cell) + this.offsetX;
    const z = Math.floor(v.z / this.cell) + this.offsetZ;
    return new THREE.Vector2(x, z);
  }

  cellToWorld(cell) {
    const worldX = (cell.x - this.offsetX + 0.5) * this.cell;
    const worldZ = (cell.y - this.offsetZ + 0.5) * this.cell;
    return new THREE.Vector3(worldX, 0, worldZ);
  }


  set(x, z, walkable) {
    if ( x < 0 || z < 0 || x >= this.sizeX || z >= this.sizeZ ) return;
    this.grid[ z * this.sizeX + x ] = walkable;
  }
  get(x, z) {
    if ( x < 0 || z < 0 || x >= this.sizeX || z >= this.sizeZ ) return 0;
    return this.grid[z * this.sizeX + x];
  }

  // ───────────────────────────────────────────
  // A* search – returns an array of world-space THREE.Vector3
  // ───────────────────────────────────────────
  findPath(startW, goalW, scene) {
    
    const start = this.worldToCell(startW);
    const goal  = this.worldToCell(goalW);

    // DEBUG, comment when gaming
    /* erase previous markers, then draw fresh ones */
    // if (scene) {
    //   const wipe = (mesh) => {
    //     if (mesh) {
    //       scene.remove(mesh);
    //       mesh.geometry.dispose();
    //       mesh.material.dispose();
    //     }
    //   };
    //   wipe(this._startMarker);
    //   wipe(this._goalMarker);

    //   this._startMarker = this.highlightCell(start, scene, 0x00ff00); // green
    //   this._goalMarker  = this.highlightCell(goal,  scene, 0xff0000); // red
    // }

    if (!this.get(goal.x, goal.y)) { // goal blocked
      return [];
    }

    const open = new Map(); // nodes to explore (OPEN set)
    const came = new Map(); // backtracking path
    const g    = new Map(); // g(n): cost so far from start
    const f    = new Map(); // f(n) = g(n) + h(n): estimated total cost

    // const neigh = [[1,0], [-1,0], [0,1], [0,-1]];
    const neigh = [
      [ 1,  0], [-1,  0],
      [ 0,  1], [ 0, -1],
      [ 1,  1], [-1,  1],
      [ 1, -1], [-1, -1]
    ];

    // const h = (a,b) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y); // Estimated Manhattan distance to the goal
    // Replace your h = (a,b) => |dx|+|dy|
    const h = (a,b) => {
      const dx = Math.abs(a.x - b.x);
      const dz = Math.abs(a.y - b.y);
      // octile distance:
      return (Math.SQRT2 - 1) * Math.min(dx,dz) + Math.max(dx,dz);
    };

    const key = (v) => `${v.x},${v.y}`;

    // adds a node to the OPEN set
    // with its g(n) and f(n)
    const push = (v, gCost) => {
      const k = key(v);
      open.set(k, v);
      g.set(k, gCost);
      f.set(k, gCost + h(v,goal));
    };

    // initialize with start node g = 0, so f = h(start,goal)
    push(start, 0);

    // while there are nodes to explore
    while (open.size) {
      // node in open with lowest f
      let current, cf = Infinity;
      for ( const [k,v] of open ) {
        const fv = f.get(k);
        if (fv < cf) {cf = fv; current = v;}
      }
      const ck = key(current);

      // if we reached the goal reorder the path
      if (current.equals(goal)) {

        // reconstruct
        const path = [];
        let cur = ck;
        while (cur) {
          const [x,z] = cur.split(',').map(Number);
          if (x === goal.x && z === goal.y) {
            path.push(new THREE.Vector3(goalW.x, 0, goalW.z));
          } else {
            path.push(this.cellToWorld(new THREE.Vector2(x, z)));
          }
          cur = came.get(cur);
        }

        // // DEBUG, comment while gaming
        // // ─── remove previous debug line ─────────────────────────────────
        // if (this._debugLine && scene) {
        //   scene.remove(this._debugLine);
        //   this._debugLine.geometry.dispose();
        //   this._debugLine.material.dispose();
        //   this._debugLine = null;
        // }

        // // DEBUG, comment while gaming
        // // draw the path in the scene for debugging
        // if (scene && path.length) {
        //   // lift it slightly off the ground so you can see it
        //   const linePts = path.map(p => p.clone().setY(0.05));
        //   const geo      = new THREE.BufferGeometry().setFromPoints(linePts);
        //   const mat      = new THREE.LineBasicMaterial({ color: 0x00ffff });
        //   const line     = new THREE.Line(geo, mat);
        //   scene.add(line);
        //   this._debugLine = line; // store for later removal
        // }

        return path.reverse();
      }

      open.delete(ck);

      // expand neighbors of the current node
      for (const [dx,dz] of neigh) {
        const nx = current.x + dx;
        const nz = current.y + dz;
        if (!this.get(nx, nz)) continue;           // wall

        // const nk  = `${nx},${nz}`;
        // const ng  = g.get(ck) + 1;                     // all edges cost 1
        // diagonal if both dx and dz are nonzero
        const cost = (dx !== 0 && dz !== 0) ? Math.SQRT2 : 1;
        const nk   = `${nx},${nz}`;
        const ng   = g.get(ck) + cost;

        if ( !g.has(nk) || ng < g.get(nk) ) {
          came.set( nk, ck );
          push(new THREE.Vector2(nx,nz), ng);
        }
      }
    }
    return [];    // no path
  }
}
