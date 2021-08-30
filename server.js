// https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/
const { Socket } = require("dgram");
const express = require("express")
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const path = require('path');

const DatauriParser = require('datauri/parser');
const parser = new DatauriParser();
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const NPC = require("./server/scripts/npc").NPC;

const PORT = 8081;

app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

const UPDATE_DELAY = 50; // ms

const WorldState = {
    players: {},
    staticObjects: {},
    dynamicObjects: {}
}
const dynamicObjectInfo = {

}

let updateInterval;

function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/*
function addStaticObject(x, y, type) {
    const info = {
        id: generateUUID(),
        x: x,
        y: y,
        type: type
    };
    WorldState.staticObjects[info.id] = info;
    io.emit("staticObjectSpawned", info);
    console.log("Created static object with id " + info.id);
}

function deleteStaticObject(id) {
    if(!WorldState.staticObjects.hasOwnProperty(id)) {
        console.log("No object found with that id!");
        return;
    }
    delete WorldState.staticObjects[id];
    io.emit("staticObjectDespawned", id);
    console.log("Despawned static object with id " + id);
}

function addDynamicObject(x, y, type) {
    const info = {
        id: generateUUID(),
        x: x,
        y: y,
        type: type
    };
    WorldState.dynamicObjects[info.id] = info;
    dynamicObjectInfo[info.id] = generateDynamicObjectInfo(info);
    io.emit("dynamicObjectSpawned", info);
    console.log("Created dynamic object " + type + " with id " + info.id);
}

function deleteDynamicObject(id) {
    if(!WorldState.dynamicObjects.hasOwnProperty(id)) {
        console.log("No dynamic object found with that id!");
        return;
    }
    delete WorldState.dynamicObjects[id];
    dynamicObjectInfo[id].onDestroy();
    delete dynamicObjectInfo[id];
    io.emit("dynamicObjectDespawned", id);
    console.log("Despawned dynamic object with id " + id);
}

function generateDynamicObjectInfo(info) {
    // TODO: move to proper ES6 classes
    dynamicInfo = {
        id: info.id,
        type: info.type,
        x: info.x,
        y: info.y,
        onUpdate: function() {},
        onDestroy: function() {}
    }
    
    if(info.type == "ball") {
        dynamicInfo.onUpdate = function() {
            //console.log("Updating!");
        }
    }
    
    return dynamicInfo;
}

function onUpdate() {
    for(const dynamicObject of Object.values(dynamicObjectInfo)) {
        dynamicObject.onUpdate();
    }
}
/*
// https://stackoverflow.com/questions/10058226/send-response-to-all-clients-except-sender
io.on("connection", client => {
    let x = Math.floor(Math.random() * 700) + 50;
    let y = Math.floor(Math.random() * 500) + 50;
    let name = choice(ADJECTIVES) + " " + choice(ANIMALS);
    let playerInfo = {
        x: x,
        y: y,
        name: name,
        playerId: client.id,
    };
    WorldState.players[client.id] = playerInfo
    client.emit("currentWorldState", WorldState);
    client.broadcast.emit("playerConnect", playerInfo);
    console.log("A user connected!", client.id, "(" + name + ")");
    
    client.on("disconnect", () => {
        console.log("A user disconnected!", client.id)
        delete WorldState.players[client.id];
        client.broadcast.emit("playerDisconnect", client.id); // "disconnect" is reserved
    });
    
    client.on("playerMovement", movementData => {
        const playerInfo = WorldState.players[client.id];
        playerInfo.x = movementData.x;
        playerInfo.y = movementData.y;
        playerInfo.dashing = movementData.dashing;
        client.broadcast.emit("playerMoved", client.id, movementData);
    });
    
    client.on("spawnStaticObject", info => {
        addStaticObject(info.x, info.y, info.type);
    });
    
    client.on("despawnStaticObject", id => {
        deleteStaticObject(id);
    });
    
    client.on("spawnDynamicObject", info => {
        addDynamicObject(info.x, info.y, info.type);
    });
    
    client.on("despawnDynamicObject", id => {
        deleteDynamicObject(id);
    });
    
    if(updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => onUpdate(), UPDATE_DELAY);
});
*/

function setupAuthoritativePhaser() {
    JSDOM.fromFile(path.join(__dirname, 'server/index.html'), {
        // To run the scripts in the html file
        runScripts: "dangerously",
        // Also load supported external resources
        resources: "usable",
        // So requestAnimatinFrame events fire
        pretendToBeVisual: true
    }).then((dom) => {
        dom.window.io = io;
        dom.window.URL.createObjectURL = (blob) => {
            if(blob) {
                return parser.format(blob.type, blob[Object.getOwnPropertySymbols(blob)[0]]._buffer).content;
            }
        };
        dom.window.URL.revokeObjectURL = () => {};
        dom.window.gameLoaded = () => {
            server.listen(8081, function () {
                console.log(`Listening on ${server.address().port}!`);
            });
        };
    }).catch((error) => {
        console.log(error.message);
    });
}
setupAuthoritativePhaser();