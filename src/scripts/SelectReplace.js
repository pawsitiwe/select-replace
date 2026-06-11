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
                optgroup: 'option-list-group',
                searchInput: 'option-list-search',
                noResults: 'option-list-empty',
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
                search: {
                    placeholder: {
                        en: 'Search options',
                        de: 'Optionen suchen'
                    },
                    noResults: {
                        en: 'No results found',
                        de: 'Keine Ergebnisse gefunden'
                    }
                },
                use: 'en'
            },
            search: {
                enabled: false,
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

        this.bindFormReset();

        if (this.isDisabled) {
            return;
        }

        this.#observer = new MutationObserver(this.update);

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
        this.#fakeSelect.classList.toggle(this.options.classes.disabled, this.isDisabled);

        if (this.#optionListProvider.optionListCreated === true && this.isDisabled === false) {
            this.#optionListProvider.syncOptions();
        }

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        } else {
            this.#placeholderProvider.placeholder = this.options.el.querySelector('option:checked')?.textContent ?? '';
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
     * @param {object} event
     */
    #handleOptionListClick = (event) => {
        const clickedOption = event.target.closest('[data-value]');

        if (clickedOption === null || clickedOption.classList.contains(this.options.classes.disabled)) {
            return;
        }

        const realOption = this.#optionListProvider.resolveRealOption(clickedOption);

        if (realOption === null) {
            return;
        }

        if (this.isMultiple === false) {
            this.#setSelectionState(
                this.options.el.querySelector('option:checked'),
                this.#optionListProvider.optionList.querySelector('[aria-selected="true"]'),
                false
            );
            this.#setSelectionState(realOption, clickedOption, true);
            this.#optionListProvider.resetFilter();
            this.#optionListProvider.hide();
            this.#placeholderProvider.placeholder = clickedOption.textContent;
        } else {
            this.#setSelectionState(realOption, clickedOption, !realOption.selected);
            this.#placeholderProvider.refreshSelectedCount(this.selectedCount);
        }

        this.options.el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    #handleRealSelectChange = () => {
        if (this.#optionListProvider.optionListCreated === false) {
            this.update();

            return;
        }

        const realOptions = this.options.el.querySelectorAll('option:checked');
        const fakeOptions = this.#optionListProvider.optionList.querySelectorAll('[aria-selected="true"]');

        fakeOptions.forEach((fakeOption) => {
            this.#setSelectionState(null, fakeOption, false);
        });

        this.options.el.querySelectorAll('option').forEach((realOption, optionIndex) => {
            if (realOption.selected === false) {
                return;
            }

            const fakeOption = this.#optionListProvider.optionList.querySelector(`[data-index="${optionIndex}"]`);

            this.#setSelectionState(null, fakeOption, true);
        });

        if (this.isMultiple) {
            this.#placeholderProvider.refreshSelectedCount(realOptions.length);
        } else {
            this.#placeholderProvider.placeholder = realOptions[0].textContent;
        }
    };

    /**
     * @param {HTMLOptionElement|null} realOption
     * @param {HTMLDivElement|null} fakeOption
     * @param {boolean} selected
     */
    #setSelectionState(realOption, fakeOption, selected) {
        if (realOption !== null) {
            realOption.selected = selected;
        }

        if (fakeOption !== null) {
            fakeOption.setAttribute('aria-selected', selected ? 'true' : 'false');
        }
    }

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