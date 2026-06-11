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
     * @type {HTMLSpanElement|null}
     */
    #searchTabAnchorBefore = null;

    /**
     * @type {HTMLSpanElement|null}
     */
    #searchTabAnchorAfter = null;

    /**
     * @param {object} options
     * @param {HTMLDivElement} fakeSelect
     * @param {object} optionListProvider
     * @param {Function} handleRealSelectChange
     */
    constructor(options, fakeSelect, optionListProvider, handleRealSelectChange) {
        this.options = options;
        this.#fakeSelect = fakeSelect;
        this.#optionListProvider = optionListProvider;

        this.options.el.addEventListener('focusin', this.#onFocusIn);
        this.options.el.addEventListener('focusout', this.#onFocusOut);
        this.options.el.addEventListener('change', handleRealSelectChange);
        this.options.el.addEventListener('keydown', this.#onSelectKeydown);

        this.#addSearchTabAnchors();
    }

    #selectKeyHandlers = {
        Tab: (event) => {
            const searchInput = this.#optionListProvider.searchInput;

            if (searchInput !== null && this.#optionListProvider.visible) {
                event.preventDefault();
                searchInput.focus();
            }
        },
        Escape: () => {
            this.#removeMirroredFocusState();
        },
        Enter: (event) => {
            event.preventDefault();
            this.#removeMirroredFocusState();
        },
        ArrowDown: (event) => {
            if (this.options.el.multiple) {
                return;
            }
            event.preventDefault();
            this.#stepRealSelection(1);
        },
        ArrowUp: (event) => {
            if (this.options.el.multiple) {
                return;
            }
            event.preventDefault();
            this.#stepRealSelection(-1);
        }
    };

    #searchKeyHandlers = {
        ArrowDown: (event) => {
            event.preventDefault();
            this.#optionListProvider.selectNextVisibleOption();
        },
        ArrowUp: (event) => {
            event.preventDefault();
            this.#optionListProvider.selectPreviousVisibleOption();
        },
        Tab: (event) => {
            // Move focus to created tab anchor sitting next to the real <select>; So the browser's
            // native Tab default action then advances from there to the form's next/prev field.
            if (event.shiftKey) {
                this.#searchTabAnchorBefore.focus();
            } else {
                this.#searchTabAnchorAfter.focus();
            }

            this.#removeMirroredFocusState();
        },
        Escape: (event) => {
            event.preventDefault();
            this.#removeMirroredFocusState();
        },
        Enter: (event) => {
            event.preventDefault();
            this.#searchTabAnchorAfter.focus();
        }
    };

    #onFocusIn = () => {
        this.#fakeSelect.classList.add(this.options.classes.focussed);
        this.#optionListProvider.show();
        this.#addSearchKeydownListener();
    };

    /**
     * @param {FocusEvent|null} [event]
     */
    #onFocusOut = (event = null) => {
        if (
            event?.relatedTarget instanceof HTMLElement
            && event.relatedTarget.closest(`.${this.options.classes.optionList}`) !== null
        ) {
            return;
        }

        this.#removeMirroredFocusState();
    };

    /**
     * @param {KeyboardEvent} event
     */
    #onSelectKeydown = (event) => {
        this.#selectKeyHandlers[event.key]?.(event);
    };

    /**
     * @param {KeyboardEvent} event
     */
    #onSearchKeydown = (event) => {
        this.#searchKeyHandlers[event.key]?.(event);
    };

    /**
     * @param {FocusEvent} event
     */
    #onSearchFocusOut = (event) => {
        if (
            event.relatedTarget instanceof HTMLElement
            && event.relatedTarget.closest(`.${this.options.classes.optionList}`) !== null
        ) {
            return;
        }

        this.#removeMirroredFocusState();
    };

    #removeMirroredFocusState() {
        this.#fakeSelect.classList.remove(this.options.classes.focussed);
        this.#optionListProvider.resetFilter();
        this.#optionListProvider.hide();
    }

    /**
     * @param {number} direction
     */
    #stepRealSelection(direction) {
        const options = this.options.el.options;
        let nextIndex = this.options.el.selectedIndex + direction;

        // option.disabled reflects only the option's own attribute — also skip
        // options whose parent <optgroup> is disabled.
        while (
            nextIndex >= 0
            && nextIndex < options.length
            && (options[nextIndex].disabled || options[nextIndex].closest('optgroup[disabled]') !== null)
        ) {
            nextIndex += direction;
        }

        if (nextIndex < 0 || nextIndex >= options.length) {
            return;
        }

        this.options.el.selectedIndex = nextIndex;
        this.options.el.dispatchEvent(new Event('change', { bubbles: true }));
        this.#optionListProvider.optionList
            ?.querySelector(`[data-index="${nextIndex}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }

    #addSearchKeydownListener() {
        const searchInput = this.#optionListProvider.searchInput;

        if (searchInput === null) {
            return;
        }

        searchInput.addEventListener('keydown', this.#onSearchKeydown);
        searchInput.addEventListener('focusout', this.#onSearchFocusOut);
    }

    /**
     * Inserts invisible focus anchors around the real <select>. So that default
     * browser tab order can use after focusing the elements.
     */
    #addSearchTabAnchors() {
        if (this.options.search.enabled !== true) {
            return;
        }

        this.#searchTabAnchorBefore = this.#createSearchTabAnchor();
        this.#searchTabAnchorAfter = this.#createSearchTabAnchor();

        this.options.el.before(this.#searchTabAnchorBefore);
        this.#fakeSelect.after(this.#searchTabAnchorAfter);
    }

    /**
     * @returns {HTMLSpanElement}
     */
    #createSearchTabAnchor() {
        const anchor = document.createElement('span');

        anchor.tabIndex = -1;
        anchor.setAttribute('aria-hidden', 'true');

        return anchor;
    }
}
