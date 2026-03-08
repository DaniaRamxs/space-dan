import Phaser from 'phaser';

const COLORS = {
    red: 0xef4444,
    green: 0x22c55e,
    yellow: 0xeab308,
    blue: 0x3b82f6,
    white: 0xffffff,
    black: 0x000000,
    gray: 0x334155
};

const START_POSITIONS = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};

export default class LudoScene extends Phaser.Scene {
    constructor() {
        super('LudoScene');
    }

    init(data) {
        this.room = data.room;
        this.state = data.room.state;
        this.pieceSprites = new Map();
        this.boardSize = 600;
        this.tileSize = this.boardSize / 15;
    }

    create() {
        this.drawBoard();
        this.createPieces();

        // Listen for state changes
        this.room.onStateChange(() => {
            this.updatePieces();
        });
    }

    drawBoard() {
        const g = this.add.graphics();
        const s = this.tileSize;

        // Draw Base Areas
        this.drawBase(0, 0, COLORS.red);
        this.drawBase(9 * s, 0, COLORS.green);
        this.drawBase(0, 9 * s, COLORS.yellow);
        this.drawBase(9 * s, 9 * s, COLORS.blue);

        // Draw Path (White squares)
        g.lineStyle(2, 0x1e293b, 1);

        // Define path coordinates logic
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                // Skip base areas and center
                if ((i < 6 && j < 6) || (i > 8 && j < 6) || (i < 6 && j > 8) || (i > 8 && j > 8)) continue;
                if (i >= 6 && i <= 8 && j >= 6 && j <= 8) continue;

                g.fillStyle(COLORS.white, 0.1);
                g.fillRect(i * s, j * s, s, s);
                g.strokeRect(i * s, j * s, s, s);
            }
        }

        // Draw Home Lanes
        for (let i = 1; i < 6; i++) {
            this.drawRect(i * s, 7 * s, s, s, COLORS.red);      // Red home
            this.drawRect(7 * s, i * s, s, s, COLORS.green);    // Green home
            this.drawRect(7 * s, (14 - i) * s, s, s, COLORS.blue); // Blue home
            this.drawRect((14 - i) * s, 7 * s, s, s, COLORS.yellow); // Yellow home
        }

        // Draw Start Squares
        this.drawRect(1 * s, 6 * s, s, s, COLORS.red);
        this.drawRect(8 * s, 1 * s, s, s, COLORS.green);
        this.drawRect(13 * s, 8 * s, s, s, COLORS.yellow);
        this.drawRect(6 * s, 13 * s, s, s, COLORS.blue);

        // Center Finish
        g.fillStyle(COLORS.black, 0.2);
        g.beginPath();
        g.moveTo(6 * s, 6 * s);
        g.lineTo(9 * s, 6 * s);
        g.lineTo(7.5 * s, 7.5 * s);
        g.closePath();
        g.fill(); // Green side? Wait, let's just make it a nice diamond

        // Red triangle
        g.fillStyle(COLORS.red, 0.5);
        g.fillTriangle(6 * s, 6 * s, 6 * s, 9 * s, 7.5 * s, 7.5 * s);
        // Green triangle
        g.fillStyle(COLORS.green, 0.5);
        g.fillTriangle(6 * s, 6 * s, 9 * s, 6 * s, 7.5 * s, 7.5 * s);
        // Yellow triangle
        g.fillStyle(COLORS.yellow, 0.5);
        g.fillTriangle(9 * s, 6 * s, 9 * s, 9 * s, 7.5 * s, 7.5 * s);
        // Blue triangle
        g.fillStyle(COLORS.blue, 0.5);
        g.fillTriangle(6 * s, 9 * s, 9 * s, 9 * s, 7.5 * s, 7.5 * s);
    }

    drawBase(x, y, color) {
        const g = this.add.graphics();
        const s = this.tileSize;
        g.fillStyle(color, 0.2);
        g.fillRect(x, y, 6 * s, 6 * s);
        g.lineStyle(4, color, 0.5);
        g.strokeRect(x + 5, y + 5, 6 * s - 10, 6 * s - 10);

        // 4 dots for base
        g.fillStyle(color, 0.8);
        const dotOffset = 1.5 * s;
        g.fillCircle(x + dotOffset, y + dotOffset, s / 2);
        g.fillCircle(x + 4.5 * s, y + dotOffset, s / 2);
        g.fillCircle(x + dotOffset, y + 4.5 * s, s / 2);
        g.fillCircle(x + 4.5 * s, y + 4.5 * s, s / 2);
    }

    drawRect(x, y, w, h, color) {
        const g = this.add.graphics();
        g.fillStyle(color, 0.5);
        g.fillRect(x, y, w, h);
        g.lineStyle(1, 0x000000, 0.2);
        g.strokeRect(x, y, w, h);
    }

    createPieces() {
        if (!this.state?.players) return;
        this.state.players.forEach((player, sessionId) => {
            this.ensurePlayerPieces(player, sessionId);
        });
        this.updatePieces();
    }

    ensurePlayerPieces(player, sessionId) {
        if (!player.pieces) return;

        player.pieces.forEach((piece, index) => {
            if (this.pieceSprites.has(piece.id)) return;

            const sprite = this.add.circle(0, 0, this.tileSize / 3, COLORS[player.color] || COLORS.white);
            sprite.setStrokeStyle(2, 0xffffff);
            sprite.setInteractive({ useHandCursor: true });
            sprite.setData('index', index);
            sprite.setData('color', player.color);

            sprite.on('pointerdown', () => {
                if (this.room.sessionId === sessionId) {
                    this.room.send("move_piece", { index });
                }
            });

            this.pieceSprites.set(piece.id, sprite);
        });
    }

    updatePieces() {
        if (!this.state?.players) return;
        this.state.players.forEach((player, sessionId) => {
            // Ensure pieces exist if they were added later (e.g. player joined)
            this.ensurePlayerPieces(player, sessionId);

            if (!player.pieces) return;
            player.pieces.forEach(piece => {
                const sprite = this.pieceSprites.get(piece.id);
                if (!sprite) return;

                const pos = this.getGridPosition(player.color, piece.position, piece.index);

                this.tweens.add({
                    targets: sprite,
                    x: pos.x * this.tileSize + this.tileSize / 2,
                    y: pos.y * this.tileSize + this.tileSize / 2,
                    duration: 300,
                    ease: 'Power2'
                });

                // Highlight if it can move
                const isMyTurn = this.state.currentTurn === sessionId;
                const canMove = isMyTurn && this.state.waitingForMove && this.canMove(piece);
                sprite.setAlpha(canMove ? 1 : 0.7);
                if (canMove) {
                    sprite.setScale(1.2 + Math.sin(this.time.now / 100) * 0.1);
                } else {
                    sprite.setScale(1);
                }
            });
        });
    }

    canMove(piece) {
        if (piece.status === "finished") return false;
        if (piece.status === "base") return this.state.diceValue === 6;
        if (piece.position + this.state.diceValue > 57) return false;
        return true;
    }

    getGridPosition(color, position, pieceIndex) {
        if (position === -1) {
            // Base positions
            const offsets = [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]];
            const basePos = {
                red: [0, 0],
                green: [9, 0],
                yellow: [0, 9],
                blue: [9, 9]
            }[color];
            return { x: basePos[0] + offsets[pieceIndex][0], y: basePos[1] + offsets[pieceIndex][1] };
        }

        // Relative to absolute common path mapping
        const path = this.getPath(color);
        const finalCoords = path[position];
        return { x: finalCoords[0], y: finalCoords[1] };
    }

    getPath(color) {
        // Shared path coordinates (52 squares circular)
        const commonPath = [
            [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6]
        ];

        const startIdx = START_POSITIONS[color];
        const result = [];

        // Add 51 generic squares
        for (let i = 0; i < 51; i++) {
            result.push(commonPath[(startIdx + i) % 52]);
        }

        // Add 6 home lane squares
        const homeLanes = {
            red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [7.5, 7.5]],
            green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7.5, 7.5]],
            blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7.5, 7.5]],
            yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [7.5, 7.5]]
        };
        result.push(...homeLanes[color]);

        return result;
    }

    update(time, delta) {
        // Pulse effect for active pieces handled in updatePieces usually, but for continuous animation:
        this.updatePieces();
    }
}
