/* =========================================================
   ORDER-DETAILS.JS
   Business Store
   Customer Order Details
========================================================= */

import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";


/* =========================================================
   ELEMENTS
========================================================= */

const container =
    document.getElementById(
        "orderDetailsContainer"
    );

const result =
    document.getElementById(
        "orderDetailsResult"
    );

const cartCount =
    document.getElementById(
        "cartCount"
    );


/* =========================================================
   GET ORDER ID
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const orderId =
    urlParams.get("id");


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

        const total =
            Array.isArray(cart)
                ? cart.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item?.quantity ??
                            item?.qty ??
                            0
                        ),
                    0
                )
                : 0;

        if (cartCount) {

            cartCount.textContent =
                String(total);

        }

    } catch (error) {

        console.error(
            "Cart error:",
            error
        );

        if (cartCount) {

            cartCount.textContent =
                "0";

        }

    }

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
   NORMALIZE
========================================================= */

function normalize(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[-_]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    const amount =
        Number(value) || 0;

    return amount.toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }
    );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {

        return "Unknown date";

    }

    const date =
        new Date(value);

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
   SHOW RESULT
========================================================= */

function showResult(
    message,
    type = ""
) {

    if (!result) {

        return;

    }

    result.textContent =
        message;

    result.className =
        "orders-result";

    if (type) {

        result.classList.add(
            type
        );

    }

}


/* =========================================================
   LOGIN REDIRECT
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
   ITEMS HELPERS
========================================================= */

function parseOrderItems(
    order
) {

    let items =
        order?.items;


    if (
        typeof items ===
        "string"
    ) {

        try {

            items =
                JSON.parse(
                    items
                );

        } catch {

            items = [];

        }

    }


    return Array.isArray(
        items
    )
        ? items
        : [];

}


function getItemName(
    item
) {

    return (
        item?.product_name
        ||
        item?.name
        ||
        item?.title
        ||
        "Product"
    );

}


function getItemQuantity(
    item
) {

    return (
        Number(
            item?.quantity ??
            item?.qty ??
            1
        )
        || 1
    );

}


function getItemPrice(
    item
) {

    return (
        Number(
            item?.price ??
            item?.unit_price ??
            item?.product_price ??
            0
        )
        || 0
    );

}


function getItemSubtotal(
    item
) {

    const explicit =
        Number(
            item?.subtotal ??
            item?.total
        );


    if (
        Number.isFinite(
            explicit
        )
        &&
        explicit > 0
    ) {

        return explicit;

    }


    return (
        getItemPrice(
            item
        )
        *
        getItemQuantity(
            item
        )
    );

}


function getItemImage(
    item
) {

    return (
        item?.image
        ||
        item?.image_url
        ||
        item?.product_image
        ||
        item?.photo
        ||
        ""
    );

}


/* =========================================================
   LOAD ORDER ITEMS
========================================================= */

async function loadOrderItems(
    order
) {

    const embeddedItems =
        parseOrderItems(
            order
        );


    /*
       First try the order_items table.
    */

    if (order?.id) {

        try {

            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "order_items"
                    )
                    .select("*")
                    .eq(
                        "order_id",
                        order.id
                    );


            if (
                !error &&
                Array.isArray(data) &&
                data.length > 0
            ) {

                return data;

            }


            if (error) {

                console.warn(
                    "order_items query warning:",
                    error
                );

            }

        } catch (error) {

            console.warn(
                "order_items query failed:",
                error
            );

        }

    }


    /*
       Fallback to items JSON stored
       directly inside orders.
    */

    return embeddedItems;

}


/* =========================================================
   PAYMENT PROOF
========================================================= */

function getPaymentProofCandidates(
    value
) {

    let raw =
        String(
            value ?? ""
        ).trim();


    if (!raw) {

        return [];

    }


    /*
       If database contains an object-like
       value converted to JSON.
    */

    try {

        if (
            raw.startsWith("{") &&
            raw.endsWith("}")
        ) {

            const parsed =
                JSON.parse(
                    raw
                );

            raw =
                parsed?.url
                ||
                parsed?.path
                ||
                parsed?.file
                ||
                parsed?.name
                ||
                "";

        }

    } catch {

        /* Ignore */

    }


    if (!raw) {

        return [];

    }


    /*
       Complete URL.
    */

    if (
        raw.startsWith(
            "http://"
        )
        ||
        raw.startsWith(
            "https://"
        )
        ||
        raw.startsWith(
            "data:"
        )
    ) {

        return [
            raw
        ];

    }


    let cleaned =
        raw.replace(
            /^\/+/,
            ""
        );


    /*
       Remove bucket name if accidentally
       stored inside payment_proof.
    */

    const bucketPrefix =
        "payment-proofs/";


    if (
        cleaned
            .toLowerCase()
            .startsWith(
                bucketPrefix
            )
    ) {

        cleaned =
            cleaned.slice(
                bucketPrefix.length
            );

    }


    cleaned =
        cleaned.replace(
            /^\/+/,
            ""
        );


    const candidates = [];


    /*
       Exact stored path.
    */

    if (cleaned) {

        candidates.push(
            cleaned
        );

    }


    /*
       Your current storage setup uses:
       payment-proofs/payments/...
    */

    if (
        !normalize(
            cleaned
        ).startsWith(
            "payments/"
        )
    ) {

        candidates.push(
            `payments/${cleaned}`
        );

    }


    /*
       Remove duplicate candidates.
    */

    return [
        ...new Set(
            candidates
        )
    ];

}


/* =========================================================
   BUILD PAYMENT PROOF URL
========================================================= */

async function getPaymentProofUrl(
    order
) {

    const raw =
        order?.payment_proof;


    if (!raw) {

        console.log(
            "No payment_proof stored for order:",
            order?.id
        );

        return "";

    }


    const candidates =
        getPaymentProofCandidates(
            raw
        );


    if (
        candidates.length === 0
    ) {

        return "";

    }


    console.log(
        "Payment proof candidates:",
        candidates
    );


    /*
       Try each possible storage path.
    */

    for (
        const path of candidates
    ) {

        /*
           1. Signed URL
        */

        try {

            const {
                data,
                error
            } =
                await supabase
                    .storage
                    .from(
                        "payment-proofs"
                    )
                    .createSignedUrl(
                        path,
                        3600
                    );


            if (
                !error &&
                data?.signedUrl
            ) {

                console.log(
                    "Payment proof signed URL found:",
                    path
                );

                return data.signedUrl;

            }


            if (error) {

                console.warn(
                    "Signed URL failed:",
                    path,
                    error.message
                );

            }

        } catch (error) {

            console.warn(
                "Signed URL exception:",
                path,
                error
            );

        }


        /*
           2. Public URL
        */

        try {

            const {
                data
            } =
                supabase
                    .storage
                    .from(
                        "payment-proofs"
                    )
                    .getPublicUrl(
                        path
                    );


            if (
                data?.publicUrl
            ) {

                console.log(
                    "Payment proof public URL:",
                    path
                );

                return data.publicUrl;

            }

        } catch (error) {

            console.warn(
                "Public URL failed:",
                path,
                error
            );

        }

    }


    return "";

}


/* =========================================================
   COORDINATES
========================================================= */

function getLatitude(
    order
) {

    return (
        order?.delivery_latitude
        ??
        order?.latitude
        ??
        order?.delivery_lat
        ??
        null
    );

}


function getLongitude(
    order
) {

    return (
        order?.delivery_longitude
        ??
        order?.longitude
        ??
        order?.delivery_lng
        ??
        null
    );

}


function hasCoordinates(
    order
) {

    const latitude =
        Number(
            getLatitude(
                order
            )
        );

    const longitude =
        Number(
            getLongitude(
                order
            )
        );


    return (
        Number.isFinite(
            latitude
        )
        &&
        Number.isFinite(
            longitude
        )
        &&
        latitude >= -90
        &&
        latitude <= 90
        &&
        longitude >= -180
        &&
        longitude <= 180
    );

}


/* =========================================================
   DELIVERY PROVIDER
========================================================= */

function getDeliveryProvider(
    order
) {

    return (
        order?.delivery_provider
        ||
        (
            Number(
                order?.delivery_fee
            ) > 0
                ? "Delivery"
                : "Pickup"
        )
    );

}


/* =========================================================
   ORDER STATUS
========================================================= */

const statusSteps = [

    "Pending",

    "In Progress",

    "To Deliver",

    "On the Way",

    "Completed"

];


/* =========================================================
   GET STATUS INDEX
========================================================= */

function getStatusIndex(
    status
) {

    const normalized =
        normalize(
            status
        );


    if (
        normalized.includes(
            "reject"
        )
    ) {

        return -1;

    }


    if (
        normalized ===
        "completed"
        ||
        normalized ===
        "delivered"
    ) {

        return 4;

    }


    if (
        normalized ===
        "on the way"
        ||
        normalized ===
        "out for delivery"
    ) {

        return 3;

    }


    if (
        normalized.includes(
            "deliver"
        )
        ||
        normalized.includes(
            "ship"
        )
    ) {

        return 2;

    }


    if (
        normalized.includes(
            "progress"
        )
        ||
        normalized.includes(
            "process"
        )
    ) {

        return 1;

    }


    return 0;

}


/* =========================================================
   RENDER TRACKER
========================================================= */

function renderTracker(
    status
) {

    const normalized =
        normalize(
            status
        );


    if (
        normalized ===
        "rejected"
    ) {

        return `

            <div
                class="order-tracker"
            >

                <div
                    class="order-tracker-title"
                >
                    ORDER STATUS
                </div>


                <div
                    class="order-info-box"
                >

                    <strong>
                        Order Rejected
                    </strong>


                    <p
                        style="
                            margin-top:8px;
                            color:#999;
                        "
                    >
                        This order has been rejected.
                    </p>

                </div>

            </div>

        `;

    }


    if (
        normalized ===
        "payment rejected"
    ) {

        return `

            <div
                class="order-tracker"
            >

                <div
                    class="order-tracker-title"
                >
                    ORDER STATUS
                </div>


                <div
                    class="order-info-box"
                >

                    <strong>
                        Payment Rejected
                    </strong>


                    <p
                        style="
                            margin-top:8px;
                            color:#999;
                        "
                    >
                        Your payment proof was rejected.
                    </p>

                </div>

            </div>

        `;

    }


    const currentIndex =
        getStatusIndex(
            status
        );


    const safeIndex =
        currentIndex >= 0
            ? currentIndex
            : 0;


    return `

        <div
            class="order-tracker"
        >

            <div
                class="order-tracker-title"
            >
                ORDER STATUS
            </div>


            <div
                class="order-tracker-list"
            >

                ${
                    statusSteps
                        .map(
                            (
                                step,
                                index
                            ) => {

                                let className =
                                    "";

                                if (
                                    index <
                                    safeIndex
                                ) {

                                    className =
                                        "completed";

                                }

                                if (
                                    index ===
                                    safeIndex
                                ) {

                                    className =
                                        "active";

                                }


                                return `

                                    <div
                                        class="
                                            tracker-step
                                            ${className}
                                        "
                                    >

                                        <div
                                            class="tracker-dot"
                                        >

                                            ${
                                                index <
                                                safeIndex
                                                    ? "✓"
                                                    : index ===
                                                      safeIndex
                                                        ? "●"
                                                        : ""
                                            }

                                        </div>


                                        <span>
                                            ${escapeHTML(
                                                step
                                            )}
                                        </span>

                                    </div>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        </div>

    `;

}


/* =========================================================
   RENDER ITEMS
========================================================= */

function renderItems(
    items
) {

    if (
        !Array.isArray(
            items
        )
        ||
        items.length === 0
    ) {

        return `

            <div
                class="order-notes"
            >
                No item information available.
            </div>

        `;

    }


    return items
        .map(
            item => {

                const name =
                    getItemName(
                        item
                    );


                const quantity =
                    getItemQuantity(
                        item
                    );


                const price =
                    getItemPrice(
                        item
                    );


                const subtotal =
                    getItemSubtotal(
                        item
                    );


                const image =
                    getItemImage(
                        item
                    );


                return `

                    <div
                        class="details-item"
                    >

                        <div
                            class="details-item-main"
                            style="
                                display:flex;
                                align-items:center;
                                gap:13px;
                                min-width:0;
                            "
                        >

                            ${
                                image

                                    ? `

                                        <img
                                            src="${escapeHTML(
                                                image
                                            )}"
                                            alt="${escapeHTML(
                                                name
                                            )}"
                                            style="
                                                width:58px;
                                                height:58px;
                                                border-radius:12px;
                                                object-fit:cover;
                                                background:rgba(255,255,255,.05);
                                                border:1px solid rgba(255,255,255,.08);
                                                flex:0 0 auto;
                                            "
                                            loading="lazy"
                                        >

                                    `

                                    : `

                                        <div
                                            style="
                                                width:58px;
                                                height:58px;
                                                border-radius:12px;
                                                display:flex;
                                                align-items:center;
                                                justify-content:center;
                                                background:rgba(255,255,255,.05);
                                                border:1px solid rgba(255,255,255,.08);
                                                color:#888;
                                                flex:0 0 auto;
                                            "
                                        >
                                            ◇
                                        </div>

                                    `
                            }


                            <div>

                                <div
                                    class="details-item-name"
                                >
                                    ${escapeHTML(
                                        name
                                    )}
                                </div>


                                <div
                                    class="details-item-meta"
                                >
                                    ${formatCurrency(
                                        price
                                    )}
                                    each
                                </div>

                            </div>

                        </div>


                        <div
                            class="details-item-qty"
                        >
                            × ${quantity}
                        </div>


                        <div
                            class="details-item-total"
                        >
                            ${formatCurrency(
                                subtotal
                            )}
                        </div>

                    </div>

                `;

            }
        )
        .join("");

}


/* =========================================================
   RENDER PAYMENT PROOF
========================================================= */

function renderPaymentProof(
    order
) {

    const paymentStatus =
        order?.payment_status
        ||
        "Pending";


    const paymentMethod =
        order?.payment_method
        ||
        "GCash";


    const proofUrl =
        order?.payment_proof_url
        ||
        "";


    if (!proofUrl) {

        return `

            <div
                class="payment-proof-empty"
            >

                <div
                    style="
                        font-size:2rem;
                        margin-bottom:10px;
                    "
                >
                    🧾
                </div>


                <strong>
                    Payment proof not available
                </strong>


                <p
                    style="
                        margin-top:8px;
                        color:#888;
                        line-height:1.5;
                    "
                >
                    No payment screenshot was found
                    for this order.
                </p>

            </div>

        `;

    }


    return `

        <div
            class="payment-proof-shell"
        >

            <div
                class="payment-proof-preview"
            >

                <img
                    id="paymentProofImage"
                    src="${escapeHTML(
                        proofUrl
                    )}"
                    alt="Payment Proof"
                    class="payment-proof-image"
                    loading="lazy"
                >

            </div>


            <div
                class="payment-proof-info"
            >

                <div
                    class="payment-proof-status"
                >
                    ${escapeHTML(
                        paymentStatus
                    )}
                </div>


                <h3>
                    ${escapeHTML(
                        paymentMethod
                    )}
                </h3>


                <p>
                    This is the payment screenshot
                    uploaded with this order.
                </p>


                <a
                    href="${escapeHTML(
                        proofUrl
                    )}"
                    target="_blank"
                    rel="noopener"
                    class="payment-proof-open-btn"
                >
                    Open Full Proof
                </a>

            </div>

        </div>

    `;

}


/* =========================================================
   RENDER DELIVERY
========================================================= */

function renderDelivery(
    order
) {

    const provider =
        getDeliveryProvider(
            order
        );


    const providerNormalized =
        normalize(
            provider
        );


    const isLalamove =
        providerNormalized.includes(
            "lalamove"
        );


    const deliveryAddress =
        order?.customer_address
        ||
        order?.delivery_address
        ||
        order?.address
        ||
        "Delivery address not available";


    const deliveryFee =
        Number(
            order?.delivery_fee
        ) || 0;


    const latitude =
        getLatitude(
            order
        );


    const longitude =
        getLongitude(
            order
        );


    const hasLocation =
        hasCoordinates(
            order
        );


    const googleMapsUrl =
        hasLocation

            ? `https://www.google.com/maps/search/?api=1&query=${
                encodeURIComponent(
                    `${latitude},${longitude}`
                )
            }`

            : `https://www.google.com/maps/search/?api=1&query=${
                encodeURIComponent(
                    deliveryAddress
                )
            }`;


    let mapHtml =
        "";


    if (
        hasLocation
    ) {

        const lat =
            Number(
                latitude
            );


        const lng =
            Number(
                longitude
            );


        const offset =
            0.005;


        const bbox =
            [
                lng - offset,
                lat - offset,
                lng + offset,
                lat + offset
            ]
            .map(
                value =>
                    encodeURIComponent(
                        value
                    )
            )
            .join("%2C");


        const mapUrl =
            `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(
                lat
            )}%2C${encodeURIComponent(
                lng
            )}`;


        mapHtml = `

            <iframe
                src="${mapUrl}"
                class="delivery-map"
                loading="lazy"
                title="Delivery Location Map"
                referrerpolicy="no-referrer-when-downgrade"
                style="
                    width:100%;
                    height:320px;
                    border:0;
                    border-radius:16px;
                    margin-top:15px;
                    background:#0a0a0a;
                "
            ></iframe>

        `;

    }


    const quotationId =
        order?.lalamove_quotation_id
        ||
        order?.lalamove_quote_id
        ||
        order?.quotation_id
        ||
        "";


    const quoteExpires =
        order?.lalamove_quote_expires_at
        ||
        order?.lalamove_quotation_expires_at
        ||
        "";


    return `

        <div
            class="delivery-hero"
        >

            <div
                class="delivery-provider-row"
            >

                <div
                    class="delivery-provider"
                >

                    <div
                        class="delivery-provider-icon"
                    >
                        🚚
                    </div>


                    <div>

                        <div>
                            ${escapeHTML(
                                provider
                            )}
                        </div>


                        <div
                            style="
                                color:#888;
                                font-size:.72rem;
                                margin-top:3px;
                            "
                        >

                            ${
                                isLalamove
                                    ? "Lalamove Delivery"
                                    : "Delivery Service"
                            }

                        </div>

                    </div>

                </div>


                <div
                    class="delivery-fee-large"
                >

                    ${
                        deliveryFee > 0
                            ? formatCurrency(
                                deliveryFee
                            )
                            : "FREE"
                    }

                </div>

            </div>


            <div
                class="delivery-address-box"
            >

                <div
                    class="delivery-address-label"
                >
                    DELIVERY LOCATION
                </div>


                <div
                    class="delivery-address"
                >
                    ${escapeHTML(
                        deliveryAddress
                    )}
                </div>


                ${
                    hasLocation

                        ? `

                            <div
                                style="
                                    margin-top:8px;
                                    color:#888;
                                    font-size:.72rem;
                                "
                            >

                                Coordinates:
                                ${escapeHTML(
                                    String(
                                        latitude
                                    )
                                )},
                                ${escapeHTML(
                                    String(
                                        longitude
                                    )
                                )}

                            </div>

                        `

                        : ""

                }


                <div
                    class="delivery-buttons"
                >

                    <a
                        href="${escapeHTML(
                            googleMapsUrl
                        )}"
                        target="_blank"
                        rel="noopener"
                        class="delivery-map-btn"
                    >
                        📍 Open Google Maps
                    </a>

                </div>

            </div>


            ${mapHtml}


            ${
                isLalamove

                    ? `

                        <div
                            class="lalamove-card"
                        >

                            <div
                                class="lalamove-title"
                            >
                                🚚 Lalamove Details
                            </div>


                            <div
                                class="lalamove-grid"
                            >

                                <div
                                    class="lalamove-item"
                                >

                                    <span
                                        class="lalamove-item-label"
                                    >
                                        Provider
                                    </span>

                                    <div
                                        class="lalamove-item-value"
                                    >
                                        Lalamove
                                    </div>

                                </div>


                                <div
                                    class="lalamove-item"
                                >

                                    <span
                                        class="lalamove-item-label"
                                    >
                                        Delivery Fee
                                    </span>

                                    <div
                                        class="lalamove-item-value"
                                    >
                                        ${formatCurrency(
                                            deliveryFee
                                        )}
                                    </div>

                                </div>


                                <div
                                    class="lalamove-item"
                                >

                                    <span
                                        class="lalamove-item-label"
                                    >
                                        Quotation ID
                                    </span>

                                    <div
                                        class="lalamove-item-value"
                                    >

                                        ${
                                            quotationId
                                                ? escapeHTML(
                                                    quotationId
                                                )
                                                : "Not available"
                                        }

                                    </div>

                                </div>


                                <div
                                    class="lalamove-item"
                                >

                                    <span
                                        class="lalamove-item-label"
                                    >
                                        Quote Expiry
                                    </span>

                                    <div
                                        class="lalamove-item-value"
                                    >

                                        ${
                                            quoteExpires
                                                ? escapeHTML(
                                                    formatDate(
                                                        quoteExpires
                                                    )
                                                )
                                                : "Not available"
                                        }

                                    </div>

                                </div>

                            </div>

                        </div>

                    `

                    : ""

            }

        </div>

    `;

}


/* =========================================================
   RENDER CUSTOMER INFO
========================================================= */

function renderCustomerInfo(
    order
) {

    const customerName =
        order?.customer_name
        ||
        "Not provided";


    const customerEmail =
        order?.customer_email
        ||
        order?.email
        ||
        "Not provided";


    const customerPhone =
        order?.customer_phone
        ||
        order?.phone
        ||
        "Not provided";


    return `

        <div
            class="order-info-grid"
        >

            <div
                class="order-info-box"
            >

                <span
                    class="order-info-label"
                >
                    Name
                </span>


                <div
                    class="order-info-value"
                >
                    ${escapeHTML(
                        customerName
                    )}
                </div>

            </div>


            <div
                class="order-info-box"
            >

                <span
                    class="order-info-label"
                >
                    Email
                </span>


                <div
                    class="order-info-value"
                >
                    ${escapeHTML(
                        customerEmail
                    )}
                </div>

            </div>


            <div
                class="order-info-box"
            >

                <span
                    class="order-info-label"
                >
                    Phone
                </span>


                <div
                    class="order-info-value"
                >
                    ${escapeHTML(
                        customerPhone
                    )}
                </div>

            </div>


            <div
                class="order-info-box"
            >

                <span
                    class="order-info-label"
                >
                    Order Date
                </span>


                <div
                    class="order-info-value"
                >
                    ${escapeHTML(
                        formatDate(
                            order?.created_at
                        )
                    )}
                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   RENDER TOTALS
========================================================= */

function renderTotals(
    order,
    items
) {

    const calculatedSubtotal =
        Array.isArray(items)

            ? items.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    getItemSubtotal(
                        item
                    ),
                0
            )

            : 0;


    const subtotal =
        Number(
            order?.subtotal
        )
        ||
        calculatedSubtotal
        ||
        0;


    const deliveryFee =
        Number(
            order?.delivery_fee
        ) || 0;


    const total =
        Number(
            order?.total
        )
        ||
        (
            subtotal +
            deliveryFee
        );


    return `

        <div
            class="order-total-row"
        >

            <span>
                Subtotal
            </span>


            <strong>
                ${formatCurrency(
                    subtotal
                )}
            </strong>

        </div>


        <div
            class="order-total-row"
        >

            <span>
                Delivery Fee
            </span>


            <strong>

                ${
                    deliveryFee > 0
                        ? formatCurrency(
                            deliveryFee
                        )
                        : "FREE"
                }

            </strong>

        </div>


        <div
            class="order-total-row final"
        >

            <span>
                Total
            </span>


            <strong>
                ${formatCurrency(
                    total
                )}
            </strong>

        </div>

    `;

}


/* =========================================================
   RENDER FULL ORDER
========================================================= */

function renderOrder(
    order
) {

    const status =
        order?.status
        ||
        "Pending";


    const paymentStatus =
        order?.payment_status
        ||
        "Pending";


    const items =
        Array.isArray(
            order?.items
        )
            ? order.items
            : [];


    const customerAddress =
        order?.customer_address
        ||
        order?.delivery_address
        ||
        order?.address
        ||
        "Not provided";


    const notes =
        order?.notes
        ||
        "";


    if (!container) {

        return;

    }


    container.innerHTML = `

        <article
            class="order-details-card"
        >


            <!-- =================================================
                 HEADER
            ================================================== -->

            <header
                class="order-details-header"
            >

                <div>

                    <span
                        class="order-details-id-label"
                    >
                        ORDER ID
                    </span>


                    <div
                        class="order-details-id"
                    >
                        #${escapeHTML(
                            order?.id
                        )}
                    </div>


                    <div
                        class="order-details-date"
                    >
                        ${escapeHTML(
                            formatDate(
                                order?.created_at
                            )
                        )}
                    </div>

                </div>


                <div
                    class="order-header-right"
                >

                    <div
                        class="order-details-status"
                    >
                        ${escapeHTML(
                            status
                        )}
                    </div>


                    <div
                        class="payment-status-mini"
                    >

                        Payment:
                        <strong>
                            ${escapeHTML(
                                paymentStatus
                            )}
                        </strong>

                    </div>

                </div>

            </header>


            <!-- =================================================
                 TRACKER
            ================================================== -->

            ${renderTracker(
                status
            )}


            <!-- =================================================
                 CUSTOMER
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        CUSTOMER
                    </span>


                    <h2>
                        Customer Information
                    </h2>

                </div>


                ${renderCustomerInfo(
                    order
                )}

            </section>


            <!-- =================================================
                 DELIVERY LOCATION
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        DELIVERY
                    </span>


                    <h2>
                        Delivery Location
                    </h2>

                </div>


                ${renderDelivery(
                    order
                )}

            </section>


            <!-- =================================================
                 PRODUCTS
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        PURCHASE
                    </span>


                    <h2>
                        Ordered Items
                    </h2>

                </div>


                <div>
                    ${renderItems(
                        items
                    )}
                </div>

            </section>


            <!-- =================================================
                 PAYMENT INFORMATION
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        PAYMENT
                    </span>


                    <h2>
                        Payment Information
                    </h2>

                </div>


                <div
                    class="order-info-grid"
                >

                    <div
                        class="order-info-box"
                    >

                        <span
                            class="order-info-label"
                        >
                            Payment Method
                        </span>


                        <div
                            class="order-info-value"
                        >
                            ${escapeHTML(
                                order?.payment_method
                                ||
                                "GCash"
                            )}
                        </div>

                    </div>


                    <div
                        class="order-info-box"
                    >

                        <span
                            class="order-info-label"
                        >
                            Payment Status
                        </span>


                        <div
                            class="order-info-value"
                        >
                            ${escapeHTML(
                                paymentStatus
                            )}
                        </div>

                    </div>

                </div>

            </section>


            <!-- =================================================
                 PAYMENT PROOF
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        PAYMENT PROOF
                    </span>


                    <h2>
                        Transaction Screenshot
                    </h2>

                </div>


                ${renderPaymentProof(
                    order
                )}

            </section>


            <!-- =================================================
                 ORDER TOTAL
            ================================================== -->

            <section
                class="order-detail-section"
            >

                <div
                    class="order-section-title"
                >

                    <span>
                        SUMMARY
                    </span>


                    <h2>
                        Order Total
                    </h2>

                </div>


                ${renderTotals(
                    order,
                    items
                )}

            </section>


            <!-- =================================================
                 NOTES
            ================================================== -->

            ${
                notes

                    ? `

                        <section
                            class="order-detail-section"
                        >

                            <div
                                class="order-section-title"
                            >

                                <span>
                                    CUSTOMER NOTE
                                </span>


                                <h2>
                                    Order Notes
                                </h2>

                            </div>


                            <div
                                class="order-notes"
                            >
                                ${escapeHTML(
                                    notes
                                )}
                            </div>

                        </section>

                    `

                    : ""
            }


        </article>

    `;


    /*
       Payment proof image error handler.
    */

    const proofImage =
        document.getElementById(
            "paymentProofImage"
        );


    if (
        proofImage
    ) {

        proofImage.addEventListener(
            "error",
            () => {

                const parent =
                    proofImage.closest(
                        ".payment-proof-preview"
                    );


                if (parent) {

                    parent.innerHTML = `

                        <div
                            class="payment-proof-empty"
                        >

                            <div
                                style="
                                    font-size:2rem;
                                    margin-bottom:10px;
                                "
                            >
                                ⚠
                            </div>


                            <strong>
                                Payment proof could not be displayed
                            </strong>


                            <p
                                style="
                                    margin-top:8px;
                                    color:#888;
                                "
                            >
                                The saved payment proof path
                                could not be opened.
                            </p>

                        </div>

                    `;

                }

            }
        );

    }

}


/* =========================================================
   LOAD ORDER
========================================================= */

async function loadOrder() {

    const currentUser =
        await getCurrentUser();


    if (!currentUser) {

        console.log(
            "NO CUSTOMER SESSION → LOGIN"
        );

        redirectToLogin();

        return null;

    }


    if (!orderId) {

        throw new Error(
            "Order ID is missing."
        );

    }


    console.log(
        "LOADING ORDER:",
        orderId
    );


    console.log(
        "CUSTOMER:",
        currentUser.email
    );


    /*
       SECURITY:
       The customer can only load
       an order where user_id matches
       the currently authenticated user.
    */

    const {
        data: order,
        error: orderError
    } =
        await supabase
            .from(
                "orders"
            )
            .select("*")
            .eq(
                "id",
                orderId
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if (
        orderError
    ) {

        console.error(
            "Order query error:",
            orderError
        );

        throw new Error(
            orderError.message ||
            "Unable to load order."
        );

    }


    if (!order) {

        throw new Error(
            "Order not found or you do not have permission to view it."
        );

    }


    console.log(
        "ORDER LOADED:",
        order
    );


    /*
       Load item records.
    */

    const items =
        await loadOrderItems(
            order
        );


    console.log(
        "ORDER ITEMS:",
        items
    );


    /*
       Load payment proof URL.
    */

    const paymentProofUrl =
        await getPaymentProofUrl(
            order
        );


    console.log(
        "PAYMENT PROOF URL:",
        paymentProofUrl
            ? "FOUND"
            : "NOT FOUND"
    );


    return {

        ...order,

        items,

        payment_proof_url:
            paymentProofUrl

    };

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

    updateCartCount();


    if (!orderId) {

        if (container) {

            container.innerHTML = `

                <div
                    class="order-details-error"
                >

                    <h2>
                        Order Not Found
                    </h2>


                    <p
                        style="
                            margin-top:10px;
                            color:#888;
                        "
                    >
                        No order ID was provided.
                    </p>


                    <a
                        href="customer/customer-orders.html"
                        class="back-orders-btn"
                        style="
                            margin-top:20px;
                        "
                    >
                        ← Back to My Orders
                    </a>

                </div>

            `;

        }

        return;

    }


    try {

        showResult(
            "Loading order details..."
        );


        const order =
            await loadOrder();


        if (!order) {

            return;

        }


        renderOrder(
            order
        );


        showResult(
            "",
            ""
        );


        console.log(
            "ORDER DETAILS SYSTEM READY"
        );


    } catch (error) {

        console.error(
            "Order details error:",
            error
        );


        if (container) {

            container.innerHTML = `

                <div
                    class="order-details-error"
                >

                    <div
                        style="
                            font-size:2.5rem;
                        "
                    >
                        🔒
                    </div>


                    <h2
                        style="
                            margin-top:15px;
                        "
                    >
                        Order Not Available
                    </h2>


                    <p
                        style="
                            margin-top:10px;
                            color:#888;
                            max-width:500px;
                            line-height:1.6;
                        "
                    >
                        ${escapeHTML(
                            error?.message ||
                            "This order could not be loaded."
                        )}
                    </p>


                    <a
                        href="customer/customer-orders.html"
                        class="back-orders-btn"
                        style="
                            margin-top:20px;
                        "
                    >
                        ← Back to My Orders
                    </a>

                </div>

            `;

        }


        showResult(
            "Unable to load this order.",
            "error"
        );

    }

}


/* =========================================================
   MOBILE NAV
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
        .forEach(
            link => {

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

            }
        );

}


/* =========================================================
   START
========================================================= */

initialize();