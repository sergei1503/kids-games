// Zen Math - Main Application Controller
// Multi-mode learning system with mode management

// Polyfill for roundRect (Safari/older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        }
        this.beginPath();
        this.moveTo(x + radius.tl, y);
        this.lineTo(x + width - radius.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        this.lineTo(x + width, y + height - radius.br);
        this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        this.lineTo(x + radius.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        this.lineTo(x, y + radius.tl);
        this.quadraticCurveTo(x, y, x + radius.tl, y);
        this.closePath();
        return this;
    };
}

const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');

// Initialize renderer
const renderer = new Renderer(canvas, ctx);

// Set canvas to full window size
function resizeCanvas() {
    renderer.resize();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Mode Manager
class ModeManager {
    constructor() {
        this.currentMode = null;
        this.modes = new Map();
        this.draggedStone = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    // Register a mode
    registerMode(ModeClass) {
        const metadata = ModeClass.getMetadata();
        this.modes.set(metadata.id, {
            class: ModeClass,
            metadata: metadata,
            instance: null
        });
    }

    // Switch to a different mode
    switchMode(modeId) {
        // Cleanup current mode
        if (this.currentMode) {
            this.currentMode.cleanup();
        }

        // Get mode data
        const modeData = this.modes.get(modeId);
        if (!modeData) {
            console.error(`Mode ${modeId} not found`);
            return;
        }

        // Create new instance
        modeData.instance = new modeData.class(canvas, ctx, renderer);
        this.currentMode = modeData.instance;

        // Initialize mode
        this.currentMode.init();

        console.log(`Switched to mode: ${modeData.metadata.name}`);
    }

    // Get current mode
    getCurrentMode() {
        return this.currentMode;
    }

    // Get event position (handles both mouse and touch)
    getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        // Use changedTouches for touchend (touches is empty when finger lifts)
        const source = e.touches && e.touches.length > 0 ? e.touches[0]
            : e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0]
            : e;
        // Return logical (CSS) coordinates — no DPR scaling needed since
        // ctx.setTransform(dpr) means all drawing uses logical coords
        const x = source.clientX - rect.left;
        const y = source.clientY - rect.top;
        return {x, y};
    }

    // Event handlers
    onPointerDown(e) {
        e.preventDefault();
        if (!this.currentMode) return;

        const {x, y} = this.getEventPosition(e);

        // Let mode handle the pointer down
        this.draggedStone = this.currentMode.onPointerDown(x, y);

        if (this.draggedStone) {
            this.dragOffsetX = x - this.draggedStone.x;
            this.dragOffsetY = y - this.draggedStone.y;
        }
    }

    onPointerMove(e) {
        e.preventDefault();
        if (!this.currentMode) return;

        const {x, y} = this.getEventPosition(e);

        // Calculate adjusted position with offset
        const adjustedX = this.draggedStone ? x - this.dragOffsetX : x;
        const adjustedY = this.draggedStone ? y - this.dragOffsetY : y;

        // Let mode handle the pointer move
        this.currentMode.onPointerMove(adjustedX, adjustedY, this.draggedStone);
    }

    onPointerUp(e) {
        e.preventDefault();
        if (!this.currentMode) return;

        const {x, y} = this.getEventPosition(e);

        // Let mode handle the pointer up
        this.currentMode.onPointerUp(x, y, this.draggedStone);

        // Clear dragged stone
        this.draggedStone = null;
    }

    // Handle window blur (pause dragging)
    onBlur() {
        if (this.draggedStone) {
            this.draggedStone.stopDrag();
            this.draggedStone = null;
        }
    }
}

// Initialize mode manager
const modeManager = new ModeManager();

// Register all available modes
modeManager.registerMode(BalanceScaleMode);
modeManager.registerMode(MobileBalanceMode);

// Set initial mode
modeManager.switchMode('balance-scale');

// Initialize UI systems
const modeSelector = new ModeSelector(modeManager, document.getElementById('garden-container'));
const hintSystem = new HintSystem(canvas);
const challengeEngine = new ChallengeEngine(modeManager);

// Update hint system when mode changes
const originalSwitchMode = modeManager.switchMode.bind(modeManager);
modeManager.switchMode = function(modeId) {
    originalSwitchMode(modeId);
    hintSystem.setMode(modeId);
    modeSelector.updateCurrentMode();
};
// Trigger initial hint mode
hintSystem.setMode('balance-scale');

// Track interaction for hint system
let hasInteractionThisFrame = false;

// Bind event listeners
canvas.addEventListener('mousedown', (e) => { hasInteractionThisFrame = true; modeManager.onPointerDown(e); });
canvas.addEventListener('mousemove', (e) => { if (modeManager.draggedStone) hasInteractionThisFrame = true; modeManager.onPointerMove(e); });
canvas.addEventListener('mouseup', (e) => { hasInteractionThisFrame = true; modeManager.onPointerUp(e); challengeEngine.checkGoals(); });
canvas.addEventListener('touchstart', (e) => { hasInteractionThisFrame = true; modeManager.onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { if (modeManager.draggedStone) hasInteractionThisFrame = true; modeManager.onPointerMove(e); }, { passive: false });
canvas.addEventListener('touchend', (e) => { hasInteractionThisFrame = true; modeManager.onPointerUp(e); challengeEngine.checkGoals(); }, { passive: false });
window.addEventListener('blur', () => modeManager.onBlur());

// Animation loop
let lastTime = 0;
function animate(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    const mode = modeManager.getCurrentMode();
    if (mode && mode.isActive) {
        mode.update(deltaTime);
        mode.render();

        // Update and render hint system
        const dpr = window.devicePixelRatio || 1;
        hintSystem.update(deltaTime, hasInteractionThisFrame);
        hintSystem.render(ctx, canvas.width / dpr, canvas.height / dpr);

        // Render challenge overlay (pass logical dimensions)
        challengeEngine.render(ctx, { width: canvas.width / dpr, height: canvas.height / dpr });
    }

    hasInteractionThisFrame = false;
    requestAnimationFrame(animate);
}

// Start animation
requestAnimationFrame(animate);

// Export for console access
if (typeof window !== 'undefined') {
    window.modeManager = modeManager;
    window.challengeEngine = challengeEngine;
    window.hintSystem = hintSystem;
}
