import { Base } from '@ryze-digital/js-utilities';
import { OptionListProvider } from './OptionListProvider.js';
import { PlaceholderProvider } from './PlaceholderProvider.js';
import { KeyboardController } from './KeyboardController.js';

export class SelectReplace extends Base {
    /**
     * @type {HTMLDivElement}
     */
    #fakeSelect = null;

    /**
     * @type {OptionListProvider}
     */
    #optionListProvider;

    /**
     * @type {PlaceholderProvider}
     */
    #placeholderProvider;

    /**
     * @type {object}
     */
    #observer;

    /**
     * @param {object} options
     * @param {HTMLSelectElement} [options.el]
     */
    constructor(options = {}) {
        super({
            el: document.querySelector('select'),
            optionList: {
                calcWidth: true,
                appendTo: document.body
            },
            classes: {
                fakeSelect: 'select-replace',
                placeholder: 'placeholder',
                optionList: 'option-list',
                hideSelect: 'visually-hidden',
                focussed: 'has-focus',
                disabled: 'disabled'
            },
            i18n: {
                languages: ['en', 'de'],
                selectedOptions: {
                    en: 'selected',
                    de: 'ausgewählt'
                },
                use: 'en'
            }
        }, options);

        if (this.isMultiple && typeof this.options.el.dataset.placeholder === 'undefined') {
            console.error(`Select with id="${this.options.el.id}" is missing data-placeholder`);
        }

        this.#setLanguageToUse();
    }

    init() {
        this.#replaceSelect();

        this.#placeholderProvider = new PlaceholderProvider(
            this.options,
            this.#fakeSelect,
            this.selectedCount
        );

        this.#placeholderProvider.createPlaceholder();

        if (this.isDisabled) {
            return;
        }

        this.#observer = new MutationObserver(this.#handleDomChanges);

        this.#optionListProvider = new OptionListProvider(
            this.options,
            this.#fakeSelect,
            this.#handleOptionListClick,
            this.#observer
        );

        new KeyboardController(
            this.options,
            this.#fakeSelect,
            this.#optionListProvider,
            this.#handleRealSelectChange
        );
    }

    update() {
        if (this.#optionListProvider.optionListCreated === true && this.isDisabled === false) {
            this.#optionListProvider.syncOptions();
        }

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        } else {
            this.#placeholderProvider.placeholder = this.options.el.querySelector('option:checked').textContent;
        }
    }

    reposition() {
        if (this.#optionListProvider.optionListCreated === false || this.isDisabled) {
            return;
        }

        this.#optionListProvider.updatePosition();
    }

    /**
     * @returns {number}
     */
    get selectedCount() {
        return this.options.el.querySelectorAll('option:checked').length;
    }

    /**
     * @returns {boolean}
     */
    get isMultiple() {
        return this.options.el.multiple;
    }

    /**
     * @returns {boolean}
     */
    get isDisabled() {
        return this.options.el.disabled;
    }

    #setLanguageToUse() {
        if (this.options.i18n.languages.includes(document.documentElement.lang)) {
            this.options.i18n.use = document.documentElement.lang;
        }
    }

    #replaceSelect() {
        this.#fakeSelect = document.createElement('div');
        this.#fakeSelect.classList.add(this.options.classes.fakeSelect);

        if (this.isDisabled) {
            this.#fakeSelect.classList.add(this.options.classes.disabled);
        } else {
            this.#fakeSelect.addEventListener('click', this.#handleFakeSelectClick);
        }

        this.options.el.after(this.#fakeSelect);
        this.options.el.classList.add(this.options.classes.hideSelect);
    }

    #handleFakeSelectClick = () => {
        if (this.#optionListProvider.visible === true) {
            this.#optionListProvider.hide();
        } else {
            this.#optionListProvider.show();
        }
    };

    /**
     *
     * @param {object} event
     */
    #handleOptionListClick = (event) => {
        const clickedOption = event.target.closest('[data-value]');

        if (clickedOption === null || clickedOption.classList.contains(this.options.classes.disabled)) {
            return;
        }

        const clickedOptionIndex = [].slice.call(this.#optionListProvider.optionList.children).indexOf(clickedOption);
        const realOption = this.options.el.querySelector(`option:nth-child(${clickedOptionIndex + 1})`);

        if (this.isMultiple === false) {
            this.#setUnselected();
            this.#setSelected(realOption, clickedOption);
            this.#optionListProvider.hide();
            this.#placeholderProvider.placeholder = event.target.textContent;
        } else {
            this.#toggleSelected(realOption, clickedOption);
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        }

        this.options.el.dispatchEvent(new Event('change'));
    };

    #handleRealSelectChange = () => {
        const realOptions = this.options.el.querySelectorAll('option:checked');
        const fakeOptions = this.#optionListProvider.optionList.querySelectorAll('[aria-selected="true"]');

        fakeOptions.forEach((fakeOption) => {
            this.#setUnselected(null, fakeOption);
        });

        realOptions.forEach((realOption) => {
            const fakeOption = this.#optionListProvider.optionList.querySelector(`[data-value="${realOption.value}"]`);

            this.#setSelected(null, fakeOption);
        });

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(realOptions.length);
        } else {
            this.#placeholderProvider.placeholder = realOptions[0].textContent;
        }
    };

    /**
     *
     * @param {HTMLOptionElement} realOption
     * @param {HTMLDivElement} fakeOption
     */
    #setUnselected(
        realOption = this.options.el.querySelector('option:checked'),
        fakeOption = this.#optionListProvider.optionList.querySelector('[aria-selected="true"]')
    ) {
        if (realOption !== null) {
            realOption.selected = false;
        }

        if (fakeOption !== null) {
            fakeOption.ariaSelected = 'false';
        }
    }

    /**
     *
     * @param {HTMLOptionElement} realOption
     * @param {HTMLDivElement} fakeOption
     */
    #setSelected(realOption, fakeOption) {
        if (realOption !== null) {
            realOption.selected = true;
        }

        if (fakeOption !== null) {
            fakeOption.ariaSelected = 'true';
        }
    }

    /**
     *
     * @param {HTMLOptionElement} realOption
     * @param {HTMLDivElement} fakeOption
     */
    #toggleSelected(realOption, fakeOption) {
        if (realOption !== null) {
            realOption.selected = !realOption.selected;
        }

        if (fakeOption !== null) {
            fakeOption.ariaSelected = fakeOption.ariaSelected === 'true' ? 'false' : 'true';
        }
    }

    #handleDomChanges = () => {
        this.#optionListProvider.syncOptions();

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        }
    };
}