// HintSystem - Non-intrusive hint system for gentle guidance
// Renders directly on canvas after periods of inactivity

class HintSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentHint = null;
        this.currentModeId = null;
        this.isVisible = false;
        this.opacity = 0;
        this.targetOpacity = 0;
        this.inactivityTimer = 0;
        this.inactivityThreshold = 45; // seconds before showing hint
        this.fadeSpeed = 0.02;
        this.lastHintIndex = -1;

        // Mode-specific hints
        this.hints = {
            'free-explore': [
                'Try moving stones close together',
                'What happens when stones touch?',
                'Can you make groups of the same size?',
                'Try spreading all stones apart'
            ],
            'number-structures': [
                'Drag stones to form patterns',
                'What number do these stones make?',
                'Try pulling a group apart',
                'Move two groups together'
            ],
            'balance-scale': [
                'Drag stones onto the pans',
                'Can you make both sides equal?',
                'Bigger stones are heavier',
                'Try different combinations'
            ],
            'stack-balance': [
                'Drop a stone onto the platform',
                'Stack stones carefully',
                'Wider stones make better bases',
                'How high can you build?'
            ]
        };
    }

    // Called every frame
    update(deltaTime, hasInteraction) {
        if (hasInteraction) {
            this.inactivityTimer = 0;
            this.targetOpacity = 0;
            if (this.isVisible) {
                this.isVisible = false;
            }
        } else {
            this.inactivityTimer += deltaTime;
        }

        if (this.inactivityTimer >= this.inactivityThreshold && !this.isVisible) {
            this.showHint(this.currentModeId);
        }

        // Animate opacity toward target
        if (this.opacity < this.targetOpacity) {
            this.opacity = Math.min(this.opacity + this.fadeSpeed, this.targetOpacity);
        } else if (this.opacity > this.targetOpacity) {
            this.opacity = Math.max(this.opacity - this.fadeSpeed, this.targetOpacity);
            if (this.opacity <= 0.01) {
                this.opacity = 0;
                this.currentHint = null;
            }
        }
    }

    // Set the current mode for context-aware hints
    setMode(modeId) {
        this.currentModeId = modeId;
        this.reset();
    }

    // Pick and show a random hint for the current mode
    showHint(modeId) {
        const id = modeId || this.currentModeId;
        const modeHints = this.hints[id];
        if (!modeHints || modeHints.length === 0) return;

        // Pick a random hint, avoiding the last one shown
        let index;
        do {
            index = Math.floor(Math.random() * modeHints.length);
        } while (index === this.lastHintIndex && modeHints.length > 1);

        this.lastHintIndex = index;
        this.currentHint = modeHints[index];
        this.isVisible = true;
        this.targetOpacity = 0.7;
    }

    // Dismiss current hint
    dismiss() {
        this.targetOpacity = 0;
        this.isVisible = false;
        this.inactivityTimer = 0;
    }

    // Render hint on canvas
    render(ctx, canvasWidth, canvasHeight) {
        if (this.opacity <= 0.01 || !this.currentHint) return;

        ctx.save();

        const text = this.currentHint;
        const fontSize = Math.max(14, Math.min(18, canvasWidth * 0.035));
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

        // Measure text for background pill
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const paddingX = 24;
        const paddingY = 12;
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = fontSize + paddingY * 2;
        const pillX = (canvasWidth - pillWidth) / 2;
        const pillY = canvasHeight - pillHeight - 40;
        const borderRadius = pillHeight / 2;

        // Draw background pill
        ctx.globalAlpha = this.opacity * 0.6;
        ctx.fillStyle = '#5a5044';
        ctx.beginPath();
        ctx.moveTo(pillX + borderRadius, pillY);
        ctx.lineTo(pillX + pillWidth - borderRadius, pillY);
        ctx.arcTo(pillX + pillWidth, pillY, pillX + pillWidth, pillY + borderRadius, borderRadius);
        ctx.lineTo(pillX + pillWidth, pillY + pillHeight - borderRadius);
        ctx.arcTo(pillX + pillWidth, pillY + pillHeight, pillX + pillWidth - borderRadius, pillY + pillHeight, borderRadius);
        ctx.lineTo(pillX + borderRadius, pillY + pillHeight);
        ctx.arcTo(pillX, pillY + pillHeight, pillX, pillY + pillHeight - borderRadius, borderRadius);
        ctx.lineTo(pillX, pillY + borderRadius);
        ctx.arcTo(pillX, pillY, pillX + borderRadius, pillY, borderRadius);
        ctx.closePath();
        ctx.fill();

        // Draw text
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#e8dcc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvasWidth / 2, pillY + pillHeight / 2);

        ctx.restore();
    }

    // Reset hint system
    reset() {
        this.inactivityTimer = 0;
        this.opacity = 0;
        this.targetOpacity = 0;
        this.isVisible = false;
        this.currentHint = null;
        this.lastHintIndex = -1;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HintSystem };
}
