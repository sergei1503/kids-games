// ModeBase - Abstract base class for game modes
// All modes extend this class and implement the lifecycle methods

class ModeBase {
    constructor(canvas, ctx, renderer) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.renderer = renderer;
        this.stones = [];
        this.isActive = false;
    }

    // Initialize mode (called when mode is activated)
    init() {
        this.isActive = true;
        // Override in subclasses
    }

    // Update game state (called every frame)
    update(deltaTime) {
        // Override in subclasses
        // Update stones by default
        this.stones.forEach(stone => stone.update(deltaTime));
    }

    // Render mode (called every frame)
    render() {
        // Override in subclasses
        // Draw background and stones by default
        this.renderer.drawBackground();
        this.stones.forEach(stone => stone.draw(this.ctx));
    }

    // Handle pointer down event
    onPointerDown(x, y) {
        // Override in subclasses for custom behavior
        return null; // Return stone if one was grabbed
    }

    // Handle pointer move event
    onPointerMove(x, y, draggedStone) {
        // Override in subclasses for custom behavior
    }

    // Handle pointer up event
    onPointerUp(x, y, draggedStone) {
        // Override in subclasses for custom behavior
    }

    // Clean up mode (called when mode is deactivated)
    cleanup() {
        this.isActive = false;
        this.stones = [];
        // Override in subclasses for additional cleanup
    }

    // Helper: Find stone at position
    findStoneAtPosition(x, y) {
        // Search from top down (last drawn = on top)
        for (let i = this.stones.length - 1; i >= 0; i--) {
            if (this.stones[i].contains(x, y)) {
                return this.stones[i];
            }
        }
        return null;
    }

    // Helper: Move stone to top of render order
    moveStoneToTop(stone) {
        const index = this.stones.indexOf(stone);
        if (index > -1) {
            this.stones.splice(index, 1);
            this.stones.push(stone);
        }
    }

    // Helper: Add stone
    addStone(stone) {
        this.stones.push(stone);
    }

    // Helper: Remove stone
    removeStone(stone) {
        const index = this.stones.indexOf(stone);
        if (index > -1) {
            this.stones.splice(index, 1);
        }
    }

    // Get mode metadata (for UI)
    static getMetadata() {
        return {
            id: 'base',
            name: 'Base Mode',
            icon: '🪨',
            description: 'Base mode - should be overridden'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModeBase };
}
