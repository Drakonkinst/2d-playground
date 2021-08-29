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

    return class MyPlayer {
        constructor(game, x, y) {
            this.game = game;
            this.obj = game.physics.add.sprite(x, y, "circle").setScale(0.5);
            this.oldPosition = {
                x: x,
                y: y,
                rotation: 0
            };
        }

        stopMoving() {
            this.obj.setVelocity(0, 0);
        }

        setVelocityDirection(dirX, dirY) {
            let angle = Math.atan2(dirY, dirX);
            let velocityX = MAX_VELOCITY * Math.cos(angle);
            let velocityY = MAX_VELOCITY * Math.sin(angle);
            this.obj.setVelocity(velocityX, velocityY);
        }

        getX() {
            return this.obj.x;
        }

        getY() {
            return this.obj.y;
        }
    };
})();
const Game = (() => {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
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
    const game = new Phaser.Game(config);
    let inputHandler;
    let socket;

    function preload() {
        this.load.image("floor", "assets/floor.png");
        this.load.image("circle", "assets/circle.png");
        this.load.image("other", "assets/other.png");
        this.load.image("obstacle", "assets/obstacle.png");
    }

    function create() {
        // Setup socket
        setupSocket(this);

        // Setup background
        let background = this.add.image(0, 0, "floor")
            .setOrigin(0, 0); // Center image
        this.xLimit = background.displayWidth;
        this.yLimit = background.displayHeight;

        // Setup player
        this.player = new MyPlayer(this, 300, 300);

        // Setup camera
        const CAMERA_SPEED = 0.2;
        this.cameras.main
            .setBounds(0, 0, this.xLimit, this.yLimit)
            .startFollow(this.player.obj)
            .setRoundPixels(false) // default false
            .setLerp(CAMERA_SPEED, CAMERA_SPEED);

        // Setup obstacles
        this.obstacles = this.physics.add.staticGroup(); //create group for obstacles
        this.obstacles.create(800, 600, "obstacle");
        this.obstacles.create(900, 800, "obstacle");

        this.physics.add.collider(this.player.obj, this.obstacles); //collision detection between player and obstacles

        // Setup input
        inputHandler = new Input(this);
    }
    
    function setupSocket(gameObj) {
        socket = io();
        gameObj.otherPlayers = gameObj.physics.add.group();

        socket.on("currentPlayers", players => {
            for(id in players) {
                const otherPlayer = players[id];
                if(otherPlayer.playerId !== socket.id) {
                    addOtherPlayer(gameObj, otherPlayer);
                }
            }
        });
        
        socket.on("playerConnect", playerInfo => {
            console.log("playerConnect received");
            addOtherPlayer(gameObj, playerInfo);
        });
        
        socket.on("playerDisconnect", playerId => {
            gameObj.otherPlayers.getChildren().forEach(otherPlayer => {
                if(playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                }
            });
        });

        socket.on("playerMoved", playerInfo => {
            gameObj.otherPlayers.getChildren().forEach(otherPlayer => {
                if(playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.setRotation(playerInfo.rotation);
                }
            });
        });
    }

    function addOtherPlayer(gameObj, playerInfo) {
        const otherPlayer = gameObj.add.sprite(playerInfo.x, playerInfo.y, "other")
            .setScale(0.5);
        otherPlayer.playerId = playerInfo.playerId;
        gameObj.otherPlayers.add(otherPlayer);
    }

    /* UPDATE */
    function update() {
        let dirX = 0;
        let dirY = 0;

        if(inputHandler.left() && this.player.getX() >= 0) {
            dirX = -1;
        }
        else if(inputHandler.right() && this.player.getX() <= this.xLimit) {
            dirX = 1;
        }

        if(inputHandler.up() && this.player.getY() >= 0) {
            dirY = -1;
        }
        else if(inputHandler.down() && this.player.getY() <= this.yLimit) {
            dirY = 1;
        }

        if(dirX != 0 || dirY != 0) {
            this.player.setVelocityDirection(dirX, dirY);
        } else {
            this.player.stopMoving();
        }

        // emit player movement
        if(playerHasMoved(this.player.obj, this.player.oldPosition)) {
            let newPos = {
                x: this.player.obj.x,
                y: this.player.obj.y,
                rotation: this.rotation
            }
            socket.emit("playerMovement", newPos)
            this.oldPosition = newPos;
        }
    }

    function playerHasMoved(playerObj, oldPosition) {
        const x = playerObj.x;
        const y = playerObj.y;
        const rotation = playerObj.rotation;
        return (oldPosition.x !== x) || (oldPosition.y !== y) || (oldPosition.rotation !== rotation);
    }

    return {
        getGame() {
            return game;
        }
    };
})();