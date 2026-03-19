import { ReduceFunctionCalls } from '@ryze-digital/js-utilities';

export class OptionListProvider {
    /**
     * @type {HTMLDivElement}
     */
    #fakeSelect;

    /**
     * @type {HTMLDivElement}
     */
    #optionList = null;

    /**
     * @type {HTMLDivElement}
     */
    #optionListContainer = null;

    /**
     * @type {HTMLInputElement}
     */
    #searchInput = null;

    /**
     * @type {HTMLDivElement}
     */
    #noResults = null;

    /**
     * @type {boolean}
     */
    #optionListCreated = false;

    /**
     * @type {boolean}
     */
    #visible = false;

    /**
     * @type {Function}
     */
    #clickCallback;

    /**
     * @type {object}
     */
    #observer;

    /**
     * @param {object} options
     * @param {HTMLDivElement} fakeSelect
     * @param {Function} clickCallback
     * @param {object} observer
     */
    constructor(options, fakeSelect, clickCallback, observer) {
        this.options = options;
        this.#fakeSelect = fakeSelect;
        this.#clickCallback = clickCallback;
        this.#observer = observer;
    }

    /**
     * @returns {boolean}
     */
    get optionListCreated() {
        return this.#optionListCreated;
    }

    /**
     * @returns {HTMLDivElement}
     */
    get optionList() {
        return this.#optionList;
    }

    /**
     * @returns {HTMLInputElement|null}
     */
    get searchInput() {
        return this.#searchInput;
    }

    /**
     * @returns {boolean}
     */
    get visible() {
        return this.#visible;
    }

    createOptionList() {
        this.#optionListContainer = document.createElement('div');
        this.#optionList = document.createElement('div');

        Object.assign(this.#optionListContainer, {
            ariaExpanded: 'false'
        });
        this.#optionListContainer.classList.add(this.options.classes.optionList);
        this.#optionListContainer.style.display = 'none';

        this.#optionList.setAttribute('role', 'listbox');

        if (this.options.search.enabled === true) {
            this.#createSearchInput();
        }

        this.#createNoResultsElement();

        this.#optionListContainer.append(this.#optionList);
        this.#optionListContainer.append(this.#noResults);

        this.#optionListContainer.addEventListener('click', this.#clickCallback);
        this.#optionListContainer.dataset.id = this.options.el.id;
        this.#optionListCreated = true;

        this.options.optionList.appendTo.append(this.#optionListContainer);
    }

    #createSearchInput() {
        this.#searchInput = document.createElement('input');

        Object.assign(this.#searchInput, {
            type: 'search',
            placeholder: this.#getLocalizedSearchText('placeholder', 'Search options'),
            ariaLabel: this.#getLocalizedSearchText('placeholder', 'Search options')
        });
        this.#searchInput.classList.add(this.options.classes.searchInput);

        this.#searchInput.autocomplete = 'off';
        this.#searchInput.spellcheck = false;
        this.#searchInput.addEventListener('input', this.#handleSearchInput);

        this.#optionListContainer.append(this.#searchInput);
    }

    #createNoResultsElement() {
        this.#noResults = document.createElement('div');

        Object.assign(this.#noResults, {
            textContent: this.#getLocalizedSearchText('noResults', 'No results found'),
            hidden: true,
            ariaHidden: 'true'
        });
        this.#noResults.classList.add(this.options.classes.noResults);
    }

    syncOptions() {
        this.#optionList.innerHTML = '';

        this.options.el.querySelectorAll('option').forEach((option, optionIndex) => {
            const optionEl = document.createElement('div');
            let ariaSelected = 'false';

            if (option.selected) {
                ariaSelected = 'true';
            }

            Object.assign(optionEl, {
                textContent: option.text
            });
            optionEl.setAttribute('role', 'option');
            optionEl.setAttribute('aria-selected', ariaSelected);

            optionEl.dataset.value = option.value;
            optionEl.dataset.index = String(optionIndex);

            if (option.disabled) {
                optionEl.classList.add(this.options.classes.disabled);
            }

            this.#optionList.append(optionEl);
        });

        this.applyFilter(this.#searchInput?.value ?? '');
    }

    show(focusSearch = false) {
        if (this.optionListCreated === false) {
            this.createOptionList();
            this.syncOptions();
            this.#observer.observe(this.options.el, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

        this.updatePosition();
        this.#optionListContainer.style.display = 'block';
        this.#optionListContainer.ariaExpanded = 'true';
        this.#visible = true;

        document.addEventListener('click', this.#handleOutsideClick);
        window.addEventListener('resize', this.#handleResize);

        if (focusSearch === true && this.#searchInput !== null) {
            this.#searchInput.focus();
        }
    }

    hide() {
        this.#optionListContainer.style.display = 'none';
        this.#optionListContainer.ariaExpanded = 'false';
        this.#visible = false;

        document.removeEventListener('click', this.#handleOutsideClick);
        window.removeEventListener('resize', this.#handleResize);
    }

    updatePosition() {
        const { top, left, width } = this.#getPositions();

        Object.assign(this.#optionListContainer.style, {
            top,
            left
        });

        if (this.options.optionList.calcWidth === true) {
            this.#optionListContainer.style.width = width;
        }
    }

    applyFilter(searchTerm = '') {
        const normalizedSearchTerm = searchTerm.trim().toLowerCase();
        let visibleOptionCount = 0;

        this.#optionList.querySelectorAll('[role="option"]').forEach((optionEl) => {
            const optionMatchesSearchTerm = optionEl.textContent.toLowerCase().includes(normalizedSearchTerm);

            optionEl.hidden = !optionMatchesSearchTerm;
            optionEl.ariaHidden = optionMatchesSearchTerm ? 'false' : 'true';

            if (optionMatchesSearchTerm) {
                visibleOptionCount += 1;
            }
        });

        if (this.#noResults !== null) {
            const noResultsVisible = visibleOptionCount === 0;

            this.#noResults.hidden = !noResultsVisible;
            this.#noResults.ariaHidden = noResultsVisible ? 'false' : 'true';
        }
    }

    resetFilter() {
        if (this.#searchInput !== null) {
            this.#searchInput.value = '';
        }

        this.applyFilter();
    }

    #getLocalizedSearchText(searchOptionKey, fallbackValue) {
        const textConfig = this.options.search[searchOptionKey];

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
        this.applyFilter(this.#searchInput.value);
    };

    /**
     * @returns {object}
     */
    #getPositions() {
        const fakeSelectRect = this.#fakeSelect.getBoundingClientRect();
        const appendTargetRect = this.options.optionList.appendTo.getBoundingClientRect();

        const top = fakeSelectRect.top - appendTargetRect.top + fakeSelectRect.height;
        const left = fakeSelectRect.left - appendTargetRect.left;

        return {
            top: `${top}px`,
            left: `${left}px`,
            width: `${fakeSelectRect.width}px`
        };
    }

    /**
     * @param {object} event
     */
    #handleOutsideClick = (event) => {
        if (event.composedPath()[0].closest(`.${this.options.classes.fakeSelect}`) === this.#fakeSelect) {
            return;
        }

        if (event.composedPath()[0].closest(`.${this.options.classes.optionList}`) === null && this.#visible === true) {
            this.hide();
        }
    };

    #handleResize = ReduceFunctionCalls.throttle(() => {
        this.updatePosition();
    });
}