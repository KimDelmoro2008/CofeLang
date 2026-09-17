<p align="center">
  <img src="assets/logo.svg" alt="CofeLang Logo" width="160">
</p>

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
| Kim Delmoro | Founder & Lead Developer |
| Raniel Magpatoc | Front-End Developer & Co-Founder |
| Wadanhyll Shaun Tolentino | Web Designer & Co-Founder |
| John Dexter Miraflor | Back-End Developer |
| Madelaine Lano | UI Designer & Logo Designer |
| Cleo Ken Miguel Ramos | Content Strategist |
| Justin Kobe Litonjua | Web Tester |
| Lance Jairus Jamito | Documentation Lead |

See [`developers.html`](developers.html) for full bios.

## License

This project is licensed under the **GPL-3.0 License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">© 2026 CofeLang. All rights reserved.</p>
