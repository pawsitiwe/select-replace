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

    /**
     * @param {boolean} [focusSearch]
     */
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
        this.ensureActiveOptionVisible('start');

        if (focusSearch === true && this.#searchInput !== null) {
            this.#searchInput.focus();
        }
    }

    /**
     * @param {'nearest'|'start'} [alignment]
     */
    ensureActiveOptionVisible(alignment = 'nearest') {
        if (this.#optionListCreated === false) {
            return;
        }

        const activeOption = this.#getSelectedVisibleOption() ?? this.#getFirstVisibleOption();

        if (activeOption === null) {
            return;
        }

        this.#scrollOptionIntoView(activeOption, alignment);
    }

    /**
     * @param {number} direction
     * @returns {boolean}
     */
    moveSelectionByVisibleOption(direction) {
        if (this.options.el.multiple || (direction !== 1 && direction !== -1)) {
            return false;
        }

        const visibleOptions = this.#getVisibleEnabledOptionElements();

        if (visibleOptions.length === 0) {
            return false;
        }

        const selectedOption = this.#getSelectedVisibleOption();

        if (selectedOption === null) {
            return this.#setSelectedOptionByElement(direction > 0 ? visibleOptions[0] : visibleOptions[visibleOptions.length - 1]);
        }

        const currentVisibleIndex = visibleOptions.indexOf(selectedOption);

        if (currentVisibleIndex === -1) {
            return this.#setSelectedOptionByElement(direction > 0 ? visibleOptions[0] : visibleOptions[visibleOptions.length - 1]);
        }

        const targetIndex = currentVisibleIndex + direction;

        if (targetIndex < 0 || targetIndex >= visibleOptions.length) {
            return false;
        }

        return this.#setSelectedOptionByElement(visibleOptions[targetIndex]);
    }

    /**
     * @param {'start'|'end'} boundary
     * @returns {boolean}
     */
    selectVisibleBoundaryOption(boundary) {
        if (this.options.el.multiple) {
            return false;
        }

        const visibleOptions = this.#getVisibleEnabledOptionElements();

        if (visibleOptions.length === 0) {
            return false;
        }

        return this.#setSelectedOptionByElement(boundary === 'start' ? visibleOptions[0] : visibleOptions[visibleOptions.length - 1]);
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

    /**
     * @param {string} [searchTerm]
     */
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

        if (this.#visible) {
            this.ensureActiveOptionVisible();
        }
    }

    resetFilter() {
        if (this.#searchInput !== null) {
            this.#searchInput.value = '';
        }

        this.applyFilter();
    }

    /**
     * @param {string} searchOptionKey
     * @param {string} fallbackValue
     * @returns {string}
     */
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
     * @returns {HTMLDivElement|null}
     */
    #getSelectedVisibleOption() {
        return this.#optionList.querySelector('[role="option"][aria-selected="true"]:not([hidden])');
    }

    /**
     * @returns {HTMLDivElement|null}
     */
    #getFirstVisibleOption() {
        return this.#optionList.querySelector('[role="option"]:not([hidden])');
    }

    /**
     * @param {HTMLDivElement} optionEl
     * @param {'nearest'|'start'} alignment
     */
    #scrollOptionIntoView(optionEl, alignment) {
        const optionListRect = this.#optionListContainer.getBoundingClientRect();
        const optionRect = optionEl.getBoundingClientRect();
        const stickySearchOffset = this.#getStickySearchOffset();
        const visibleTop = optionListRect.top + stickySearchOffset;
        const visibleBottom = optionListRect.bottom;

        if (alignment === 'start') {
            this.#optionListContainer.scrollTop += optionRect.top - visibleTop;

            return;
        }

        if (optionRect.top < visibleTop) {
            this.#optionListContainer.scrollTop += optionRect.top - visibleTop;

            return;
        }

        if (optionRect.bottom > visibleBottom) {
            this.#optionListContainer.scrollTop += optionRect.bottom - visibleBottom;
        }
    }

    /**
     * @returns {number}
     */
    #getStickySearchOffset() {
        if (this.#searchInput === null || this.#searchInput.hidden) {
            return 0;
        }

        const searchRect = this.#searchInput.getBoundingClientRect();

        return Math.max(searchRect.height, 0);
    }

    /**
     * @returns {HTMLDivElement[]}
     */
    #getVisibleEnabledOptionElements() {
        return Array.from(this.#optionList.querySelectorAll('[role="option"]:not([hidden])')).filter((optionEl) => {
            return optionEl.classList.contains(this.options.classes.disabled) === false;
        });
    }

    /**
     * @param {HTMLDivElement} optionEl
     * @returns {boolean}
     */
    #setSelectedOptionByElement(optionEl) {
        const optionIndex = Number(optionEl.dataset.index);
        const realOption = this.options.el.querySelectorAll('option')[optionIndex];

        if (Number.isNaN(optionIndex) || typeof realOption === 'undefined' || realOption.disabled) {
            return false;
        }

        this.options.el.selectedIndex = optionIndex;
        this.options.el.dispatchEvent(new Event('change'));

        return true;
    }

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