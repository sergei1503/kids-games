// BalanceScaleMode - Equality and weight relationships
// Enhanced: random levels with difficulty, guessing/prediction mode

const BEAM_WIDTH = 400;
const BEAM_THICKNESS = 6;
const FULCRUM_SIZE = 30;
const PAN_RADIUS = 100;
const MAX_TILT_ANGLE = Math.PI / 8; // Max 22.5 degrees
const TILT_SMOOTH_SPEED = 4; // How fast beam animates to target angle
const BALANCE_THRESHOLD = 0.01; // Angle considered "balanced"
const BALANCE_GLOW_COLOR = 'rgba(180, 165, 140, 0.6)';
const BEAM_COLOR = '#8b7d6b';
const FULCRUM_COLOR = '#7a6f5d';
const PAN_COLOR = 'rgba(139, 125, 107, 0.2)';
const PAN_BORDER_COLOR = 'rgba(139, 125, 107, 0.5)';
const TRAY_Y_OFFSET = 80; // Distance from top for the stone tray

// Button styling constants
const BALANCE_BTN_BG = 'rgba(139, 125, 107, 0.15)';
const BALANCE_BTN_BG_ACTIVE = 'rgba(139, 125, 107, 0.3)';
const BALANCE_BTN_BORDER = 'rgba(139, 125, 107, 0.3)';
const BALANCE_BTN_TEXT = 'rgba(107, 97, 82, 0.7)';
const BALANCE_BTN_RADIUS = 10;

// Difficulty settings
const DIFFICULTY_LEVELS = {
    easy:   { label: 'Easy',   stoneRange: [4, 5], massRange: [1, 3] },
    medium: { label: 'Medium', stoneRange: [5, 7], massRange: [1, 4] },
    hard:   { label: 'Hard',   stoneRange: [7, 9], massRange: [1, 5] }
};
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

class BalanceScaleMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.beam = { x: 0, y: 0, width: BEAM_WIDTH, angle: 0, targetAngle: 0 };
        this.fulcrum = { x: 0, y: 0 };
        this.leftPan = { x: 0, y: 0, stones: [] };
        this.rightPan = { x: 0, y: 0, stones: [] };
        this.trayStones = [];
        this.isBalanced = false;
        this.balanceGlowTime = 0;
        this.nextStoneId = 0;

        // New level / difficulty state
        this.currentDifficulty = 0; // Index into DIFFICULTY_ORDER
        this.buttons = []; // {id, x, y, width, height, label, active}

        // Tap-to-inspect state
        this.inspectedStone = null;
        this.inspectTimer = 0;
        this._pointerDownPos = null;
        this._pointerDownTime = 0;

        // Guessing mode state
        this.guessMode = false;
        this.guessState = 'idle'; // 'idle', 'waiting', 'revealed'
        this.guessAnswer = null; // 'left', 'right', 'balanced'
        this.guessFeedback = null; // {correct: bool, time: 2.0}
        this.guessPhysicsFrozen = false;
    }

    init() {
        super.init();

        const center = this.renderer.getCenter();
        const dims = this.renderer.getDimensions();

        // Position fulcrum and beam
        this.fulcrum.x = center.x;
        this.fulcrum.y = center.y + 40;
        this.beam.x = center.x;
        this.beam.y = this.fulcrum.y - FULCRUM_SIZE;

        // Update pan positions
        this._updatePanPositions();

        // Create initial stones
        this._createTrayStones([1, 1, 1, 2, 2, 3, 3]);

        // Initialize buttons
        this._initButtons();
    }

    _initButtons() {
        const dims = this.renderer.getDimensions();
        const btnY = 20;
        const btnH = 36;

        this.buttons = [
            {
                id: 'new-level',
                x: dims.width - 220, y: btnY,
                width: 95, height: btnH,
                label: '↻ New Level',
                active: false
            },
            {
                id: 'guess-mode',
                x: dims.width - 115, y: btnY,
                width: 95, height: btnH,
                label: this.guessMode ? '✋ Play' : '🤔 Guess',
                active: false
            }
        ];

        // Guess choice buttons (only visible in guess mode when waiting)
        this.guessButtons = [
            {
                id: 'guess-left',
                x: 0, y: 0, width: 120, height: 50,
                label: '← Left heavier',
                active: false
            },
            {
                id: 'guess-balanced',
                x: 0, y: 0, width: 100, height: 50,
                label: '= Balanced',
                active: false
            },
            {
                id: 'guess-right',
                x: 0, y: 0, width: 120, height: 50,
                label: 'Right heavier →',
                active: false
            }
        ];

        this._positionGuessButtons();
    }

    _positionGuessButtons() {
        const dims = this.renderer.getDimensions();
        const centerX = dims.width / 2;
        const btnY = dims.height - 80;
        const totalWidth = 120 + 100 + 120 + 20; // buttons + gaps
        const startX = centerX - totalWidth / 2;

        this.guessButtons[0].x = startX;
        this.guessButtons[0].y = btnY;
        this.guessButtons[1].x = startX + 130;
        this.guessButtons[1].y = btnY;
        this.guessButtons[2].x = startX + 240;
        this.guessButtons[2].y = btnY;
    }

    _createTrayStones(masses) {
        // Clear existing
        this.trayStones.forEach(s => this.removeStone(s));
        this.trayStones = [];
        this.leftPan.stones = [];
        this.rightPan.stones = [];

        const center = this.renderer.getCenter();
        const dims = this.renderer.getDimensions();
        const trayWidth = dims.width * 0.6;
        const trayStartX = center.x - trayWidth / 2;
        const spacing = masses.length > 1 ? trayWidth / (masses.length - 1) : 0;

        masses.forEach((mass, i) => {
            const x = masses.length > 1 ? trayStartX + i * spacing : center.x;
            const y = TRAY_Y_OFFSET;
            const radius = STONE_RADIUS * (0.7 + mass * 0.2);
            const stone = new Stone(x, y, this.nextStoneId++, { radius, mass, label: mass });
            stone._trayX = x;
            stone._trayY = y;
            stone._onPan = null;
            this.trayStones.push(stone);
            this.addStone(stone);
        });

        // Reset beam
        this.beam.angle = 0;
        this.beam.targetAngle = 0;
    }

    _generateRandomLevel() {
        const diffKey = DIFFICULTY_ORDER[this.currentDifficulty];
        const diff = DIFFICULTY_LEVELS[diffKey];

        // Random stone count within range
        const count = diff.stoneRange[0] + Math.floor(Math.random() * (diff.stoneRange[1] - diff.stoneRange[0] + 1));

        // Generate masses
        const masses = [];
        for (let i = 0; i < count; i++) {
            masses.push(diff.massRange[0] + Math.floor(Math.random() * (diff.massRange[1] - diff.massRange[0] + 1)));
        }

        this._createTrayStones(masses);

        // Cycle difficulty for next press
        this.currentDifficulty = (this.currentDifficulty + 1) % DIFFICULTY_ORDER.length;

        // Update button label to show next difficulty
        const nextDiff = DIFFICULTY_ORDER[this.currentDifficulty];
        const btn = this.buttons.find(b => b.id === 'new-level');
        if (btn) btn.label = `↻ ${DIFFICULTY_LEVELS[nextDiff].label}`;
    }

    _startGuessPuzzle() {
        // Generate a random level
        const diff = DIFFICULTY_LEVELS[DIFFICULTY_ORDER[Math.floor(Math.random() * 3)]];
        const count = diff.stoneRange[0] + Math.floor(Math.random() * (diff.stoneRange[1] - diff.stoneRange[0] + 1));

        const masses = [];
        for (let i = 0; i < count; i++) {
            masses.push(diff.massRange[0] + Math.floor(Math.random() * (diff.massRange[1] - diff.massRange[0] + 1)));
        }

        // Create stones and distribute randomly to pans
        this._createTrayStones(masses);

        // Move all tray stones onto pans randomly
        this.trayStones.forEach(stone => {
            const side = Math.random() < 0.5 ? 'left' : 'right';
            stone._onPan = side;
            if (side === 'left') {
                this.leftPan.stones.push(stone);
            } else {
                this.rightPan.stones.push(stone);
            }
        });

        // Position stones on pans
        this._positionStonesOnPan(this.leftPan);
        this._positionStonesOnPan(this.rightPan);

        // Calculate the answer
        const leftTotal = this.leftPan.stones.reduce((sum, s) => sum + s.mass, 0);
        const rightTotal = this.rightPan.stones.reduce((sum, s) => sum + s.mass, 0);

        if (leftTotal > rightTotal) this.guessAnswer = 'left';
        else if (rightTotal > leftTotal) this.guessAnswer = 'right';
        else this.guessAnswer = 'balanced';

        // Freeze physics - beam stays neutral
        this.guessPhysicsFrozen = true;
        this.beam.angle = 0;
        this.beam.targetAngle = 0;
        this.guessState = 'waiting';
        this.guessFeedback = null;
    }

    _submitGuess(guess) {
        if (this.guessState !== 'waiting') return;

        const correct = guess === this.guessAnswer;
        this.guessFeedback = { correct, time: 2.5 };
        this.guessState = 'revealed';

        // Unfreeze physics to show the real tilt
        this.guessPhysicsFrozen = false;
    }

    _updatePanPositions() {
        const halfWidth = this.beam.width / 2;
        const angle = this.beam.angle;
        const beamY = this.beam.y;
        const beamX = this.beam.x;

        this.leftPan.x = beamX - Math.cos(angle) * halfWidth;
        this.leftPan.y = beamY - Math.sin(-angle) * halfWidth;
        this.rightPan.x = beamX + Math.cos(angle) * halfWidth;
        this.rightPan.y = beamY + Math.sin(-angle) * halfWidth;
    }

    _calculateTiltAngle() {
        let leftTorque = 0;
        let rightTorque = 0;
        const halfWidth = this.beam.width / 2;

        this.leftPan.stones.forEach(stone => {
            leftTorque += stone.mass * halfWidth;
        });

        this.rightPan.stones.forEach(stone => {
            rightTorque += stone.mass * halfWidth;
        });

        const torqueDiff = rightTorque - leftTorque;
        const maxTorque = 6 * halfWidth;

        return Math.max(-MAX_TILT_ANGLE, Math.min(MAX_TILT_ANGLE, (torqueDiff / maxTorque) * MAX_TILT_ANGLE));
    }

    _isOnLeftPan(x, y) {
        const dx = x - this.leftPan.x;
        const dy = y - this.leftPan.y;
        return Math.sqrt(dx * dx + dy * dy) < PAN_RADIUS + 20;
    }

    _isOnRightPan(x, y) {
        const dx = x - this.rightPan.x;
        const dy = y - this.rightPan.y;
        return Math.sqrt(dx * dx + dy * dy) < PAN_RADIUS + 20;
    }

    _positionStonesOnPan(pan) {
        const count = pan.stones.length;
        if (count === 0) return;

        if (count === 1) {
            pan.stones[0].setTarget(pan.x, pan.y - 15);
            return;
        }

        const radius = Math.min(PAN_RADIUS * 0.65, 30 + count * 8);
        pan.stones.forEach((stone, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            stone.setTarget(
                pan.x + Math.cos(angle) * radius,
                pan.y - 15 + Math.sin(angle) * radius
            );
        });
    }

    _hitTestButton(x, y, btn) {
        return x >= btn.x && x <= btn.x + btn.width &&
               y >= btn.y && y <= btn.y + btn.height;
    }

    update(deltaTime) {
        // Calculate target beam angle (unless frozen for guessing)
        if (!this.guessPhysicsFrozen) {
            this.beam.targetAngle = this._calculateTiltAngle();
        }

        // Smoothly animate beam toward target angle
        const angleDiff = this.beam.targetAngle - this.beam.angle;
        this.beam.angle += angleDiff * Math.min(1, TILT_SMOOTH_SPEED * deltaTime);

        // Update pan positions based on beam angle
        this._updatePanPositions();

        // Update stone positions on pans
        this._positionStonesOnPan(this.leftPan);
        this._positionStonesOnPan(this.rightPan);

        // Check if balanced
        this.isBalanced = Math.abs(this.beam.angle) < BALANCE_THRESHOLD &&
            (this.leftPan.stones.length > 0 || this.rightPan.stones.length > 0);

        if (this.isBalanced) {
            this.balanceGlowTime += deltaTime;
        } else {
            this.balanceGlowTime = 0;
        }

        // Update inspect timer
        if (this.inspectedStone) {
            this.inspectTimer -= deltaTime;
            if (this.inspectTimer <= 0) {
                this.inspectedStone = null;
                this.inspectTimer = 0;
            }
        }

        // Update guess feedback timer
        if (this.guessFeedback) {
            this.guessFeedback.time -= deltaTime;
            if (this.guessFeedback.time <= 0) {
                this.guessFeedback = null;
                // Auto-generate next puzzle in guess mode
                if (this.guessMode) {
                    this._startGuessPuzzle();
                }
            }
        }

        // Update all stones (smooth movement)
        super.update(deltaTime);
    }

    render() {
        this.renderer.drawBackground();

        const ctx = this.ctx;
        const center = this.renderer.getCenter();
        const dims = this.renderer.getDimensions();

        // Draw tray label (only in play mode when there are tray stones)
        if (!this.guessMode) {
            this.renderer.drawText('drag stones onto the pans', center.x, TRAY_Y_OFFSET + 50, {
                fontSize: 14,
                color: 'rgba(107, 97, 82, 0.35)'
            });
        }

        // Draw difficulty indicator
        const diffKey = DIFFICULTY_ORDER[this.currentDifficulty];
        this.renderer.drawText(
            `${DIFFICULTY_LEVELS[diffKey].label}`,
            dims.width - 170, 68,
            { fontSize: 12, color: 'rgba(107, 97, 82, 0.3)' }
        );

        // Draw fulcrum (triangle)
        ctx.save();
        ctx.fillStyle = FULCRUM_COLOR;
        ctx.beginPath();
        ctx.moveTo(this.fulcrum.x, this.fulcrum.y - FULCRUM_SIZE);
        ctx.lineTo(this.fulcrum.x - FULCRUM_SIZE * 0.7, this.fulcrum.y + 5);
        ctx.lineTo(this.fulcrum.x + FULCRUM_SIZE * 0.7, this.fulcrum.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw balance glow on fulcrum when balanced
        if (this.isBalanced) {
            ctx.save();
            const pulse = 0.5 + 0.5 * Math.sin(this.balanceGlowTime * 3);
            const glowRadius = FULCRUM_SIZE * 1.5 + pulse * 10;
            const gradient = ctx.createRadialGradient(
                this.fulcrum.x, this.fulcrum.y - FULCRUM_SIZE * 0.5, 0,
                this.fulcrum.x, this.fulcrum.y - FULCRUM_SIZE * 0.5, glowRadius
            );
            gradient.addColorStop(0, `rgba(180, 165, 140, ${0.3 * pulse})`);
            gradient.addColorStop(1, 'rgba(180, 165, 140, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.fulcrum.x, this.fulcrum.y - FULCRUM_SIZE * 0.5, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw beam (thick line, rotated)
        ctx.save();
        ctx.translate(this.beam.x, this.beam.y);
        ctx.rotate(this.beam.angle);

        ctx.strokeStyle = BEAM_COLOR;
        ctx.lineWidth = BEAM_THICKNESS;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-this.beam.width / 2, 0);
        ctx.lineTo(this.beam.width / 2, 0);
        ctx.stroke();

        ctx.restore();

        // Draw left pan
        this._drawPan(this.leftPan);

        // Draw right pan
        this._drawPan(this.rightPan);

        // Draw all stones
        this.stones.forEach(stone => stone.draw(ctx));

        // Draw inspect highlight and label
        if (this.inspectedStone && this.inspectTimer > 0) {
            const s = this.inspectedStone;
            const alpha = Math.min(1, this.inspectTimer / 0.5); // fade over last 0.5s

            // Highlight ring
            ctx.save();
            ctx.strokeStyle = `rgba(180, 165, 140, ${0.8 * alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // "Mass: N" pill label above the stone
            ctx.save();
            const labelText = `Mass: ${s.mass}`;
            const pillFontSize = 14;
            ctx.font = `bold ${pillFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const metrics = ctx.measureText(labelText);
            const pillW = metrics.width + 16;
            const pillH = pillFontSize + 10;
            const pillX = s.x;
            const pillY = s.y - s.radius - 20;

            ctx.fillStyle = `rgba(232, 220, 196, ${0.9 * alpha})`;
            ctx.beginPath();
            ctx.roundRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
            ctx.fill();

            ctx.fillStyle = `rgba(107, 97, 82, ${alpha})`;
            ctx.fillText(labelText, pillX, pillY);
            ctx.restore();
        }

        // Draw weight totals under each pan
        const leftTotal = this.leftPan.stones.reduce((sum, s) => sum + s.mass, 0);
        const rightTotal = this.rightPan.stones.reduce((sum, s) => sum + s.mass, 0);

        // Show totals (hidden during guess waiting, shown during revealed)
        if (!this.guessPhysicsFrozen || this.guessState === 'revealed') {
            if (leftTotal > 0) {
                this.renderer.drawCountIndicator(leftTotal, this.leftPan.x, this.leftPan.y + PAN_RADIUS + 25);
            }
            if (rightTotal > 0) {
                this.renderer.drawCountIndicator(rightTotal, this.rightPan.x, this.rightPan.y + PAN_RADIUS + 25);
            }
        } else if (this.guessState === 'waiting') {
            // Show question marks instead
            this.renderer.drawText('?', this.leftPan.x, this.leftPan.y + PAN_RADIUS + 25, {
                fontSize: 18, color: 'rgba(107, 97, 82, 0.4)'
            });
            this.renderer.drawText('?', this.rightPan.x, this.rightPan.y + PAN_RADIUS + 25, {
                fontSize: 18, color: 'rgba(107, 97, 82, 0.4)'
            });
        }

        // Draw top buttons (New Level, Guess Mode)
        this.buttons.forEach(btn => this._drawButton(btn));

        // Draw guess mode UI
        if (this.guessMode && this.guessState === 'waiting') {
            // Draw prompt
            this.renderer.drawText('Which side is heavier?', center.x, dims.height - 120, {
                fontSize: 18, color: 'rgba(107, 97, 82, 0.6)'
            });

            // Draw guess buttons
            this.guessButtons.forEach(btn => this._drawButton(btn));
        }

        // Draw guess feedback
        if (this.guessFeedback) {
            const alpha = Math.min(1, this.guessFeedback.time / 2.0);
            const feedbackColor = this.guessFeedback.correct
                ? `rgba(120, 160, 120, ${0.3 * alpha})` // Soft green
                : `rgba(180, 150, 100, ${0.3 * alpha})`; // Soft amber

            // Full screen tint
            ctx.save();
            ctx.fillStyle = feedbackColor;
            ctx.fillRect(0, 0, dims.width, dims.height);
            ctx.restore();

            // Feedback text
            const emoji = this.guessFeedback.correct ? '✓' : '✗';
            const msg = this.guessFeedback.correct ? 'Correct!' : `${this._answerText()}`;
            this.renderer.drawText(emoji, center.x, dims.height - 100, {
                fontSize: 36, color: `rgba(107, 97, 82, ${alpha})`
            });
            this.renderer.drawText(msg, center.x, dims.height - 60, {
                fontSize: 16, color: `rgba(107, 97, 82, ${alpha * 0.7})`
            });
        }
    }

    _answerText() {
        const leftTotal = this.leftPan.stones.reduce((sum, s) => sum + s.mass, 0);
        const rightTotal = this.rightPan.stones.reduce((sum, s) => sum + s.mass, 0);
        if (this.guessAnswer === 'left') return `Left: ${leftTotal} vs Right: ${rightTotal}`;
        if (this.guessAnswer === 'right') return `Left: ${leftTotal} vs Right: ${rightTotal}`;
        return `Both sides: ${leftTotal}`;
    }

    _drawButton(btn) {
        const ctx = this.ctx;
        ctx.save();

        // Background
        ctx.fillStyle = btn.active ? BALANCE_BTN_BG_ACTIVE : BALANCE_BTN_BG;
        ctx.strokeStyle = BALANCE_BTN_BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.width, btn.height, BALANCE_BTN_RADIUS);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = BALANCE_BTN_TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);

        ctx.restore();
    }

    _drawPan(pan) {
        const ctx = this.ctx;
        ctx.save();

        // Pan circle (dish)
        ctx.fillStyle = PAN_COLOR;
        ctx.strokeStyle = PAN_BORDER_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pan.x, pan.y, PAN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Connection line from beam to pan
        ctx.strokeStyle = BEAM_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pan.x, pan.y - PAN_RADIUS);
        ctx.lineTo(pan.x, this.beam.y + (pan.y > this.beam.y ? 0 : 0));
        ctx.stroke();

        ctx.restore();
    }

    onPointerDown(x, y) {
        // Check top buttons first
        for (const btn of this.buttons) {
            if (this._hitTestButton(x, y, btn)) {
                btn.active = true;
                if (btn.id === 'new-level') {
                    this._generateRandomLevel();
                } else if (btn.id === 'guess-mode') {
                    this.guessMode = !this.guessMode;
                    btn.label = this.guessMode ? '✋ Play' : '🤔 Guess';
                    if (this.guessMode) {
                        this._startGuessPuzzle();
                    } else {
                        // Exit guess mode, reset to normal
                        this.guessPhysicsFrozen = false;
                        this.guessState = 'idle';
                        this.guessFeedback = null;
                        this._generateRandomLevel();
                    }
                }
                // Clear active state after a short delay (visual feedback)
                setTimeout(() => { btn.active = false; }, 150);
                return null;
            }
        }

        // Check guess buttons (if in guess waiting state)
        if (this.guessMode && this.guessState === 'waiting') {
            for (const btn of this.guessButtons) {
                if (this._hitTestButton(x, y, btn)) {
                    btn.active = true;
                    setTimeout(() => { btn.active = false; }, 150);

                    if (btn.id === 'guess-left') this._submitGuess('left');
                    else if (btn.id === 'guess-balanced') this._submitGuess('balanced');
                    else if (btn.id === 'guess-right') this._submitGuess('right');
                    return null;
                }
            }
            // In guess mode waiting state, don't allow stone dragging
            return null;
        }

        // In guess mode revealed state, don't allow dragging
        if (this.guessMode && this.guessState === 'revealed') {
            return null;
        }

        // Normal stone dragging (play mode)
        // Track pointer start for tap detection
        this._pointerDownPos = { x, y };
        this._pointerDownTime = Date.now();

        const stone = this.findStoneAtPosition(x, y);
        if (stone) {
            if (stone.startDrag()) {
                this.moveStoneToTop(stone);

                // Remove from pan if on one
                if (stone._onPan === 'left') {
                    const idx = this.leftPan.stones.indexOf(stone);
                    if (idx > -1) this.leftPan.stones.splice(idx, 1);
                    stone._onPan = null;
                } else if (stone._onPan === 'right') {
                    const idx = this.rightPan.stones.indexOf(stone);
                    if (idx > -1) this.rightPan.stones.splice(idx, 1);
                    stone._onPan = null;
                }

                return stone;
            }
        }
        return null;
    }

    onPointerMove(x, y, draggedStone) {
        if (draggedStone) {
            draggedStone.setPosition(x, y);
        }
    }

    onPointerUp(x, y, draggedStone) {
        // Check for tap gesture (short duration, minimal movement)
        if (this._pointerDownPos && draggedStone) {
            const dx = x - this._pointerDownPos.x;
            const dy = y - this._pointerDownPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const duration = Date.now() - this._pointerDownTime;

            if (dist < 10 && duration < 300) {
                // This is a tap - inspect the stone
                draggedStone.stopDrag();
                this.inspectedStone = draggedStone;
                this.inspectTimer = 2.0;
                this._pointerDownPos = null;
                return;
            }
        }
        this._pointerDownPos = null;

        if (!draggedStone) return;

        draggedStone.stopDrag();

        // Check if dropped on left pan
        if (this._isOnLeftPan(x, y)) {
            draggedStone._onPan = 'left';
            this.leftPan.stones.push(draggedStone);
            this._positionStonesOnPan(this.leftPan);
            return;
        }

        // Check if dropped on right pan
        if (this._isOnRightPan(x, y)) {
            draggedStone._onPan = 'right';
            this.rightPan.stones.push(draggedStone);
            this._positionStonesOnPan(this.rightPan);
            return;
        }

        // Otherwise, return to tray position
        draggedStone._onPan = null;
        draggedStone.setTarget(draggedStone._trayX, draggedStone._trayY);
    }

    cleanup() {
        super.cleanup();
        this.leftPan.stones = [];
        this.rightPan.stones = [];
        this.trayStones = [];
        this.isBalanced = false;
        this.balanceGlowTime = 0;
        this.nextStoneId = 0;
        this.inspectedStone = null;
        this.inspectTimer = 0;
        this._pointerDownPos = null;
        this._pointerDownTime = 0;
        this.guessMode = false;
        this.guessState = 'idle';
        this.guessAnswer = null;
        this.guessFeedback = null;
        this.guessPhysicsFrozen = false;
    }

    static getMetadata() {
        return {
            id: 'balance-scale',
            name: 'Balance',
            icon: '⚖️',
            description: 'Balance and equality'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BalanceScaleMode };
}
