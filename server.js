// https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/
const { Socket } = require("dgram");
const express = require("express")
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const PORT = 8081;

let players = {};
let star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};
let scores = {
    blue: 0,
    red: 0
};

app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
})

io.on("connection", client => {
    console.log("A user connected!");
    players[client.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: client.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
    };
    console.log(players[client.id]);
    client.emit("currentPlayers", players);
    // send the star object to the new player
    client.emit('starLocation', star);
    // send the current scores
    client.emit('scoreUpdate', scores);
    client.broadcast.emit("newPlayer", players[client.id]);
    
    client.on("disconnect", () => {
        console.log("A user disconnected!")
        delete players[client.id];
        //io.emit("playerDisconnect", client.id); // "disconnect" is reserved
        client.broadcast.emit("playerDisconnect", client.id); // "disconnect" is reserved
    });
    
    // when a player moves, update the player data
    client.on("playerMovement", function (movementData) {
        players[client.id].x = movementData.x;
        players[client.id].y = movementData.y;
        players[client.id].rotation = movementData.rotation;
        // emit a message to all players about the player that moved
        client.broadcast.emit("playerMoved", players[client.id]);
    });
    
    client.on('starCollected', function () {
        if(players[client.id].team === 'red') {
            scores.red += 10;
        } else {
            scores.blue += 10;
        }
        star.x = Math.floor(Math.random() * 700) + 50;
        star.y = Math.floor(Math.random() * 500) + 50;
        io.emit('starLocation', star);
        io.emit('scoreUpdate', scores);
    });
})
server.listen(PORT, function () {
    console.log("Listening on " + server.address().port);
})