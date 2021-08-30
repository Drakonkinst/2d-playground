const Input = (() => {
    return class Input {
        constructor(scene, socket) {
            this.scene = scene;
            this.socket = socket;
            this.primaryInput = scene.input.keyboard.createCursorKeys();
            this.altInput = scene.input.keyboard.addKeys({
                up: 'W',
                left: 'A',
                down: 'S',
                right: 'D'
            });
            
            const self = this;
            scene.input.keyboard.on("keydown-SPACE", function () {
                self.spaceHit = true;
            });
            scene.input.keyboard.on("keydown-SHIFT", function () {
                self.shiftHit = true;
            });
            
            this.leftPressed = false;
            this.rightPressed = false;
            this.upPressed = false;
            this.downPressed = false;
            this.spaceHit = false;
            this.shiftHit = false;
        }
        
        handleInput() {
            const prevLeft = this.leftPressed;
            const prevRight = this.rightPressed;
            const prevUp = this.upPressed;
            const prevDown = this.downPressed;
            
            this.leftPressed = false;
            this.rightPressed = false;
            this.upPressed = false;
            this.downPressed = false;
            
            if(this.left()) {
                this.leftPressed = true;
            } else if(this.right()) {
                this.rightPressed = true;
            }
            
            if(this.up()) {
                this.upPressed = true;
            } else if(this.down()) {
                this.downPressed = true;
            }
            
            let space = this.spaceHit;
            let shift = this.shiftHit;
            this.spaceHit = false;
            this.shiftHit = false;
            
            const hasInputChanged = (prevLeft !== this.leftPressed)
                || (prevRight !== this.rightPressed)
                || (prevUp !== this.upPressed)
                || (prevDown !== this.downPressed)
                || space || shift;
            if(hasInputChanged) {
                this.socket.emit("playerInput", {
                    left: this.leftPressed,
                    right: this.rightPressed,
                    up: this.upPressed,
                    down: this.downPressed,
                    spaceHit: space,
                    shiftHit: shift
                });
            }
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
        
        isMoving() {
            return this.up() || this.down() || this.left() || this.right();
        }
    };
})();