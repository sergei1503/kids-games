// FreeExploreMode - Open-ended discovery mode
// Enhanced: creation pool, varied stone feel, visual differentiation
// Gravity Mode: central black hole, physics simulation, throwing mechanics

const GROUP_THRESHOLD = 80; // Distance for stones to group together
const GROUP_COLOR = 'rgba(139, 125, 107, 0.15)';
const POOL_HEIGHT = 80;
const POOL_PADDING = 20;
const POOL_COLOR = 'rgba(139, 125, 107, 0.08)';
const POOL_BORDER_COLOR = 'rgba(139, 125, 107, 0.15)';
const POOL_LABEL_COLOR = 'rgba(107, 97, 82, 0.3)';

// Gravity Mode Constants
const CENTRAL_BLACK_HOLE_MASS = 50;
const CENTRAL_BLACK_HOLE_RADIUS = 40;
const GRAVITATIONAL_CONSTANT = 300; // Tuned for fun physics
const DAMPING = 0.995; // Air resistance (0.995 = very little drag)
const FREE_BTN_BG = 'rgba(139, 125, 107, 0.15)';
const FREE_BTN_BG_ACTIVE = 'rgba(139, 125, 107, 0.3)';
const FREE_BTN_BORDER = 'rgba(139, 125, 107, 0.3)';
const FREE_BTN_TEXT = 'rgba(107, 97, 82, 0.7)';
const FREE_BTN_RADIUS = 10;

class StoneGroup {
    constructor(stones) {
        this.stones = stones;
        this.id = Date.now();
    }

    contains(stone) {
        return this.stones.includes(stone);
    }
}

class CentralBlackHole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.mass = CENTRAL_BLACK_HOLE_MASS;
        this.radius = CENTRAL_BLACK_HOLE_RADIUS;
        this.gravitationalStrength = GRAVITATIONAL_CONSTANT;
        this.gravitationalRadius = CENTRAL_BLACK_HOLE_RADIUS * 4; // Influence area
    }

    applyGravityTo(stone, deltaTime) {
        const dx = this.x - stone.x;
        const dy = this.y - stone.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Avoid singularity at very close distances
        if (dist < this.radius) return;

        // F = G * m1 * m2 / r²
        const force = this.gravitationalStrength * stone.mass / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // Apply force as acceleration: a = F / m
        stone.velocity.x += (fx / stone.mass) * deltaTime;
        stone.velocity.y += (fy / stone.mass) * deltaTime;
    }

    draw(ctx) {
        ctx.save();

        // Event horizon glow (outer)
        const gradientOuter = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.5,
            this.x, this.y, this.radius * 3
        );
        gradientOuter.addColorStop(0, 'rgba(100, 80, 150, 0.4)');
        gradientOuter.addColorStop(0.5, 'rgba(80, 60, 120, 0.2)');
        gradientOuter.addColorStop(1, 'rgba(80, 60, 120, 0)');
        ctx.fillStyle = gradientOuter;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Accretion disk (middle ring)
        const gradientRing = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.8,
            this.x, this.y, this.radius * 1.8
        );
        gradientRing.addColorStop(0, 'rgba(120, 100, 170, 0)');
        gradientRing.addColorStop(0.5, 'rgba(100, 80, 150, 0.5)');
        gradientRing.addColorStop(1, 'rgba(80, 60, 120, 0)');
        ctx.fillStyle = gradientRing;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Black core
        ctx.fillStyle = '#1a1a1a';
        ctx.shadowColor = 'rgba(100, 80, 150, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class FreeExploreMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.groups = [];
        this.poolUsed = false; // Track if pool has been used (to fade label)
        this.poolLabelAlpha = 1.0;
        this.nextStoneId = 100;

        // Gravity Mode state
        this.blackHole = null;
        this.simulationState = 'paused'; // 'paused' | 'running'
        this.simulationTime = 0;
        this.buttons = [];

        // Double-tap detection for black hole creation
        this.lastTapTime = 0;
        this.lastTapPos = { x: 0, y: 0 };
    }

    init() {
        super.init();

        const center = this.renderer.getCenter();

        // Create central black hole
        this.blackHole = new CentralBlackHole(center.x, center.y);

        // Initialize stones in circular pattern with varied masses
        const initialCount = 8;
        const spread = 150;
        const masses = [0.5, 0.7, 1.0, 1.0, 1.5, 2.0, 2.5, 3.0];

        for (let i = 0; i < initialCount; i++) {
            const angle = (i / initialCount) * Math.PI * 2;
            const distance = spread + Math.random() * 50;
            const x = center.x + Math.cos(angle) * distance;
            const y = center.y + Math.sin(angle) * distance;
            const mass = masses[i];
            const radius = STONE_RADIUS * (0.6 + mass * 0.25);

            // Heavier stones get darker colors
            const colorIndex = Math.min(Math.floor(mass * 1.5), COLORS.stone.length - 1);
            const color = COLORS.stone[colorIndex];

            const stone = new Stone(x, y, i, { mass, radius, color });
            this.addStone(stone);
        }

        this.poolUsed = false;
        this.poolLabelAlpha = 1.0;
        this.simulationState = 'paused';
        this.simulationTime = 0;

        // Initialize control buttons
        this._initButtons();

        // Initial group detection
        this.updateGroups();
    }

    _initButtons() {
        const dims = this.renderer.getDimensions();
        const btnY = 20;
        const btnH = 36;

        this.buttons = [
            {
                id: 'toggle-simulation',
                x: dims.width - 220, y: btnY,
                width: 100, height: btnH,
                label: '▶ Start',
                active: false
            },
            {
                id: 'reset',
                x: dims.width - 110, y: btnY,
                width: 90, height: btnH,
                label: '↻ Reset',
                active: false
            }
        ];
    }

    _getPoolRect() {
        const dims = this.renderer.getDimensions();
        return {
            x: POOL_PADDING,
            y: dims.height - POOL_HEIGHT - POOL_PADDING,
            width: dims.width - POOL_PADDING * 2,
            height: POOL_HEIGHT,
            radius: 16
        };
    }

    _isInPool(x, y) {
        const pool = this._getPoolRect();
        return x >= pool.x && x <= pool.x + pool.width &&
               y >= pool.y && y <= pool.y + pool.height;
    }

    _createStoneAtPosition(x, y, type = 'regular') {
        if (type === 'blackhole') {
            // Create a black hole stone
            const mass = 5.0; // Heavy!
            const radius = STONE_RADIUS * 1.2;
            const stone = new Stone(x, y, this.nextStoneId++, {
                type: 'blackhole',
                mass,
                radius,
                color: '#1a1a1a'
            });
            this.addStone(stone);
            return stone;
        }

        // Regular stone - randomly assign number labels (20% chance)
        const mass = 0.5 + Math.random() * 2.5; // 0.5 to 3.0
        const radius = STONE_RADIUS * (0.6 + mass * 0.25);
        const colorIndex = Math.min(Math.floor(mass * 1.5), COLORS.stone.length - 1);
        const color = COLORS.stone[colorIndex];

        // 20% chance to have a number label (2-5)
        const label = Math.random() < 0.2 ? Math.floor(Math.random() * 4) + 2 : null;

        const stone = new Stone(x, y, this.nextStoneId++, { mass, radius, color, label });
        this.addStone(stone);

        if (!this.poolUsed) {
            this.poolUsed = true;
        }

        return stone;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Fade pool label after first use
        if (this.poolUsed && this.poolLabelAlpha > 0) {
            this.poolLabelAlpha = Math.max(0, this.poolLabelAlpha - deltaTime * 0.5);
        }

        // Physics simulation when running
        if (this.simulationState === 'running') {
            this.simulationTime += deltaTime;

            // Apply gravity from central black hole
            this.stones.forEach(stone => {
                if (!stone.isDragging) {
                    this.blackHole.applyGravityTo(stone, deltaTime);

                    // Apply gravity from black hole stones
                    this.stones.forEach(bhStone => {
                        if (bhStone.type === 'blackhole' && bhStone !== stone && !bhStone.isDragging) {
                            this._applyBlackHoleGravity(bhStone, stone, deltaTime);
                        }
                    });

                    // Update position based on velocity
                    stone.x += stone.velocity.x * deltaTime;
                    stone.y += stone.velocity.y * deltaTime;

                    // Apply damping (air resistance)
                    stone.velocity.x *= DAMPING;
                    stone.velocity.y *= DAMPING;

                    // Wrap around screen edges (like asteroids)
                    const dims = this.renderer.getDimensions();
                    if (stone.x < -stone.radius) stone.x = dims.width + stone.radius;
                    if (stone.x > dims.width + stone.radius) stone.x = -stone.radius;
                    if (stone.y < -stone.radius) stone.y = dims.height + stone.radius;
                    if (stone.y > dims.height + stone.radius) stone.y = -stone.radius;
                }
            });

            // Check for collisions and handle breaking/bouncing
            this._processCollisions();

            // Check for absorptions
            this._checkAbsorptions();
        }
    }

    _processCollisions() {
        const BREAK_VELOCITY_THRESHOLD = 150; // Speed needed to break stones

        for (let i = 0; i < this.stones.length; i++) {
            for (let j = i + 1; j < this.stones.length; j++) {
                const stone1 = this.stones[i];
                const stone2 = this.stones[j];

                if (stone1.isDragging || stone2.isDragging) continue;

                const dx = stone2.x - stone1.x;
                const dy = stone2.y - stone1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = stone1.radius + stone2.radius;

                if (dist < minDist) {
                    // Calculate relative velocity
                    const relVx = stone1.velocity.x - stone2.velocity.x;
                    const relVy = stone1.velocity.y - stone2.velocity.y;
                    const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

                    // Check if impact is strong enough to break numbered stones
                    if (relSpeed > BREAK_VELOCITY_THRESHOLD) {
                        // Try to break stone1 if it's numbered and not a black hole
                        if (stone1.type !== 'blackhole' && stone1.label && parseInt(stone1.label) >= 2) {
                            this._breakStone(stone1);
                            continue; // Stone1 is broken, skip collision resolution
                        }
                        // Try to break stone2 if it's numbered and not a black hole
                        if (stone2.type !== 'blackhole' && stone2.label && parseInt(stone2.label) >= 2) {
                            this._breakStone(stone2);
                            continue; // Stone2 is broken, skip collision resolution
                        }
                    }

                    // Normal bounce collision (if not broken)
                    this._resolveCollision(stone1, stone2);
                }
            }
        }
    }

    _breakStone(stone) {
        const numPieces = parseInt(stone.label);
        if (isNaN(numPieces) || numPieces < 2) return;

        const pieces = [];
        const pieceRadius = stone.radius / Math.sqrt(numPieces);
        const pieceMass = stone.mass / numPieces;

        // Create pieces in circular explosion pattern
        for (let i = 0; i < numPieces; i++) {
            const angle = (i / numPieces) * Math.PI * 2;
            const distance = stone.radius * 0.5;
            const explosionSpeed = 80;

            const piece = new Stone(
                stone.x + Math.cos(angle) * distance,
                stone.y + Math.sin(angle) * distance,
                this.nextStoneId++,
                {
                    radius: pieceRadius,
                    mass: pieceMass,
                    type: 'regular',
                    color: stone.color,
                    label: null // Pieces have no label
                }
            );

            // Inherit parent velocity + explosion velocity
            piece.velocity.x = stone.velocity.x + Math.cos(angle) * explosionSpeed;
            piece.velocity.y = stone.velocity.y + Math.sin(angle) * explosionSpeed;

            pieces.push(piece);
        }

        // Remove original stone
        this.removeStone(stone);

        // Add pieces
        pieces.forEach(p => this.addStone(p));

        // Visual effect
        this._showBreakEffect(stone.x, stone.y, numPieces);
    }

    _showBreakEffect(x, y, numPieces) {
        // Store effect for rendering (could be animated)
        // For now, just visual feedback during rendering
        // In a full implementation, this would create particle effects
    }

    _resolveCollision(stone1, stone2) {
        // Simple elastic collision resolution
        const dx = stone2.x - stone1.x;
        const dy = stone2.y - stone1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            stone2.x += 1; // Avoid division by zero
            return;
        }

        const minDist = stone1.radius + stone2.radius;
        const overlap = minDist - dist;

        if (overlap <= 0) return;

        // Unit normal
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate stones based on mass
        const totalMass = stone1.mass + stone2.mass;
        const ratio1 = stone2.mass / totalMass;
        const ratio2 = stone1.mass / totalMass;

        stone1.x -= nx * overlap * ratio1;
        stone1.y -= ny * overlap * ratio1;
        stone2.x += nx * overlap * ratio2;
        stone2.y += ny * overlap * ratio2;

        // Elastic velocity exchange
        const v1n = stone1.velocity.x * nx + stone1.velocity.y * ny;
        const v2n = stone2.velocity.x * nx + stone2.velocity.y * ny;

        const v1nAfter = (v1n * (stone1.mass - stone2.mass) + 2 * stone2.mass * v2n) / totalMass;
        const v2nAfter = (v2n * (stone2.mass - stone1.mass) + 2 * stone1.mass * v1n) / totalMass;

        stone1.velocity.x += (v1nAfter - v1n) * nx;
        stone1.velocity.y += (v1nAfter - v1n) * ny;
        stone2.velocity.x += (v2nAfter - v2n) * nx;
        stone2.velocity.y += (v2nAfter - v2n) * ny;
    }

    _applyBlackHoleGravity(blackHole, stone, deltaTime) {
        const dx = blackHole.x - stone.x;
        const dy = blackHole.y - stone.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Only apply if within gravitational radius
        if (dist > blackHole.gravitationalRadius || dist < blackHole.radius) return;

        // F = G * m1 * m2 / r²
        const force = blackHole.gravitationalStrength * stone.mass / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // Apply force as acceleration
        stone.velocity.x += (fx / stone.mass) * deltaTime;
        stone.velocity.y += (fy / stone.mass) * deltaTime;
    }

    _checkAbsorptions() {
        const toRemove = [];

        this.stones.forEach(bhStone => {
            if (bhStone.type !== 'blackhole' || !bhStone.canAbsorb) return;

            this.stones.forEach(stone => {
                if (stone === bhStone || stone.type === 'blackhole') return;
                if (toRemove.includes(stone)) return;

                const dist = bhStone.distanceTo(stone);

                // Absorb if stone gets too close
                if (dist < bhStone.radius + stone.radius * 0.5) {
                    // Add mass to black hole
                    bhStone.mass += stone.mass;
                    // Grow slightly
                    bhStone.radius = Math.min(bhStone.radius + 2, STONE_RADIUS * 2);
                    bhStone.gravitationalRadius = bhStone.radius * 3;

                    // Mark for removal
                    toRemove.push(stone);

                    // Visual effect would go here
                }
            });
        });

        // Remove absorbed stones
        toRemove.forEach(stone => this.removeStone(stone));
    }

    render() {
        // Draw background
        this.renderer.drawBackground();

        // Draw central black hole (behind everything)
        if (this.blackHole) {
            this.blackHole.draw(this.ctx);
        }

        // Draw creation pool
        this._drawPool();

        // Draw groups first (behind stones)
        this.groups.forEach(group => {
            this.renderer.drawGroupIndicator(group.stones, GROUP_COLOR);
        });

        // Draw stones
        this.stones.forEach(stone => stone.draw(this.ctx));

        // Draw control buttons
        this.buttons.forEach(btn => this._drawButton(btn));
    }

    _drawButton(btn) {
        const ctx = this.ctx;
        ctx.save();

        // Background
        ctx.fillStyle = btn.active ? FREE_BTN_BG_ACTIVE : FREE_BTN_BG;
        ctx.strokeStyle = FREE_BTN_BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.width, btn.height, FREE_BTN_RADIUS);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = FREE_BTN_TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);

        ctx.restore();
    }

    _drawPool() {
        const ctx = this.ctx;
        const pool = this._getPoolRect();

        ctx.save();

        // Pool background
        ctx.fillStyle = POOL_COLOR;
        ctx.strokeStyle = POOL_BORDER_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pool.x, pool.y, pool.width, pool.height, pool.radius);
        ctx.fill();
        ctx.stroke();

        // Pool label (fades after first use)
        if (this.poolLabelAlpha > 0.01) {
            ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = `rgba(107, 97, 82, ${0.3 * this.poolLabelAlpha})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('tap: stone | double-tap: black hole', pool.x + pool.width / 2, pool.y + pool.height / 2);
        }

        ctx.restore();
    }

    onPointerDown(x, y) {
        // Check buttons first
        for (const btn of this.buttons) {
            if (this._hitTestButton(x, y, btn)) {
                btn.active = true;
                this._handleButtonClick(btn);
                setTimeout(() => { btn.active = false; }, 150);
                return null;
            }
        }

        // First check if tapping on an existing stone
        const stone = this.findStoneAtPosition(x, y);
        if (stone) {
            stone.startDrag();
            this.moveStoneToTop(stone);
            return stone;
        }

        // If tapping in the pool, create a new stone
        if (this._isInPool(x, y)) {
            const now = Date.now();
            const timeSinceLastTap = now - this.lastTapTime;
            const dx = x - this.lastTapPos.x;
            const dy = y - this.lastTapPos.y;
            const distSinceLastTap = Math.sqrt(dx * dx + dy * dy);

            // Double-tap detection (within 300ms and 50px)
            const isDoubleTap = timeSinceLastTap < 300 && distSinceLastTap < 50;

            // Create black hole on double-tap, regular stone on single tap
            const stoneType = isDoubleTap ? 'blackhole' : 'regular';
            const newStone = this._createStoneAtPosition(x, y, stoneType);
            newStone.startDrag();
            this.moveStoneToTop(newStone);

            this.lastTapTime = now;
            this.lastTapPos = { x, y };

            return newStone;
        }

        return null;
    }

    _hitTestButton(x, y, btn) {
        return x >= btn.x && x <= btn.x + btn.width &&
               y >= btn.y && y <= btn.y + btn.height;
    }

    _handleButtonClick(btn) {
        if (btn.id === 'toggle-simulation') {
            this._toggleSimulation();
        } else if (btn.id === 'reset') {
            this._resetSimulation();
        }
    }

    _toggleSimulation() {
        if (this.simulationState === 'paused') {
            this.simulationState = 'running';
            this.simulationTime = 0;
            this.buttons[0].label = '⏸ Pause';
        } else {
            this.simulationState = 'paused';
            this.buttons[0].label = '▶ Start';
            // Zero out velocities when pausing
            this.stones.forEach(stone => {
                stone.velocity.x = 0;
                stone.velocity.y = 0;
            });
        }
    }

    _resetSimulation() {
        // Pause simulation
        this.simulationState = 'paused';
        this.buttons[0].label = '▶ Start';
        this.simulationTime = 0;

        // Reset all stone velocities and positions
        const center = this.renderer.getCenter();
        const spread = 150;

        this.stones.forEach((stone, i) => {
            stone.velocity.x = 0;
            stone.velocity.y = 0;

            // Reset to circular arrangement
            const angle = (i / this.stones.length) * Math.PI * 2;
            const distance = spread + Math.random() * 50;
            stone.x = center.x + Math.cos(angle) * distance;
            stone.y = center.y + Math.sin(angle) * distance;
        });

        this.updateGroups();
    }

    onPointerMove(x, y, draggedStone) {
        if (draggedStone) {
            // Track position history for velocity calculation
            const currentTime = performance.now() / 1000; // Convert to seconds
            if (!draggedStone._positionHistory) {
                draggedStone._positionHistory = [];
            }

            draggedStone._positionHistory.push({
                x: x,
                y: y,
                time: currentTime
            });

            // Keep only last 5 positions (for smoothing)
            if (draggedStone._positionHistory.length > 5) {
                draggedStone._positionHistory.shift();
            }

            // Mass-based drag feel
            const mass = draggedStone.mass;
            let speed;

            if (mass < 1.0) {
                // Light stones: fast, responsive
                speed = 1.0;
            } else if (mass <= 2.0) {
                // Medium stones: normal feel
                speed = 0.7;
            } else {
                // Heavy stones: lag behind finger
                speed = 0.3 + (1.0 / mass) * 0.2;
            }

            // Lerp toward target position
            const newX = draggedStone.x + (x - draggedStone.x) * speed;
            const newY = draggedStone.y + (y - draggedStone.y) * speed;
            draggedStone.setPosition(newX, newY);
        }
    }

    onPointerUp(x, y, draggedStone) {
        if (draggedStone) {
            // Calculate throw velocity if simulation is running
            if (this.simulationState === 'running') {
                const throwVelocity = this._calculateThrowVelocity(draggedStone);

                // Mass-based resistance: heavier stones harder to throw
                const massResistance = 1.0 / Math.sqrt(draggedStone.mass);
                draggedStone.velocity.x = throwVelocity.x * massResistance;
                draggedStone.velocity.y = throwVelocity.y * massResistance;
            } else {
                // If paused, zero velocity
                draggedStone.velocity.x = 0;
                draggedStone.velocity.y = 0;
            }

            // Clean up position history
            draggedStone._positionHistory = [];
            draggedStone.stopDrag();
        }
        // Update groups after drag
        this.updateGroups();
    }

    _calculateThrowVelocity(stone) {
        // Use position history to calculate velocity
        const history = stone._positionHistory || [];

        if (history.length < 2) {
            return { x: 0, y: 0 };
        }

        // Average velocity over last few positions for smoothing
        let totalVx = 0;
        let totalVy = 0;
        let count = 0;

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            const dt = curr.time - prev.time;

            if (dt > 0) {
                totalVx += (curr.x - prev.x) / dt;
                totalVy += (curr.y - prev.y) / dt;
                count++;
            }
        }

        if (count === 0) {
            return { x: 0, y: 0 };
        }

        return {
            x: totalVx / count,
            y: totalVy / count
        };
    }

    // Group detection based on proximity
    updateGroups() {
        this.groups = [];
        const processed = new Set();

        for (let i = 0; i < this.stones.length; i++) {
            if (processed.has(i)) continue;

            const group = [this.stones[i]];
            processed.add(i);

            // Find nearby stones (flood fill)
            let changed = true;
            while (changed) {
                changed = false;
                for (let j = 0; j < this.stones.length; j++) {
                    if (processed.has(j)) continue;

                    // Check if stone j is close to any stone in current group
                    for (let stone of group) {
                        if (this.stones[j].distanceTo(stone) < GROUP_THRESHOLD) {
                            group.push(this.stones[j]);
                            processed.add(j);
                            changed = true;
                            break;
                        }
                    }
                }
            }

            if (group.length >= 2) {
                this.groups.push(new StoneGroup(group));
            }
        }
    }

    cleanup() {
        super.cleanup();
        this.groups = [];
        this.poolUsed = false;
        this.poolLabelAlpha = 1.0;
        this.nextStoneId = 100;
        this.blackHole = null;
        this.simulationState = 'paused';
        this.simulationTime = 0;
        this.buttons = [];
    }

    static getMetadata() {
        return {
            id: 'free-explore',
            name: 'Free Explore',
            icon: '🪨',
            description: 'Open-ended discovery and grouping'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FreeExploreMode };
}
