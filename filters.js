export class Filters {

  /**
   * @param {URL} url 
   */
  constructor(url) {
    this.url = url;
    this.callbacks = {};
    this.supportedFilters = new Set(['browser', 'interop', 'predictions', 'status']);
  }

  get browser() {
    return this.url.searchParams.getAll('browser');
  }

  get interop() {
    return this.url.searchParams.get('interop');
  }

  get predictions() {
    return this.url.searchParams.get('predictions');
  }

  get status() {
    return this.url.searchParams.get('status');
  }

  init() {
    this.supportedFilters.forEach(param => {
      this.#dispatchCallbacks(param);
    });
  }

  /**
   * This callback is executed when a value changes.
   * @callback ValueChangeCallback
   * @param {string} oldValue - The previous value.
   * @param {string} newValue - The current value.
   * @returns {void}
   */

  /**
   * 
   * @param {string} param 
   * @param {ValueChangeCallback} callback 
   */
  onChange(param, callback) {
    this.callbacks[param] ??= [];
    this.callbacks[param].push(callback);
  }

  /**
   * @param {string} param
   * @param {string=} value
   */
  delete(param, value) {
    this.#validate(param);
    this.url.searchParams.delete(param, value);
    this.#refresh();
    this.#dispatchCallbacks(param);
  }

  append(param, value) {
    this.#validate(param);
    if (!Array.isArray(this[param])) {
      throw `Unable to append to non-array filter ${param}`;
    }
    this.url.searchParams.append(param, value);
    this.#refresh();
    this.#dispatchCallbacks(param);
  }

  set(param, value) {
    this.#validate(param);
    if (Array.isArray(this[param])) {
      throw `Use filters.append to add to array filter ${param}`;
    }
    this.url.searchParams.set(param, value);
    this.#refresh();
    this.#dispatchCallbacks(param);
  }

  #refresh() {
    window.history.replaceState({}, '', this.url);
  }

  #validate(param) {
    if (!this.supportedFilters.has(param)) {
      throw `Trying to modify unknown filter ${param}`;
    }
  }

  #dispatchCallbacks(param) {
    this.callbacks[param]?.forEach(callback => {
      callback(this[param]);
    });
  }

}
