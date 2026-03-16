# Zen Math - Quick Start Guide

## Running the App

**Quick Start (Recommended):**
```bash
cd /Users/sergeibenkovitch/repos/zen-math-prototype
./dev-server.sh
# Opens on http://localhost:3051
```

**Manual Start:**
```bash
cd /Users/sergeibenkovitch/repos/zen-math-prototype
python3 -m http.server 3051
open http://localhost:3051
```

> **Note:** This project uses port **3051** (configured in `.project-config.json`)

## Project Structure

```
zen-math-prototype/
├── core/           # Shared systems (Stone, Renderer)
├── modes/          # Game modes (ModeBase, FreeExploreMode)
├── challenges/     # Challenge system (future)
├── ui/             # UI components (future)
├── index.html      # Main entry point
├── app.js          # ModeManager + orchestration
└── style.css       # Zen aesthetic
```

## Adding a New Mode

1. Create `modes/YourMode.js`:
```javascript
class YourMode extends ModeBase {
    init() {
        super.init();
        // Setup your mode
    }

    update(deltaTime) {
        super.update(deltaTime);
        // Game loop logic
    }

    render() {
        this.renderer.drawBackground();
        // Draw your mode
        this.stones.forEach(stone => stone.draw(this.ctx));
    }

    onPointerDown(x, y) {
        // Handle pointer down
        return this.findStoneAtPosition(x, y);
    }

    static getMetadata() {
        return {
            id: 'your-mode',
            name: 'Your Mode',
            icon: '🎯',
            description: 'Your mode description'
        };
    }
}
```

2. Add script tag to `index.html`:
```html
<script src="modes/YourMode.js"></script>
```

3. Register mode in `app.js`:
```javascript
modeManager.registerMode(YourMode);
```

4. Switch to your mode:
```javascript
modeManager.switchMode('your-mode');
```

## Key Classes

### Stone (core/Stone.js)
```javascript
// Create a stone
const stone = new Stone(x, y, id, {
    radius: 35,
    color: '#8b7d6b',
    mass: 1.0,
    isLocked: false
});

// Draw it
stone.draw(ctx);

// Update it
stone.update(deltaTime);

// Check if point is inside
if (stone.contains(x, y)) { ... }

// Get distance to another stone
const dist = stone.distanceTo(otherStone);
```

### Renderer (core/Renderer.js)
```javascript
// Draw background
renderer.drawBackground();

// Draw group indicator
renderer.drawGroupIndicator(stones);

// Draw connecting lines
renderer.drawConnectingLines(stones);

// Draw text
renderer.drawText('Hello', x, y, { fontSize: 20 });

// Get canvas center
const { x, y } = renderer.getCenter();
```

### ModeBase (modes/ModeBase.js)
```javascript
// Find stone at position
const stone = this.findStoneAtPosition(x, y);

// Move stone to top
this.moveStoneToTop(stone);

// Add/remove stones
this.addStone(stone);
this.removeStone(stone);
```

## Testing

### Manual Test
```bash
open http://localhost:3051
# Drag stones around
# Verify grouping works
```

### Module Load Test
```bash
open http://localhost:3051/test.html
# Check console for module load results
```

### Console Testing
```javascript
// Check current mode
modeManager.getCurrentMode()

// Check stones
modeManager.getCurrentMode().stones

// Switch modes (when available)
modeManager.switchMode('mode-id')
```

## Development Workflow

1. **Start server:** `./dev-server.sh` (or `python3 -m http.server 3051`)
2. **Open browser:** `http://localhost:3051`
3. **Make changes** to JS files
4. **Refresh browser** (no build step!)
5. **Check console** for errors

## Next Phase: Core Systems

Ready to implement:

### PhysicsEngine.js
```javascript
class PhysicsEngine {
    applyGravity(stone, deltaTime) { ... }
    checkCollision(stone1, stone2) { ... }
    applyDrag(stone, coefficient) { ... }
}
```

### NumberStructure.js
```javascript
class NumberStructure {
    constructor(value) { ... }
    createStones(centerX, centerY) { ... }
    isIntact() { ... }
    merge(other) { ... }
}
```

## Common Tasks

### Change stone count
Edit `FreeExploreMode.js`, line ~28:
```javascript
const initialCount = 8; // Change this number
```

### Change grouping threshold
Edit `FreeExploreMode.js`, line ~4:
```javascript
const GROUP_THRESHOLD = 80; // Change distance
```

### Change colors
Edit `core/Stone.js`, lines 18-23:
```javascript
const COLORS = {
    stone: ['#8b7d6b', ...], // Add more colors
    ...
};
```

### Add mode-specific styling
Add to `style.css`:
```css
.mode-specific-class {
    /* Your styles */
}
```

## Debugging

### Enable console logging
Add to mode's update():
```javascript
update(deltaTime) {
    console.log('Mode active:', this.stones.length);
    super.update(deltaTime);
}
```

### Check rendering
Add to mode's render():
```javascript
render() {
    console.log('Rendering frame');
    this.renderer.drawBackground();
    // ...
}
```

### Inspect stones
In console:
```javascript
const stones = modeManager.getCurrentMode().stones;
stones.forEach(s => console.log(s.x, s.y, s.mass));
```

## Performance Tips

- Keep update() logic minimal
- Batch similar draw operations
- Use requestAnimationFrame (already set up)
- Avoid creating objects in render()
- Cache calculations when possible

## Documentation

- **README.md** - Full architecture docs
- **IMPLEMENTATION_LOG.md** - Phase tracking
- **PHASE1_SUMMARY.md** - Phase 1 details
- **PHASE1_VERIFICATION.md** - Testing checklist

## Getting Help

Check these files for detailed information:
- Architecture questions → README.md
- Implementation questions → IMPLEMENTATION_LOG.md
- Testing questions → PHASE1_VERIFICATION.md
- Phase status → PHASE1_SUMMARY.md

## Quick Reference

| Task | Command |
|------|---------|
| Start server | `./dev-server.sh` |
| Open app | `open http://localhost:3051` |
| Test modules | `open http://localhost:3051/test.html` |
| Check mode | `modeManager.getCurrentMode()` |
| List modes | `modeManager.modes` |

## Current Status

- ✅ Phase 1: Foundation Refactor - COMPLETE
- ⏳ Phase 2: Core Systems - READY TO START
- 📋 Phase 3: Core Modes - PLANNED
- 📋 Phase 4: Challenge System - PLANNED
- 📋 Phase 5: Polish - PLANNED

---

**Happy Coding! 🎨🪨**
