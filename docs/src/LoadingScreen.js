import * as THREE from 'three';
import { TTFLoader }   from 'jsm/loaders/TTFLoader.js';
import { Font }        from 'jsm/loaders/FontLoader.js';
import { TextGeometry }from 'jsm/geometries/TextGeometry.js';
import { LineMaterial }from 'jsm/lines/LineMaterial.js';
import { Line2 }       from 'jsm/lines/Line2.js';
import { LineGeometry }from 'jsm/lines/LineGeometry.js';

/* ------------------------------------------------------------------ */
/* tiny helper – strokes around each shape                             */
function createOutline(font, message) {
    const strokeGroup = new THREE.Group();
    let totalDist = 1.0;
    const mat = new LineMaterial({
        color: 0xffffff,
        linewidth: 3,
        dashed: true,
        dashSize: totalDist * 2,
        gapSize: totalDist * 2,
        dashOffset: Math.random() * totalDist,
    });
    mat.resolution.set(window.innerWidth, window.innerHeight);

    function stroke(shape, i = 0.0) {
        let points = shape.getPoints();
        let pts3d = [];
            points.forEach((p) => {
            pts3d.push(p.x, p.y, 0);
        });
        const geo = new LineGeometry();
        geo.setPositions(pts3d);

        totalDist = shape.getLength();
        mat.dashSize  = totalDist * 2;
        mat.gapSize   = totalDist * 2;
        mat.dashOffset= Math.random() * totalDist;

        const mesh = new Line2(geo, mat);
        mesh.computeLineDistances();
        let offset = i * 0;
        mesh.userData.update = (t) => { mesh.material.dashOffset = t * (totalDist*0.25) + offset; };
        return mesh;
    }

    font.generateShapes(message, 1).forEach((s,i)=> {
        strokeGroup.add(stroke(s,i));
        if (s.holes?.length > 0) {
            s.holes.forEach((h) => {
                strokeGroup.add(stroke(h, i));
            });
        }
    });

    //strokeGroup.userData.update = t => strokeGroup.children.forEach(c => c.userData.update(t));
    strokeGroup.update = (t, i) => {
        strokeGroup.children.forEach((c) => {
            c.userData.update?.(t);
        });
    };
    return strokeGroup;
}

export function makeLoadingScreen(msg = 'Loading...') {
    /* create dedicated renderer so we never touch the main WebGL context */
    const canvas    = document.createElement('canvas');
    const renderer  = new THREE.WebGLRenderer({ canvas , alpha:true , antialias:true });
    const scene     = new THREE.Scene();
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const camera    = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    let ready = false; // becomes true once the font is done
    let pendingPct = 0;
    // declare holders so outer scope can access them
    let outline      = null;
    let pctGroup     = null;
    let rebuildPercent = () => {
        console.warn('rebuildPercent() called before font is ready');
    }; // will be replaced later

    /* ---------- async part (font + meshes) -------------------------- */
    (async () =>
    {
        const fontData = await new TTFLoader().loadAsync('./assets/fonts/miso-bold.ttf');
        const font     = new Font(fontData);
        
        const textGroup = new THREE.Group();
        const textProps = {
            font,
            size: 1,
            depth: 0.1,
            curveSegments: 6,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.01,
            bevelOffset: 0,
            bevelSegments: 2,
        };

        const txtGeo = new TextGeometry(msg, textProps);
        txtGeo.computeBoundingBox();
        const baseWidth = txtGeo.boundingBox.max.x - txtGeo.boundingBox.min.x; // <-- width in local units
        const xOff      = -0.5 * baseWidth;    

        const txtMat = new THREE.MeshPhysicalMaterial({
            roughness:0.5, 
            transmission:5, 
            transparent:true, 
            thickness:10
        });
        const txtMesh = new THREE.Mesh(txtGeo, txtMat);
        txtMesh.position.x = xOff;
        textGroup.add(txtMesh);

        outline = createOutline(font, msg);
        outline.position.set(xOff, 0, 0.2);
        textGroup.add(outline);

        textGroup.userData.update = (t) => {
            let timeStep = t * 0.005;
            outline.update(timeStep);
        };

        scene.add(textGroup);

        /* ---------- dynamic % block ------------------------------------ */
        pctGroup   = new THREE.Group();
        const gap        = 0.35;                         // space after “Loading”
        pctGroup.position.x = xOff + baseWidth + gap;    // absolute world X position
        scene.add(pctGroup);

        rebuildPercent = function(p) {
            console.log('rebuilding with percentage', p);
            /* dispose previous */
            pctGroup.children.forEach(c=>{
                c.geometry?.dispose(); c.material?.dispose();
            });
            pctGroup.clear();

            const label = `${p} %`;
            const g     = new TextGeometry(label, textProps);
            const m     = new THREE.Mesh(g, txtMat.clone());
            pctGroup.add(m);

            const outline = createOutline(font, label);
            outline.position.set(0,0,0.2);
            pctGroup.add(outline);

            pctGroup.userData.update = t => outline.update(t);
        }
        rebuildPercent(pendingPct);
        ready = true;
    })();


    /* ---------- public control hooks -------------------------------- */
    function resize(w,h) {
        camera.aspect = w/h;
        camera.updateProjectionMatrix();
        renderer.setSize(w,h,false);
        scene.traverse(obj => {
            if (obj.material && obj.material.isLineMaterial) {
                obj.material.resolution.set(w, h);
            }
        });
    }
    resize(window.innerWidth, window.innerHeight);   // first call

    const clock = new THREE.Clock();
    function update() {
        const t = clock.getElapsedTime();
        // if the font is not ready, we skip 
        // the outline and percent animation
        if (ready) {
            outline.update(t);
            pctGroup.userData.update(t);
        }
        renderer.render(scene,camera);
    }

    return { 
        canvas, update, resize,
        setProgress: p  => { 
            pendingPct = p; 
            if (ready) {
                console.log('AAAAAAAAAAAAAAAAAAAA')
                rebuildPercent(p);
            }
        },
        dispose: () => renderer.dispose() 
    };
}
