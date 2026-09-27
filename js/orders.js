/* =========================================================
   ORDERS.JS
   Business Store - Customer Order History
   Customer Account Version
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";


const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";


const supabase =
    createClient(
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
   ELEMENTS
========================================================= */

const orderSearchForm =
    document.getElementById(
        "orderSearchForm"
    );


const orderEmail =
    document.getElementById(
        "orderEmail"
    );


const searchOrdersBtn =
    document.getElementById(
        "searchOrdersBtn"
    );


const ordersResult =
    document.getElementById(
        "ordersResult"
    );


const ordersList =
    document.getElementById(
        "ordersList"
    );


const cartCount =
    document.getElementById(
        "cartCount"
    );


/* =========================================================
   CART COUNT
========================================================= */

function updateCartCount() {

    try {

        const cart =
            JSON.parse(
                localStorage.getItem(
                    "businessStoreCart"
                ) || "[]"
            );


        const totalQuantity =
            cart.reduce(
                (total, item) => {

                    return total +
                        Number(
                            item.quantity || 0
                        );

                },
                0
            );


        if (cartCount) {

            cartCount.textContent =
                totalQuantity;

        }

    } catch (error) {

        console.error(
            "Unable to read cart:",
            error
        );

        if (cartCount) {
            cartCount.textContent = "0";
        }

    }

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }
    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Unknown date";
    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Unknown date";
    }


    return date.toLocaleString(
        "en-PH",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    return String(
        status || "Pending"
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* =========================================================
   SHOW RESULT
========================================================= */

function showResult(
    message,
    type = ""
) {

    if (!ordersResult) {
        return;
    }


    ordersResult.textContent =
        message;


    ordersResult.className =
        "orders-result";


    if (type) {

        ordersResult.classList.add(
            type
        );

    }

}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoading() {

    if (!ordersList) {
        return;
    }


    ordersList.innerHTML = `

        <div class="orders-loading">

            <div class="orders-loading-spinner"></div>

            <span>
                Loading your orders...
            </span>

        </div>

    `;

}


/* =========================================================
   EMPTY STATE
========================================================= */

function showEmpty(
    title = "No Orders Found",
    message = "You don't have any orders yet."
) {

    if (!ordersList) {
        return;
    }


    ordersList.innerHTML = `

        <div class="orders-empty">

            <div class="orders-empty-icon">
                🧾
            </div>

            <h2>
                ${escapeHTML(title)}
            </h2>

            <p>
                ${escapeHTML(message)}
            </p>

        </div>

    `;

}


/* =========================================================
   GET CURRENT CUSTOMER
========================================================= */

async function getCurrentCustomer() {

    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        return null;

    }


    return data?.session?.user || null;

}


/* =========================================================
   REDIRECT TO LOGIN
========================================================= */

function redirectToLogin() {

    sessionStorage.setItem(
        "businessStoreLoginRedirect",
        window.location.href
    );


    window.location.href =
        "customer%20login.html";

}


/* =========================================================
   LOAD CUSTOMER ORDERS
========================================================= */

async function loadOrders() {

    const currentUser =
        await getCurrentCustomer();


    if (!currentUser) {

        redirectToLogin();

        return [];

    }


    /*
        IMPORTANT:

        We no longer search by customer_email.

        Every order is connected to the
        authenticated customer's Supabase
        auth.users.id through orders.user_id.

        Therefore this customer can only
        request their own orders.
    */

    const {
        data: orders,
        error: ordersError
    } = await supabase

        .from("orders")

        .select("*")

        .eq(
            "user_id",
            currentUser.id
        )

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (ordersError) {

        console.error(
            "Orders query error:",
            ordersError
        );

        throw new Error(
            "Unable to load orders."
        );

    }


    if (
        !orders ||
        orders.length === 0
    ) {

        return [];

    }


    /*
        Get order IDs.
    */

    const orderIds =
        orders.map(
            order => order.id
        );


    /*
        Get order items.
    */

    const {
        data: orderItems,
        error: itemsError
    } = await supabase

        .from("order_items")

        .select("*")

        .in(
            "order_id",
            orderIds
        );


    if (itemsError) {

        console.error(
            "Order items query error:",
            itemsError
        );

        throw new Error(
            "Unable to load order items."
        );

    }


    /*
        Group items by order.
    */

    const itemsByOrder =
        {};


    (orderItems || [])
        .forEach(item => {

            if (
                !itemsByOrder[
                    item.order_id
                ]
            ) {

                itemsByOrder[
                    item.order_id
                ] = [];

            }


            itemsByOrder[
                item.order_id
            ].push(item);

        });


    /*
        Attach items to orders.
    */

    return orders.map(order => ({

        ...order,

        items:
            itemsByOrder[
                order.id
            ] || []

    }));

}


/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders(orders) {

    if (!ordersList) {
        return;
    }


    if (
        !orders ||
        orders.length === 0
    ) {

        showEmpty(
            "No Orders Yet",
            "Your orders will appear here after you place your first order."
        );

        return;

    }


    ordersList.innerHTML =
        orders
            .map(
                renderOrder
            )
            .join("");

}


/* =========================================================
   RENDER SINGLE ORDER
========================================================= */

function renderOrder(order) {

    const status =
        order.status ||
        "Pending";


    const paymentStatus =
        order.payment_status ||
        "Pending";


    const statusClass =
        getStatusClass(
            status
        );


    const items =
        Array.isArray(
            order.items
        )
            ? order.items
            : [];


    const itemsHTML =
        items.length > 0

            ? items
                .map(
                    renderOrderItem
                )
                .join("")

            : `

                <div class="order-item">

                    <div class="order-item-image">
                        📦
                    </div>

                    <div class="order-item-info">

                        <div class="order-item-name">
                            No item details
                        </div>

                        <div class="order-item-meta">
                            Order item information is unavailable.
                        </div>

                    </div>

                    <div class="order-item-total">
                        —
                    </div>

                </div>

            `;


    return `

        <article class="order-card">


            <!-- ORDER HEADER -->

            <div class="order-card-header">

                <div class="order-id-wrapper">

                    <span class="order-id-label">
                        ORDER ID
                    </span>

                    <span class="order-id">
                        ${escapeHTML(
                            order.id
                        )}
                    </span>

                    <span class="order-date">
                        ${escapeHTML(
                            formatDate(
                                order.created_at
                            )
                        )}
                    </span>

                </div>


                <span
                    class="
                        order-status
                        ${escapeHTML(
                            statusClass
                        )}
                    "
                >
                    ${escapeHTML(
                        status
                    )}
                </span>

            </div>


            <!-- CUSTOMER DETAILS -->

            <div class="order-details-grid">


                <div class="order-detail">

                    <span class="order-detail-label">
                        Customer
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            order.customer_name
                        )}
                    </span>

                </div>


                <div class="order-detail">

                    <span class="order-detail-label">
                        Email
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            order.customer_email
                        )}
                    </span>

                </div>


                <div class="order-detail">

                    <span class="order-detail-label">
                        Phone
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            order.customer_phone
                        )}
                    </span>

                </div>


                <div class="order-detail">

                    <span class="order-detail-label">
                        Address
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            order.customer_address
                        )}
                    </span>

                </div>


                <div class="order-detail">

                    <span class="order-detail-label">
                        Payment
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            order.payment_method ||
                            "GCash"
                        )}
                    </span>

                </div>


                <div class="order-detail">

                    <span class="order-detail-label">
                        Payment Status
                    </span>

                    <span class="order-detail-value">
                        ${escapeHTML(
                            paymentStatus
                        )}
                    </span>

                </div>


            </div>


            <!-- ORDER ITEMS -->

            <div class="order-items">

                <div class="order-items-title">
                    ORDER ITEMS
                </div>

                ${itemsHTML}

            </div>


            <!-- ORDER FOOTER -->

            <div class="order-card-footer">


                <div>

                    <span class="order-total-label">
                        TOTAL
                    </span>

                    <span class="order-total">
                        ${formatCurrency(
                            order.total
                        )}
                    </span>

                </div>


                <div class="order-payment">

                    <span class="order-payment-label">
                        Payment
                    </span>

                    <span class="order-payment-value">
                        ${escapeHTML(
                            paymentStatus
                        )}
                    </span>

                </div>


                <!-- VIEW ORDER -->

                <button
                    type="button"
                    class="view-order-btn"
                    data-order-id="${escapeHTML(
                        order.id
                    )}"
                >
                    View Order
                </button>


            </div>


        </article>

    `;

}


/* =========================================================
   RENDER ORDER ITEM
========================================================= */

function renderOrderItem(item) {

    const productName =
        item.product_name ||
        "Product";


    const quantity =
        Number(
            item.quantity || 0
        );


    const price =
        Number(
            item.price || 0
        );


    const subtotal =
        Number(
            item.subtotal ??
            (
                price *
                quantity
            )
        );


    return `

        <div class="order-item">


            <div class="order-item-image">

                📦

            </div>


            <div class="order-item-info">

                <div class="order-item-name">

                    ${escapeHTML(
                        productName
                    )}

                </div>


                <div class="order-item-meta">

                    Quantity:
                    ${quantity}

                    &nbsp;•&nbsp;

                    ${formatCurrency(
                        price
                    )}
                    each

                </div>

            </div>


            <div class="order-item-total">

                ${formatCurrency(
                    subtotal
                )}

            </div>


        </div>

    `;

}


/* =========================================================
   VIEW ORDER DETAILS
========================================================= */

function handleViewOrder(event) {

    const button =
        event.target.closest(
            ".view-order-btn"
        );


    if (!button) {
        return;
    }


    const orderId =
        button.dataset.orderId;


    if (!orderId) {
        return;
    }


    window.location.href =
        `order-details.html?id=${encodeURIComponent(
            orderId
        )}`;

}


/* =========================================================
   LOAD ORDERS ON PAGE
========================================================= */

async function initializeOrders() {

    /*
        Customer must be logged in.
    */

    const currentUser =
        await getCurrentCustomer();


    if (!currentUser) {

        redirectToLogin();

        return;

    }


    /*
        Hide old email search because
        the account system now knows
        exactly which customer is logged in.
    */

    if (orderSearchForm) {

        orderSearchForm.style.display =
            "none";

    }


    /*
        Hide old email input/card if
        they exist in the HTML.
    */

    const searchCard =
        document.querySelector(
            ".orders-search-card"
        );


    if (searchCard) {

        searchCard.style.display =
            "none";

    }


    showResult(
        "Loading your order history...",
        ""
    );


    showLoading();


    try {

        const orders =
            await loadOrders();


        if (
            !orders ||
            orders.length === 0
        ) {

            showResult(
                "You don't have any orders yet.",
                ""
            );

            showEmpty(
                "No Orders Yet",
                "Your orders will appear here after you place your first order."
            );

            return;

        }


        showResult(
            `${orders.length} order${
                orders.length === 1
                    ? ""
                    : "s"
            } found.`,
            "success"
        );


        renderOrders(
            orders
        );

    } catch (error) {

        console.error(
            "Loading customer orders failed:",
            error
        );


        showResult(
            "Unable to load your orders.",
            "error"
        );


        showEmpty(
            "Unable to Load Orders",
            "There was a problem connecting to your order history."
        );

    }

}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );


const mobileNav =
    document.getElementById(
        "mobileNav"
    );


if (
    mobileMenuButton &&
    mobileNav
) {

    mobileMenuButton.addEventListener(
        "click",
        () => {

            mobileNav.classList.toggle(
                "open"
            );


            mobileMenuButton.classList.toggle(
                "active"
            );

        }
    );


    document
        .querySelectorAll(
            ".mobile-nav a"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    mobileNav.classList.remove(
                        "open"
                    );


                    mobileMenuButton.classList.remove(
                        "active"
                    );

                }
            );

        });

}


/* =========================================================
   VIEW ORDER CLICK
========================================================= */

if (ordersList) {

    ordersList.addEventListener(
        "click",
        handleViewOrder
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

updateCartCount();

initializeOrders();