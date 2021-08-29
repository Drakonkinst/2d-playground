// https://micropi.wordpress.com/2020/05/02/making-a-top-down-game-in-phaser-3/
const Input = (() => {
    return class Input {
        constructor(game) {
            this.game = game;
            this.primaryInput = game.input.keyboard.createCursorKeys();
            this.altInput = game.input.keyboard.addKeys({
                up: 'W',
                left: 'A',
                down: 'S',
                right: 'D'
            });
            game.input.keyboard.on("keydown-SPACE", function() {
                game.player.attemptDash();
            });
        }

        up() {
            return this.primaryInput.up.isDown || this.altInput.up.isDown;
        }

        down() {
            return this.primaryInput.down.isDown || this.altInput.down.isDown;
        }

        left() {
            return this.primaryInput.left.isDown || this.altInput.left.isDown;
        }

        right() {
            return this.primaryInput.right.isDown || this.altInput.right.isDown;
        }
    };
})();

const MyPlayer = (() => {
    const MAX_VELOCITY = 200;
    const DASH_VELOCITY = 500;
    const MAX_DASH_TIME = 250;
    const MAX_DASH_COOLDOWN = 50;
    const SPRITE_SCALE = 0.5;

    return class MyPlayer {
        constructor(game, scene, x, y) {
            this.game = game;
            this.scene = scene;
            this.obj = scene.physics.add.sprite(x, y, "circle").setScale(SPRITE_SCALE);
            this.lastDash = -999;
            this.oldPosition = {
                x: x,
                y: y,
                rotation: 0
            };
        }
        
        attemptDash() {
            const currentTime = this.game.getTime();
            if(!this.canDash(currentTime)) {
                return;
            }
            
            const currentVelocity = this.obj.body.velocity;
            if(currentVelocity.x == 0 && currentVelocity.y == 0) {
                // Not moving, no dash
                return;
            }
            
            const velocityDir = Math.atan2(currentVelocity.y, currentVelocity.x);
            const dashX = DASH_VELOCITY * Math.cos(velocityDir);
            const dashY = DASH_VELOCITY * Math.sin(velocityDir);
            this.obj.setVelocity(dashX, dashY);
            this.lastDash = currentTime;
        }
        
        isDashing(currentTime) {
            if(currentTime == null) {
                currentTime = this.game.getTime();
            }
            return currentTime - this.lastDash < MAX_DASH_TIME;
        }
        
        canDash(currentTime) {
            if(currentTime == null) {
                currentTime = this.game.getTime();
            }
            return currentTime - this.lastDash >= MAX_DASH_TIME + MAX_DASH_COOLDOWN;
        }

        stopMoving() {
            this.obj.setVelocity(0, 0);
        }

        setVelocityDirection(dirX, dirY) {
            const angle = Math.atan2(dirY, dirX);
            const velocityX = MAX_VELOCITY * Math.cos(angle);
            const velocityY = MAX_VELOCITY * Math.sin(angle);
            this.obj.setVelocity(velocityX, velocityY);
        }
        
        // "teleport"
        setPosition(x, y) {
            this.obj.setPosition(x, y);
        }

        getX() {
            return this.obj.x;
        }

        getY() {
            return this.obj.y;
        }
        
        getSpriteScale() {
            return SPRITE_SCALE;
        }
    };
})();

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
        this.load.image("circle", "assets/circle.png");
        this.load.image("other", "assets/other.png");
        this.load.image("obstacle", "assets/obstacle.png");
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
        
        setupBounds();

        // Setup input
        inputHandler = new Input(scene);
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
        scene.physics.add.collider(scene.player.obj, scene.wallBounds);
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
        
        const FADE_OUT_TIME = 400;
        socket.on("playerDisconnect", playerId => {
            scene.otherPlayers.getChildren().forEach(otherPlayer => {
                if(playerId === otherPlayer.playerId) {
                    scene.tweens.add({
                        targets: otherPlayer,
                        alpha: 0,
                        duration: FADE_OUT_TIME,
                        onComplete: () => {
                            // Can also set onCompleteScope if needed
                            otherPlayer.destroy();
                        }
                    });
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
        const otherPlayerNametag = scene.add.text(0, 0, playerInfo.playerId, {
            fontFamily: 'Arial',
            color: '#000000',
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
    }

    /* UPDATE */
    function update() {
        if(instantCameraFrame) {
            instantCameraFrame = false;
        } else if(cameraIsInstant()) {
            scene.cameras.main.setLerp(CAMERA_SPEED, CAMERA_SPEED);
        }
        
        const self = this;
        if(!this.player.isDashing()) {
            handleInput(self);
        }

        // emit player movement
        if(playerHasMoved(this.player.obj, this.player.oldPosition)) {
            let newPos = {
                x: this.player.obj.x,
                y: this.player.obj.y,
                rotation: this.player.obj.rotation
            }
            socket.emit("playerMovement", newPos)
            this.player.oldPosition = newPos;
        }
    }
    
    function handleInput(self) {
        let dirX = 0;
        let dirY = 0;
        
        if(inputHandler.left()) {
            dirX = -1;
        } else if(inputHandler.right()) {
            dirX = 1;
        }

        if(inputHandler.up()) {
            dirY = -1;
        } else if(inputHandler.down()) {
            dirY = 1;
        }

        if(dirX != 0 || dirY != 0) {
            self.player.setVelocityDirection(dirX, dirY);
        } else {
            self.player.stopMoving();
        }
    }
    
    function cameraIsInstant() {
        return scene.cameras.main.lerp.x == 1 && scene.cameras.main.lerp.y == 1;
    }

    function playerHasMoved(playerObj, oldPosition) {
        const x = playerObj.x;
        const y = playerObj.y;
        const rotation = playerObj.rotation;
        return (oldPosition.x !== x) || (oldPosition.y !== y) || (oldPosition.rotation !== rotation);
    }
    
    function teleportCameraNextFrame() {
        instantCameraFrame = true;
        scene.cameras.main.setLerp(1, 1);
    }

    return {
        getGame() {
            return game;
        }
    };
})();