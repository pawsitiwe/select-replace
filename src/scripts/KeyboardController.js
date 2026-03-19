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

        this.options.el.addEventListener('focusin', this.#mirrorFocusState);
        this.options.el.addEventListener('focusout', this.#removeMirroredFocusState);
        this.options.el.addEventListener('change', handleRealSelectChange);
    }

    #mirrorFocusState = () => {
        this.#fakeSelect.classList.add(this.options.classes.focussed);
        this.#optionListProvider.show();

        if (this.#optionListProvider.searchInput !== null) {
            this.#optionListProvider.searchInput.addEventListener('keydown', this.#handleSearchKeydownEvents);
        }

        this.options.el.addEventListener('keydown', this.#handleKeydownEvents);
    };

    #removeMirroredFocusState = () => {
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
            case 'Escape':
                event.preventDefault();
                this.#removeMirroredFocusState();
                break;
            case 'Enter':
                event.preventDefault();
                break;
        }
    };
}