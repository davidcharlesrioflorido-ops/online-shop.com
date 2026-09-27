import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";
    

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   CONSTANTS
========================================================= */

const PAYMENT_BUCKET =
    "payment-proofs";

const PROFILE_BUCKET =
    "profile-pictures";


/* =========================================================
   STATE
========================================================= */

let allOrders = [];

let filteredOrders = [];

let currentOrder = null;

let isLoadingOrders = false;

let isLoggingOut = false;

let quickFilter = "all";

let isSavingLalamoveTracking = false;


/* =========================================================
   DOM
========================================================= */

const ordersTableBody =
    document.getElementById(
        "ordersTableBody"
    );

const mobileOrdersList =
    document.getElementById(
        "mobileOrdersList"
    );

const orderModal =
    document.getElementById(
        "orderModal"
    );

const orderSearch =
    document.getElementById(
        "orderSearch"
    );

const orderStatusFilter =
    document.getElementById(
        "orderStatusFilter"
    );

const orderCount =
    document.getElementById(
        "orderCount"
    );


/* =========================================================
   BASIC HELPERS
========================================================= */

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


function getCustomerName(order) {

    return (
        order?.customer_name ||
        order?.name ||
        order?.profile?.full_name ||
        order?.profile?.name ||
        "Customer"
    );

}


function getCustomerEmail(order) {

    return (
        order?.customer_email ||
        order?.email ||
        order?.profile?.email ||
        "No email"
    );

}


function getCustomerPhone(order) {

    return (
        order?.customer_phone ||
        order?.phone ||
        order?.profile?.phone ||
        "No phone"
    );

}


/* =========================================================
   DELIVERY ADDRESS
========================================================= */

function getDeliveryAddress(order) {

    if (
        order?.customer_address &&
        String(
            order.customer_address
        ).trim()
    ) {
        return String(
            order.customer_address
        ).trim();
    }


    if (
        order?.address &&
        String(
            order.address
        ).trim()
    ) {
        return String(
            order.address
        ).trim();
    }


    const profile =
        order?.profile ||
        {};


    if (
        profile.address &&
        String(
            profile.address
        ).trim()
    ) {
        return String(
            profile.address
        ).trim();
    }


    const parts = [
        profile.city,
        profile.province,
        profile.postal_code
    ].filter(Boolean);


    if (parts.length) {

        return parts.join(", ");

    }


    return "No delivery address";

}


function getCustomerAddress(order) {

    return getDeliveryAddress(
        order
    );

}


function getInitial(name) {

    if (!name) {
        return "?";
    }

    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();

}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return date.toLocaleString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


function formatMoney(value) {

    const amount =
        Number(
            value || 0
        );


    return amount.toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP"
        }
    );

}


/* =========================================================
   DELIVERY FEE
========================================================= */

function getDeliveryFee(order) {

    const fee =
        Number(
            order?.delivery_fee
        );


    return Number.isFinite(fee)
        ? fee
        : 0;

}


function getOrderSubtotal(order) {

    const subtotal =
        Number(
            order?.subtotal
        );


    return Number.isFinite(subtotal)
        ? subtotal
        : 0;

}


function getOrderTotal(order) {

    const total =
        Number(
            order?.total
        );


    return Number.isFinite(total)
        ? total
        : 0;

}


/* =========================================================
   ORDER ITEMS
========================================================= */

function getOrderItems(order) {

    let items =
        order?.items ||
        order?.order_items ||
        [];


    if (
        typeof items ===
        "string"
    ) {

        try {

            items =
                JSON.parse(
                    items
                );

        } catch (error) {

            console.error(
                "ORDER ITEMS JSON ERROR:",
                error
            );

            items = [];

        }

    }


    return Array.isArray(items)
        ? items
        : [];

}


/* =========================================================
   STATUS
========================================================= */

function normalizeStatus(value) {

    const raw =
        String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /[_-]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            );


    if (!raw) {
        return "Pending";
    }


    if (
        [
            "new",
            "pending",
            "awaiting",
            "awaiting order",
            "awaiting payment",
            "new order",
            "order received"
        ].includes(raw)
    ) {

        return "Pending";

    }


    if (
        [
            "processing",
            "process",
            "in progress",
            "inprogress",
            "preparing",
            "preparing order"
        ].includes(raw)
    ) {

        return "In Progress";

    }


    if (
        [
            "to deliver",
            "to be delivered",
            "for delivery",
            "ready to deliver",
            "ready for delivery",
            "delivery"
        ].includes(raw)
    ) {

        return "To Deliver";

    }


    if (
        [
            "completed",
            "complete",
            "delivered",
            "done",
            "finished"
        ].includes(raw)
    ) {

        return "Completed";

    }


    if (
        [
            "rejected",
            "reject",
            "cancelled",
            "canceled",
            "declined"
        ].includes(raw)
    ) {

        return "Rejected";

    }


    return String(
        value
    ).trim();

}


function getOrderStatus(order) {

    return normalizeStatus(
        order?.status
    );

}


function isPendingStatus(order) {

    return (
        getOrderStatus(order) ===
        "Pending"
    );

}


function isProcessingStatus(order) {

    return (
        getOrderStatus(order) ===
        "In Progress"
    );

}


function isCompletedStatus(order) {

    return (
        getOrderStatus(order) ===
        "Completed"
    );

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function normalizePaymentStatus(value) {

    const raw =
        String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /[_-]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            );


    if (
        [
            "paid",
            "approved",
            "confirmed",
            "verified"
        ].includes(raw)
    ) {

        return "Paid";

    }


    if (
        [
            "rejected",
            "reject",
            "declined"
        ].includes(raw)
    ) {

        return "Rejected";

    }


    return "Pending";

}


function isPaymentVerification(order) {

    return (
        normalizePaymentStatus(
            order?.payment_status
        ) ===
        "Pending"
    );

}


/* =========================================================
   STORAGE PATH
========================================================= */

function extractStoragePath(
    value,
    bucket
) {

    if (!value) {
        return "";
    }


    let raw =
        String(
            value
        ).trim();


    if (!raw) {
        return "";
    }


    if (
        !raw.startsWith("http://") &&
        !raw.startsWith("https://")
    ) {

        raw =
            raw.replace(
                /^\/+/,
                ""
            );


        if (
            raw.startsWith(
                `${bucket}/`
            )
        ) {

            raw =
                raw.substring(
                    bucket.length + 1
                );

        }


        return raw;

    }


    try {

        const url =
            new URL(raw);

        const marker =
            "/storage/v1/object/";

        const index =
            url.pathname.indexOf(
                marker
            );


        if (
            index === -1
        ) {

            return "";

        }


        let remaining =
            url.pathname.substring(
                index +
                marker.length
            );


        remaining =
            remaining
                .replace(
                    /^public\//,
                    ""
                )
                .replace(
                    /^sign\//,
                    ""
                )
                .replace(
                    /^authenticated\//,
                    ""
                );


        if (
            remaining.startsWith(
                `${bucket}/`
            )
        ) {

            remaining =
                remaining.substring(
                    bucket.length + 1
                );

        }


        return decodeURIComponent(
            remaining
        );

    } catch (error) {

        console.error(
            "STORAGE PATH ERROR:",
            error
        );

        return "";

    }

}


/* =========================================================
   STORAGE URL
========================================================= */

async function getStorageUrl(
    bucket,
    value
) {

    if (!value) {
        return "";
    }


    const stringValue =
        String(
            value
        ).trim();


    if (!stringValue) {
        return "";
    }


    const path =
        extractStoragePath(
            stringValue,
            bucket
        );


    if (!path) {

        if (
            stringValue.startsWith("http://") ||
            stringValue.startsWith("https://")
        ) {

            return stringValue;

        }


        return "";

    }


    try {

        const {
            data,
            error
        } =
            await supabase.storage
                .from(bucket)
                .createSignedUrl(
                    path,
                    3600
                );


        if (
            !error &&
            data?.signedUrl
        ) {

            return (
                data.signedUrl +
                `&v=${Date.now()}`
            );

        }

    } catch (error) {

        console.warn(
            "SIGNED URL ERROR:",
            error
        );

    }


    try {

        const {
            data
        } =
            supabase.storage
                .from(bucket)
                .getPublicUrl(
                    path
                );


        if (
            data?.publicUrl
        ) {

            return (
                data.publicUrl +
                `?v=${Date.now()}`
            );

        }

    } catch (error) {

        console.warn(
            "PUBLIC URL ERROR:",
            error
        );

    }


    return "";

}


/* =========================================================
   PROFILE IMAGE
========================================================= */

async function resolveProfileImage(
    order
) {

    const avatar =
        order?.profile?.avatar_url ||
        order?.avatar_url ||
        "";


    if (!avatar) {
        return "";
    }


    try {

        return await getStorageUrl(
            PROFILE_BUCKET,
            avatar
        );

    } catch (error) {

        console.error(
            "PROFILE IMAGE ERROR:",
            error
        );

        return "";

    }

}


/* =========================================================
   PAYMENT PROOF
========================================================= */

async function resolvePaymentProof(
    order
) {

    if (!order) {
        return "";
    }


    const storedValue =
        order.payment_proof_url ||
        order.payment_proof ||
        order.payment_proof_path ||
        order.payment_proof_file ||
        order.proof_url ||
        "";


    if (!storedValue) {
        return "";
    }


    try {

        return await getStorageUrl(
            PAYMENT_BUCKET,
            storedValue
        );

    } catch (error) {

        console.error(
            "PAYMENT PROOF ERROR:",
            error
        );

        return "";

    }

}


/* =========================================================
   ATTACH CUSTOMER PROFILES
========================================================= */

async function attachCustomerProfiles(
    orders
) {

    if (
        !Array.isArray(orders) ||
        !orders.length
    ) {

        return orders;

    }


    const userIds =
        [
            ...new Set(
                orders
                    .map(
                        order =>
                            order.user_id
                    )
                    .filter(Boolean)
                    .map(
                        id =>
                            String(id)
                    )
            )
        ];


    if (!userIds.length) {

        return orders.map(
            order => ({
                ...order,
                profile: null
            })
        );

    }


    const {
        data: profiles,
        error
    } =
        await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                name,
                email,
                phone,
                address,
                city,
                province,
                postal_code,
                avatar_url,
                updated_at
            `)
            .in(
                "id",
                userIds
            );


    if (error) {

        console.error(
            "PROFILE QUERY ERROR:",
            error
        );


        return orders.map(
            order => ({
                ...order,
                profile: null
            })
        );

    }


    const profileById =
        new Map();


    (
        profiles ||
        []
    ).forEach(
        profile => {

            if (
                profile.id
            ) {

                profileById.set(
                    String(
                        profile.id
                    ),
                    profile
                );

            }

        }
    );


    return orders.map(
        order => {

            const userId =
                order.user_id
                    ? String(
                        order.user_id
                    )
                    : "";


            const profile =
                userId
                    ? (
                        profileById.get(
                            userId
                        ) ||
                        null
                    )
                    : null;


            return {
                ...order,
                profile
            };

        }
    );

}


/* =========================================================
   RESOLVE MEDIA
========================================================= */

async function resolveOrderMedia(
    orders
) {

    if (
        !Array.isArray(orders) ||
        !orders.length
    ) {

        return orders;

    }


    return Promise.all(
        orders.map(
            async order => {

                let avatarUrl =
                    "";

                let paymentProofUrl =
                    "";


                try {

                    avatarUrl =
                        await resolveProfileImage(
                            order
                        );

                } catch (error) {

                    console.error(
                        "AVATAR ERROR:",
                        error
                    );

                }


                try {

                    paymentProofUrl =
                        await resolvePaymentProof(
                            order
                        );

                } catch (error) {

                    console.error(
                        "PAYMENT PROOF ERROR:",
                        error
                    );

                }


                return {

                    ...order,

                    _resolvedAvatarUrl:
                        avatarUrl,

                    _resolvedPaymentProofUrl:
                        paymentProofUrl

                };

            }
        )
    );

}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders() {

    if (
        isLoadingOrders
    ) {

        return;

    }


    isLoadingOrders =
        true;


    try {

        if (
            ordersTableBody
        ) {

            ordersTableBody.innerHTML =
                `
                    <tr>
                        <td colspan="100%">
                            <div class="orders-loading">
                                <div class="loading-spinner"></div>
                                <p>
                                    Loading orders...
                                </p>
                            </div>
                        </td>
                    </tr>
                `;

        }


        const {
            data,
            error
        } =
            await supabase
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            console.error(
                "ORDERS QUERY ERROR:",
                error
            );


            if (
                ordersTableBody
            ) {

                ordersTableBody.innerHTML =
                    `
                        <tr>
                            <td colspan="100%">
                                <div class="empty-state">
                                    Failed to load orders.
                                    <br>
                                    ${escapeHTML(
                                        error.message
                                    )}
                                </div>
                            </td>
                        </tr>
                    `;

            }


            return;

        }


        let orders =
            data ||
            [];


        orders =
            await attachCustomerProfiles(
                orders
            );


        orders =
            await resolveOrderMedia(
                orders
            );


        allOrders =
            orders;


        updateStats();

        applyFilters();

    }

    catch (error) {

        console.error(
            "LOAD ORDERS FAILED:",
            error
        );

    }

    finally {

        isLoadingOrders =
            false;

    }

}


/* =========================================================
   CUSTOMER AVATAR
========================================================= */

function createCustomerAvatar(
    order
) {

    const name =
        getCustomerName(
            order
        );


    const avatarUrl =
        order?._resolvedAvatarUrl ||
        "";


    const initial =
        getInitial(
            name
        );


    const orderId =
        escapeHTML(
            order?.id ||
            ""
        );


    if (
        avatarUrl
    ) {

        return `
            <button
                type="button"
                class="customer-avatar
                       admin-customer-avatar
                       profile-avatar-trigger"
                data-profile-order-id="${orderId}"
                aria-label="View ${escapeHTML(name)} profile photo"
                title="Click to view profile photo"
            >
                <img
                    src="${escapeHTML(
                        avatarUrl
                    )}"
                    alt="${escapeHTML(
                        name
                    )}"
                    loading="lazy"
                >

                <span
                    class="avatar-fallback"
                >
                    ${escapeHTML(
                        initial
                    )}
                </span>
            </button>
        `;

    }


    return `
        <button
            type="button"
            class="customer-avatar
                   admin-customer-avatar
                   profile-avatar-trigger
                   no-profile-image"
            data-profile-order-id="${orderId}"
            aria-label="View ${escapeHTML(name)} profile"
            title="No profile photo"
        >
            <span
                class="avatar-fallback"
            >
                ${escapeHTML(
                    initial
                )}
            </span>
        </button>
    `;

}


/* =========================================================
   FILTERS
========================================================= */

function applyFilters() {

    const search =
        String(
            orderSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        String(
            orderStatusFilter?.value ||
            "all"
        )
            .trim();


    filteredOrders =
        allOrders.filter(
            order => {

                const name =
                    getCustomerName(
                        order
                    )
                        .toLowerCase();


                const email =
                    getCustomerEmail(
                        order
                    )
                        .toLowerCase();


                const phone =
                    getCustomerPhone(
                        order
                    )
                        .toLowerCase();


                const id =
                    String(
                        order.id ||
                        ""
                    )
                        .toLowerCase();


                const address =
                    getDeliveryAddress(
                        order
                    )
                        .toLowerCase();


                const status =
                    getOrderStatus(
                        order
                    );


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    email.includes(search) ||
                    phone.includes(search) ||
                    id.includes(search) ||
                    address.includes(search);


                let matchesStatus =
                    true;


                if (
                    selectedStatus !==
                    "all"
                ) {

                    matchesStatus =
                        status ===
                        normalizeStatus(
                            selectedStatus
                        );

                }


                let matchesQuick =
                    true;


                if (
                    quickFilter ===
                    "payment"
                ) {

                    matchesQuick =
                        isPaymentVerification(
                            order
                        );

                }

                else if (
                    quickFilter ===
                    "processing"
                ) {

                    matchesQuick =
                        isProcessingStatus(
                            order
                        );

                }

                else if (
                    quickFilter ===
                    "completed"
                ) {

                    matchesQuick =
                        isCompletedStatus(
                            order
                        );

                }


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesQuick
                );

            }
        );


    renderOrders();

    updateOrderCount();

}


/* =========================================================
   ORDER COUNT
========================================================= */

function updateOrderCount() {

    if (
        !orderCount
    ) {

        return;

    }


    const count =
        filteredOrders.length;


    orderCount.textContent =
        `${count} ${
            count === 1
                ? "order"
                : "orders"
        }`;

}


/* =========================================================
   RENDER DESKTOP + MOBILE
========================================================= */

function renderOrders() {

    if (
        !ordersTableBody
    ) {

        return;

    }


    if (
        !filteredOrders.length
    ) {

        ordersTableBody.innerHTML =
            `
                <tr>
                    <td colspan="100%">
                        <div class="empty-state">
                            No orders found.
                        </div>
                    </td>
                </tr>
            `;


        if (
            mobileOrdersList
        ) {

            mobileOrdersList.innerHTML =
                `
                    <div class="empty-state">
                        No orders found.
                    </div>
                `;

        }


        return;

    }


    /* =====================================================
       DESKTOP
    ===================================================== */

    ordersTableBody.innerHTML =
        filteredOrders
            .map(
                order => {

                    const name =
                        getCustomerName(
                            order
                        );


                    const email =
                        getCustomerEmail(
                            order
                        );


                    const avatar =
                        createCustomerAvatar(
                            order
                        );


                    const status =
                        getOrderStatus(
                            order
                        );


                    const paymentStatus =
                        normalizePaymentStatus(
                            order.payment_status
                        );


                    const total =
                        getOrderTotal(
                            order
                        );


                    const deliveryFee =
                        getDeliveryFee(
                            order
                        );


                    return `
                        <tr
                            data-order-id="${escapeHTML(
                                order.id
                            )}"
                            class="order-row"
                            tabindex="0"
                        >

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        String(
                                            order.id
                                        ).slice(
                                            0,
                                            8
                                        )
                                    )}
                                </strong>
                            </td>


                            <td>

                                <div
                                    class="customer-cell"
                                >

                                    ${avatar}

                                    <div
                                        class="customer-cell-info"
                                    >

                                        <strong>
                                            ${escapeHTML(
                                                name
                                            )}
                                        </strong>

                                        <small>
                                            ${escapeHTML(
                                                email
                                            )}
                                        </small>

                                    </div>

                                </div>

                            </td>


                            <td>

                                <strong>
                                    ${formatMoney(
                                        total
                                    )}
                                </strong>

                                <small
                                    style="
                                        display:block;
                                        margin-top:4px;
                                        color:#00f2fe;
                                        font-size:11px;
                                    "
                                >
                                    Delivery:
                                    ${formatMoney(
                                        deliveryFee
                                    )}
                                </small>

                            </td>


                            <td>
                                ${escapeHTML(
                                    order.payment_method ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    paymentStatus
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    status
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    formatDate(
                                        order.created_at
                                    )
                                )}
                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="view-order-btn"
                                    data-order-id="${escapeHTML(
                                        order.id
                                    )}"
                                >
                                    View
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");


    /* =====================================================
       MOBILE
    ===================================================== */

    if (
        mobileOrdersList
    ) {

        mobileOrdersList.innerHTML =
            filteredOrders
                .map(
                    order => {

                        const name =
                            getCustomerName(
                                order
                            );


                        const avatar =
                            createCustomerAvatar(
                                order
                            );


                        const status =
                            getOrderStatus(
                                order
                            );


                        const total =
                            getOrderTotal(
                                order
                            );


                        const deliveryFee =
                            getDeliveryFee(
                                order
                            );


                        return `
                            <div
                                class="mobile-order-card"
                                data-order-id="${escapeHTML(
                                    order.id
                                )}"
                                tabindex="0"
                            >

                                <div
                                    class="mobile-order-header"
                                >

                                    <div
                                        class="customer-cell"
                                    >

                                        ${avatar}

                                        <div
                                            class="customer-cell-info"
                                        >

                                            <strong>
                                                ${escapeHTML(
                                                    name
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(
                                                    getCustomerEmail(
                                                        order
                                                    )
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                </div>


                                <div
                                    class="mobile-order-info"
                                >

                                    <div>

                                        <span>
                                            Order
                                        </span>

                                        <strong>
                                            ${escapeHTML(
                                                String(
                                                    order.id
                                                ).slice(
                                                    0,
                                                    8
                                                )
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Total
                                        </span>

                                        <strong>
                                            ${formatMoney(
                                                total
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Delivery
                                        </span>

                                        <strong
                                            style="
                                                color:#00f2fe;
                                            "
                                        >
                                            ${formatMoney(
                                                deliveryFee
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Status
                                        </span>

                                        <strong>
                                            ${escapeHTML(
                                                status
                                            )}
                                        </strong>

                                    </div>

                                </div>


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
                        `;

                    }
                )
                .join("");

    }

}


/* =========================================================
   STATS
========================================================= */

function setStatValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;

    }

}


function updateStats() {

    const total =
        allOrders.length;


    const paymentVerification =
        allOrders.filter(
            order =>
                isPaymentVerification(
                    order
                )
        ).length;


    const processing =
        allOrders.filter(
            order =>
                isProcessingStatus(
                    order
                )
        ).length;


    const completed =
        allOrders.filter(
            order =>
                isCompletedStatus(
                    order
                )
        ).length;


    const revenue =
        allOrders.reduce(
            (
                sum,
                order
            ) => {

                return (
                    sum +
                    getOrderTotal(
                        order
                    )
                );

            },
            0
        );


    setStatValue(
        "totalOrders",
        total
    );


    setStatValue(
        "pendingPayments",
        paymentVerification
    );


    setStatValue(
        "processingOrders",
        processing
    );


    setStatValue(
        "completedOrders",
        completed
    );


    setStatValue(
        "totalRevenue",
        formatMoney(
            revenue
        )
    );


    const orderBadge =
        document.querySelector(
            "[data-order-count]"
        );


    if (
        orderBadge
    ) {

        if (
            paymentVerification >
            0
        ) {

            orderBadge.textContent =
                String(
                    paymentVerification
                );

            orderBadge.hidden =
                false;

        }

        else {

            orderBadge.hidden =
                true;

        }

    }

}


/* =========================================================
   SETUP STAT CARD CLICKS
========================================================= */

function setupStatCards() {

    const cards =
        document.querySelectorAll(
            ".order-stat-card"
        );


    if (
        !cards.length
    ) {

        return;

    }


    const filterMap = [
        "all",
        "payment",
        "processing",
        "completed"
    ];


    cards.forEach(
        (
            card,
            index
        ) => {

            const filter =
                filterMap[index] ||
                "all";


            card.dataset.quickFilter =
                filter;


            card.setAttribute(
                "role",
                "button"
            );


            card.setAttribute(
                "tabindex",
                "0"
            );


            card.addEventListener(
                "click",
                function() {

                    activateQuickFilter(
                        filter
                    );

                }
            );


            card.addEventListener(
                "keydown",
                function(event) {

                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {

                        event.preventDefault();

                        activateQuickFilter(
                            filter
                        );

                    }

                }
            );

        }
    );


    if (
        cards[0]
    ) {

        cards[0].classList.add(
            "active-card"
        );

    }

}


/* =========================================================
   ACTIVATE QUICK FILTER
========================================================= */

function activateQuickFilter(
    filter
) {

    quickFilter =
        filter;


    document
        .querySelectorAll(
            ".order-stat-card"
        )
        .forEach(
            card => {

                card.classList.remove(
                    "active-card"
                );

            }
        );


    const activeCard =
        document.querySelector(
            `.order-stat-card[data-quick-filter="${filter}"]`
        );


    if (
        activeCard
    ) {

        activeCard.classList.add(
            "active-card"
        );

    }


    if (
        filter ===
        "processing"
    ) {

        if (
            orderStatusFilter
        ) {

            orderStatusFilter.value =
                "In Progress";

        }

    }

    else if (
        filter ===
        "completed"
    ) {

        if (
            orderStatusFilter
        ) {

            orderStatusFilter.value =
                "Completed";

        }

    }

    else {

        if (
            orderStatusFilter
        ) {

            orderStatusFilter.value =
                "all";

        }

    }


    applyFilters();


    const section =
        document.querySelector(
            ".orders-section"
        );


    if (
        section
    ) {

        section.scrollIntoView(
            {
                behavior:
                    "smooth",

                block:
                    "start"
            }
        );

    }

}


/* =========================================================
   CUSTOMER PROFILE DOM
========================================================= */

function getProfileElements() {

    return {

        avatar:
            document.getElementById(
                "modalCustomerAvatar"
            ),

        image:
            document.getElementById(
                "modalCustomerAvatarImage"
            ),

        letter:
            document.getElementById(
                "modalCustomerLetter"
            ),

        name:
            document.getElementById(
                "modalCustomerProfileName"
            ),

        email:
            document.getElementById(
                "modalCustomerProfileEmail"
            ),

        customerName:
            document.getElementById(
                "modalCustomerName"
            ),

        customerEmail:
            document.getElementById(
                "modalCustomerEmail"
            ),

        phone:
            document.getElementById(
                "modalCustomerPhone"
            ),

        address:
            document.getElementById(
                "modalCustomerAddress"
            )

    };

}


/* =========================================================
   RENDER CUSTOMER PROFILE
========================================================= */

async function renderCustomerProfile(
    order
) {

    const elements =
        getProfileElements();


    const name =
        getCustomerName(
            order
        );


    const email =
        getCustomerEmail(
            order
        );


    const address =
        getDeliveryAddress(
            order
        );


    const initial =
        getInitial(
            name
        );


    if (
        elements.name
    ) {

        elements.name.textContent =
            name;

    }


    if (
        elements.email
    ) {

        elements.email.textContent =
            email;

    }


    if (
        elements.customerName
    ) {

        elements.customerName.textContent =
            name;

    }


    if (
        elements.customerEmail
    ) {

        elements.customerEmail.textContent =
            email;

    }


    if (
        elements.phone
    ) {

        elements.phone.textContent =
            getCustomerPhone(
                order
            );

    }


    if (
        elements.address
    ) {

        elements.address.textContent =
            address;

    }


    if (
        elements.letter
    ) {

        elements.letter.textContent =
            initial;

        elements.letter.style.display =
            "flex";

    }


    if (
        !elements.image
    ) {

        return;

    }


    elements.image.onload =
        null;

    elements.image.onerror =
        null;

    elements.image.style.display =
        "none";

    elements.image.removeAttribute(
        "src"
    );


    if (
        elements.avatar
    ) {

        elements.avatar.classList.remove(
            "has-image"
        );

    }


    let avatarUrl =
        order?._resolvedAvatarUrl ||
        "";


    if (
        !avatarUrl
    ) {

        avatarUrl =
            await resolveProfileImage(
                order
            );

        order._resolvedAvatarUrl =
            avatarUrl;

    }


    if (
        !avatarUrl
    ) {

        return;

    }


    elements.image.onload =
        () => {

            elements.image.style.display =
                "block";


            if (
                elements.letter
            ) {

                elements.letter.style.display =
                    "none";

            }


            if (
                elements.avatar
            ) {

                elements.avatar.classList.add(
                    "has-image"
                );

            }

        };


    elements.image.onerror =
        () => {

            elements.image.style.display =
                "none";


            if (
                elements.letter
            ) {

                elements.letter.style.display =
                    "flex";

            }


            if (
                elements.avatar
            ) {

                elements.avatar.classList.remove(
                    "has-image"
                );

            }

        };


    elements.image.src =
        avatarUrl;

}


/* =========================================================
   DYNAMIC DELIVERY INFO
========================================================= */

function ensureDeliveryInfoBlock() {

    const paymentProofContainer =
        document.getElementById(
            "paymentProofContainer"
        );


    if (
        !paymentProofContainer
    ) {

        return null;

    }


    let block =
        document.getElementById(
            "runtimeDeliveryInfo"
        );


    if (
        block
    ) {

        return block;

    }


    block =
        document.createElement(
            "div"
        );


    block.id =
        "runtimeDeliveryInfo";


    block.className =
        "runtime-delivery-info";


    block.style.cssText =
        `
            margin-top:18px;
            padding:16px;
            border:
                1px solid
                rgba(0,242,254,.12);
            border-radius:16px;
            background:
                rgba(0,242,254,.025);
            box-sizing:border-box;
        `;


    paymentProofContainer.parentNode.insertBefore(
        block,
        paymentProofContainer
    );


    return block;

}


/* =========================================================
   FILL DELIVERY INFO
========================================================= */

function renderDeliveryInfo(
    order
) {

    const block =
        ensureDeliveryInfoBlock();


    if (
        !block
    ) {

        return;

    }


    const address =
        getDeliveryAddress(
            order
        );


    const fee =
        getDeliveryFee(
            order
        );


    const provider =
        order.delivery_provider ||
        "Lalamove";


    const latitude =
        Number(
            order.delivery_latitude
        );


    const longitude =
        Number(
            order.delivery_longitude
        );


    const quotationId =
        order.lalamove_quotation_id ||
        "—";


    const expiry =
        order.lalamove_quote_expires_at ||
        "";


    block.innerHTML =
        `
            <div
                style="
                    margin-bottom:13px;
                    color:#f5f7fb;
                    font-size:14px;
                    font-weight:800;
                "
            >
                🚚 Delivery Information
            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0,1fr)
                        );
                    gap:12px;
                "
            >

                <div
                    style="
                        grid-column:
                            1 / -1;
                    "
                >

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                            letter-spacing:.8px;
                        "
                    >
                        Delivery Address
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#f5f7fb;
                            font-size:13px;
                            line-height:1.5;
                            word-break:break-word;
                        "
                    >
                        ${escapeHTML(
                            address
                        )}
                    </strong>

                </div>


                <div>

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                        "
                    >
                        Delivery Fee
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#00f2fe;
                            font-size:18px;
                            font-weight:900;
                        "
                    >
                        ${formatMoney(
                            fee
                        )}
                    </strong>

                </div>


                <div>

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                        "
                    >
                        Provider
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#f5f7fb;
                            font-size:13px;
                        "
                    >
                        ${escapeHTML(
                            provider
                        )}
                    </strong>

                </div>


                <div>

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                        "
                    >
                        Latitude
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#f5f7fb;
                            font-size:13px;
                        "
                    >
                        ${
                            Number.isFinite(
                                latitude
                            )
                                ? latitude.toFixed(
                                    6
                                )
                                : "—"
                        }
                    </strong>

                </div>


                <div>

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                        "
                    >
                        Longitude
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#f5f7fb;
                            font-size:13px;
                        "
                    >
                        ${
                            Number.isFinite(
                                longitude
                            )
                                ? longitude.toFixed(
                                    6
                                )
                                : "—"
                        }
                    </strong>

                </div>


                <div
                    style="
                        grid-column:
                            1 / -1;
                    "
                >

                    <span
                        style="
                            display:block;
                            margin-bottom:4px;
                            color:#8d97aa;
                            font-size:10px;
                            font-weight:700;
                            text-transform:uppercase;
                        "
                    >
                        Lalamove Quotation ID
                    </span>


                    <strong
                        style="
                            display:block;
                            color:#f5f7fb;
                            font-size:12px;
                            word-break:break-all;
                        "
                    >
                        ${escapeHTML(
                            quotationId
                        )}
                    </strong>

                </div>


                ${
                    expiry
                        ? `
                            <div
                                style="
                                    grid-column:
                                        1 / -1;
                                "
                            >

                                <span
                                    style="
                                        display:block;
                                        margin-bottom:4px;
                                        color:#8d97aa;
                                        font-size:10px;
                                        font-weight:700;
                                        text-transform:uppercase;
                                    "
                                >
                                    Quote Expiry
                                </span>

                                <strong
                                    style="
                                        display:block;
                                        color:#f5f7fb;
                                        font-size:12px;
                                    "
                                >
                                    ${escapeHTML(
                                        formatDate(
                                            expiry
                                        )
                                    )}
                                </strong>

                            </div>
                        `
                        : ""
                }

            </div>
        `;

}


/* =========================================================
   LALAMOVE TRACKER
========================================================= */

function getLalamoveTrackingElements() {

    return {

        input:
            document.getElementById(
                "lalamoveTrackingUrl"
            ),

        saveButton:
            document.getElementById(
                "saveLalamoveTrackingBtn"
            ),

        openButton:
            document.getElementById(
                "openLalamoveTrackingBtn"
            ),

        result:
            document.getElementById(
                "lalamoveTrackingResult"
            )

    };

}


/* =========================================================
   SHOW TRACKER RESULT
========================================================= */

function showLalamoveTrackingResult(
    message,
    type = ""
) {

    const elements =
        getLalamoveTrackingElements();


    if (
        !elements.result
    ) {

        return;

    }


    elements.result.textContent =
        message || "";


    elements.result.className =
        "lalamove-tracking-result";


    if (
        type
    ) {

        elements.result.classList.add(
            type
        );

    }

}


/* =========================================================
   RENDER LALAMOVE TRACKER
========================================================= */

function renderLalamoveTracking(
    order
) {

    const elements =
        getLalamoveTrackingElements();


    if (
        !elements.input &&
        !elements.openButton
    ) {

        return;

    }


    const trackingUrl =
        String(
            order?.lalamove_tracking_url ||
            ""
        ).trim();


    if (
        elements.input
    ) {

        elements.input.value =
            trackingUrl;

    }


    if (
        elements.openButton
    ) {

        if (
            trackingUrl
        ) {

            elements.openButton.href =
                trackingUrl;

            elements.openButton.classList.add(
                "visible"
            );

        }

        else {

            elements.openButton.href =
                "#";

            elements.openButton.classList.remove(
                "visible"
            );

        }

    }


    showLalamoveTrackingResult(
        trackingUrl
            ? "Tracker link is saved for this order."
            : "No Lalamove tracker has been added yet.",
        trackingUrl
            ? "success"
            : ""
    );

}


/* =========================================================
   SAVE LALAMOVE TRACKER
========================================================= */

async function saveLalamoveTracking() {

    if (
        isSavingLalamoveTracking
    ) {

        return;

    }


    if (
        !currentOrder ||
        !currentOrder.id
    ) {

        showLalamoveTrackingResult(
            "No order is currently selected. Please close and open the order again.",
            "error"
        );

        return;

    }


    const elements =
        getLalamoveTrackingElements();


    if (
        !elements.input
    ) {

        console.error(
            "Lalamove tracking input was not found."
        );

        return;

    }


    const url =
        String(
            elements.input.value ||
            ""
        ).trim();


    if (
        url
    ) {

        try {

            const parsedUrl =
                new URL(
                    url
                );


            if (
                ![
                    "http:",
                    "https:"
                ].includes(
                    parsedUrl.protocol
                )
            ) {

                throw new Error(
                    "Only HTTP or HTTPS links are allowed."
                );

            }

        }

        catch (error) {

            showLalamoveTrackingResult(
                "Please enter a valid Lalamove tracking URL.",
                "error"
            );

            if (
                elements.input
            ) {

                elements.input.focus();

            }

            return;

        }

    }


    const orderId =
        String(
            currentOrder.id
        );


    isSavingLalamoveTracking =
        true;


    if (
        elements.saveButton
    ) {

        elements.saveButton.disabled =
            true;

        elements.saveButton.textContent =
            "Saving...";

    }


    showLalamoveTrackingResult(
        "Saving tracker link...",
        ""
    );


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("orders")
                .update({
                    lalamove_tracking_url:
                        url || null
                })
                .eq(
                    "id",
                    orderId
                )
                .select("*")
                .single();


        if (
            error
        ) {

            console.error(
                "LALAMOVE TRACKER SAVE ERROR:",
                error
            );


            showLalamoveTrackingResult(
                "Failed to save tracker: " +
                error.message,
                "error"
            );

            return;

        }


        currentOrder =
            {
                ...currentOrder,
                ...(data || {}),
                lalamove_tracking_url:
                    url || null
            };


        const index =
            allOrders.findIndex(
                order =>
                    String(
                        order.id
                    ) ===
                    orderId
            );


        if (
            index !== -1
        ) {

            allOrders[index] =
                {
                    ...allOrders[index],
                    ...(data || {}),
                    lalamove_tracking_url:
                        url || null
                };


            currentOrder =
                allOrders[index];

        }


        if (
            elements.openButton
        ) {

            if (
                url
            ) {

                elements.openButton.href =
                    url;

                elements.openButton.classList.add(
                    "visible"
                );

            }

            else {

                elements.openButton.href =
                    "#";

                elements.openButton.classList.remove(
                    "visible"
                );

            }

        }


        showLalamoveTrackingResult(
            url
                ? "✓ Lalamove tracker saved successfully."
                : "✓ Lalamove tracker removed.",
            "success"
        );


        await refreshOrdersSilently(
            orderId
        );

    }

    catch (error) {

        console.error(
            "SAVE LALAMOVE TRACKER FAILED:",
            error
        );


        showLalamoveTrackingResult(
            "Failed to save tracker. Please try again.",
            "error"
        );

    }

    finally {

        isSavingLalamoveTracking =
            false;


        if (
            elements.saveButton
        ) {

            elements.saveButton.disabled =
                false;

            elements.saveButton.textContent =
                "Save Tracker";

        }

    }

}


/* =========================================================
   SILENT ORDER REFRESH
========================================================= */

async function refreshOrdersSilently(
    openedOrderId = null
) {

    try {

        const {
            data,
            error
        } =
            await supabase
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (
            error
        ) {

            console.warn(
                "SILENT ORDER REFRESH ERROR:",
                error
            );

            return;

        }


        let orders =
            data || [];


        orders =
            await attachCustomerProfiles(
                orders
            );


        orders =
            await resolveOrderMedia(
                orders
            );


        allOrders =
            orders;


        updateStats();

        applyFilters();


        if (
            openedOrderId
        ) {

            const freshOrder =
                allOrders.find(
                    order =>
                        String(
                            order.id
                        ) ===
                        String(
                            openedOrderId
                        )
                );


            if (
                freshOrder
            ) {

                currentOrder =
                    freshOrder;

            }

        }

    }

    catch (error) {

        console.warn(
            "SILENT REFRESH FAILED:",
            error
        );

    }

}


/* =========================================================
   ORDER TOTAL BREAKDOWN
========================================================= */

function renderOrderTotalBreakdown(
    order
) {

    const modalOrderTotal =
        document.getElementById(
            "modalOrderTotal"
        );


    if (
        !modalOrderTotal
    ) {

        return;

    }


    const row =
        modalOrderTotal.closest(
            ".order-total-row"
        );


    if (
        !row
    ) {

        return;

    }


    let breakdown =
        document.getElementById(
            "runtimeOrderBreakdown"
        );


    if (
        !breakdown
    ) {

        breakdown =
            document.createElement(
                "div"
            );


        breakdown.id =
            "runtimeOrderBreakdown";


        breakdown.style.cssText =
            `
                margin-bottom:12px;
                padding-bottom:12px;
                border-bottom:
                    1px solid
                    rgba(255,255,255,.06);
            `;


        row.parentNode.insertBefore(
            breakdown,
            row
        );

    }


    const subtotal =
        getOrderSubtotal(
            order
        );


    const deliveryFee =
        getDeliveryFee(
            order
        );


    breakdown.innerHTML =
        `
            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    margin-bottom:7px;
                    color:#8d97aa;
                    font-size:13px;
                "
            >
                <span>
                    Subtotal
                </span>

                <strong
                    style="
                        color:#f5f7fb;
                    "
                >
                    ${formatMoney(
                        subtotal
                    )}
                </strong>
            </div>


            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    color:#8d97aa;
                    font-size:13px;
                "
            >
                <span>
                    Delivery Fee
                </span>

                <strong
                    style="
                        color:#00f2fe;
                    "
                >
                    ${formatMoney(
                        deliveryFee
                    )}
                </strong>
            </div>
        `;

}


/* =========================================================
   FILL ORDER MODAL
========================================================= */

async function fillOrderModal(
    order
) {

    if (!order) {
        return;
    }


    currentOrder =
        order;


    await renderCustomerProfile(
        order
    );


    const modalOrderTitle =
        document.getElementById(
            "modalOrderTitle"
        );


    const modalOrderId =
        document.getElementById(
            "modalOrderId"
        );


    const modalOrderDate =
        document.getElementById(
            "modalOrderDate"
        );


    const modalOrderTotal =
        document.getElementById(
            "modalOrderTotal"
        );


    const modalPaymentMethod =
        document.getElementById(
            "modalPaymentMethod"
        );


    const modalPaymentStatus =
        document.getElementById(
            "modalPaymentStatus"
        );


    const modalStatus =
        document.getElementById(
            "modalStatus"
        );


    const modalOrderStatus =
        document.getElementById(
            "modalOrderStatus"
        );


    if (
        modalOrderTitle
    ) {

        modalOrderTitle.textContent =
            `Order #${String(
                order.id ||
                ""
            ).slice(
                0,
                8
            )}`;

    }


    if (
        modalOrderId
    ) {

        modalOrderId.textContent =
            order.id ||
            "—";

    }


    if (
        modalOrderDate
    ) {

        modalOrderDate.textContent =
            formatDate(
                order.created_at
            );

    }


    if (
        modalOrderTotal
    ) {

        modalOrderTotal.textContent =
            formatMoney(
                getOrderTotal(
                    order
                )
            );

    }


    if (
        modalPaymentMethod
    ) {

        modalPaymentMethod.textContent =
            order.payment_method ||
            "—";

    }


    if (
        modalPaymentStatus
    ) {

        modalPaymentStatus.textContent =
            normalizePaymentStatus(
                order.payment_status
            );

    }


    if (
        modalStatus
    ) {

        modalStatus.textContent =
            getOrderStatus(
                order
            );

    }


    if (
        modalOrderStatus
    ) {

        const normalized =
            getOrderStatus(
                order
            );


        const matchingOption =
            Array.from(
                modalOrderStatus.options
            ).find(
                option =>
                    normalizeStatus(
                        option.value
                    ) ===
                    normalized
            );


        if (
            matchingOption
        ) {

            modalOrderStatus.value =
                matchingOption.value;

        }

        else {

            modalOrderStatus.value =
                normalized;

        }

    }


    renderDeliveryInfo(
        order
    );


    renderLalamoveTracking(
        order
    );


    renderOrderTotalBreakdown(
        order
    );


    renderOrderItems(
        order
    );


    await renderPaymentProof(
        order
    );


    updatePaymentButtons(
        order
    );


    if (
        orderModal
    ) {

        orderModal.hidden =
            false;

        orderModal.classList.add(
            "active"
        );

        orderModal.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";

    }

}


/* =========================================================
   ORDER ITEMS & CUSTOMER NOTES
========================================================= */

function renderOrderItems(
    order
) {

    const container =
        document.getElementById(
            "modalOrderItems"
        );


    if (
        !container
    ) {

        return;

    }


    const items =
        getOrderItems(
            order
        );

    const notes =
        order.notes ||
        order.customer_notes ||
        order.remarks ||
        order.instructions ||
        "";


    let html = "";

    /* --- CUSTOMER NOTES BLOCK --- */
    if (notes && String(notes).trim()) {
        html += `
            <div
                class="customer-notes-box"
                style="
                    margin-bottom:16px;
                    padding:12px 14px;
                    background:rgba(255, 204, 0, 0.08);
                    border:1px dashed rgba(255, 204, 0, 0.4);
                    border-radius:12px;
                "
            >
                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:6px;
                        color:#ffcc00;
                        font-size:12px;
                        font-weight:700;
                        margin-bottom:6px;
                        text-transform:uppercase;
                        letter-spacing:0.5px;
                    "
                >
                    <span>📝</span> Customer Notes
                </div>
                <div
                    style="
                        color:#f5f7fb;
                        font-size:13px;
                        line-height:1.4;
                        white-space:pre-wrap;
                        word-break:break-word;
                    "
                >
                    ${escapeHTML(notes.trim())}
                </div>
            </div>
        `;
    }


    if (
        !items.length
    ) {

        html += `
            <div class="empty-state">
                No order items found.
            </div>
        `;

        container.innerHTML = html;
        return;

    }


    /* --- ORDER ITEMS WITH PICTURE, NAME, QTY, PRICE, SUBTOTAL --- */
    html += items
        .map(
            item => {

                const name =
                    item.name ||
                    item.product_name ||
                    "Product";


                const quantity =
                    Number(
                        item.quantity ||
                        item.qty ||
                        1
                    );


                const price =
                    Number(
                        item.price ||
                        0
                    );

                const subtotal =
                    price * quantity;

                const image =
                    item.image ||
                    item.image_url ||
                    item.picture ||
                    item.photo ||
                    "";


                return `
                    <div
                        class="order-item"
                        style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:12px;
                            padding:10px 0;
                            border-bottom:1px solid rgba(255,255,255,0.06);
                        "
                    >

                        <div
                            style="
                                display:flex;
                                align-items:center;
                                gap:12px;
                                flex:1;
                                min-width:0;
                            "
                        >

                            ${
                                image
                                    ? `
                                        <img
                                            src="${escapeHTML(image)}"
                                            alt="${escapeHTML(name)}"
                                            style="
                                                width:48px;
                                                height:48px;
                                                object-fit:cover;
                                                border-radius:8px;
                                                border:1px solid rgba(255,255,255,0.1);
                                                background:#1a1d24;
                                                flex-shrink:0;
                                            "
                                            onerror="this.style.display='none';"
                                        >
                                      `
                                    : `
                                        <div
                                            style="
                                                width:48px;
                                                height:48px;
                                                border-radius:8px;
                                                border:1px solid rgba(255,255,255,0.1);
                                                background:rgba(255,255,255,0.03);
                                                display:flex;
                                                align-items:center;
                                                justify-content:center;
                                                font-size:18px;
                                                color:#8d97aa;
                                                flex-shrink:0;
                                            "
                                        >
                                            🖼️
                                        </div>
                                      `
                            }

                            <div
                                style="
                                    display:flex;
                                    flex-direction:column;
                                    gap:2px;
                                    min-width:0;
                                "
                            >

                                <strong
                                    style="
                                        color:#f5f7fb;
                                        font-size:14px;
                                        white-space:nowrap;
                                        overflow:hidden;
                                        text-overflow:ellipsis;
                                    "
                                >
                                    ${escapeHTML(name)}
                                </strong>

                                <small
                                    style="
                                        color:#8d97aa;
                                        font-size:12px;
                                    "
                                >
                                    ${formatMoney(price)} × ${quantity}
                                </small>

                            </div>

                        </div>


                        <div
                            style="
                                text-align:right;
                                flex-shrink:0;
                            "
                        >

                            <strong
                                style="
                                    display:block;
                                    color:#00f2fe;
                                    font-size:14px;
                                "
                            >
                                ${formatMoney(subtotal)}
                            </strong>

                        </div>

                    </div>
                `;

            }
        )
        .join("");

    container.innerHTML = html;

}


/* =========================================================
   PAYMENT PROOF
========================================================= */

async function renderPaymentProof(
    order
) {

    const container =
        document.getElementById(
            "paymentProofContainer"
        );


    const image =
        document.getElementById(
            "paymentProofImage"
        );


    const message =
        document.getElementById(
            "paymentProofMessage"
        );


    if (
        !container ||
        !image ||
        !message
    ) {

        return;

    }


    container.style.display =
        "block";


    image.style.display =
        "none";


    image.removeAttribute(
        "src"
    );


    message.style.display =
        "block";


    message.textContent =
        "Loading payment proof...";


    let proofUrl =
        order?._resolvedPaymentProofUrl ||
        "";


    if (
        !proofUrl
    ) {

        proofUrl =
            await resolvePaymentProof(
                order
            );

        order._resolvedPaymentProofUrl =
            proofUrl;

    }


    if (
        !proofUrl
    ) {

        message.textContent =
            "No payment proof uploaded.";

        return;

    }


    image.onload =
        () => {

            image.style.display =
                "block";

            message.style.display =
                "none";

        };


    image.onerror =
        () => {

            image.style.display =
                "none";

            message.innerHTML =
                `
                    Payment proof could not be loaded.
                    <br>
                    <small>
                        Check the payment-proofs bucket
                        and Storage policies.
                    </small>
                `;

            message.style.display =
                "block";

        };


    image.src =
        proofUrl;

}


/* =========================================================
   PAYMENT BUTTONS
========================================================= */

function updatePaymentButtons(
    order
) {

    const confirmButton =
        document.getElementById(
            "confirmPaymentBtn"
        );


    const rejectButton =
        document.getElementById(
            "rejectPaymentBtn"
        );


    const status =
        normalizePaymentStatus(
            order?.payment_status
        );


    if (
        confirmButton
    ) {

        confirmButton.disabled =
            status ===
            "Paid";

    }


    if (
        rejectButton
    ) {

        rejectButton.disabled =
            status ===
            "Rejected";

    }

}


/* =========================================================
   OPEN ORDER
========================================================= */

async function openOrder(
    orderId
) {

    const order =
        allOrders.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    orderId
                )
        );


    if (
        !order
    ) {

        console.warn(
            "ORDER NOT FOUND:",
            orderId
        );

        return;

    }


    await fillOrderModal(
        order
    );

}


/* =========================================================
   CLOSE ORDER MODAL
========================================================= */

function closeOrderModal() {

    if (
        !orderModal
    ) {

        return;

    }


    orderModal.classList.remove(
        "active"
    );


    orderModal.style.display =
        "none";


    orderModal.hidden =
        true;


    document.body.style.overflow =
        "";


    currentOrder =
        null;

}


/* =========================================================
   PROFILE PHOTO PREVIEW
========================================================= */

function getPhotoPreviewElements() {

    return {

        backdrop:
            document.getElementById(
                "profilePhotoBackdrop"
            ),

        preview:
            document.getElementById(
                "profilePhotoPreview"
            ),

        image:
            document.getElementById(
                "profilePhotoPreviewImage"
            ),

        name:
            document.getElementById(
                "profilePhotoPreviewName"
            ),

        close:
            document.getElementById(
                "profilePhotoClose"
            )

    };

}


/* =========================================================
   OPEN PROFILE PHOTO
========================================================= */

async function openProfilePhotoPreview(
    order
) {

    if (
        !order
    ) {

        return;

    }


    let avatarUrl =
        order._resolvedAvatarUrl ||
        "";


    if (
        !avatarUrl
    ) {

        avatarUrl =
            await resolveProfileImage(
                order
            );


        order._resolvedAvatarUrl =
            avatarUrl;

    }


    if (
        !avatarUrl
    ) {

        return;

    }


    const elements =
        getPhotoPreviewElements();


    if (
        !elements.image
    ) {

        return;

    }


    elements.image.src =
        avatarUrl;


    if (
        elements.name
    ) {

        elements.name.textContent =
            getCustomerName(
                order
            );

    }


    if (
        elements.backdrop
    ) {

        elements.backdrop.hidden =
            false;

        elements.backdrop.style.display =
            "flex";

        elements.backdrop.classList.add(
            "active"
        );

        elements.backdrop.classList.add(
            "open"
        );

        elements.backdrop.classList.add(
            "show"
        );

    }


    document.body.classList.add(
        "photo-preview-open"
    );

}


/* =========================================================
   CLOSE PROFILE PHOTO
========================================================= */

function closeProfilePhotoPreview() {

    const elements =
        getPhotoPreviewElements();


    if (
        elements.backdrop
    ) {

        elements.backdrop.classList.remove(
            "show"
        );

        elements.backdrop.classList.remove(
            "open"
        );

        elements.backdrop.classList.remove(
            "active"
        );

        elements.backdrop.style.display =
            "none";

        elements.backdrop.hidden =
            true;

    }


    if (
        elements.image
    ) {

        elements.image.removeAttribute(
            "src"
        );

    }


    document.body.classList.remove(
        "photo-preview-open"
    );

}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

async function updateOrderStatus(
    orderId,
    newStatus
) {

    if (
        !orderId ||
        !newStatus
    ) {

        return false;

    }


    const statusToSave =
        normalizeStatus(
            newStatus
        );


    const {
        error
    } =
        await supabase
            .from("orders")
            .update({
                status:
                    statusToSave
            })
            .eq(
                "id",
                orderId
            );


    if (
        error
    ) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );


        alert(
            "Failed to update order status.\n\n" +
            error.message
        );


        return false;

    }


    const index =
        allOrders.findIndex(
            order =>
                String(
                    order.id
                ) ===
                String(
                    orderId
                )
        );


    if (
        index !== -1
    ) {

        allOrders[index].status =
            statusToSave;


        currentOrder =
            allOrders[index];

    }


    updateStats();

    applyFilters();


    if (
        currentOrder
    ) {

        await fillOrderModal(
            currentOrder
        );

    }


    return true;

}


/* =========================================================
   UPDATE PAYMENT STATUS
========================================================= */

async function updatePaymentStatus(
    orderId,
    newPaymentStatus
) {

    if (
        !orderId ||
        !newPaymentStatus
    ) {

        return false;

    }


    const {
        error
    } =
        await supabase
            .from("orders")
            .update({
                payment_status:
                    newPaymentStatus
            })
            .eq(
                "id",
                orderId
            );


    if (
        error
    ) {

        console.error(
            "PAYMENT STATUS UPDATE ERROR:",
            error
        );


        alert(
            "Failed to update payment status.\n\n" +
            error.message
        );


        return false;

    }


    const index =
        allOrders.findIndex(
            order =>
                String(
                    order.id
                ) ===
                String(
                    orderId
                )
        );


    if (
        index !== -1
    ) {

        allOrders[index].payment_status =
            newPaymentStatus;


        currentOrder =
            allOrders[index];

    }


    updateStats();

    applyFilters();


    if (
        currentOrder
    ) {

        await fillOrderModal(
            currentOrder
        );

    }


    return true;

}


/* =========================================================
   DELETE ORDER
========================================================= */

async function deleteOrder(
    orderId
) {

    if (
        !orderId
    ) {

        return false;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to delete this order?"
        );


    if (
        !confirmed
    ) {

        return false;

    }


    const {
        error
    } =
        await supabase
            .from("orders")
            .delete()
            .eq(
                "id",
                orderId
            );


    if (
        error
    ) {

        console.error(
            "DELETE ORDER ERROR:",
            error
        );


        alert(
            "Failed to delete order.\n\n" +
            error.message
        );


        return false;

    }


    closeOrderModal();

    await loadOrders();

    return true;

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutAdmin() {

    if (
        isLoggingOut
    ) {

        return;

    }


    isLoggingOut =
        true;


    const button =
        document.getElementById(
            "logoutBtn"
        );


    let originalHTML =
        "";


    if (
        button
    ) {

        originalHTML =
            button.innerHTML;


        button.disabled =
            true;


        button.setAttribute(
            "aria-busy",
            "true"
        );


        button.innerHTML =
            `
                <span>
                    ⏳
                </span>

                <span>
                    Logging out...
                </span>
            `;

    }


    try {

        const {
            error
        } =
            await supabase.auth.signOut();


        if (
            error
        ) {

            throw error;

        }


        window.location.replace(
            "login.html"
        );

    }

    catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );


        alert(
            "Logout failed.\n\n" +
            (
                error?.message ||
                "Please try again."
            )
        );


        if (
            button
        ) {

            button.disabled =
                false;


            button.removeAttribute(
                "aria-busy"
            );


            button.innerHTML =
                originalHTML;

        }


        isLoggingOut =
            false;

    }

}


/* =========================================================
   EVENT HANDLERS
========================================================= */


/* SEARCH */

if (
    orderSearch
) {

    orderSearch.addEventListener(
        "input",
        function() {

            applyFilters();

        }
    );

}


/* STATUS FILTER */

if (
    orderStatusFilter
) {

    orderStatusFilter.addEventListener(
        "change",
        function() {

            quickFilter =
                "all";


            document
                .querySelectorAll(
                    ".order-stat-card"
                )
                .forEach(
                    card => {

                        card.classList.remove(
                            "active-card"
                        );

                    }
                );


            const allCard =
                document.querySelector(
                    ".order-stat-card[data-quick-filter='all']"
                );


            if (
                allCard
            ) {

                allCard.classList.add(
                    "active-card"
                );

            }


            applyFilters();

        }
    );

}


/* =========================================================
   LALAMOVE SAVE BUTTON
========================================================= */

const saveLalamoveTrackingButton =
    document.getElementById(
        "saveLalamoveTrackingBtn"
    );


if (
    saveLalamoveTrackingButton
) {

    saveLalamoveTrackingButton.addEventListener(
        "click",
        async function(event) {

            event.preventDefault();

            event.stopPropagation();

            await saveLalamoveTracking();

        }
    );

}


/* =========================================================
   TABLE
========================================================= */

if (
    ordersTableBody
) {

    ordersTableBody.addEventListener(
        "click",
        async function(event) {

            const profileButton =
                event.target.closest(
                    ".profile-avatar-trigger"
                );


            if (
                profileButton
            ) {

                event.preventDefault();

                event.stopPropagation();


                const orderId =
                    profileButton.dataset
                        .profileOrderId;


                const order =
                    allOrders.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                orderId
                            )
                    );


                if (
                    order
                ) {

                    await openProfilePhotoPreview(
                        order
                    );

                }


                return;

            }


            const viewButton =
                event.target.closest(
                    ".view-order-btn"
                );


            if (
                viewButton
            ) {

                event.preventDefault();

                event.stopPropagation();


                await openOrder(
                    viewButton.dataset
                        .orderId
                );


                return;

            }


            const row =
                event.target.closest(
                    "tr[data-order-id]"
                );


            if (
                row
            ) {

                await openOrder(
                    row.dataset
                        .orderId
                );

            }

        }
    );


    ordersTableBody.addEventListener(
        "keydown",
        async function(event) {

            const row =
                event.target.closest(
                    "tr[data-order-id]"
                );


            if (
                row &&
                (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                )
            ) {

                event.preventDefault();


                await openOrder(
                    row.dataset
                        .orderId
                );

            }

        }
    );

}


/* =========================================================
   MOBILE
========================================================= */

if (
    mobileOrdersList
) {

    mobileOrdersList.addEventListener(
        "click",
        async function(event) {

            const profileButton =
                event.target.closest(
                    ".profile-avatar-trigger"
                );


            if (
                profileButton
            ) {

                event.preventDefault();

                event.stopPropagation();


                const orderId =
                    profileButton.dataset
                        .profileOrderId;


                const order =
                    allOrders.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                orderId
                            )
                    );


                if (
                    order
                ) {

                    await openProfilePhotoPreview(
                        order
                    );

                }


                return;

            }


            const viewButton =
                event.target.closest(
                    ".view-order-btn"
                );


            if (
                viewButton
            ) {

                event.preventDefault();

                event.stopPropagation();


                await openOrder(
                    viewButton.dataset
                        .orderId
                );


                return;

            }


            const card =
                event.target.closest(
                    ".mobile-order-card"
                );


            if (
                card
            ) {

                await openOrder(
                    card.dataset
                        .orderId
                );

            }

        }
    );


    mobileOrdersList.addEventListener(
        "keydown",
        async function(event) {

            const card =
                event.target.closest(
                    ".mobile-order-card"
                );


            if (
                card &&
                (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                )
            ) {

                event.preventDefault();


                await openOrder(
                    card.dataset
                        .orderId
                );

            }

        }
    );

}


/* =========================================================
   GLOBAL CLICK HANDLER
========================================================= */

document.addEventListener(
    "click",
    async function(event) {

        /*
         * CLOSE ORDER MODAL
         */

        const closeOrderButton =
            event.target.closest(
                [
                    "#closeOrderModal",
                    "[data-close-order-modal]",
                    ".close-order-modal",
                    ".modal-close",
                    ".order-modal-close"
                ].join(",")
            );


        if (
            closeOrderButton
        ) {

            event.preventDefault();

            closeOrderModal();

            return;

        }


        /*
         * ORDER MODAL OVERLAY
         */

        if (
            orderModal &&
            (
                event.target ===
                orderModal ||
                event.target ===
                document.getElementById(
                    "orderModalOverlay"
                )
            )
        ) {

            closeOrderModal();

            return;

        }


        /*
         * PROFILE PHOTO CLOSE
         */

        const closePhotoButton =
            event.target.closest(
                "#profilePhotoClose"
            );


        if (
            closePhotoButton
        ) {

            event.preventDefault();

            closeProfilePhotoPreview();

            return;

        }


        const photoBackdrop =
            event.target.closest(
                "#profilePhotoBackdrop"
            );


        if (
            photoBackdrop &&
            event.target ===
                photoBackdrop
        ) {

            closeProfilePhotoPreview();

            return;

        }


        /*
         * STATUS UPDATE
         */

        const updateStatusButton =
            event.target.closest(
                "#updateOrderStatusBtn"
            );


        if (
            updateStatusButton
        ) {

            event.preventDefault();


            if (
                !currentOrder
            ) {

                alert(
                    "No order selected."
                );

                return;

            }


            const statusSelect =
                document.getElementById(
                    "modalOrderStatus"
                );


            if (
                !statusSelect
            ) {

                return;

            }


            const newStatus =
                statusSelect.value;


            updateStatusButton.disabled =
                true;


            try {

                await updateOrderStatus(
                    currentOrder.id,
                    newStatus
                );

            }

            finally {

                updateStatusButton.disabled =
                    false;

            }


            return;

        }


        /*
         * APPROVE PAYMENT
         */

        const confirmButton =
            event.target.closest(
                "#confirmPaymentBtn"
            );


        if (
            confirmButton
        ) {

            event.preventDefault();


            if (
                !currentOrder
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Confirm this payment?"
                );


            if (
                !confirmed
            ) {

                return;

            }


            confirmButton.disabled =
                true;


            try {

                await updatePaymentStatus(
                    currentOrder.id,
                    "Approved"
                );

            }

            finally {

                confirmButton.disabled =
                    false;

            }


            return;

        }


        /*
         * REJECT PAYMENT
         */

        const rejectButton =
            event.target.closest(
                "#rejectPaymentBtn"
            );


        if (
            rejectButton
        ) {

            event.preventDefault();


            if (
                !currentOrder
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Reject this payment?"
                );


            if (
                !confirmed
            ) {

                return;

            }


            rejectButton.disabled =
                true;


            try {

                await updatePaymentStatus(
                    currentOrder.id,
                    "Rejected"
                );

            }

            finally {

                rejectButton.disabled =
                    false;

            }


            return;

        }


        /*
         * DELETE
         */

        const deleteButton =
            event.target.closest(
                "#deleteOrderBtn"
            );


        if (
            deleteButton
        ) {

            event.preventDefault();


            if (
                !currentOrder
            ) {

                return;

            }


            deleteButton.disabled =
                true;


            try {

                await deleteOrder(
                    currentOrder.id
                );

            }

            finally {

                deleteButton.disabled =
                    false;

            }


            return;

        }

    }
);


/* =========================================================
   CLOSE WITH ESC
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Escape"
        ) {

            closeProfilePhotoPreview();

            closeOrderModal();

        }

    }
);


/* =========================================================
   REALTIME
========================================================= */

const ordersChannel =
    supabase
        .channel(
            "admin-orders-realtime"
        )
        .on(
            "postgres_changes",
            {
                event:
                    "*",

                schema:
                    "public",

                table:
                    "orders"
            },
            async function() {

                const openedOrderId =
                    currentOrder?.id ||
                    null;


                await loadOrders();


                if (
                    openedOrderId
                ) {

                    const freshOrder =
                        allOrders.find(
                            order =>
                                String(
                                    order.id
                                ) ===
                                String(
                                    openedOrderId
                                )
                        );


                    if (
                        freshOrder
                    ) {

                        await fillOrderModal(
                            freshOrder
                        );

                    }

                }

            }
        )
        .subscribe(
            status => {

                console.log(
                    "Orders realtime status:",
                    status
                );

            }
        );


/* =========================================================
   AUTH
========================================================= */

async function checkAuth() {

    const {
        data,
        error
    } =
        await supabase.auth.getSession();


    if (
        error
    ) {

        console.error(
            "AUTH SESSION ERROR:",
            error
        );


        window.location.replace(
            "login.html"
        );


        return false;

    }


    const session =
        data?.session;


    if (
        !session
    ) {

        window.location.replace(
            "login.html"
        );


        return false;

    }


    console.log(
        "Admin authenticated:",
        session.user.email
    );


    return true;

}


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
    function(event) {

        if (
            event ===
            "SIGNED_OUT"
        ) {

            window.location.replace(
                "login.html"
            );

        }

    }
);


/* =========================================================
   LOGOUT BUTTON
========================================================= */

const logoutButton =
    document.getElementById(
        "logoutBtn"
    );


if (
    logoutButton
) {

    logoutButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            event.stopPropagation();

            logoutAdmin();

        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {

    console.log(
        "ADMIN ORDERS INITIALIZING..."
    );


    const authenticated =
        await checkAuth();


    if (
        !authenticated
    ) {

        return;

    }


    setupStatCards();


    await loadOrders();


    console.log(
        "ADMIN ORDERS READY."
    );

}


/* =========================================================
   START
========================================================= */

init();