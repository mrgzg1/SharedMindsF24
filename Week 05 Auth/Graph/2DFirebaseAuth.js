import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push, onChildAdded, onChildChanged, onChildRemoved, remove } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { getAuth, signOut, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js"

let nodes = {};
let edges = [];
let selectedNode = null;

// Get the canvas element
const canvas = document.createElement('canvas');
canvas.setAttribute('id', 'myCanvas');
canvas.style.position = 'absolute';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.left = '0';
canvas.style.top = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const inputBox = document.createElement('input');
inputBox.setAttribute('type', 'text');
inputBox.setAttribute('id', 'inputBox');
inputBox.setAttribute('placeholder', 'Enter initial word');
inputBox.style.position = 'absolute';
inputBox.style.left = '50%';
inputBox.style.top = '10%';
inputBox.style.transform = 'translate(-50%, -50%)';
inputBox.style.zIndex = '100';
inputBox.style.fontSize = '20px';
inputBox.style.fontFamily = 'Arial';
document.body.appendChild(inputBox);

// Add event listener to the input box
inputBox.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        const inputValue = inputBox.value.trim();
        if (inputValue && Object.keys(nodes).length === 0) {
            const user = auth.currentUser;
            if (!user) {
                alert("Please Log in");
                return;
            }
            let userName = user.displayName || user.email.split("@")[0];
            const data = { word: inputValue, x: canvas.width / 2, y: canvas.height / 2, userName: userName };
            addNewThingToFirebase('nodes', data);
            inputBox.value = '';
            inputBox.style.display = 'none';
            console.log("Added initial node:", data);
            processWordWithAPI(inputValue);
        }
    }
});

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 2;
    edges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(nodes[edge.source].x, nodes[edge.source].y);
        ctx.lineTo(nodes[edge.target].x, nodes[edge.target].y);
        ctx.stroke();
    });
    
    // Draw nodes
    Object.values(nodes).forEach(node => {
        ctx.fillStyle = node === selectedNode ? 'red' : 'blue';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.word, node.x, node.y);
    });
    console.log("Graph redrawn. Nodes:", Object.keys(nodes).length, "Edges:", edges.length);
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedNode = Object.values(nodes).find(node => 
        Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) < 20
    );
    
    if (clickedNode) {
        console.log("Clicked node:", clickedNode);
        if (selectedNode && selectedNode !== clickedNode) {
            const user = auth.currentUser;
            if (!user) {
                alert("Please Log in");
                return;
            }
            let userName = user.displayName || user.email.split("@")[0];
            const newWord = prompt("Enter a new word to connect:");
            if (newWord) {
                const newNodeData = { word: newWord, x: x, y: y, userName: userName };
                const newNodeKey = addNewThingToFirebase('nodes', newNodeData);
                const edgeData = { source: selectedNode.key, target: newNodeKey };
                addNewThingToFirebase('edges', edgeData);
                console.log("Added new node:", newNodeData, "and edge:", edgeData);
                processWordWithAPI(newWord);
            }
            selectedNode = null;
        } else {
            selectedNode = clickedNode;
            console.log("Selected node:", selectedNode);
        }
    } else {
        selectedNode = null;
        console.log("Deselected node");
    }
    
    drawGraph();
});

let db, auth, app;
let googleAuthProvider;
let appName = "SharedMinds2DAuthExample";
initFirebase();

function initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyDHOrU4Lrtlmk-Af2svvlP8RiGsGvBLb_Q",
        authDomain: "sharedmindss24.firebaseapp.com",
        databaseURL: "https://sharedmindss24-default-rtdb.firebaseio.com",
        projectId: "sharedmindss24",
        storageBucket: "sharedmindss24.appspot.com",
        messagingSenderId: "1039430447930",
        appId: "1:1039430447930:web:edf98d7d993c21017ad603"
    };
    app = initializeApp(firebaseConfig);

    db = getDatabase();
    auth = getAuth();
    setPersistence(auth, browserSessionPersistence);
    googleAuthProvider = new GoogleAuthProvider();

    subscribeToData('nodes');
    subscribeToData('edges');
}

function addNewThingToFirebase(folder, data) {
    const dbRef = ref(db, appName + '/' + folder);
    const newKey = push(dbRef, data).key;
    console.log(`Added new ${folder} with key:`, newKey);
    return newKey;
}

function subscribeToData(folder) {
    const dataRef = ref(db, appName + '/' + folder + '/');
    onChildAdded(dataRef, (data) => {
        let localData = data.val();
        localData.key = data.key;
        if (folder === 'nodes') {
            nodes[data.key] = localData;
            console.log("Added node:", localData);
        } else if (folder === 'edges') {
            edges.push(localData);
            console.log("Added edge:", localData);
        }
        drawGraph();
    });
    onChildChanged(dataRef, (data) => {
        if (folder === 'nodes') {
            nodes[data.key] = data.val();
            console.log("Updated node:", data.val());
        }
        drawGraph();
    });
    onChildRemoved(dataRef, (data) => {
        if (folder === 'nodes') {
            delete nodes[data.key];
            edges = edges.filter(edge => edge.source !== data.key && edge.target !== data.key);
            console.log("Removed node:", data.key);
        } else if (folder === 'edges') {
            edges = edges.filter(edge => edge.key !== data.key);
            console.log("Removed edge:", data.key);
        }
        drawGraph();
    });
}

function showLogOutButton(user) {
    const logoutButton = document.createElement('button');
    logoutButton.textContent = `Log out ${user.displayName || user.email}`;
    logoutButton.style.position = 'absolute';
    logoutButton.style.top = '10px';
    logoutButton.style.right = '10px';
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('User signed out');
        }).catch((error) => {
            console.error('Sign out error', error);
        });
    });
    document.body.appendChild(logoutButton);

    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear My Entries';
    clearButton.style.position = 'absolute';
    clearButton.style.top = '40px';
    clearButton.style.right = '10px';
    clearButton.addEventListener('click', () => {
        clearUserEntries(user);
    });
    document.body.appendChild(clearButton);
}

function showLoginButtons() {
    const googleLoginButton = document.createElement('button');
    googleLoginButton.textContent = 'Log in with Google';
    googleLoginButton.style.position = 'absolute';
    googleLoginButton.style.top = '10px';
    googleLoginButton.style.right = '10px';
    googleLoginButton.addEventListener('click', () => {
        signInWithPopup(auth, googleAuthProvider)
            .then((result) => {
                console.log('Google sign in successful', result.user);
            }).catch((error) => {
                console.error('Google sign in error', error);
            });
    });
    document.body.appendChild(googleLoginButton);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in", user);
        showLogOutButton(user);
    } else {
        console.log("User is signed out");
        showLoginButtons();
    }
});

function clearUserEntries(user) {
    const userName = user.displayName || user.email.split("@")[0];
    const nodesRef = ref(db, appName + '/nodes');
    const edgesRef = ref(db, appName + '/edges');

    // Remove nodes created by the user
    onValue(nodesRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const nodeData = childSnapshot.val();
            if (nodeData.userName === userName) {
                remove(childSnapshot.ref);
            }
        });
    }, { onlyOnce: true });

    // Remove edges connected to the user's nodes
    onValue(edgesRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const edgeData = childSnapshot.val();
            if (nodes[edgeData.source]?.userName === userName || nodes[edgeData.target]?.userName === userName) {
                remove(childSnapshot.ref);
            }
        });
    }, { onlyOnce: true });

    console.log("Cleared entries for user:", userName);
}

function processWordWithAPI(word) {
    // Simulating API call
    console.log("Processing word with API:", word);
    // Here you would typically make an actual API call
    // For demonstration, we'll just log a simulated response
    setTimeout(() => {
        console.log("API response for word '" + word + "': Processed successfully");
    }, 1000);
}
