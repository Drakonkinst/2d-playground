const NPC = (() => {
    return class NPC {
        constructor(id) {
            this.id = id;
            this.x = 0;
            this.y = 0;
            this.needsUpdate = false;
        }
        
        onUpdate() {
            this.doWander();
            this.changed();
        }
        
        doWander() {
        }
        
        setPosition(x, y) {
        }
        
        changed() {
            this.needsUpdate = true;
        }
        
        getMaxVelocity() {
            return 1.0;
        }
    };
})();

module.exports = { NPC };