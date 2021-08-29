// https://micropi.wordpress.com/2020/05/02/making-a-top-down-game-in-phaser-3/
const Game = (() => {
    const CAMERA_SPEED = 0.2;
    const WALL_BOUNDS_SIZE = 10;
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

    /* SETUP */
    let game = new Phaser.Game(config);
    let scene;
    let inputHandler;
    let socket;
    let instantCameraFrame = false;

    function preload() {
        this.load.image("floor", "assets/floor.png");
        this.load.image("dust", "assets/dust.png");
        this.load.image("circle", "assets/circle.png");
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
        scene.player = new MyPlayer(game, scene, 0, 0);

        // Setup camera
        scene.cameras.main
            .setBounds(0, 0, scene.xLimit, scene.yLimit)
            .startFollow(scene.player.obj)
            .setRoundPixels(false) // default false
            .setLerp(CAMERA_SPEED, CAMERA_SPEED);
        scene.cameras.main.fadeIn(300, 0, 0, 0);


        // Setup obstacles
        scene.obstacles = scene.physics.add.staticGroup(); //create group for obstacles
        scene.obstacles.create(800, 600, "obstacle");
        scene.obstacles.create(900, 800, "obstacle");
        scene.physics.add.collider(scene.player.obj, scene.obstacles); //collision detection between player and obstacles

        /*
        scene.boxes = scene.physics.add.group({
            dragX: 500,
            dragY: 500
        });
        scene.boxes.create(100, 300, "circle").setScale(0.7);//.setCircle(10);
        //scene.boxes.create(200, 300, "circle").setPushable(false);
        //scene.boxes.create(300, 300, "circle");
        //scene.boxes.create(400, 300, "circle");
        scene.physics.add.collider(scene.boxes);
        scene.physics.add.overlap(scene.boxes, scene.boxes, function (box1, box2) {
            let deltaX = box2.x - box1.x;
            let deltaY = box2.y - box1.y;
            let isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if(isHorizontal) {
                if(box1.body.velocity.x < 0 && deltaX < 0
                    && !box2.body.blocked.left && !box2.body.touching.left) {
                    box2.body.setVelocityX(box1.body.velocity.x);
                } else if(box1.body.velocity.x > 0 && deltaX > 0
                    && !box2.body.blocked.right && !box2.body.touching.right) {
                    box2.body.setVelocityX(box1.body.velocity.x);
                }
            } else {
                if(box1.body.velocity.y < 0 && deltaY < 0
                    && !box2.body.blocked.up && !box2.body.touching.up) {
                    box2.body.setVelocityY(box1.body.velocity.y);
                } else if(box1.body.velocity.y > 0 && deltaY > 0
                    && !box2.body.blocked.down && !box2.body.touching.down) {
                    box2.body.setVelocityY(box1.body.velocity.y);
                }
            }
        });
        scene.physics.add.overlap(scene.player.obj, scene.boxes, function(player, box) {
            let deltaX = box.x - player.x;
            let deltaY = box.y - player.y;
            let isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if(isHorizontal) {
                if(player.body.velocity.x < 0 && deltaX < 0
                    && !box.body.blocked.left && !box.body.touching.left) {
                    box.body.setVelocityX(player.body.velocity.x);
                } else if(player.body.velocity.x > 0 && deltaX > 0
                    && !box.body.blocked.right && !box.body.touching.right) {
                    box.body.setVelocityX(player.body.velocity.x);
                }
            } else {
                if(player.body.velocity.y < 0 && deltaY < 0
                    && !box.body.blocked.up && !box.body.touching.up) {
                    box.body.setVelocityY(player.body.velocity.y);
                } else if(player.body.velocity.y > 0 && deltaY > 0
                    && !box.body.blocked.down && !box.body.touching.down) {
                    box.body.setVelocityY(player.body.velocity.y);
                }
            }
        });
        scene.physics.add.collider(scene.obstacles, scene.boxes);*/


        setupBounds();
        scene.physics.add.collider(scene.wallBounds, scene.player.obj);
        //scene.physics.add.collider(scene.wallBounds, scene.boxes);

        // Setup input
        inputHandler = new Input(scene);
        
        // Chat
        /*
        scene.chatInput = scene.add.dom(300, 300)
            .createFromCache("chatinput")
            .setOrigin(0.5);
        scene.chat = scene.add.text(10, 10, "", { lineSpacing: 15, backgroundColor: "#21313CDD", color: "#26924F", padding: 10, fontStyle: "bold" });
        scene.chat.setFixedSize(270, 645);
        */
    }

    function setupBounds() {
        const HALF_WALL_WIDTH = WALL_BOUNDS_SIZE / 2.0;
        scene.wallBounds = scene.physics.add.staticGroup();
        scene.wallBounds.create(-HALF_WALL_WIDTH, scene.yLimit / 2.0)
            .setAlpha(0)
            .body.setSize(WALL_BOUNDS_SIZE, scene.yLimit);
        scene.wallBounds.create(scene.xLimit + HALF_WALL_WIDTH, scene.yLimit / 2.0)
            .setAlpha(0)
            .body.setSize(WALL_BOUNDS_SIZE, scene.yLimit);
        scene.wallBounds.create(scene.xLimit / 2.0, -HALF_WALL_WIDTH)
            .setAlpha(0)
            .body.setSize(scene.xLimit, WALL_BOUNDS_SIZE)
        scene.wallBounds.create(scene.xLimit / 2.0, scene.yLimit + HALF_WALL_WIDTH)
            .setAlpha(0)
            .body.setSize(scene.xLimit, WALL_BOUNDS_SIZE)
    }

    function setupSocket() {
        socket = io();
        scene.otherPlayers = scene.physics.add.group();

        socket.on("currentPlayers", players => {
            for(id in players) {
                const otherPlayer = players[id];
                if(otherPlayer.playerId === socket.id) {
                    scene.player.setPosition(otherPlayer.x, otherPlayer.y);
                    teleportCameraNextFrame();
                } else {
                    addOtherPlayer(otherPlayer);
                }
            }
        });

        socket.on("playerConnect", playerInfo => {
            console.log("playerConnect received");
            addOtherPlayer(playerInfo);
        });

        socket.on("playerDisconnect", playerId => {
            scene.otherPlayers.getChildren().forEach(otherPlayer => {
                if(playerId === otherPlayer.playerId) {
                    deleteOtherPlayer(otherPlayer)
                }
            });
        });

        socket.on("playerMoved", playerInfo => {
            scene.otherPlayers.getChildren().forEach(otherPlayer => {
                if(playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.setRotation(playerInfo.rotation);
                }
            });
        });
    }

    function addOtherPlayer(playerInfo) {
        const NAMETAG_OFFSET = -40;
        const FONT_SIZE = 16;

        const otherPlayerSprite = scene.add.sprite(0, 0, "other")
            .setScale(scene.player.getSpriteScale());
        const otherPlayerNametag = scene.add.text(0, 0, playerInfo.name, {
            fontFamily: 'Arial',
            color: '#000000',
            fontStyle: "bold",
            align: 'center'
        }).setFontSize(FONT_SIZE)
            .setOrigin(0.5)
            .setY(NAMETAG_OFFSET)
        const otherPlayer = scene.add.container(playerInfo.x, playerInfo.y)
            .setRotation(playerInfo.rotation)
            .add(otherPlayerSprite)
            .add(otherPlayerNametag)

        otherPlayer.playerId = playerInfo.playerId;
        scene.otherPlayers.add(otherPlayer);
        
        // fade in
        const FADE_IN_TIME = 400;
        otherPlayer.setAlpha(0);
        scene.tweens.add({
            targets: otherPlayer,
            alpha: 1,
            duration: FADE_IN_TIME
        });
    }
    
    function deleteOtherPlayer(playerObj) {
        const FADE_OUT_TIME = 400;
        scene.tweens.add({
            targets: playerObj,
            alpha: 0,
            duration: FADE_OUT_TIME,
            onComplete: () => {
                // Can also set onCompleteScope if needed
                playerObj.destroy();
            }
        });
    }

    /* UPDATE */
    function update() {
        if(instantCameraFrame) {
            instantCameraFrame = false;
        } else if(cameraIsInstant()) {
            scene.cameras.main.setLerp(CAMERA_SPEED, CAMERA_SPEED);
        }

        const self = this;
        this.player.updatePlayer();

        /*
        scene.boxes.getChildren().forEach(box => {
            //console.log(box.body.blocked.none);
            if(box.body.blocked.top || box.body.touching.top) {
                //console.log("BOX");
                box.setVelocityX(0);
            }
            //console.log(box);
        });
        */
    }

    function cameraIsInstant() {
        return scene.cameras.main.lerp.x == 1 && scene.cameras.main.lerp.y == 1;
    }

    function teleportCameraNextFrame() {
        instantCameraFrame = true;
        scene.cameras.main.setLerp(1, 1);
    }

    return {
        getGame() {
            return game;
        },

        getInputHandler() {
            return inputHandler;
        },
        
        getSocket() {
            return socket;
        }
    };
})();