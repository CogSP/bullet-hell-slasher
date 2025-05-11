// LaserTextures.js  (place somewhere in /src/)
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const names  = [  
  'laserBlue01.png', 'laserBlue02.png', 'laserBlue03.png', 'laserBlue04.png', 'laserBlue05.png', 'laserBlue06.png', 'laserBlue07.png', 'laserBlue08.png', 
  'laserBlue09.png', 'laserBlue10.png', 'laserBlue11.png', 'laserBlue12.png', 'laserBlue13.png', 'laserBlue14.png', 'laserBlue15.png', 'laserBlue16.png',   
  'laserGreen01.png', 'laserGreen02.png', 'laserGreen03.png', 'laserGreen04.png', 'laserGreen05.png', 'laserGreen06.png', 'laserGreen07.png', 'laserGreen08.png', 
  'laserGreen09.png', 'laserGreen10.png', 'laserGreen11.png', 'laserGreen12.png', 'laserGreen13.png', 'laserGreen14.png', 'laserGreen15.png', 'laserGreen16.png',   
  'laserRed01.png', 'laserRed02.png', 'laserRed03.png', 'laserRed04.png', 'laserRed05.png', 'laserRed06.png', 'laserRed07.png', 'laserRed08.png', 
  'laserRed09.png', 'laserRed10.png', 'laserRed11.png', 'laserRed12.png', 'laserRed13.png', 'laserRed14.png', 'laserRed15.png', 'laserRed16.png',   

];

export const laserTex = names.map(n =>
  loader.load(`assets/textures/laser/${n}`, t => {
    // All Kenney sprites are premultiplied alpha ready – we just need these flags:
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipMapLinearFilter; // default is fine
  })
);
