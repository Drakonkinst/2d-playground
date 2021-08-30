const PlayerModel = (() => {
    const NAMETAG_OFFSET = -40;
    const FONT_SIZE = 16;
    const FADE_TIME = 400;

    return class PlayerModel {
        constructor(scene, playerInfo, sprite) {
            this.playerId = playerInfo.playerId;
            this.scene = scene;
            this.sprite = scene.add.sprite(0, 0, sprite)
                .setOrigin(0.5)
                .setScale(0.5);
            this.nametag = scene.add.text(0, 0, playerInfo.name, {
                fontFamily: 'Arial',
                color: '#000000',
                fontStyle: "bold",
                align: 'center'
            }).setFontSize(FONT_SIZE)
                .setWordWrapWidth(null)
                .setOrigin(0.5)
                .setY(NAMETAG_OFFSET);
            this.dashEmitter = Game.createDustParticleEmitter();
            this.obj = scene.add.container(playerInfo.x, playerInfo.y)
                .add(this.sprite)
                .add(this.nametag)

            this.obj.setAlpha(0);
            this.obj.setSize(this.sprite.width / 2.0, this.sprite.height / 2.0);
            scene.physics.world.enableBody(this.obj);
            this.obj.body.pushable = false;
            this.obj.playerId = this.playerId;
            
            this.dashEmitter.startFollow(this.obj);
            scene.tweens.add({
                targets: this.obj,
                alpha: 1,
                duration: FADE_TIME
            });

            // Add to group
            scene.players.add(this.obj);

            // Add a circular reference to the info object
            this.obj.modelInfo = this;
        }

        onUpdate() {

        }

        onDestroy() {
            this.scene.tweens.add({
                targets: this.obj,
                alpha: 0,
                duration: FADE_TIME,
                onComplete: () => {
                    // Can also set onCompleteScope if needed
                    this.dashEmitter.stop();
                    this.obj.destroy();
                    // Manager must be destroyed, so this needs to use its own manager or we just have empty objects lying around
                    //this.dashEmitter.destroy();
                }
            });
        }
        
        startDashing() {
            this.dashEmitter.start();    
        }
        
        stopDashing() {
            this.dashEmitter.stop();
        }
        
        isDashing() {
            return this.dashEmitter.on;
        }
    }
})();