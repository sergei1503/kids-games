// Wrapped in IIFE to avoid global const collisions with BalanceScaleMode.js
(function(){
// MobileBalanceMode - Recursive hanging mobile for substitution and algebra
// Visual: Calder-style mobile with organic vines, beams at multiple levels
// Mechanic: Each beam independently balances, weight propagates bottom-up

const MOBILE_COLORS = {
    depth0: '#8b7d6b',  // Earth tones (top)
    depth1: '#7a8b6f',  // Forest (mid)
    depth2: '#6f8b9a'   // Sky (bottom)
};

const VINE_COLOR = 'rgba(139, 125, 107, 0.4)';
const VINE_TENSION_COLOR = 'rgba(139, 125, 107, 0.7)';
const BEAM_THICKNESS = 4;
const BEAM_LENGTH = 120;
const LEVEL_SPACING = 150;
const PAN_RADIUS = 60;
const PAN_COLOR = 'rgba(139, 125, 107, 0.15)';
const PAN_BORDER_COLOR = 'rgba(139, 125, 107, 0.4)';
const BALANCE_GLOW_COLOR = 'rgba(220, 200, 140, 0.5)';
const BALANCE_THRESHOLD = 0.05; // Radians
const TILT_SMOOTH_SPEED = 3;
const BREEZE_AMPLITUDE = 0.01; // 1% sway
const BREEZE_FREQUENCY = 0.5; // Hz
const TRAY_Y = 80;

// MobileNode - represents either a beam or a stone in the mobile tree
class MobileNode {
    constructor(type, options = {}) {
        this.type = type; // 'beam' or 'stone'
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.targetAngle = 0;
        this.depth = options.depth || 0;

        if (type === 'beam') {
            this.leftChildren = [];
            this.rightChildren = [];
            this.fulcrumRatio = options.fulcrumRatio || 0.5; // 0.5 = centered
            this.beamWidth = options.beamWidth || BEAM_LENGTH;
            this.leftArm = this.beamWidth * this.fulcrumRatio;
            this.rightArm = this.beamWidth * (1 - this.fulcrumRatio);
        } else if (type === 'stone') {
            this.stone = options.stone || null;
            this.shape = options.shape || 'circle'; // For variable puzzles
        }

        this.isBalanced = false;
        this.glowIntensity = 0;
    }

    // Get total mass of this node (recursive for beams)
    getTotalMass() {
        if (this.type === 'stone') {
            return this.stone ? this.stone.mass : 0;
        }

        // Beam: sum all children
        let total = 0;
        for (const child of this.leftChildren) {
            total += child.getTotalMass();
        }
        for (const child of this.rightChildren) {
            total += child.getTotalMass();
        }
        return total;
    }

    // Check if this beam is balanced (stones must check parent)
    checkBalance() {
        if (this.type === 'stone') {
            return true; // Stones don't balance themselves
        }

        // Calculate torques
        let leftTorque = 0;
        let rightTorque = 0;

        for (const child of this.leftChildren) {
            leftTorque += child.getTotalMass() * this.leftArm;
        }

        for (const child of this.rightChildren) {
            rightTorque += child.getTotalMass() * this.rightArm;
        }

        const netTorque = rightTorque - leftTorque;

        // Update target angle based on torque
        const sensitivity = 0.01;
        const maxTilt = Math.PI / 6; // 30 degrees max
        this.targetAngle = Math.atan(netTorque * sensitivity) * (maxTilt / (Math.PI / 2));

        // Check if balanced
        this.isBalanced = Math.abs(this.targetAngle) < BALANCE_THRESHOLD;

        return this.isBalanced;
    }

    // Add a stone to left or right side
    addStone(stone, side) {
        const node = new MobileNode('stone', { stone, depth: this.depth + 1 });
        if (side === 'left') {
            this.leftChildren.push(node);
        } else {
            this.rightChildren.push(node);
        }
        return node;
    }

    // Remove a stone node
    removeStone(stone) {
        this.leftChildren = this.leftChildren.filter(n => n.stone !== stone);
        this.rightChildren = this.rightChildren.filter(n => n.stone !== stone);
    }
}

class MobileBalanceMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.rootNode = null;
        this.trayStones = [];
        this.nextStoneId = 0;
        this.breezeTime = 0;
        this.allBalanced = false;
        this.balanceGlowTime = 0;
    }

    static getMetadata() {
        return {
            id: 'mobile-balance',
            name: 'Mobile Balance',
            icon: '⚖️',
            description: 'Hanging mobile - balance at every level'
        };
    }

    init() {
        super.init();

        // Create a simple 2-level mobile for testing
        this._createSimpleMobile();

        // Create tray stones
        this._createTrayStones([1, 1, 2, 2, 3]);
    }

    _createSimpleMobile() {
        const center = this.renderer.getCenter();

        // Root beam at top
        this.rootNode = new MobileNode('beam', {
            depth: 0,
            fulcrumRatio: 0.5,
            beamWidth: 200
        });

        // Left child: single stone (will be empty pan)
        // Right child: another beam
        const rightBeam = new MobileNode('beam', {
            depth: 1,
            fulcrumRatio: 0.5,
            beamWidth: 120
        });
        this.rootNode.rightChildren.push(rightBeam);

        // Position nodes
        this._layoutMobile();
    }

    _layoutMobile() {
        const center = this.renderer.getCenter();
        const topY = 100;

        this._layoutNode(this.rootNode, center.x, topY);
    }

    _layoutNode(node, x, y) {
        node.x = x;
        node.y = y;

        if (node.type === 'beam') {
            // Position children
            const leftX = x - node.leftArm;
            const rightX = x + node.rightArm;
            const childY = y + LEVEL_SPACING;

            for (const child of node.leftChildren) {
                this._layoutNode(child, leftX, childY);
            }

            for (const child of node.rightChildren) {
                this._layoutNode(child, rightX, childY);
            }
        }
    }

    _createTrayStones(masses) {
        const dims = this.renderer.getDimensions();
        const trayY = TRAY_Y;
        const spacing = 70;
        const startX = dims.width / 2 - (masses.length - 1) * spacing / 2;

        this.trayStones = [];
        for (let i = 0; i < masses.length; i++) {
            const stone = new Stone(
                startX + i * spacing,
                trayY,
                `tray-${this.nextStoneId++}`,
                {
                    radius: 25 + masses[i] * 5,
                    mass: masses[i],
                    color: '#8b7d6b',
                    label: masses[i].toString()
                }
            );
            this.trayStones.push(stone);
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        // Update breeze animation
        this.breezeTime += deltaTime;

        // Update balance state for all beams (bottom-up)
        this._updateBalanceRecursive(this.rootNode);

        // Smooth tilt animations
        this._smoothTiltRecursive(this.rootNode, deltaTime);

        // Check if all beams balanced
        this.allBalanced = this._checkAllBalanced(this.rootNode);

        // Update glow
        if (this.allBalanced) {
            this.balanceGlowTime += deltaTime;
        } else {
            this.balanceGlowTime = Math.max(0, this.balanceGlowTime - deltaTime * 2);
        }

        // Update dragged stones
        for (const stone of this.trayStones) {
            stone.update(deltaTime);
        }

        // Update stones on mobile
        this._updateStonesRecursive(this.rootNode, deltaTime);
    }

    _updateBalanceRecursive(node) {
        if (!node || node.type !== 'beam') return;

        // Update children first (bottom-up)
        for (const child of node.leftChildren) {
            this._updateBalanceRecursive(child);
        }
        for (const child of node.rightChildren) {
            this._updateBalanceRecursive(child);
        }

        // Then update this beam
        node.checkBalance();

        // Update glow intensity
        if (node.isBalanced) {
            node.glowIntensity = Math.min(1, node.glowIntensity + 0.05);
        } else {
            node.glowIntensity = Math.max(0, node.glowIntensity - 0.1);
        }
    }

    _smoothTiltRecursive(node, deltaTime) {
        if (!node) return;

        if (node.type === 'beam') {
            // Smooth angle transition
            const diff = node.targetAngle - node.angle;
            node.angle += diff * TILT_SMOOTH_SPEED * deltaTime;

            // Add breeze
            const breeze = Math.sin(this.breezeTime * BREEZE_FREQUENCY * Math.PI * 2) * BREEZE_AMPLITUDE;
            node.angle += breeze * (1 - node.glowIntensity); // Less breeze when balanced

            // Recurse
            for (const child of node.leftChildren) {
                this._smoothTiltRecursive(child, deltaTime);
            }
            for (const child of node.rightChildren) {
                this._smoothTiltRecursive(child, deltaTime);
            }
        }
    }

    _checkAllBalanced(node) {
        if (!node || node.type !== 'beam') return true;

        if (!node.isBalanced) return false;

        for (const child of node.leftChildren) {
            if (!this._checkAllBalanced(child)) return false;
        }
        for (const child of node.rightChildren) {
            if (!this._checkAllBalanced(child)) return false;
        }

        return true;
    }

    _updateStonesRecursive(node, deltaTime) {
        if (!node) return;

        if (node.type === 'stone' && node.stone) {
            node.stone.update(deltaTime);
        } else if (node.type === 'beam') {
            for (const child of node.leftChildren) {
                this._updateStonesRecursive(child, deltaTime);
            }
            for (const child of node.rightChildren) {
                this._updateStonesRecursive(child, deltaTime);
            }
        }
    }

    render() {
        if (!this.isActive) return;

        // Clear and draw background
        this.renderer.clear();
        this.renderer.drawBackground();

        // Render mobile tree (vines first, then beams, then stones)
        this._renderVinesRecursive(this.rootNode);
        this._renderBeamsRecursive(this.rootNode);
        this._renderStonesRecursive(this.rootNode);

        // Render tray stones
        for (const stone of this.trayStones) {
            stone.draw(this.ctx);
        }

        // Render "All Balanced!" message
        if (this.allBalanced && this.balanceGlowTime > 0.5) {
            this._renderSuccessMessage();
        }
    }

    _renderVinesRecursive(node, parentX, parentY) {
        if (!node) return;

        // Draw vine from parent to this node
        if (parentX !== undefined && parentY !== undefined) {
            const mass = node.getTotalMass();
            const tension = Math.min(1, mass / 5); // More mass = more tension
            const color = tension > 0.5 ? VINE_TENSION_COLOR : VINE_COLOR;

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1 + tension * 2;
            this.ctx.beginPath();

            // Curved vine (bezier)
            const midY = (parentY + node.y) / 2;
            const sag = 20 * (1 - tension * 0.5); // Less sag when tense
            this.ctx.moveTo(parentX, parentY);
            this.ctx.quadraticCurveTo(
                (parentX + node.x) / 2,
                midY + sag,
                node.x,
                node.y
            );
            this.ctx.stroke();
        }

        // Recurse to children
        if (node.type === 'beam') {
            const leftX = node.x - node.leftArm * Math.cos(node.angle);
            const leftY = node.y + node.leftArm * Math.sin(node.angle);
            const rightX = node.x + node.rightArm * Math.cos(node.angle);
            const rightY = node.y - node.rightArm * Math.sin(node.angle);

            for (const child of node.leftChildren) {
                this._renderVinesRecursive(child, leftX, leftY);
            }
            for (const child of node.rightChildren) {
                this._renderVinesRecursive(child, rightX, rightY);
            }
        }
    }

    _renderBeamsRecursive(node) {
        if (!node || node.type !== 'beam') return;

        this.ctx.save();
        this.ctx.translate(node.x, node.y);
        this.ctx.rotate(node.angle);

        // Beam color by depth
        const colorKey = `depth${Math.min(node.depth, 2)}`;
        this.ctx.strokeStyle = MOBILE_COLORS[colorKey];
        this.ctx.lineWidth = BEAM_THICKNESS;

        // Draw beam
        this.ctx.beginPath();
        this.ctx.moveTo(-node.leftArm, 0);
        this.ctx.lineTo(node.rightArm, 0);
        this.ctx.stroke();

        // Draw fulcrum point
        this.ctx.fillStyle = MOBILE_COLORS[colorKey];
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw pans (circles at ends)
        this._drawPan(-node.leftArm, 0);
        this._drawPan(node.rightArm, 0);

        // Glow if balanced
        if (node.glowIntensity > 0) {
            this.ctx.strokeStyle = BALANCE_GLOW_COLOR;
            this.ctx.lineWidth = 8;
            this.ctx.globalAlpha = node.glowIntensity * 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(-node.leftArm, 0);
            this.ctx.lineTo(node.rightArm, 0);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }

        this.ctx.restore();

        // Recurse
        for (const child of node.leftChildren) {
            this._renderBeamsRecursive(child);
        }
        for (const child of node.rightChildren) {
            this._renderBeamsRecursive(child);
        }
    }

    _drawPan(x, y) {
        this.ctx.fillStyle = PAN_COLOR;
        this.ctx.strokeStyle = PAN_BORDER_COLOR;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, PAN_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    _renderStonesRecursive(node) {
        if (!node) return;

        if (node.type === 'stone' && node.stone) {
            node.stone.draw(this.ctx);
        } else if (node.type === 'beam') {
            for (const child of node.leftChildren) {
                this._renderStonesRecursive(child);
            }
            for (const child of node.rightChildren) {
                this._renderStonesRecursive(child);
            }
        }
    }

    _renderSuccessMessage() {
        const center = this.renderer.getCenter();
        const dims = this.renderer.getDimensions();

        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, this.balanceGlowTime - 0.5);
        this.ctx.fillStyle = BALANCE_GLOW_COLOR;
        this.ctx.strokeStyle = '#8b7d6b';
        this.ctx.lineWidth = 2;
        this.ctx.font = '28px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const text = 'All Balanced!';
        const y = dims.height - 60;

        this.ctx.strokeText(text, center.x, y);
        this.ctx.fillText(text, center.x, y);
        this.ctx.restore();
    }

    // Input handlers
    onPointerDown(x, y) {
        // Check tray stones
        for (const stone of this.trayStones) {
            if (stone.contains(x, y)) {
                stone.startDrag();
                return stone;
            }
        }

        // Check stones on mobile
        const draggedStone = this._findStoneAtPosition(this.rootNode, x, y);
        if (draggedStone) {
            draggedStone.startDrag();
            // Remove from mobile
            this._removeStoneFromMobile(this.rootNode, draggedStone);
            this.trayStones.push(draggedStone);
        }

        return draggedStone;
    }

    onPointerMove(x, y, draggedStone) {
        if (draggedStone) {
            draggedStone.setPosition(x, y);
        }
    }

    onPointerUp(x, y, draggedStone) {
        if (!draggedStone) return;

        draggedStone.stopDrag();

        // Check if dropped on a pan
        const dropTarget = this._findPanAtPosition(this.rootNode, x, y);

        if (dropTarget) {
            // Remove from tray
            this.trayStones = this.trayStones.filter(s => s !== draggedStone);

            // Add to pan
            const side = dropTarget.side;
            const beam = dropTarget.beam;

            // Position stone at pan center
            const panX = side === 'left'
                ? beam.x - beam.leftArm * Math.cos(beam.angle)
                : beam.x + beam.rightArm * Math.cos(beam.angle);
            const panY = side === 'left'
                ? beam.y + beam.leftArm * Math.sin(beam.angle)
                : beam.y - beam.rightArm * Math.sin(beam.angle);

            draggedStone.x = panX;
            draggedStone.y = panY;

            beam.addStone(draggedStone, side);

            // Recalculate layout to update positions
            this._layoutMobile();
        }
    }

    _findStoneAtPosition(node, x, y) {
        if (!node) return null;

        if (node.type === 'stone' && node.stone) {
            if (node.stone.contains(x, y)) {
                return node.stone;
            }
        } else if (node.type === 'beam') {
            for (const child of [...node.leftChildren, ...node.rightChildren]) {
                const found = this._findStoneAtPosition(child, x, y);
                if (found) return found;
            }
        }

        return null;
    }

    _removeStoneFromMobile(node, stone) {
        if (!node || node.type !== 'beam') return false;

        const initialLeftCount = node.leftChildren.length;
        const initialRightCount = node.rightChildren.length;

        node.removeStone(stone);

        if (node.leftChildren.length < initialLeftCount || node.rightChildren.length < initialRightCount) {
            return true;
        }

        // Recurse
        for (const child of node.leftChildren) {
            if (this._removeStoneFromMobile(child, stone)) return true;
        }
        for (const child of node.rightChildren) {
            if (this._removeStoneFromMobile(child, stone)) return true;
        }

        return false;
    }

    _findPanAtPosition(node, x, y) {
        if (!node || node.type !== 'beam') return null;

        // Check this beam's pans
        const leftPanX = node.x - node.leftArm * Math.cos(node.angle);
        const leftPanY = node.y + node.leftArm * Math.sin(node.angle);
        const rightPanX = node.x + node.rightArm * Math.cos(node.angle);
        const rightPanY = node.y - node.rightArm * Math.sin(node.angle);

        const dxLeft = x - leftPanX;
        const dyLeft = y - leftPanY;
        const dxRight = x - rightPanX;
        const dyRight = y - rightPanY;

        if (dxLeft * dxLeft + dyLeft * dyLeft < PAN_RADIUS * PAN_RADIUS) {
            return { beam: node, side: 'left' };
        }
        if (dxRight * dxRight + dyRight * dyRight < PAN_RADIUS * PAN_RADIUS) {
            return { beam: node, side: 'right' };
        }

        // Recurse
        for (const child of node.leftChildren) {
            const found = this._findPanAtPosition(child, x, y);
            if (found) return found;
        }
        for (const child of node.rightChildren) {
            const found = this._findPanAtPosition(child, x, y);
            if (found) return found;
        }

        return null;
    }

    cleanup() {
        super.cleanup();
        this.trayStones = [];
        this.rootNode = null;
    }
}

// expose class globally (consumed by app.js ModeManager)
if (typeof MobileBalanceMode !== "undefined") window.MobileBalanceMode = MobileBalanceMode;
})();
