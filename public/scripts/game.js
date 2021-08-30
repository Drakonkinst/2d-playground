// https://micropi.wordpress.com/2020/05/02/making-a-top-down-game-in-phaser-3/
const Game = (() => {
    const CAMERA_SPEED = 1; // 0 to 1
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: 0x000000,
        physics: {
            default: "arcade",
            arcade: {
                debug: false // Turn this on to see hitboxes
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };
    const TYPE_TO_SPRITE_INFO = {
        "obstacle": {
            "sprite": "obstacle"
        },
        "ball": {
            "sprite": "npc",
            "group": "balls",
            "scale": 0.4,
            "bounce": 0.75,
            "drag": 75,
            "radius": 100
        }
    };

    /* SETUP */
    let game = new Phaser.Game(config);
    let scene;
    let inputHandler;
    let socket;
    let isCameraAttached = false;
    
    const players = {};
    const staticObjects = {};
    const dynamicObjects = {};
    //const npcs = {};

    function preload() {
        this.load.image("floor", "assets/floor.png");
        this.load.image("dust", "assets/dust.png");
        this.load.image("circle", "assets/circle.png");
        this.load.image("npc", "assets/npc.png");
        this.load.image("other", "assets/other.png");
        this.load.image("obstacle", "assets/obstacle.png");
        this.load.audio("woosh", "assets/woosh.mp3");
        this.load.html("chatinput", "pages/chatinput.html");
    }

    function create() {
        scene = this;

        // Setup socket
        setupSocket();

        // Setup background
        let background = scene.add.image(0, 0, "floor")
            .setOrigin(0, 0); // Center image
        scene.xLimit = background.displayWidth;
        scene.yLimit = background.displayHeight;

        scene.particleManager = {};
        scene.particleManager.dustParticle = this.add.particles("dust");

        // Setup player

        // Setup camera
        scene.cameras.main.setBounds(0, 0, scene.xLimit, scene.yLimit)
        scene.cameras.main.fadeIn(300, 0, 0, 0);

        // Setup objects
        scene.staticObjects = scene.physics.add.staticGroup();
        scene.dynamicObjects = scene.physics.add.group();

        // Setup inputs
        inputHandler = new Input(scene, socket);
    }

    function setupSocket() {
        socket = io();
        scene.players = scene.physics.add.group();

        socket.on("currentWorldState", WorldState => {
            loadCurrentPlayers(WorldState.players);
            //loadStaticObjects(WorldState.staticObjects);
            loadCurrentDynamicObjects(WorldState.dynamicObjects);
        });

        socket.on("playerConnect", playerInfo => {
            console.log("playerConnect received");
            displayPlayer(playerInfo, "other");
        });

        socket.on("playerDisconnect", playerId => {
            destroyPlayer(playerId);
        });
        
        socket.on("playerStateUpdates", playerInfos => {
            scene.players.getChildren().forEach(player => {
                const playerInfo = playerInfos[player.playerId];
                const playerModel = players[player.playerId];
                const isSelf = socket.id === player.playerId;
                if(!playerInfo || !playerModel) {
                    return;
                }
                player.setPosition(playerInfo.x, playerInfo.y);

                if(playerInfo.dashing && !playerModel.isDashing()) {
                    // Only play sound for self, for now
                    if(isSelf) {
                        scene.game.sound.play("woosh", {
                            volume: 0.3
                        });
                    }
                    playerModel.startDashing();
                } else if(!playerInfo.dashing && playerModel.isDashing()) {
                    playerModel.stopDashing();
                }
            });
        });
        
        socket.on("dynamicObjectUpdates", dynamicObjectsInfo => {
            scene.dynamicObjects.getChildren().forEach(dynamicObject => {
                const dynamicObjectInfo = dynamicObjectsInfo[dynamicObject.id];
                if(!dynamicObjectInfo) {
                    return;
                }
                dynamicObject.setPosition(dynamicObjectInfo.x, dynamicObjectInfo.y);
            });
        });
        
        socket.on("staticObjectSpawned", info => {
            addStaticObject(info);
        });
        
        socket.on("staticObjectDespawned", id => {
            deleteStaticObject(id);
        });
        
        socket.on("dynamicObjectSpawned", info => {
            addDynamicObject(info);    
        });
        
        socket.on("dynamicObjectDespawned", id => {
            deleteDynamicObject(id);
        });
        
        socket.on("update", () => {
            console.log("Update!");
        });
        
        socket.on("npcSpawned", npcInfo => {
            // TODO might be better to use an inbuilt group
            npcs[npcInfo.id] = scene.add.sprite(npcInfo.x, npcInfo.y, "npc").setScale(0.5);
        });
        
        socket.on("npcMoved", movementData => {
            if(!npcs.hasOwnProperty(movementData.id)) {
                npcs[movementData.id] = scene.add.sprite(movementData.x, movementData.y, "npc")
                    .setScale(0.5);
            } else {
                npcs[movementData.id].setPosition(movementData.x, movementData.y);
            }
        });
    }
    
    function loadCurrentPlayers(players) {
        for(id in players) {
            const player = players[id];
            if(player.playerId === socket.id) {
                displayPlayer(player, "circle");
            } else {
                displayPlayer(player, "other");
            }
        }
    }
    
    function displayPlayer(playerInfo, sprite) {
        const playerModel = new PlayerModel(scene, playerInfo, sprite)
        players[playerInfo.playerId] = playerModel;
    }
    
    function destroyPlayer(playerId) {
        scene.players.getChildren().forEach(player => {
            if(playerId === player.playerId) {
                const modelInfo = player.modelInfo;
                modelInfo.onDestroy();
                delete players[player.playerId];
            }
        });
    }
    
    function loadCurrentDynamicObjects(dynamicObjects) {
        for(id in dynamicObjects) {
            const objInfo = dynamicObjects[id];
            displayDynamicObject(objInfo);
        }
    }
    
    function displayDynamicObject(objInfo) {
        const objModel = scene.dynamicObjects.create(objInfo.x, objInfo.y, objInfo.sprite)
            .setOrigin(0.5);
        if(objInfo.scale) {
            objModel.setScale(objInfo.scale);
        }
        objModel.id = objInfo.id;
        //const spriteInfo = TYPE_TO_SPRITE_INFO[info.type];
        //const dynamicObject = scene.dynamicObjects.create(info.x, info.y, spriteInfo.sprite);
        //applyProperties(dynamicObject, spriteInfo);
        //dynamicObject.id = info.id;    
    }
    
    function deleteDynamicObject(id) {
        scene.dynamicObjects.getChildren().forEach(obj => {
            if(obj.id == id) {
                obj.destroy();
            }
        });
    }
    
    function loadStaticObjects(staticObjects) {
        for(const staticObject of Object.values(staticObjects)) {
            addStaticObject(staticObject);
        }
    }

    function addStaticObject(info) {
        const spriteInfo = TYPE_TO_SPRITE_INFO[info.type];
        const staticObject = scene.staticObjects.create(info.x, info.y, spriteInfo.sprite);
        applyProperties(staticObject, spriteInfo);
        staticObject.id = info.id;
    }

    function deleteStaticObject(id) {
        scene.staticObjects.getChildren().forEach(obj => {
            if(obj.id == id) {
                obj.destroy();
            }
        });
    }
    
    function applyProperties(obj, spriteInfo) {
        if(spriteInfo.scale) {
            obj.setScale(spriteInfo.scale);
        }
        if(spriteInfo.group) {
            scene[spriteInfo.group].add(obj);
        }
        if(spriteInfo.bounce) {
            obj.body.setBounce(spriteInfo.bounce, spriteInfo.bounce);
        }
        if(spriteInfo.drag) {
            obj.body.setDrag(spriteInfo.drag, spriteInfo.drag);
        }
        if(spriteInfo.radius) {
            obj.body.setCircle(obj.body.width / 2.0);
        }
    }

    /* UPDATE */
    function update() {
        // If camera is not attached, look for player to attach
        if(!isCameraAttached && players.hasOwnProperty(socket.id)) {
            const selfPlayer = players[socket.id].obj;
            scene.cameras.main.startFollow(selfPlayer, false, CAMERA_SPEED, CAMERA_SPEED);
            isCameraAttached = true;
        }
        
        inputHandler.handleInput();
    }

    return {
        // TODO: Should probably move this now it's only used in PlayerModel
        createDustParticleEmitter() {
            const emitter = scene.particleManager.dustParticle.createEmitter({
                speed: 80,
                scale: 0.2,
                lifespan: 2000
            });
            emitter.setAlpha(function (p, k, t) {
                return 1 - t;
            });
            emitter.stop();
            return emitter;
        },
        
        spawnStaticObject(x, y, sprite) {
            const info = {
                x: x,
                y: y,
                sprite: sprite
            };
            socket.emit("spawnStaticObject", info);
        },
        
        despawnStaticObject(id) {
            socket.emit("despawnStaticObject", id);
        },
        
        getGame() {
            return game;
        },

        getInputHandler() {
            return inputHandler;
        },
        
        getSocket() {
            return socket;
        },
        
        getOtherPlayers() {
            return players;
        }
    };
})();