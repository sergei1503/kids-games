# Zen Math - Multi-Mode Learning System

A contemplative, physics-based math learning application for young children. Built with vanilla JavaScript and HTML5 Canvas.

## Project Status

**Phase 1: Foundation Refactor - COMPLETE ✓**
- Modular architecture established
- Core systems extracted and organized
- FreeExplore mode refactored into new architecture
- Ready for additional mode development

## Architecture

### Directory Structure
```
zen-math-prototype/
├── index.html              # Entry point
├── style.css               # Zen aesthetic styling
├── app.js                  # Main controller + mode manager
│
├── core/                   # Shared systems
│   ├── Stone.js            # Enhanced stone with mass, physics, structure metadata
│   └── Renderer.js         # Canvas rendering utilities
│
├── modes/                  # Game modes (self-contained)
│   ├── ModeBase.js         # Abstract base class
│   └── FreeExploreMode.js  # Current prototype (refactored)
│
├── challenges/             # Challenge system (future)
│   ├── ChallengeEngine.js  # Challenge loader + validator
│   └── library.js          # Pre-designed challenges
│
└── ui/                     # UI components (future)
    ├── ModeSelector.js     # Mode switching UI
    └── HintSystem.js       # Non-intrusive hints
```

### Key Classes

#### Stone (core/Stone.js)
Enhanced stone class with:
- **Physics properties**: mass, dragCoefficient, velocity
- **Structure metadata**: structureId, structureIndex (for NumberStructures mode)
- **State management**: isDragging, isLocked (for challenges)
- **Rendering**: Organic shape with shadows, highlights, 3D effect

#### Renderer (core/Renderer.js)
Canvas rendering utilities:
- Background rendering with texture
- Group indicators
- Connecting lines (for structures)
- Text rendering
- Canvas management

#### ModeBase (modes/ModeBase.js)
Abstract base class for all modes with lifecycle:
- `init()` - Setup mode
- `update(deltaTime)` - Game loop
- `render()` - Draw frame
- `onPointerDown/Move/Up()` - Handle input
- `cleanup()` - Teardown

#### FreeExploreMode (modes/FreeExploreMode.js)
Current prototype refactored:
- Open-ended discovery
- Proximity-based grouping
- Circular stone arrangement
- Group visualization

#### ModeManager (app.js)
Central mode controller:
- Mode registration
- Mode switching with cleanup
- Event delegation to current mode
- Drag state management

## Current Features

✅ **Modular Architecture**
- Clean separation of concerns
- Easy to add new modes
- Shared core systems

✅ **Free Explore Mode**
- 8 stones in circular arrangement
- Drag and drop interaction
- Proximity-based grouping
- Smooth animations

✅ **Enhanced Stone System**
- Mass property (for future physics)
- Structure metadata (for future NumberStructures mode)
- Lock capability (for future challenges)
- Organic visual appearance

✅ **Rendering System**
- Zen aesthetic (earth tones, soft shadows)
- Subtle textures
- Group indicators
- Canvas utilities


## Running the Project

### Local Development
```bash
# Quick start (recommended)
cd /Users/sergeibenkovitch/repos/zen-math-prototype
./dev-server.sh

# Or manually
python3 -m http.server 3051
open http://localhost:3051
```

> **Port Configuration:** This project uses port **3051** (see `.project-config.json`)

### Testing Module Loads
```bash
# Visit test page
open http://localhost:3051/test.html
# Check browser console for module load results
```

## Next Steps

### Phase 2: Core Systems (Next)
**Goal:** Build reusable systems for all modes

- [ ] Implement `PhysicsEngine.js`
  - Mass-based drag resistance
  - Optional gravity simulation
  - Collision detection

- [ ] Implement `NumberStructure.js`
  - Pattern definitions (1-20)
  - Structure creation + recognition
  - Combination logic

- [ ] Test systems with demos

### Phase 3: Core Modes
**Goal:** Implement 3 main modes for validation

- [ ] `NumberStructuresMode.js` - Physical number representations
- [ ] `BalanceScaleMode.js` - Balance beam mechanics
- [ ] `StackBalanceMode.js` - Vertical stacking with physics

### Phase 4: Challenge System
**Goal:** AI-driven challenges

- [ ] Challenge engine
- [ ] Challenge library (10-15 beginner challenges)
- [ ] Hint system
- [ ] Progress tracking

### Phase 5: Polish
**Goal:** Enhanced UX and aesthetics

- [ ] Smooth mode transitions
- [ ] Sound design
- [ ] Extended challenge library
- [ ] Settings UI

## Design Philosophy

**Zen Contemplative Learning:**
- No scores, timers, or pressure
- Subtle feedback and encouragement
- Physical metaphors for abstract concepts
- Organic, calming aesthetics
- Child-led exploration

**Evidence-Based Design:**
- Validate with 6-year-old before scaling
- Measure engagement vs Toca Boca
- Parent feedback from Burning Man community
- Iterate based on observation

**Modular Expansion:**
- Easy to add new modes
- Self-contained learning experiences
- Shared physics and rendering
- Progressive difficulty

## Technical Notes

### Module System
- Uses vanilla JavaScript classes
- Browser-compatible module pattern
- No build step required
- Load order managed in HTML

### Performance
- RequestAnimationFrame for smooth 60fps
- Delta time for frame-independent physics
- Efficient canvas rendering
- Minimal DOM manipulation

### Touch Support
- Full touch event handling
- Prevents default behaviors
- iOS-optimized meta tags
- No text selection/callouts

## Browser Compatibility

- Modern browsers (Chrome, Safari, Firefox, Edge)
- iOS Safari (primary target - iPad)
- Android Chrome
- Desktop browsers for development

## Contributing

This is a validation-stage prototype. Core development focused on:
1. Testing core concept with child
2. Measuring engagement
3. Validating learning approach

Expansion decisions pending validation results.

## License

Private prototype - not yet open source.

---

**Built with:** Vanilla JavaScript, HTML5 Canvas, Love ❤️
**Target Age:** 6+ years old
**Inspiration:** Montessori materials, Zen gardens, Toca Boca
