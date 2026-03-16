// ModeSelector - Zen-styled dropdown for switching between game modes
// Renders as a DOM overlay on top of the canvas

class ModeSelector {
    constructor(modeManager, container) {
        this.modeManager = modeManager;
        this.container = container;
        this.isOpen = false;
        this.isSelecting = false;  // Prevents reopening during mode selection
        this.element = null;
        this.buttonElement = null;
        this.dropdownElement = null;
        this.boundCloseHandler = this.handleOutsideClick.bind(this);
        this.createDOM();
    }

    createDOM() {
        // Main wrapper
        this.element = document.createElement('div');
        this.element.className = 'mode-selector';

        // Button showing current mode
        this.buttonElement = document.createElement('button');
        this.buttonElement.className = 'mode-selector-button';
        this.buttonElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        this.element.appendChild(this.buttonElement);

        // Dropdown list
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.className = 'mode-selector-dropdown';
        this.element.appendChild(this.dropdownElement);

        // Add to container
        this.container.appendChild(this.element);

        // Set initial button content
        this.updateCurrentMode();
    }

    updateCurrentMode() {
        const mode = this.modeManager.getCurrentMode();
        if (!mode) return;

        // Find the metadata for the current mode
        let currentMetadata = null;
        for (const [id, data] of this.modeManager.modes) {
            if (data.instance === mode) {
                currentMetadata = data.metadata;
                break;
            }
        }

        if (currentMetadata) {
            this.buttonElement.innerHTML = '';
            const icon = document.createElement('span');
            icon.className = 'mode-selector-icon';
            icon.textContent = currentMetadata.icon;
            const name = document.createElement('span');
            name.className = 'mode-selector-name';
            name.textContent = currentMetadata.name;
            const arrow = document.createElement('span');
            arrow.className = 'mode-selector-arrow';
            arrow.textContent = this.isOpen ? '\u25B2' : '\u25BC';
            this.buttonElement.appendChild(icon);
            this.buttonElement.appendChild(name);
            this.buttonElement.appendChild(arrow);
        }
    }

    toggle() {
        // Prevent toggle during mode selection (fixes touch device bug)
        if (this.isSelecting) return;

        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.populateModes();
        this.dropdownElement.classList.add('open');
        this.updateCurrentMode();

        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.boundCloseHandler);
        }, 0);
    }

    close() {
        this.isOpen = false;
        this.dropdownElement.classList.remove('open');
        this.updateCurrentMode();
        document.removeEventListener('click', this.boundCloseHandler);
    }

    handleOutsideClick(e) {
        if (!this.element.contains(e.target)) {
            this.close();
        }
    }

    selectMode(modeId) {
        // Close immediately to prevent touch event issues
        this.close();

        // Prevent reopening for a short time (fixes touch device bug)
        this.isSelecting = true;
        setTimeout(() => {
            this.isSelecting = false;
        }, 300);

        this.modeManager.switchMode(modeId);
        this.updateCurrentMode();
    }

    populateModes() {
        this.dropdownElement.innerHTML = '';

        // Find current mode id
        let currentModeId = null;
        const currentMode = this.modeManager.getCurrentMode();
        for (const [id, data] of this.modeManager.modes) {
            if (data.instance === currentMode) {
                currentModeId = id;
                break;
            }
        }

        for (const [id, data] of this.modeManager.modes) {
            const item = document.createElement('div');
            item.className = 'mode-selector-item';
            if (id === currentModeId) {
                item.classList.add('active');
            }

            const icon = document.createElement('span');
            icon.className = 'mode-selector-item-icon';
            icon.textContent = data.metadata.icon;

            const info = document.createElement('div');
            info.className = 'mode-selector-item-info';

            const name = document.createElement('span');
            name.className = 'mode-selector-item-name';
            name.textContent = data.metadata.name;

            const desc = document.createElement('span');
            desc.className = 'mode-selector-item-desc';
            desc.textContent = data.metadata.description;

            info.appendChild(name);
            info.appendChild(desc);
            item.appendChild(icon);
            item.appendChild(info);

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();  // Prevent ghost clicks on touch devices
                this.selectMode(id);
            });

            this.dropdownElement.appendChild(item);
        }
    }

    destroy() {
        document.removeEventListener('click', this.boundCloseHandler);
        if (this.element) {
            this.element.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModeSelector };
}
