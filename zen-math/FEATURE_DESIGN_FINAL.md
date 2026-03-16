# Feature Design - Final Specification

## 🌍 Gravity Mode - REFINED

### Core Concept
**Two Stone Types:**
1. **Black Hole Stones** 🕳️ - Suck in nearby stones, merge, move slower
2. **Regular Stones** 🪨 - Break on impact, bounce, can be numbered

### Central Black Hole
- **Gravity well in center** of canvas
- Pulls all stones toward center (escapable with momentum)
- Creates interesting orbital dynamics

### Stone Breaking Mechanic
**Numbered stones split when hit hard enough:**
- Stone labeled "5" breaks into 5 individual stones (mass 1 each)
- Stone labeled "2" breaks into 2 stones
- Visual: explosion effect, conservation of total mass
- Pedagogical: Physical decomposition of numbers!

**Breaking threshold:**
- High-speed collision (relative velocity > threshold)
- Impact from another stone
- Visual/audio feedback on break

### Black Hole Mechanics
**Properties:**
- Stronger gravitational pull (larger G constant)
- Absorbs stones on contact (merge)
- Grows larger with each absorption
- Moves slower due to mass
- Cannot be broken

**Visual:**
- Dark core with event horizon glow
- Accretion disk effect (stones spiraling in)
- Distortion field (gravity visualization)

### Implementation Priority
1. ✅ Central black hole with gravity
2. ✅ Regular stones with bounce physics
3. ✅ Black hole stone type (player-created)
4. ✅ Stone breaking mechanic
5. ✅ Play/Pause/Reset controls
6. ✅ Badge achievements

---

## ⚖️ Multi-Lever Balance - REFINED

### Draggable Fulcrums (Division Builder)
**Concept:** Fulcrums can slide along a horizontal range

**Mechanics:**
- Each lever has a draggable fulcrum (pivot point)
- Drag left → one side longer, other shorter
- Shows **division/ratio** visually
- Equal distances = fair division

**Example:**
```
Original (balanced at center):
  |─────⚖─────|
  Equal arms (1:1 ratio)

Drag fulcrum left:
  |──⚖────────|
  Shorter:Longer = 1:2 ratio
  (Need 2× weight on left to balance!)
```

**Pedagogical Value:**
- Intuitive understanding of division
- Ratio visualization
- Leverage concept (mechanical advantage)
- Multiplication/division relationship

### 3-Lever Stack
- Three fulcrums, each independently draggable
- Visual number line under each lever
- Shows ratio as you drag

### Implementation
- Fulcrum constraints (min/max positions)
- Torque calculation based on actual lever arm lengths
- Visual ratio indicator

---

## 🎯 Achievement System - FINAL

### Silent Badge Discoveries

**Gravity Mode Achievements:**
- 🌀 **Orbit Master** - Stone makes 3 complete orbits
- 🕳️ **Black Hole Creator** - Create first black hole stone
- 💥 **Number Breaker** - Break a numbered stone
- 🌌 **Galaxy Core** - Merge 5+ stones into one black hole
- 🎯 **Precision Shot** - Hit a specific target stone
- ⚡ **Escape Velocity** - Launch stone fast enough to escape center
- 🔢 **Prime Split** - Break stone into prime-sized pieces

**Multi-Lever Achievements:**
- ⚖️ **Perfect Balance** - Balance all 3 levers simultaneously
- 📊 **Ratio Master** - Create a 1:2:3 ratio across levers
- 🎲 **Multiplication Match** - Find equivalent multiplication (2×3 = 3×2)
- 🧮 **Division King** - Use fulcrum position to solve division
- 🏗️ **Pyramid Builder** - Stack weights in ascending order

**Display:**
- Small badge icon floats up from achievement location
- Fades after 2 seconds
- No score, no collection UI
- Just discovery moments

---

## 🚀 Implementation Plan

### Phase 1: Gravity Mode Core (Priority 1)
```javascript
// File: modes/FreeExploreMode.js (enhanced)

Features to add:
1. Central black hole with gravity field
2. Regular stone bounce physics
3. Throwing velocity calculation
4. Play/Pause/Reset buttons
5. Basic achievement detection
```

### Phase 2: Black Hole Stones (Priority 2)
```javascript
// Add to Stone.js

New stone type:
- type: 'blackhole' | 'regular'
- gravitationalRadius (influence area)
- canAbsorb boolean
- Visual rendering differences
```

### Phase 3: Stone Breaking (Priority 3)
```javascript
// Add to FreeExploreMode

Features:
- Impact detection
- Stone splitting logic
- Conservation of momentum
- Break animation effect
```

### Phase 4: Multi-Lever Balance (Priority 4)
```javascript
// File: modes/MultiLeverMode.js (new)

Features:
- 3-lever stack
- Draggable fulcrums
- Ratio visualization
- Challenge library
```

### Phase 5: Polish & Deploy (Priority 5)
```javascript
// Final touches

- Sound effects
- Visual effects polish
- Achievement badge animations
- Vercel deployment
```

---

## 📐 Technical Specifications

### Central Black Hole
```javascript
class CentralBlackHole {
    constructor(canvas) {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.mass = 50; // Massive!
        this.radius = 40;
        this.gravitationalStrength = 500;
    }

    applyGravityTo(stone, deltaTime) {
        const dx = this.x - stone.x;
        const dy = this.y - stone.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < 10) return; // Singularity protection

        const force = this.gravitationalStrength * stone.mass / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        stone.velocity.x += (fx / stone.mass) * deltaTime;
        stone.velocity.y += (fy / stone.mass) * deltaTime;
    }

    draw(ctx) {
        // Black core
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.5,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, 'rgba(100, 80, 150, 0.6)');
        gradient.addColorStop(1, 'rgba(100, 80, 150, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

### Stone Breaking
```javascript
breakStone(stone) {
    if (!stone.label || stone.type === 'blackhole') return;

    const numPieces = parseInt(stone.label);
    if (isNaN(numPieces) || numPieces < 2) return;

    const pieces = [];
    const pieceRadius = stone.radius / Math.sqrt(numPieces);

    // Create pieces in circular arrangement
    for (let i = 0; i < numPieces; i++) {
        const angle = (i / numPieces) * Math.PI * 2;
        const distance = stone.radius;
        const vx = Math.cos(angle) * 100; // Explosion velocity
        const vy = Math.sin(angle) * 100;

        const piece = new Stone(
            stone.x + Math.cos(angle) * distance,
            stone.y + Math.sin(angle) * distance,
            this.nextStoneId++,
            {
                radius: pieceRadius,
                mass: stone.mass / numPieces,
                type: 'regular',
                label: null // No label on pieces
            }
        );

        // Inherit parent velocity + explosion velocity
        piece.velocity.x = stone.velocity.x + vx;
        piece.velocity.y = stone.velocity.y + vy;

        pieces.push(piece);
    }

    // Remove original stone
    this.removeStone(stone);

    // Add pieces
    pieces.forEach(p => this.addStone(p));

    // Visual effect
    this._showBreakEffect(stone.x, stone.y, numPieces);

    // Achievement check
    this.achievements.check('number-breaker', () => true, 'Number Breaker', '💥');
}
```

### Draggable Fulcrum
```javascript
class Lever {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.fulcrumOffset = 0; // -width/2 to +width/2
        this.isDraggingFulcrum = false;
    }

    getFulcrumPosition() {
        return this.x + this.fulcrumOffset;
    }

    getLeftArmLength() {
        return this.width / 2 + this.fulcrumOffset;
    }

    getRightArmLength() {
        return this.width / 2 - this.fulcrumOffset;
    }

    calculateTorque(leftStones, rightStones) {
        const leftArm = this.getLeftArmLength();
        const rightArm = this.getRightArmLength();

        const leftTorque = leftStones.reduce((sum, s) => sum + s.mass, 0) * leftArm;
        const rightTorque = rightStones.reduce((sum, s) => sum + s.mass, 0) * rightArm;

        return rightTorque - leftTorque;
    }

    getRatio() {
        const left = this.getLeftArmLength();
        const right = this.getRightArmLength();
        // Return simplified ratio (e.g., "1:2")
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(Math.round(left), Math.round(right));
        return `${Math.round(left / divisor)}:${Math.round(right / divisor)}`;
    }
}
```

---

## 🎨 Visual Design Updates

### Gravity Mode
- **Central black hole:** Dark purple core with glowing accretion disk
- **Gravity field lines:** Faint curved lines showing pull
- **Velocity trails:** Motion blur on fast-moving stones
- **Break effect:** Radial particle burst
- **Badge:** Floats up with gentle fade

### Multi-Lever
- **Fulcrum handle:** Draggable triangle on lever
- **Ratio display:** Shows "1:2" under each lever
- **Number line:** Subtle tick marks under beam
- **Connection chains:** Visual links between levers

---

## 🚢 Vercel Deployment

### Setup Steps
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Initialize project
cd /Users/sergeibenkovitch/repos/zen-math-prototype
vercel init

# 3. Configure vercel.json
{
  "buildCommand": null,
  "outputDirectory": ".",
  "framework": null
}

# 4. Deploy
vercel --prod
```

### Configuration
- **Framework:** None (static site)
- **Build command:** None needed
- **Output directory:** `.` (root)
- **Environment:** Node.js (for serving static files)

---

## 📋 Task Checklist

### Gravity Mode
- [ ] Add central black hole rendering
- [ ] Implement gravitational pull from center
- [ ] Add velocity tracking for throwing
- [ ] Implement bounce physics on collisions
- [ ] Add Play/Pause/Reset buttons
- [ ] Create black hole stone type
- [ ] Implement stone merging (black holes)
- [ ] Add stone breaking mechanic
- [ ] Create badge achievement system
- [ ] Add achievement triggers

### Multi-Lever Balance
- [ ] Create MultiLeverMode.js
- [ ] Implement 3-lever stack
- [ ] Add draggable fulcrum system
- [ ] Calculate torque with variable fulcrum
- [ ] Add ratio visualization
- [ ] Create challenge library
- [ ] Add achievement triggers
- [ ] Integrate with mode selector

### Polish & Deploy
- [ ] Add sound effects (collision, break, merge)
- [ ] Polish visual effects
- [ ] Test on iPad
- [ ] Create vercel.json
- [ ] Deploy to Vercel
- [ ] Test deployed version

---

## 🎯 Success Metrics

**Validation with 6-year-old:**
- [ ] Discovers stone breaking naturally (<2 minutes)
- [ ] Engages with gravity physics (>5 minutes)
- [ ] Experiments with black hole creation
- [ ] Understands multi-lever balance visually
- [ ] Prefers new modes over original Free Explore

**Technical:**
- [ ] Maintains 60fps with 20+ stones
- [ ] Smooth deployment to Vercel
- [ ] Works on iPad Safari
- [ ] Touch gestures feel responsive

---

**Ready to build!** Starting with Gravity Mode core features.
