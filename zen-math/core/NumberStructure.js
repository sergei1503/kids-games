// NumberStructure - Spatial number patterns
// Numbers represented as physical stone arrangements.
// Patterns:
//   1-5:   Domino/dice patterns (universally recognizable)
//   6-10:  2-row rectangles
//   11-20: Base-10 composites (2x5 ten-block plus extras)

// Spacing between stone centers in a pattern (px)
var STRUCTURE_SPACING = 50;

// Canonical offset patterns for numbers 1-20.
// Each entry is an array of {x, y} offsets from the structure's center.
// Offsets are in multiples of STRUCTURE_SPACING, converted to pixels below.
var STRUCTURE_PATTERNS = (function () {
    var S = STRUCTURE_SPACING;
    var half = S / 2;   // 25
    var patterns = {};

    // --- Numbers 1-5: Dice / domino patterns ---

    // 1: Single center stone
    patterns[1] = [
        { x: 0, y: 0 }
    ];

    // 2: Vertical pair
    patterns[2] = [
        { x: 0, y: -half },
        { x: 0, y: half }
    ];

    // 3: Diagonal line (top-left to bottom-right)
    patterns[3] = [
        { x: -S, y: -S },
        { x: 0, y: 0 },
        { x: S, y: S }
    ];

    // 4: Square (2x2)
    patterns[4] = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: -half, y: half },
        { x: half, y: half }
    ];

    // 5: Dice five (4 corners + center)
    patterns[5] = [
        { x: -S, y: -S },
        { x: S, y: -S },
        { x: 0, y: 0 },
        { x: -S, y: S },
        { x: S, y: S }
    ];

    // --- Numbers 6-10: 2-row rectangles ---

    // 6: 2x3 (2 rows, 3 columns)
    patterns[6] = [
        { x: -S, y: -half }, { x: 0, y: -half }, { x: S, y: -half },
        { x: -S, y: half },  { x: 0, y: half },  { x: S, y: half }
    ];

    // 7: Top row 4, bottom row 3
    patterns[7] = [
        { x: -1.5 * S, y: -half }, { x: -0.5 * S, y: -half }, { x: 0.5 * S, y: -half }, { x: 1.5 * S, y: -half },
        { x: -S, y: half },         { x: 0, y: half },          { x: S, y: half }
    ];

    // 8: 2x4 (2 rows, 4 columns)
    patterns[8] = [
        { x: -1.5 * S, y: -half }, { x: -0.5 * S, y: -half }, { x: 0.5 * S, y: -half }, { x: 1.5 * S, y: -half },
        { x: -1.5 * S, y: half },  { x: -0.5 * S, y: half },  { x: 0.5 * S, y: half },  { x: 1.5 * S, y: half }
    ];

    // 9: 3x3 square grid
    patterns[9] = [
        { x: -S, y: -S }, { x: 0, y: -S }, { x: S, y: -S },
        { x: -S, y: 0 },  { x: 0, y: 0 },  { x: S, y: 0 },
        { x: -S, y: S },  { x: 0, y: S },  { x: S, y: S }
    ];

    // 10: 2x5 (2 rows, 5 columns) - This is the "ten block" base unit
    patterns[10] = [
        { x: -2 * S, y: -half }, { x: -S, y: -half }, { x: 0, y: -half }, { x: S, y: -half }, { x: 2 * S, y: -half },
        { x: -2 * S, y: half },  { x: -S, y: half },  { x: 0, y: half },  { x: S, y: half },  { x: 2 * S, y: half }
    ];

    // --- Numbers 11-20: Base-10 composites ---
    // Ten block (2x5) on top, extras arranged below using the smaller pattern.
    // The ten block is shifted up, extras are shifted down with a gap.

    var tenBlock = patterns[10];
    var tenBlockYOffset = -S;  // Shift the ten block up
    var extrasYOffset = S * 1.5; // Extras below with a gap

    for (var n = 11; n <= 20; n++) {
        var extras = n - 10;
        var extrasPattern = patterns[extras];

        var combined = [];

        // Add the ten-block shifted up
        for (var i = 0; i < tenBlock.length; i++) {
            combined.push({
                x: tenBlock[i].x,
                y: tenBlock[i].y + tenBlockYOffset
            });
        }

        // Add the extras shifted down
        for (var j = 0; j < extrasPattern.length; j++) {
            combined.push({
                x: extrasPattern[j].x,
                y: extrasPattern[j].y + extrasYOffset
            });
        }

        patterns[n] = combined;
    }

    return patterns;
})();


class NumberStructure {
    constructor(value) {
        this.value = value;
        this.pattern = NumberStructure.getPattern(value);
        this.stones = [];
        this.centerX = 0;
        this.centerY = 0;
    }

    // Get the canonical offset pattern for a number (1-20).
    // Returns an array of {x, y} pixel offsets from center, or empty array for unsupported values.
    static getPattern(value) {
        if (value >= 1 && value <= 20 && STRUCTURE_PATTERNS[value]) {
            // Return a copy so callers can't mutate the canonical patterns
            return STRUCTURE_PATTERNS[value].map(function (p) {
                return { x: p.x, y: p.y };
            });
        }
        return [];
    }

    // Create actual Stone instances positioned around (centerX, centerY).
    // Returns the array of created stones.
    createStones(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;

        var structureValue = this.value;
        this.stones = this.pattern.map(function (pos, i) {
            var stone = new Stone(centerX + pos.x, centerY + pos.y, 'struct-' + structureValue + '-' + i);
            stone.structureId = structureValue;
            stone.structureIndex = i;
            return stone;
        });

        return this.stones;
    }

    // Check whether the structure's stones are still arranged in their pattern.
    // Each stone's actual position is compared to its expected position.
    // Returns true if ALL stones are within `threshold` pixels of their expected spot.
    isIntact(threshold) {
        if (threshold === undefined) threshold = 50;

        if (this.stones.length !== this.pattern.length) return false;

        for (var i = 0; i < this.stones.length; i++) {
            var expectedX = this.centerX + this.pattern[i].x;
            var expectedY = this.centerY + this.pattern[i].y;
            var dx = this.stones[i].x - expectedX;
            var dy = this.stones[i].y - expectedY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > threshold) return false;
        }

        return true;
    }

    // Try to recognize if an arbitrary array of stones matches any known pattern (1-20).
    // Normalizes stone positions relative to their centroid, then compares against
    // each canonical pattern using a greedy nearest-neighbor match.
    // Returns the matching number value, or null if no match found.
    static recognizePattern(stones, threshold) {
        if (threshold === undefined) threshold = 50;

        if (!stones || stones.length === 0 || stones.length > 20) return null;

        // Compute centroid of the given stones
        var cx = 0, cy = 0;
        for (var i = 0; i < stones.length; i++) {
            cx += stones[i].x;
            cy += stones[i].y;
        }
        cx /= stones.length;
        cy /= stones.length;

        // Normalize stone positions relative to centroid
        var normalized = stones.map(function (s) {
            return { x: s.x - cx, y: s.y - cy };
        });

        // Try each pattern that has the same stone count
        for (var value = 1; value <= 20; value++) {
            var pattern = STRUCTURE_PATTERNS[value];
            if (!pattern || pattern.length !== stones.length) continue;

            // Compute centroid of the pattern
            var px = 0, py = 0;
            for (var j = 0; j < pattern.length; j++) {
                px += pattern[j].x;
                py += pattern[j].y;
            }
            px /= pattern.length;
            py /= pattern.length;

            // Normalize pattern offsets relative to pattern centroid
            var normPattern = pattern.map(function (p) {
                return { x: p.x - px, y: p.y - py };
            });

            // Greedy nearest-neighbor matching:
            // For each pattern point, find the closest unmatched stone point.
            var used = new Array(normalized.length);
            for (var k = 0; k < used.length; k++) used[k] = false;
            var allMatch = true;

            for (var pi = 0; pi < normPattern.length; pi++) {
                var bestDist = Infinity;
                var bestIdx = -1;

                for (var si = 0; si < normalized.length; si++) {
                    if (used[si]) continue;
                    var ddx = normalized[si].x - normPattern[pi].x;
                    var ddy = normalized[si].y - normPattern[pi].y;
                    var d = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = si;
                    }
                }

                if (bestIdx === -1 || bestDist > threshold) {
                    allMatch = false;
                    break;
                }

                used[bestIdx] = true;
            }

            if (allMatch) return value;
        }

        return null;
    }

    // Merge two structures to create a new one representing their sum.
    // Returns a new NumberStructure for the combined value, or null if value > 20.
    static merge(structA, structB) {
        var newValue = structA.value + structB.value;
        if (newValue > 20) return null;
        return new NumberStructure(newValue);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NumberStructure, STRUCTURE_PATTERNS, STRUCTURE_SPACING };
}
