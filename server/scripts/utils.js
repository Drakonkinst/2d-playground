function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function imageToWorldX(self, imageX) {
    return imageX - (self.xLimit / 2.0);
}

function imageToWorldY(self, imageY) {
    return imageY - (self.yLimit / 2.0);
}

function worldToImageX(self, worldX) {
    return worldX + (self.xLimit / 2.0);
}

function worldToImageY(self, worldY) {
    return worldY + (self.yLimit / 2.0);    
}