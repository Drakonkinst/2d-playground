// https://micropi.wordpress.com/2020/05/02/making-a-top-down-game-in-phaser-3/
const Game = (() => {
    const CAMERA_SPEED = 1; // 0 to 1
    const MAP_SCALE = 8; // Must match server
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: 0x000000,
        pixelArt: true,
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

    /* SETUP */
    let game = new Phaser.Game(config);
    let scene;
    let inputHandler;
    let socket;
    let isCameraAttached = false;
    
    const playerModels = {};
    //const npcs = {};

    function preload() {
        this.load.image("map", "assets/map.png");
        this.load.image("dust", "assets/dust.png");
        this.load.image("circle", "assets/circle.png");
        this.load.image("npc", "assets/npc.png");
        this.load.image("other", "assets/other.png");
        this.load.image("obstacle", "assets/obstacle.png");
        this.load.image("fence", "assets/fence.png");
        this.load.audio("woosh", "assets/woosh.mp3");
        this.load.html("chatinput", "pages/chatinput.html");
    }

    function create() {
        scene = this;

        // Setup socket
        setupSocket();

        // Setup background
        let background = scene.add.image(0, 0, "map")
            .setScale(MAP_SCALE)
            .setOrigin(0, 0); // Center image
        const xLimit = background.displayWidth;
        const yLimit = background.displayHeight;

        scene.particleManager = {};
        scene.particleManager.dustParticle = this.add.particles("dust");

        // Setup player

        // Setup camera
        scene.cameras.main.setBounds(0, 0, xLimit, yLimit);
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
            loadCurrentStaticObjects(WorldState.staticObjects);
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
                const playerModel = playerModels[player.playerId];
                const isSelf = socket.id === player.playerId;
                if(!playerInfo || !playerModel) {
                    console.log("Warning: Player " + player.playerId + " info not found");
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
                    console.log("Warning: Dynamic object " + dynamicObject.id + " info not found");
                    return;
                }
                dynamicObject.setPosition(dynamicObjectInfo.x, dynamicObjectInfo.y);
            });
        });
        
        socket.on("staticObjectSpawned", info => {
            displayStaticObject(info);
        });
        
        socket.on("staticObjectDeleted", id => {
            deleteStaticObject(id);
        });
        
        socket.on("dynamicObjectSpawned", info => {
            displayDynamicObject(info);   
        });
        
        socket.on("dynamicObjectDeleted", id => {
            deleteDynamicObject(id);
        });
        
        socket.on("update", () => {
            console.log("Update!");
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
    
    function loadCurrentDynamicObjects(dynamicObjects) {
        for(id in dynamicObjects) {
            const objInfo = dynamicObjects[id];
            displayDynamicObject(objInfo);
        }
    }

    function loadCurrentStaticObjects(staticObjects) {
        console.log(staticObjects);
        for(id in staticObjects) {
            const objInfo = staticObjects[id];
            displayStaticObject(objInfo);
        }
    }
    
    function displayPlayer(playerInfo, sprite) {
        const playerModel = new PlayerModel(scene, playerInfo, sprite)
        playerModels[playerInfo.playerId] = playerModel;
        console.log("Registered player " + playerInfo.playerId);
    }
    
    function destroyPlayer(playerId) {
        scene.players.getChildren().forEach(player => {
            if(playerId === player.playerId) {
                const modelInfo = player.modelInfo;
                modelInfo.onDestroy();
                delete playerModels[player.playerId];
            }
        });
        console.log("Deleted player " + playerId);
    }
    
    function displayDynamicObject(objInfo) {
        const objModel = scene.dynamicObjects.create(objInfo.x, objInfo.y, objInfo.sprite)
            .setOrigin(0.5);
        applyDisplayProperties(objInfo, objModel);
        objModel.id = objInfo.id;
        console.log("Registered dynamic object " + objInfo.id);
    }
    
    function deleteDynamicObject(objId) {
        scene.dynamicObjects.getChildren().forEach(obj => {
            if(obj.id == objId) {
                obj.destroy();
            }
        });
        console.log("Deleted dynamic object " + objId);
    }

    function displayStaticObject(objInfo) {
        const objModel = scene.staticObjects.create(objInfo.x, objInfo.y, objInfo.sprite)
            .setOrigin(0.5);
        applyDisplayProperties(objInfo, objModel);
        objModel.id = objInfo.id;
        console.log("Registered static object " + objInfo.id);
    }

    function deleteStaticObject(objId) {
        scene.staticObjects.getChildren().forEach(obj => {
            if(obj.id == objId) {
                obj.destroy();
            }
        });
        console.log("Deleting static object " + objId);
    }
    
    function applyDisplayProperties(objInfo, objModel) {
        let scale = objInfo.not_pixel_art ? 1.0 : MAP_SCALE;
        if(objInfo.scale) {
            scale *= objInfo.scale;
        }
        objModel.setScale(scale);
    }

    /* UPDATE */
    function update() {
        // If camera is not attached, look for player to attach
        if(!isCameraAttached && playerModels.hasOwnProperty(socket.id)) {
            const selfPlayer = playerModels[socket.id].obj;
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
        
        spawnStaticObject(objPreset, worldX, worldY) {
            socket.emit("spawnStaticObject", objPreset, worldX, worldY);
        },
        
        removeStaticObject(objId) {
            socket.emit("removeStaticObject", objId);
        },
        
        spawnDynamicObject(objPreset, worldX, worldY) {
            socket.emit("spawnDynamicObject", objPreset, worldX, worldY);
        },
        
        removeDynamicObject(objId) {
            socket.emit("removeDynamicObject", objId);
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
            return playerModels;
        }
    };
})();