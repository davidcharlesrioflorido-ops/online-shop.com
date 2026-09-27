import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";
    

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);


/* =========================================================
   SETTINGS
========================================================= */

const CART_KEY = "businessStoreCart";

const PAYMENT_BUCKET = "payment-proofs";

const PAYMENT_FOLDER = "payments";

const MAX_PAYMENT_FILE_SIZE =
    5 * 1024 * 1024;

const ALLOWED_PAYMENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let cart = [];

let shopSettings = {
    delivery_fee: 0,
    minimum_order: 0,
    delivery_information: ""
};

let subtotal = 0;

let deliveryFee = 0;

let orderTotal = 0;


/* =========================================================
   ELEMENTS
========================================================= */

const checkoutForm =
    document.getElementById("checkoutForm");

const checkoutItems =
    document.getElementById("checkoutItems");

const checkoutSubtotal =
    document.getElementById("checkoutSubtotal");

const checkoutDeliveryFee =
    document.getElementById("checkoutDeliveryFee");

const checkoutTotal =
    document.getElementById("checkoutTotal");

const paymentTotal =
    document.getElementById("paymentTotal");

const proceedPaymentBtn =
    document.getElementById("proceedPaymentBtn");

const backToReviewBtn =
    document.getElementById("backToReviewBtn");

const placeOrderBtn =
    document.getElementById("placeOrderBtn");

const paymentScreenshot =
    document.getElementById("paymentScreenshot");

const paymentPreview =
    document.getElementById("paymentPreview");

const paymentConfirmed =
    document.getElementById("paymentConfirmed");

const checkoutResult =
    document.getElementById("checkoutResult");

const reviewSection =
    document.getElementById("reviewSection");

const paymentSection =
    document.getElementById("paymentSection");

const deliveryInformationElement =
    document.querySelector(
        "[data-delivery-information]"
    );


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    return Number(value || 0).toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP"
        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   RESULT MESSAGE
========================================================= */

function showResult(
    message,
    type = "success"
) {

    if (!checkoutResult) {
        return;
    }

    checkoutResult.textContent =
        message;

    checkoutResult.className =
        "checkout-result";

    checkoutResult.classList.add(
        type === "error"
            ? "error"
            : "success"
    );

}


/* =========================================================
   GET SESSION USER
========================================================= */

async function getCurrentCustomer() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {

            console.error(
                "SESSION ERROR:",
                error
            );

            return null;

        }

        return data?.session?.user || null;

    } catch (error) {

        console.error(
            "GET SESSION ERROR:",
            error
        );

        return null;

    }

}


/* =========================================================
   REQUIRE CUSTOMER LOGIN
========================================================= */

async function requireCustomerLogin() {

    const user =
        await getCurrentCustomer();

    if (user) {

        currentUser =
            user;

        return true;

    }

    sessionStorage.setItem(
        "businessStoreLoginRedirect",
        window.location.href
    );

    window.location.href =
        "login.html";

    return false;

}


/* =========================================================
   LOAD CUSTOMER PROFILE
========================================================= */

async function loadCustomerProfile() {

    if (!currentUser) {
        return;
    }


    const nameInput =
        document.getElementById(
            "customerName"
        );

    const emailInput =
        document.getElementById(
            "customerEmail"
        );

    const phoneInput =
        document.getElementById(
            "customerPhone"
        );

    const addressInput =
        document.getElementById(
            "customerAddress"
        );


    if (
        emailInput &&
        currentUser.email
    ) {

        emailInput.value =
            currentUser.email;

        emailInput.readOnly =
            true;

    }


    try {

        /*
         * We try full_name and name.
         * If your profiles table only has one,
         * the fallback below still uses metadata.
         */

        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


        if (error) {

            console.warn(
                "PROFILE LOAD WARNING:",
                error.message
            );

        }


        const profile =
            data || {};

        const metadata =
            currentUser.user_metadata || {};


        if (nameInput) {

            nameInput.value =
                profile.full_name ||
                profile.name ||
                metadata.full_name ||
                "";

        }


        if (phoneInput) {

            phoneInput.value =
                profile.phone ||
                metadata.phone ||
                "";

        }


        if (addressInput) {

            const address =
                [
                    profile.address,
                    profile.city,
                    profile.province,
                    profile.postal_code
                ]
                    .filter(
                        value =>
                            value &&
                            String(value).trim()
                    )
                    .join(", ");


            addressInput.value =
                address;

        }

    } catch (error) {

        console.error(
            "PROFILE ERROR:",
            error
        );

    }

}


/* =========================================================
   CART HELPERS
========================================================= */

function getItemName(item) {

    return (
        item.product_name ||
        item.name ||
        item.title ||
        "Product"
    );

}


function getItemPrice(item) {

    return Number(
        item.price ??
        item.product_price ??
        item.amount ??
        0
    );

}


function getItemQuantity(item) {

    return Math.max(
        1,
        Number(
            item.quantity ??
            item.qty ??
            1
        )
    );

}


function getItemProductId(item) {

    return (
        item.product_id ||
        item.id ||
        null
    );

}


function getItemImage(item) {

    return (
        item.image_url ||
        item.image ||
        item.product_image ||
        item.product_image_url ||
        ""
    );

}


/* =========================================================
   LOAD CART
========================================================= */

function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                CART_KEY
            );

        if (!saved) {

            cart = [];

            return;

        }


        const parsed =
            JSON.parse(saved);


        if (!Array.isArray(parsed)) {

            cart = [];

            return;

        }


        cart =
            parsed.map(
                item => ({

                    ...item,

                    quantity:
                        getItemQuantity(item),

                    price:
                        getItemPrice(item)

                })
            );

    } catch (error) {

        console.error(
            "LOAD CART ERROR:",
            error
        );

        cart = [];

    }

}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart() {

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );

}


/* =========================================================
   CALCULATE TOTAL
========================================================= */

function calculateOrderTotal() {

    subtotal =
        cart.reduce(
            (
                total,
                item
            ) => {

                const price =
                    getItemPrice(item);

                const quantity =
                    getItemQuantity(item);

                return (
                    total +
                    price * quantity
                );

            },
            0
        );


    deliveryFee =
        cart.length > 0
            ? Number(
                shopSettings.delivery_fee
            ) || 0
            : 0;


    orderTotal =
        subtotal +
        deliveryFee;


    if (checkoutSubtotal) {

        checkoutSubtotal.textContent =
            formatCurrency(subtotal);

    }


    if (checkoutDeliveryFee) {

        checkoutDeliveryFee.textContent =
            formatCurrency(deliveryFee);

    }


    if (checkoutTotal) {

        checkoutTotal.textContent =
            formatCurrency(orderTotal);

    }


    if (paymentTotal) {

        paymentTotal.textContent =
            formatCurrency(orderTotal);

    }

}


/* =========================================================
   UPDATE CART COUNT
========================================================= */

function updateCartCount() {

    const cartCount =
        document.getElementById(
            "cartCount"
        );

    if (!cartCount) {
        return;
    }


    const count =
        cart.reduce(
            (
                total,
                item
            ) => {

                return (
                    total +
                    getItemQuantity(item)
                );

            },
            0
        );


    cartCount.textContent =
        count;

}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

    if (!checkoutItems) {
        return;
    }


    if (!cart.length) {

        checkoutItems.innerHTML = `

            <div class="checkout-empty">

                <div class="checkout-empty-icon">
                    🛒
                </div>

                <h3>Your cart is empty</h3>

                <p>
                    Add products before checking out.
                </p>

                <a href="products.html">
                    Browse Products
                </a>

            </div>

        `;

        calculateOrderTotal();

        updateCartCount();

        return;

    }


    checkoutItems.innerHTML =
        cart.map(
            (
                item,
                index
            ) => {

                const name =
                    getItemName(item);

                const price =
                    getItemPrice(item);

                const quantity =
                    getItemQuantity(item);

                const image =
                    getItemImage(item);

                const itemTotal =
                    price * quantity;


                const imageHTML =
                    image

                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(name)}"
                                class="checkout-item-image"
                            >
                        `

                        : `
                            <div class="checkout-item-placeholder">
                                🛍️
                            </div>
                        `;


                return `

                    <div
                        class="checkout-item"
                        data-index="${index}"
                    >

                        <div class="checkout-item-left">

                            ${imageHTML}

                            <div class="checkout-item-info">

                                <h3>
                                    ${escapeHTML(name)}
                                </h3>

                                <span>
                                    ${formatCurrency(price)}
                                    ×
                                    ${quantity}
                                </span>

                            </div>

                        </div>


                        <div class="checkout-item-right">

                            <strong>
                                ${formatCurrency(itemTotal)}
                            </strong>

                            <button
                                type="button"
                                class="checkout-remove-btn"
                                data-remove-index="${index}"
                            >
                                Remove
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");


    checkoutItems
        .querySelectorAll(
            "[data-remove-index]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset
                                    .removeIndex
                            );


                        if (
                            index >= 0 &&
                            index < cart.length
                        ) {

                            cart.splice(
                                index,
                                1
                            );

                            saveCart();

                            renderCart();

                        }

                    }
                );

            }
        );


    calculateOrderTotal();

    updateCartCount();

}


/* =========================================================
   LOAD SHOP SETTINGS
========================================================= */

async function loadShopSettings() {

    try {

        const {
            data,
            error
        } = await supabase
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


        if (data) {

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

        }


        if (deliveryInformationElement) {

            deliveryInformationElement.textContent =
                shopSettings.delivery_information ||
                "";

        }


        calculateOrderTotal();

        renderCart();

    } catch (error) {

        console.error(
            "SETTINGS ERROR:",
            error
        );

    }

}


/* =========================================================
   MINIMUM ORDER CHECK
========================================================= */

function minimumOrderPassed() {

    const minimum =
        Number(
            shopSettings.minimum_order
        ) || 0;


    if (minimum <= 0) {
        return true;
    }


    return subtotal >= minimum;

}


/* =========================================================
   PAYMENT SCREENSHOT
========================================================= */

function handlePaymentScreenshot() {

    if (!paymentScreenshot) {
        return;
    }


    const file =
        paymentScreenshot.files?.[0];


    if (paymentPreview) {

        paymentPreview.innerHTML =
            "";

    }


    if (!file) {

        updatePlaceOrderButton();

        return;

    }


    if (
        !ALLOWED_PAYMENT_TYPES.includes(
            file.type
        )
    ) {

        showResult(
            "Please upload a JPG, PNG, or WEBP image.",
            "error"
        );


        paymentScreenshot.value =
            "";


        updatePlaceOrderButton();

        return;

    }


    if (
        file.size >
        MAX_PAYMENT_FILE_SIZE
    ) {

        showResult(
            "Payment screenshot must not exceed 5MB.",
            "error"
        );


        paymentScreenshot.value =
            "";


        updatePlaceOrderButton();

        return;

    }


    if (paymentPreview) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            URL.createObjectURL(
                file
            );


        image.alt =
            "Payment Preview";


        image.className =
            "payment-preview-image";


        paymentPreview.appendChild(
            image
        );

    }


    updatePlaceOrderButton();

}


/* =========================================================
   UPDATE PAYMENT BUTTON
========================================================= */

function updatePlaceOrderButton() {

    if (!placeOrderBtn) {
        return;
    }


    const hasFile =
        paymentScreenshot &&
        paymentScreenshot.files?.length > 0;


    const confirmed =
        paymentConfirmed &&
        paymentConfirmed.checked;


    placeOrderBtn.disabled =
        !hasFile ||
        !confirmed;

}


/* =========================================================
   UPLOAD PAYMENT PROOF
========================================================= */

async function uploadPaymentProof(
    file,
    orderId
) {

    if (!file) {

        throw new Error(
            "Payment screenshot is required."
        );

    }


    if (
        !ALLOWED_PAYMENT_TYPES.includes(
            file.type
        )
    ) {

        throw new Error(
            "Only JPG, PNG, and WEBP images are allowed."
        );

    }


    if (
        file.size >
        MAX_PAYMENT_FILE_SIZE
    ) {

        throw new Error(
            "Payment screenshot must not exceed 5MB."
        );

    }


    let extension =
        "jpg";


    if (
        file.type ===
        "image/png"
    ) {

        extension =
            "png";

    }


    if (
        file.type ===
        "image/webp"
    ) {

        extension =
            "webp";

    }


    const filePath =
        `${PAYMENT_FOLDER}/${orderId}-payment-proof-${Date.now()}.${extension}`;


    console.log(
        "Uploading:",
        filePath
    );


    const {
        error
    } = await supabase
        .storage
        .from(
            PAYMENT_BUCKET
        )
        .upload(
            filePath,
            file,
            {
                cacheControl:
                    "3600",

                upsert:
                    false,

                contentType:
                    file.type
            }
        );


    if (error) {

        console.error(
            "PAYMENT UPLOAD ERROR:",
            error
        );

        throw new Error(
            error.message
        );

    }


    const {
        data
    } =
        supabase
            .storage
            .from(
                PAYMENT_BUCKET
            )
            .getPublicUrl(
                filePath
            );


    const publicUrl =
        data?.publicUrl;


    if (!publicUrl) {

        throw new Error(
            "Payment proof URL could not be generated."
        );

    }


    return {

        path:
            filePath,

        url:
            publicUrl

    };

}


/* =========================================================
   CREATE ORDER + ORDER ITEMS + STOCK DEDUCTION
========================================================= */

async function createOrderWithStock(
    orderId,
    orderData,
    orderItems
) {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "create_order_with_stock",
            {
                p_order_id:
                    orderId,

                p_user_id:
                    orderData.user_id,

                p_customer_name:
                    orderData.customer_name,

                p_customer_email:
                    orderData.customer_email,

                p_customer_phone:
                    orderData.customer_phone,

                p_customer_address:
                    orderData.customer_address,

                p_notes:
                    orderData.notes || "",

                p_total:
                    orderData.total,

                p_status:
                    orderData.status,

                p_payment_method:
                    orderData.payment_method,

                p_payment_status:
                    orderData.payment_status,

                p_payment_proof_url:
                    orderData.payment_proof_url,

                p_items:
                    orderItems
            }
        );


    if (error) {

        console.error(
            "RPC ERROR:",
            error
        );

        throw new Error(
            error.message ||
            "Unable to create order."
        );

    }


    return data;

}


/* =========================================================
   SHOW PAYMENT SECTION
========================================================= */

function showPaymentStep() {

    calculateOrderTotal();


    if (!minimumOrderPassed()) {

        const minimum =
            Number(
                shopSettings.minimum_order
            ) || 0;


        const remaining =
            minimum -
            subtotal;


        showResult(
            `Minimum order is ${formatCurrency(
                minimum
            )}. Please add ${formatCurrency(
                remaining
            )} more.`,
            "error"
        );

        return;

    }


    if (reviewSection) {

        reviewSection.classList.add(
            "hidden"
        );

    }


    if (paymentSection) {

        paymentSection.classList.remove(
            "hidden"
        );

    }


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );


    updatePlaceOrderButton();

}


/* =========================================================
   SHOW REVIEW SECTION
========================================================= */

function showReviewStep() {

    if (paymentSection) {

        paymentSection.classList.add(
            "hidden"
        );

    }


    if (reviewSection) {

        reviewSection.classList.remove(
            "hidden"
        );

    }


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder() {

    let uploadedPaymentPath =
        null;


    try {

        /* ---------------------------------------------
           LOGIN
        --------------------------------------------- */

        const loggedIn =
            await requireCustomerLogin();


        if (!loggedIn) {
            return;
        }


        /* ---------------------------------------------
           CART
        --------------------------------------------- */

        loadCart();


        if (!cart.length) {

            showResult(
                "Your cart is empty.",
                "error"
            );

            return;

        }


        calculateOrderTotal();


        /* ---------------------------------------------
           MINIMUM ORDER
        --------------------------------------------- */

        if (!minimumOrderPassed()) {

            const minimum =
                Number(
                    shopSettings.minimum_order
                ) || 0;


            const remaining =
                minimum -
                subtotal;


            showResult(
                `Minimum order is ${formatCurrency(
                    minimum
                )}. Please add ${formatCurrency(
                    remaining
                )} more.`,
                "error"
            );

            return;

        }


        /* ---------------------------------------------
           CUSTOMER INFORMATION
        --------------------------------------------- */

        const name =
            document
                .getElementById(
                    "customerName"
                )
                ?.value
                .trim() || "";


        const email =
            currentUser.email ||
            document
                .getElementById(
                    "customerEmail"
                )
                ?.value
                .trim() ||
            "";


        const phone =
            document
                .getElementById(
                    "customerPhone"
                )
                ?.value
                .trim() || "";


        const address =
            document
                .getElementById(
                    "customerAddress"
                )
                ?.value
                .trim() || "";


        const notes =
            document
                .getElementById(
                    "orderNotes"
                )
                ?.value
                .trim() || "";


        if (!name) {

            showResult(
                "Please enter your name.",
                "error"
            );

            showReviewStep();

            return;

        }


        if (!email) {

            showResult(
                "Your email is required.",
                "error"
            );

            showReviewStep();

            return;

        }


        if (!phone) {

            showResult(
                "Please enter your phone number.",
                "error"
            );

            showReviewStep();

            return;

        }


        if (!address) {

            showResult(
                "Please enter your delivery address.",
                "error"
            );

            showReviewStep();

            return;

        }


        /* ---------------------------------------------
           PAYMENT VALIDATION
        --------------------------------------------- */

        const paymentFile =
            paymentScreenshot?.files?.[0];


        if (!paymentFile) {

            showResult(
                "Please upload your GCash payment screenshot.",
                "error"
            );

            return;

        }


        if (
            paymentConfirmed &&
            !paymentConfirmed.checked
        ) {

            showResult(
                "Please confirm that you have completed the GCash payment.",
                "error"
            );

            return;

        }


        /* ---------------------------------------------
           BUTTON
        --------------------------------------------- */

        if (placeOrderBtn) {

            placeOrderBtn.disabled =
                true;

            placeOrderBtn.textContent =
                "Uploading Payment...";

        }


        showResult(
            "Uploading payment proof...",
            "success"
        );


        /* ---------------------------------------------
           ORDER ID
        --------------------------------------------- */

        const orderId =
            crypto.randomUUID();


        /* ---------------------------------------------
           UPLOAD PAYMENT
        --------------------------------------------- */

        const paymentUpload =
            await uploadPaymentProof(
                paymentFile,
                orderId
            );


        uploadedPaymentPath =
            paymentUpload.path;


        /* ---------------------------------------------
           PREPARE ITEMS
        --------------------------------------------- */

        const orderItems =
            cart.map(
                item => {

                    const productId =
                        getItemProductId(
                            item
                        );


                    if (!productId) {

                        throw new Error(
                            `Product "${getItemName(
                                item
                            )}" has no valid product ID.`
                        );

                    }


                    const quantity =
                        getItemQuantity(
                            item
                        );


                    const price =
                        getItemPrice(
                            item
                        );


                    return {

                        product_id:
                            productId,

                        product_name:
                            getItemName(
                                item
                            ),

                        quantity:
                            quantity,

                        price:
                            price,

                        subtotal:
                            Number(
                                (
                                    price *
                                    quantity
                                ).toFixed(2)
                            )

                    };

                }
            );


        /* ---------------------------------------------
           ORDER DATA
        --------------------------------------------- */

        const orderData = {

            user_id:
                currentUser.id,

            customer_name:
                name,

            customer_email:
                email,

            customer_phone:
                phone,

            customer_address:
                address,

            notes:
                notes || "",

            total:
                Number(
                    orderTotal.toFixed(2)
                ),

            status:
                "Pending",

            payment_method:
                "GCash",

            payment_status:
                "Pending",

            payment_proof_url:
                paymentUpload.url

        };


        /* ---------------------------------------------
           DATABASE TRANSACTION
           
           orders
           order_items
           stock deduction
           
           ALL TOGETHER
        --------------------------------------------- */

        if (placeOrderBtn) {

            placeOrderBtn.textContent =
                "Checking Stock...";

        }


        showResult(
            "Checking product stock...",
            "success"
        );


        await createOrderWithStock(
            orderId,
            orderData,
            orderItems
        );


        /* ---------------------------------------------
           SUCCESS
        --------------------------------------------- */

        console.log(
            "ORDER SUCCESS:",
            orderId
        );


        localStorage.removeItem(
            CART_KEY
        );


        cart = [];


        showResult(
            "Order submitted successfully! Your payment is now pending verification.",
            "success"
        );


        if (placeOrderBtn) {

            placeOrderBtn.textContent =
                "Order Submitted";

        }


        /* ---------------------------------------------
           REDIRECT
        --------------------------------------------- */

        setTimeout(
            () => {

                window.location.href =
                    "customer/customer-orders.html";

            },
            1200
        );


    } catch (error) {

        console.error(
            "CHECKOUT ERROR:",
            error
        );


        /*
         * If the database transaction failed AFTER
         * payment upload, try to remove the uploaded
         * payment file so we don't leave unnecessary
         * files in Storage.
         */

        if (uploadedPaymentPath) {

            try {

                const {
                    error: removeError
                } =
                    await supabase
                        .storage
                        .from(
                            PAYMENT_BUCKET
                        )
                        .remove([
                            uploadedPaymentPath
                        ]);


                if (removeError) {

                    console.warn(
                        "PAYMENT FILE CLEANUP FAILED:",
                        removeError
                    );

                }

            } catch (cleanupError) {

                console.warn(
                    "PAYMENT CLEANUP ERROR:",
                    cleanupError
                );

            }

        }


        let message =
            error?.message ||
            "Something went wrong while placing your order.";


        if (
            message
                .toLowerCase()
                .includes(
                    "not enough stock"
                )
        ) {

            message =
                `Order cannot be placed. ${message}`;

        }


        showResult(
            message,
            "error"
        );


        if (placeOrderBtn) {

            placeOrderBtn.textContent =
                "Confirm Payment & Place Order";

        }


        updatePlaceOrderButton();

    }

}


/* =========================================================
   EVENTS
========================================================= */


/* PAYMENT SCREENSHOT */

if (paymentScreenshot) {

    paymentScreenshot.addEventListener(
        "change",
        handlePaymentScreenshot
    );

}


/* PAYMENT CONFIRMATION */

if (paymentConfirmed) {

    paymentConfirmed.addEventListener(
        "change",
        updatePlaceOrderButton
    );

}


/* PLACE ORDER */

if (placeOrderBtn) {

    placeOrderBtn.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            await placeOrder();

        }
    );

}


/* BACK TO REVIEW */

if (backToReviewBtn) {

    backToReviewBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showReviewStep();

        }
    );

}


/* PROCEED TO PAYMENT */

if (proceedPaymentBtn) {

    proceedPaymentBtn.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            const loggedIn =
                await requireCustomerLogin();


            if (!loggedIn) {
                return;
            }


            loadCart();

            calculateOrderTotal();


            if (!cart.length) {

                showResult(
                    "Your cart is empty.",
                    "error"
                );

                return;

            }


            if (!minimumOrderPassed()) {

                const minimum =
                    Number(
                        shopSettings.minimum_order
                    ) || 0;


                const remaining =
                    minimum -
                    subtotal;


                showResult(
                    `Minimum order is ${formatCurrency(
                        minimum
                    )}. Please add ${formatCurrency(
                        remaining
                    )} more.`,
                    "error"
                );

                return;

            }


            showPaymentStep();

        }
    );

}


/* FORM */

if (checkoutForm) {

    checkoutForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const loggedIn =
                await requireCustomerLogin();


            if (!loggedIn) {
                return;
            }


            loadCart();

            calculateOrderTotal();


            if (!cart.length) {

                showResult(
                    "Your cart is empty.",
                    "error"
                );

                return;

            }


            if (!minimumOrderPassed()) {

                const minimum =
                    Number(
                        shopSettings.minimum_order
                    ) || 0;


                const remaining =
                    minimum -
                    subtotal;


                showResult(
                    `Minimum order is ${formatCurrency(
                        minimum
                    )}. Please add ${formatCurrency(
                        remaining
                    )} more.`,
                    "error"
                );

                return;

            }


            showPaymentStep();

        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeCheckout() {

    console.log(
        "Initializing checkout..."
    );


    const loggedIn =
        await requireCustomerLogin();


    if (!loggedIn) {
        return;
    }


    currentUser =
        await getCurrentCustomer();


    if (!currentUser) {

        window.location.href =
            "login.html";

        return;

    }


    console.log(
        "Customer:",
        currentUser.email
    );


    console.log(
        "User ID:",
        currentUser.id
    );


    loadCart();

    renderCart();

    calculateOrderTotal();

    updateCartCount();

    updatePlaceOrderButton();


    await loadCustomerProfile();

    await loadShopSettings();


    renderCart();

    calculateOrderTotal();

    updateCartCount();

    updatePlaceOrderButton();


    console.log(
        "CHECKOUT READY"
    );

}


initializeCheckout();