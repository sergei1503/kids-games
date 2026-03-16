// Stone class - Enhanced for multi-mode physics
// Represents a draggable stone with physics properties

// Global constants (accessible from other modules)
window.STONE_RADIUS = 35; // Base size for stones
window.COLORS = {
    stone: ['#8b7d6b', '#9a8c7a', '#7a6f5d', '#6b6152', '#a39482'],
    stoneHighlight: '#b8a894',
    shadow: 'rgba(0, 0, 0, 0.15)'
};

// Local aliases for convenience within this file
const STONE_RADIUS = window.STONE_RADIUS;
const COLORS = window.COLORS;

class Stone {
    constructor(x, y, id, properties = {}) {
        // Position
        this.x = x;
        this.y = y;
        this.id = id;
        this.targetX = x;
        this.targetY = y;

        // Type: 'regular' or 'blackhole'
        this.type = properties.type || 'regular';

        // Rendering
        this.radius = properties.radius || (STONE_RADIUS + Math.random() * 10 - 5);
        this.color = properties.color || COLORS.stone[Math.floor(Math.random() * COLORS.stone.length)];

        // Organic shape variation (not perfect circles)
        this.shapeOffset = Array(8).fill(0).map(() => Math.random() * 4 - 2);

        // Physics properties
        this.mass = properties.mass || 1.0;
        this.dragCoefficient = 1 / this.mass; // Heavier = slower
        this.velocity = { x: 0, y: 0 };

        // Black hole properties
        if (this.type === 'blackhole') {
            this.gravitationalRadius = this.radius * 3; // Influence area
            this.gravitationalStrength = 200; // Pulling power
            this.canAbsorb = true;
        }

        // Label (rendered on the stone)
        this.label = properties.label || null;

        // Structure metadata (for NumberStructures mode)
        this.structureId = null;
        this.structureIndex = null;

        // State
        this.isDragging = false;
        this.isLocked = properties.isLocked || false; // For challenges
        this.group = null; // Reference to group this stone belongs to
    }

    draw(ctx) {
        // Black hole stones have special rendering
        if (this.type === 'blackhole') {
            this._drawBlackHole(ctx);
            return;
        }

        // Regular stone rendering
        ctx.save();

        // Shadow for depth
        ctx.shadowColor = COLORS.shadow;
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        // Draw organic stone shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = this.radius + this.shapeOffset[i];
            const px = this.x + Math.cos(angle) * r;
            const py = this.y + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();

        // Fill stone
        ctx.fillStyle = this.isDragging ? COLORS.stoneHighlight : this.color;
        ctx.fill();

        // Subtle highlight for 3D effect
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3,
            this.y - this.radius * 0.3,
            0,
            this.x,
            this.y,
            this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Visual indicator if locked (for challenges)
        if (this.isLocked) {
            ctx.strokeStyle = 'rgba(139, 125, 107, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Render label text on stone
        if (this.label !== null && this.label !== undefined) {
            // Reset shadow to avoid blurred text
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const fontSize = Math.round(this.radius * 0.65);
            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Dark stroke outline for readability on any stone color
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.strokeText(String(this.label), this.x, this.y);

            // White fill text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillText(String(this.label), this.x, this.y);
        }

        ctx.restore();
    }

    _drawBlackHole(ctx) {
        ctx.save();

        // Gravitational field (outermost glow)
        const gradientField = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.5,
            this.x, this.y, this.gravitationalRadius
        );
        gradientField.addColorStop(0, 'rgba(100, 80, 150, 0.3)');
        gradientField.addColorStop(0.6, 'rgba(80, 60, 120, 0.1)');
        gradientField.addColorStop(1, 'rgba(80, 60, 120, 0)');
        ctx.fillStyle = gradientField;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravitationalRadius, 0, Math.PI * 2);
        ctx.fill();

        // Accretion disk (swirling effect)
        const gradientRing = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.7,
            this.x, this.y, this.radius * 1.5
        );
        gradientRing.addColorStop(0, 'rgba(120, 100, 170, 0)');
        gradientRing.addColorStop(0.5, 'rgba(100, 80, 150, 0.6)');
        gradientRing.addColorStop(1, 'rgba(80, 60, 120, 0)');
        ctx.fillStyle = gradientRing;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Black core with shadow
        ctx.fillStyle = '#0a0a0a';
        ctx.shadowColor = 'rgba(100, 80, 150, 0.9)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon ring
        ctx.strokeStyle = 'rgba(120, 100, 170, 0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update(deltaTime = 1) {
        if (this.isDragging) return;

        // Mass-based smooth movement animation
        const ease = 0.2 * this.dragCoefficient;
        this.x += (this.targetX - this.x) * ease;
        this.y += (this.targetY - this.y) * ease;

        // Apply velocity if physics engine is active
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.x += this.velocity.x * deltaTime;
            this.y += this.velocity.y * deltaTime;
        }
    }

    // Start dragging this stone
    startDrag() {
        if (this.isLocked) return false;
        this.isDragging = true;
        return true;
    }

    // Stop dragging
    stopDrag() {
        this.isDragging = false;
    }

    // Set target position (for smooth movement)
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    // Immediate position update (for dragging)
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }

    // Clone this stone
    clone() {
        return new Stone(this.x, this.y, `${this.id}-clone`, {
            radius: this.radius,
            color: this.color,
            mass: this.mass,
            isLocked: this.isLocked,
            label: this.label
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Stone, STONE_RADIUS, COLORS };
}
