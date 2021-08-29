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
            game.input.keyboard.on("keydown-SPACE", function () {
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