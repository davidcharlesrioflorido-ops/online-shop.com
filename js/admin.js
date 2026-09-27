
import { supabase } from "./supabase.js";

/* =========================================================
   ADMIN.JS
   BUSINESS STORE ADMIN DASHBOARD

   FEATURES:
   - Admin authentication
   - Admin approval check
   - Dashboard statistics
   - Products count
   - Orders count
   - Pending payments
   - Customer requests
   - Total sales
   - Recent orders
   - Payment activity
   - Admin registration requests
   - Logout
   - Notification refresh events
========================================================= */

console.log("=================================");
console.log("ADMIN.JS LOADED");
console.log("=================================");

/* =========================================================
   HELPER
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

/* =========================================================
   SAFE NUMBER
========================================================= */

function toNumber(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2
    }).format(
        toNumber(value)
    );
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
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
   NOTIFICATION REFRESH EVENT
========================================================= */

function notifyAdminNotifications() {
    window.dispatchEvent(
        new CustomEvent(
            "admin-dashboard-updated"
        )
    );
}

/* =========================================================
   ADMIN ACCESS CHECK
========================================================= */

async function checkAdminAccess() {

    console.log(
        "Checking admin session..."
    );

    try {

        /* =================================================
           GET CURRENT SESSION
        ================================================= */

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {

            console.error(
                "Session error:",
                error
            );

            window.location.replace(
                "login.html"
            );

            return;
        }

        const session =
            data?.session;

        /* =================================================
           NO SESSION
        ================================================= */

        if (!session) {

            console.warn(
                "❌ No active Supabase session."
            );

            window.location.replace(
                "login.html"
            );

            return;
        }

        console.log(
            "✅ SESSION EXISTS"
        );

        const user =
            session.user;

        console.log(
            "AUTH USER:",
            user
        );

        /* =================================================
           GET PROFILE
        ================================================= */

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("*")
            .eq(
                "id",
                user.id
            )
            .maybeSingle();

        /* =================================================
           PROFILE ERROR
        ================================================= */

        if (profileError) {

            console.error(
                "❌ PROFILE ERROR:",
                profileError
            );

            await supabase.auth.signOut();

            window.location.replace(
                "login.html"
            );

            return;
        }

        /* =================================================
           PROFILE NOT FOUND
        ================================================= */

        if (!profile) {

            console.error(
                "❌ PROFILE NOT FOUND"
            );

            await supabase.auth.signOut();

            window.location.replace(
                "login.html"
            );

            return;
        }

        console.log(
            "ADMIN PROFILE:",
            profile
        );

        /* =================================================
           CHECK ROLE
        ================================================= */

        const role =
            normalize(
                profile.role
            );

        if (role !== "admin") {

            console.warn(
                "❌ This account is not an admin."
            );

            await supabase.auth.signOut();

            window.location.replace(
                "login.html"
            );

            return;
        }

        /* =================================================
           CHECK STATUS
        ================================================= */

        const status =
            normalize(
                profile.status
            );

        console.log(
            "ADMIN ROLE:",
            role
        );

        console.log(
            "ADMIN STATUS:",
            status
        );

        if (status !== "approved") {

            console.warn(
                "❌ Admin account is not approved."
            );

            await supabase.auth.signOut();

            window.location.replace(
                "login.html"
            );

            return;
        }

        /* =================================================
           ADMIN AUTHORIZED
        ================================================= */

        console.log(
            "================================="
        );

        console.log(
            "✅ ADMIN AUTHORIZED"
        );

        console.log(
            "================================="
        );

        /* =================================================
           SAVE ADMIN DATA
        ================================================= */

        const adminName =
            profile.name ||
            profile.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";

        const adminEmail =
            profile.email ||
            user.email ||
            "";

        localStorage.setItem(
            "userId",
            user.id
        );

        localStorage.setItem(
            "userName",
            adminName
        );

        localStorage.setItem(
            "userEmail",
            adminEmail
        );

        localStorage.setItem(
            "userRole",
            "admin"
        );

        localStorage.setItem(
            "adminUserId",
            user.id
        );

        localStorage.setItem(
            "adminName",
            adminName
        );

        localStorage.setItem(
            "adminEmail",
            adminEmail
        );

        /* =================================================
           SHOW ADMIN PAGE
        ================================================= */

        document.body.classList.add(
            "admin-authorized"
        );

        /* =================================================
           LOAD DASHBOARD
        ================================================= */

        await loadAdminDashboard();

        /* =================================================
           INITIAL NOTIFICATION REFRESH
        ================================================= */

        notifyAdminNotifications();

    } catch (error) {

        console.error(
            "❌ ADMIN AUTHENTICATION ERROR:",
            error
        );

        try {

            await supabase.auth.signOut();

        } catch (signOutError) {

            console.error(
                "Sign out error:",
                signOutError
            );

        }

        window.location.replace(
            "login.html"
        );
    }
}

/* =========================================================
   LOAD ADMIN DASHBOARD
========================================================= */

async function loadAdminDashboard() {

    console.log(
        "================================="
    );

    console.log(
        "LOADING ADMIN DASHBOARD"
    );

    console.log(
        "================================="
    );

    try {

        const results =
            await Promise.allSettled([

                loadProductsCount(),

                loadOrdersData(),

                loadCustomerRequests(),

                loadAdminRegistrations()

            ]);

        results.forEach(
            (result, index) => {

                if (
                    result.status === "rejected"
                ) {

                    console.error(
                        `Dashboard section ${index + 1} failed:`,
                        result.reason
                    );
                }
            }
        );

        console.log(
            "================================="
        );

        console.log(
            "✅ ADMIN DASHBOARD LOADED"
        );

        console.log(
            "================================="
        );

        /* =================================================
           REFRESH NAV NOTIFICATIONS
        ================================================= */

        notifyAdminNotifications();

    } catch (error) {

        console.error(
            "❌ DASHBOARD LOAD ERROR:",
            error
        );
    }
}

/* =========================================================
   LOAD PRODUCTS COUNT
========================================================= */

async function loadProductsCount() {

    console.log(
        "Loading products..."
    );

    const {
        count,
        error
    } = await supabase
        .from("products")
        .select(
            "id",
            {
                count: "exact",
                head: true
            }
        );

    if (error) {

        console.error(
            "❌ Products query error:",
            error
        );

        setDashboardValue(
            "totalProducts",
            "0"
        );

        return;
    }

    const total =
        Number(count || 0);

    setDashboardValue(
        "totalProducts",
        total.toLocaleString()
    );

    console.log(
        "✅ Total Products:",
        total
    );

    /* =================================================
       NOTIFICATION REFRESH
    ================================================= */

    window.dispatchEvent(
        new CustomEvent(
            "admin-product-updated"
        )
    );
}

/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrdersData() {

    console.log(
        "Loading orders..."
    );

    const {
        data: orders,
        error
    } = await supabase
        .from("orders")
        .select("*");

    if (error) {

        console.error(
            "❌ Orders query error:",
            error
        );

        setDashboardValue(
            "totalOrders",
            "0"
        );

        setDashboardValue(
            "pendingPayments",
            "0"
        );

        setDashboardValue(
            "totalSales",
            formatCurrency(0)
        );

        return;
    }

    const orderList =
        Array.isArray(orders)
            ? orders
            : [];

    /* =================================================
       TOTAL ORDERS
    ================================================= */

    const totalOrders =
        orderList.length;

    setDashboardValue(
        "totalOrders",
        totalOrders.toLocaleString()
    );

    /* =================================================
       PENDING PAYMENTS
    ================================================= */

    const pendingPayments =
        orderList.filter(
            order => {

                const paymentStatus =
                    normalize(
                        order.payment_status
                    );

                const orderStatus =
                    normalize(
                        order.status
                    );

                return (

                    paymentStatus === "pending" ||

                    paymentStatus === "unpaid" ||

                    paymentStatus === "awaiting payment" ||

                    paymentStatus === "awaiting_payment" ||

                    orderStatus === "pending payment" ||

                    orderStatus === "pending_payment"

                );
            }
        ).length;

    setDashboardValue(
        "pendingPayments",
        pendingPayments.toLocaleString()
    );

    /* =================================================
       TOTAL SALES
    ================================================= */

    const totalSales =
        orderList.reduce(
            (sum, order) => {

                const paymentStatus =
                    normalize(
                        order.payment_status
                    );

                const orderStatus =
                    normalize(
                        order.status
                    );

                const isPaid =

                    paymentStatus === "paid" ||

                    paymentStatus === "completed" ||

                    paymentStatus === "success" ||

                    paymentStatus === "successful";

                const completedOrder =

                    orderStatus === "completed" ||

                    orderStatus === "delivered";

                if (
                    !isPaid &&
                    !completedOrder
                ) {

                    return sum;
                }

                return (
                    sum +
                    toNumber(
                        order.total
                    )
                );

            },
            0
        );

    setDashboardValue(
        "totalSales",
        formatCurrency(
            totalSales
        )
    );

    console.log(
        "✅ Total Orders:",
        totalOrders
    );

    console.log(
        "✅ Pending Payments:",
        pendingPayments
    );

    console.log(
        "✅ Total Sales:",
        totalSales
    );

    /* =================================================
       RECENT ORDERS
    ================================================= */

    renderRecentOrders(
        orderList
    );

    /* =================================================
       PAYMENT ACTIVITY
    ================================================= */

    renderPaymentActivity(
        orderList
    );

    /* =================================================
       NOTIFICATION REFRESH
    ================================================= */

    window.dispatchEvent(
        new CustomEvent(
            "admin-order-updated"
        )
    );
}

/* =========================================================
   LOAD CUSTOMER REQUESTS
========================================================= */

async function loadCustomerRequests() {

    console.log(
        "Loading customer requests..."
    );

    const {
        count,
        error
    } = await supabase
        .from("requests")
        .select(
            "id",
            {
                count: "exact",
                head: true
            }
        );

    if (error) {

        console.error(
            "❌ Requests query error:",
            error
        );

        setDashboardValue(
            "customerRequests",
            "0"
        );

        return;
    }

    const total =
        Number(count || 0);

    setDashboardValue(
        "customerRequests",
        total.toLocaleString()
    );

    console.log(
        "✅ Customer Requests:",
        total
    );

    /* =================================================
       NOTIFICATION REFRESH
    ================================================= */

    window.dispatchEvent(
        new CustomEvent(
            "admin-request-updated"
        )
    );
}

/* =========================================================
   LOAD ADMIN REGISTRATIONS
========================================================= */

async function loadAdminRegistrations() {

    console.log(
        "Loading admin registrations..."
    );

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .eq(
            "role",
            "admin"
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "❌ Admin registration query error:",
            error
        );

        renderAdminRegistrations(
            []
        );

        return;
    }

    const admins =
        Array.isArray(data)
            ? data
            : [];

    const pendingAdmins =
        admins.filter(
            admin =>
                normalize(
                    admin.status
                ) === "pending"
        );

    renderAdminRegistrations(
        pendingAdmins
    );

    console.log(
        "✅ Pending Admin Registrations:",
        pendingAdmins.length
    );

    /* =================================================
       NOTIFICATION REFRESH
    ================================================= */

    window.dispatchEvent(
        new CustomEvent(
            "admin-registration-updated"
        )
    );
}

/* =========================================================
   SET DASHBOARD VALUE
========================================================= */

function setDashboardValue(
    id,
    value
) {

    const element =
        getElement(id);

    if (!element) {

        console.warn(
            `Dashboard element #${id} not found.`
        );

        return;
    }

    element.textContent =
        value;
}

/* =========================================================
   RECENT ORDERS
========================================================= */

function renderRecentOrders(
    orders
) {

    const container =
        getElement(
            "recentOrders"
        );

    if (!container) {
        return;
    }

    if (!orders.length) {

        container.innerHTML = `
            <div class="admin-empty">

                <div class="empty-icon">
                    ▤
                </div>

                <h3>
                    No Recent Orders
                </h3>

                <p>
                    New customer orders will appear here.
                </p>

            </div>
        `;

        return;
    }

    const sortedOrders =
        [...orders]
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.createdAt ||
                            0
                        ).getTime();

                    const dateB =
                        new Date(
                            b.created_at ||
                            b.createdAt ||
                            0
                        ).getTime();

                    return dateB - dateA;
                }
            )
            .slice(
                0,
                5
            );

    container.innerHTML = `
        <div class="dashboard-recent-orders">

            ${sortedOrders.map(
                order => {

                    const customerName =
                        order.customer_name ||
                        order.name ||
                        "Customer";

                    const orderId =
                        order.id
                            ? String(
                                order.id
                            ).slice(
                                0,
                                8
                            )
                            : "—";

                    const status =
                        order.status ||
                        "Pending";

                    const total =
                        formatCurrency(
                            order.total
                        );

                    const date =
                        formatDate(
                            order.created_at ||
                            order.createdAt
                        );

                    return `
                        <div class="dashboard-order-row">

                            <div class="dashboard-order-main">

                                <strong>
                                    ${escapeHTML(
                                        customerName
                                    )}
                                </strong>

                                <span>
                                    #${escapeHTML(
                                        orderId
                                    )}
                                </span>

                            </div>

                            <div class="dashboard-order-info">

                                <strong>
                                    ${escapeHTML(
                                        total
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        date
                                    )}
                                </span>

                            </div>

                            <div class="dashboard-order-status">

                                <span class="dashboard-status-badge">
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </div>

                        </div>
                    `;
                }
            ).join("")}

        </div>
    `;
}

/* =========================================================
   PAYMENT ACTIVITY
========================================================= */

function renderPaymentActivity(
    orders
) {

    const container =
        getElement(
            "dashboardPayments"
        );

    if (!container) {
        return;
    }

    if (!orders.length) {

        container.innerHTML = [
            '<div class="admin-empty">',
            '<div class="empty-icon">₱</div>',
            '<h3>No Payment Activity</h3>',
            '<p>Payment activity will appear here.</p>',
            '</div>'
        ].join("");

        return;
    }

    const sortedOrders =
        [...orders]
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.createdAt ||
                            0
                        ).getTime();

                    const dateB =
                        new Date(
                            b.created_at ||
                            b.createdAt ||
                            0
                        ).getTime();

                    return dateB - dateA;
                }
            )
            .slice(
                0,
                5
            );

    container.innerHTML = `
        <div class="dashboard-payment-list">

            ${sortedOrders.map(
                order => {

                    const customerName =
                        order.customer_name ||
                        order.name ||
                        "Customer";

                    const paymentStatus =
                        order.payment_status ||
                        "Pending";

                    const total =
                        formatCurrency(
                            order.total
                        );

                    const date =
                        formatDate(
                            order.created_at ||
                            order.createdAt
                        );

                    const statusClass =
                        normalize(
                            paymentStatus
                        ).replace(
                            /\s+/g,
                            "-"
                        );

                    return `
                        <div class="dashboard-payment-row">

                            <div class="dashboard-payment-icon">
                                ₱
                            </div>

                            <div class="dashboard-payment-content">

                                <strong>
                                    ${escapeHTML(
                                        customerName
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        date
                                    )}
                                </span>

                            </div>

                            <div class="dashboard-payment-right">

                                <strong>
                                    ${escapeHTML(
                                        total
                                    )}
                                </strong>

                                <span
                                    class="dashboard-payment-status ${escapeHTML(
                                        statusClass
                                    )}"
                                >
                                    ${escapeHTML(
                                        paymentStatus
                                    )}
                                </span>

                            </div>

                        </div>
                    `;
                }
            ).join("")}

        </div>
    `;
}

/* =========================================================
   ADMIN REGISTRATION PREVIEW
========================================================= */

function renderAdminRegistrations(
    admins
) {

    const container =
        getElement(
            "adminRegistrationList"
        );

    if (!container) {
        return;
    }

    if (!admins.length) {

        container.innerHTML = `
            <div class="admin-empty">

                <div class="empty-icon">
                    👤
                </div>

                <h3>
                    No Pending Registrations
                </h3>

                <p>
                    New admin registration requests will appear here.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="dashboard-admin-list">

            ${admins.slice(0, 5).map(
                admin => {

                    const name =
                        admin.name ||
                        admin.full_name ||
                        "New Administrator";

                    const email =
                        admin.email ||
                        "No email";

                    const date =
                        formatDate(
                            admin.created_at
                        );

                    return `
                        <div class="dashboard-admin-row">

                            <div class="dashboard-admin-avatar">
                                ${escapeHTML(
                                    name
                                        .charAt(0)
                                        .toUpperCase()
                                )}
                            </div>

                            <div class="dashboard-admin-info">

                                <strong>
                                    ${escapeHTML(
                                        name
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        email
                                    )}
                                </span>

                            </div>

                            <div class="dashboard-admin-date">
                                ${escapeHTML(
                                    date
                                )}
                            </div>

                        </div>
                    `;
                }
            ).join("")}

        </div>
    `;
}

/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
    getElement(
        "logoutBtn"
    );

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            console.log(
                "Logging out..."
            );

            logoutBtn.disabled =
                true;

            const originalText =
                logoutBtn.innerHTML;

            logoutBtn.innerHTML = `
                <span class="sidebar-icon">
                    ⇥
                </span>

                <span>
                    Logging out...
                </span>
            `;

            try {

                const {
                    error
                } =
                    await supabase.auth.signOut();

                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    logoutBtn.disabled =
                        false;

                    logoutBtn.innerHTML =
                        originalText;

                    alert(
                        "Logout failed. Please try again."
                    );

                    return;
                }

                /* =========================================
                   CLEAR LOCAL DATA
                ========================================= */

                localStorage.removeItem(
                    "userId"
                );

                localStorage.removeItem(
                    "userName"
                );

                localStorage.removeItem(
                    "userEmail"
                );

                localStorage.removeItem(
                    "userPhone"
                );

                localStorage.removeItem(
                    "userRole"
                );

                localStorage.removeItem(
                    "adminUserId"
                );

                localStorage.removeItem(
                    "adminName"
                );

                localStorage.removeItem(
                    "adminEmail"
                );

                /* =========================================
                   REDIRECT
                ========================================= */

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                window.location.replace(
                    "login.html"
                );
            }
        }
    );
}

/* =========================================================
   START ADMIN ACCESS CHECK
========================================================= */

checkAdminAccess();

