import * as THREE from './node_modules/three/build/three.module.js';

import { planetConfig } from "./config.js";

export class PlanetSystem {
  constructor(scene, textureLoader) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.planets = [];
    this.earthAngle = 0;
    this.orbitPaths = [];
    this.createAsteroidBelts();
  }

  createAllPlanets() {
    for (const [name, config] of Object.entries(planetConfig)) {
      if (name === "sun") continue;
      if (name === "earth") {
        const earth = this.createEarth();
        this.createMoon(earth);
      } else if (name !== "moon") {
        this.createPlanet(name, config);
      }
    }
  }

  createPlanet(name, config) {
    const geometry = new THREE.SphereGeometry(config.radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.textureLoader.load(`assets/${config.texture}`),
      metalness: 0.1,
      roughness: 0.5,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.position.set(config.position, 0, 0);
    planet.name = name;
    planet.rotationSpeed = config.rotationSpeed;
    this.planets.push(planet);
    this.scene.add(planet);
    return planet;
  }

  createEarth() {
    const config = planetConfig.earth;
    console.log("Creating Earth with config:", config);

    const earthGeometry = new THREE.SphereGeometry(config.radius, 1024, 1024);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: this.textureLoader.load(config.texture),
      normalMap: this.textureLoader.load(config.normalMap),
      normalScale: new THREE.Vector2(config.normalScale, config.normalScale),
      specularMap: this.textureLoader.load(config.specularMap),
      specular: new THREE.Color(config.specular),
      displacementMap: this.textureLoader.load(config.displacementMap),
      displacementScale: config.displacementScale,
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.set(config.position, 0, 0);
    earth.name = "Earth";
    earth.rotationSpeed = config.rotationSpeed;
    earth.castShadow = true;

    earth.rotateOnAxis(
      new THREE.Vector3(0, 1, 0),
      (config.tilt * Math.PI) / 180
    );

    console.log("Earth object created:", earth);

    const cloudGeometry = new THREE.SphereGeometry(
      config.radius * config.cloudScale,
      1024,
      1024
    );
    console.log("Cloud geometry created:", cloudGeometry);

    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: this.textureLoader.load(config.cloudTexture),
      transparent: true,
    });
    console.log("Cloud material created:", cloudMaterial);

    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    clouds.name = "Clouds";
    console.log("Cloud mesh created:", clouds);

    earth.add(clouds);
    console.log("Clouds added to Earth");
    console.log("Earth children:", earth.children);

    this.planets.push(earth);
    this.scene.add(earth);
    return earth;
  }
  createMoon(earth) {
    const config = planetConfig.moon;
    const moonGeometry = new THREE.SphereGeometry(config.radius, 64, 64);
    const moonMaterial = new THREE.MeshPhongMaterial({
      map: this.textureLoader.load(`assets/${config.texture}`),
      shadowSide: THREE.FrontSide,
      depthWrite: true,
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(config.position, 0, 0);
    moon.name = "Moon";
    moon.rotationSpeed = config.rotationSpeed;
    moon.receiveShadow = true;
    earth.add(moon);
    return moon;
  }

  createAsteroidBelts() {
    console.log("Creating asteroid belts");
    const asteroidCount = 800;
    const maxSize = 0.1;
    const asteroidTexture = this.textureLoader.load("assets/asteroids.avif");
    const asteroidMaterial = new THREE.MeshPhongMaterial({
      map: asteroidTexture,
      shininess: 0,
      specular: 0x000000,
    });

    this.asteroidBelt = new THREE.Group();

    for (let i = 0; i < asteroidCount; i++) {
      const size = Math.random() * maxSize;
      const asteroidGeometry = new THREE.SphereGeometry(size, 8, 8);
      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
      const radius = Math.random() * 5 + 26;
      const theta = Math.random() * Math.PI * 2;

      asteroid.position.x = radius * Math.cos(theta);
      asteroid.position.y = (Math.random() - 0.5) * 2;
      asteroid.position.z = radius * Math.sin(theta);

      asteroid.rotation.x = Math.random() * Math.PI;
      asteroid.rotation.y = Math.random() * Math.PI;
      asteroid.rotation.z = Math.random() * Math.PI;

      this.asteroidBelt.add(asteroid);
    }

    this.scene.add(this.asteroidBelt);
    console.log("Asteroid belt created and added to scene");
  }
  getEarth() {
    return this.planets.find((planet) => planet.name === "Earth");
  }

  getEarthDays() {
    const daysInYear = 365.25;
    let days = Math.floor((this.earthAngle / (2 * Math.PI)) * daysInYear);
    return (days + daysInYear) % daysInYear;
  }

  rotatePlanets(speedMultiplier) {
    const earthYearAngle = (2 * Math.PI * speedMultiplier) / 365.25;

    this.planets.forEach((planet) => {
      const config = planetConfig[planet.name.toLowerCase()];
      if (config) {
        const planetOrbitSpeed = earthYearAngle * config.orbitSpeed;
        const angle =
          Math.atan2(planet.position.z, planet.position.x) + planetOrbitSpeed;
        const distance = planet.position.length();
        planet.position.x = Math.cos(angle) * distance;
        planet.position.z = Math.sin(angle) * distance;

        planet.rotation.y += config.rotationSpeed * speedMultiplier;

        if (planet.name === "Earth") {
          // Earth's rotation around its tilted axis
          planet.rotateOnAxis(
            new THREE.Vector3(0, 1, 0).applyAxisAngle(
              new THREE.Vector3(0, 0, 1),
              (23 * Math.PI) / 180
            ),
            earthYearAngle * 365.25 // Earth rotates 365.25 times per orbit
          );

          this.earthAngle = angle;

          const clouds = planet.getObjectByName("Clouds");
          if (clouds) {
            clouds.rotation.y +=
              planetConfig.earth.cloudRotationSpeed * speedMultiplier;
          }

          // Moon's orbit around Earth
          const moon = planet.children.find((child) => child.name === "Moon");
          if (moon) {
            const moonOrbitSpeed = earthYearAngle * 13.37; // Moon orbits 13.37 times per Earth year
            const moonAngle =
              Math.atan2(moon.position.z, moon.position.x) + moonOrbitSpeed;
            const moonDistance = moon.position.length();
            moon.position.x = Math.cos(moonAngle) * moonDistance;
            moon.position.z = Math.sin(moonAngle) * moonDistance;

            moon.lookAt(planet.position);
          }
        }
      }
    });
  }

  createOrbitPaths() {
    this.planets.forEach((planet) => {
      if (planet.name !== "Sun") {
        const orbitRadius = planet.position.length();
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
          new THREE.Path()
            .absarc(0, 0, orbitRadius, 0, Math.PI * 2, true)
            .getPoints(128)
        );
        const orbitMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
        });
        const orbitPath = new THREE.LineLoop(orbitGeometry, orbitMaterial);
        orbitPath.rotation.x = Math.PI / 2;
        this.orbitPaths.push(orbitPath);
        this.scene.add(orbitPath);
      }
    });
  }

  updateOrbitPathsOpacity(opacity) {
    this.orbitPaths.forEach((path) => {
      path.material.opacity = opacity;
    });
  }
}
