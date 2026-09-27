import { supabase } from "./supabase.js";

/* ============================================================
   BUSINESS STORE
   STORE SYSTEM
============================================================ */

console.log("STORE SYSTEM STARTING...");


/* ============================================================
   PAGE DETECTION
============================================================ */

const currentPage =
    window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

/*
   REQUEST PAGE DETECTION

   We use BOTH:
   1. request.html filename
   2. request-only-page body class

   This makes the protection much safer.
*/

const isRequestPage =
    currentPage === "request.html" ||
    document.body?.classList.contains("request-only-page");

console.log("CURRENT PAGE:", currentPage);
console.log("IS REQUEST PAGE:", isRequestPage);


/* ============================================================
   REQUEST PAGE HARD STOP
============================================================ */

/*
   IMPORTANT:

   request.html does NOT need the product store system.

   If this is request.html, we stop this file immediately.

   This means:
   - No product loading
   - No product cards
   - No Add to Cart buttons
   - No Buy Now buttons
   - No product modal
   - No product event listeners
   - No product injection

   Other pages are NOT affected.
*/

if (isRequestPage) {

    console.log(
        "REQUEST PAGE DETECTED."
    );

    console.log(
        "STORE PRODUCT SYSTEM COMPLETELY DISABLED."
    );

} else {


/* ============================================================
   ELEMENTS
============================================================ */

const productGrid =
    document.getElementById("productGrid");

const cartItems =
    document.getElementById("cartItems");

const cartCount =
    document.getElementById("cartCount");

const cartCountText =
    document.getElementById("cartCountText");

const cartSubtotal =
    document.getElementById("cartSubtotal");

const cartTotal =
    document.getElementById("cartTotal");

const deliveryFeeElement =
    document.getElementById("deliveryFee");

const minimumOrderNotice =
    document.getElementById("minimumOrderNotice");

const minimumOrderElement =
    document.querySelector("[data-minimum-order]");

const deliveryInformationElement =
    document.querySelector("[data-delivery-information]");

const checkoutBtn =
    document.getElementById("checkoutBtn");


/* ============================================================
   CART
============================================================ */

let cart = [];


/* ============================================================
   SHOP SETTINGS
============================================================ */

let shopSettings = {

    delivery_fee: 0,

    minimum_order: 0,

    delivery_information: ""

};


/* ============================================================
   SELECTED PRODUCT
============================================================ */

let selectedProduct = null;


/* ============================================================
   LOGIN CHECK
============================================================ */

async function checkLoginAndRedirect() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "LOGIN CHECK ERROR:",
                error
            );

            window.location.href =
                "login.html";

            return null;
        }


        if (!data?.session?.user) {

            window.location.href =
                "login.html";

            return null;
        }


        return data.session.user;

    } catch (error) {

        console.error(
            "LOGIN CHECK ERROR:",
            error
        );

        window.location.href =
            "login.html";

        return null;
    }
}


/* ============================================================
   FORMAT CURRENCY
============================================================ */

function formatCurrency(value) {

    const amount =
        Number(value) || 0;

    return `₱${amount.toLocaleString("en-PH", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    })}`;
}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


/* ============================================================
   ESCAPE ATTRIBUTE
============================================================ */

function escapeAttribute(value) {

    return escapeHTML(value);
}


/* ============================================================
   LOAD SAVED CART
============================================================ */

function loadSavedCart() {

    try {

        const savedCart =
            localStorage.getItem(
                "businessStoreCart"
            );


        if (!savedCart) {

            cart = [];

            return;
        }


        const parsedCart =
            JSON.parse(savedCart);


        if (!Array.isArray(parsedCart)) {

            cart = [];

            return;
        }


        cart =
            parsedCart

                .filter(
                    item =>
                        item &&
                        item.id
                )

                .map(item => ({

                    ...item,

                    quantity:
                        Math.max(
                            1,
                            Number(
                                item.quantity
                            ) || 1
                        ),

                    price:
                        Number(
                            item.price
                        ) || 0,

                    stock:
                        Number(
                            item.stock
                        ) || 0

                }));

    } catch (error) {

        console.error(
            "Unable to load saved cart:",
            error
        );

        cart = [];
    }
}


/* ============================================================
   SAVE CART
============================================================ */

function saveCart() {

    try {

        localStorage.setItem(

            "businessStoreCart",

            JSON.stringify(cart)

        );

    } catch (error) {

        console.error(
            "Unable to save cart:",
            error
        );
    }
}


/* ============================================================
   LOAD SHOP SETTINGS
============================================================ */

async function loadShopSettings() {

    try {

        const {
            data,
            error
        } =
            await supabase

                .from("shop_settings")

                .select(
                    "delivery_fee, minimum_order, delivery_information"
                )

                .limit(1)

                .maybeSingle();


        if (error) {

            console.error(
                "SHOP SETTINGS ERROR:",
                error
            );

            return;
        }


        if (!data) {

            console.warn(
                "No shop settings found."
            );

            return;
        }


        shopSettings = {

            delivery_fee:
                Number(
                    data.delivery_fee
                ) || 0,

            minimum_order:
                Number(
                    data.minimum_order
                ) || 0,

            delivery_information:
                data.delivery_information ||
                ""

        };


        if (deliveryInformationElement) {

            deliveryInformationElement.textContent =

                shopSettings.delivery_information ||

                "Delivery information will appear here.";
        }


        if (minimumOrderElement) {

            minimumOrderElement.textContent =

                formatCurrency(
                    shopSettings.minimum_order
                );
        }


        if (deliveryFeeElement) {

            deliveryFeeElement.textContent =

                formatCurrency(
                    shopSettings.delivery_fee
                );
        }


        updateCart();


        console.log(
            "SHOP SETTINGS LOADED:",
            shopSettings
        );

    } catch (error) {

        console.error(
            "SHOP SETTINGS ERROR:",
            error
        );
    }
}


/* ============================================================
   CREATE PRODUCT DETAILS MODAL
============================================================ */

function createProductModal() {

    if (
        document.getElementById(
            "productDetailsModal"
        )
    ) {

        return;
    }


    const modal =
        document.createElement("div");


    modal.id =
        "productDetailsModal";


    modal.className =
        "product-details-modal";


    modal.innerHTML = `

        <div class="product-details-backdrop"></div>

        <div
            class="product-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="productModalName"
        >

            <button
                type="button"
                class="product-modal-close"
                id="productModalClose"
                aria-label="Close product details"
            >
                ×
            </button>


            <div
                class="product-modal-image-area"
                id="productModalImageArea"
            >
            </div>


            <div class="product-modal-content">

                <div
                    class="product-modal-category"
                    id="productModalCategory"
                >
                </div>


                <h2 id="productModalName">
                    Product
                </h2>


                <p
                    class="product-modal-description"
                    id="productModalDescription"
                >
                </p>


                <div class="product-modal-price">

                    <span id="productModalPrice">
                        ₱0.00
                    </span>

                </div>


                <div
                    class="product-modal-stock"
                    id="productModalStock"
                >
                </div>


                <div class="product-modal-actions">

                    <button
                        type="button"
                        class="modal-add-cart-button"
                        id="modalAddCartButton"
                    >

                        <span>🛒</span>

                        <span>
                            Add to Cart
                        </span>

                    </button>


                    <button
                        type="button"
                        class="modal-buy-now-button"
                        id="modalBuyNowButton"
                    >

                        <span>⚡</span>

                        <span>
                            Buy Now
                        </span>

                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        document.getElementById(
            "productModalClose"
        );


    const backdrop =
        modal.querySelector(
            ".product-details-backdrop"
        );


    closeButton?.addEventListener(
        "click",
        closeProductModal
    );


    backdrop?.addEventListener(
        "click",
        closeProductModal
    );
}


/* ============================================================
   KEYBOARD CLOSE
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            const modal =
                document.getElementById(
                    "productDetailsModal"
                );


            if (
                modal &&
                modal.classList.contains("show")
            ) {

                closeProductModal();
            }
        }
    }
);


/* ============================================================
   OPEN PRODUCT DETAILS
============================================================ */

function openProductDetails(product) {

    createProductModal();

    selectedProduct =
        product;


    const modal =
        document.getElementById(
            "productDetailsModal"
        );


    const imageArea =
        document.getElementById(
            "productModalImageArea"
        );


    const category =
        document.getElementById(
            "productModalCategory"
        );


    const name =
        document.getElementById(
            "productModalName"
        );


    const description =
        document.getElementById(
            "productModalDescription"
        );


    const price =
        document.getElementById(
            "productModalPrice"
        );


    const stockElement =
        document.getElementById(
            "productModalStock"
        );


    const addButton =
        document.getElementById(
            "modalAddCartButton"
        );


    const buyButton =
        document.getElementById(
            "modalBuyNowButton"
        );


    if (
        !modal ||
        !imageArea ||
        !category ||
        !name ||
        !description ||
        !price ||
        !stockElement ||
        !addButton ||
        !buyButton
    ) {

        return;
    }


    const stock =
        Number(product.stock) || 0;


    const productName =
        product.name ||
        "Unnamed Product";


    const productDescription =
        product.description ||
        "Quality product available in our store.";


    category.textContent =
        product.category ||
        "General";


    name.textContent =
        productName;


    description.textContent =
        productDescription;


    price.textContent =
        formatCurrency(
            product.price
        );


    if (product.image_url) {

        imageArea.innerHTML = `

            <img
                src="${escapeAttribute(
                    product.image_url
                )}"
                alt="${escapeAttribute(
                    productName
                )}"
            >

        `;

    } else {

        imageArea.innerHTML = `

            <div class="product-modal-no-image">
                📦
            </div>

        `;
    }


    if (stock <= 0) {

        stockElement.textContent =
            "Out of stock";


        stockElement.className =
            "product-modal-stock out-of-stock";


        addButton.disabled =
            true;


        buyButton.disabled =
            true;

    } else if (stock <= 5) {

        stockElement.textContent =
            `Only ${stock} left`;


        stockElement.className =
            "product-modal-stock low-stock";


        addButton.disabled =
            false;


        buyButton.disabled =
            false;

    } else {

        stockElement.textContent =
            `${stock} in stock`;


        stockElement.className =
            "product-modal-stock";


        addButton.disabled =
            false;


        buyButton.disabled =
            false;
    }


    addButton.onclick =
        async () => {

            if (!selectedProduct) {

                return;
            }


            const user =
                await checkLoginAndRedirect();


            if (!user) {

                return;
            }


            const currentStock =
                Number(
                    selectedProduct.stock
                ) || 0;


            if (currentStock <= 0) {

                showToast(
                    "This product is currently out of stock.",
                    "error"
                );

                return;
            }


            addToCart(
                selectedProduct
            );


            closeProductModal();
        };


    buyButton.onclick =
        async () => {

            if (!selectedProduct) {

                return;
            }


            const user =
                await checkLoginAndRedirect();


            if (!user) {

                return;
            }


            const currentStock =
                Number(
                    selectedProduct.stock
                ) || 0;


            if (currentStock <= 0) {

                showToast(
                    "This product is currently out of stock.",
                    "error"
                );

                return;
            }


            closeProductModal();


            buyNow(
                selectedProduct
            );
        };


    modal.classList.add(
        "show"
    );


    document.body.classList.add(
        "product-modal-open"
    );
}


/* ============================================================
   CLOSE PRODUCT DETAILS
============================================================ */

function closeProductModal() {

    const modal =
        document.getElementById(
            "productDetailsModal"
        );


    if (!modal) {

        return;
    }


    modal.classList.remove(
        "show"
    );


    document.body.classList.remove(
        "product-modal-open"
    );


    selectedProduct =
        null;
}


/* ============================================================
   LOAD PRODUCTS
============================================================ */

async function loadProducts() {

    if (!productGrid) {

        console.log(
            "PRODUCT GRID NOT FOUND - NOT A PRODUCT PAGE."
        );

        return;
    }


    productGrid.innerHTML = `

        <div class="loading-products">

            <div class="loading-spinner"></div>

            <span>
                Loading products...
            </span>

        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await supabase

                .from("products")

                .select("*");


        if (error) {

            console.error(
                "ERROR LOADING PRODUCTS:",
                error
            );


            productGrid.innerHTML = `

                <div class="products-error">

                    Unable to load products.

                </div>

            `;

            return;
        }


        if (
            !data ||
            data.length === 0
        ) {

            productGrid.innerHTML = `

                <div class="empty-products">

                    <h3>
                        No Products Available
                    </h3>

                    <p>
                        There are currently no products
                        available in the store.
                    </p>

                </div>

            `;

            return;
        }


        console.log(
            "PRODUCTS LOADED:",
            data.length
        );


        syncCartWithProducts(
            data
        );


        productGrid.innerHTML =
            "";


        data.forEach(
            product => {

                const stock =
                    Number(
                        product.stock
                    ) || 0;


                const price =
                    Number(
                        product.price
                    ) || 0;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "product-card";


                const productName =
                    product.name ||
                    "Unnamed Product";


                const productDescription =
                    product.description ||
                    "Quality product available in our store.";


                const isOutOfStock =
                    stock <= 0;


                const imageHTML =
                    product.image_url

                        ? `

                            <button
                                type="button"
                                class="product-image-wrapper product-image-clickable"
                                aria-label="View ${escapeAttribute(
                                    productName
                                )}"
                            >

                                <img
                                    src="${escapeAttribute(
                                        product.image_url
                                    )}"
                                    alt="${escapeAttribute(
                                        productName
                                    )}"
                                    class="product-image"
                                    loading="lazy"
                                >


                                <span class="image-view-overlay">

                                    <span>
                                        View Product
                                    </span>

                                </span>

                            </button>

                        `

                        : `

                            <button
                                type="button"
                                class="product-image-wrapper product-image-clickable"
                                aria-label="View ${escapeAttribute(
                                    productName
                                )}"
                            >

                                <div class="product-image-placeholder">
                                    📦
                                </div>


                                <span class="image-view-overlay">

                                    <span>
                                        View Product
                                    </span>

                                </span>

                            </button>

                        `;


                let stockHTML =
                    "";


                if (stock <= 0) {

                    stockHTML = `

                        <span class="product-stock out-of-stock">
                            Out of stock
                        </span>

                    `;

                } else if (stock <= 5) {

                    stockHTML = `

                        <span class="product-stock low-stock">
                            Only ${stock} left
                        </span>

                    `;

                } else {

                    stockHTML = `

                        <span class="product-stock">
                            ${stock} in stock
                        </span>

                    `;
                }


                const addButtonText =
                    isOutOfStock

                        ? "Out of Stock"

                        : "Add to Cart";


                card.innerHTML = `

                    ${imageHTML}


                    <div class="product-info">


                        <div class="product-category">

                            ${escapeHTML(
                                product.category ||
                                "General"
                            )}

                        </div>


                        <h3 class="product-name">

                            ${escapeHTML(
                                productName
                            )}

                        </h3>


                        <p class="product-description">

                            ${escapeHTML(
                                productDescription
                            )}

                        </p>


                        <div class="product-bottom">


                            <div>

                                <div class="product-price">

                                    ${formatCurrency(
                                        price
                                    )}

                                </div>

                            </div>


                            ${stockHTML}


                        </div>


                        <div class="product-actions">


                            <button
                                type="button"
                                class="add-cart-button"
                                ${isOutOfStock ? "disabled" : ""}
                            >

                                <span class="button-icon">
                                    🛒
                                </span>

                                <span>
                                    ${addButtonText}
                                </span>

                            </button>


                            <button
                                type="button"
                                class="buy-now-button"
                                ${isOutOfStock ? "disabled" : ""}
                            >

                                <span class="button-icon">
                                    ⚡
                                </span>

                                <span>
                                    Buy Now
                                </span>

                            </button>


                        </div>


                    </div>

                `;


                productGrid.appendChild(
                    card
                );


                const imageButton =
                    card.querySelector(
                        ".product-image-clickable"
                    );


                imageButton?.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        openProductDetails(
                            product
                        );
                    }
                );


                const addButton =
                    card.querySelector(
                        ".add-cart-button"
                    );


                addButton?.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const user =
                            await checkLoginAndRedirect();


                        if (!user) {

                            return;
                        }


                        const currentStock =
                            Number(
                                product.stock
                            ) || 0;


                        if (
                            currentStock <= 0
                        ) {

                            showToast(
                                "This product is currently out of stock.",
                                "error"
                            );

                            return;
                        }


                        addToCart(
                            product
                        );

                    }
                );


                const buyButton =
                    card.querySelector(
                        ".buy-now-button"
                    );


                buyButton?.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const user =
                            await checkLoginAndRedirect();


                        if (!user) {

                            return;
                        }


                        const currentStock =
                            Number(
                                product.stock
                            ) || 0;


                        if (
                            currentStock <= 0
                        ) {

                            showToast(
                                "This product is currently out of stock.",
                                "error"
                            );

                            return;
                        }


                        buyNow(
                            product
                        );

                    }
                );

            }
        );


        updateCart();


        console.log(
            "PRODUCT BUTTONS READY"
        );

    } catch (error) {

        console.error(
            "PRODUCT SYSTEM ERROR:",
            error
        );


        productGrid.innerHTML = `

            <div class="products-error">

                Unable to load products.

            </div>

        `;
    }
}


/* ============================================================
   SYNC CART WITH PRODUCTS
============================================================ */

function syncCartWithProducts(
    products
) {

    const productMap =
        new Map(
            products.map(
                product => [
                    product.id,
                    product
                ]
            )
        );


    cart =
        cart

            .map(
                item => {

                    const product =
                        productMap.get(
                            item.id
                        );


                    if (!product) {

                        return null;
                    }


                    const currentStock =
                        Number(
                            product.stock
                        ) || 0;


                    if (
                        currentStock <= 0
                    ) {

                        return null;
                    }


                    return {

                        ...item,

                        name:
                            product.name,

                        price:
                            Number(
                                product.price
                            ) || 0,

                        stock:
                            currentStock,

                        image_url:
                            product.image_url ||
                            "",

                        quantity:
                            Math.min(

                                Math.max(
                                    1,
                                    Number(
                                        item.quantity
                                    ) || 1
                                ),

                                currentStock

                            )
                    };

                }
            )

            .filter(Boolean);


    saveCart();
}


/* ============================================================
   ADD TO CART
============================================================ */

function addToCart(
    product
) {

    const stock =
        Number(
            product.stock
        ) || 0;


    if (stock <= 0) {

        showToast(
            "This product is currently out of stock.",
            "error"
        );

        return;
    }


    const existingItem =
        cart.find(
            item =>
                item.id ===
                product.id
        );


    if (existingItem) {

        const currentQuantity =
            Number(
                existingItem.quantity
            ) || 0;


        if (
            currentQuantity >=
            stock
        ) {

            showToast(
                `Only ${stock} item${stock === 1 ? "" : "s"} available.`,
                "error"
            );

            return;
        }


        existingItem.quantity =
            currentQuantity + 1;


        existingItem.stock =
            stock;

    } else {

        cart.push({

            id:
                product.id,

            name:
                product.name,

            price:
                Number(
                    product.price
                ) || 0,

            stock:
                stock,

            image_url:
                product.image_url ||
                "",

            quantity:
                1

        });
    }


    updateCart();


    showToast(
        `${product.name} added to cart.`,
        "success"
    );
}


/* ============================================================
   BUY NOW
============================================================ */

function buyNow(
    product
) {

    const stock =
        Number(
            product.stock
        ) || 0;


    if (stock <= 0) {

        showToast(
            "This product is currently out of stock.",
            "error"
        );

        return;
    }


    const buyNowCart = [

        {

            id:
                product.id,

            name:
                product.name,

            price:
                Number(
                    product.price
                ) || 0,

            stock:
                stock,

            image_url:
                product.image_url ||
                "",

            quantity:
                1

        }

    ];


    try {

        localStorage.setItem(

            "businessStoreCart",

            JSON.stringify(
                buyNowCart
            )

        );


        cart =
            buyNowCart;


        updateCart();


        window.location.href =
            "checkout.html";


    } catch (error) {

        console.error(
            "BUY NOW ERROR:",
            error
        );


        showToast(
            "Unable to continue to checkout.",
            "error"
        );
    }
}


/* ============================================================
   UPDATE CART
============================================================ */

function updateCart() {

    saveCart();


    const totalItems =
        getTotalCartItems();


    if (!cartItems) {

        updateCartCounters(
            totalItems
        );

        return;
    }


    cartItems.innerHTML =
        "";


    if (
        cart.length === 0
    ) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <div class="empty-cart-icon">
                    🛒
                </div>


                <h3>
                    Your cart is empty
                </h3>


                <p>
                    Add some products to your cart.
                </p>


                <a
                    href="products.html"
                    class="empty-cart-button"
                >
                    Browse Products
                </a>

            </div>

        `;


        updateCartCounters(
            0
        );


        if (cartSubtotal) {

            cartSubtotal.textContent =
                "₱0.00";
        }


        if (deliveryFeeElement) {

            deliveryFeeElement.textContent =
                formatCurrency(0);
        }


        if (cartTotal) {

            cartTotal.textContent =
                "₱0.00";
        }


        if (minimumOrderNotice) {

            minimumOrderNotice.style.display =
                "none";
        }


        if (checkoutBtn) {

            checkoutBtn.disabled =
                true;
        }


        return;
    }


    let totalPrice =
        0;


    cart.forEach(
        item => {

            const quantity =
                Number(
                    item.quantity
                ) || 1;


            const price =
                Number(
                    item.price
                ) || 0;


            totalPrice +=
                price *
                quantity;
        }
    );


    const deliveryFee =
        Number(
            shopSettings.delivery_fee
        ) || 0;


    const minimumOrder =
        Number(
            shopSettings.minimum_order
        ) || 0;


    const minimumOrderReached =
        totalPrice >=
        minimumOrder;


    const finalTotal =
        totalPrice +
        deliveryFee;


    cart.forEach(
        item => {

            const quantity =
                Number(
                    item.quantity
                ) || 1;


            const price =
                Number(
                    item.price
                ) || 0;


            const stock =
                Number(
                    item.stock
                ) || 0;


            const subtotal =
                price *
                quantity;


            const cartItem =
                document.createElement(
                    "div"
                );


            cartItem.className =
                "cart-item";


            const imageHTML =
                item.image_url

                    ? `

                        <img
                            src="${escapeAttribute(
                                item.image_url
                            )}"
                            alt="${escapeAttribute(
                                item.name
                            )}"
                            class="cart-item-image"
                            loading="lazy"
                        >

                    `

                    : `

                        <div class="cart-item-image no-image">
                            📦
                        </div>

                    `;


            let stockMessage =
                "";


            if (
                stock <= 0
            ) {

                stockMessage = `

                    <small class="product-stock out-of-stock">
                        Out of stock
                    </small>

                `;

            } else if (
                quantity >= stock
            ) {

                stockMessage = `

                    <small class="product-stock low-stock">
                        Maximum available
                    </small>

                `;
            }


            const plusDisabled =
                stock <= 0 ||
                quantity >= stock
                    ? "disabled"
                    : "";


            cartItem.innerHTML = `

                ${imageHTML}


                <div class="cart-item-info">

                    <h3>
                        ${escapeHTML(
                            item.name
                        )}
                    </h3>


                    <p>
                        ${formatCurrency(
                            price
                        )}
                    </p>


                    ${stockMessage}

                </div>


                <div class="cart-quantity">

                    <button
                        type="button"
                        class="quantity-btn minus-btn"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>


                    <span>
                        ${quantity}
                    </span>


                    <button
                        type="button"
                        class="quantity-btn plus-btn"
                        ${plusDisabled}
                        aria-label="Increase quantity"
                    >
                        +
                    </button>

                </div>


                <div class="cart-item-subtotal">

                    <strong>
                        ${formatCurrency(
                            subtotal
                        )}
                    </strong>


                    <button
                        type="button"
                        class="remove-cart-btn"
                    >
                        Remove
                    </button>

                </div>

            `;


            const minusButton =
                cartItem.querySelector(
                    ".minus-btn"
                );


            minusButton?.addEventListener(
                "click",
                () => {

                    if (
                        item.quantity > 1
                    ) {

                        item.quantity--;

                    } else {

                        cart =
                            cart.filter(
                                cartProduct =>
                                    cartProduct.id !==
                                    item.id
                            );
                    }


                    updateCart();
                }
            );


            const plusButton =
                cartItem.querySelector(
                    ".plus-btn"
                );


            plusButton?.addEventListener(
                "click",
                () => {

                    const currentStock =
                        Number(
                            item.stock
                        ) || 0;


                    const currentQuantity =
                        Number(
                            item.quantity
                        ) || 0;


                    if (
                        currentStock <= 0
                    ) {

                        showToast(
                            "This product is out of stock.",
                            "error"
                        );

                        return;
                    }


                    if (
                        currentQuantity >=
                        currentStock
                    ) {

                        showToast(
                            `Only ${currentStock} item${currentStock === 1 ? "" : "s"} available.`,
                            "error"
                        );

                        return;
                    }


                    item.quantity =
                        currentQuantity + 1;


                    updateCart();
                }
            );


            const removeButton =
                cartItem.querySelector(
                    ".remove-cart-btn"
                );


            removeButton?.addEventListener(
                "click",
                () => {

                    cart =
                        cart.filter(
                            cartProduct =>
                                cartProduct.id !==
                                item.id
                        );


                    updateCart();
                }
            );


            cartItems.appendChild(
                cartItem
            );
        }
    );


    updateCartCounters(
        totalItems
    );


    if (cartSubtotal) {

        cartSubtotal.textContent =
            formatCurrency(
                totalPrice
            );
    }


    if (deliveryFeeElement) {

        deliveryFeeElement.textContent =
            formatCurrency(
                deliveryFee
            );
    }


    if (cartTotal) {

        cartTotal.textContent =
            formatCurrency(
                finalTotal
            );
    }


    if (minimumOrderNotice) {

        if (
            minimumOrder > 0 &&
            !minimumOrderReached
        ) {

            const remaining =
                minimumOrder -
                totalPrice;


            minimumOrderNotice.style.display =
                "flex";


            minimumOrderNotice.innerHTML = `

                <span>
                    ℹ
                </span>


                <p>

                    Minimum order is

                    <strong>
                        ${formatCurrency(
                            minimumOrder
                        )}
                    </strong>.


                    Add

                    <strong>
                        ${formatCurrency(
                            remaining
                        )}
                    </strong>

                    more to continue.

                </p>

            `;

        } else {

            minimumOrderNotice.style.display =
                "none";
        }
    }


    if (checkoutBtn) {

        const canCheckout =
            cart.length > 0 &&
            (
                minimumOrder <= 0 ||
                minimumOrderReached
            );


        checkoutBtn.disabled =
            !canCheckout;


        if (!canCheckout) {

            checkoutBtn.title =
                `Minimum order is ${formatCurrency(
                    minimumOrder
                )}`;

        } else {

            checkoutBtn.title =
                "Proceed to checkout";
        }
    }
}


/* ============================================================
   GET TOTAL CART ITEMS
============================================================ */

function getTotalCartItems() {

    return cart.reduce(

        (
            total,
            item
        ) => {

            return (

                total +

                Number(
                    item.quantity ||
                    0
                )

            );

        },

        0
    );
}


/* ============================================================
   UPDATE CART COUNTERS
============================================================ */

async function updateCartCounters(
    totalItems
) {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "CART LOGIN CHECK ERROR:",
                error
            );


            if (cartCount) {

                cartCount.style.display =
                    "none";

                cartCount.textContent =
                    "0";
            }


            if (cartCountText) {

                cartCountText.textContent =
                    "";
            }


            return;
        }


        const user =
            data?.session?.user;


        if (!user) {

            if (cartCount) {

                cartCount.style.display =
                    "none";

                cartCount.textContent =
                    "0";
            }


            if (cartCountText) {

                cartCountText.textContent =
                    "";
            }


            return;
        }


        if (cartCount) {

            cartCount.textContent =
                totalItems;


            if (totalItems > 0) {

                cartCount.style.display =
                    "inline-flex";

            } else {

                cartCount.style.display =
                    "none";
            }
        }


        if (cartCountText) {

            cartCountText.textContent =

                `${totalItems} ${
                    totalItems === 1
                        ? "item"
                        : "items"
                }`;
        }

    } catch (error) {

        console.error(
            "CART COUNTER ERROR:",
            error
        );


        if (cartCount) {

            cartCount.style.display =
                "none";

            cartCount.textContent =
                "0";
        }


        if (cartCountText) {

            cartCountText.textContent =
                "";
        }
    }
}


/* ============================================================
   CHECKOUT
============================================================ */

if (checkoutBtn) {

    checkoutBtn.addEventListener(
        "click",
        async () => {

            if (
                cart.length === 0
            ) {

                showToast(
                    "Your cart is empty.",
                    "error"
                );

                return;
            }


            const user =
                await checkLoginAndRedirect();


            if (!user) {

                return;
            }


            const subtotal =
                cart.reduce(

                    (
                        total,
                        item
                    ) => {

                        return (

                            total +

                            (
                                Number(
                                    item.price
                                ) || 0
                            ) *

                            (
                                Number(
                                    item.quantity
                                ) || 0
                            )

                        );

                    },

                    0
                );


            const minimumOrder =
                Number(
                    shopSettings.minimum_order
                ) || 0;


            if (
                minimumOrder > 0 &&
                subtotal < minimumOrder
            ) {

                const remaining =
                    minimumOrder -
                    subtotal;


                showToast(
                    `Please add ${formatCurrency(
                        remaining
                    )} more to continue.`,
                    "error"
                );

                return;
            }


            saveCart();


            window.location.href =
                "checkout.html";
        }
    );
}


/* ============================================================
   TOAST
============================================================ */

function showToast(
    message,
    type = "success"
) {

    const oldToast =
        document.querySelector(
            ".store-toast"
        );


    if (oldToast) {

        oldToast.remove();
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `store-toast ${type}`;


    toast.innerHTML = `

        <span class="toast-icon">

            ${
                type === "success"
                    ? "✓"
                    : "!"
            }

        </span>


        <span class="toast-message">

            ${escapeHTML(
                message
            )}

        </span>

    `;


    document.body.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                300
            );

        },
        2200
    );
}


/* ============================================================
   INITIALIZE STORE
============================================================ */

async function initializeStore() {

    console.log(
        "STORE SYSTEM INITIALIZING..."
    );


    loadSavedCart();


    updateCart();


    createProductModal();


    await loadShopSettings();


    await loadProducts();


    console.log(
        "STORE SYSTEM READY"
    );
}


/* ============================================================
   START STORE
============================================================ */

initializeStore();


} // END OF NON-REQUEST PAGE STORE SYSTEM