const MyPlayer = (() => {
    const MAX_VELOCITY = 250;
    const DASH_VELOCITY = 500;
    const MAX_DASH_TIME = 250;
    const MAX_DASH_COOLDOWN = 50;
    const SPRITE_SCALE = 0.5;

    function playerHasMoved(playerObj, oldPosition) {
        const x = playerObj.x;
        const y = playerObj.y;
        return (oldPosition.x !== x) || (oldPosition.y !== y);
    }
    return class MyPlayer {
        constructor(game, scene, x, y) {
            this.game = game;
            this.scene = scene;
            this.lastDash = -999;
            this.oldPosition = {
                x: x,
                y: y
            };
            
        }

        onUpdate() {
            if(this.canDash()) {
                if(this.dashEmitter.on) {
                    this.sendMovementUpdate();
                    this.dashEmitter.stop();
                }
            }

            if(!this.isDashing()) {
                //this.handleInput();
            }

            // emit player movement
            if(playerHasMoved(this.obj, this.oldPosition)) {
                this.sendMovementUpdate();
            }
        }
        
        sendMovementUpdate() {
            let newPos = {
                x: this.obj.x,
                y: this.obj.y,
                dashing: !this.canDash()
            }
            Game.getSocket().emit("playerMovement", newPos)
            this.oldPosition = newPos;
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

            this.game.sound.play("woosh", {
                volume: 0.3
            });
            this.dashEmitter.start();
        }

        handleInput() {
            let dirX = 0;
            let dirY = 0;
            const inputHandler = Game.getInputHandler();

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
                this.setVelocityDirection(dirX, dirY);
            } else {
                this.stopMoving();
            }
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