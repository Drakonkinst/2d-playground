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
const DASH_VELOCITY = 500;
const MAX_DASH_TIME = 250;
const MAX_DASH_COOLDOWN = 100;
const WALL_BOUNDS_SIZE = 100;
const MAP_SCALE = 8;
const SPAWN_OFFSET = 100;
const OBJECT_PRESETS = {
    "ball": {
        "sprite": "npc",
        "group": "balls",
        "scale": 0.4,
        "bounce": 0.75,
        "drag": 100,
        "mass": 0.8,
        "circle": true,
        "not_pixel_art": true
    },
    "fence": {
        "sprite": "fence"
    }
};

const WorldState = {
    // All players can be walked through by default
    players: {},
    // All static objects are never updated and cannot be walked through by default
    staticObjects: {},
    // All dynamic objects have their positions updated every update and can be walked through by default
    dynamicObjects: {}
};

const dynamicObjectInfo = {};

let adjectiveList = [];
let animalList = [];

function preload() {
    // Loading the assets server-side is occasionally necessary to get
    // the right proportions, until they're not dependent on sprite size
    this.load.image("map", "../public/assets/map.png");
    this.load.image("dust", "../public/assets/dust.png");
    this.load.image("circle", "../public/assets/circle.png");
    this.load.image("npc", "../public/assets/npc.png");
    this.load.image("other", "../public/assets/other.png");
    this.load.image("obstacle", "../public/assets/obstacle.png");
    this.load.image("fence", "../public/assets/fence.png");
    this.load.text("adjectives", "assets/adjectives.txt");
    this.load.text("animals", "assets/animals.txt");
}

function create() {
    const self = this;

    const background = this.add.image(0, 0, "map")
        .setScale(MAP_SCALE)
        .setOrigin(0, 0); // Center image
    this.xLimit = background.displayWidth;
    this.yLimit = background.displayHeight;
    setupBounds(self);

    this.players = this.physics.add.group();
    this.dynamicObjects = this.physics.add.group();
    this.staticObjects = this.physics.add.staticGroup();

    this.physics.add.collider(this.players, this.wallBounds);
    this.physics.add.collider(this.players, this.staticObjects);

    this.balls = this.physics.add.group();
    this.physics.add.collider(this.balls, this.players);
    this.physics.add.collider(this.balls, this.balls);
    this.physics.add.collider(this.balls, this.staticObjects);
    this.physics.add.collider(this.balls, this.wallBounds);

    // Load text files
    adjectiveList = loadTextFileAsArray(this, "adjectives");
    animalList = loadTextFileAsArray(this, "animals");

    io.on("connection", function (client) {
        let x = worldToImageX(self, Math.floor(Math.random() * 2.0 * SPAWN_OFFSET) - SPAWN_OFFSET);
        let y = worldToImageY(self, Math.floor(Math.random() * 2.0 * SPAWN_OFFSET) - SPAWN_OFFSET);
        console.log(x, y);
        let name = choice(adjectiveList) + " " + choice(animalList);
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

        client.on("spawnDynamicObject", (objPreset, worldX, worldY) => {
            spawnDynamicObject(self, objPreset, worldX, worldY);
        });

        client.on("removeDynamicObject", objId => {
            removeDynamicObject(self, objId);
        });
        
        client.on("spawnStaticObject", (objPreset, worldX, worldY) => {
            spawnStaticObject(self, objPreset, worldX, worldY);
        });

        client.on("removeStaticObject", objId => {
            removeStaticObject(self, objId);
        });

    });

    onServerStart(self);
}

function setupBounds(self) {
    const HALF_WALL_WIDTH = WALL_BOUNDS_SIZE / 2.0;
    self.wallBounds = self.physics.add.staticGroup();
    self.wallBounds.create(-HALF_WALL_WIDTH, self.yLimit / 2.0)
        .setAlpha(0)
        .body.setSize(WALL_BOUNDS_SIZE, self.yLimit);
    self.wallBounds.create(self.xLimit + HALF_WALL_WIDTH, self.yLimit / 2.0)
        .setAlpha(0)
        .body.setSize(WALL_BOUNDS_SIZE, self.yLimit);
    self.wallBounds.create(self.xLimit / 2.0, -HALF_WALL_WIDTH)
        .setAlpha(0)
        .body.setSize(self.xLimit, WALL_BOUNDS_SIZE);
    self.wallBounds.create(self.xLimit / 2.0, self.yLimit + HALF_WALL_WIDTH)
        .setAlpha(0)
        .body.setSize(self.xLimit, WALL_BOUNDS_SIZE);
}

function loadTextFileAsArray(self, name) {
    const cache = self.cache.text;
    const str = cache.get(name);
    return str.split("\r\n");
}

function update() {
    const self = this;
    this.players.getChildren().forEach(player => {
        updatePlayer(self, player);
    });
    io.emit("playerStateUpdates", WorldState.players);

    this.dynamicObjects.getChildren().forEach(obj => {
        updateDynamicObject(self, obj);
    });
    io.emit("dynamicObjectUpdates", WorldState.dynamicObjects);
}

/* PLAYER */
function updatePlayer(self, player) {
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
}

function addPlayer(self, playerInfo) {
    const player = createGenericObject(self, {
        x: playerInfo.x,
        y: playerInfo.y,
        sprite: "circle",
        not_pixel_art: true,
        circle: true,
        scale: 0.5
    }, self.players);

    player.dashStart = -999;

    player.playerId = playerInfo.playerId;
    WorldState.players[playerInfo.playerId] = playerInfo;
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

/* OBJECTS */
function updateDynamicObject(self, obj) {
    const objInfo = WorldState.dynamicObjects[obj.id];
    objInfo.x = obj.x;
    objInfo.y = obj.y;
}

function spawnDynamicObject(self, objPreset, worldX, worldY) {
    const imageX = worldToImageX(self, worldX);
    const imageY = worldToImageY(self, worldY);
    if(typeof objPreset === "string") {
        if(OBJECT_PRESETS.hasOwnProperty(objPreset)) {
            objPreset = OBJECT_PRESETS[objPreset];
        } else {
            console.log("Preset not found!");
            return;
        }
    }

    const objInfo = Object.assign({
        id: generateUUID(),
        x: imageX,
        y: imageY
    }, objPreset);

    addDynamicObject(self, objInfo);
}

function addDynamicObject(self, objInfo) {
    const obj = createGenericObject(self, objInfo, self.dynamicObjects);
    obj.id = objInfo.id;
    WorldState.dynamicObjects[objInfo.id] = objInfo;
    // using sprite as type for now, should use objType in the future (type is reserved)
    console.log("Created dynamic object \"" + objInfo.sprite + "\" with id " + objInfo.id);
    io.emit("dynamicObjectSpawned", objInfo);
}

function removeDynamicObject(self, objId) {
    self.dynamicObjects.getChildren().forEach(obj => {
        if(objId === obj.id) {
            obj.destroy();
        }
    });
    delete WorldState.dynamicObjects[objId];
    console.log("Deleted dynamic object with id " + objId);
    io.emit("dynamicObjectDeleted", objId);
}

function spawnStaticObject(self, objPreset, worldX, worldY) {
    const imageX = worldToImageX(self, worldX);
    const imageY = worldToImageY(self, worldY);
    if(typeof objPreset === "string") {
        if(OBJECT_PRESETS.hasOwnProperty(objPreset)) {
            objPreset = OBJECT_PRESETS[objPreset];
        } else {
            console.log("Preset not found!");
            return;
        }
    }

    const objInfo = Object.assign({
        id: generateUUID(),
        x: imageX,
        y: imageY
    }, objPreset);

    addStaticObject(self, objInfo);
}

function addStaticObject(self, objInfo) {
    const obj = createGenericObject(self, objInfo, self.staticObjects);
    obj.id = objInfo.id;
    WorldState.staticObjects[objInfo.id] = objInfo;
    console.log("Created static object \"" + objInfo.sprite + "\" with id " + objInfo.id);
    io.emit("staticObjectSpawned", objInfo);
}

function removeStaticObject(self, objId) {
    self.staticObjects.getChildren().forEach(obj => {
        if(objId === obj.id) {
            obj.destroy();
        }
    });
    delete WorldState.staticObjects[objId];
    console.log("Deleted static object with id " + objId);
    if(!noUpdate) {
        io.emit("staticObjectDeleted", objId);
    }
}

function createGenericObject(self, settings, mainGroup) {
    const obj = self.physics.add.image(settings.x, settings.y, settings.sprite)
        .setOrigin(0.5);

    if(mainGroup) {
        mainGroup.add(obj);
    }
    if(settings.group) {
        self[settings.group].add(obj);
    }

    if(settings.circle) {
        obj.body.setCircle(obj.body.width / 2.0);
    }

    let scale = settings.not_pixel_art ? 1.0 : MAP_SCALE;
    if(settings.scale) {
        scale *= settings.scale;
    }
    obj.setScale(scale);
    console.log(obj.displayWidth, obj.displayHeight, obj.body.width, obj.body.height);

    if(settings.bounce) {
        obj.setBounce(settings.bounce, settings.bounce);
    }

    if(settings.mass) {
        obj.setMass(settings.mass);
    }

    if(settings.drag) {
        obj.setDrag(settings.drag, settings.drag);
    }

    return obj;
}

function onServerStart(self) {
    console.log("Server ready!");
    spawnDynamicObject(self, "ball", 200, 200);
    spawnDynamicObject(self, "ball", 400, 400);

    // Pool
    spawnDynamicObject(self, "ball", 500, 300);
    spawnDynamicObject(self, "ball", 500, 500);
    spawnDynamicObject(self, "ball", 525, 535);
    spawnDynamicObject(self, "ball", 475, 535);
    spawnDynamicObject(self, "ball", 500, 570);
    spawnDynamicObject(self, "ball", 550, 570);
    spawnDynamicObject(self, "ball", 450, 570);
    
    spawnStaticObject(self, "fence", 0, 0);
}

const game = new Phaser.Game(config);
window.gameLoaded();