// StackBalanceMode - Spatial reasoning and stability
// Enhanced: fixed physics, rearrangeable stacks, color proximity blending

const GRAVITY = 400; // Pixels per second squared
const PLATFORM_HEIGHT = 8;
const PLATFORM_COLOR = '#8b7d6b';
const WOBBLE_DURATION = 0.8; // seconds before topple
const TOPPLE_FORCE = 150;
const LANDING_SNAP_THRESHOLD = 10;
const STABILITY_TOLERANCE = 0.6;
const RESTING_VELOCITY_THRESHOLD = 5; // Below this, stone is at rest
const COLOR_BLEND_SPEED = 3; // How fast colors blend per second
const NEIGHBOR_RADIUS_FACTOR = 1.5; // Multiplier for neighbor detection

// Expanded color palette
const STACK_COLORS = [
    '#C75B5B', // warm red
    '#5B8FC7', // ocean blue
    '#5BA87A', // forest green
    '#D4943A', // sunset orange
    '#8B6BAE', // plum purple
    '#C7A83B', // golden yellow
    '#8b7d6b', // earth tone 1
    '#9a8c7a', // earth tone 2
    '#7a6f5d', // earth tone 3
    '#6b6152', // earth tone 4
];

// Color categories for reactions
const WARM_COLORS = ['#C75B5B', '#D4943A', '#C7A83B'];
const COOL_COLORS = ['#5B8FC7', '#5BA87A', '#8B6BAE'];
const EARTH_COLORS = ['#8b7d6b', '#9a8c7a', '#7a6f5d', '#6b6152'];

// Complementary pairs (approximate color wheel opposites)
const COMPLEMENTARY_PAIRS = [
    ['#C75B5B', '#5BA87A'], // red - green
    ['#5B8FC7', '#D4943A'], // blue - orange
    ['#8B6BAE', '#C7A83B'], // purple - yellow
];

function _getColorCategory(color) {
    if (WARM_COLORS.includes(color)) return 'warm';
    if (COOL_COLORS.includes(color)) return 'cool';
    if (EARTH_COLORS.includes(color)) return 'earth';
    return 'unknown';
}

function _areComplementary(c1, c2) {
    return COMPLEMENTARY_PAIRS.some(pair =>
        (pair[0] === c1 && pair[1] === c2) || (pair[1] === c1 && pair[0] === c2)
    );
}

class StackBalanceMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.platform = { x: 0, y: 0, width: 200 };
        this.stackedStones = [];
        this.fallingStones = [];
        this.availableStones = [];
        this.stackHeight = 0;
        this.isToppling = false;
        this.toppleTimer = 0;
        this.wobbleAmount = 0;
        this.wobbleDirection = 0;
        this.nextStoneId = 0;
    }

    init() {
        super.init();

        const center = this.renderer.getCenter();
        const dims = this.renderer.getDimensions();

        // Position platform near bottom
        this.platform.x = center.x;
        this.platform.y = dims.height - 100;

        // Create 10 stones at top area with varying sizes and colors
        const stoneCount = 10;
        const trayWidth = dims.width * 0.8;
        const startX = center.x - trayWidth / 2;
        const spacing = trayWidth / (stoneCount - 1);

        for (let i = 0; i < stoneCount; i++) {
            const radiusVariation = STONE_RADIUS * (0.7 + Math.random() * 0.6);
            const x = startX + i * spacing;
            const y = 60 + Math.random() * 20;
            const baseColor = STACK_COLORS[Math.floor(Math.random() * STACK_COLORS.length)];

            const stone = new Stone(x, y, this.nextStoneId++, {
                radius: radiusVariation,
                mass: radiusVariation / STONE_RADIUS,
                color: baseColor
            });
            stone._originalX = x;
            stone._originalY = y;
            stone._vy = 0;
            stone._vx = 0;
            stone._rotation = 0;
            stone._rotationSpeed = 0;
            stone._isStacked = false;
            stone._isFalling = false;
            stone._isToppling = false;
            stone._isResting = false; // New: resting state to prevent jitter

            // Wobble properties
            stone._wobblePhase = 0;
            stone._wobbleAmplitude = 0;

            // Color reaction properties
            stone._glowIntensity = 0;
            stone._glowColor = null;
            stone._sparkTime = 0;

            // Color blending properties
            stone._baseColor = baseColor;
            stone._displayColor = baseColor;
            stone._targetDisplayColor = baseColor;

            this.availableStones.push(stone);
            this.addStone(stone);
        }
    }

    _getPlatformTop() {
        return this.platform.y - PLATFORM_HEIGHT / 2;
    }

    _getStackTop() {
        if (this.stackedStones.length === 0) return this._getPlatformTop();

        let minY = this._getPlatformTop();
        this.stackedStones.forEach(stone => {
            const top = stone.y - stone.radius;
            if (top < minY) minY = top;
        });
        return minY;
    }

    _findLandingY(stone) {
        let landingY = this._getPlatformTop() - stone.radius;

        this.stackedStones.forEach(stacked => {
            const dx = Math.abs(stone.x - stacked.x);
            const minDist = stone.radius + stacked.radius;

            if (dx < minDist * 0.8) {
                const stackedTop = stacked.y - stacked.radius - stone.radius;
                if (stackedTop < landingY) {
                    landingY = stackedTop;
                }
            }
        });

        return landingY;
    }

    _checkCollisionWithStacked(stone) {
        const platformTop = this._getPlatformTop();

        // Check platform collision
        if (stone.y + stone.radius >= platformTop) {
            stone.y = platformTop - stone.radius;
            return true;
        }

        // Check collision with stacked stones
        for (const stacked of this.stackedStones) {
            const dx = stone.x - stacked.x;
            const dy = stone.y - stacked.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = stone.radius + stacked.radius;

            if (dist < minDist) {
                // Resolve: push stone upward along collision normal
                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = minDist - dist;
                    stone.x += nx * overlap;
                    stone.y += ny * overlap;
                } else {
                    // Perfectly overlapping - push straight up
                    stone.y = stacked.y - minDist;
                }
                return true;
            }
        }

        return false;
    }

    _calculateCenterOfMass() {
        if (this.stackedStones.length === 0) return { x: this.platform.x, totalMass: 0 };

        let totalMass = 0;
        let weightedX = 0;

        this.stackedStones.forEach(stone => {
            totalMass += stone.mass;
            weightedX += stone.x * stone.mass;
        });

        return {
            x: weightedX / totalMass,
            totalMass: totalMass
        };
    }

    _isStackStable() {
        if (this.stackedStones.length <= 1) return { stable: true, tilt: 0 };

        const com = this._calculateCenterOfMass();
        const halfBase = this.platform.width / 2;

        const offset = com.x - this.platform.x;
        const tilt = offset / halfBase;

        const stable = Math.abs(tilt) < STABILITY_TOLERANCE;

        return { stable, tilt };
    }

    _startTopple(tiltDirection) {
        this.isToppling = true;
        this.toppleTimer = 0;

        this.stackedStones.forEach((stone, i) => {
            stone._isToppling = true;
            stone._isStacked = false;
            stone._isResting = false;

            const heightFactor = 1 + (this.stackedStones.length - i) * 0.3;
            stone._vx = tiltDirection * TOPPLE_FORCE * heightFactor * (0.8 + Math.random() * 0.4);
            stone._vy = -50 * Math.random();
            stone._rotationSpeed = tiltDirection * (2 + Math.random() * 3);
        });

        this.fallingStones.push(...this.stackedStones);
        this.stackedStones = [];
        this.stackHeight = 0;
    }

    // Color blending utilities
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 139, g: 125, b: 107 };
    }

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c => {
            const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    _blendColors(color1, color2, ratio) {
        const c1 = this._hexToRgb(color1);
        const c2 = this._hexToRgb(color2);
        return this._rgbToHex(
            c1.r + (c2.r - c1.r) * ratio,
            c1.g + (c2.g - c1.g) * ratio,
            c1.b + (c2.b - c1.b) * ratio
        );
    }

    _transferImpactWobble(landingStone, impactSpeed) {
        // When a stone lands, nearby stacked stones get a wobble proportional to impact
        this.stackedStones.forEach(stacked => {
            if (stacked === landingStone) return;
            const dist = landingStone.distanceTo(stacked);
            const touchDist = (landingStone.radius + stacked.radius) * 1.5;
            if (dist < touchDist) {
                const force = Math.min(6, impactSpeed * 0.015 * (1 - dist / touchDist));
                stacked._wobbleAmplitude = Math.max(stacked._wobbleAmplitude, force);
                stacked._wobblePhase = 0;
            }
        });
    }

    _updateWobble(deltaTime) {
        this.stackedStones.forEach(stone => {
            if (stone._wobbleAmplitude > 0.1) {
                stone._wobblePhase += deltaTime * 15; // Frequency
                // Decaying sinusoidal offset
                stone._wobbleAmplitude *= Math.max(0, 1 - deltaTime * 4); // Decay rate
            } else {
                stone._wobbleAmplitude = 0;
            }
        });
    }

    _updateColorReactions(deltaTime) {
        // Reset all reaction state
        this.stackedStones.forEach(stone => {
            stone._glowIntensity = Math.max(0, (stone._glowIntensity || 0) - deltaTime * 3);
            stone._glowColor = null;

            if (stone._sparkTime > 0) {
                stone._sparkTime -= deltaTime;
            }
        });

        // Check each pair of touching stacked stones
        for (let i = 0; i < this.stackedStones.length; i++) {
            const a = this.stackedStones[i];
            const catA = _getColorCategory(a._baseColor);
            if (catA === 'earth') continue; // Earth tones don't react

            for (let j = i + 1; j < this.stackedStones.length; j++) {
                const b = this.stackedStones[j];
                const catB = _getColorCategory(b._baseColor);
                if (catB === 'earth') continue;

                const dist = a.distanceTo(b);
                const touchDist = (a.radius + b.radius) * 1.5;
                if (dist >= touchDist) continue; // Not touching

                if (a._baseColor === b._baseColor) {
                    // Same color: warm golden glow, pulsing
                    a._glowIntensity = 1.0;
                    b._glowIntensity = 1.0;
                    a._glowColor = '#D4A43A'; // golden
                    b._glowColor = '#D4A43A';
                } else if (_areComplementary(a._baseColor, b._baseColor)) {
                    // Complementary: spark effect + brief wobble
                    if (a._sparkTime <= 0) a._sparkTime = 0.5;
                    if (b._sparkTime <= 0) b._sparkTime = 0.5;
                    // Brief wobble on first contact
                    if (a._wobbleAmplitude < 2) a._wobbleAmplitude = 2;
                    if (b._wobbleAmplitude < 2) b._wobbleAmplitude = 2;
                } else if (catA === catB) {
                    // Same category, different color: subtle shared glow
                    a._glowIntensity = Math.max(a._glowIntensity, 0.4);
                    b._glowIntensity = Math.max(b._glowIntensity, 0.4);
                    a._glowColor = a._glowColor || '#B8A894';
                    b._glowColor = b._glowColor || '#B8A894';
                }
            }
        }
    }

    _updateColorBlending(deltaTime) {
        // Calculate target display colors based on proximity
        this.stackedStones.forEach(stone => {
            const neighbors = this.stackedStones.filter(other => {
                if (other === stone) return false;
                const dist = stone.distanceTo(other);
                return dist < (stone.radius + other.radius) * NEIGHBOR_RADIUS_FACTOR;
            });

            if (neighbors.length === 0) {
                stone._targetDisplayColor = stone._baseColor;
            } else {
                // Average neighbor color
                const avgRgb = { r: 0, g: 0, b: 0 };
                neighbors.forEach(n => {
                    const rgb = this._hexToRgb(n._baseColor);
                    avgRgb.r += rgb.r;
                    avgRgb.g += rgb.g;
                    avgRgb.b += rgb.b;
                });
                avgRgb.r /= neighbors.length;
                avgRgb.g /= neighbors.length;
                avgRgb.b /= neighbors.length;

                const neighborAvgHex = this._rgbToHex(avgRgb.r, avgRgb.g, avgRgb.b);
                // 70% own color + 30% neighbor average
                stone._targetDisplayColor = this._blendColors(stone._baseColor, neighborAvgHex, 0.3);
            }
        });

        // Smoothly animate toward target color
        const blendRate = Math.min(1, COLOR_BLEND_SPEED * deltaTime);
        this.stackedStones.forEach(stone => {
            stone._displayColor = this._blendColors(
                stone._displayColor || stone._baseColor,
                stone._targetDisplayColor,
                blendRate
            );
            // Apply display color to stone's render color
            stone.color = stone._displayColor;
        });
    }

    update(deltaTime) {
        if (deltaTime > 0.1) deltaTime = 0.1; // Clamp large delta times

        const dims = this.renderer.getDimensions();
        const platformTop = this._getPlatformTop();

        // Process falling stones
        for (let i = this.fallingStones.length - 1; i >= 0; i--) {
            const stone = this.fallingStones[i];

            // Skip stones being dragged
            if (stone.isDragging) continue;

            // Apply gravity
            stone._vy += GRAVITY * deltaTime;
            stone.y += stone._vy * deltaTime;
            stone.x += stone._vx * deltaTime;

            // Apply rotation for toppling stones
            if (stone._isToppling) {
                stone._rotation += stone._rotationSpeed * deltaTime;
                stone._vx *= 0.98;
            }

            // Check if non-toppling stone has landed
            if (!stone._isToppling && this._checkCollisionWithStacked(stone)) {
                const impactSpeed = Math.abs(stone._vy);

                // Critical fix: zero out velocity and mark as resting
                // This prevents the jitter/bounce loop
                if (impactSpeed < RESTING_VELOCITY_THRESHOLD) {
                    stone._vy = 0;
                    stone._vx = 0;
                    stone._isFalling = false;
                    stone._isStacked = true;
                    stone._isResting = true;

                    // Set wobble on landing proportional to residual speed
                    stone._wobbleAmplitude = Math.min(4, impactSpeed * 0.02);
                    stone._wobblePhase = 0;

                    this.fallingStones.splice(i, 1);
                    this.stackedStones.push(stone);

                    // Transfer momentum: wobble nearby stacked stones
                    this._transferImpactWobble(stone, impactSpeed);

                    // Check stability after landing
                    const stability = this._isStackStable();
                    if (!stability.stable && !this.isToppling) {
                        this.wobbleAmount = Math.abs(stability.tilt);
                        this.wobbleDirection = stability.tilt > 0 ? 1 : -1;
                        this._startTopple(this.wobbleDirection);
                    } else {
                        this._updateStackHeight();
                    }
                } else {
                    // Velocity-dependent bounce: stronger for fast impacts, weaker for gentle
                    const bounceFactor = impactSpeed > 200 ? 0.35 : impactSpeed > 100 ? 0.2 : 0.1;
                    stone._vy = -stone._vy * bounceFactor;
                    // Slight horizontal scatter on bounce
                    stone._vx = stone._vx * 0.5 + (Math.random() - 0.5) * impactSpeed * 0.05;

                    // If velocity is still very small after bounce, just land it
                    if (Math.abs(stone._vy) < RESTING_VELOCITY_THRESHOLD) {
                        stone._vy = 0;
                        stone._vx = 0;
                        stone._isFalling = false;
                        stone._isStacked = true;
                        stone._isResting = true;

                        // Set landing wobble
                        stone._wobbleAmplitude = Math.min(8, impactSpeed * 0.03);
                        stone._wobblePhase = 0;

                        this.fallingStones.splice(i, 1);
                        this.stackedStones.push(stone);

                        // Transfer momentum
                        this._transferImpactWobble(stone, impactSpeed);

                        const stability = this._isStackStable();
                        if (!stability.stable && !this.isToppling) {
                            this.wobbleAmount = Math.abs(stability.tilt);
                            this.wobbleDirection = stability.tilt > 0 ? 1 : -1;
                            this._startTopple(this.wobbleDirection);
                        } else {
                            this._updateStackHeight();
                        }
                    }
                }
                continue;
            }

            // Remove toppling stones that fall off screen
            if (stone._isToppling && (stone.y > dims.height + 100 || stone.x < -100 || stone.x > dims.width + 100)) {
                this.fallingStones.splice(i, 1);
                this.removeStone(stone);
            }
        }

        // End topple animation when all toppling stones are gone
        if (this.isToppling) {
            this.toppleTimer += deltaTime;
            const hasToppling = this.fallingStones.some(s => s._isToppling);
            if (!hasToppling) {
                this.isToppling = false;
                this.wobbleAmount = 0;
            }
        }

        // Update wobble animations
        this._updateWobble(deltaTime);

        // Update color reactions
        this._updateColorReactions(deltaTime);

        // Update color blending for stacked stones
        this._updateColorBlending(deltaTime);

        // Update non-dragged, non-falling stones (smooth target movement)
        this.stones.forEach(stone => {
            if (!stone.isDragging && !stone._isFalling && !stone._isToppling && !stone._isResting) {
                stone.update(deltaTime);
            }
        });
    }

    render() {
        this.renderer.drawBackground();

        const ctx = this.ctx;
        const dims = this.renderer.getDimensions();

        // Draw platform
        ctx.save();
        ctx.fillStyle = PLATFORM_COLOR;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        const platLeft = this.platform.x - this.platform.width / 2;
        const platTop = this.platform.y - PLATFORM_HEIGHT / 2;
        ctx.beginPath();
        ctx.roundRect(platLeft, platTop, this.platform.width, PLATFORM_HEIGHT, 3);
        ctx.fill();
        ctx.restore();

        // Draw platform legs
        ctx.save();
        ctx.fillStyle = PLATFORM_COLOR;
        ctx.fillRect(platLeft + 10, platTop + PLATFORM_HEIGHT, 6, 20);
        ctx.fillRect(platLeft + this.platform.width - 16, platTop + PLATFORM_HEIGHT, 6, 20);
        ctx.restore();

        // Draw all stones (available, stacked, falling)
        // Available stones first (in tray area)
        this.availableStones.forEach(stone => {
            if (!stone._isFalling && !stone._isStacked && !stone._isToppling && !stone.isDragging) {
                stone.draw(ctx);
            }
        });

        // Stacked stones (with wobble offset, glow, and spark effects)
        this.stackedStones.forEach(stone => {
            // Draw glow effect behind stone
            if (stone._glowIntensity > 0 && stone._glowColor) {
                ctx.save();
                const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005); // Pulsing
                const glowRadius = stone.radius + 12;
                const gradient = ctx.createRadialGradient(
                    stone.x, stone.y, stone.radius * 0.5,
                    stone.x, stone.y, glowRadius
                );
                const glowAlpha = stone._glowIntensity * pulse * 0.5;
                // Parse hex color to rgba for reliable canvas rendering
                const gc = this._hexToRgb(stone._glowColor);
                gradient.addColorStop(0, `rgba(${gc.r}, ${gc.g}, ${gc.b}, ${glowAlpha})`);
                gradient.addColorStop(1, `rgba(${gc.r}, ${gc.g}, ${gc.b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(stone.x, stone.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Apply wobble horizontal offset
            if (stone._wobbleAmplitude > 0.1) {
                const wobbleOffset = Math.sin(stone._wobblePhase) * stone._wobbleAmplitude;
                ctx.save();
                ctx.translate(wobbleOffset, 0);
                stone.draw(ctx);
                ctx.restore();
            } else {
                stone.draw(ctx);
            }

            // Draw spark effect (radial lines)
            if (stone._sparkTime > 0) {
                ctx.save();
                const sparkAlpha = Math.min(1, stone._sparkTime * 2);
                const sparkRadius = stone.radius + 15 + (0.5 - stone._sparkTime) * 20;
                ctx.strokeStyle = `rgba(255, 220, 150, ${sparkAlpha * 0.7})`;
                ctx.lineWidth = 2;
                for (let a = 0; a < 8; a++) {
                    const angle = (a / 8) * Math.PI * 2 + stone._sparkTime * 5;
                    ctx.beginPath();
                    ctx.moveTo(
                        stone.x + Math.cos(angle) * (stone.radius + 2),
                        stone.y + Math.sin(angle) * (stone.radius + 2)
                    );
                    ctx.lineTo(
                        stone.x + Math.cos(angle) * sparkRadius,
                        stone.y + Math.sin(angle) * sparkRadius
                    );
                    ctx.stroke();
                }
                ctx.restore();
            }
        });

        // Falling and toppling stones (with rotation for toppling)
        this.fallingStones.forEach(stone => {
            if (stone._isToppling && stone._rotation !== 0) {
                ctx.save();
                ctx.translate(stone.x, stone.y);
                ctx.rotate(stone._rotation);
                ctx.translate(-stone.x, -stone.y);
                stone.draw(ctx);
                ctx.restore();
            } else {
                stone.draw(ctx);
            }
        });

        // Draw dragged stone on top
        const dragged = this.stones.find(s => s.isDragging);
        if (dragged) {
            dragged.draw(ctx);
        }

        // Draw stack height indicator
        if (this.stackHeight > 0) {
            this.renderer.drawText(
                `${this.stackHeight}`,
                dims.width - 50,
                dims.height - 50,
                { fontSize: 24, color: 'rgba(107, 97, 82, 0.4)' }
            );
            this.renderer.drawText(
                'stacked',
                dims.width - 50,
                dims.height - 30,
                { fontSize: 12, color: 'rgba(107, 97, 82, 0.3)' }
            );
        }

        // Draw tray hint
        if (this.availableStones.some(s => !s._isStacked && !s._isFalling && !s._isToppling)) {
            this.renderer.drawText('drag stones down to stack', this.renderer.getCenter().x, 110, {
                fontSize: 14,
                color: 'rgba(107, 97, 82, 0.3)'
            });
        }

        // Wobble indicator before topple
        if (this.isToppling && this.toppleTimer < 0.3) {
            const wobble = Math.sin(this.toppleTimer * 30) * 3;
            ctx.save();
            ctx.strokeStyle = 'rgba(180, 140, 100, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.platform.x + wobble, this.platform.y - 200);
            ctx.lineTo(this.platform.x + wobble, this.platform.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    _updateStackHeight() {
        this.stackHeight = this.stackedStones.length;
    }

    onPointerDown(x, y) {
        // Allow picking up ANY stone: available, stacked, or falling
        for (let i = this.stones.length - 1; i >= 0; i--) {
            const stone = this.stones[i];
            if (stone.contains(x, y) && !stone._isToppling) {
                if (stone.startDrag()) {
                    this.moveStoneToTop(stone);

                    // If stone was stacked, remove from stack
                    if (stone._isStacked) {
                        const idx = this.stackedStones.indexOf(stone);
                        if (idx > -1) this.stackedStones.splice(idx, 1);
                        stone._isStacked = false;
                        stone._isResting = false;

                        // Reset color to base when removed from stack
                        stone.color = stone._baseColor || stone.color;
                        stone._displayColor = stone._baseColor || stone.color;

                        // Update stack height and check stability of remaining stack
                        this._updateStackHeight();
                        if (this.stackedStones.length > 1) {
                            const stability = this._isStackStable();
                            if (!stability.stable && !this.isToppling) {
                                this.wobbleAmount = Math.abs(stability.tilt);
                                this.wobbleDirection = stability.tilt > 0 ? 1 : -1;
                                this._startTopple(this.wobbleDirection);
                            }
                        }
                    }

                    // If stone was falling, remove from falling list
                    if (stone._isFalling) {
                        const idx = this.fallingStones.indexOf(stone);
                        if (idx > -1) this.fallingStones.splice(idx, 1);
                        stone._isFalling = false;
                    }

                    return stone;
                }
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
        if (!draggedStone) return;

        draggedStone.stopDrag();

        const platformTop = this._getPlatformTop();

        // If released below the tray area and within platform range, start falling
        if (y > 120 && x > this.platform.x - this.platform.width && x < this.platform.x + this.platform.width) {
            // Remove from available stones if still there
            const idx = this.availableStones.indexOf(draggedStone);
            if (idx > -1) {
                this.availableStones.splice(idx, 1);
            }

            draggedStone._isFalling = true;
            draggedStone._isResting = false;
            draggedStone._vy = 0;
            draggedStone._vx = 0;
            this.fallingStones.push(draggedStone);
        } else {
            // Return to original position (if still an available stone)
            if (draggedStone._originalX !== undefined) {
                draggedStone.setTarget(draggedStone._originalX, draggedStone._originalY);
                // Re-add to available if not already there
                if (!this.availableStones.includes(draggedStone)) {
                    this.availableStones.push(draggedStone);
                }
            }
        }
    }

    cleanup() {
        super.cleanup();
        this.stackedStones = [];
        this.fallingStones = [];
        this.availableStones = [];
        this.stackHeight = 0;
        this.isToppling = false;
        this.toppleTimer = 0;
        this.wobbleAmount = 0;
        this.nextStoneId = 0;
    }

    static getMetadata() {
        return {
            id: 'stack-balance',
            name: 'Stack',
            icon: '🏛️',
            description: 'Stacking and spatial balance'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StackBalanceMode };
}
