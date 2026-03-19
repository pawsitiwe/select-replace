# RYZE Digital Select Replace

![Run linter(s) workflow status](https://github.com/ryze-digital/select-replace/actions/workflows/run-lint.yml/badge.svg)

## Install

```sh
npm i @ryze-digital/select-replace --save
```

## Usage

### Scss

```scss
@use "@ryze-digital/select-replace";
```

Use the provided `configure` mixin to define your select replace defaults.

```scss
@include select-replace.configure(...);
```

<details>
<summary>List of available configuration options</summary>

| Option                         | Type   | Default   | Description                                                            |
|--------------------------------|--------|-----------|------------------------------------------------------------------------|
| fake-select                    | Map    |           | Configuration options especially for the fake select (not option list) |
| fake-select.padding-inline-end | Number | `40px`    | Area where in which the arrow down icon is centered in                 |
| fake-select.icon               | Map    |           | The arrow down icon (aka select box indicator)                         |
| fake-select.icon.color         | Color  | `#cccccc` |                                                                        |
| fake-select.icon.size          | Number | `9px`     |                                                                        |


Check out [the actual configure mixin](src/styles/_config.scss) for better understanding.
</details>

There are seperate mixins for the replaced select and the option list.

```scss
.select-replace {
    @include select-replace.fake-select();
}

.option-list {
    @include select-replace.option-list();
}
```

For accessibility reasons we do not simply hide the original `<select>` field, because it should remain focusable.
Therefore, our JavaScript adds a class called `visually-hidden` to it after it is initialized. To visually hide elements
that should still be usable by screen readers, we have a mixin in our
[scss-utilities](https://github.com/ryze-digital/scss-utilities) called [visually-hidden](https://github.com/ryze-digital/scss-utilities/blob/main/src/_accessibility.scss#L10).
You could either use it to create a utility class with it, to separately hide only selected `<select>` fields ...

```Scss
.visually-hidden {
    @include scss-utilities.visually-hidden();
}
```

... or you can use it to only hide all `<select>` field directly, if you plan to replace them all.

```Scss
select {
    @include scss-utilities.visually-hidden();
}
```

### JavaScript

```js
import { SelectReplace } from '@ryze-digital/select-replace';
```

```js
new SelectReplace(document.querySelector('select')).init();
```

Constructor options are deep merged. This means you can override single nested keys without redeclaring the whole object.

```js
new SelectReplace(document.querySelector('select'), {
    classes: {
        disabled: 'is-disabled'
    },
    search: {
        enabled: true
    },
    optionList: {
        appendTo: document.querySelector('#custom-container')
    }
}).init();
```

<details>
<summary>List of available constructor parameters</summary>

| Option               | Type        | Default                                                                                                                                                                                                                                | Description                                                                         |
|----------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| el                   | HTMLElement | `document.querySelector('select')`                                                                                                                                                                                                     | Container to which the library should be bound                                      |
| optionList           | object      |                                                                                                                                                                                                                                        | Configuration options especially for the option list                                |
| optionList.calcWidth | boolean     | `true`                                                                                                                                                                                                                                 | Make option list the same width as select field                                     |
| optionList.appendTo  | HTMLElement | `document.body`                                                                                                                                                                                                                        | Container in which the option list get appended                                     |
| classes              | object      | <pre>{<br>&nbsp;&nbsp;fakeSelect: 'select-replace',<br>&nbsp;&nbsp;placeholder: 'placeholder',<br>&nbsp;&nbsp;optionList: 'option-list',<br>&nbsp;&nbsp;searchInput: 'option-list-search',<br>&nbsp;&nbsp;noResults: 'option-list-empty',<br>&nbsp;&nbsp;hideSelect: 'visually-hidden',<br>&nbsp;&nbsp;focussed: 'has-focus'<br>}</pre> | Selectors that are used internally or states that will be added to elements         |
| search               | object      |                                                                                                                                                                                                                                        | Search configuration for filtering visible options                                   |
| search.enabled       | boolean     | `false`                                                                                                                                                                                                                                | Enables a search input above the option list                                         |
| search.placeholder   | string/object | <pre>{<br>&nbsp;&nbsp;en: 'Search options',<br>&nbsp;&nbsp;de: 'Optionen suchen'<br>}</pre>                                                                                                                                         | Placeholder text for the search field (string or per language map)                   |
| search.noResults     | string/object | <pre>{<br>&nbsp;&nbsp;en: 'No results found',<br>&nbsp;&nbsp;de: 'Keine Ergebnisse gefunden'<br>}</pre>                                                                                                                             | Text shown if no option matches the entered search                                   |
| i18n                 | object      |                                                                                                                                                                                                                                        | Internationalization settings                                                       |
| i18n.languages       | array       | `['en', 'de']`                                                                                                                                                                                                                         | Available translations (extend this array, if you provide more)                     |
| i18n.selectedOptions | object      | <pre>{<br>&nbsp;&nbsp;en: 'selected',<br>&nbsp;&nbsp;de: 'ausgewählt'<br>}</pre>                                                                                                                                                       | Translations for n selected                                                         |
| i18n.use             | string      | `en`                                                                                                                                                                                                                                   | Fallback language to use, if document language is not available in `i18n.languages` |

</details>

#### Public methods

The folloing methods can be called on an instance of `SelectReplace`:


<details>
<summary>init()</summary>

Calling the constructor just creates a new instance of `SelectReplace` and does not replace the `<select>` field. You
need to call `init()` to initiate the needed DOM modifications. This method does not have any parameters yet.

</details>

<details>
<summary>update()</summary>

After doing some modifications to the `<select>` field, you have to call `update()` to reflect these changes to the fake
select. This method does not have any parameters yet.

</details>

<details>
<summary>reposition()</summary>

You can manually call `reposition()` to recalculate and update the positions of the fake dropdown list. This method does
not have any parameters yet.

</details>


## Demos

Checkout this repository and use the [/demos](/demos) folder as document root to see a running demo in the browser.

- [Single select](/demos/single-select.html)
- [Multiple select](/demos/multiple-select.html)
- [Multiple select fields](/demos/multiple-select-fields.html)
- [Preselected options](/demos/preselected-options.html)
- [Disabled select and options](/demos/disabled-select-and-options.html)
- [Programmatic control](/demos/programmatic-control.html)
- [Form reset](/demos/form-reset.html)
- [Option list appended to custom container](/demos/option-list-appended-to-custom-container.html)