// A simple A* on a 2-D boolean grid
import * as THREE from 'three';

export class GridPathfinder {
  /**
   * @param {number} sizeX   number of cells in X
   * @param {number} sizeZ   number of cells in Z
   * @param {number} cell    world-space metres per cell (e.g. 1)
   */
  constructor( sizeX, sizeZ, cell = 1 ) {
    this.sizeX = sizeX;     // columns
    this.sizeZ = sizeZ;     // rows
    this.cell  = cell;
    // true  = walkable, false = blocked
    this.grid  = new Uint8Array( sizeX * sizeZ ).fill( 1 );
  }

  /** Mark every cell touched by the given Box3 as blocked */
  addCollider( box ) {
    // convert world coords to grid indices
    const min = box.min.clone().divideScalar( this.cell ).floor();
    const max = box.max.clone().divideScalar( this.cell ).floor();

    for ( let z = min.z; z <= max.z; z++ )
      for ( let x = min.x; x <= max.x; x++ )
        this.set( x, z, 0 );
  }

  set( x, z, walkable ) {
    if ( x < 0 || z < 0 || x >= this.sizeX || z >= this.sizeZ ) return;
    this.grid[ z * this.sizeX + x ] = walkable;
  }
  get( x, z ) {
    if ( x < 0 || z < 0 || x >= this.sizeX || z >= this.sizeZ ) return 0;
    return this.grid[ z * this.sizeX + x ];
  }

  // ───────────────────────────────────────────
  // A* search – returns an array of world-space THREE.Vector3
  // ───────────────────────────────────────────
  findPath( startW, goalW ) {
    const toCell = v =>
      new THREE.Vector2(
        Math.round( v.x / this.cell ),
        Math.round( v.z / this.cell )
      );

    const start = toCell( startW );
    const goal  = toCell( goalW );
    if ( !this.get( goal.x, goal.y ) ) return [];   // goal blocked

    const open = new Map();              // key = "x,z",  value = node
    const came = new Map();              // cheapest parent pointer
    const g    = new Map();              // cost so far
    const f    = new Map();              // g + heuristic

    const h = (a,b) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y); // manhattan
    const key = (v) => `${v.x},${v.y}`;

    const push = (v, gCost) => {
      const k = key(v);
      open.set(k, v);
      g.set(k, gCost);
      f.set(k, gCost + h(v,goal));
    };

    push( start, 0 );

    const neigh = [ [1,0],[-1,0],[0,1],[0,-1] ];

    while ( open.size ) {
      // node in open with lowest f
      let current, cf = Infinity;
      for ( const [k,v] of open ) {
        const fv = f.get(k);
        if ( fv < cf ) { cf = fv; current = v; }
      }
      const ck = key(current);

      if ( current.equals( goal ) ) {
        // reconstruct
        const path = [];
        let cur = ck;
        while ( cur ) {
          const [x,z] = cur.split(',').map(Number);
          path.push( new THREE.Vector3(
            x * this.cell,
            0,
            z * this.cell
          ) );
          cur = came.get( cur );
        }
        return path.reverse();
      }

      open.delete( ck );

      for ( const [dx,dz] of neigh ) {
        const nx = current.x + dx;
        const nz = current.y + dz;
        if ( !this.get( nx, nz ) ) continue;           // wall

        const nk  = `${nx},${nz}`;
        const ng  = g.get(ck) + 1;                     // all edges cost 1

        if ( !g.has(nk) || ng < g.get(nk) ) {
          came.set( nk, ck );
          push( new THREE.Vector2(nx,nz), ng );
        }
      }
    }
    return [];    // no path
  }
}
