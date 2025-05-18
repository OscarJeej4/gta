import * as THREE from 'https://cdn.skypack.dev/three@0.160.1';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, player, car;
let keys = {};
let inCar = false;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game') });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  const texture = new THREE.TextureLoader().load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(50, 50);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ map: texture })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const loader = new GLTFLoader();
  loader.load('https://models.babylonjs.com/Dude/dude.gltf', function (gltf) {
    player = gltf.scene;
    player.scale.set(0.1, 0.1, 0.1);
    player.position.set(0, 0, 0);
    scene.add(player);
  });

  loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleCar/glTF/SimpleCar.gltf', function (gltf) {
    car = gltf.scene;
    car.scale.set(1, 1, 1);
    car.position.set(5, 0, 0);
    scene.add(car);
  });

  window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

  document.getElementById('up').addEventListener('touchstart', () => keys['w'] = true);
  document.getElementById('up').addEventListener('touchend', () => keys['w'] = false);
  document.getElementById('down').addEventListener('touchstart', () => keys['s'] = true);
  document.getElementById('down').addEventListener('touchend', () => keys['s'] = false);
  document.getElementById('left').addEventListener('touchstart', () => keys['a'] = true);
  document.getElementById('left').addEventListener('touchend', () => keys['a'] = false);
  document.getElementById('right').addEventListener('touchstart', () => keys['d'] = true);
  document.getElementById('right').addEventListener('touchend', () => keys['d'] = false);

  document.getElementById('enterCar').addEventListener('click', () => {
    if (player && car) {
      const distance = player.position.distanceTo(car.position);
      if (distance < 3) {
        inCar = !inCar;
        if (inCar) {
          player.visible = false;
        } else {
          player.visible = true;
          player.position.copy(car.position).add(new THREE.Vector3(2, 0, 0));
        }
      }
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}

function update() {
  if (!player || !car) return;

  const speed = 0.1;
  const target = inCar ? car : player;

  if (keys['w']) target.position.z -= speed;
  if (keys['s']) target.position.z += speed;
  if (keys['a']) target.position.x -= speed;
  if (keys['d']) target.position.x += speed;

  camera.position.x = target.position.x;
  camera.position.z = target.position.z + 10;
  camera.lookAt(target.position);
}
