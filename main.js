// Main module: builds a 3D starfield + glowing falling word sprites
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js';

const container = document.body;

// If the module fails to load (for example when opened with file://),
// the overlay in `index.html` will remain visible and instruct the user.
// When the script runs successfully, hide the overlay so the scene is visible.
const errorOverlay = document.getElementById && document.getElementById('errorOverlay');
if(errorOverlay){ errorOverlay.classList.add('hidden'); }

// Global error handlers to show helpful messages on-screen
window.addEventListener('error', (ev) => {
  console.error('Runtime error', ev.error || ev.message);
  if(errorOverlay){
    errorOverlay.classList.remove('hidden');
    const card = errorOverlay.querySelector('.card');
    if(card) card.innerHTML = `<h2>Runtime error</h2><p>Check the Console for details.</p><pre>${(ev.error && ev.error.message) || ev.message}</pre>`;
  }
});
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection', ev.reason);
  if(errorOverlay){
    errorOverlay.classList.remove('hidden');
    const card = errorOverlay.querySelector('.card');
    if(card) card.innerHTML = `<h2>Unhandled promise rejection</h2><pre>${String(ev.reason)}</pre>`;
  }
});

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
container.appendChild(renderer.domElement);

// scene & camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 80);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.minDistance = 20;
controls.maxDistance = 300;

// starfield
function makeStarfield(count = 2000){
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for(let i=0;i<count;i++){
    const r = 300;
    const x = (Math.random() - 0.5) * r;
    const y = (Math.random() - 0.5) * r * 0.6;
    const z = (Math.random() - 0.5) * r;
    positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
    const c = 0.6 + Math.random()*0.4;
    colors[i*3] = c; colors[i*3+1] = c; colors[i*3+2] = 1.0;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent:true, opacity:0.9 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
}
makeStarfield(2500);

// soft nebula plane (radial gradient canvas texture)
function makeNebula(){
  const size = 1024;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createRadialGradient(size*0.45,size*0.35,40,size*0.5,size*0.45,size*0.9);
  grad.addColorStop(0,'rgba(120,80,200,0.7)');
  grad.addColorStop(0.4,'rgba(60,100,200,0.35)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(cvs);
  const geo = new THREE.PlaneGeometry(400, 400, 1,1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true, depthWrite:false });
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(0,10,-80); mesh.rotation.set(0,0,0);
  scene.add(mesh);
}
makeNebula();

// words sprites
let sprites = [];

// Hard-coded words list — edit this array to change what's displayed.
const WORDS = [
  '✨ Hello', '🌟 Cute', 'galaxy', 'love', 'peace', '💫', 'dream', 'starlight', '✨', '🌙', '☄️'
];

function makeTextSprite(text, opts = {}){
  const font = opts.font || '40px Arial';
  const padding = opts.padding ?? 30;
  const color = opts.color || '#ffffff';
  const glow = opts.glow || '#7af0ff';
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + padding*2;
  const h = Math.ceil(parseInt(font,10)) + padding*2;
  cvs.width = w; cvs.height = h;
  const ctx2 = cvs.getContext('2d');
  ctx2.clearRect(0,0,w,h);
  ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.font = font;
  // glow using shadow
  ctx2.shadowColor = glow;
  ctx2.shadowBlur = 28;
  ctx2.fillStyle = color;
  ctx2.fillText(text, w/2, h/2);
  // small soft outer stroke
  ctx2.lineWidth = 2; ctx2.strokeStyle = 'rgba(255,255,255,0.08)'; ctx2.strokeText(text, w/2, h/2);
  const texture = new THREE.CanvasTexture(cvs); texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent:true, depthTest:true, blending:THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  const scale = opts.scale || 0.09;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}

function spawnWords(list){
  // remove existing
  sprites.forEach(s => { scene.remove(s.obj); if(s.obj.material.map) s.obj.material.map.dispose(); s.obj.material.dispose(); });
  sprites = [];
  const count = list.length;
  for(let i=0;i<count;i++){
    const text = list[i].trim(); if(!text) continue;
    const spr = makeTextSprite(text, {font:'56px system-ui, Arial', glow:'#9dfcff', scale:0.08});
    // position across width and stagger vertically so they behave like rain
    spr.position.x = (Math.random() - 0.5) * 180;
    spr.position.y = 80 + Math.random() * 240;
    spr.position.z = (Math.random() - 0.5) * 100;
    scene.add(spr);
    // rain-like: faster vertical speed, minimal sway
    sprites.push({obj: spr, speed: 0.6 + Math.random()*0.9, sway: (Math.random()*0.2+0.05), baseX: spr.position.x});
  }
}
// initial spawn using the hard-coded list
spawnWords(WORDS);

// animation loop
let last = performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now(); const dt = (now - last) / 16.666; last = now;
  // update sprites fall — rain-like vertical motion with slight horizontal drift
  const spdFactor = 1.0;
  sprites.forEach(s => {
    s.obj.position.y -= s.speed * spdFactor * dt * 0.6; // tune global fall speed
    // very small horizontal drift for a gentle cute effect
    s.obj.position.x = s.baseX + Math.sin(now * 0.001 * s.sway) * (2 + s.sway * 2);
    s.obj.material.opacity = 0.95;
    if(s.obj.position.y < -140){
      s.obj.position.y = 180 + Math.random()*60;
      s.baseX = (Math.random() - 0.5) * 180;
      s.obj.position.z = (Math.random() - 0.5) * 120;
    }
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();

// handle resize
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
