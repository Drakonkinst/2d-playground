const Input = (() => {
    return class Input {
        constructor(scene) {
            this.scene = scene;
            this.primaryInput = scene.input.keyboard.createCursorKeys();
            this.altInput = scene.input.keyboard.addKeys({
                up: 'W',
                left: 'A',
                down: 'S',
                right: 'D'
            });
            scene.input.keyboard.on("keydown-SPACE", function () {
                scene.player.attemptDash();
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