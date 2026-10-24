/* ==========================================================
   CofeLang - shared script (vanilla JS, no dependencies)

   Loaded on every page. Each feature starts only if the
   elements it needs exist on the current page:
     - mobile navigation + live cart badge   (all pages)
     - menu search / filter / sort / add to cart   (products)
     - cart, quantity editing, checkout form       (cart)
     - order confirmation                          (checkout-success)
     - order history                               (orders)
     - demo contact form                           (about)
     - demo login + staff dashboard                (login, dashboard)

   Data lives in localStorage (no server, no database):
     cofelang.cart.v1    -> [{ id, name, size, category, price, qty }]
     cofelang.orders.v1  -> [{ orderNumber, account, status, createdAt, customer, items, total }]
     cofelang.session.v1 -> { email, at }   (demo login, see the Login section)
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Constants ---------- */
  const KEYS = {
    cart: 'cofelang.cart.v1',
    orders: 'cofelang.orders.v1',
    session: 'cofelang.session.v1',
  };
  const MIN_QTY = 1;
  const MAX_QTY = 50;
  const ORDER_STATUSES = ['new', 'preparing', 'done'];
  const STATUS_LABELS = { new: 'New', preparing: 'Preparing', done: 'Done' };
  const MAX_ORDERS = 100; // keep localStorage small
  const RECENT_ORDER_MS = 60 * 60 * 1000; // success page is valid for 1 hour
  const PESO = '\u20B1';
  const STUDENT_DISCOUNT_RATE = 20; // percent off the subtotal for students
  const TAX_RATE = 12; // percent, charged on the amount after any discount
  const MAX_CASH_CENTS = 10000000; // sanity limit: \u20B1100,000

  // Lets CSS apply the JS-only mobile menu (without JS the menu stays visible)
  document.documentElement.classList.add('js');

  /* ---------- Small DOM helpers ---------- */
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) =>
    Array.from((root || document).querySelectorAll(selector));

  /**
   * Create an element. User-provided text is always set with textContent
   * (never innerHTML), so names/notes can't inject markup.
   */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach((name) => {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : value);
    });
    (children || []).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child);
    });
    return node;
  }

  /* ---------- Storage (always wrapped in try/catch) ---------- */
  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback; // storage blocked or data corrupted
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false; // storage blocked or full
    }
  }

  /* ---------- Money (calculated in centavos to avoid float errors) ---------- */
  const toCents = (pesos) => Math.round(pesos * 100);

  function peso(cents) {
    return (
      PESO +
      (cents / 100).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  const lineCents = (item) => toCents(item.price) * item.qty;
  const totalCents = (items) =>
    items.reduce((sum, item) => sum + lineCents(item), 0);
  /**
   * The bill, all in centavos:
   *   subtotal -> minus the student discount (20% of the subtotal)
   *            -> plus tax (12% of what is left) = total
   * `cash` and `change` are filled in at checkout.
   */
  function computeBill(items, student) {
    const subtotal = totalCents(items);
    const discount = student
      ? Math.round((subtotal * STUDENT_DISCOUNT_RATE) / 100)
      : 0;
    const taxable = subtotal - discount;
    const tax = Math.round((taxable * TAX_RATE) / 100);
    return {
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: taxable + tax,
      student: Boolean(student),
      cash: null,
      change: null,
    };
  }

  /** Read a saved bill back safely; returns null for old orders without one. */
  function cleanBill(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const money = (value) =>
      Number.isInteger(value) && value >= 0 && value <= 1000000000;
    if (!['subtotal', 'discount', 'tax', 'total'].every((k) => money(raw[k]))) {
      return null;
    }
    const optional = (value) => (money(value) ? value : null);
    return {
      subtotal: raw.subtotal,
      discount: raw.discount,
      tax: raw.tax,
      total: raw.total,
      student: raw.student === true,
      cash: optional(raw.cash),
      change: optional(raw.change),
    };
  }

  const itemKey = (item) => item.id + '|' + item.size;
  const itemLabel = (item) =>
    item.name + (item.size ? ' (' + item.size + ')' : '');

  /* ---------- Data cleaning (never trust what is in storage) ---------- */
  function cleanItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').slice(0, 100);
    const name = String(raw.name || '').slice(0, 100);
    const price = Number(raw.price);
    const qty = Math.floor(Number(raw.qty));
    if (!id || !name || !Number.isFinite(price) || price < 0) return null;
    if (!Number.isFinite(qty)) return null;
    return {
      id: id,
      name: name,
      size: String(raw.size || '').slice(0, 40),
      category: String(raw.category || '').slice(0, 60),
      price: price,
      qty: Math.min(MAX_QTY, Math.max(MIN_QTY, qty)),
    };
  }

  const cleanItems = (raw) =>
    Array.isArray(raw) ? raw.map(cleanItem).filter(Boolean) : [];

  function cleanOrder(raw) {
    if (!raw || typeof raw !== 'object' || !raw.customer) return null;
    const items = cleanItems(raw.items);
    if (!raw.orderNumber || !items.length) return null;
    const bill = cleanBill(raw.bill);
    return {
      orderNumber: String(raw.orderNumber).slice(0, 40),
      account: String(raw.account || '').slice(0, 100),
      status: ORDER_STATUSES.includes(raw.status) ? raw.status : 'new',
      updatedAt: String(raw.updatedAt || ''),
      createdAt: String(raw.createdAt || ''),
      customer: {
        name: String(raw.customer.name || '').slice(0, 60),
        phone: String(raw.customer.phone || '').slice(0, 30),
        orderType: String(raw.customer.orderType || '').slice(0, 20),
        notes: String(raw.customer.notes || '').slice(0, 200),
      },
      items: items,
      bill: bill, // null for orders made before tax/discount existed
      total: bill ? bill.total / 100 : totalCents(items) / 100,
    };
  }

  /* ---------- Cart + order storage ---------- */
  const getCart = () => cleanItems(readJSON(KEYS.cart, []));
  const getOrders = () => {
    const raw = readJSON(KEYS.orders, []);
    return Array.isArray(raw) ? raw.map(cleanOrder).filter(Boolean) : [];
  };

  function saveCart(cart) {
    const ok = writeJSON(KEYS.cart, cart);
    updateBadges(cart);
    return ok;
  }

  /** Live item count next to "Cart" in the nav. */
  function updateBadges(cart) {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    $$('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    });
    $$('[data-cart-count-label]').forEach((label) => {
      label.textContent = count
        ? ' (' + count + (count === 1 ? ' item' : ' items') + ' in cart)'
        : '';
    });
  }

  /** Add a product; same product + size increases the quantity. */
  function addToCart(product) {
    const item = cleanItem(product);
    if (!item) return 'error';
    const cart = getCart();
    const existing = cart.find((line) => itemKey(line) === itemKey(item));
    let result = 'ok';
    if (existing) {
      if (existing.qty >= MAX_QTY) return 'max';
      existing.qty = Math.min(MAX_QTY, existing.qty + item.qty);
    } else {
      cart.push(item);
    }
    return saveCart(cart) ? result : 'error';
  }

  /* ---------- Toast (polite live region, no alert boxes) ---------- */
  let toastEl = null;
  let toastTimer = null;

  function initToast() {
    toastEl = el('div', {
      class: 'toast',
      role: 'status',
      'aria-live': 'polite',
    });
    document.body.appendChild(toastEl);
  }

  function toast(message) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
  }

  /* ---------- Two-step confirm for destructive buttons ---------- */
  function twoStepButton(button, confirmLabel, onConfirm) {
    const original = button.textContent;
    let timer = null;
    const reset = () => {
      clearTimeout(timer);
      button.classList.remove('is-confirming');
      button.textContent = original;
    };
    button.addEventListener('click', () => {
      if (!button.classList.contains('is-confirming')) {
        button.classList.add('is-confirming');
        button.textContent = confirmLabel;
        timer = setTimeout(reset, 4000);
        return;
      }
      reset();
      onConfirm();
    });
    button.addEventListener('blur', reset);
  }

  /* ==========================================================
     Mobile navigation (keyboard accessible)
     ========================================================== */
  function initNav() {
    const button = $('.nav-toggle');
    const nav = $('#site-nav');
    if (!button || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    const isOpen = () => button.getAttribute('aria-expanded') === 'true';

    button.addEventListener('click', () => setOpen(!isOpen()));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (
        isOpen() &&
        !nav.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // Reset when the layout switches back to the desktop navigation
    window
      .matchMedia('(min-width: 1101px)')
      .addEventListener('change', (event) => {
        if (event.matches) setOpen(false);
      });
  }

  /* ==========================================================
     Form validation helpers (inline messages, no alert boxes)
     ========================================================== */
  const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .,'\u2019-]*$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validators = {
    name(value) {
      const v = value.trim();
      if (!v) return 'Enter your full name.';
      if (v.length < 2) return 'Your name must be at least 2 characters.';
      if (!NAME_RE.test(v)) {
        return 'Use letters only. Spaces, periods, commas, apostrophes and hyphens are fine.';
      }
      return '';
    },
    phone(value) {
      const v = value.trim();
      if (!v) return 'Enter your mobile number so we can reach you.';
      const digits = v.replace(/[\s().-]/g, '');
      if (!/^(\+63|0)9\d{9}$/.test(digits)) {
        return 'Enter a valid Philippine mobile number, like 0917 123 4567 or +63 917 123 4567.';
      }
      return '';
    },
    email(value) {
      const v = value.trim();
      if (!v) return 'Enter your email address.';
      if (!EMAIL_RE.test(v))
        return 'Enter a valid email address, like name@example.com.';
      return '';
    },
    message(value) {
      const v = value.trim();
      if (!v) return 'Write a message before sending.';
      if (v.length < 10)
        return 'Your message should be at least 10 characters.';
      return '';
    },
  };

  /**
   * A field = { group, error, controls[], validate() -> message }.
   * Shows/clears the message and the aria-invalid state.
   */
  function showError(field, message) {
    field.error.textContent = message;
    field.error.hidden = !message;
    field.group.classList.toggle('has-error', Boolean(message));
    field.controls.forEach((control) => {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    });
  }

  function validateField(field) {
    const message = field.validate();
    showError(field, message);
    return message;
  }

  /** Validate every field; returns the first invalid field (or null). */
  function validateAll(fields) {
    let first = null;
    fields.forEach((field) => {
      if (validateField(field) && !first) first = field;
    });
    return first;
  }

  /** Validate on blur; once an error shows, re-check as the person types. */
  function watchField(field) {
    field.controls.forEach((control) => {
      control.addEventListener('blur', () => {
        if (control.type === 'radio') return;
        if (control.value.trim() || !field.error.hidden) validateField(field);
      });
      const recheck = () => {
        if (!field.error.hidden) validateField(field);
      };
      control.addEventListener('input', recheck);
      control.addEventListener('change', recheck);
    });
  }

  function textField(id, validate) {
    const control = document.getElementById(id);
    return {
      group: control.closest('.form-group'),
      error: document.getElementById('err-' + id),
      controls: [control],
      validate: () => validate(control.value),
    };
  }

  /* ==========================================================
     Menu page: search, category filter, sort, add to cart
     ========================================================== */
  function initMenu() {
    const grid = $('#productsGrid');
    if (!grid) return;

    const status = $('#menuStatus');
    const emptyBox = $('#menuEmpty');
    const searchInput = $('#menuSearch');
    const sortSelect = $('#menuSort');
    const filterButtons = $$('.filter-btn');
    const state = { query: '', category: 'all', sort: 'default' };

    const items = $$('.product-card', grid).map((card) => ({
      card: card,
      name: card.dataset.name,
      category: card.dataset.category,
      price: Number(card.dataset.price),
      order: Number(card.dataset.order),
      search: card.dataset.search,
    }));

    const sorters = {
      default: (a, b) => a.order - b.order,
      'price-asc': (a, b) => a.price - b.price || a.order - b.order,
      'price-desc': (a, b) => b.price - a.price || a.order - b.order,
      name: (a, b) => a.name.localeCompare(b.name) || a.order - b.order,
    };

    function apply() {
      const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      items.forEach((item) => {
        const match =
          (state.category === 'all' || item.category === state.category) &&
          terms.every((term) => item.search.includes(term));
        item.card.hidden = !match;
        if (match) shown += 1;
      });

      items
        .slice()
        .sort(sorters[state.sort])
        .forEach((item) => grid.appendChild(item.card));

      const activeButton = filterButtons.find(
        (b) => b.dataset.category === state.category,
      );
      let text =
        shown === items.length
          ? 'Showing all ' + items.length + ' items'
          : 'Showing ' + shown + ' of ' + items.length + ' items';
      if (state.category !== 'all') text += ' in ' + activeButton.textContent;
      if (state.query.trim())
        text += ' matching \u201C' + state.query.trim() + '\u201D';
      status.textContent = text;

      grid.hidden = shown === 0;
      emptyBox.hidden = shown !== 0;
    }

    searchInput.addEventListener('input', () => {
      state.query = searchInput.value;
      apply();
    });

    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      apply();
    });

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        state.category = button.dataset.category;
        filterButtons.forEach((b) =>
          b.setAttribute('aria-pressed', String(b === button)),
        );
        apply();
      });
    });

    $('#menuReset').addEventListener('click', () => {
      state.query = '';
      state.category = 'all';
      searchInput.value = '';
      filterButtons.forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.category === 'all')),
      );
      apply();
      searchInput.focus();
    });

    // Add to cart (event delegation)
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('.add-to-cart');
      if (!button) return;
      const card = button.closest('.product-card');
      const select = $('.size-select', card);
      let size = '';
      let price;
      if (select) {
        const option = select.options[select.selectedIndex];
        size = option.value;
        price = Number(option.dataset.price);
      } else {
        price = Number(button.dataset.price);
      }
      const product = {
        id: card.dataset.id,
        name: card.dataset.name,
        size: size,
        category: card.dataset.categoryLabel,
        price: price,
        qty: 1,
      };
      const result = addToCart(product);
      if (result === 'ok') {
        toast('Added ' + itemLabel(product) + ' to your cart.');
      } else if (result === 'max') {
        toast(
          'You already have the maximum of ' +
            MAX_QTY +
            ' ' +
            itemLabel(product) +
            '.',
        );
      } else {
        toast("Couldn't save your cart. Your browser may be blocking storage.");
      }
    });

    apply();
  }

  /* ==========================================================
     Shared order summary list (success page + order history)
     ========================================================== */
  function itemsList(items) {
    return el(
      'ul',
      { class: 'order-items' },
      items.map((item) =>
        el('li', {}, [
          el('span', { text: item.qty + ' \u00D7 ' + itemLabel(item) }),
          el('span', { text: peso(lineCents(item)) }),
        ]),
      ),
    );
  }

  /** Subtotal, discount, tax, total and (when known) cash and change. */
  function billBlock(order) {
    const bill = order.bill;
    const row = (label, value, cls) =>
      el('div', { class: 'bill-row' + (cls ? ' ' + cls : '') }, [
        el('span', { text: label }),
        el('span', { text: value }),
      ]);
    const rows = [];
    if (bill) {
      rows.push(row('Subtotal', peso(bill.subtotal)));
      if (bill.discount) {
        rows.push(
          row(
            'Student discount (' + STUDENT_DISCOUNT_RATE + '%)',
            '\u2212' + peso(bill.discount),
            'bill-discount',
          ),
        );
      }
      rows.push(row('Tax (' + TAX_RATE + '%)', peso(bill.tax)));
    }
    rows.push(row('Total', peso(toCents(order.total)), 'order-total'));
    if (bill && bill.cash !== null) {
      rows.push(row('Cash', peso(bill.cash)));
      rows.push(row('Change', peso(bill.change), 'bill-change'));
    }
    return el('div', { class: 'bill' }, rows);
  }

  const formatDate = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('en-PH', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
  };

  /* ==========================================================
     Cart page
     ========================================================== */
  let renderCart = null; // set by initCart so the storage event can refresh it
  let updatePayment = null; // set by initCheckout: refreshes amount due and change

  function initCart() {
    const body = $('#cartBody');
    if (!body) return;

    const emptyBox = $('#cartEmpty');
    const filled = $('#cartFilled');
    const checkout = $('#checkoutSection');
    const subtotalEl = $('#cartSubtotal');
    const totalEl = $('#cartTotal');

    function cell(label, content, extraClass) {
      return el(
        'td',
        { role: 'cell', 'data-label': label, class: extraClass },
        [content],
      );
    }

    function buildRow(item) {
      const label = itemLabel(item);
      const qty = el('input', {
        class: 'qty-input',
        type: 'number',
        min: MIN_QTY,
        max: MAX_QTY,
        step: 1,
        inputmode: 'numeric',
        value: item.qty,
        'aria-label': 'Quantity for ' + label,
      });
      const remove = el('button', { type: 'button', class: 'remove-btn' }, [
        'Remove',
        el('span', { class: 'visually-hidden', text: ' ' + label }),
      ]);
      const nameCell = el('div', {}, [
        el('span', { class: 'item-name', text: item.name }),
        item.category
          ? el('span', { class: 'item-meta', text: item.category })
          : null,
      ]);
      const row = el('tr', { role: 'row', 'data-key': itemKey(item) });
      row.append(
        cell('Item', nameCell),
        cell('Size', document.createTextNode(item.size || 'Standard')),
        cell('Unit price', document.createTextNode(peso(toCents(item.price)))),
        cell('Quantity', qty),
        cell(
          'Line total',
          document.createTextNode(peso(lineCents(item))),
          'line-total',
        ),
        cell('', remove),
      );
      return row;
    }

    const findRow = (key) =>
      $$('tr', body).find((row) => row.dataset.key === key);

    const studentBox = $('#custStudent');

    function updateTotals(cart) {
      const bill = computeBill(cart, studentBox && studentBox.checked);
      subtotalEl.textContent = peso(bill.subtotal);
      $('#cartDiscountRow').hidden = !bill.student;
      $('#cartDiscount').textContent = '\u2212' + peso(bill.discount);
      $('#cartTax').textContent = peso(bill.tax);
      totalEl.textContent = peso(bill.total);
      if (updatePayment) updatePayment();
    }

    if (studentBox) {
      studentBox.addEventListener('change', () => updateTotals(getCart()));
    }

    function render() {
      const cart = getCart();
      const hasItems = cart.length > 0;
      emptyBox.hidden = hasItems;
      filled.hidden = !hasItems;
      checkout.hidden = !hasItems;
      body.replaceChildren(...cart.map(buildRow));
      updateTotals(cart);
      updateBadges(cart);
    }
    renderCart = render;

    function setQty(key, qty) {
      const cart = getCart();
      const item = cart.find((line) => itemKey(line) === key);
      if (!item) return;
      item.qty = qty;
      if (!saveCart(cart))
        toast("Couldn't save your cart. Your browser may be blocking storage.");
      const row = findRow(key);
      if (row) $('.line-total', row).textContent = peso(lineCents(item));
      updateTotals(cart);
    }

    // Quantity: update live for valid numbers, clamp when the field loses focus
    body.addEventListener('input', (event) => {
      const input = event.target.closest('.qty-input');
      if (!input) return;
      const n = Number(input.value);
      if (
        input.value !== '' &&
        Number.isInteger(n) &&
        n >= MIN_QTY &&
        n <= MAX_QTY
      ) {
        setQty(input.closest('tr').dataset.key, n);
      }
    });

    body.addEventListener('change', (event) => {
      const input = event.target.closest('.qty-input');
      if (!input) return;
      const raw = Number(input.value);
      let qty = Math.round(raw);
      if (!Number.isFinite(qty) || input.value === '') qty = MIN_QTY;
      const clamped = Math.min(MAX_QTY, Math.max(MIN_QTY, qty));
      if (clamped !== raw) {
        toast('Quantity must be between ' + MIN_QTY + ' and ' + MAX_QTY + '.');
      }
      input.value = clamped;
      setQty(input.closest('tr').dataset.key, clamped);
    });

    body.addEventListener('click', (event) => {
      const button = event.target.closest('.remove-btn');
      if (!button) return;
      const key = button.closest('tr').dataset.key;
      const before = getCart();
      const index = before.findIndex((line) => itemKey(line) === key);
      if (index === -1) return;
      const removed = before[index];
      const after = before.filter((line) => itemKey(line) !== key);
      saveCart(after);
      render();
      toast('Removed ' + itemLabel(removed) + ' from your cart.');
      // Keep keyboard focus somewhere sensible
      const buttons = $$('.remove-btn', body);
      if (buttons.length) buttons[Math.min(index, buttons.length - 1)].focus();
      else emptyBox.focus();
    });

    twoStepButton($('#clearCart'), 'Click again to confirm', () => {
      saveCart([]);
      render();
      emptyBox.focus();
      toast('Your cart is now empty.');
    });

    render();
    initCheckout();
  }

  /* ==========================================================
     Checkout form (lives on the cart page)
     ========================================================== */
  const ORDER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes

  function randomCode(length) {
    const values = new Uint32Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < length; i += 1)
        values[i] = Math.floor(Math.random() * 4294967296);
    }
    return Array.from(
      values,
      (v) => ORDER_CODE_CHARS[v % ORDER_CODE_CHARS.length],
    ).join('');
  }

  function newOrderNumber(existingOrders) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp =
      '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    let number;
    do {
      number = 'CL-' + stamp + '-' + randomCode(4);
    } while (existingOrders.some((order) => order.orderNumber === number));
    return number;
  }

  function initCheckout() {
    const form = $('#checkoutForm');
    if (!form) return;
    const formError = $('#checkoutError');

    const nameField = textField('custName', validators.name);
    const phoneField = textField('custPhone', validators.phone);
    const notesField = textField('custNotes', (v) =>
      v.length > 200 ? 'Notes can be up to 200 characters.' : '',
    );
    const radios = $$('input[name="orderType"]', form);
    const typeField = {
      group: radios[0].closest('.form-group'),
      error: $('#err-orderType'),
      controls: radios,
      validate: () =>
        radios.some((r) => r.checked) ? '' : 'Choose pickup or dine-in.',
    };
    // Payment: cash handed over, and the change worked out from the bill
    const studentBox = $('#custStudent');
    const cashInput = $('#custCash');
    const billNow = () => computeBill(getCart(), studentBox.checked);
    const parseCash = (value) => {
      const text = String(value).trim().replace(/,/g, '');
      const number = Number(text);
      return text !== '' && Number.isFinite(number)
        ? Math.round(number * 100)
        : null;
    };
    const cashField = {
      group: cashInput.closest('.form-group'),
      error: $('#err-custCash'),
      controls: [cashInput],
      validate: () => {
        if (!cashInput.value.trim()) {
          return 'Enter the cash amount you will pay with.';
        }
        const cash = parseCash(cashInput.value);
        if (cash === null || cash <= 0) {
          return 'Enter a valid amount, like 500 or 250.50.';
        }
        if (cash > MAX_CASH_CENTS) return 'That amount is too large.';
        const due = billNow().total;
        if (cash < due) {
          return 'Cash must be at least ' + peso(due) + ' to cover the bill.';
        }
        return '';
      },
    };
    updatePayment = () => {
      const due = billNow().total;
      const cash = parseCash(cashInput.value);
      $('#cashDue').textContent = peso(due);
      $('#cashChange').textContent =
        cash !== null && cash >= due && cash <= MAX_CASH_CENTS
          ? peso(cash - due)
          : '\u2014';
      if (!cashField.error.hidden) validateField(cashField);
    };
    cashInput.addEventListener('input', updatePayment);

    const fields = [nameField, phoneField, typeField, cashField, notesField];
    fields.forEach(watchField);
    updatePayment();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      formError.hidden = true;

      const firstInvalid = validateAll(fields);
      if (firstInvalid) {
        const count = fields.filter((f) => !f.error.hidden).length;
        formError.textContent =
          count === 1
            ? 'Please fix the highlighted field and try again.'
            : 'Please fix the ' + count + ' highlighted fields and try again.';
        formError.hidden = false;
        firstInvalid.controls[0].focus();
        return;
      }

      const cart = getCart();
      if (!cart.length) {
        formError.textContent =
          'Your cart is empty. Add something from the menu first.';
        formError.hidden = false;
        if (renderCart) renderCart();
        return;
      }

      const bill = computeBill(cart, studentBox.checked);
      bill.cash = parseCash(cashInput.value);
      bill.change = bill.cash - bill.total;

      const orders = getOrders();
      const order = {
        orderNumber: newOrderNumber(orders),
        account: (getSession() || {}).email || '',
        status: 'new',
        createdAt: new Date().toISOString(),
        customer: {
          name: $('#custName').value.trim(),
          phone: $('#custPhone').value.trim(),
          orderType: radios.find((r) => r.checked).value,
          notes: $('#custNotes').value.trim(),
        },
        items: cart,
        bill: bill,
        total: bill.total / 100,
      };

      orders.unshift(order);
      orders.length = Math.min(orders.length, MAX_ORDERS);

      // Only clear the cart once the order is safely saved
      if (!writeJSON(KEYS.orders, orders)) {
        formError.textContent =
          "We couldn't save your order because your browser is blocking storage. Your cart is unchanged.";
        formError.hidden = false;
        formError.focus();
        return;
      }
      saveCart([]);
      window.location.href = 'checkout-success.html';
    });
  }

  /* ==========================================================
     Order confirmation page
     ========================================================== */
  function initSuccess() {
    const root = $('#orderRoot');
    if (!root) return;

    const order = getOrders()[0];
    const age = order ? Date.now() - Date.parse(order.createdAt) : NaN;
    // No recent order (or a bad timestamp): send the visitor home
    if (!order || !(age >= -60000 && age <= RECENT_ORDER_MS)) {
      window.location.replace('index.html');
      return;
    }

    const count = order.items.reduce((n, item) => n + item.qty, 0);
    root.replaceChildren(
      ...[
        el('h2', { text: 'Order Placed Successfully!' }),
        el('p', {
          text:
            'Thank you, ' +
            order.customer.name +
            '! Your order is being prepared.',
        }),
        el('p', { text: 'Your order number' }),
        el('span', { class: 'order-number', text: order.orderNumber }),
        el('p', {
          text:
            order.customer.orderType +
            ' \u00B7 ' +
            count +
            (count === 1 ? ' item' : ' items'),
        }),
        el('div', { class: 'order-summary' }, [
          itemsList(order.items),
          billBlock(order),
        ]),
        order.customer.notes
          ? el('p', { text: 'Your notes: ' + order.customer.notes })
          : null,
        order.bill && order.bill.student
          ? el('p', {
              text: 'Student discount applied: please show a valid student ID at the counter.',
            })
          : null,
        el('p', {
          text: 'Please pay at the counter. This is a student demo, so no payment is taken online.',
        }),
        el('div', { class: 'success-actions' }, [
          el('a', {
            href: 'index.html',
            class: 'hero-btn',
            text: 'Return Home',
          }),
          el('a', {
            href: 'products.html',
            class: 'btn-outline',
            text: 'Browse Menu',
          }),
          el('a', {
            href: 'orders.html',
            class: 'btn-outline',
            text: 'My Orders',
          }),
        ]),
      ].filter(Boolean),
    );
    root.setAttribute('tabindex', '-1');
    root.focus();
  }

  /* ==========================================================
     Order history page
     ========================================================== */
  function initOrders() {
    const list = $('#ordersList');
    if (!list) return;
    const emptyBox = $('#ordersEmpty');
    const filled = $('#ordersFilled');
    const count = $('#ordersCount');

    function render() {
      const orders = getOrders();
      emptyBox.hidden = orders.length > 0;
      filled.hidden = orders.length === 0;
      count.textContent =
        orders.length +
        (orders.length === 1 ? ' order' : ' orders') +
        ' on this device';
      list.replaceChildren(
        ...orders.map((order) => {
          const units = order.items.reduce((n, item) => n + item.qty, 0);
          const when = formatDate(order.createdAt);
          return el('article', { class: 'order-card' }, [
            el('div', { class: 'order-head' }, [
              el('h3', { text: order.orderNumber }),
              el('span', {
                class: 'status-badge status-' + order.status,
                text: STATUS_LABELS[order.status],
              }),
              when
                ? el('time', {
                    class: 'order-date',
                    datetime: order.createdAt,
                    text: when,
                  })
                : null,
            ]),
            el('p', {
              class: 'order-meta',
              text:
                order.customer.orderType +
                ' for ' +
                order.customer.name +
                ' \u00B7 ' +
                units +
                (units === 1 ? ' item' : ' items'),
            }),
            itemsList(order.items),
            order.customer.notes
              ? el('p', {
                  class: 'order-meta',
                  text: 'Notes: ' + order.customer.notes,
                })
              : null,
            billBlock(order),
          ]);
        }),
      );
    }

    twoStepButton($('#clearOrders'), 'Click again to confirm', () => {
      writeJSON(KEYS.orders, []);
      render();
      emptyBox.setAttribute('tabindex', '-1');
      emptyBox.focus();
      toast('Order history cleared.');
    });

    render();
  }

  /* ==========================================================
     Contact form on the About page (demo only, nothing is sent)
     ========================================================== */
  function initContact() {
    const form = $('#contactForm');
    if (!form) return;
    const thanks = $('#contactThanks');
    const fields = [
      textField('contactName', validators.name),
      textField('contactEmail', validators.email),
      textField('contactMessage', validators.message),
    ];
    fields.forEach(watchField);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstInvalid = validateAll(fields);
      if (firstInvalid) {
        firstInvalid.controls[0].focus();
        return;
      }
      $('#contactThanksText').textContent =
        'Thanks, ' +
        $('#contactName').value.trim() +
        '! This is a demo form, so your message was not sent or saved anywhere.';
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus();
    });

    $('#contactAgain').addEventListener('click', () => {
      form.reset();
      fields.forEach((field) => showError(field, ''));
      thanks.hidden = true;
      form.hidden = false;
      $('#contactName').focus();
    });
  }

  /* ==========================================================
     Demo login + staff dashboard

     Front-end only: the "staff" check is just the email ending, so
     this is NOT real security. It is a classroom demo and must not
     be used to protect real data.
     ========================================================== */
  const STAFF_SUFFIX = '@tip.edu.ph';
  const roleFor = (email) =>
    email.toLowerCase().endsWith(STAFF_SUFFIX) ? 'staff' : 'customer';

  function getSession() {
    const raw = readJSON(KEYS.session, null);
    if (!raw || typeof raw.email !== 'string' || !EMAIL_RE.test(raw.email))
      return null;
    const email = raw.email.slice(0, 100).toLowerCase();
    return { email: email, role: roleFor(email) }; // role is always derived, never stored
  }

  function endSession() {
    try {
      window.localStorage.removeItem(KEYS.session);
    } catch (err) {
      /* storage blocked: nothing to remove */
    }
  }

  /** On the login page: handle ?logout=1 and ?reason=staff, return a message. */
  function readLoginParams() {
    if (!$('#loginForm')) return '';
    const params = new URLSearchParams(window.location.search);
    let message = '';
    if (params.get('logout') === '1') {
      endSession();
      message = 'You have been logged out.';
    } else if (params.get('reason') === 'staff') {
      message =
        'The dashboard is for staff only. Log in with your @tip.edu.ph email.';
    }
    if (message) {
      try {
        window.history.replaceState(null, '', 'login.html');
      } catch (err) {
        /* replaceState can be blocked on file:// - harmless */
      }
    }
    return message;
  }

  /** Nav/footer: "Login" becomes "Logout"; "Dashboard" shows for staff only. */
  function initAuthNav() {
    const session = getSession();
    $$('a[href="login.html"]').forEach((link) => {
      if (!session) return;
      link.textContent = 'Logout';
      link.setAttribute('href', 'login.html?logout=1');
      link.removeAttribute('aria-current');
    });
    $$('[data-staff-nav]').forEach((item) => {
      item.hidden = !(session && session.role === 'staff');
    });
  }

  function initLogin(message) {
    const form = $('#loginForm');
    if (!form) return;
    const note = $('#loginMessage');
    const done = $('#loginDone');
    const errorBox = $('#loginError');
    if (message) {
      note.textContent = message;
      note.hidden = false;
    }

    const session = getSession();
    if (session) {
      form.hidden = true;
      $('#loginDoneText').textContent =
        'You are logged in as ' + session.email + ' (' + session.role + ').';
      $('#loginDashboardLink').hidden = session.role !== 'staff';
      done.hidden = false;
      return;
    }

    const field = textField('loginEmail', validators.email);
    watchField(field);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      if (validateField(field)) {
        $('#loginEmail').focus();
        return;
      }
      const email = $('#loginEmail').value.trim().toLowerCase();
      if (!writeJSON(KEYS.session, { email: email, at: Date.now() })) {
        errorBox.textContent =
          "We couldn't log you in because your browser is blocking storage.";
        errorBox.hidden = false;
        return;
      }
      // Staff go straight to the dashboard, customers to the home page
      window.location.href =
        roleFor(email) === 'staff' ? 'dashboard.html' : 'index.html';
    });
  }

  let renderDash = null; // set by initDashboard so the storage event can refresh it

  // Buttons offered on each ticket, by current status
  const STATUS_ACTIONS = {
    new: [
      { to: 'preparing', label: 'Start preparing', cls: 'product-btn' },
      { to: 'done', label: 'Mark as done', cls: 'product-btn btn-success' },
    ],
    preparing: [
      { to: 'done', label: 'Mark as done', cls: 'product-btn btn-success' },
    ],
    done: [{ to: 'new', label: 'Reopen', cls: 'btn-outline btn-small' }],
  };
  const STATUS_MESSAGES = {
    new: ' was reopened.',
    preparing: ' is now being prepared.',
    done: ' was marked as done.',
  };

  function timeAgo(iso) {
    const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    if (!Number.isFinite(minutes)) return '';
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + ' min ago';
    if (minutes < 1440) return Math.floor(minutes / 60) + ' hr ago';
    const days = Math.floor(minutes / 1440);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  function setOrderStatus(orderNumber, status) {
    const orders = getOrders();
    const order = orders.find((o) => o.orderNumber === orderNumber);
    if (!order) return false;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    return writeJSON(KEYS.orders, orders);
  }

  function initDashboard() {
    const root = $('#dashRoot');
    if (!root) return;
    const session = getSession();
    if (!session || session.role !== 'staff') {
      window.location.replace('login.html?reason=staff');
      return;
    }
    root.hidden = false;
    $('#dashWho').textContent = 'Logged in as ' + session.email + ' (staff)';

    const list = $('#dashList');
    const emptyBox = $('#dashEmpty');
    const searchInput = $('#dashSearch');
    const filterButtons = $$('#dashFilters .filter-btn');
    const state = { status: 'all', query: '' };

    function buildTicket(order) {
      const when = formatDate(order.createdAt);
      const ago = timeAgo(order.createdAt);
      const actions = STATUS_ACTIONS[order.status].map((action) =>
        el(
          'button',
          { type: 'button', class: action.cls, 'data-to': action.to },
          [
            action.label,
            el('span', {
              class: 'visually-hidden',
              text: ' ' + order.orderNumber,
            }),
          ],
        ),
      );
      return el(
        'article',
        {
          class: 'ticket',
          'data-status': order.status,
          'data-order': order.orderNumber,
        },
        [
          el('div', { class: 'ticket-head' }, [
            el('div', {}, [
              el('h3', { text: order.orderNumber }),
              when
                ? el('time', {
                    class: 'ticket-time',
                    datetime: order.createdAt,
                    text: when + (ago ? ' \u00B7 ' + ago : ''),
                  })
                : null,
            ]),
            el('span', {
              class: 'status-badge status-' + order.status,
              text: STATUS_LABELS[order.status],
            }),
          ]),
          el('p', { class: 'ticket-meta' }, [
            el('span', { class: 'type-pill', text: order.customer.orderType }),
            order.bill && order.bill.student
              ? el('span', { class: 'student-pill', text: 'Student ID check' })
              : null,
            el('strong', { text: order.customer.name }),
            ' \u00B7 ' + order.customer.phone,
            order.account
              ? el('span', {
                  class: 'item-meta',
                  text: 'Account: ' + order.account,
                })
              : null,
          ]),
          itemsList(order.items),
          order.customer.notes
            ? el('p', {
                class: 'ticket-notes',
                text: 'Notes: ' + order.customer.notes,
              })
            : null,
          billBlock(order),
          el('div', { class: 'ticket-actions' }, actions),
        ],
      );
    }

    function render(focusOrder) {
      const all = getOrders().sort(
        (a, b) =>
          (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
      );
      const counts = { all: all.length, new: 0, preparing: 0, done: 0 };
      all.forEach((order) => {
        counts[order.status] += 1;
      });

      $('#statNew').textContent = String(counts.new);
      $('#statPreparing').textContent = String(counts.preparing);
      $('#statDone').textContent = String(counts.done);
      $('#statSales').textContent = peso(
        all.reduce((sum, order) => sum + toCents(order.total), 0),
      );
      filterButtons.forEach((button) => {
        $('.count', button).textContent = String(counts[button.dataset.status]);
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.status === state.status),
        );
      });

      const query = state.query.trim().toLowerCase();
      const shown = all.filter((order) => {
        if (state.status !== 'all' && order.status !== state.status)
          return false;
        if (!query) return true;
        const haystack = [
          order.orderNumber,
          order.customer.name,
          order.customer.phone,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });

      $('#dashStatus').textContent = all.length
        ? 'Showing ' +
          shown.length +
          ' of ' +
          all.length +
          (all.length === 1 ? ' order' : ' orders')
        : '';
      $('#dashEmptyText').textContent = all.length
        ? 'No orders match your search or filter.'
        : 'No orders yet. Orders placed in this browser will appear here.';
      emptyBox.hidden = shown.length > 0;
      list.hidden = shown.length === 0;
      list.replaceChildren(...shown.map(buildTicket));

      // Keep keyboard focus where the staff member was working
      if (focusOrder) {
        const ticket = $$('.ticket', list).find(
          (t) => t.dataset.order === focusOrder,
        );
        const button = ticket && $('.ticket-actions button', ticket);
        if (button) button.focus();
        else if (list.hidden) emptyBox.focus();
        else list.focus();
      }
    }
    renderDash = render;

    list.addEventListener('click', (event) => {
      const button = event.target.closest('.ticket-actions button');
      if (!button) return;
      const orderNumber = button.closest('.ticket').dataset.order;
      const status = button.dataset.to;
      if (setOrderStatus(orderNumber, status)) {
        toast('Order ' + orderNumber + STATUS_MESSAGES[status]);
        render(orderNumber);
      } else {
        toast(
          "Couldn't save the change. Your browser may be blocking storage.",
        );
      }
    });

    searchInput.addEventListener('input', () => {
      state.query = searchInput.value;
      render();
    });

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        state.status = button.dataset.status;
        render();
      });
    });

    render();
  }

  /* ==========================================================
     Start
     ========================================================== */
  const loginMessage = readLoginParams(); // may log out, so run before the nav is built
  initNav();
  initAuthNav();
  initToast();
  updateBadges(getCart());
  initMenu();
  initCart();
  initSuccess();
  initOrders();
  initContact();
  initLogin(loginMessage);
  initDashboard();

  // Keep the badge (and cart page) in sync when another tab changes the cart
  window.addEventListener('storage', (event) => {
    if (event.key === KEYS.orders && renderDash) renderDash(); // new order from another tab
    if (event.key !== KEYS.cart) return;
    if (renderCart) renderCart();
    else updateBadges(getCart());
  });
})();
