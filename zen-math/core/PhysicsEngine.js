// PhysicsEngine - Utility class for physics calculations
// Used by game modes for drag, gravity, collision, balance, and stability checks.
// NOT a simulation loop - modes call these methods as needed.

class PhysicsEngine {

    // Mass-based drag: heavier stones move slower when dragged.
    // Returns eased position given current pos, target pos, and stone mass.
    static applyMassDrag(currentX, currentY, targetX, targetY, mass) {
        // Ease factor inversely proportional to mass.
        // Clamp mass to avoid division by zero or absurd speeds.
        const ease = 0.2 / Math.max(mass, 0.1);
        return {
            x: currentX + (targetX - currentX) * ease,
            y: currentY + (targetY - currentY) * ease
        };
    }

    // Apply downward gravitational force to velocity.
    // Returns new velocity vector after gravity is applied for deltaTime seconds.
    static applyGravity(velocityX, velocityY, deltaTime, gravity = 980) {
        return {
            x: velocityX,
            y: velocityY + gravity * deltaTime
        };
    }

    // Circle-circle collision detection between two stones.
    // Each stone must have {x, y, radius}.
    // Returns whether they collide, the overlap depth, and raw distance.
    static checkCollision(stone1, stone2) {
        const dx = stone1.x - stone2.x;
        const dy = stone1.y - stone2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = stone1.radius + stone2.radius;
        return {
            colliding: dist < minDist,
            overlap: minDist - dist,
            distance: dist
        };
    }

    // Resolve a collision by pushing two stones apart along their center line.
    // Separation is weighted by inverse mass (lighter stones move more).
    // Modifies stone positions in place and zeroes relative velocity along collision axis.
    static resolveCollision(stone1, stone2) {
        const dx = stone2.x - stone1.x;
        const dy = stone2.y - stone1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero when stones are on top of each other
        if (dist === 0) {
            stone2.x += 1;
            return;
        }

        const minDist = stone1.radius + stone2.radius;
        const overlap = minDist - dist;

        // No collision to resolve
        if (overlap <= 0) return;

        // Unit normal from stone1 toward stone2
        const nx = dx / dist;
        const ny = dy / dist;

        // Distribute push based on inverse mass (lighter moves more)
        const totalMass = stone1.mass + stone2.mass;
        const ratio1 = stone2.mass / totalMass; // stone1 moves proportional to stone2's mass
        const ratio2 = stone1.mass / totalMass; // stone2 moves proportional to stone1's mass

        // Separate the stones
        stone1.x -= nx * overlap * ratio1;
        stone1.y -= ny * overlap * ratio1;
        stone2.x += nx * overlap * ratio2;
        stone2.y += ny * overlap * ratio2;

        // Elastic velocity exchange along collision normal
        const v1n = stone1.velocity.x * nx + stone1.velocity.y * ny;
        const v2n = stone2.velocity.x * nx + stone2.velocity.y * ny;

        // 1D elastic collision formulas
        const v1nAfter = (v1n * (stone1.mass - stone2.mass) + 2 * stone2.mass * v2n) / totalMass;
        const v2nAfter = (v2n * (stone2.mass - stone1.mass) + 2 * stone1.mass * v1n) / totalMass;

        // Apply the change only along the collision normal
        stone1.velocity.x += (v1nAfter - v1n) * nx;
        stone1.velocity.y += (v1nAfter - v1n) * ny;
        stone2.velocity.x += (v2nAfter - v2n) * nx;
        stone2.velocity.y += (v2nAfter - v2n) * ny;
    }

    // Clamp a stone's position so it stays fully inside the canvas.
    // Returns the clamped {x, y} position.
    static clampToCanvas(stone, canvasWidth, canvasHeight) {
        const r = stone.radius;
        return {
            x: Math.max(r, Math.min(canvasWidth - r, stone.x)),
            y: Math.max(r, Math.min(canvasHeight - r, stone.y))
        };
    }

    // Calculate center of mass for an array of stones.
    // Each stone must have {x, y, mass}.
    // Returns {x, y, totalMass}.
    static centerOfMass(stones) {
        if (!stones || stones.length === 0) {
            return { x: 0, y: 0, totalMass: 0 };
        }

        let totalMass = 0;
        let wx = 0;
        let wy = 0;

        for (const stone of stones) {
            totalMass += stone.mass;
            wx += stone.x * stone.mass;
            wy += stone.y * stone.mass;
        }

        return {
            x: wx / totalMass,
            y: wy / totalMass,
            totalMass: totalMass
        };
    }

    // Check if a vertical stack of stones is stable.
    // A stack is stable if the center of mass (horizontally) stays
    // within tolerance * baseWidth of the base center.
    // Used by StackBalanceMode.
    // Returns { stable: bool, tilt: number (-1 to 1) }
    //   tilt < 0 means leaning left, tilt > 0 means leaning right
    static isStackStable(stones, baseWidth, tolerance = 0.3) {
        if (!stones || stones.length === 0) {
            return { stable: true, tilt: 0 };
        }

        // Find the base stone (lowest y = highest on screen, but in canvas coords
        // the base is the stone with the largest y value)
        let baseStone = stones[0];
        for (const stone of stones) {
            if (stone.y > baseStone.y) {
                baseStone = stone;
            }
        }

        const baseCenterX = baseStone.x;
        const com = PhysicsEngine.centerOfMass(stones);

        // How far off-center the center of mass is, relative to half the base width
        const halfBase = baseWidth / 2;
        const offset = com.x - baseCenterX;

        // Tilt normalized to [-1, 1] range based on base width
        const tilt = halfBase > 0 ? Math.max(-1, Math.min(1, offset / halfBase)) : 0;

        // Stable if the offset is within tolerance * baseWidth from center
        const maxOffset = baseWidth * tolerance;
        const stable = Math.abs(offset) <= maxOffset;

        return { stable, tilt };
    }

    // Calculate balance beam tilt angle based on torques.
    // Used by BalanceScaleMode.
    // leftStones and rightStones are arrays of stones on each side.
    // fulcrumX is the x-coordinate of the pivot point.
    // Returns tilt angle in radians (negative = left heavy, positive = right heavy).
    static calculateBeamTilt(leftStones, rightStones, fulcrumX) {
        // Sum torques: torque = mass * distance_from_fulcrum
        // Convention: left stones have negative distance, right have positive.
        let leftTorque = 0;
        let rightTorque = 0;

        for (const stone of leftStones) {
            const distance = Math.abs(fulcrumX - stone.x);
            leftTorque += stone.mass * distance;
        }

        for (const stone of rightStones) {
            const distance = Math.abs(stone.x - fulcrumX);
            rightTorque += stone.mass * distance;
        }

        // Net torque: positive means right side is heavier
        const netTorque = rightTorque - leftTorque;

        // Convert torque imbalance to a tilt angle.
        // Use atan to give a smooth curve that asymptotes at +-PI/4 (45 degrees).
        // Scale factor controls sensitivity - higher = tilts with less imbalance.
        const sensitivity = 0.005;
        const maxTilt = Math.PI / 4; // 45 degrees max
        const tilt = Math.atan(netTorque * sensitivity) * (maxTilt / (Math.PI / 2));

        return tilt;
    }

    // Calculate tilt for a single node in a mobile (hanging balance).
    // Used by MobileBalanceMode for recursive balance trees.
    // leftMass, rightMass: total mass on each side
    // leftArm, rightArm: distance from fulcrum to attachment points
    // Returns tilt angle in radians (negative = left heavy, positive = right heavy).
    static calculateNodeTilt(leftMass, rightMass, leftArm, rightArm) {
        // Calculate torques: torque = mass * arm_length
        const leftTorque = leftMass * leftArm;
        const rightTorque = rightMass * rightArm;

        // Net torque: positive means right side is heavier
        const netTorque = rightTorque - leftTorque;

        // Convert to tilt angle using same curve as calculateBeamTilt
        const sensitivity = 0.005;
        const maxTilt = Math.PI / 4; // 45 degrees max
        const tilt = Math.atan(netTorque * sensitivity) * (maxTilt / (Math.PI / 2));

        return tilt;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhysicsEngine };
}
