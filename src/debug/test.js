import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/OrbitControls.js';


// this files is used to screenshot the avatars and put them on the centre-HUD

function saveScreenshot() {
  // ensure we have the latest view
  renderer.render(scene, camera);

  // turn the canvas into a PNG data-URL
  const dataURL = renderer.domElement.toDataURL('image/png');

  // download it
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'snapshot.png';
  link.click();
}


window.addEventListener('keydown', e => {
  if (e.key === 'p') saveScreenshot();   // press “p” to snap
});

// 1. create a scene
const scene = new THREE.Scene();

const fov = 45; // field of view in degrees
const aspect = window.innerWidth / window.innerHeight;
//const aspect = 1;

// 2. create a camera
const camera = new THREE.PerspectiveCamera(
    fov,
    aspect,
    0.1, // near clipping plane, before which objects are not rendered
    20000 // far clipping plane, after which objects are not rendered
)

// 3. load the model
const gltf = await new GLTFLoader().loadAsync(
'assets/player/low_poly_soldier/scene.gltf'
);
const model = gltf.scene;
model.scale.set(0.05, 0.05, 0.05);
model.traverse(o => {
    if (!o.isMesh) return;

    const src     = o.material;
    const dstOpts = { toneMapped: false };

    if (src.map) {
        src.map.encoding = THREE.SRGBColorSpace;   // correct colour-space
        dstOpts.map      = src.map;
    } else {
        dstOpts.color    = 0xffffff;
    }

    // using MeshBasicMaterial we can render the model without lighting
    o.material = new THREE.MeshBasicMaterial(dstOpts); 
});
scene.add(model);



// 4. create the renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight); // Resize the output canvas to (width, height)
document.body.appendChild(renderer.domElement); // append the renderer's canvas to the document body

// Last: add orbit controls
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 0.56, 1); 
//camera.lookAt(0, 0, 0); // look at the origin
orbit.update(); // update the controls to apply the camera position


// // let's add axis helper to the scene
// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);



function animate(time) {
  // 1. let the control react to mouse / touch since last frame
  orbit.update();          // if you use damping, call this *every* frame

  // 2. draw the new view
  renderer.render(scene, camera);

  // 3. schedule the next frame
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

