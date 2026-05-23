import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PlanetSystem } from "./PlanetSystem.js";
import { planetConfig } from "./config.js";

class SolarSystemSimulation {
  constructor(
    radius,
    texture,
    position,
    rotationSpeed,
    orbitRadius,
    orbitSpeed,
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.textureLoader = new THREE.TextureLoader();
    this.planetSystem = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.speedLevels = [
      0.000001, 0.00001, 0.0001, 0.001, 0.01, 0.1, 1, 10, 100,
    ];
    this.orbitSpeedMultiplier = this.speedLevels[0];
    this.focusedBody = null;
    this.cameraDistance = 5;
    this.savedCameraOffset = new THREE.Vector3();
    this.currentBackground = "stars";
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupCamera();
    this.createLights();
    this.createStarField();
    this.createSun();
    this.createPlanets();
    this.setupEventListeners();
    this.setupMouseControls();
    this.createFocusPlanetButtons();
    this.setupEarthTextureControls();
    this.animate();
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
  }

  setupCamera() {
    this.camera.position.set(-10, 10, 30);
  }

  createLights() {
    const sunlightIntensity = parseFloat(
      document.getElementById("sunlight").value,
    );
    const ambientIntensity = parseFloat(
      document.getElementById("ambient").value,
    );

    this.sunLight = new THREE.PointLight(0xffffff, sunlightIntensity, 200);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity);
    this.scene.add(this.ambientLight);
  }

  createStarField() {
    const starGeometry = new THREE.SphereGeometry(1500, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
      map: this.textureLoader.load("assets/stars.jpg"),
      side: THREE.BackSide,
    });
    this.starField = new THREE.Mesh(starGeometry, starMaterial);
    this.scene.add(this.starField);

    const milkyWayMaterial = new THREE.MeshBasicMaterial({
      map: this.textureLoader.load("assets/stars_milky_way.jpg"),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
    });
    this.milkyWayField = new THREE.Mesh(starGeometry, milkyWayMaterial);
    this.scene.add(this.milkyWayField);
  }

  toggleBackground() {
    if (this.currentBackground === "stars") {
      this.milkyWayField.material.opacity = 1;
      this.currentBackground = "milkyWay";
    } else {
      this.milkyWayField.material.opacity = 0;
      this.currentBackground = "stars";
    }
  }

  createSun() {
    const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: this.textureLoader.load("assets/sun.jpg"),
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    // this.sun.castShadow = true;
    this.scene.add(this.sun);
  }

  createPlanets() {
    this.planetSystem = new PlanetSystem(this.scene, this.textureLoader);
    this.planetSystem.createAllPlanets();
    this.planetSystem.createOrbitPaths();
  }

  setupEventListeners() {
    document
      .getElementById("background-select")
      .addEventListener("click", () => this.toggleBackground());

    window.addEventListener("resize", () => this.onWindowResize());
    document
      .getElementById("orbit-speed")
      .addEventListener("input", (e) => this.updateOrbitSpeed(e));
    document
      .getElementById("orbit-path-opacity")
      .addEventListener("input", (e) => this.updateOrbitPathOpacity(e));
    this.setupEarthTextureControls();
    document.getElementById("sunlight").addEventListener("input", (e) => {
      this.sunLight.intensity = parseFloat(e.target.value);

      document.getElementById("ambient").addEventListener("input", (e) => {
        this.ambientLight.intensity = parseFloat(e.target.value);
      });
    });

    this.renderer.domElement.addEventListener("wheel", (event) => {
      if (this.focusedBody) {
        this.cameraDistance += event.deltaY * 0.01;
        this.cameraDistance = Math.max(
          this.focusedBody.geometry.parameters.radius * 1.1,
          this.cameraDistance,
        );
        this.cameraDistance = Math.min(
          this.focusedBody.geometry.parameters.radius * 50,
          this.cameraDistance,
        );
        this.savedCameraOffset.setLength(this.cameraDistance);
        this.updateCameraPosition();
      }
    });

    document
      .getElementById("toggle-asteroids")
      .addEventListener("click", () => this.toggleAsteroids());
  }

  toggleAsteroids() {
    console.log("Toggling asteroids");
    if (this.planetSystem.asteroidBelt) {
      this.planetSystem.asteroidBelt.visible =
        !this.planetSystem.asteroidBelt.visible;
      console.log(
        "Asteroid belt visibility:",
        this.planetSystem.asteroidBelt.visible,
      );
      const button = document.getElementById("toggle-asteroids");
      button.classList.toggle("on", this.planetSystem.asteroidBelt.visible);
      button.classList.toggle("off", !this.planetSystem.asteroidBelt.visible);
    } else {
      console.log("Asteroid belt not found");
    }
  }

  setupEarthTextureControls() {
    const earth = this.planetSystem.getEarth();
    const earthMaterial = earth.material;
    const clouds = earth.getObjectByName("Clouds");
    console.log("Found clouds object:", clouds);
    if (clouds) {
      console.log("Clouds visibility:", clouds.visible);
      console.log("Clouds material:", clouds.material);
    }

    document
      .getElementById("earth-normalscale")
      .addEventListener("input", (e) => {
        const scale = parseFloat(e.target.value);
        earth.material.normalScale.set(scale, scale);
        earth.material.needsUpdate = true;
      });

    document
      .getElementById("earth-specular-intensity")
      .addEventListener("input", (e) => {
        earth.material.specular.setScalar(parseFloat(e.target.value));
        earth.material.needsUpdate = true;
      });

    document
      .getElementById("earth-displacement-scale")
      .addEventListener("input", (e) => {
        earth.material.displacementScale = parseFloat(e.target.value);
        earth.material.needsUpdate = true;
      });

    document.getElementById("earth-daymap").addEventListener("change", (e) => {
      earthMaterial.map = e.target.checked
        ? this.textureLoader.load("assets/earthHD.jpg")
        : null;
      earthMaterial.needsUpdate = true;
    });

    document
      .getElementById("earth-normalmap")
      .addEventListener("change", (e) => {
        earthMaterial.normalMap = e.target.checked
          ? this.textureLoader.load("assets/earth_normal_map.jpeg")
          : null;
        earthMaterial.needsUpdate = true;
      });

    document
      .getElementById("earth-specular")
      .addEventListener("change", (e) => {
        earthMaterial.specularMap = e.target.checked
          ? this.textureLoader.load("assets/earth_specular_map.tif")
          : null;
        earthMaterial.needsUpdate = true;
      });

    document
      .getElementById("earth-displacement")
      .addEventListener("change", (e) => {
        earthMaterial.displacementMap = e.target.checked
          ? this.textureLoader.load("assets/earth_bathymetry.jpg")
          : null;
        earthMaterial.needsUpdate = true;
      });

    document.getElementById("earth-clouds").addEventListener("change", (e) => {
      const clouds = earth.getObjectByName("Clouds");
      if (clouds) {
        clouds.visible = e.target.checked;
      }
    });
  }

  updateOrbitSpeed(event) {
    const sliderValue = parseInt(event.target.value);
    this.orbitSpeedMultiplier = this.speedLevels[sliderValue];
  }

  updateOrbitPathOpacity(event) {
    const opacity = parseFloat(event.target.value);
    this.planetSystem.updateOrbitPathsOpacity(opacity);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createFocusPlanetButtons() {
    const buttonContainer = document.getElementById("planet-buttons");

    // Add Sun button
    const sunButton = document.createElement("button");
    sunButton.textContent = "Sun";
    sunButton.addEventListener("click", () =>
      this.focusOnCelestialBody(this.sun),
    );
    buttonContainer.appendChild(sunButton);

    // Add other planet buttons
    this.planetSystem.planets.forEach((celestialBody) => {
      const button = document.createElement("button");
      button.textContent = celestialBody.name;
      button.addEventListener("click", () =>
        this.focusOnCelestialBody(celestialBody),
      );
      buttonContainer.appendChild(button);

      if (celestialBody.name === "Earth") {
        const moon = celestialBody.children.find(
          (child) => child.name === "Moon",
        );
        if (moon) {
          const moonButton = document.createElement("button");
          moonButton.textContent = "Moon";
          moonButton.addEventListener("click", () =>
            this.focusOnCelestialBody(moon),
          );
          buttonContainer.appendChild(moonButton);
        }
      }
    });
  }

  focusOnCelestialBody(celestialBody) {
    this.focusedBody = celestialBody;
    this.cameraDistance = celestialBody.geometry.parameters.radius * 5;
    this.savedCameraOffset.set(
      this.cameraDistance,
      this.cameraDistance,
      this.cameraDistance,
    );
    this.updateCameraPosition();
  }

  updateCameraPosition() {
    if (!this.focusedBody) return;

    const position = new THREE.Vector3();
    this.focusedBody.getWorldPosition(position);
    this.controls.target.copy(position);

    this.camera.position.copy(position).add(this.savedCameraOffset);
    this.camera.lookAt(this.controls.target);
  }

  setupMouseControls() {
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener("mousedown", (event) => {
      this.isDragging = true;
    });

    this.renderer.domElement.addEventListener("mouseup", (event) => {
      this.isDragging = false;
    });

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      if (this.isDragging && this.focusedBody) {
        const deltaMove = {
          x: event.offsetX - this.previousMousePosition.x,
          y: event.offsetY - this.previousMousePosition.y,
        };

        const rotationSpeed = 0.005;
        const spherical = new THREE.Spherical().setFromVector3(
          this.savedCameraOffset,
        );

        spherical.theta -= deltaMove.x * rotationSpeed;
        spherical.phi -= deltaMove.y * rotationSpeed;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        this.savedCameraOffset.setFromSpherical(spherical);
      }

      this.previousMousePosition = {
        x: event.offsetX,
        y: event.offsetY,
      };
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.planetSystem.rotatePlanets(this.orbitSpeedMultiplier);
    this.updateCameraPosition();
    this.updateDayCounter();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateDayCounter() {
    const earthDays = Math.floor(this.planetSystem.getEarthDays());
    document.getElementById("day-counter").textContent =
      `Earth Days: ${earthDays}`;
  }
}

const solarSystem = new SolarSystemSimulation();
