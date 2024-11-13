let video;
let bodyPose;
let poses = [];
let poseHistory = []; // Array to store pose history
const maxHistoryLength = 30; // Number of past poses to show
const blurRadius = 20; // Radius for blending poses
let connections;

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();
}

function draw() {
  image(video, 0, 0, width, height);
  
  // Only draw poses if we have valid data
  if (poses.length > 0 && connections && connections.length > 0) {
    // Create a heat map effect with smooth transitions
    drawBlendedPoseHistory();
    
    // Draw current pose on top
    drawPose(poses, 1.0, true);
  }
}

function drawBlendedPoseHistory() {
  noStroke();
  blendMode(ADD);
  
  // Draw each historical pose with a gradient
  for(let i = 0; i < poseHistory.length; i++) {
    let alpha = map(i, 0, poseHistory.length-1, 50, 150);
    let historicalPoses = poseHistory[i];
    
    // Draw each pose in this historical frame
    for(let p = 0; p < historicalPoses.length; p++) {
      let pose = historicalPoses[p];
      
      if (pose && connections) {
        // Draw flowing connections
        for (let j = 0; j < connections.length; j++) {
          let pointAIndex = connections[j][0];
          let pointBIndex = connections[j][1];
          
          if (pose.keypoints && pose.keypoints[pointAIndex] && pose.keypoints[pointBIndex]) {
            let pointA = pose.keypoints[pointAIndex];
            let pointB = pose.keypoints[pointBIndex];
            
            if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
              // Create gradient between points
              let steps = 10;
              for(let t = 0; t <= steps; t++) {
                let x = lerp(pointA.x, pointB.x, t/steps);
                let y = lerp(pointA.y, pointB.y, t/steps);
                let size = map(t, 0, steps, blurRadius, blurRadius/2);
                
                fill(255, 50, 50, alpha/steps);
                circle(x, y, size);
              }
            }
          }
        }
        
        // Draw flowing keypoints
        if (pose.keypoints) {
          for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint && keypoint.confidence > 0.1) {
              let gradientSize = blurRadius * 1.5;
              for(let r = gradientSize; r > 0; r -= 2) {
                fill(50, 255, 50, alpha * (r/gradientSize) * 0.1);
                circle(keypoint.x, keypoint.y, r);
              }
            }
          }
        }
      }
    }
  }
  blendMode(BLEND); // Changed from NORMAL to BLEND
}

function drawPose(posesToDraw, opacity, isCurrent) {
  for (let i = 0; i < posesToDraw.length; i++) {
    let pose = posesToDraw[i];
    
    if(isCurrent && pose && connections) {
      // Draw current skeleton with solid lines
      for (let j = 0; j < connections.length; j++) {
        let pointAIndex = connections[j][0];
        let pointBIndex = connections[j][1];
        
        if (pose.keypoints && pose.keypoints[pointAIndex] && pose.keypoints[pointBIndex]) {
          let pointA = pose.keypoints[pointAIndex];
          let pointB = pose.keypoints[pointBIndex];
          
          if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
            stroke(255, 0, 0, opacity * 255);
            strokeWeight(2);
            line(pointA.x, pointA.y, pointB.x, pointB.y);
          }
        }
      }
      
      // Draw current keypoints
      if (pose.keypoints) {
        for (let j = 0; j < pose.keypoints.length; j++) {
          let keypoint = pose.keypoints[j];
          if (keypoint && keypoint.confidence > 0.1) {
            fill(0, 255, 0, opacity * 255);
            noStroke();
            circle(keypoint.x, keypoint.y, 10);
          }
        }
      }
    }
  }
}

function gotPoses(results) {
  poses = results;
  if(results && results.length > 0) {
    // Add current poses to history
    poseHistory.push(JSON.parse(JSON.stringify(results))); // Store all poses, not just if previous poses exist
    // Keep only last n poses
    if(poseHistory.length > maxHistoryLength) {
      poseHistory.shift();
    }
  }
}