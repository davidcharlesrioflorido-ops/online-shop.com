import {
    supabase
} from "./supabase.js";


/* =====================================================
   ELEMENTS
===================================================== */

const requestsList =
    document.getElementById("requestsList");

const emptyState =
    document.getElementById("emptyState");

const refreshBtn =
    document.getElementById("refreshBtn");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const visibleRequestCount =
    document.getElementById("visibleRequestCount");

const adminResult =
    document.getElementById("adminResult");


/* =====================================================
   STATISTICS
===================================================== */

const totalRequests =
    document.getElementById("totalRequests");

const newRequests =
    document.getElementById("newRequests");

const progressRequests =
    document.getElementById("progressRequests");

const resolvedRequests =
    document.getElementById("resolvedRequests");

const rejectedRequests =
    document.getElementById("rejectedRequests");


/* =====================================================
   MODAL ELEMENTS
===================================================== */

const requestModal =
    document.getElementById("requestModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const closeModalBtnBottom =
    document.getElementById("closeModalBtnBottom");

const modalName =
    document.getElementById("modalName");

const modalEmail =
    document.getElementById("modalEmail");

const modalRequestType =
    document.getElementById("modalRequestType");

const modalOrderId =
    document.getElementById("modalOrderId");

const modalDate =
    document.getElementById("modalDate");

const modalStatus =
    document.getElementById("modalStatus");

const modalMessage =
    document.getElementById("modalMessage");

const modalStatusSelect =
    document.getElementById("modalStatusSelect");

const modalAdminReply =
    document.getElementById("modalAdminReply");

const currentAdminReply =
    document.getElementById("currentAdminReply");

const currentAdminReplyText =
    document.getElementById("currentAdminReplyText");

const currentAdminReplyDate =
    document.getElementById("currentAdminReplyDate");

const updateStatusBtn =
    document.getElementById("updateStatusBtn");

const deleteRequestBtn =
    document.getElementById("deleteRequestBtn");


/* =====================================================
   MOBILE
===================================================== */

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const adminSidebar =
    document.getElementById("adminSidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const logoutBtn =
    document.getElementById("logoutBtn");


/* =====================================================
   DATA
===================================================== */

let allRequests = [];

let currentRequest = null;

let requestsChannel = null;

let adminUser = null;


/* =====================================================
   STATUS NORMALIZER
===================================================== */

function normalizeStatus(status) {

    const value =
        String(status ?? "")
            .trim()
            .toLowerCase();


    if (
        value === "" ||
        value === "pending" ||
        value === "new"
    ) {

        return "New";

    }


    if (
        value === "in progress" ||
        value === "in_progress" ||
        value === "in-progress" ||
        value === "reviewing"
    ) {

        return "In Progress";

    }


    if (
        value === "resolved" ||
        value === "completed" ||
        value === "approved"
    ) {

        return "Resolved";

    }


    if (
        value === "rejected" ||
        value === "declined"
    ) {

        return "Rejected";

    }


    return "New";
}


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(status) {

    const normalized =
        normalizeStatus(status);


    switch (normalized) {

        case "New":
            return "status-new";

        case "In Progress":
            return "status-progress";

        case "Resolved":
            return "status-resolved";

        case "Rejected":
            return "status-rejected";

        default:
            return "status-new";

    }
}


/* =====================================================
   DATE FORMAT
===================================================== */

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

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


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   RESULT MESSAGE
===================================================== */

function showAdminResult(
    message,
    type = "normal"
) {

    if (!adminResult) {
        return;
    }


    adminResult.textContent =
        message;


    adminResult.classList.remove(
        "success",
        "error"
    );


    if (type === "success") {

        adminResult.classList.add(
            "success"
        );

    }


    if (type === "error") {

        adminResult.classList.add(
            "error"
        );

    }

}


/* =====================================================
   ADMIN AUTHENTICATION
===================================================== */

async function checkAdminAccess() {

    console.log(
        "================================="
    );

    console.log(
        "ADMIN REQUESTS AUTH CHECK"
    );

    console.log(
        "================================="
    );


    try {

        /* ---------------------------------------------
           GET SESSION
        --------------------------------------------- */

        const {
            data: sessionData,
            error: sessionError
        } = await supabase.auth.getSession();


        if (sessionError) {

            console.error(
                "SESSION ERROR:",
                sessionError
            );

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        const session =
            sessionData?.session;


        if (!session) {

            console.warn(
                "NO ADMIN SESSION"
            );

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        const user =
            session.user;


        console.log(
            "SESSION USER:",
            user
        );


        /* ---------------------------------------------
           GET PROFILE
        --------------------------------------------- */

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                id,
                name,
                email,
                role,
                status
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


        if (profileError) {

            console.error(
                "PROFILE ERROR:",
                profileError
            );

            await supabase.auth.signOut();

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        if (!profile) {

            console.error(
                "PROFILE NOT FOUND"
            );

            await supabase.auth.signOut();

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        console.log(
            "ADMIN PROFILE:",
            profile
        );


        /* ---------------------------------------------
           ROLE
        --------------------------------------------- */

        const role =
            String(
                profile.role || ""
            )
            .trim()
            .toLowerCase();


        if (role !== "admin") {

            console.warn(
                "USER IS NOT ADMIN"
            );

            await supabase.auth.signOut();

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        /* ---------------------------------------------
           STATUS
        --------------------------------------------- */

        const status =
            String(
                profile.status || ""
            )
            .trim()
            .toLowerCase();


        if (status !== "approved") {

            console.warn(
                "ADMIN NOT APPROVED:",
                status
            );

            await supabase.auth.signOut();

            window.location.replace(
                "./login.html"
            );

            return false;
        }


        /* ---------------------------------------------
           SAVE ADMIN
        --------------------------------------------- */

        adminUser = {
            ...user,
            profile
        };


        document.body.classList.add(
            "admin-authorized"
        );


        console.log(
            "ADMIN AUTHORIZED"
        );


        return true;


    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );


        try {

            await supabase.auth.signOut();

        } catch (signOutError) {

            console.error(
                "SIGN OUT ERROR:",
                signOutError
            );

        }


        window.location.replace(
            "./login.html"
        );


        return false;

    }

}


/* =====================================================
   LOAD REQUESTS
===================================================== */

async function loadRequests() {

    if (!requestsList) {
        return;
    }


    requestsList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading customer requests...</p>
        </div>
    `;


    try {

        const {
            data,
            error
        } = await supabase
            .from("requests")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "LOAD REQUESTS ERROR:",
                error
            );


            showAdminResult(
                error.message ||
                "Unable to load requests.",
                "error"
            );


            requestsList.innerHTML = "";


            if (emptyState) {

                emptyState.style.display =
                    "block";

            }


            return;
        }


        allRequests =
            (data || []).map(
                request => ({

                    ...request,

                    displayStatus:
                        normalizeStatus(
                            request.status
                        )

                })
            );


        console.log(
            "REQUESTS FROM DATABASE:",
            allRequests
        );


        updateStatistics();

        applyFilters();


    } catch (error) {

        console.error(
            "REQUEST LOAD SYSTEM ERROR:",
            error
        );


        showAdminResult(
            "Unable to load customer requests.",
            "error"
        );


        requestsList.innerHTML = "";


        if (emptyState) {

            emptyState.style.display =
                "block";

        }

    }

}


/* =====================================================
   UPDATE STATISTICS
===================================================== */

function updateStatistics() {

    const total =
        allRequests.length;


    const newCount =
        allRequests.filter(
            request =>
                request.displayStatus === "New"
        ).length;


    const progressCount =
        allRequests.filter(
            request =>
                request.displayStatus === "In Progress"
        ).length;


    const resolvedCount =
        allRequests.filter(
            request =>
                request.displayStatus === "Resolved"
        ).length;


    const rejectedCount =
        allRequests.filter(
            request =>
                request.displayStatus === "Rejected"
        ).length;


    if (totalRequests) {

        totalRequests.textContent =
            total;

    }


    if (newRequests) {

        newRequests.textContent =
            newCount;

    }


    if (progressRequests) {

        progressRequests.textContent =
            progressCount;

    }


    if (resolvedRequests) {

        resolvedRequests.textContent =
            resolvedCount;

    }


    if (rejectedRequests) {

        rejectedRequests.textContent =
            rejectedCount;

    }

}


/* =====================================================
   STAT CARDS
===================================================== */

function getStatCards() {

    return document.querySelectorAll(
        ".stat-card[data-filter]"
    );

}


function setActiveStatCard(
    filterValue
) {

    const statCards =
        getStatCards();


    statCards.forEach(
        card => {

            const cardFilter =
                card.dataset.filter ||
                "all";


            if (
                cardFilter ===
                filterValue
            ) {

                card.classList.add(
                    "active"
                );

            } else {

                card.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =====================================================
   APPLY FILTERS
===================================================== */

function applyFilters() {

    const search =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        statusFilter?.value ||
        "all";


    setActiveStatCard(
        selectedStatus
    );


    const filtered =
        allRequests.filter(
            request => {

                const searchableText = [

                    request.name,

                    request.email,

                    request.order_id,

                    request.request_type,

                    request.message,

                    request.admin_reply,

                    request.status

                ]
                .map(
                    value =>
                        String(
                            value ?? ""
                        ).toLowerCase()
                )
                .join(" ");


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesStatus =
                    selectedStatus === "all" ||
                    request.displayStatus ===
                    selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderRequests(
        filtered
    );

}


/* =====================================================
   SETUP STAT CARDS
===================================================== */

function setupStatCards() {

    const statCards =
        getStatCards();


    statCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const filterValue =
                        card.dataset.filter ||
                        "all";


                    if (statusFilter) {

                        statusFilter.value =
                            filterValue;

                    }


                    setActiveStatCard(
                        filterValue
                    );


                    applyFilters();


                    if (requestsList) {

                        setTimeout(
                            () => {

                                requestsList.scrollIntoView({
                                    behavior:
                                        "smooth",
                                    block:
                                        "start"
                                });

                            },
                            100
                        );

                    }

                }
            );


            card.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        card.click();

                    }

                }
            );

        }
    );

}


/* =====================================================
   RENDER REQUESTS
===================================================== */

function renderRequests(
    requests
) {

    if (visibleRequestCount) {

        visibleRequestCount.textContent =
            requests.length === 1
                ? "1 request"
                : `${requests.length} requests`;

    }


    if (!requestsList) {
        return;
    }


    requestsList.innerHTML = "";


    if (!requests.length) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;
    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    requests.forEach(
        request => {

            requestsList.appendChild(
                createRequestCard(
                    request
                )
            );

        }
    );

}


/* =====================================================
   CREATE REQUEST CARD
===================================================== */

function createRequestCard(
    request
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "request-card";


    const status =
        request.displayStatus ||
        normalizeStatus(
            request.status
        );


    const statusClass =
        getStatusClass(
            status
        );


    const initials =
        String(
            request.name ||
            "C"
        )
        .trim()
        .charAt(0)
        .toUpperCase();


    const hasReply =
        Boolean(
            String(
                request.admin_reply ||
                ""
            ).trim()
        );


    card.innerHTML = `

        <div class="request-card-header">

            <div class="request-customer">

                <div class="customer-avatar">
                    ${escapeHTML(initials)}
                </div>


                <div class="customer-info">

                    <strong>
                        ${escapeHTML(
                            request.name ||
                            "Unknown Customer"
                        )}
                    </strong>


                    <span class="customer-email">
                        ${escapeHTML(
                            request.email ||
                            "-"
                        )}
                    </span>

                </div>

            </div>


            <div class="request-meta">

                <span class="request-type">
                    ${escapeHTML(
                        request.request_type ||
                        "General"
                    )}
                </span>


                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(status)}
                </span>

            </div>

        </div>


        <div class="request-card-body">

            ${
                request.order_id
                    ? `
                        <div class="request-order">

                            Order ID:

                            <strong>
                                ${escapeHTML(
                                    request.order_id
                                )}
                            </strong>

                        </div>
                    `
                    : ""
            }


            <div class="request-message">

                ${escapeHTML(
                    request.message ||
                    "-"
                )}

            </div>


            ${
                hasReply
                    ? `
                        <div
                            style="
                                margin-top:14px;
                                padding:12px 14px;
                                border-radius:10px;
                                background:rgba(168,85,247,0.05);
                                border:1px solid rgba(168,85,247,0.12);
                            "
                        >

                            <div
                                style="
                                    color:#a855f7;
                                    font-size:10px;
                                    font-weight:800;
                                    letter-spacing:.1em;
                                    text-transform:uppercase;
                                    margin-bottom:5px;
                                "
                            >
                                ADMIN REPLIED
                            </div>

                            <div
                                style="
                                    color:#cbd5e1;
                                    font-size:13px;
                                    line-height:1.5;
                                "
                            >
                                ${escapeHTML(
                                    request.admin_reply
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }

        </div>


        <div class="request-card-footer">

            <span class="request-date">

                ${escapeHTML(
                    formatDate(
                        request.created_at
                    )
                )}

            </span>


            <div class="request-actions">

                <button
                    type="button"
                    class="request-action-btn view-request-btn"
                >
                    View
                </button>


                <button
                    type="button"
                    class="request-action-btn quick-status-btn"
                >
                    ${
                        status === "New"
                            ? "Start"
                            : "Update"
                    }
                </button>


                <button
                    type="button"
                    class="request-action-btn delete-request-list-btn"
                >
                    Delete
                </button>

            </div>

        </div>

    `;


    /* =================================================
       VIEW
    ================================================= */

    const viewBtn =
        card.querySelector(
            ".view-request-btn"
        );


    if (viewBtn) {

        viewBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                openRequestModal(
                    request
                );

            }
        );

    }


    /* =================================================
       QUICK STATUS
    ================================================= */

    const statusBtn =
        card.querySelector(
            ".quick-status-btn"
        );


    if (statusBtn) {

        statusBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                openRequestModal(
                    request
                );

            }
        );

    }


    /* =================================================
       DELETE
    ================================================= */

    const deleteBtn =
        card.querySelector(
            ".delete-request-list-btn"
        );


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deleteRequest(
                    request
                );

            }
        );

    }


    return card;

}


/* =====================================================
   OPEN REQUEST MODAL
===================================================== */

function openRequestModal(
    request
) {

    if (!request) {
        return;
    }


    currentRequest =
        request;


    const status =
        request.displayStatus ||
        normalizeStatus(
            request.status
        );


    if (modalName) {

        modalName.textContent =
            request.name ||
            "-";

    }


    if (modalEmail) {

        modalEmail.textContent =
            request.email ||
            "-";

    }


    if (modalRequestType) {

        modalRequestType.textContent =
            request.request_type ||
            "-";

    }


    if (modalOrderId) {

        modalOrderId.textContent =
            request.order_id ||
            "-";

    }


    if (modalDate) {

        modalDate.textContent =
            formatDate(
                request.created_at
            );

    }


    if (modalStatus) {

        modalStatus.textContent =
            status;


        modalStatus.className =
            `status-badge ${
                getStatusClass(status)
            }`;

    }


    if (modalMessage) {

        modalMessage.textContent =
            request.message ||
            "-";

    }


    if (modalStatusSelect) {

        modalStatusSelect.value =
            status;

    }


    /* =================================================
       ADMIN REPLY
    ================================================= */

    if (modalAdminReply) {

        modalAdminReply.value =
            request.admin_reply ||
            "";

    }


    if (
        currentAdminReply &&
        currentAdminReplyText
    ) {

        const reply =
            String(
                request.admin_reply ||
                ""
            ).trim();


        if (reply) {

            currentAdminReply.style.display =
                "block";


            currentAdminReplyText.textContent =
                reply;


            if (currentAdminReplyDate) {

                currentAdminReplyDate.textContent =
                    request.updated_at
                        ? `Last updated: ${formatDate(
                            request.updated_at
                        )}`
                        : "";

            }

        } else {

            currentAdminReply.style.display =
                "none";

        }

    }


    if (updateStatusBtn) {

        updateStatusBtn.disabled =
            false;

        updateStatusBtn.textContent =
            "Send Response";

    }


    if (requestModal) {

        requestModal.classList.add(
            "show"
        );

    }


    document.body.style.overflow =
        "hidden";

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeRequestModal() {

    if (requestModal) {

        requestModal.classList.remove(
            "show"
        );

    }


    document.body.style.overflow =
        "";


    currentRequest =
        null;

}


/* =====================================================
   CLOSE BUTTONS
===================================================== */

if (closeModalBtn) {

    closeModalBtn.addEventListener(
        "click",
        closeRequestModal
    );

}


if (closeModalBtnBottom) {

    closeModalBtnBottom.addEventListener(
        "click",
        closeRequestModal
    );

}


/* =====================================================
   CLICK OUTSIDE
===================================================== */

if (requestModal) {

    requestModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                requestModal
            ) {

                closeRequestModal();

            }

        }
    );

}


/* =====================================================
   ESC
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            requestModal?.classList.contains(
                "show"
            )
        ) {

            closeRequestModal();

        }

    }
);


/* =====================================================
   SEND ADMIN RESPONSE
===================================================== */

if (updateStatusBtn) {

    updateStatusBtn.addEventListener(
        "click",
        async () => {

            if (!currentRequest) {

                showAdminResult(
                    "No request selected.",
                    "error"
                );

                return;
            }


            const requestId =
                currentRequest.id;


            const newStatus =
                modalStatusSelect?.value ||
                "New";


            const adminReply =
                String(
                    modalAdminReply?.value ||
                    ""
                ).trim();


            /* -----------------------------------------
               REQUIRE RESPONSE
            ----------------------------------------- */

            if (!adminReply) {

                const confirmed =
                    window.confirm(
                        "No admin reply was entered. Continue with status update only?"
                    );


                if (!confirmed) {

                    if (modalAdminReply) {

                        modalAdminReply.focus();

                    }

                    return;
                }

            }


            updateStatusBtn.disabled =
                true;


            updateStatusBtn.textContent =
                "Sending...";


            try {

                console.log(
                    "UPDATING REQUEST:",
                    {
                        requestId,
                        newStatus,
                        adminReply
                    }
                );


                const {
                    data,
                    error
                } = await supabase
                    .from("requests")
                    .update({
                        status:
                            newStatus,

                        admin_reply:
                            adminReply ||
                            null,

                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        requestId
                    )
                    .select()
                    .single();


                if (error) {

                    console.error(
                        "SEND RESPONSE ERROR:",
                        error
                    );


                    showAdminResult(
                        error.message ||
                        "Unable to send response.",
                        "error"
                    );


                    return;
                }


                console.log(
                    "REQUEST UPDATED:",
                    data
                );


                showAdminResult(
                    "Customer request updated successfully.",
                    "success"
                );


                closeRequestModal();


                await loadRequests();


            } catch (error) {

                console.error(
                    "SEND RESPONSE SYSTEM ERROR:",
                    error
                );


                showAdminResult(
                    "Unable to send response.",
                    "error"
                );


            } finally {

                updateStatusBtn.disabled =
                    false;


                updateStatusBtn.textContent =
                    "Send Response";

            }

        }
    );

}


/* =====================================================
   DELETE FROM MODAL
===================================================== */

if (deleteRequestBtn) {

    deleteRequestBtn.addEventListener(
        "click",
        async () => {

            if (!currentRequest) {
                return;
            }


            await deleteRequest(
                currentRequest
            );

        }
    );

}


/* =====================================================
   DELETE REQUEST
===================================================== */

async function deleteRequest(
    request
) {

    if (!request) {
        return;
    }


    const confirmed =
        window.confirm(
            "Delete this customer request?\n\nThis action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await supabase
            .from("requests")
            .delete()
            .eq(
                "id",
                request.id
            );


        if (error) {

            console.error(
                "DELETE REQUEST ERROR:",
                error
            );


            showAdminResult(
                error.message ||
                "Unable to delete request.",
                "error"
            );


            return;
        }


        showAdminResult(
            "Customer request deleted.",
            "success"
        );


        if (
            currentRequest &&
            currentRequest.id ===
            request.id
        ) {

            closeRequestModal();

        }


        await loadRequests();


    } catch (error) {

        console.error(
            "DELETE REQUEST SYSTEM ERROR:",
            error
        );


        showAdminResult(
            "Unable to delete request.",
            "error"
        );

    }

}


/* =====================================================
   SEARCH
===================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        applyFilters
    );

}


/* =====================================================
   STATUS FILTER
===================================================== */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        () => {

            const selected =
                statusFilter.value ||
                "all";


            setActiveStatCard(
                selected
            );


            applyFilters();

        }
    );

}


/* =====================================================
   REFRESH
===================================================== */

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async () => {

            refreshBtn.disabled =
                true;


            const originalHTML =
                refreshBtn.innerHTML;


            refreshBtn.innerHTML =
                "<span>↻</span> Refreshing...";


            try {

                await loadRequests();

            } finally {

                refreshBtn.disabled =
                    false;


                refreshBtn.innerHTML =
                    originalHTML;

            }

        }
    );

}


/* =====================================================
   REALTIME
===================================================== */

function subscribeToRequests() {

    if (requestsChannel) {

        supabase.removeChannel(
            requestsChannel
        );

    }


    requestsChannel =
        supabase
            .channel(
                "admin-requests-realtime"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "requests"
                },
                async payload => {

                    console.log(
                        "REQUEST DATABASE CHANGE:",
                        payload
                    );


                    await loadRequests();

                }
            )
            .subscribe(
                status => {

                    console.log(
                        "REQUEST REALTIME STATUS:",
                        status
                    );

                }
            );

}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

function openSidebar() {

    adminSidebar?.classList.add(
        "open"
    );

    sidebarOverlay?.classList.add(
        "open"
    );

    mobileMenuBtn?.classList.add(
        "active"
    );

    mobileMenuBtn?.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add(
        "sidebar-open"
    );

}


function closeSidebar() {

    adminSidebar?.classList.remove(
        "open"
    );

    sidebarOverlay?.classList.remove(
        "open"
    );

    mobileMenuBtn?.classList.remove(
        "active"
    );

    mobileMenuBtn?.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove(
        "sidebar-open"
    );

}


if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        () => {

            if (
                adminSidebar?.classList.contains(
                    "open"
                )
            ) {

                closeSidebar();

            } else {

                openSidebar();

            }

        }
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );

}


if (adminSidebar) {

    adminSidebar
        .querySelectorAll("a")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );

            }
        );

}


/* =====================================================
   LOGOUT
===================================================== */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            logoutBtn.disabled =
                true;


            logoutBtn.innerHTML =
                "<span>↪</span> Logging out...";


            try {

                const {
                    error
                } = await supabase.auth.signOut();


                if (error) {

                    console.error(
                        "LOGOUT ERROR:",
                        error
                    );


                    logoutBtn.disabled =
                        false;


                    logoutBtn.innerHTML =
                        "<span>↪</span> Logout";


                    showAdminResult(
                        error.message ||
                        "Logout failed.",
                        "error"
                    );


                    return;
                }


                /* -----------------------------------------
                   CLEAR OLD LOCAL STORAGE
                ----------------------------------------- */

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

                localStorage.removeItem(
                    "adminAccessToken"
                );

                localStorage.removeItem(
                    "adminRefreshToken"
                );


                window.location.replace(
                    "./login.html"
                );


            } catch (error) {

                console.error(
                    "LOGOUT SYSTEM ERROR:",
                    error
                );


                window.location.replace(
                    "./login.html"
                );

            }

        }
    );

}


/* =====================================================
   INITIALIZE
===================================================== */

async function initialize() {

    console.log(
        "ADMIN REQUESTS SYSTEM STARTING..."
    );


    /* ---------------------------------------------
       SETUP STAT CARDS
    --------------------------------------------- */

    setupStatCards();


    /* ---------------------------------------------
       DEFAULT FILTER
    --------------------------------------------- */

    if (statusFilter) {

        statusFilter.value =
            "all";

    }


    setActiveStatCard(
        "all"
    );


    /* ---------------------------------------------
       ADMIN AUTH
    --------------------------------------------- */

    const authenticated =
        await checkAdminAccess();


    if (!authenticated) {
        return;
    }


    /* ---------------------------------------------
       LOAD REQUESTS
    --------------------------------------------- */

    await loadRequests();


    /* ---------------------------------------------
       REALTIME
    --------------------------------------------- */

    subscribeToRequests();


    console.log(
        "ADMIN REQUESTS SYSTEM READY"
    );

}


/* =====================================================
   START
===================================================== */

initialize();


/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    "beforeunload",
    () => {

        if (requestsChannel) {

            supabase.removeChannel(
                requestsChannel
            );

        }

    }
);