<p align="center">
  <img src="assets/logo.svg" alt="CofeLang Logo" width="160">
</p>

<<<<<<< HEAD
**Brew & Bytes for Students** — a student-friendly cafe website beside TIP on Aurora Blvd, Quezon City.

CofeLang is the Group 5 final project: a static, multi-page cafe site with a working cart and checkout. It uses **only HTML, CSS and vanilla JavaScript**. There is no backend, no database, no framework and no build step, so it runs anywhere static files can be served (including Vercel).

## Features

- **Menu of 78 items** with live search, category filter buttons and sorting (price low to high, high to low, or name).
- **Allergen notes** (milk, nuts, gluten, egg) on relevant items.
- **Working cart** saved in `localStorage`: add items, choose a size (Regular/Large or Classic/Large), edit quantities (1 to 50), remove items or clear the cart. A live item count shows next to "Cart" in the nav on every page.
- **Checkout** for pickup or dine-in with inline form validation (no alert boxes). Orders are saved in the browser, and a confirmation page shows the order number.
- **Bill breakdown**: subtotal, an optional **20% student discount** (student ID is checked at the counter), **12% tax** and the total. The customer types the **cash** they will pay with and sees their **change**. The full bill is saved with each order and shown on the confirmation page, My Orders and the staff dashboard.
- **My Orders** page listing past orders from this device.
- **Demo login and staff dashboard**: log in with any email. An email ending in `@tip.edu.ph` is treated as staff and goes straight to `dashboard.html`, an order board for this browser's orders: status tracking (New → Preparing → Done) with buttons to update each order, status filters with counts, search by order number, name or phone, and a live update when a new order arrives from another tab. Customers see the status on their My Orders page. Other emails are customers and go to the home page. **This is a front-end demo, not real security** (see below).
- **Responsive and accessible**: mobile hamburger menu that works with the keyboard, skip link, landmarks, visible focus styles, `aria-current` on the active link, stacked tables on phones.
- **SEO basics**: unique titles and descriptions, Open Graph tags, `robots.txt`, `sitemap.xml`, and a styled `404.html`.
- **About page contact form** (demo only: nothing is sent), plus Privacy and Terms placeholder pages and a Developers page.

## Screenshots

> Screenshots coming soon. Add images to a `docs/` folder and link them here, for example:
>
> `![Home page](docs/home.png)`

## Tech stack

| Layer | What we used |
| --- | --- |
| Markup | HTML5 (semantic elements, ARIA where needed) |
| Styling | One shared `styles.css` (CSS custom properties, Grid, Flexbox) |
| Behaviour | One shared `script.js` (vanilla JavaScript, `localStorage`) |
| Fonts | Playfair Display via Google Fonts |
| Hosting | Vercel (static) |

No npm packages, no database, no server code.

## Folder structure

```text
CofeLang/
├── index.html              Home
├── about.html              About + demo contact form
├── products.html           Menu with search, filter, sort, Add to Cart
├── cart.html               Cart + checkout form
├── checkout-success.html   Order confirmation
├── orders.html             My Orders (order history)
├── login.html              Demo login (customer or staff)
├── dashboard.html          Staff dashboard (demo)
├── developers.html         Team
├── privacy.html            Privacy Policy (placeholder)
├── terms.html              Terms of Service (placeholder)
├── 404.html                Not-found page
├── styles.css              All styles
├── script.js               All behaviour
├── robots.txt
├── sitemap.xml
├── LICENSE                 GPL-3.0
├── .gitignore
└── assets/
    ├── logo.svg
    ├── og-image.png        Social sharing image
    ├── cozy-cafe-interior.avif
    ├── icon/logo.ico       Favicon
    ├── developers/         Team photos
    └── products/           One lowercase folder per menu category
        ├── pastries/  pizza/  pasta/  rice-meals/  starters/
        └── hot-coffee/  hot-tea/  milk-tea/  iced-coffee/
            frappe/  fruit-tea/  sparkle/
```

All file and folder names are lowercase with no spaces, because Vercel serves from Linux and paths are case-sensitive.

## How the bill is calculated

1. **Subtotal** = sum of (unit price × quantity).
2. **Student discount** (only if ticked) = 20% of the subtotal.
3. **Tax** = 12% of the subtotal after the discount.
4. **Total** = subtotal − discount + tax.
5. **Change** = cash − total. The cash must be at least the total.

Amounts are worked out in centavos (whole numbers) and rounded to the nearest centavo, so there are no floating-point errors. The rates are the constants `STUDENT_DISCOUNT_RATE` and `TAX_RATE` at the top of `script.js`.

## How data is stored

Everything lives in the visitor's own browser (`localStorage`):

| Key | Contents |
| --- | --- |
| `cofelang.cart.v1` | `[{ id, name, size, category, price, qty }]` |
| `cofelang.orders.v1` | `[{ orderNumber, account, status, createdAt, customer, items, total }]` |
| `cofelang.session.v1` | `{ email, at }` (demo login; the role is worked out from the email each time) |

Clearing site data in the browser, or using the **Clear Cart** and **Clear Order History** buttons, removes it. Orders are demos: nothing is sent anywhere and no payment is taken.

## About the demo login and dashboard

The site has no server, so the login and dashboard are a **classroom simulation**:

- There is no password, and "staff" simply means the email ends with `@tip.edu.ph`. Anyone can type such an email, or edit their own browser storage, and open the dashboard.
- The dashboard only shows orders saved in **the same browser** it is opened in. Orders placed on a customer's phone never reach a staff computer.
- Do not use this approach to protect real data. A real version needs a backend (for example a hosted database with verified sign-in) so staff roles are enforced on a server.

## Run locally

**Option 1: open the file.** Double-click `index.html`. Everything works from `file://`.

**Option 2: use a simple static server** (closer to how Vercel serves it). From the project folder, run one of:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

> The 404 page uses `<base href="/">` so it works at any missing URL on a server. When opened directly as a file, its links will not resolve; that is expected.

## Deploy on Vercel

1. Push the project to GitHub (repo `KimDelmoro2008/CofeLang`).
2. Sign in at [vercel.com](https://vercel.com) and choose **Add New… → Project**, then import the repository.
3. Settings: **Framework Preset: Other**, leave **Build Command** and **Output Directory** empty, and keep the **Root Directory** as the repo root.
4. Click **Deploy**. Vercel serves `index.html` at the root URL and automatically uses `404.html` for missing pages.

No `vercel.json` is needed. Every internal link uses a plain `.html` path, so the site also works when opened locally.

### Before going live: update the site URL

`robots.txt`, `sitemap.xml` and each page's `og:image` tag use the placeholder domain `https://cofelang.vercel.app`. If your real Vercel domain is different, search and replace it in those files.

## Content notes to confirm

- The phone number (`+63 900 000 0000`) and email (`hello@cofelang.example`) are **sample values** and are marked "(sample)" in the footer.
- The **allergen tags** on the menu are a best guess based on the item descriptions. The cafe should verify them before they are relied on.

## Team

CofeLang Web Development Team (Technological Institute of the Philippines):

| Name | Role |
| --- | --- |
=======
<h1 align="center">CofeLang</h1>
<p align="center"><em>Brew &amp; Bytes for Students</em></p>

<p align="center">
  <a href="https://group-5-final-project-website.vercel.app">🔗 Live Site</a> ·
  <a href="#pages">Pages</a> ·
  <a href="#menu">Menu</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#developers">Developers</a> ·
  <a href="#license">License</a>
</p>

---

## About

**CofeLang** is a static, multi-page website for a student-friendly cafe concept located beside the **Technological Institute of the Philippines (TIP)**, Aurora Blvd, Quezon City. The site was built as a Group 5 final project by a team of BS Information Technology students at TIP.

The name **"CofeLang"** combines *"Coffee"* with *"Lang"* — a Filipino word used in casual conversation — symbolizing the idea that every cup of coffee brings people together. Founded (in-story) in 2026, CofeLang grew from a small campus stall into a cafe known for its warm atmosphere, friendly staff, and student-friendly prices.

- 📍 **Location:** Aurora Blvd, beside TIP, Quezon City
- ⏰ **Hours:** Mon–Fri 7:00 AM–10:00 PM · Sat–Sun 8:00 AM–11:00 PM
- ✉️ **Contact:** info@cofelang.com

### Core Values

| Value | What it means |
|---|---|
| **Quality** | Only the finest ingredients, for a consistently high standard. |
| **Affordability** | Prices designed to fit a student's budget. |
| **Inclusivity** | A safe, welcoming space for everyone, regardless of background. |
| **Innovation** | A menu and service that keep improving to fit the community's needs. |

## Pages

| Page | Description |
|---|---|
| `index.html` | Home page — hero banner, "Why CofeLang?" intro, feature highlights, best-seller products, and an embedded map to the branch. |
| `about.html` | About Us — CofeLang's origin story and core values. |
| `products.html` | Full menu — 79 items across 13 categories, with a pure-CSS (no JavaScript) category filter. |
| `cart.html` | Shopping cart page with order form elements. |
| `checkout-success.html` | Order confirmation page shown after checkout. |
| `developers.html` | Meet the team behind the site, their roles, and the tools used to build it. |

## Menu

The menu (`products.html`) is organized into 13 filterable categories:

Pastries · Pizza · Pasta · Rice Meals · Starters · Hot Coffee · Hot Tea · Milk Tea · Iced Coffee · Frappe · Fruit Tea · Sparkle · Add-ons

Category filtering is done entirely with a CSS-only radio button/label technique — no JavaScript required.

## Tech Stack

CofeLang is built with **plain HTML5 and CSS3** — no frameworks, no build step.

- **HTML5** — semantic markup, forms, and an embedded Google Maps iframe for geolocation
- **CSS3** — Flexbox, Grid, gradients, transitions, CSS-only filtering, and responsive design (`styles.css`)
- **Google Fonts** — Playfair Display
- **Visual Studio Code** — primary editor used throughout development

## Getting Started

This is a static site, so no installation or build process is required.

```bash
git clone https://github.com/KimDelmoro2008/CofeLang.git
cd CofeLang
```

Then simply open `index.html` in your browser, or serve the folder with any static file server, e.g.:

```bash
npx serve .
```

The live version is deployed on Vercel: **[group-5-final-project-website.vercel.app](https://group-5-final-project-website.vercel.app)**

## Project Structure

```
CofeLang/
├── assets/                  # Images, product photos, developer photos, logo, favicon
├── index.html                # Home page
├── about.html                 # About Us page
├── products.html              # Menu / product catalog (79 items, 13 categories)
├── cart.html                  # Shopping cart page
├── checkout-success.html      # Order confirmation page
├── developers.html            # Meet the team page
├── styles.css                 # Shared stylesheet for all pages
├── logo.svg                   # CofeLang logo
└── LICENSE                    # GPL-3.0 license
```

## Developers

Built by the **CofeLang Web Development Team**, IT students at the Technological Institute of the Philippines:

| Name | Role |
|---|---|
>>>>>>> 9ca6e828a57c1f0e546b81a36505872b1096c9c6
| Kim Delmoro | Founder & Lead Developer |
| Raniel Magpatoc | Front-End Developer & Co-Founder |
| Wadanhyll Shaun Tolentino | Web Designer & Co-Founder |
| John Dexter Miraflor | Back-End Developer |
| Madelaine Lano | UI Designer & Logo Designer |
<<<<<<< HEAD
| Cleo Ken Miguel Ramos | Logo Designer |
| Justin Kobe Litonjua | Web Tester |
| Lance Jairus Jamito | Documentation Lead |

## License

Released under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for the full text.
=======
| Cleo Ken Miguel Ramos | Content Strategist |
| Justin Kobe Litonjua | Web Tester |
| Lance Jairus Jamito | Documentation Lead |

See [`developers.html`](developers.html) for full bios.

## License

This project is licensed under the **GPL-3.0 License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">© 2026 CofeLang. All rights reserved.</p>
>>>>>>> 9ca6e828a57c1f0e546b81a36505872b1096c9c6
