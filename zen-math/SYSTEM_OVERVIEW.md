# Zen Math - System Overview

> A contemplative, physics-based math learning application for young children

**Status:** ✅ **Phase 5 Complete** - Multi-mode learning system fully implemented

## 🎯 What Is This?

Zen Math is an interactive learning experience that teaches mathematical concepts through physical metaphors and contemplative exploration. No scores, no timers, no pressure—just beautiful, tactile learning.

**Core Philosophy:**
- **Contemplative** over stimulating
- **Beautiful** over gamified
- **Understanding** over memorization
- **Natural discovery** over explicit instruction

**Target:** 6+ year olds (validated with actual 6-year-old testing)

---

## 📊 Current Implementation Status

### ✅ Core Systems (100%)
- **Stone.js** - Enhanced stone with mass, physics, structure metadata
- **Renderer.js** - Canvas rendering utilities (backgrounds, groups, text)
- **PhysicsEngine.js** - Mass drag, gravity, collision, balance calculations
- **NumberStructure.js** - Pattern definitions and recognition (1-20)
- **ModeBase.js** - Abstract base class for all modes

### ✅ Game Modes (4/4 Complete)

| Mode | Status | Description | Key Features |
|------|--------|-------------|--------------|
| **Free Explore** | ✅ Complete | Open-ended discovery | Stone creation pool, varied masses, grouping detection |
| **Balance Scale** | ✅ Complete | Equality & weight relationships | Tilt physics, guess mode, tap-to-inspect masses |
| **Number Structures** | ✅ Complete | Physical number representations | 1-20 patterns, combination detection, structure recognition |
| **Stack Balance** | ✅ Complete | Vertical stacking with gravity | Real physics simulation, stability checks, collapse mechanics |

### ✅ Challenge System (100%)
- **ChallengeEngine.js** - Challenge loader, validator, progression
- **library.js** - Pre-designed challenges (15+ challenges)
- **HintSystem.js** - Non-intrusive contextual hints

### ✅ UI Components (100%)
- **ModeSelector.js** - Mode switching interface
- **HintSystem.js** - Gentle guidance system

---

## 🏗️ Architecture

```
zen-math-prototype/
├── core/                   # Shared systems (Stone, Physics, Renderer, NumberStructure)
├── modes/                  # Self-contained learning modes
│   ├── ModeBase.js         # Abstract base class
│   ├── FreeExploreMode.js
│   ├── BalanceScaleMode.js
│   ├── NumberStructuresMode.js
│   └── StackBalanceMode.js
├── challenges/             # Challenge system
│   ├── ChallengeEngine.js
│   └── library.js
├── ui/                     # UI components
│   ├── ModeSelector.js
│   └── HintSystem.js
├── app.js                  # Main controller + mode manager
├── index.html              # Entry point
└── style.css               # Zen aesthetic styling
```

### Key Design Patterns

**Mode System:**
- Each mode is self-contained, inheriting from `ModeBase`
- Lifecycle: `init()` → `update(deltaTime)` → `render()` → `cleanup()`
- Clean mode switching with state preservation
- Event delegation pattern for input handling

**Physics System:**
- Utility-based (not a simulation loop)
- Modes call physics methods as needed
- Mass-based drag, gravity, collision resolution, balance calculations
- Stable stack checking, beam tilt calculations

**Stone System:**
- Organic shapes (not perfect circles)
- Mass-based properties (size, color, drag feel)
- Structure metadata for patterns
- Lock capability for challenges

---

## 🎮 Mode Deep Dive

### 1. Free Explore Mode
**Goal:** Open-ended discovery of grouping, counting, part-whole relationships

**Features:**
- Stone creation pool (tap bottom area to create new stones)
- Varied stone masses (0.5 to 3.0) with visual differentiation
- Mass-based drag feel (heavy stones lag, light stones respond instantly)
- Proximity-based grouping detection (≤80px)
- Visual group indicators

**Pedagogical Focus:**
- Subitizing (instant recognition of small quantities)
- Part-whole relationships
- Conservation of quantity
- Flexible grouping strategies

---

### 2. Balance Scale Mode
**Goal:** Understand equality, weight relationships, and early algebra

**Features:**
- Fulcrum-based balance beam with realistic tilt physics
- Two pans for comparing weights
- Tap-to-inspect: tap a stone to see its mass (2-second display)
- Guess mode: predict which side is heavier before seeing totals
- Difficulty progression (Easy → Medium → Hard)
- Balance glow when perfectly balanced

**Pedagogical Focus:**
- Equality (=) as balance
- Weight comparison
- Early algebraic thinking (variable relationships)
- Prediction and verification

**Interaction:**
- Drag stones from tray to pans
- Beam tilts in real-time based on total mass × distance
- Visual feedback: balanced = glowing fulcrum, unbalanced = tilt angle

---

### 3. Number Structures Mode
**Goal:** Build physical understanding of numbers 1-20 through structured patterns

**Features:**
- Standard patterns for numbers 1-20 (dice patterns, arrays, circles)
- Structure library with visual fingerprints
- Combination detection (e.g., "This is 5 + 3 = 8")
- Pattern recognition across different stone arrangements
- Visual structure indicators

**Pedagogical Focus:**
- Subitizing structured patterns
- Number bonds (part-whole relationships)
- Multiple representations of same quantity
- Pattern recognition and decomposition

**Interaction:**
- Drag stones to form recognized patterns
- System highlights matching structures
- Combine multiple structures to discover number bonds

---

### 4. Stack Balance Mode
**Goal:** Understand stability, center of mass, and vertical composition

**Features:**
- Real gravity physics (stones fall when released)
- Collision detection and resolution
- Stability checker (stack falls if center of mass too far from base)
- Visual tilt indicator showing lean direction
- Ground platform and screen boundaries
- Vertical number composition through stacking

**Pedagogical Focus:**
- Spatial reasoning
- Balance and stability
- Center of mass (intuitive physics)
- Vertical addition (stacking = adding)

**Interaction:**
- Drag stones above each other to stack
- Release to let gravity take over
- Stack carefully to avoid collapse
- Observe physics-based feedback

---

## 🧠 Physics Engine Details

The `PhysicsEngine` class provides utility methods for physics calculations:

### Mass-Based Drag
```javascript
PhysicsEngine.applyMassDrag(currentX, currentY, targetX, targetY, mass)
```
Heavier stones move slower when dragged. Ease factor inversely proportional to mass.

### Gravity Simulation
```javascript
PhysicsEngine.applyGravity(velocityX, velocityY, deltaTime, gravity = 980)
```
Downward acceleration at 980 px/s² (approximating Earth gravity).

### Collision Detection & Resolution
```javascript
PhysicsEngine.checkCollision(stone1, stone2)
PhysicsEngine.resolveCollision(stone1, stone2)
```
Circle-circle collision with elastic velocity exchange. Lighter stones pushed more.

### Balance Calculations
```javascript
PhysicsEngine.calculateBeamTilt(leftStones, rightStones, fulcrumX)
```
Torque-based tilt angle for balance beam. Returns angle in radians.

### Stability Checking
```javascript
PhysicsEngine.isStackStable(stones, baseWidth, tolerance = 0.3)
```
Checks if vertical stack's center of mass stays within tolerance × baseWidth.

---

## 🎨 Visual Design Language

**Color Palette:**
- **Background:** Soft sand gradient (#e8dcc4 → #d4c8b0)
- **Stones:** Earth tones (#8b7d6b, #9a8c7a, #7a6f5d, #6b6152, #a39482)
- **Accents:** Subtle highlights and shadows for depth
- **Feedback:** Soft glows, gentle animations (no harsh colors)

**Interaction Feel:**
- Smooth easing (ease-in-out)
- Organic shapes (not geometric perfection)
- Mass-based physics (heavy stones feel heavy)
- Minimal UI (no clutter, hidden until needed)

**Typography:**
- System fonts (-apple-system, BlinkMacSystemFont)
- Large, readable sizes for children
- Subtle, low-contrast text (not distracting)

---

## 🚀 Running the Project

### Local Development
```bash
cd /Users/sergeibenkovitch/repos/zen-math-prototype
./dev-server.sh
# Opens http://localhost:3051
```

### Manual Start
```bash
python3 -m http.server 3051
open http://localhost:3051
```

**Port Configuration:** Uses port **3051** (configured in `.project-config.json`)

### Testing
```bash
# Visit test page to verify module loads
open http://localhost:3051/test.html
```

---

## 📱 Platform Support

**Primary Target:** iPad (touch-optimized)

**Supported:**
- ✅ iOS Safari (iPad, iPhone)
- ✅ Chrome (desktop, Android)
- ✅ Safari (macOS)
- ✅ Firefox (desktop)
- ✅ Edge (desktop)

**Optimizations:**
- Touch-first interaction design
- Pointer events (unified touch/mouse handling)
- RequestAnimationFrame for 60fps
- iOS meta tags (no zoom, no callouts)

---

## 🧪 Validation Results

**Testing Method:**
- Actual 6-year-old (daughter) on iPad
- No instructions given (discoverability test)
- Competing against Toca Boca (engagement benchmark)

**Results:**
- ✅ Immediate engagement (<30 seconds to understand)
- ✅ Sustained play (>15 minutes)
- ✅ Asks to play again (genuine interest)
- ✅ Observable learning (intentional grouping, pattern exploration)
- ✅ Competitive with Toca Boca (voluntarily chooses Zen Math)

**Parent Feedback:**
- "She doesn't realize she's learning"
- "The physics feel satisfying"
- "Beautiful—I want to play too"

---

## 🎯 Future Expansion Ideas

### Potential New Modes
- **Gravity Mode** (Free Explore enhancement) - Physics simulation with gravitational pull
- **Multi-Lever Balance** - Stacked levers for multiplication concepts
- **Pattern Builder** - Free-form pattern creation and sharing
- **Measurement Mode** - Length, area, volume comparisons

### Potential Features
- **Achievements/Badges** - Non-intrusive discovery milestones
- **Parent Dashboard** - Progress insights (not visible to child)
- **Sound Design** - Subtle, satisfying audio feedback
- **Multiplayer** - Collaborative problem-solving (same device)

---

## 🛠️ Technical Stack

**Core:**
- Vanilla JavaScript (ES6 classes)
- HTML5 Canvas
- CSS3 (animations, gradients)

**No Dependencies:**
- No frameworks (React, Vue, etc.)
- No build step required
- No npm packages
- Pure browser APIs

**Why Vanilla?**
- Simplicity (easy to understand and modify)
- Performance (no framework overhead)
- Maintainability (no dependency hell)
- Portability (runs anywhere)

---

## 📄 Project Files Reference

### Documentation
- `SYSTEM_OVERVIEW.md` (this file) - Complete system documentation
- `README.md` - Quick start and project intro
- `QUICKSTART.md` - Deployment and testing guide
- `TESTING.md` - Observation checklist for validation
- `SUMMARY.md` - Original prototype summary
- `PHASE1_SUMMARY.md` - Phase 1 completion notes
- `IMPLEMENTATION_LOG.md` - Development history

### Code Structure
- `app.js` - Main controller, mode manager, event loop
- `index.html` - Entry point, module loading
- `style.css` - Zen aesthetic styling
- `core/*.js` - Shared systems (Stone, Physics, Renderer, NumberStructure)
- `modes/*.js` - Game modes (FreeExplore, Balance, NumberStructures, StackBalance)
- `challenges/*.js` - Challenge system (Engine, Library)
- `ui/*.js` - UI components (ModeSelector, HintSystem)

---

## 🌟 Design Principles

### 1. **Child-Led Discovery**
No tutorials, no hand-holding. Children explore and discover naturally.

### 2. **Physical Metaphors**
Abstract math concepts grounded in tactile, physical experiences.

### 3. **Contemplative Learning**
Calm, beautiful environments that invite deep engagement, not dopamine hits.

### 4. **No Pressure**
No scores, no timers, no failures. Only exploration and discovery.

### 5. **Evidence-Based**
Every feature validated with actual children, not assumed pedagogy.

### 6. **Modular Expansion**
Easy to add new modes without breaking existing ones. Clean architecture.

---

## 🎓 Pedagogical Foundations

**Constructivism:** Children build understanding through active exploration.

**Embodied Cognition:** Physical interactions create mental models.

**Montessori Principles:** Self-directed, hands-on learning with beautiful materials.

**Subitizing Research:** Instant recognition of quantities builds number sense.

**CPA Approach:** Concrete (stones) → Pictorial (patterns) → Abstract (numbers).

---

## 💬 Questions?

For development questions or feedback:
- Check `QUICKSTART.md` for deployment instructions
- See `TESTING.md` for validation methodology
- Review code comments for implementation details

---

**Built with:** Vanilla JavaScript, HTML5 Canvas, Love ❤️
**Target Age:** 6+ years old
**Inspiration:** Montessori materials, Zen gardens, Toca Boca
**Status:** Phase 5 Complete ✅
