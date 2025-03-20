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
     *
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
     *
     * @returns {boolean}
     */
    get optionListCreated() {
        return this.#optionListCreated;
    }

    /**
     *
     * @returns {HTMLDivElement}
     */
    get optionList() {
        return this.#optionList;
    }

    /**
     *
     * @returns {boolean}
     */
    get visible() {
        return this.#visible;
    }

    createOptionList() {
        this.#optionList = document.createElement('div');

        Object.assign(this.#optionList, {
            role: 'listbox',
            classList: [this.options.classes.optionList],
            ariaExpanded: 'false',
            style: { display: 'none' },
        });

        this.#optionList.addEventListener('click', this.#clickCallback);
        this.#optionList.dataset.id = this.options.el.id;
        this.#optionListCreated = true;

        this.options.optionList.appendTo.append(this.#optionList);
    }

    syncOptions() {
        this.#optionList.innerHTML = '';

        this.options.el.querySelectorAll('option').forEach((option) => {
            const optionEl = document.createElement('div');
            let ariaSelected = 'false';

            if (option.selected) {
                ariaSelected = 'true';
            }

            Object.assign(optionEl, {
                role: 'option',
                textContent: option.text,
                ariaSelected
            });

            optionEl.dataset.value = option.value;

            this.#optionList.append(optionEl);
        });
    }

    show() {
        if (this.optionListCreated === false) {
            this.createOptionList();
            this.syncOptions();
            this.#observer.observe(this.options.el, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

        const { top, left, width } = this.#getPositions();

        Object.assign(this.#optionList.style, {
            top,
            left,
            display: 'block'
        });

        if (this.options.optionList.calcWidth === true) {
            this.#optionList.style.width = width;
        }

        this.#optionList.ariaExpanded = 'true';
        this.#visible = true;

        document.addEventListener('click', this.#handleOutsideClick);
    }

    hide() {
        this.#optionList.style.display = 'none';
        this.#optionList.ariaExpanded = 'false';
        this.#visible = false;

        document.removeEventListener('click', this.#handleOutsideClick);
    }

    /**
     *
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
     *
     * @param {object} event
     */
    #handleOutsideClick = (event) => {
        if (event.target.closest(`.${this.options.classes.fakeSelect}`) === this.#fakeSelect) {
            return;
        }

        if (event.composedPath()[0].closest(`.${this.options.classes.optionList}`) === null && this.#visible === true) {
            this.hide();
        }
    };
}