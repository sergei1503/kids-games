# Feature Roadmap - Next Generation

## 🌍 Gravity Mode (Free Explore Enhancement)

### Vision
Transform Free Explore into a dynamic physics sandbox where stones have gravitational pull, momentum, and can be combined into larger celestial bodies. Children discover gravity, momentum, and grouping through natural play.

### Core Mechanics

#### 1. Gravitational Pull System
**Concept:** Every stone has gravity proportional to its mass. Stones attract each other!

**Implementation:**
```javascript
// In PhysicsEngine
static applyGravitationalForce(stone1, stone2, deltaTime) {
    const G = 100; // Gravitational constant (tuned for fun, not realism)
    const dx = stone2.x - stone1.x;
    const dy = stone2.y - stone1.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < 5) return; // Avoid singularity

    // F = G * m1 * m2 / r²
    const force = G * stone1.mass * stone2.mass / distSq;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    // Apply force as acceleration: a = F / m
    stone1.velocity.x += (fx / stone1.mass) * deltaTime;
    stone1.velocity.y += (fy / stone1.mass) * deltaTime;
}
```

**Visual Feedback:**
- Faint gravitational field lines between nearby stones
- Larger stones have visible "gravity wells" (subtle glow radius)
- Stones slowly drift toward each other when close

---

#### 2. Throwing Mechanics (Momentum)
**Concept:** Drag and release with speed → stone gets momentum

**Implementation:**
```javascript
// In FreeExploreMode
onPointerUp(x, y, draggedStone) {
    if (draggedStone) {
        // Calculate throw velocity based on drag speed
        const throwSpeed = this._calculateThrowVelocity(draggedStone);

        // Mass-based resistance: heavy stones harder to throw
        const massResistance = 1.0 / Math.sqrt(draggedStone.mass);
        draggedStone.velocity.x = throwSpeed.x * massResistance;
        draggedStone.velocity.y = throwSpeed.y * massResistance;

        draggedStone.stopDrag();
    }
    this.updateGroups();
}

_calculateThrowVelocity(stone) {
    // Track last 3 positions to calculate velocity
    const recentPositions = stone._positionHistory || [];
    if (recentPositions.length < 2) return { x: 0, y: 0 };

    const latest = recentPositions[recentPositions.length - 1];
    const previous = recentPositions[recentPositions.length - 2];
    const dt = latest.time - previous.time;

    return {
        x: (latest.x - previous.x) / dt,
        y: (latest.y - previous.y) / dt
    };
}
```

**Visual Feedback:**
- Velocity trail (faint motion blur)
- Impact effects when stones collide
- Sound: satisfying "thunk" scaled by momentum

---

#### 3. Stone Combination (Merge Mechanic)
**Concept:** Colliding stones can merge into larger bodies

**Rules:**
- Stones moving fast enough combine on collision
- Combined mass = sum of masses
- Combined momentum conserved
- Visual: smooth merge animation

**Implementation:**
```javascript
_checkForMerge(stone1, stone2) {
    const collision = PhysicsEngine.checkCollision(stone1, stone2);

    if (collision.colliding) {
        const relativeSpeed = this._getRelativeSpeed(stone1, stone2);
        const mergeThreshold = 50; // Minimum speed to merge

        if (relativeSpeed > mergeThreshold && !stone1.isLocked && !stone2.isLocked) {
            return this._mergeStones(stone1, stone2);
        }
    }
    return null;
}

_mergeStones(stone1, stone2) {
    // Create new stone at center of mass
    const com = PhysicsEngine.centerOfMass([stone1, stone2]);
    const totalMass = stone1.mass + stone2.mass;

    // Conserve momentum
    const newVelocity = {
        x: (stone1.velocity.x * stone1.mass + stone2.velocity.x * stone2.mass) / totalMass,
        y: (stone1.velocity.y * stone1.mass + stone2.velocity.y * stone2.mass) / totalMass
    };

    // Calculate new radius based on area (volume in 2D)
    const newRadius = Math.sqrt(stone1.radius * stone1.radius + stone2.radius * stone2.radius);

    const mergedStone = new Stone(com.x, com.y, this.nextStoneId++, {
        mass: totalMass,
        radius: newRadius,
        color: this._blendColors(stone1.color, stone2.color, stone1.mass, stone2.mass)
    });

    mergedStone.velocity = newVelocity;

    // Remove old stones, add new
    this.removeStone(stone1);
    this.removeStone(stone2);
    this.addStone(mergedStone);

    // Visual effect: merge flash
    this._showMergeEffect(com.x, com.y);

    return mergedStone;
}
```

---

#### 4. Group Locking System
**Concept:** Lock groups together to move as rigid bodies

**UI:**
- Tap a group → shows lock icon
- Locked groups move together, resist separation
- Can unlock to allow splitting

**Implementation:**
```javascript
class LockedGroup {
    constructor(stones) {
        this.stones = stones;
        this.locked = true;
        this.centerOfMass = PhysicsEngine.centerOfMass(stones);
        this.rigidOffsets = stones.map(s => ({
            dx: s.x - this.centerOfMass.x,
            dy: s.y - this.centerOfMass.y
        }));
    }

    update(deltaTime) {
        // Update center of mass
        this.centerOfMass = PhysicsEngine.centerOfMass(this.stones);

        // Maintain rigid offsets (springs to keep shape)
        this.stones.forEach((stone, i) => {
            const targetX = this.centerOfMass.x + this.rigidOffsets[i].dx;
            const targetY = this.centerOfMass.y + this.rigidOffsets[i].dy;

            // Spring force toward target position
            const kSpring = 0.5;
            stone.velocity.x += (targetX - stone.x) * kSpring;
            stone.velocity.y += (targetY - stone.y) * kSpring;
        });
    }

    applyForce(fx, fy) {
        // Distribute force across all stones
        this.stones.forEach(stone => {
            stone.velocity.x += fx / this.centerOfMass.totalMass;
            stone.velocity.y += fy / this.centerOfMass.totalMass;
        });
    }
}
```

---

#### 5. Simulation Control
**UI Element:** "▶ Start Simulation" button

**States:**
- **Paused:** Stones can be dragged freely, no physics
- **Running:** Gravity, momentum, collisions active
- **Reset:** Return all stones to initial positions

**Implementation:**
```javascript
class FreeExploreMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.simulationState = 'paused'; // 'paused', 'running', 'resetting'
        this.simulationTime = 0;
    }

    update(deltaTime) {
        if (this.simulationState === 'running') {
            this.simulationTime += deltaTime;

            // Apply gravity between all stone pairs
            for (let i = 0; i < this.stones.length; i++) {
                for (let j = i + 1; j < this.stones.length; j++) {
                    PhysicsEngine.applyGravitationalForce(
                        this.stones[i],
                        this.stones[j],
                        deltaTime
                    );
                }
            }

            // Update stone positions
            this.stones.forEach(stone => {
                stone.x += stone.velocity.x * deltaTime;
                stone.y += stone.velocity.y * deltaTime;

                // Damping (air resistance)
                stone.velocity.x *= 0.99;
                stone.velocity.y *= 0.99;

                // Boundary: wrap around screen (like asteroids)
                const dims = this.renderer.getDimensions();
                if (stone.x < -stone.radius) stone.x = dims.width + stone.radius;
                if (stone.x > dims.width + stone.radius) stone.x = -stone.radius;
                if (stone.y < -stone.radius) stone.y = dims.height + stone.radius;
                if (stone.y > dims.height + stone.radius) stone.y = -stone.radius;
            });

            // Check for collisions and merges
            this._processCollisions();
        }

        super.update(deltaTime);
    }

    toggleSimulation() {
        if (this.simulationState === 'paused') {
            this.simulationState = 'running';
            this.simulationTime = 0;
        } else {
            this.simulationState = 'paused';
            // Zero out velocities
            this.stones.forEach(s => {
                s.velocity.x = 0;
                s.velocity.y = 0;
            });
        }
    }
}
```

---

#### 6. Achievement System (Non-Intrusive)
**Goal:** Create challenges for quick grouping/ungrouping without pressure

**Discovery-Based Achievements:**
- 🌟 **Orbit Master:** Create a stable orbit (one stone circles another)
- 🌟 **Galaxy Builder:** Merge 5+ stones into one large body
- 🌟 **Quick Sort:** Separate a cluster into 3 groups in under 5 seconds
- 🌟 **Gravity Artist:** Create a symmetrical configuration (auto-detected)
- 🌟 **Collision Course:** Make two stones collide at high speed

**Visual Feedback:**
- Subtle badge appears (fades after 2 seconds)
- No score tracking, just discovery moments
- Child-friendly icons and language

**Implementation:**
```javascript
class AchievementTracker {
    constructor() {
        this.discovered = new Set();
        this.activeChecks = []; // Functions to check each frame
    }

    check(id, condition, message, icon) {
        if (!this.discovered.has(id) && condition()) {
            this.discovered.add(id);
            this._showDiscovery(message, icon);
        }
    }

    _showDiscovery(message, icon) {
        // Show subtle floating badge
        // Example: "🌟 Orbit Master"
        // Fades after 2 seconds
    }
}
```

---

### UI Layout (Gravity Mode)

```
┌─────────────────────────────────────────┐
│  Mode: Free Explore (Gravity)           │
│                     [⏸ Pause] [↻ Reset] │
├─────────────────────────────────────────┤
│                                         │
│        [Stones with gravity fields]    │
│                                         │
│         • Large stone (strong pull)     │
│                                         │
│    •  Small stones orbiting            │
│                                         │
│                                         │
│  [Lock Group]  (appears on group tap)   │
│                                         │
└─────────────────────────────────────────┘
      [Tap pool to create stones]
```

---

## ⚖️ Multi-Lever Balance (Multiplication Mode)

### Vision
Stacked balance beams create a visual representation of multiplication. Children discover that "2 threes" (2 stones of mass 3) equals "4 ones + 2 ones" through balance.

### Core Mechanics

#### 1. Stacked Lever System
**Concept:** Multiple fulcrums stacked vertically, each with independent balance

**Structure:**
```
     Lever 3 (top)
        ⚖
         │
    Lever 2 (middle)
        ⚖
         │
    Lever 1 (bottom)
        ⚖
```

**Rules:**
- Each lever has left/right pans
- Top levers rest on lower levers
- A balanced lever adds its total mass to the pan below
- An unbalanced lever tilts the entire stack

---

#### 2. Multiplication Visualization
**Example Challenge:** Which is heavier?
- **Left stack:** 2 stones × mass 3 each = 6
- **Right stack:** 3 stones × mass 2 each = 6
- **Result:** Balanced! Child discovers 2×3 = 3×2

**Another Example:**
- **Left:** 4 stones × mass 2 = 8
- **Right:** 2 stones × mass 3 = 6
- **Result:** Left tilts down, child sees 4×2 > 2×3

---

#### 3. Implementation Architecture

```javascript
class MultiLeverBalanceMode extends ModeBase {
    constructor(canvas, ctx, renderer) {
        super(canvas, ctx, renderer);
        this.levers = []; // Array of LeverNode
    }

    init() {
        // Create 3-lever stack
        const dims = this.renderer.getDimensions();
        const centerX = dims.width / 2;

        // Bottom lever
        this.levers.push(new LeverNode(centerX, dims.height - 100, 0));

        // Middle lever (rests on bottom)
        this.levers.push(new LeverNode(centerX, dims.height - 200, 1));

        // Top lever (rests on middle)
        this.levers.push(new LeverNode(centerX, dims.height - 300, 2));

        // Connect levers (parent-child relationship)
        this.levers[1].parent = this.levers[0];
        this.levers[2].parent = this.levers[1];
    }

    update(deltaTime) {
        // Update from bottom to top (parent first)
        this.levers.forEach(lever => {
            lever.calculateBalance();
            lever.updatePosition(deltaTime);
        });
    }
}

class LeverNode {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.level = level;
        this.beam = { width: 200 - level * 30, angle: 0, targetAngle: 0 };
        this.leftPan = { stones: [] };
        this.rightPan = { stones: [] };
        this.parent = null; // Reference to lever below
    }

    calculateBalance() {
        const leftTotal = this._getTotalMass(this.leftPan.stones);
        const rightTotal = this._getTotalMass(this.rightPan.stones);

        // Calculate tilt
        const torqueDiff = rightTotal - leftTotal;
        const maxTorque = 6 * this.beam.width / 2;
        this.beam.targetAngle = (torqueDiff / maxTorque) * (Math.PI / 8);
    }

    _getTotalMass(stones) {
        return stones.reduce((sum, s) => sum + s.mass, 0);
    }

    getTotalWeight() {
        // Total weight this lever exerts on parent
        const leftTotal = this._getTotalMass(this.leftPan.stones);
        const rightTotal = this._getTotalMass(this.rightPan.stones);
        return leftTotal + rightTotal;
    }

    updatePosition(deltaTime) {
        // If attached to parent, adjust y based on parent's tilt
        if (this.parent) {
            const parentTilt = this.parent.beam.angle;
            this.y = this.parent.y - 100 + Math.sin(parentTilt) * 20;
        }

        // Smooth angle animation
        const diff = this.beam.targetAngle - this.beam.angle;
        this.beam.angle += diff * 0.1;
    }
}
```

---

#### 4. Challenge Examples

**Challenge 1: Equal Groups**
```
Goal: Make all levers balance
Setup:
  - Lever 1: [2, 2] vs [?, ?]
  - Lever 2: [3] vs [?, ?]
  - Lever 3: [1, 1, 1] vs [?]

Available stones: [1, 1, 2, 3]
```

**Challenge 2: Multiplication Race**
```
Goal: Which equals more?
Left stack:  [3×2 stones]
Right stack: [2×3 stones]
Prediction: Equal? Left? Right?
```

**Challenge 3: Distributive Property**
```
Goal: Make both stacks balance the same way
Left stack:  [3 × (2+1)]
Right stack: [(3×2) + (3×1)]
```

---

#### 5. UI Layout (Multi-Lever Mode)

```
┌──────────────────────────────────────┐
│  Lever 3    •─────⚖─────•            │
│               ╱       ╲              │
│  Lever 2   •─────⚖─────•            │
│              ╱        ╲              │
│  Lever 1  •─────⚖─────•             │
│            │          │              │
│          [2,2]      [?,?]            │
│                                      │
│  Available: [1] [1] [2] [3]         │
│                                      │
│  [🎯 Check Balance] [↻ New Level]   │
└──────────────────────────────────────┘
```

---

### Pedagogical Goals

**Gravity Mode:**
- ✓ Physics intuition (gravity, momentum, inertia)
- ✓ Mass relationships (bigger = stronger pull)
- ✓ Conservation laws (momentum, energy)
- ✓ Grouping flexibility (merge/split strategies)
- ✓ Emergent complexity (orbits, collisions)

**Multi-Lever Balance:**
- ✓ Multiplication as repeated addition
- ✓ Commutative property (2×3 = 3×2)
- ✓ Distributive property (visible through lever stacks)
- ✓ Comparison (>, <, =) with visual feedback
- ✓ Strategic thinking (optimal grouping)

---

## 🚀 Implementation Priority

### Phase A: Gravity Mode Foundation
1. **Basic gravity simulation** (stones attract each other)
2. **Throwing mechanics** (velocity on release)
3. **Collision detection** (reuse PhysicsEngine)
4. **Simulation toggle** (play/pause button)

### Phase B: Gravity Mode Enhancement
1. **Merge mechanic** (combine stones)
2. **Group locking** (rigid body groups)
3. **Visual polish** (gravity wells, trails)
4. **Achievement system** (subtle discoveries)

### Phase C: Multi-Lever Balance
1. **Stacked lever structure** (3 levers)
2. **Balance calculations** (lever-to-lever weight transfer)
3. **Stone placement UI** (drag to levers)
4. **Challenge library** (5-10 multiplication puzzles)

### Phase D: Polish
1. **Sound design** (satisfying collision sounds)
2. **Visual effects** (merge animations, gravity fields)
3. **Hint system integration** (contextual hints for both modes)
4. **Performance optimization** (handle many stones efficiently)

---

## 🎨 Visual Design Notes

**Gravity Mode:**
- Faint gravity field lines (like contour maps)
- Motion trails for velocity visualization
- Merge flash effect (expanding ring)
- Lock icon badge on grouped stones
- Subtle particle effects on high-speed collisions

**Multi-Lever Balance:**
- Color-coded levers (helps distinguish levels)
- Visual weight indicators (like old mechanical scales)
- Arrow hints showing weight direction
- Balance glow when all levers balanced
- Smooth lever connection lines (chains/rods)

---

## 💡 Open Questions for User

1. **Gravity Mode: Merge Behavior**
   - Should merges be automatic on collision or require user confirmation?
   - Can merged stones be split back apart?

2. **Gravity Mode: Boundary Behavior**
   - Wrap around (like asteroids) or bounce off edges?
   - Or pull toward center (like solar system)?

3. **Multi-Lever: Complexity**
   - Start with 2 levers or jump to 3?
   - Should levers be independently draggable or fixed positions?

4. **Achievement System**
   - Silent discoveries or brief celebratory animations?
   - Persistent badge collection or just in-moment feedback?

5. **Sound Design**
   - Essential for these modes or optional?
   - What level of audio feedback feels right?

---

**Next Step:** Prototype Gravity Mode Phase A to test core mechanics with actual user (6-year-old validation)
