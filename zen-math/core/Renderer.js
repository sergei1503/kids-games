// Renderer utility - Canvas rendering helpers
// Provides common drawing functions and background rendering

class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    // Clear canvas and draw zen background
    drawBackground() {
        const ctx = this.ctx;
        const {width, height} = this.getDimensions();

        // Base sand color gradient
        ctx.fillStyle = '#e8dcc4';
        ctx.fillRect(0, 0, width, height);

        // Draw subtle sand texture
        ctx.save();
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#d4c5ab' : '#f0e6d2';
            ctx.fillRect(
                Math.random() * width,
                Math.random() * height,
                2, 2
            );
        }
        ctx.restore();
    }

    // Draw a group indicator (ellipse around stones)
    drawGroupIndicator(stones, color = 'rgba(139, 125, 107, 0.15)') {
        if (stones.length < 2) return;

        const ctx = this.ctx;
        const positions = stones.map(s => ({x: s.x, y: s.y}));
        const minX = Math.min(...positions.map(p => p.x));
        const maxX = Math.max(...positions.map(p => p.x));
        const minY = Math.min(...positions.map(p => p.y));
        const maxY = Math.max(...positions.map(p => p.y));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX + 70; // STONE_RADIUS * 2 padding
        const height = maxY - minY + 70;

        // Draw subtle group circle
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw connecting lines between stones (for structures)
    drawConnectingLines(stones, color = 'rgba(139, 125, 107, 0.3)', lineWidth = 2) {
        if (stones.length < 2) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        // Draw lines between adjacent stones
        for (let i = 0; i < stones.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(stones[i].x, stones[i].y);
            ctx.lineTo(stones[i + 1].x, stones[i + 1].y);
            ctx.stroke();
        }

        // Close the loop if more than 2 stones
        if (stones.length > 2) {
            ctx.beginPath();
            ctx.moveTo(stones[stones.length - 1].x, stones[stones.length - 1].y);
            ctx.lineTo(stones[0].x, stones[0].y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draw a subtle count indicator (optional, non-intrusive)
    drawCountIndicator(count, x, y) {
        const ctx = this.ctx;
        ctx.save();

        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(107, 97, 82, 0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count.toString(), x, y);

        ctx.restore();
    }

    // Draw text (for challenges/hints)
    drawText(text, x, y, options = {}) {
        const ctx = this.ctx;
        const {
            fontSize = 20,
            color = 'rgba(107, 97, 82, 0.8)',
            align = 'center',
            baseline = 'middle',
            maxWidth = null
        } = options;

        ctx.save();
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        if (maxWidth) {
            ctx.fillText(text, x, y, maxWidth);
        } else {
            ctx.fillText(text, x, y);
        }

        ctx.restore();
    }

    // Resize canvas to window (with HiDPI/Retina support)
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Get center point of canvas (logical/CSS coordinates)
    getCenter() {
        const dpr = window.devicePixelRatio || 1;
        return {
            x: this.canvas.width / dpr / 2,
            y: this.canvas.height / dpr / 2
        };
    }

    // Get canvas dimensions (logical/CSS coordinates)
    getDimensions() {
        const dpr = window.devicePixelRatio || 1;
        return {
            width: this.canvas.width / dpr,
            height: this.canvas.height / dpr
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
}
