let video;
let bodyPose;
let poses = [];
let poseHistory = []; // Array to store pose history
const maxHistoryLength = 30; // Number of past poses to show
const blurRadius = 20; // Radius for blending poses
let connections;
let recordButton;
let isRecording = false;

// Three.js variables
let camera3D, scene, renderer;
let posePoints = [];
let poseLines = [];

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  // Set up Three.js scene
  scene = new THREE.Scene();
  camera3D = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Set up video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();

  // Create record/stop button
  recordButton = createButton('⏺️');
  recordButton.position(10, window.innerHeight + 10);
  recordButton.mousePressed(toggleRecording);
  recordButton.style('font-size', '24px');
  recordButton.style('padding', '5px 15px');

  // Position camera
  camera3D.position.z = 500;

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  animate();
}

function toggleRecording() {
  isRecording = !isRecording;
  if (isRecording) {
    recordButton.html('⏹️'); // Stop symbol
    poseHistory = []; // Clear history when starting new recording
  } else {
    recordButton.html('⏺️'); // Record symbol
  }
}

function animate() {
  requestAnimationFrame(animate);
  updatePoses();
  renderer.render(scene, camera3D);
}

function updatePoses() {
  // Remove old points and lines
  posePoints.forEach(point => scene.remove(point));
  poseLines.forEach(line => scene.remove(line));
  posePoints = [];
  poseLines = [];

  if (poses.length > 0 && connections && connections.length > 0) {
    // Draw current pose
    const pose = poses[0];
    
    // Draw keypoints
    if (pose.keypoints) {
      pose.keypoints.forEach(keypoint => {
        if (keypoint.confidence > 0.1) {
          const geometry = new THREE.SphereGeometry(5);
          const material = new THREE.MeshPhongMaterial({color: 0x00ff00});
          const sphere = new THREE.Mesh(geometry, material);
          // Convert coordinates to Three.js space
          sphere.position.set(keypoint.x - 320, -keypoint.y + 240, 0);
          scene.add(sphere);
          posePoints.push(sphere);
        }
      });

      // Draw skeleton
      connections.forEach(connection => {
        const pointA = pose.keypoints[connection[0]];
        const pointB = pose.keypoints[connection[1]];
        
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          const material = new THREE.LineBasicMaterial({color: 0xff0000});
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pointA.x - 320, -pointA.y + 240, 0),
            new THREE.Vector3(pointB.x - 320, -pointB.y + 240, 0)
          ]);
          const line = new THREE.Line(geometry, material);
          scene.add(line);
          poseLines.push(line);
        }
      });
    }

    // Draw history trails with fading effect
    if (isRecording) {
      poseHistory.forEach((historicalPoses, i) => {
        const opacity = (i + 1) / poseHistory.length;
        const pose = historicalPoses[0];
        
        if (pose && pose.keypoints) {
          connections.forEach(connection => {
            const pointA = pose.keypoints[connection[0]];
            const pointB = pose.keypoints[connection[1]];
            
            if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
              const material = new THREE.LineBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: opacity * 0.5
              });
              const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(pointA.x - 320, -pointA.y + 240, 0),
                new THREE.Vector3(pointB.x - 320, -pointB.y + 240, 0)
              ]);
              const line = new THREE.Line(geometry, material);
              scene.add(line);
              poseLines.push(line);
            }
          });
        }
      });
    }
  }
}

function gotPoses(results) {
  poses = results;
  if(results && results.length > 0 && isRecording) {
    poseHistory.push(JSON.parse(JSON.stringify(results)));
    if(poseHistory.length > maxHistoryLength) {
      poseHistory.shift();
    }
  }
}