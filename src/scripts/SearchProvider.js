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
     * @type {Function}
     */
    #onSearchCallback;

    /**
     * @param {object} options
     * @param {Function} onSearchCallback
     */
    constructor(options, onSearchCallback) {
        this.options = options;
        this.#onSearchCallback = onSearchCallback;
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
        return this.options.search.enabled === true;
    }

    /**
     * @param {HTMLDivElement} container
     */
    createSearchElements(container) {
        if (!this.isEnabled) {
            return;
        }

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
        this.#searchInput.addEventListener('input', this.#handleSearchInput);

        container.prepend(this.#searchInput);
    }

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
     * @param {HTMLDivElement} optionList
     * @returns {number} - Number of visible options
     */
    applyFilter(optionList) {
        const searchTerm = this.searchTerm;
        let visibleOptionCount = 0;

        optionList.querySelectorAll(':scope > [role="option"]').forEach((optionEl) => {
            const optionMatchesSearchTerm = optionEl.textContent.toLowerCase().includes(searchTerm);

            optionEl.hidden = !optionMatchesSearchTerm;
            optionEl.ariaHidden = optionMatchesSearchTerm ? 'false' : 'true';

            if (optionMatchesSearchTerm) {
                visibleOptionCount += 1;
            }
        });

        optionList.querySelectorAll('[role="group"]').forEach((optgroupEl) => {
            let groupVisibleCount = 0;

            optgroupEl.querySelectorAll('[role="option"]').forEach((optionEl) => {
                const optionMatchesSearchTerm = optionEl.textContent.toLowerCase().includes(searchTerm);

                optionEl.hidden = !optionMatchesSearchTerm;
                optionEl.ariaHidden = optionMatchesSearchTerm ? 'false' : 'true';

                if (optionMatchesSearchTerm) {
                    groupVisibleCount += 1;
                    visibleOptionCount += 1;
                }
            });

            // Hide optgroup if no options are visible
            optgroupEl.hidden = groupVisibleCount === 0;
            optgroupEl.ariaHidden = groupVisibleCount === 0 ? 'true' : 'false';
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
     * @param {boolean} visible
     */
    #updateNoResultsVisibility(visible) {
        if (this.#noResults === null) {
            return;
        }

        this.#noResults.hidden = !visible;
        this.#noResults.ariaHidden = visible ? 'false' : 'true';
    }

    /**
     * @param {string} key
     * @param {string} fallbackValue
     * @returns {string}
     */
    #getLocalizedText(key, fallbackValue) {
        const textConfig = this.options.search[key];

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

    #handleSearchInput = () => {
        this.#onSearchCallback();
    };
}

