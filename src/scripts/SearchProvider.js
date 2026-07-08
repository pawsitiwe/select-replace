export class SearchProvider {
    /**
     * @type {HTMLInputElement}
     */
    #searchInput = null;

    /**
     * @type {HTMLDivElement}
     */
    #noResults = null;

    /**
     * @type {HTMLDivElement}
     */
    #optionList = null;

    /**
     * @param {object} options
     */
    constructor(options) {
        this.options = options;
    }

    /**
     * @returns {HTMLInputElement|null}
     */
    get searchInput() {
        return this.#searchInput;
    }

    /**
     * @returns {string}
     */
    get searchTerm() {
        return this.#searchInput?.value?.trim().toLowerCase() ?? '';
    }

    /**
     * @returns {boolean}
     */
    get isEnabled() {
        return this.options.search === true;
    }

    /**
     * @param {HTMLDivElement} container
     * @param {HTMLDivElement} optionList
     */
    createSearchElements(container, optionList) {
        if (!this.isEnabled) {
            return;
        }

        this.#optionList = optionList;
        this.#createSearchInput(container);
        this.#createNoResultsElement(container);
    }

    /**
     * @param {HTMLDivElement} container
     */
    #createSearchInput(container) {
        this.#searchInput = document.createElement('input');

        Object.assign(this.#searchInput, {
            type: 'search',
            placeholder: this.#getLocalizedText('placeholder', 'Search options'),
            ariaLabel: this.#getLocalizedText('placeholder', 'Search options')
        });
        this.#searchInput.classList.add(this.options.classes.searchInput);

        this.#searchInput.autocomplete = 'off';
        this.#searchInput.spellcheck = false;
        this.#searchInput.addEventListener('input', this.#onInput);

        container.prepend(this.#searchInput);
    }

    #onInput = () => {
        this.applyFilter();
    };

    /**
     * @param {HTMLDivElement} container
     */
    #createNoResultsElement(container) {
        this.#noResults = document.createElement('div');

        Object.assign(this.#noResults, {
            textContent: this.#getLocalizedText('noResults', 'No results found'),
            hidden: true,
            ariaHidden: 'true'
        });
        this.#noResults.classList.add(this.options.classes.noResults);

        container.append(this.#noResults);
    }

    /**
     * @returns {number} - Number of visible options
     */
    applyFilter() {
        if (this.#optionList === null) {
            return 0;
        }

        const searchTerm = this.searchTerm;
        let visibleOptionCount = 0;

        this.#optionList.querySelectorAll('[role="option"]').forEach((optionEl) => {
            const matches = optionEl.textContent.toLowerCase().includes(searchTerm);

            this.#setElementVisibility(optionEl, matches);

            if (matches) {
                visibleOptionCount += 1;
            }
        });

        this.#optionList.querySelectorAll('[role="group"]').forEach((optgroupEl) => {
            const hasVisibleOption = optgroupEl.querySelector('[role="option"]:not([hidden])') !== null;

            this.#setElementVisibility(optgroupEl, hasVisibleOption);
        });

        this.#updateNoResultsVisibility(visibleOptionCount === 0);

        return visibleOptionCount;
    }

    reset() {
        if (this.#searchInput !== null) {
            this.#searchInput.value = '';
        }
    }

    /**
     * @param {HTMLElement} el
     * @param {boolean} visible
     */
    #setElementVisibility(el, visible) {
        el.hidden = !visible;
        el.ariaHidden = visible ? 'false' : 'true';
    }

    /**
     * @param {boolean} visible
     */
    #updateNoResultsVisibility(visible) {
        if (this.#noResults === null) {
            return;
        }

        this.#setElementVisibility(this.#noResults, visible);
    }

    /**
     * @param {string} key
     * @param {string} fallbackValue
     * @returns {string}
     */
    #getLocalizedText(key, fallbackValue) {
        const textConfig = this.options.i18n.search[key];

        if (typeof textConfig === 'string') {
            return textConfig;
        }

        if (Object.prototype.toString.call(textConfig) === '[object Object]') {
            if (typeof textConfig[this.options.i18n.use] === 'string') {
                return textConfig[this.options.i18n.use];
            }

            if (typeof textConfig.en === 'string') {
                return textConfig.en;
            }
        }

        return fallbackValue;
    }
}

