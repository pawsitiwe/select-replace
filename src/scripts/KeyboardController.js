export class KeyboardController {
    /**
     * @type {HTMLDivElement}
     */
    #fakeSelect;

    /**
     * @type {object}
     */
    #optionListProvider;

    /**
     *
     * @param {object} options
     * @param {HTMLDivElement} fakeSelect
     * @param {object} optionListProvider
     * @param {Function} handleRealSelectChange
     */
    constructor(options, fakeSelect, optionListProvider, handleRealSelectChange) {
        this.options = options;
        this.#fakeSelect = fakeSelect;
        this.#optionListProvider = optionListProvider;

        this.#fakeSelect.addEventListener('click', this.#handleFakeSelectClick);
        this.options.el.addEventListener('focusin', this.#mirrorFocusState);
        this.options.el.addEventListener('focusout', this.#removeMirroredFocusState);
        this.options.el.addEventListener('change', handleRealSelectChange);
    }

    #handleFakeSelectClick = () => {
        window.setTimeout(() => {
            if (this.#optionListProvider.visible === false || this.#optionListProvider.searchInput === null) {
                return;
            }

            this.#optionListProvider.searchInput.addEventListener('keydown', this.#handleSearchKeydownEvents);
        }, 0);
    };

    #mirrorFocusState = () => {
        this.#fakeSelect.classList.add(this.options.classes.focussed);
        this.#optionListProvider.show();

        if (this.#optionListProvider.searchInput !== null) {
            this.#optionListProvider.searchInput.addEventListener('keydown', this.#handleSearchKeydownEvents);
        }

        this.options.el.addEventListener('keydown', this.#handleKeydownEvents);
    };

    #removeMirroredFocusState = (event = null) => {
        if (
            event?.relatedTarget instanceof HTMLElement
            && event.relatedTarget.closest(`.${this.options.classes.optionList}`) !== null
        ) {
            return;
        }

        this.#fakeSelect.classList.remove(this.options.classes.focussed);
        this.#optionListProvider.resetFilter();

        if (this.#optionListProvider.searchInput !== null) {
            this.#optionListProvider.searchInput.removeEventListener('keydown', this.#handleSearchKeydownEvents);
        }

        this.#optionListProvider.hide();
        this.options.el.removeEventListener('keydown', this.#handleKeydownEvents);
    };

    /**
     *
     * @param {object} event
     */
    #handleKeydownEvents = (event) => {
        switch (event.key) {
            case 'Tab':
                if (this.#optionListProvider.searchInput !== null) {
                    event.preventDefault();
                    this.#optionListProvider.searchInput.focus();
                }

                break;
            case 'Escape':
                this.#removeMirroredFocusState();
                break;
            case 'Enter':
                event.preventDefault();
                this.#removeMirroredFocusState();
                break;
        }
    };

    /**
     * @param {object} event
     */
    #handleSearchKeydownEvents = (event) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.#optionListProvider.moveSelectionByVisibleOption(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.#optionListProvider.moveSelectionByVisibleOption(-1);
                break;
            case 'Home':
                event.preventDefault();
                this.#optionListProvider.selectVisibleBoundaryOption('start');
                break;
            case 'End':
                event.preventDefault();
                this.#optionListProvider.selectVisibleBoundaryOption('end');
                break;
            case 'Tab':
                event.preventDefault();
                this.#removeMirroredFocusState();
                this.#focusRelativeToSelect(event.shiftKey ? -1 : 1);
                break;
            case 'Escape':
                event.preventDefault();
                this.#removeMirroredFocusState();
                break;
            case 'Enter':
                event.preventDefault();
                break;
        }
    };

    /**
     * @param {number} focusDirection
     */
    #focusRelativeToSelect(focusDirection) {
        const focusableElements = this.#getFocusableElements();
        const currentSelectIndex = focusableElements.indexOf(this.options.el);

        if (currentSelectIndex === -1) {
            return;
        }

        const nextIndex = currentSelectIndex + focusDirection;

        if (nextIndex < 0 || nextIndex >= focusableElements.length) {
            return;
        }

        focusableElements[nextIndex].focus();
    }

    /**
     * @returns {HTMLElement[]}
     */
    #getFocusableElements() {
        const focusableSelector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        return Array.from(document.querySelectorAll(focusableSelector)).filter((element) => {
            if (element instanceof HTMLElement === false) {
                return false;
            }

            if (element.hidden || element.closest('[hidden]') !== null) {
                return false;
            }

            if (element.getAttribute('aria-hidden') === 'true') {
                return false;
            }

            return true;
        });
    }
}