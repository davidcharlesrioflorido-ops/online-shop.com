import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
SUPABASE
========================================================= */

const SUPABASE_URL =
"https://jnhqfdvddyivuiqcsmux.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";

const supabase = createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY,
{
auth: {
persistSession: false,
autoRefreshToken: false,
detectSessionInUrl: false,
},
}
);

/* =========================================================
ELEMENTS
========================================================= */

const shopNameNav =
document.getElementById("shopNameNav");

const shopNameFooter =
document.getElementById("shopNameFooter");

const shopDescriptionHero =
document.getElementById("shopDescriptionHero");

const shopDescriptionAbout =
document.getElementById("shopDescriptionAbout");

const shopCtaDescription =
document.getElementById("shopCtaDescription");

const shopHeroName =
document.getElementById("shopHeroName");

const shopHeroDescription =
document.getElementById("shopHeroDescription");

const shopLogoIcon =
document.getElementById("shopLogoIcon");

const shopHeroLogo =
document.getElementById("shopHeroLogo");

const shopBannerVisual =
document.getElementById("shopBannerVisual");

const homeBannerImage =
document.getElementById("homeBannerImage");

const shopAnnouncementBar =
document.getElementById("shopAnnouncementBar");

const shopAnnouncement =
document.getElementById("shopAnnouncement");

const featuredProducts =
document.getElementById("featuredProducts");

/* =========================================================
DEFAULT VALUES
========================================================= */

const DEFAULT_SHOP_NAME =
"Business Store";

const DEFAULT_DESCRIPTION =
"Discover quality products for your everyday needs. Browse our collection, choose what you need, and enjoy a simple shopping experience.";

/* =========================================================
CUSTOMER LOGIN PAGE
========================================================= */

const CUSTOMER_LOGIN_PAGE =
"login.html";

/* =========================================================
FORMAT PRICE
========================================================= */

function formatPrice(value) {

const amount = Number(value);

if (!Number.isFinite(amount)) {
return "Price unavailable";
}

return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHtml(value) {

return String(value ?? "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#39;");
}

/* =========================================================
LOAD SHOP SETTINGS
========================================================= */

async function loadShopSettings() {

try {

console.log(
  "Loading shop settings..."
);


const {
  data,
  error
} = await supabase

  .from("shop_settings")

  .select("*")

  .order("created_at", {
    ascending: true,
  })

  .limit(1)

  .maybeSingle();


if (error) {

  console.error(
    "SHOP SETTINGS ERROR:",
    error
  );

  applyDefaultSettings();

  return;
}


if (!data) {

  console.warn(
    "No shop settings found."
  );

  applyDefaultSettings();

  return;
}


console.log(
  "SHOP SETTINGS LOADED:",
  data
);


applyShopSettings(data);

} catch (error) {

console.error(
  "LOAD SHOP SETTINGS ERROR:",
  error
);

applyDefaultSettings();

}
}

/* =========================================================
DEFAULT SHOP SETTINGS
========================================================= */

function applyDefaultSettings() {

if (shopNameNav) {

shopNameNav.textContent =
  DEFAULT_SHOP_NAME;

}

if (shopNameFooter) {

shopNameFooter.textContent =
  DEFAULT_SHOP_NAME;

}

if (shopHeroName) {

shopHeroName.textContent =
  DEFAULT_SHOP_NAME;

}

if (shopDescriptionHero) {

shopDescriptionHero.textContent =
  DEFAULT_DESCRIPTION;

}

if (shopDescriptionAbout) {

shopDescriptionAbout.textContent =
  DEFAULT_DESCRIPTION;

}

if (shopHeroDescription) {

shopHeroDescription.textContent =
  DEFAULT_DESCRIPTION;

}

if (shopCtaDescription) {

shopCtaDescription.textContent =
  `Browse ${DEFAULT_SHOP_NAME}'s collection and discover what we have available.`;

}

document.title =
  `${DEFAULT_SHOP_NAME} | Online Store`;

/* =======================================================
HOME BANNER FALLBACK
======================================================= */

resetHomeBanner();

}

/* =========================================================
APPLY SHOP SETTINGS
========================================================= */

function applyShopSettings(settings) {

const shopName =
settings.shop_name?.trim() ||
DEFAULT_SHOP_NAME;

const description =
settings.shop_description?.trim() ||
DEFAULT_DESCRIPTION;

/* =====================================================
SHOP NAME
===================================================== */

if (shopNameNav) {

shopNameNav.textContent =
  shopName;

}

if (shopNameFooter) {

shopNameFooter.textContent =
  shopName;

}

if (shopHeroName) {

shopHeroName.textContent =
  shopName;

}

document.title =
`${shopName} | Online Store`;

/* =====================================================
DESCRIPTION
===================================================== */

if (shopDescriptionHero) {

shopDescriptionHero.textContent =
  description;

}

if (shopDescriptionAbout) {

shopDescriptionAbout.textContent =
  description;

}

if (shopHeroDescription) {

shopHeroDescription.textContent =
  description;

}

if (shopCtaDescription) {

shopCtaDescription.textContent =
  `Browse ${shopName}'s collection and discover what we have available.`;

}

/* =====================================================
LOGO
===================================================== */

const logoUrl =
settings.logo_url?.trim();

if (logoUrl) {

setShopLogo(logoUrl);

} else {

resetShopLogo();

}

/* =====================================================
HOME PAGE BANNER

 IMPORTANT:
 
 This uses:
 
 shop_settings.home_banner_url
 
 NOT:
 
 shop_settings.banner_url

===================================================== */

const homeBannerUrl =
settings.home_banner_url?.trim();

if (homeBannerUrl) {

setHomeBanner(homeBannerUrl);

} else {

resetHomeBanner();

}

/* =====================================================
ANNOUNCEMENT
===================================================== */

const announcement =
settings.announcement?.trim();

if (
settings.announcement_enabled &&
announcement
) {

if (shopAnnouncement) {

  shopAnnouncement.textContent =
    announcement;
}


if (shopAnnouncementBar) {

  shopAnnouncementBar.style.display =
    "flex";
}

} else {

if (shopAnnouncementBar) {

  shopAnnouncementBar.style.display =
    "none";
}

}

}

/* =========================================================
SET SHOP LOGO
========================================================= */

function setShopLogo(logoUrl) {

if (shopLogoIcon) {

shopLogoIcon.innerHTML = "";

const img =
  document.createElement("img");

img.src =
  logoUrl;

img.alt =
  "Shop Logo";

img.loading =
  "lazy";


img.onerror = () => {

  shopLogoIcon.innerHTML =
    "✦";
};


shopLogoIcon.appendChild(img);

}

if (shopHeroLogo) {

shopHeroLogo.innerHTML = "";

const img =
  document.createElement("img");

img.src =
  logoUrl;

img.alt =
  "Shop Logo";

img.loading =
  "lazy";


img.onerror = () => {

  shopHeroLogo.innerHTML =
    "✦";
};


shopHeroLogo.appendChild(img);

}

}

/* =========================================================
RESET SHOP LOGO
========================================================= */

function resetShopLogo() {

if (shopLogoIcon) {

shopLogoIcon.innerHTML =
  "✦";

}

if (shopHeroLogo) {

shopHeroLogo.innerHTML =
  "✦";

}

}

/* =========================================================
SET HOME PAGE BANNER
========================================================= */

function setHomeBanner(homeBannerUrl) {

if (!homeBannerImage) {

console.warn(
  "HOME BANNER IMAGE ELEMENT NOT FOUND."
);

return;

}

/* =======================================================
SET IMAGE
======================================================= */

homeBannerImage.src =
homeBannerUrl;

homeBannerImage.alt =
"Home Page Banner";

homeBannerImage.style.display =
"block";

/* =======================================================
IMAGE LOADED
======================================================= */

homeBannerImage.onload = () => {

console.log(
  "HOME PAGE BANNER LOADED."
);

};

/* =======================================================
IMAGE ERROR
======================================================= */

homeBannerImage.onerror = () => {

console.error(
  "HOME PAGE BANNER IMAGE FAILED TO LOAD:",
  homeBannerUrl
);

resetHomeBanner();

};

/* =======================================================
OPTIONAL HERO CARD CLASS
======================================================= */

if (shopBannerVisual) {

shopBannerVisual.classList.add(
  "has-home-banner"
);

}

}

/* =========================================================
RESET HOME PAGE BANNER
========================================================= */

function resetHomeBanner() {

if (homeBannerImage) {

homeBannerImage.src =
  "";

homeBannerImage.style.display =
  "none";

}

if (shopBannerVisual) {

shopBannerVisual.classList.remove(
  "has-home-banner"
);

}

console.log(
"HOME PAGE BANNER NOT SET. DEFAULT HERO IS ACTIVE."
);

}

/* =========================================================
LOAD FEATURED PRODUCTS
========================================================= */

async function loadFeaturedProducts() {

if (!featuredProducts) {

console.warn(
  "FEATURED PRODUCTS ELEMENT NOT FOUND."
);

return;

}

featuredProducts.innerHTML = `
<div class="products-loading">

  <div class="loading-spinner"></div>

  <p>
    Loading products...
  </p>

</div>

`;

try {

console.log(
  "Loading featured products..."
);


const {
  data,
  error
} = await supabase

  .from("products")

  .select(
    "id, name, description, category, price, stock, image_url"
  )

  .order("id", {
    ascending: false,
  })

  .limit(8);


if (error) {

  console.error(
    "FEATURED PRODUCTS ERROR:",
    error
  );


  featuredProducts.innerHTML = `
    <div class="products-error">

      <div class="products-error-icon">
        !
      </div>

      <h3>
        Products are currently unavailable.
      </h3>

      <p>
        Please try again later or browse
        our full product collection.
      </p>

      <a
        href="products.html"
        class="products-error-button"
      >
        View Products
      </a>

    </div>
  `;

  return;
}


if (
  !data ||
  data.length === 0
) {

  featuredProducts.innerHTML = `
    <div class="products-empty">

      <div class="products-empty-icon">
        ◈
      </div>

      <h3>
        No products available yet.
      </h3>

      <p>
        Our product collection will appear here soon.
      </p>

      <a
        href="products.html"
        class="products-error-button"
      >
        Browse Store
      </a>

    </div>
  `;

  return;
}


console.log(
  "FEATURED PRODUCTS LOADED:",
  data.length
);


renderFeaturedProducts(data);

} catch (error) {

console.error(
  "LOAD FEATURED PRODUCTS ERROR:",
  error
);


featuredProducts.innerHTML = `
  <div class="products-error">

    <div class="products-error-icon">
      !
    </div>

    <h3>
      Something went wrong.
    </h3>

    <p>
      Please try again later.
    </p>

    <a
      href="products.html"
      class="products-error-button"
    >
      View Products
    </a>

  </div>
`;

}

}

/* =========================================================
RENDER FEATURED PRODUCTS
========================================================= */

function renderFeaturedProducts(products) {

if (!featuredProducts) {

return;

}

featuredProducts.innerHTML =
"";

products.forEach((product) => {

const name =
  product.name ||
  "Product";


const description =
  product.description ||
  "Quality product available in our store.";


const category =
  product.category ||
  "General";


const price =
  Number(product.price);


const stock =
  Number(product.stock) || 0;


const image =
  product.image_url || "";


const card =
  document.createElement("article");


card.className =
  "product-card";


/* =================================================
   STOCK STATUS
================================================= */

let stockClass =
  "in-stock";

let stockText =
  `${stock} in stock`;


if (stock <= 0) {

  stockClass =
    "out-of-stock";

  stockText =
    "Out of stock";

} else if (stock <= 5) {

  stockClass =
    "low-stock";

  stockText =
    `Only ${stock} left`;

}


/* =================================================
   IMAGE
================================================= */

let imageHTML = `
  <div class="product-placeholder">
    <span>◈</span>
  </div>
`;


if (image) {

  imageHTML = `
    <img
      src="${escapeHtml(image)}"
      alt="${escapeHtml(name)}"
      loading="lazy"
    >

    <div
      class="product-placeholder"
      style="display:none;"
    >
      <span>◈</span>
    </div>
  `;

}


/* =================================================
   CARD
================================================= */

card.innerHTML = `
  <div class="product-image">

    ${imageHTML}

    <span class="product-category">
      ${escapeHtml(category)}
    </span>

  </div>


  <div class="product-content">

    <div class="product-heading">

      <h3>
        ${escapeHtml(name)}
      </h3>

      <span
        class="product-stock ${stockClass}"
      >
        ${escapeHtml(stockText)}
      </span>

    </div>


    <p class="product-description">
      ${escapeHtml(description)}
    </p>


    <div class="product-bottom">

      <div class="product-price">

        ${
          Number.isFinite(price)
            ? formatPrice(price)
            : "Price unavailable"
        }

      </div>


      <!-- LOGIN TO SHOP BUTTON -->

      <button
        type="button"
        class="login-shop-button"
        data-product-id="${escapeHtml(product.id)}"
      >

        <span class="login-shop-icon">
          🛒
        </span>

        <span class="login-shop-text">
          Login to Shop
        </span>

        <span class="login-shop-arrow">
          →
        </span>

      </button>

    </div>

  </div>
`;


/* =================================================
   IMAGE ERROR
================================================= */

const imageElement =
  card.querySelector(
    ".product-image img"
  );


const placeholders =
  card.querySelectorAll(
    ".product-placeholder"
  );


const placeholder =
  placeholders.length
    ? placeholders[placeholders.length - 1]
    : null;


if (imageElement) {

  imageElement.addEventListener(
    "error",
    () => {

      imageElement.style.display =
        "none";


      if (placeholder) {

        placeholder.style.display =
          "grid";

      }

    }
  );

}


/* =================================================
   LOGIN TO SHOP BUTTON
================================================= */

const button =
  card.querySelector(
    ".login-shop-button"
  );


if (button) {

  button.addEventListener(
    "click",
    () => {

      window.location.href =
        CUSTOMER_LOGIN_PAGE;

    }
  );

}


featuredProducts.appendChild(
  card
);

});

}

/* =========================================================
START
========================================================= */

async function initializeHome() {

console.log(
"HOME SYSTEM STARTING..."
);

await Promise.all([

loadShopSettings(),

loadFeaturedProducts(),

]);

console.log(
"HOME SYSTEM READY"
);

}

/* =========================================================
INITIALIZE HOME PAGE
========================================================= */

initializeHome();