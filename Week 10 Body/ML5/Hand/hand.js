let video;
let bodyPose;
let poses = [];
let poseHistory = []; // Array to store pose history
const maxHistoryLength = 50; // Number of past poses to show
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
  recordButton = createButton('⏺RECORD');
  recordButton.position(10, window.innerHeight - 50); // Moved button up slightly
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
    recordButton.html('⏹STOP'); // Stop symbol
    poseHistory = []; // Clear history when starting new recording
  } else {
    recordButton.html('⏺RECORD'); // Record symbol
  }
}

function animate() {
  requestAnimationFrame(animate);
  updatePoses();
  renderer.render(scene, camera3D);
}

function cleanupScene() {
  // Remove all existing points and lines
  while(scene.children.length > 0) {
    const object = scene.children[0];
    if(object.geometry) object.geometry.dispose();
    if(object.material) {
      if(Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
    scene.remove(object);
  }
  
  // Clear arrays
  posePoints = [];
  poseLines = [];
  
  // Re-add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
}

function updatePoses() {
  // Properly dispose and remove old points and lines
  posePoints.forEach(point => {
    if(point.geometry) point.geometry.dispose();
    if(point.material) point.material.dispose();
    scene.remove(point);
  });
  poseLines.forEach(line => {
    if(line.geometry) line.geometry.dispose();
    if(line.material) line.material.dispose();
    scene.remove(line);
  });
  posePoints = [];
  poseLines = [];

  // Draw historical poses first so they appear behind current pose
  if (isRecording && poseHistory.length > 0) {
    poseHistory.forEach((historicalPose, index) => {
      const opacity = (index + 1) / poseHistory.length; // Fade based on age
      
      if (historicalPose[0] && historicalPose[0].keypoints) {
        // Draw historical skeleton
        connections.forEach(connection => {
          const pointA = historicalPose[0].keypoints[connection[0]];
          const pointB = historicalPose[0].keypoints[connection[1]];
          
          if (pointA && pointB && pointA.confidence > 0.1 && pointB.confidence > 0.1) {
            const material = new THREE.LineBasicMaterial({
              color: 0x0000ff, // Blue for historical poses
              transparent: true,
              opacity: opacity * 0.3,
              linewidth: 3 // Increased line thickness
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

  // Draw current pose
  if (poses.length > 0 && connections && connections.length > 0) {
    const pose = poses[0];
    
    // Draw keypoints
    if (pose.keypoints) {
      pose.keypoints.forEach(keypoint => {
        if (keypoint.confidence > 0.1) {
          const geometry = new THREE.SphereGeometry(5);
          const material = new THREE.MeshPhongMaterial({color: 0x00ff00});
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(keypoint.x - 320, -keypoint.y + 240, 0);
          scene.add(sphere);
          posePoints.push(sphere);
        }
      });

      // Draw current skeleton
      connections.forEach(connection => {
        const pointA = pose.keypoints[connection[0]];
        const pointB = pose.keypoints[connection[1]];
        
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 3 // Increased line thickness
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