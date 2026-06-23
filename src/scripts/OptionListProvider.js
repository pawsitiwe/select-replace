import { ReduceFunctionCalls } from '@ryze-digital/js-utilities';
import { SearchProvider } from './SearchProvider.js';

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
     * @type {SearchProvider}
     */
    #searchProvider;

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
        this.#searchProvider = new SearchProvider(options);
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
        return this.#searchProvider.searchInput;
    }

    /**
     * @returns {boolean}
     */
    get visible() {
        return this.#visible;
    }

    #createOptionList() {
        this.#optionListContainer = document.createElement('div');
        this.#optionListContainer.classList.add(this.options.classes.optionList);
        this.#optionListContainer.style.display = 'none';
        this.#optionListContainer.ariaExpanded = 'false';
        this.#optionListContainer.dataset.id = this.options.el.id;
        this.#optionListContainer.addEventListener('click', this.#clickCallback);
        this.#optionListContainer.addEventListener('mousedown', this.#preventFocusLossOnOptionClick);

        this.#optionList = document.createElement('div');
        this.#optionList.setAttribute('role', 'listbox');

        this.#optionListContainer.append(this.#optionList);
        this.#searchProvider.createSearchElements(this.#optionListContainer, this.#optionList);

        this.#optionListCreated = true;
        this.options.optionList.appendTo.append(this.#optionListContainer);
    }

    syncOptions() {
        this.#optionList.innerHTML = '';

        Array.from(this.options.el.children).forEach((child) => {
            if (child.tagName === 'OPTGROUP') {
                this.#optionList.append(this.#createOptGroupElement(child));
            } else if (child.tagName === 'OPTION') {
                this.#optionList.append(this.#createOptionElement(child));
            }
        });

        this.#searchProvider.applyFilter();
    }

    /**
     * @param {HTMLOptGroupElement} optgroup
     * @returns {HTMLDivElement}
     */
    #createOptGroupElement(optgroup) {
        const optgroupEl = document.createElement('div');

        optgroupEl.classList.add(this.options.classes.optgroup);
        optgroupEl.classList.toggle(this.options.classes.disabled, optgroup.disabled);
        optgroupEl.setAttribute('role', 'group');
        optgroupEl.setAttribute('aria-label', optgroup.label);

        const labelEl = document.createElement('div');

        labelEl.classList.add('label');
        labelEl.classList.toggle(this.options.classes.disabled, optgroup.disabled);
        labelEl.textContent = optgroup.label;
        labelEl.dataset.optgroupLabel = 'true';

        optgroupEl.append(labelEl);

        optgroup.querySelectorAll('option').forEach((option) => {
            optgroupEl.append(this.#createOptionElement(option, optgroup.disabled));
        });

        return optgroupEl;
    }

    /**
     * @param {HTMLOptionElement} option
     * @param {boolean} [parentDisabled]
     * @returns {HTMLDivElement}
     */
    #createOptionElement(option, parentDisabled = false) {
        const optionEl = document.createElement('div');

        optionEl.textContent = option.text;
        optionEl.setAttribute('role', 'option');
        optionEl.setAttribute('aria-selected', option.selected ? 'true' : 'false');
        optionEl.dataset.value = option.value;
        optionEl.dataset.index = String(option.index);
        optionEl.classList.toggle(this.options.classes.disabled, option.disabled || parentDisabled);

        return optionEl;
    }

    /**
     * @param {boolean} [focusSearch]
     */
    show(focusSearch = false) {
        if (this.optionListCreated === false) {
            this.#createOptionList();
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

        if (focusSearch === true && this.#searchProvider.searchInput !== null) {
            this.#searchProvider.searchInput.focus();
        }
    }

    selectNextVisibleOption() {
        if (this.options.el.multiple) {
            return;
        }

        const visibleOptions = this.#getVisibleEnabledOptionElements();
        const nextOption = visibleOptions[visibleOptions.indexOf(this.#getSelectedVisibleOption()) + 1];

        if (nextOption === undefined) {
            return;
        }

        this.#setSelectedOptionByElement(nextOption);
    }

    selectPreviousVisibleOption() {
        if (this.options.el.multiple) {
            return;
        }

        const visibleOptions = this.#getVisibleEnabledOptionElements();
        const currentIndex = visibleOptions.indexOf(this.#getSelectedVisibleOption());

        if (currentIndex <= 0) {
            return;
        }

        this.#setSelectedOptionByElement(visibleOptions[currentIndex - 1]);
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

    resetFilter() {
        this.#searchProvider.reset();
        this.#searchProvider.applyFilter();
    }

    /**
     * @param {HTMLElement} fakeOptionEl
     * @returns {HTMLOptionElement|null}
     */
    resolveRealOption(fakeOptionEl) {
        const optionIndex = Number(fakeOptionEl.dataset.index);

        if (Number.isNaN(optionIndex)) {
            return null;
        }

        return this.options.el.querySelectorAll('option')[optionIndex] ?? null;
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
     * @returns {HTMLDivElement|null}
     */
    #getSelectedVisibleOption() {
        return this.#optionList.querySelector('[role="option"][aria-selected="true"]:not([hidden])');
    }

    /**
     * @param {HTMLDivElement} optionEl
     */
    #setSelectedOptionByElement(optionEl) {
        const realOption = this.resolveRealOption(optionEl);

        if (realOption === null || realOption.disabled) {
            return;
        }

        this.options.el.selectedIndex = realOption.index;
        this.options.el.dispatchEvent(new Event('change', { bubbles: true }));
        optionEl.scrollIntoView({ block: 'nearest' });
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

    /**
     * @param {MouseEvent} event
     */
    #preventFocusLossOnOptionClick = (event) => {
        if (event.target.closest('[data-value]') !== null) {
            event.preventDefault();
        }
    };
}