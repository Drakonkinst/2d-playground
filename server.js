// https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/
const { Socket } = require("dgram");
const express = require("express")
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const PORT = 8081;

let players = {};

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
    client.emit("currentPlayers", players);
    client.broadcast.emit("newPlayer", players[client.id]);
    
    client.on("disconnect", () => {
        console.log("A user disconnected!")
        delete players[client.id];
        io.emit("disconnect", client.id);
    });
})
server.listen(PORT, function () {
    console.log("Listening on " + server.address().port);
})