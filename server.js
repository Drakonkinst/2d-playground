// https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/
const { Socket } = require("dgram");
const express = require("express")
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const PORT = 8081;

// todo: move these to text files
const ADJECTIVES = [
    "nimble", "keen", "whispering", "beautiful", "glossy", "jagged", "splendid",
    "comfortable", "reflective", "melodic", "misty", "decisive", "flimsy",
    "alleged", "dizzy", "sleepy", "yawning", "feeble", "inquisitive", "murky",
    "tranquil", "rhetorical", "enchanted", "dazzling", "foamy", "shiny", "liberal",
    "mysterious", "dark", "marvelous", "payable", "short", "tall", "medieval",
    "visiting"
];
// https://www.randomlists.com/random-animals
const ANIMALS = [
    "squirrel", "lizard", "cat", "dog", "turtle", "fox", "armadillo", "kangaroo",
    "beetle", "coyote", "mongoose", "newt", "chicken", "cow", "sheep", "bunny",
    "rabbit", "snake", "badger", "kitten", "puppy", "camel", "bear", "fox", "wolf",
    "crab", "hyena", "anteater", "chipmunk", "eagle", "prawn", "salmon", "manatee",
    "caiman", "bee", "porpoise", "dolphin"
];

const players = {};
const staticObjects = {};
const dynamicObjects = {};

function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function addStaticObject(x, y, sprite) {
    const info = {
        id: generateUUID(),
        x: x,
        y: y,
        sprite: sprite
    }
    staticObjects[info.id] = info;
    console.log("Created static object with id " + info.id);
    io.emit("staticObjectSpawned", info);
    return info.id;
}

function deleteStaticObject(id) {
    if(!staticObjects.hasOwnProperty(id)) {
        console.log("No object found!");
        return;
    }
    delete staticObjects[id];
    io.emit("staticObjectDespawned", id);
    console.log("Despawned static object with id " + id);
}

app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

// https://stackoverflow.com/questions/10058226/send-response-to-all-clients-except-sender
io.on("connection", client => {
    let x = Math.floor(Math.random() * 700) + 50;
    let y = Math.floor(Math.random() * 500) + 50;
    let name = choice(ADJECTIVES) + " " + choice(ANIMALS);
    let playerInfo = {
        rotation: 0,
        x: x,
        y: y,
        name: name,
        playerId: client.id,
    };
    players[client.id] = playerInfo
    //client.emit("currentPlayers", players);
    client.emit("currentWorldState", players, staticObjects, dynamicObjects);
    client.broadcast.emit("playerConnect", playerInfo);
    console.log("A user connected!", client.id, "(" + name + ")");
    
    client.on("disconnect", () => {
        console.log("A user disconnected!", client.id)
        delete players[client.id];
        client.broadcast.emit("playerDisconnect", client.id); // "disconnect" is reserved
    });
    
    client.on("playerMovement", movementData => {
        const playerInfo = players[client.id];
        playerInfo.x = movementData.x;
        playerInfo.y = movementData.y;
        playerInfo.rotation = movementData.rotation;
        playerInfo.dashing = movementData.dashing;
        client.broadcast.emit("playerMoved", playerInfo);
    });
    
    client.on("spawnStaticObject", info => {
        addStaticObject(info.x, info.y, info.sprite);
    });
    
    client.on("despawnStaticObject", id => {
        deleteStaticObject(id);
    });
});

server.listen(PORT, function () {
    console.log("Listening on " + server.address().port);
    addStaticObject(300, 300, "obstacle");
    addStaticObject(500, 500, "obstacle");
});