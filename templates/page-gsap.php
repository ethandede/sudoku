<?php
/*
 * Template Name: GSAP Page
 */
get_header();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plexus-Inspired Floating Network (Fixed Velocity Slider)</title>
    <style>
        body {
            margin: 0;
            height: 100vh;
            background: #0a0a0a;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        canvas {
            width: 100%;
            height: 100%;
        }
        #controls {
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 5px;
        }
        #controls div {
            margin: 5px 0;
        }
        input[type="range"] {
            width: 150px;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="controls">
        <div>
            <label for="particleCount">Particles (10-100): </label>
            <input type="range" id="particleCount" min="10" max="100" value="50">
            <span id="particleCountValue">50</span>
        </div>
        <div>
            <label for="maxConnections">Max

 Connections (1-10): </label>
            <input type="range" id="maxConnections" min="1" max="10" value="6">
            <span id="maxConnectionsValue">6</span>
        </div>
        <div>
            <label for="maxDistance">Max Distance (50-500): </label>
            <input type="range" id="maxDistance" min="50" max="500" value="300">
            <span id="maxDistanceValue">300</span>
        </div>
        <div>
            <label for="velocity">Velocity (0-1): </label>
            <input type="range" id="velocity" min="0" max="1" value="0.5" step="0.01">
            <span id="velocityValue">0.5</span>
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script>
        const canvas = document.getElementById("canvas");
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.z = 400;

        const group = new THREE.Group();
        scene.add(group);

        // Initial variables
        let particleCount = 500;
        let maxConnections = 6;
        let maxDistance = 300;
        let velocityScale = 0.5;

        // Particle system
        let positions = new Float32Array(particleCount * 3);
        let baseVelocities = new Float32Array(particleCount * 3); // Base velocities to scale

        function initParticles() {
            positions = new Float32Array(particleCount * 3);
            baseVelocities = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 0.8;
                positions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight * 0.8;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

                baseVelocities[i * 3] = (Math.random() - 0.5) * 1; // Base speed
                baseVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1;
                baseVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1;
            }
            particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            updateLinesBuffer();
        }

        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: { pointSize: { value: 5.0 } },
            vertexShader: `
                uniform float pointSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = pointSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(0.0, 0.6, 1.0, 1.0);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(particles);

        // Line connections
        let linePositions = new Float32Array(particleCount * maxConnections * 3);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aaff, opacity: 0.3, transparent: true });
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
        group.add(lineSegments);

        function updateLinesBuffer() {
            linePositions = new Float32Array(particleCount * maxConnections * 3);
            lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        }

        initParticles();

        // Slider controls
        const particleCountSlider = document.getElementById("particleCount");
        const maxConnectionsSlider = document.getElementById("maxConnections");
        const maxDistanceSlider = document.getElementById("maxDistance");
        const velocitySlider = document.getElementById("velocity");

        particleCountSlider.addEventListener("input", (e) => {
            particleCount = parseInt(e.target.value);
            document.getElementById("particleCountValue").textContent = particleCount;
            initParticles();
        });

        maxConnectionsSlider.addEventListener("input", (e) => {
            maxConnections = parseInt(e.target.value);
            document.getElementById("maxConnectionsValue").textContent = maxConnections;
            updateLinesBuffer();
        });

        maxDistanceSlider.addEventListener("input", (e) => {
            maxDistance = parseInt(e.target.value);
            document.getElementById("maxDistanceValue").textContent = maxDistance;
        });

        velocitySlider.addEventListener("input", (e) => {
            velocityScale = parseFloat(e.target.value);
            document.getElementById("velocityValue").textContent = velocityScale.toFixed(2);
            console.log("Velocity Scale:", velocityScale); // Debug log
        });

        // Animation loop
        function animate() {
            const posArray = particles.geometry.attributes.position.array;

            for (let i = 0; i < particleCount; i++) {
                const ix = i * 3, iy = ix + 1, iz = ix + 2;
                // Apply velocityScale to base velocities each frame
                posArray[ix] += baseVelocities[ix] * velocityScale;
                posArray[iy] += baseVelocities[iy] * velocityScale;
                posArray[iz] += baseVelocities[iz] * velocityScale;

                const halfWidth = window.innerWidth * 0.45;
                const halfHeight = window.innerHeight * 0.45;
                const zDepth = 500;

                posArray[ix] = Math.min(Math.max(posArray[ix], -halfWidth), halfWidth);
                posArray[iy] = Math.min(Math.max(posArray[iy], -halfHeight), halfHeight);
                posArray[iz] = Math.min(Math.max(posArray[iz], -zDepth), zDepth);

                if (posArray[ix] >= halfWidth || posArray[ix] <= -halfWidth) baseVelocities[ix] *= -0.95;
                if (posArray[iy] >= halfHeight || posArray[iy] <= -halfHeight) baseVelocities[iy] *= -0.95;
                if (posArray[iz] >= zDepth || posArray[iz] <= -zDepth) baseVelocities[iz] *= -0.95;
            }
            particles.geometry.attributes.position.needsUpdate = true;

            let lineIndex = 0;
            const connections = new Array(particleCount).fill(0);

            for (let i = 0; i < particleCount; i++) {
                if (connections[i] >= maxConnections) continue;
                const ax = posArray[i * 3], ay = posArray[i * 3 + 1], az = posArray[i * 3 + 2];

                const distances = [];
                for (let j = 0; j < particleCount; j++) {
                    if (i === j || connections[j] >= maxConnections) continue;
                    const bx = posArray[j * 3], by = posArray[j * 3 + 1], bz = posArray[j * 3 + 2];
                    const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
                    if (dist < maxDistance) distances.push({ j, dist });
                }

                distances.sort((a, b) => a.dist - b.dist);
                for (let k = 0; k < Math.min(maxConnections - connections[i], distances.length); k++) {
                    const j = distances[k].j;
                    if (connections[j] >= maxConnections) continue;

                    const bx = posArray[j * 3], by = posArray[j * 3 + 1], bz = posArray[j * 3 + 2];
                    linePositions[lineIndex * 6] = ax;
                    linePositions[lineIndex * 6 + 1] = ay;
                    linePositions[lineIndex * 6 + 2] = az;
                    linePositions[lineIndex * 6 + 3] = bx;
                    linePositions[lineIndex * 6 + 4] = by;
                    linePositions[lineIndex * 6 + 5] = bz;
                    lineIndex++;
                    connections[i]++;
                    connections[j]++;
                }
            }
            lineGeometry.attributes.position.array.set(linePositions, 0);
            lineGeometry.attributes.position.needsUpdate = true;
            lineGeometry.setDrawRange(0, lineIndex * 2);

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        animate();

        gsap.to(group.rotation, {
            y: Math.PI * 2,
            duration: 20000,
            repeat: -1,
            ease: "none"
        });

        window.addEventListener("resize", () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            const posArray = particles.geometry.attributes.position.array;
            const halfWidth = window.innerWidth * 0.45;
            const halfHeight = window.innerHeight * 0.45;
            for (let i = 0; i < particleCount; i++) {
                posArray[i * 3] = Math.min(Math.max(posArray[i * 3], -halfWidth), halfWidth);
                posArray[i * 3 + 1] = Math.min(Math.max(posArray[i * 3 + 1], -halfHeight), halfHeight);
            }
        });
    </script>
</body>
</html>