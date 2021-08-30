const config = {
    type: Phaser.HEADLESS,
    width: 800,
    height: 600,
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    autoFocus: false
};

const MAX_VELOCITY = 250;

// todo: move these to text files
const ADJECTIVES = [
    "nimble", "keen", "whispering", "beautiful", "glossy", "jagged", "splendid",
    "comfortable", "reflective", "melodic", "misty", "decisive", "flimsy",
    "alleged", "dizzy", "sleepy", "yawning", "feeble", "inquisitive", "murky",
    "tranquil", "rhetorical", "enchanted", "dazzling", "foamy", "shiny", "liberal",
    "mysterious", "dark", "marvelous", "payable", "short", "tall", "medieval",
    "visiting", "apologetic", "talkative"
];
// https://www.randomlists.com/random-animals
const ANIMALS = [
    "squirrel", "lizard", "cat", "dog", "turtle", "fox", "armadillo", "kangaroo",
    "beetle", "coyote", "mongoose", "newt", "chicken", "cow", "sheep", "bunny",
    "rabbit", "snake", "badger", "kitten", "puppy", "camel", "bear", "fox", "wolf",
    "crab", "hyena", "anteater", "chipmunk", "eagle", "prawn", "salmon", "manatee",
    "caiman", "bee", "porpoise", "dolphin"
];

const WorldState = {
    players: {},
    staticObjects: {},
    dynamicObjects: {}
};

const dynamicObjectInfo = {};

function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function preload() {
    this.load.image("floor", "assets/floor.png");
    this.load.image("dust", "assets/dust.png");
    this.load.image("circle", "assets/circle.png");
    this.load.image("npc", "assets/npc.png");
    this.load.image("other", "assets/other.png");
    this.load.image("obstacle", "assets/obstacle.png");
    this.load.audio("woosh", "assets/woosh.mp3");
}

function create() {
    const self = this;
    this.players = this.physics.add.group();
    io.on("connection", function (client) {
        let x = Math.floor(Math.random() * 700) + 50;
        let y = Math.floor(Math.random() * 500) + 50;
        let name = choice(ADJECTIVES) + " " + choice(ANIMALS);
        let playerInfo = {
            playerId: client.id,
            name: name,
            x: x,
            y: y,
            dashing: false,
            input: {
                left: false,
                right: false,
                up: false,
                down: false,
                space: false,
                shift: false
            }
        };
        console.log("A user connected!!", client.id, "(" + name + ")");
        
        WorldState.players[client.id] = playerInfo;
        addPlayer(self, playerInfo);
        client.emit("currentWorldState", WorldState);
        client.broadcast.emit("playerConnect", playerInfo);
        
        client.on("disconnect", () => {
            console.log("A user disconnected!!", client.id);
            removePlayer(self, client.id);
            delete WorldState.players[client.id];
            client.broadcast.emit("playerDisconnect", client.id); // "disconnect" is reserved
        });
        
        client.on("playerInput", inputData => {
            handlePlayerInput(self, client.id, inputData);
        });
    });
}

function update() {
    const DASH_VELOCITY = 500;
    const MAX_DASH_TIME = 250;
    const MAX_DASH_COOLDOWN = 100;
    
    const self = this;
    this.players.getChildren().forEach(player => {
        const playerInfo = WorldState.players[player.playerId];
        const input = playerInfo.input;
        const currentTime = self.game.getTime();
        
        if(playerInfo.dashing) {
            // Check to put out of dashing state
            if(currentTime >= player.dashStart + MAX_DASH_TIME) {
                playerInfo.dashing = false;
            }
        } else {
            const dirX = input.left ? -1 : (input.right ? 1 : 0);
            const dirY = input.up ? -1 : (input.down ? 1 : 0);
            if(dirX != 0 || dirY != 0) {
                const angle = Math.atan2(dirY, dirX);
                
                if(input.spaceHit && currentTime >= player.dashStart + MAX_DASH_TIME + MAX_DASH_COOLDOWN) {
                    const dashX = DASH_VELOCITY * Math.cos(angle);
                    const dashY = DASH_VELOCITY * Math.sin(angle);
                    player.setVelocity(dashX, dashY);
                    player.dashStart = currentTime;
                    playerInfo.dashing = true;
                } else {
                    const velocityX = MAX_VELOCITY * Math.cos(angle);
                    const velocityY = MAX_VELOCITY * Math.sin(angle);
                    player.setVelocity(velocityX, velocityY);
                }
            } else {
                player.setVelocity(0, 0);
            }
        }
        
        if(input.spaceHit) {
            input.spaceHit = false;
        }
        
        if(input.shiftHit) {
            input.shiftHit = false;
        }
        
        playerInfo.x = player.x;
        playerInfo.y = player.y;
        io.emit("playerStateUpdates", WorldState.players);
    });
}

function addPlayer(self, playerInfo) {
    const player = self.physics.add.image(playerInfo.x, playerInfo.y, "circle")
        .setOrigin(0.5, 0.5)
        .setScale(0.5);
    player.playerId = playerInfo.playerId;
    player.dashStart = -999;
    self.players.add(player);
}

function removePlayer(self, playerId) {
    self.players.getChildren().forEach((player) => {
        if(playerId === player.playerId) {
            player.destroy();
        }
    });
}

function handlePlayerInput(self, playerId, input) {
    self.players.getChildren().forEach(player => {
       if(playerId === player.playerId) {
           WorldState.players[playerId].input = input;
       } 
    });
}

const game = new Phaser.Game(config);
window.gameLoaded();