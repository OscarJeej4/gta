import * as THREE from 'https://cdn.skypack.dev/three@0.160.1';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let player, car, policeCar;
let inCar = false;
let keys = {};

const bullets = [];
const bulletSpeed = 1;

let buildings, pedestrians, train, trafficLights = [];

init();
animate();

function init() {
  // Scene and camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 50, 50);
  camera.lookAt(0, 0, 0);


  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game') });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Ground
  const texture = new THREE.TextureLoader().load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ map: texture })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings
  buildings = new THREE.Group();
  for(let i = 0; i < 30; i++) {
    const h = Math.random() * 20 + 10;
    const geometry = new THREE.BoxGeometry(5, h, 5);
    const material = new THREE.MeshStandardMaterial({color: 0x808080});
    const building = new THREE.Mesh(geometry, material);
    building.position.set(
      (Math.random() - 0.5) * 200,
      h / 2,
      (Math.random() - 0.5) * 200
    );
    buildings.add(building);
  }
  scene.add(buildings);

  // Pedestrians
  pedestrians = new THREE.Group();
  for (let i = 0; i < 20; i++) {
    const geom = new THREE.BoxGeometry(0.5, 1.7, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const ped = new THREE.Mesh(geom, mat);
    ped.position.set(
      (Math.random() - 0.5) * 100,
      0.85,
      (Math.random() - 0.5) * 100
    );
    ped.userData = { direction: new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize() };
    pedestrians.add(ped);
  }
  scene.add(pedestrians);

  // Train
  train = new THREE.Group();
  const engine = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2, 5),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  train.add(engine);
  train.position.set(-50, 1, -20);
  scene.add(train);
  window.trainSpeed = 0.1;

  // Traffic Lights
  trafficLights = [];
  function createTrafficLight(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    pole.position.set(x, 1.5, z);
    scene.add(pole);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    light.position.set(x, 2.8, z);
    scene.add(light);

    return { pole, light, state: 'red', timer: 0 };
  }
  trafficLights.push(createTrafficLight(0, 0));
  trafficLights.push(createTrafficLight(10, 10));

  // Load Player Model
  const loader = new GLTFLoader();
  loader.load('https://models.babylonjs.com/Dude/dude.gltf', function (gltf) {
    player = gltf.scene;
    player.scale.set(0.08, 0.08, 0.08);
    player.position.set(0, 0, 0);
    scene.add(player);
  });

  // Load Car Model
  loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleCar/glTF/SimpleCar.gltf', function (gltf) {
    car = gltf.scene;
    car.scale.set(1.5, 1.5, 1.5);
    car.position.set(5, 0, 0);
    scene.add(car);
  });

  // Load Police Car
  loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleCar/glTF/SimpleCar.gltf', function(gltf) {
    policeCar = gltf.scene;
    policeCar.scale.set(1.5, 1.5, 1.5);
    policeCar.position.set(-20, 0, -20);
    scene.add(policeCar);
  });

  // Input Events
  window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
  window.addEventListener('click', shootBullet);

  addTouchControl('up', 'w');
  addTouchControl('down', 's');
  addTouchControl('left', 'a');
  addTouchControl('right', 'd');

  document.getElementById('enterCar').addEventListener('click', toggleCar);

  window.addEventListener('resize', onWindowResize);
}

function addTouchControl(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', () => keys[key] = true);
  el.addEventListener('touchend', () => keys[key] = false);
}

function toggleCar() {
  if (!player || !car) return;
  const distance = player.position.distanceTo(car.position);
  if (distance < 5) {
    inCar = !inCar;
    if (inCar) player.visible = false;
    else {
      player.visible = true;
      player.position.set(car.position.x + 2, 0, car.position.z);
    }
  }
}

function checkCollision(position) {
  const buffer = 1;
  let collided = false;
  buildings.children.forEach(building => {
    const bPos = building.position;
    const bSize = building.geometry.parameters;
    if (
      position.x > bPos.x - bSize.width / 2 - buffer &&
      position.x < bPos.x + bSize.width / 2 + buffer &&
      position.z > bPos.z - bSize.depth / 2 - buffer &&
      position.z < bPos.z + bSize.depth / 2 + buffer
    ) collided = true;
  });
  return collided;
}

function shootBullet() {
  if (!player || inCar) return;

  const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  bullet.position.copy(player.position);
  bullet.position.y += 1;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  bullet.userData = { velocity: dir.clone().multiplyScalar(bulletSpeed) };

  scene.add(bullet);
  bullets.push(bullet);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}

function update() {
  const moveSpeed = 0.2;

  // Player Movement with collision
  if (player && !inCar) {
    let newPos = player.position.clone();
    if (keys['w']) newPos.z -= moveSpeed;
    if (keys['s']) newPos.z += moveSpeed;
    if (keys['a']) newPos.x -= moveSpeed;
    if (keys['d']) newPos.x += moveSpeed;

    if (!checkCollision(newPos)) player.position.copy(newPos);

    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);
  }

  // Car Movement with collision
  if (car && inCar) {
    let newPos = car.position.clone();
    if (keys['w']) newPos.z -= moveSpeed * 2;
    if (keys['s']) newPos.z += moveSpeed * 2;
    if (keys['a']) newPos.x -= moveSpeed * 2;
    if (keys['d']) newPos.x += moveSpeed * 2;

    if (!checkCollision(newPos)) car.position.copy(newPos);

    camera.position.x = car.position.x;
    camera.position.z = car.position.z + 15;
    camera.lookAt(car.position);
  }

  // Pedestrians AI
  pedestrians.children.forEach(ped => {
    const pos = ped.position.clone();
    pos.addScaledVector(ped.userData.direction, 0.02);
    if (pos.x > 50 || pos.x < -50 || pos.z > 50 || pos.z < -50 || checkCollision(pos)) {
      ped.userData.direction.negate();
    } else {
      ped.position.copy(pos);
    }
  });

  // Bullets update
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.add(b.userData.velocity);
    if (b.position.length() > 200) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }

  // Train movement
  if (train) {
    train.position.x += window.trainSpeed;
    if (train.position.x > 50) train.position.x = -50;
  }

  // Traffic Lights update
  trafficLights.forEach(tl => {
    tl.timer += 1;
    if (tl.timer > 300) {
      tl.state = tl.state === 'red' ? 'green' : 'red';
      tl.light.material.color.set(tl.state === 'red' ? 0xff0000 : 0x00ff00);
      tl.timer = 0;
    }
  });

  // Police chase player if wanted (shooted)
  if (policeCar && player) {
    if (bullets.length > 0) {
      const dir = player.position.clone().sub(policeCar.position).normalize();
      policeCar.position.add(dir.multiplyScalar(0.15));
      policeCar.lookAt(player.position);
    }
  }
}
