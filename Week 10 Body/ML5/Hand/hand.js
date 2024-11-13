let video;
let bodyPose;
let poses = [];
let poseHistory = []; // Array to store pose history
const maxHistoryLength = 50; // Number of past poses to show
const minOpacity = 0.2; // Minimum opacity for oldest pose
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
  
  // Draw pose history from oldest to newest
  for(let i = 0; i < poseHistory.length; i++) {
    let opacity = map(i, 0, poseHistory.length-1, minOpacity, 0.8);
    drawPose(poseHistory[i], opacity);
  }
  
  // Draw current poses with full opacity
  drawPose(poses, 1.0);
}

function drawPose(posesToDraw, opacity) {
  // Draw skeleton connections
  for (let i = 0; i < posesToDraw.length; i++) {
    let pose = posesToDraw[i];
    drawSkeleton(pose, opacity);
    drawKeypoints(pose, opacity);
  }
}

function drawSkeleton(pose, opacity) {
  for (let j = 0; j < connections.length; j++) {
    let pointAIndex = connections[j][0];
    let pointBIndex = connections[j][1];
    let pointA = pose.keypoints[pointAIndex];
    let pointB = pose.keypoints[pointBIndex];
    if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
      stroke(255, 0, 0, opacity * 255);
      strokeWeight(2);
      line(pointA.x, pointA.y, pointB.x, pointB.y);
    }
  }
}

function drawKeypoints(pose, opacity) {
  for (let j = 0; j < pose.keypoints.length; j++) {
    let keypoint = pose.keypoints[j];
    if (keypoint.confidence > 0.1) {
      fill(0, 255, 0, opacity * 255);
      noStroke();
      circle(keypoint.x, keypoint.y, 10);
    }
  }
}

function gotPoses(results) {
  if(results.length > 0) {
    // Add current poses to history
    if(poses.length > 0) {
      poseHistory.push(JSON.parse(JSON.stringify(poses)));
      // Keep only last n poses
      if(poseHistory.length > maxHistoryLength) {
        poseHistory.shift();
      }
    }
  }
  poses = results;
}