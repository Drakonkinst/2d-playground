// https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/
const { Socket } = require("dgram");
const express = require("express")
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const PORT = 8081;

const players = {};

app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
})

io.on("connection", client => {
    console.log("A user connected!", client.id);
    let x = Math.floor(Math.random() * 700) + 50;
    let y = Math.floor(Math.random() * 500) + 50;
    players[client.id] = {
        rotation: 0,
        x: x,
        y: y,
        playerId: client.id,
    };
    client.emit("currentPlayers", players);
    client.broadcast.emit("playerConnect", players[client.id]);
    
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
        client.broadcast.emit("playerMoved", playerInfo);
    });
});

server.listen(PORT, function () {
    console.log("Listening on " + server.address().port);
});