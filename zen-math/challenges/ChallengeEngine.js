// ChallengeEngine - Manages challenge loading, goal validation, and progression
// Provides a lightweight overlay for hints and progress tracking

class ChallengeEngine {
    constructor(modeManager) {
        this.modeManager = modeManager;
        this.currentChallenge = null;
        this.completedChallenges = this.loadProgress();
        this.isActive = false;
        this.onChallengeComplete = null; // callback: (challenge) => void

        // UI animation state
        this.hintOpacity = 0;
        this.completionFlash = 0;
    }

    // Load a challenge by ID from the library
    loadChallenge(challengeId) {
        const challenge = CHALLENGE_LIBRARY.find(c => c.id === challengeId);
        if (!challenge) return false;

        this.currentChallenge = challenge;
        this.isActive = true;
        this.hintOpacity = 1.0;
        this.completionFlash = 0;

        // Switch to the mode this challenge requires
        this.modeManager.switchMode(challenge.mode);

        // If challenge has an initial configuration, apply it
        if (challenge.initialConfig) {
            const mode = this.modeManager.getCurrentMode();
            if (mode && typeof mode.initWithConfiguration === 'function') {
                mode.initWithConfiguration(challenge.initialConfig);
            }
        }

        return true;
    }

    // Check if current challenge goals are met
    // Called by modes after each interaction (pointer up, structure change, etc.)
    checkGoals() {
        if (!this.isActive || !this.currentChallenge) return false;

        const mode = this.modeManager.getCurrentMode();
        if (!mode) return false;

        const goals = this.currentChallenge.goals;

        // Every goal must be satisfied
        for (const goal of goals) {
            if (!this.evaluateGoal(goal, mode)) return false;
        }

        // All goals met
        this.completeChallenge();
        return true;
    }

    // Evaluate a single goal against the current mode state
    evaluateGoal(goal, mode) {
        switch (goal.type) {
            case 'group-count': {
                // Check if there are exactly N groups of stones
                // FreeExploreMode exposes mode.groups (array of StoneGroup)
                if (!mode.groups) return false;
                return mode.groups.length === goal.count;
            }

            case 'group-size': {
                // Check if at least one group has exactly N stones
                if (!mode.groups) return false;
                return mode.groups.some(g => g.stones.length === goal.size);
            }

            case 'equal-groups': {
                // Check if all groups have the same number of stones
                if (!mode.groups || mode.groups.length < 2) return false;
                const firstSize = mode.groups[0].stones.length;
                return mode.groups.every(g => g.stones.length === firstSize);
            }

            case 'scale-balanced': {
                // Check if balance scale is balanced within tolerance
                // BalanceScaleMode exposes mode.isBalanced
                if (typeof mode.isBalanced === 'boolean') {
                    return mode.isBalanced;
                }
                // Fallback: compare pan weights manually
                if (mode.leftPan && mode.rightPan) {
                    const leftWeight = mode.leftPan.stones.reduce((sum, s) => sum + (s.mass || 1), 0);
                    const rightWeight = mode.rightPan.stones.reduce((sum, s) => sum + (s.mass || 1), 0);
                    const total = leftWeight + rightWeight;
                    if (total === 0) return false;
                    const diff = Math.abs(leftWeight - rightWeight) / total;
                    return diff <= (goal.tolerance || 0.1);
                }
                return false;
            }

            case 'stack-height': {
                // Check if stack has at least N stones
                // StackBalanceMode exposes mode.stackHeight or mode.stackedStones
                if (typeof mode.stackHeight === 'number') {
                    return mode.stackHeight >= goal.minHeight;
                }
                if (mode.stackedStones) {
                    return mode.stackedStones.length >= goal.minHeight;
                }
                return false;
            }

            case 'structure-formed': {
                // Check if a number structure of the given value exists
                // NumberStructuresMode exposes mode.structures array
                if (!mode.structures) return false;
                return mode.structures.some(
                    s => s.value === goal.value && s.intact !== false
                );
            }

            case 'stone-count-per-side': {
                // Check exact stone counts on left and right pans
                if (!mode.leftPan || !mode.rightPan) return false;
                return (
                    mode.leftPan.stones.length === goal.left &&
                    mode.rightPan.stones.length === goal.right
                );
            }

            case 'all-stones-used': {
                // Check that no stones remain unused
                // Different modes expose unused stones differently
                if (mode.trayStones) {
                    return mode.trayStones.length === 0;
                }
                if (mode.availableStones) {
                    return mode.availableStones.length === 0;
                }
                // For structure mode: all stones should be in a structure
                if (mode.structures && mode.stones) {
                    const structuredCount = mode.structures.reduce(
                        (sum, s) => sum + (s.stones ? s.stones.length : 0), 0
                    );
                    return structuredCount === mode.stones.length;
                }
                return false;
            }

            case 'structure-count': {
                // Check if there are >= minCount intact structures
                if (!mode.structures) return false;
                const intactCount = mode.structures.filter(s => s.intact).length;
                return intactCount >= goal.minCount;
            }

            case 'structures-sum-to': {
                // Check if all intact structure values sum to targetSum
                if (!mode.structures) return false;
                const intactStructures = mode.structures.filter(s => s.intact);
                if (intactStructures.length === 0) return false;
                const sum = intactStructures.reduce((acc, s) => acc + s.value, 0);
                return sum === goal.targetSum;
            }

            case 'stack-centered': {
                // Check if center of mass is within tolerance of platform center
                if (!mode._calculateCenterOfMass || !mode.platform) return false;
                const com = mode._calculateCenterOfMass();
                if (com.totalMass === 0) return false;
                const offset = Math.abs(com.x - mode.platform.x);
                return offset <= (goal.tolerance || 30);
            }

            case 'stack-matching-neighbors': {
                // Every stacked stone touches a same-color neighbor
                if (!mode.stackedStones || mode.stackedStones.length < 2) return false;
                return mode.stackedStones.every(stone => {
                    return mode.stackedStones.some(other => {
                        if (other === stone) return false;
                        const dist = stone.distanceTo(other);
                        const touchDist = (stone.radius + other.radius) * 1.5;
                        return dist < touchDist && stone._baseColor === other._baseColor;
                    });
                });
            }

            case 'stack-all-warm': {
                // All stacked stones are from warm color set
                if (!mode.stackedStones || mode.stackedStones.length === 0) return false;
                const warmColors = ['#C75B5B', '#D4943A', '#C7A83B'];
                return mode.stackedStones.every(s =>
                    warmColors.includes(s._baseColor)
                );
            }

            default:
                return false;
        }
    }

    // Mark current challenge as complete and persist
    completeChallenge() {
        const id = this.currentChallenge.id;
        if (!this.completedChallenges.includes(id)) {
            this.completedChallenges.push(id);
            this.saveProgress();
        }

        this.isActive = false;
        this.completionFlash = 1.0;

        if (this.onChallengeComplete) {
            this.onChallengeComplete(this.currentChallenge);
        }
    }

    // Get next uncompleted challenge in library order
    getNextChallenge() {
        return CHALLENGE_LIBRARY.find(c => !this.completedChallenges.includes(c.id));
    }

    // Get all challenges for a specific mode
    getChallengesForMode(modeId) {
        return CHALLENGE_LIBRARY.filter(c => c.mode === modeId);
    }

    // Check if a specific challenge is completed
    isChallengeCompleted(challengeId) {
        return this.completedChallenges.includes(challengeId);
    }

    // Get overall completion statistics
    getProgress() {
        return {
            completed: this.completedChallenges.length,
            total: CHALLENGE_LIBRARY.length,
            percentage: Math.round(
                (this.completedChallenges.length / CHALLENGE_LIBRARY.length) * 100
            )
        };
    }

    // --- localStorage persistence ---

    saveProgress() {
        try {
            localStorage.setItem(
                'zen-math-progress',
                JSON.stringify(this.completedChallenges)
            );
        } catch (e) {
            // Silent fail - localStorage may be unavailable
        }
    }

    loadProgress() {
        try {
            return JSON.parse(localStorage.getItem('zen-math-progress')) || [];
        } catch (e) {
            return [];
        }
    }

    resetProgress() {
        this.completedChallenges = [];
        this.saveProgress();
    }

    // --- Rendering: challenge overlay ---

    render(ctx, canvas) {
        if (!this.currentChallenge) return;

        // Draw completion flash (brief white overlay that fades)
        if (this.completionFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.completionFlash * 0.3})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            this.completionFlash = Math.max(0, this.completionFlash - 0.02);
        }

        // Only draw hint and progress when challenge is active
        if (!this.isActive) return;

        // Fade hint text slightly over time
        this.hintOpacity = Math.max(0.4, this.hintOpacity - 0.001);

        // Draw challenge hint text at top of screen
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Title
        ctx.font = '18px Georgia, serif';
        ctx.fillStyle = `rgba(107, 97, 82, ${this.hintOpacity})`;
        ctx.fillText(this.currentChallenge.title, canvas.width / 2, 20);

        // Hint (smaller, below title)
        ctx.font = '14px Georgia, serif';
        ctx.fillStyle = `rgba(139, 125, 107, ${this.hintOpacity * 0.8})`;
        ctx.fillText(this.currentChallenge.hint, canvas.width / 2, 46);

        ctx.restore();

        // Draw progress dots at bottom-right
        this.renderProgressDots(ctx, canvas);
    }

    // Small dots showing challenge progress within the current mode
    renderProgressDots(ctx, canvas) {
        if (!this.currentChallenge) return;

        const modeChallenges = this.getChallengesForMode(this.currentChallenge.mode);
        const dotRadius = 4;
        const dotSpacing = 14;
        const startX = canvas.width - (modeChallenges.length * dotSpacing) - 10;
        const y = canvas.height - 20;

        ctx.save();
        for (let i = 0; i < modeChallenges.length; i++) {
            const challenge = modeChallenges[i];
            const x = startX + i * dotSpacing;
            const isCompleted = this.completedChallenges.includes(challenge.id);
            const isCurrent = challenge.id === this.currentChallenge.id;

            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);

            if (isCompleted) {
                // Filled dot for completed
                ctx.fillStyle = 'rgba(139, 125, 107, 0.7)';
                ctx.fill();
            } else if (isCurrent) {
                // Ring for current
                ctx.strokeStyle = 'rgba(139, 125, 107, 0.7)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Faint dot for upcoming
                ctx.fillStyle = 'rgba(139, 125, 107, 0.2)';
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChallengeEngine };
}
