import deepmerge from 'deepmerge';
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
     * @param {HTMLSelectElement} [el]
     * @param {object} [options]
     */
    constructor(
        el = document.querySelector('select'),
        options = {}
    ) {
        super({}, {});
        this._options = this._mergeOptions(el, options);

        if (this.isMultiple && typeof this.options.el.dataset.placeholder === 'undefined') {
            console.error(`Select with id="${this.options.el.id}" is missing data-placeholder`);
        }

        this.#setLanguageToUse();
    }

    /**
     * @returns {object}
     */
    get options() {
        return this._options;
    }

    /**
     * @param {HTMLSelectElement} el
     * @param {object} options
     * @returns {object}
     */
    _mergeOptions(el, options) {
        return deepmerge({
            el,
            optionList: {
                calcWidth: true,
                appendTo: document.body
            },
            classes: {
                fakeSelect: 'select-replace',
                placeholder: 'placeholder',
                optionList: 'option-list',
                searchInput: 'option-list-search',
                noResults: 'option-list-empty',
                hideSelect: 'visually-hidden',
                focussed: 'has-focus',
                disabled: 'disabled'
            },
            search: {
                enabled: false,
                placeholder: {
                    en: 'Search options',
                    de: 'Optionen suchen'
                },
                noResults: {
                    en: 'No results found',
                    de: 'Keine Ergebnisse gefunden'
                }
            },
            i18n: {
                languages: ['en', 'de'],
                selectedOptions: {
                    en: 'selected',
                    de: 'ausgewählt'
                },
                use: 'en'
            }
        }, options, {
            isMergeableObject: (value) => {
                return Object.prototype.toString.call(value) === '[object Object]';
            }
        });
    }

    init() {
        this.#replaceSelect();

        this.#placeholderProvider = new PlaceholderProvider(
            this.options,
            this.#fakeSelect,
            this.selectedCount
        );

        this.#placeholderProvider.createPlaceholder();

        this.bindFormReset();

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

    update = () => {
        if (this.isDisabled) {
            this.#fakeSelect.classList.add(this.options.classes.disabled);
        } else {
            this.#fakeSelect.classList.remove(this.options.classes.disabled);
        }

        if (this.#optionListProvider.optionListCreated === true && this.isDisabled === false) {
            this.#optionListProvider.syncOptions();
        }

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        } else {
            this.#placeholderProvider.placeholder = this.options.el.querySelector('option:checked').textContent;
        }
    };

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
        this.#fakeSelect.addEventListener('click', this.#handleFakeSelectClick);

        if (this.isDisabled) {
            this.#fakeSelect.classList.add(this.options.classes.disabled);
        }

        this.options.el.after(this.#fakeSelect);
        this.options.el.classList.add(this.options.classes.hideSelect);
    }

    #handleFakeSelectClick = () => {
        if (this.isDisabled) {
            return;
        }

        if (this.#optionListProvider.visible === true) {
            this.#optionListProvider.resetFilter();
            this.#optionListProvider.hide();
        } else {
            this.#optionListProvider.show(true);
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

        const clickedOptionIndex = Number(clickedOption.dataset.index);
        const realOption = this.options.el.querySelectorAll('option')[clickedOptionIndex];

        if (Number.isNaN(clickedOptionIndex) || typeof realOption === 'undefined') {
            return;
        }

        if (this.isMultiple === false) {
            this.#setUnselected();
            this.#setSelected(realOption, clickedOption);
            this.#optionListProvider.resetFilter();
            this.#optionListProvider.hide();
            this.#placeholderProvider.placeholder = clickedOption.textContent;
        } else {
            this.#toggleSelected(realOption, clickedOption);
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        }

        this.options.el.dispatchEvent(new Event('change'));
    };

    #handleRealSelectChange = () => {
        if (this.#optionListProvider.optionListCreated === false) {
            this.update();

            return;
        }

        const realOptions = this.options.el.querySelectorAll('option:checked');
        const fakeOptions = this.#optionListProvider.optionList.querySelectorAll('[aria-selected="true"]');

        fakeOptions.forEach((fakeOption) => {
            this.#setUnselected(null, fakeOption);
        });

        this.options.el.querySelectorAll('option').forEach((realOption, optionIndex) => {
            if (realOption.selected === false) {

                return;
            }

            const fakeOption = this.#optionListProvider.optionList.querySelector(`[data-index="${optionIndex}"]`);

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

    bindFormReset() {
        const form = this.options.el.closest('form');

        if (form === null) {
            return;
        }

        form.addEventListener('reset', () => {
            window.setTimeout(this.update, 0);
        });
    }
}