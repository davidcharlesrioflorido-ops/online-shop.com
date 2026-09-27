
import { supabase } from "./supabase.js";

/* =========================================================
   ADMIN NOTIFICATIONS
   BUSINESS STORE

   NOTIFICATIONS:
   - Dashboard
   - Products
   - Orders
   - Requests
   - Admin Registrations

   FEATURES:
   - Detect new requests
   - Detect new orders
   - Detect order status changes
   - Detect low-stock products
   - Detect pending admin registrations
   - Supabase Realtime
   - 30-second fallback refresh
   - Multiple badge support
   - Case-insensitive status checking
========================================================= */

console.log("=================================");
console.log("ADMIN-NOTIFICATIONS.JS LOADED");
console.log("=================================");

/* =========================================================
   CONSTANTS
========================================================= */

const LOW_STOCK_LIMIT = 5;

const REFRESH_INTERVAL = 30000;

/*
   Finished request statuses.

   Any request that is NOT in this list
   will be considered active and will
   create a notification.
*/

const FINISHED_REQUEST_STATUSES = [
    "resolved",
    "completed",
    "closed",
    "rejected",
    "cancelled",
    "canceled",
    "done",
    "finished"
];

/*
   Finished order statuses.

   These will NOT create an order notification.
*/

const FINISHED_ORDER_STATUSES = [
    "completed",
    "delivered",
    "cancelled",
    "canceled",
    "rejected",
    "refunded",
    "closed"
];

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalize(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

/* =========================================================
   GET ALL BADGES
========================================================= */

function getBadges(selector) {

    return document.querySelectorAll(
        selector
    );
}

/* =========================================================
   UPDATE BADGE
========================================================= */

function updateBadge(
    selector,
    count
) {

    const badges =
        getBadges(selector);

    const total =
        Number(count || 0);

    badges.forEach(
        badge => {

            if (total > 0) {

                badge.hidden = false;

                badge.textContent =
                    total > 99
                        ? "99+"
                        : String(total);

                badge.classList.add(
                    "has-notification"
                );

            } else {

                badge.hidden = true;

                badge.textContent = "0";

                badge.classList.remove(
                    "has-notification"
                );
            }
        }
    );
}

/* =========================================================
   CLEAR ALL BADGES
========================================================= */

function clearAllBadges() {

    updateBadge(
        "[data-dashboard-count]",
        0
    );

    updateBadge(
        "[data-product-count]",
        0
    );

    updateBadge(
        "[data-order-count]",
        0
    );

    updateBadge(
        "[data-request-count]",
        0
    );

    updateBadge(
        "[data-admin-registration-count]",
        0
    );
}

/* =========================================================
   CHECK APPROVED ADMIN
========================================================= */

async function isApprovedAdmin() {

    try {

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabase.auth.getSession();

        if (
            sessionError ||
            !sessionData?.session
        ) {

            return false;
        }

        const user =
            sessionData.session.user;

        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("profiles")
                .select(
                    "id, role, status"
                )
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();

        if (
            profileError ||
            !profile
        ) {

            return false;
        }

        return (
            normalize(profile.role) === "admin" &&
            normalize(profile.status) === "approved"
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH CHECK ERROR:",
            error
        );

        return false;
    }
}

/* =========================================================
   PRODUCTS
========================================================= */

async function loadProductNotification() {

    try {

        /*
           Get products with their stock.

           We intentionally fetch stock instead
           of relying only on a database filter.
           This makes the notification more
           reliable if stock is stored as text/null.
        */

        const {
            data,
            error
        } =
            await supabase
                .from("products")
                .select(
                    "id, stock"
                );

        if (error) {

            console.error(
                "PRODUCT NOTIFICATION ERROR:",
                error
            );

            updateBadge(
                "[data-product-count]",
                0
            );

            return 0;
        }

        const products =
            Array.isArray(data)
                ? data
                : [];

        const lowStockProducts =
            products.filter(
                product => {

                    const stock =
                        Number(
                            product.stock
                        );

                    return (
                        Number.isFinite(stock) &&
                        stock <= LOW_STOCK_LIMIT
                    );
                }
            );

        const total =
            lowStockProducts.length;

        updateBadge(
            "[data-product-count]",
            total
        );

        console.log(
            "📦 LOW STOCK PRODUCTS:",
            total
        );

        return total;

    } catch (error) {

        console.error(
            "PRODUCT NOTIFICATION ERROR:",
            error
        );

        updateBadge(
            "[data-product-count]",
            0
        );

        return 0;
    }
}

/* =========================================================
   ORDERS
========================================================= */

async function loadOrderNotification() {

    try {

        /*
           Get all orders.

           We normalize both:
           - status
           - payment_status

           This prevents problems with:
           Pending
           pending
           PENDING
           In Progress
           in_progress
           etc.
        */

        const {
            data,
            error
        } =
            await supabase
                .from("orders")
                .select(
                    "id, status, payment_status"
                );

        if (error) {

            console.error(
                "ORDER NOTIFICATION ERROR:",
                error
            );

            updateBadge(
                "[data-order-count]",
                0
            );

            return 0;
        }

        const orders =
            Array.isArray(data)
                ? data
                : [];

        /*
           Filter orders that need attention.
        */

        const activeOrders =
            orders.filter(
                order => {

                    const status =
                        normalize(
                            order.status
                        );

                    const paymentStatus =
                        normalize(
                            order.payment_status
                        );

                    /*
                       If order itself is already
                       finished, don't notify.
                    */

                    const orderFinished =
                        FINISHED_ORDER_STATUSES
                            .includes(
                                status
                            );

                    if (orderFinished) {

                        return false;
                    }

                    /*
                       Payment needs attention.
                    */

                    const paymentNeedsAttention = (

                        paymentStatus === "pending" ||

                        paymentStatus === "unpaid" ||

                        paymentStatus === "awaiting payment" ||

                        paymentStatus === "awaiting payment confirmation" ||

                        paymentStatus === "for payment" ||

                        paymentStatus === "pending verification"

                    );

                    /*
                       Order needs attention.
                    */

                    const orderNeedsAttention = (

                        status === "pending" ||

                        status === "new" ||

                        status === "processing" ||

                        status === "in progress" ||

                        status === "for processing" ||

                        status === "pending payment" ||

                        status === "awaiting payment" ||

                        status === "to process"

                    );

                    return (
                        paymentNeedsAttention ||
                        orderNeedsAttention
                    );
                }
            );

        const total =
            activeOrders.length;

        updateBadge(
            "[data-order-count]",
            total
        );

        console.log(
            "🛒 ORDERS NEEDING ATTENTION:",
            total
        );

        return total;

    } catch (error) {

        console.error(
            "ORDER NOTIFICATION ERROR:",
            error
        );

        updateBadge(
            "[data-order-count]",
            0
        );

        return 0;
    }
}

/* =========================================================
   REQUESTS
========================================================= */

async function loadRequestNotification() {

    try {

        /*
           IMPORTANT:

           We get ALL requests.

           We do NOT depend on exact status values.

           Example:

           pending
           Pending
           PENDING
           new
           NEW
           processing

           will all be detected.

           Only clearly finished statuses are ignored.
        */

        const {
            data,
            error
        } =
            await supabase
                .from("requests")
                .select(
                    "id, status"
                );

        if (error) {

            console.error(
                "REQUEST NOTIFICATION ERROR:",
                error
            );

            updateBadge(
                "[data-request-count]",
                0
            );

            return 0;
        }

        const requests =
            Array.isArray(data)
                ? data
                : [];

        const activeRequests =
            requests.filter(
                request => {

                    const status =
                        normalize(
                            request.status
                        );

                    /*
                       If there is no status,
                       treat it as a NEW request.

                       This is useful when the
                       database default is blank/null.
                    */

                    if (!status) {

                        return true;
                    }

                    /*
                       Ignore only completed
                       requests.
                    */

                    return !FINISHED_REQUEST_STATUSES
                        .includes(
                            status
                        );
                }
            );

        const total =
            activeRequests.length;

        updateBadge(
            "[data-request-count]",
            total
        );

        console.log(
            "📩 ACTIVE CUSTOMER REQUESTS:",
            total
        );

        return total;

    } catch (error) {

        console.error(
            "REQUEST NOTIFICATION ERROR:",
            error
        );

        updateBadge(
            "[data-request-count]",
            0
        );

        return 0;
    }
}

/* =========================================================
   ADMIN REGISTRATIONS
========================================================= */

async function loadAdminRegistrationNotification() {

    try {

        /*
           Get all admin profiles.

           We normalize status in JavaScript
           instead of using:

           .eq("status", "pending")

           so Pending / PENDING also work.
        */

        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select(
                    "id, role, status"
                );

        if (error) {

            console.error(
                "ADMIN REGISTRATION NOTIFICATION ERROR:",
                error
            );

            updateBadge(
                "[data-admin-registration-count]",
                0
            );

            return 0;
        }

        const profiles =
            Array.isArray(data)
                ? data
                : [];

        const pendingAdmins =
            profiles.filter(
                profile => {

                    const role =
                        normalize(
                            profile.role
                        );

                    const status =
                        normalize(
                            profile.status
                        );

                    return (
                        role === "admin" &&
                        status === "pending"
                    );
                }
            );

        const total =
            pendingAdmins.length;

        updateBadge(
            "[data-admin-registration-count]",
            total
        );

        console.log(
            "👤 PENDING ADMIN REGISTRATIONS:",
            total
        );

        return total;

    } catch (error) {

        console.error(
            "ADMIN REGISTRATION NOTIFICATION ERROR:",
            error
        );

        updateBadge(
            "[data-admin-registration-count]",
            0
        );

        return 0;
    }
}

/* =========================================================
   LOAD ALL NOTIFICATIONS
========================================================= */

let loadingNotifications = false;

async function loadAllNotifications() {

    /*
       Prevent multiple simultaneous loads.

       This is important because:
       - Realtime can fire
       - admin.js can fire
       - 30-second timer can fire

       at nearly the same time.
    */

    if (loadingNotifications) {

        console.log(
            "Notification refresh already running."
        );

        return;
    }

    loadingNotifications = true;

    try {

        console.log(
            "================================="
        );

        console.log(
            "CHECKING ADMIN NOTIFICATIONS"
        );

        console.log(
            "================================="
        );

        const admin =
            await isApprovedAdmin();

        if (!admin) {

            clearAllBadges();

            return;
        }

        /*
           Load everything at the same time.
        */

        const results =
            await Promise.allSettled([

                loadProductNotification(),

                loadOrderNotification(),

                loadRequestNotification(),

                loadAdminRegistrationNotification()

            ]);

        const productCount =
            results[0].status === "fulfilled"
                ? Number(
                    results[0].value || 0
                )
                : 0;

        const orderCount =
            results[1].status === "fulfilled"
                ? Number(
                    results[1].value || 0
                )
                : 0;

        const requestCount =
            results[2].status === "fulfilled"
                ? Number(
                    results[2].value || 0
                )
                : 0;

        const registrationCount =
            results[3].status === "fulfilled"
                ? Number(
                    results[3].value || 0
                )
                : 0;

        /*
           Dashboard = everything.
        */

        const dashboardTotal =
            productCount +
            orderCount +
            requestCount +
            registrationCount;

        updateBadge(
            "[data-dashboard-count]",
            dashboardTotal
        );

        console.log(
            "================================="
        );

        console.log(
            "📊 ADMIN NOTIFICATIONS"
        );

        console.log(
            "Products:",
            productCount
        );

        console.log(
            "Orders:",
            orderCount
        );

        console.log(
            "Requests:",
            requestCount
        );

        console.log(
            "Admin Registrations:",
            registrationCount
        );

        console.log(
            "Dashboard:",
            dashboardTotal
        );

        console.log(
            "================================="
        );

    } catch (error) {

        console.error(
            "LOAD ALL NOTIFICATIONS ERROR:",
            error
        );

    } finally {

        loadingNotifications = false;
    }
}

/* =========================================================
   REALTIME CHANNEL
========================================================= */

let realtimeChannel = null;

function startRealtime() {

    try {

        /*
           Prevent duplicate channels.
        */

        if (realtimeChannel) {

            supabase.removeChannel(
                realtimeChannel
            );

            realtimeChannel = null;
        }

        realtimeChannel =
            supabase
                .channel(
                    "business-store-admin-notifications"
                )

                /* =================================================
                   PRODUCTS
                ================================================= */

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "products"
                    },
                    payload => {

                        console.log(
                            "📦 PRODUCT REALTIME CHANGE:",
                            payload
                        );

                        loadAllNotifications();
                    }
                )

                /* =================================================
                   ORDERS
                ================================================= */

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "orders"
                    },
                    payload => {

                        console.log(
                            "🛒 ORDER REALTIME CHANGE:",
                            payload
                        );

                        loadAllNotifications();
                    }
                )

                /* =================================================
                   REQUESTS
                ================================================= */

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "requests"
                    },
                    payload => {

                        console.log(
                            "📩 REQUEST REALTIME CHANGE:",
                            payload
                        );

                        /*
                           This is the important part.

                           INSERT:
                           New request appears immediately.

                           UPDATE:
                           Status changed.

                           DELETE:
                           Request removed.
                        */

                        loadAllNotifications();
                    }
                )

                /* =================================================
                   PROFILES
                ================================================= */

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "profiles"
                    },
                    payload => {

                        console.log(
                            "👤 PROFILE REALTIME CHANGE:",
                            payload
                        );

                        loadAllNotifications();
                    }
                )

                /* =================================================
                   SUBSCRIBE
                ================================================= */

                .subscribe(
                    status => {

                        console.log(
                            "🔴 ADMIN REALTIME STATUS:",
                            status
                        );

                    }
                );

    } catch (error) {

        console.error(
            "REALTIME START ERROR:",
            error
        );
    }
}

/* =========================================================
   EVENTS FROM ADMIN.JS
========================================================= */

window.addEventListener(
    "admin-dashboard-updated",
    () => {

        console.log(
            "ADMIN DASHBOARD UPDATED"
        );

        loadAllNotifications();
    }
);

window.addEventListener(
    "admin-product-updated",
    () => {

        console.log(
            "ADMIN PRODUCT UPDATED"
        );

        loadAllNotifications();
    }
);

window.addEventListener(
    "admin-order-updated",
    () => {

        console.log(
            "ADMIN ORDER UPDATED"
        );

        loadAllNotifications();
    }
);

window.addEventListener(
    "admin-request-updated",
    () => {

        console.log(
            "ADMIN REQUEST UPDATED"
        );

        loadAllNotifications();
    }
);

window.addEventListener(
    "admin-registration-updated",
    () => {

        console.log(
            "ADMIN REGISTRATION UPDATED"
        );

        loadAllNotifications();
    }
);

/* =========================================================
   SUPABASE AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        console.log(
            "AUTH STATE:",
            event
        );

        if (session) {

            loadAllNotifications();

        } else {

            clearAllBadges();
        }
    }
);

/* =========================================================
   INITIAL LOAD
========================================================= */

loadAllNotifications();

/* =========================================================
   START REALTIME
========================================================= */

startRealtime();

/* =========================================================
   FALLBACK REFRESH
========================================================= */

setInterval(
    () => {

        loadAllNotifications();

    },
    REFRESH_INTERVAL
);

