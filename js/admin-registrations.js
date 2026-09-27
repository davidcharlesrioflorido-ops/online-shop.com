import { supabase } from "./supabase.js";


/* =========================================================
   ELEMENTS
========================================================= */

const registrationsList =
    document.getElementById("registrationsList");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const visibleRegistrationCount =
    document.getElementById(
        "visibleRegistrationCount"
    );

const totalRegistrations =
    document.getElementById(
        "totalRegistrations"
    );

const pendingRegistrations =
    document.getElementById(
        "pendingRegistrations"
    );

const approvedRegistrations =
    document.getElementById(
        "approvedRegistrations"
    );

const rejectedRegistrations =
    document.getElementById(
        "rejectedRegistrations"
    );

const adminResult =
    document.getElementById("adminResult");

const refreshBtn =
    document.getElementById("refreshBtn");

const registrationModal =
    document.getElementById(
        "registrationModal"
    );

const closeModalBtn =
    document.getElementById(
        "closeModalBtn"
    );

const approveBtn =
    document.getElementById("approveBtn");

const rejectBtn =
    document.getElementById("rejectBtn");


/* =========================================================
   STATE
========================================================= */

let registrations = [];

let selectedRegistration = null;

let currentFilter = "all";

let isUpdating = false;


/* =========================================================
   RESULT MESSAGE
========================================================= */

function showResult(
    message,
    type = "success"
) {

    if (!adminResult) return;

    adminResult.textContent = message;

    adminResult.className =
        `admin-result ${type}`;

    window.clearTimeout(
        showResult.timeout
    );

    showResult.timeout =
        window.setTimeout(() => {

            if (!adminResult) return;

            adminResult.textContent = "";

            adminResult.className =
                "admin-result";

        }, 4000);

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();

    if (
        value === "approved" ||
        value === "rejected" ||
        value === "pending"
    ) {

        return value;

    }

    /*
     * Existing admin profiles without a status
     * are treated as approved.
     *
     * This prevents old admin accounts from
     * appearing as pending accidentally.
     */

    return "approved";

}


/* =========================================================
   CHECK ADMIN SESSION
========================================================= */

async function hasAdminSession() {

    const {
        data: sessionData,
        error: sessionError
    } = await supabase.auth.getSession();


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
    } = await supabase
        .from("profiles")
        .select(`
            id,
            role,
            status
        `)
        .eq("id", user.id)
        .maybeSingle();


    if (profileError) {

        console.error(
            "ADMIN SESSION PROFILE ERROR:",
            profileError
        );

        return false;

    }


    if (!profile) {

        return false;

    }


    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();


    const status =
        String(profile.status || "")
            .trim()
            .toLowerCase();


    return (
        role === "admin" &&
        status === "approved"
    );

}


/* =========================================================
   LOAD REGISTRATIONS
========================================================= */

async function loadRegistrations() {

    if (refreshBtn) {

        refreshBtn.disabled = true;

        refreshBtn.classList.add(
            "loading"
        );

    }


    try {

        const authorized =
            await hasAdminSession();


        if (!authorized) {

            window.location.replace(
                "./login.html"
            );

            return;

        }


        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select(`
                id,
                name,
                email,
                role,
                status,
                created_at,
                updated_at
            `)
            .eq("role", "admin")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "LOAD ADMIN REGISTRATIONS ERROR:",
                error
            );

            showResult(
                "Unable to load registrations. Check your Supabase permissions.",
                "error"
            );

            return;

        }


        registrations =
            Array.isArray(data)
                ? data
                : [];


        updateStats();

        renderRegistrations();


        /*
         * Update notification badge
         */

        updateNotificationBadge();


    } catch (error) {

        console.error(
            "LOAD REGISTRATIONS ERROR:",
            error
        );

        showResult(
            "Something went wrong while loading registrations.",
            "error"
        );

    } finally {

        if (refreshBtn) {

            refreshBtn.disabled = false;

            refreshBtn.classList.remove(
                "loading"
            );

        }

    }

}


/* =========================================================
   UPDATE STATS
========================================================= */

function updateStats() {

    const total =
        registrations.length;


    const pending =
        registrations.filter(
            item =>
                normalizeStatus(
                    item.status
                ) === "pending"
        ).length;


    const approved =
        registrations.filter(
            item =>
                normalizeStatus(
                    item.status
                ) === "approved"
        ).length;


    const rejected =
        registrations.filter(
            item =>
                normalizeStatus(
                    item.status
                ) === "rejected"
        ).length;


    if (totalRegistrations) {

        totalRegistrations.textContent =
            total;

    }


    if (pendingRegistrations) {

        pendingRegistrations.textContent =
            pending;

    }


    if (approvedRegistrations) {

        approvedRegistrations.textContent =
            approved;

    }


    if (rejectedRegistrations) {

        rejectedRegistrations.textContent =
            rejected;

    }

}


/* =========================================================
   UPDATE NAV NOTIFICATION
========================================================= */

function updateNotificationBadge() {

    const pendingCount =
        registrations.filter(
            item =>
                normalizeStatus(
                    item.status
                ) === "pending"
        ).length;


    /*
     * Support both possible selectors.
     */

    const badges =
        document.querySelectorAll(
            "[data-admin-registration-count], #adminRegistrationBadge"
        );


    badges.forEach(badge => {

        if (pendingCount > 0) {

            badge.textContent =
                pendingCount;

            badge.hidden = false;

            badge.classList.add(
                "has-notifications"
            );

        } else {

            badge.textContent = "0";

            badge.hidden = true;

            badge.classList.remove(
                "has-notifications"
            );

        }

    });

}


/* =========================================================
   FILTER
========================================================= */

function getFilteredRegistrations() {

    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();


    return registrations.filter(
        registration => {

            const status =
                normalizeStatus(
                    registration.status
                );


            const matchesStatus =
                currentFilter === "all" ||
                status === currentFilter;


            const name =
                String(
                    registration.name || ""
                )
                    .toLowerCase();


            const email =
                String(
                    registration.email || ""
                )
                    .toLowerCase();


            const matchesSearch =
                !search ||
                name.includes(search) ||
                email.includes(search);


            return (
                matchesStatus &&
                matchesSearch
            );

        }
    );

}


/* =========================================================
   RENDER REGISTRATIONS
========================================================= */

function renderRegistrations() {

    if (!registrationsList) return;


    const filtered =
        getFilteredRegistrations();


    registrationsList.innerHTML =
        "";


    if (visibleRegistrationCount) {

        visibleRegistrationCount.textContent =
            filtered.length;

    }


    if (!filtered.length) {

        if (emptyState) {

            emptyState.hidden = false;

        }

        return;

    }


    if (emptyState) {

        emptyState.hidden = true;

    }


    filtered.forEach(
        registration => {

            registrationsList.appendChild(
                createRegistrationCard(
                    registration
                )
            );

        }
    );

}


/* =========================================================
   CREATE REGISTRATION CARD
========================================================= */

function createRegistrationCard(
    registration
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "registration-card";


    const name =
        registration.name ||
        "Unnamed Admin";


    const email =
        registration.email ||
        "No email";


    const status =
        normalizeStatus(
            registration.status
        );


    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "A";


    const date =
        formatDate(
            registration.created_at
        );


    card.innerHTML = `

        <div class="registration-card-main">

            <div class="registration-avatar">
                ${escapeHtml(initial)}
            </div>


            <div class="registration-info">

                <div class="registration-name-row">

                    <h3>
                        ${escapeHtml(name)}
                    </h3>

                    <span class="
                        registration-status
                        status-${escapeHtml(status)}
                    ">
                        ${escapeHtml(
                            capitalize(status)
                        )}
                    </span>

                </div>


                <p class="registration-email">
                    ${escapeHtml(email)}
                </p>


                <span class="registration-date">
                    Registered ${escapeHtml(date)}
                </span>

            </div>

        </div>


        <div class="registration-card-actions">

            <button
                type="button"
                class="view-registration-btn"
                data-view-id="${escapeHtml(
                    registration.id
                )}"
            >
                View
            </button>


            ${
                status === "pending"
                    ? `

                        <button
                            type="button"
                            class="approve-small-btn"
                            data-approve-id="${escapeHtml(
                                registration.id
                            )}"
                        >
                            ✓ Approve
                        </button>


                        <button
                            type="button"
                            class="reject-small-btn"
                            data-reject-id="${escapeHtml(
                                registration.id
                            )}"
                        >
                            × Reject
                        </button>

                    `
                    : ""
            }

        </div>

    `;


    return card;

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openModal(registration) {

    if (!registrationModal) return;


    selectedRegistration =
        registration;


    const name =
        registration.name ||
        "Unnamed Admin";


    const email =
        registration.email ||
        "No email";


    const status =
        normalizeStatus(
            registration.status
        );


    const modalName =
        document.getElementById(
            "modalName"
        );


    const modalEmail =
        document.getElementById(
            "modalEmail"
        );


    const modalNameDetail =
        document.getElementById(
            "modalNameDetail"
        );


    const modalEmailDetail =
        document.getElementById(
            "modalEmailDetail"
        );


    const modalDate =
        document.getElementById(
            "modalDate"
        );


    const modalStatus =
        document.getElementById(
            "modalStatus"
        );


    const modalAvatar =
        document.getElementById(
            "modalAvatar"
        );


    if (modalName) {

        modalName.textContent =
            name;

    }


    if (modalEmail) {

        modalEmail.textContent =
            email;

    }


    if (modalNameDetail) {

        modalNameDetail.textContent =
            name;

    }


    if (modalEmailDetail) {

        modalEmailDetail.textContent =
            email;

    }


    if (modalDate) {

        modalDate.textContent =
            formatDate(
                registration.created_at
            );

    }


    if (modalStatus) {

        modalStatus.textContent =
            capitalize(status);

        modalStatus.className =
            `modal-status status-${status}`;

    }


    if (modalAvatar) {

        modalAvatar.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase() ||
            "A";

    }


    const isPending =
        status === "pending";


    if (approveBtn) {

        approveBtn.hidden =
            !isPending;

    }


    if (rejectBtn) {

        rejectBtn.hidden =
            !isPending;

    }


    registrationModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!registrationModal) return;


    registrationModal.hidden =
        true;


    document.body.classList.remove(
        "modal-open"
    );


    selectedRegistration =
        null;

}


/* =========================================================
   UPDATE REGISTRATION STATUS
========================================================= */

async function updateRegistrationStatus(
    newStatus,
    registrationOverride = null
) {

    if (isUpdating) return;


    const registration =
        registrationOverride ||
        selectedRegistration;


    if (!registration) return;


    if (
        newStatus !== "approved" &&
        newStatus !== "rejected"
    ) {

        return;

    }


    const id =
        registration.id;


    const name =
        registration.name ||
        "this administrator";


    const oldStatus =
        normalizeStatus(
            registration.status
        );


    /*
     * Only pending accounts can be
     * approved or rejected.
     */

    if (oldStatus !== "pending") {

        showResult(
            "This registration has already been processed.",
            "error"
        );

        await loadRegistrations();

        return;

    }


    const confirmText =
        newStatus === "approved"
            ? `Approve ${name}'s administrator account?`
            : `Reject ${name}'s administrator account?`;


    if (!confirm(confirmText)) {

        return;

    }


    isUpdating = true;


    setActionButtonsDisabled(
        true
    );


    try {

        const authorized =
            await hasAdminSession();


        if (!authorized) {

            window.location.replace(
                "./login.html"
            );

            return;

        }


        /*
         * Update only the selected admin.
         */

        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .update({
                status: newStatus,
                updated_at:
                    new Date().toISOString()
            })
            .eq("id", id)
            .eq("role", "admin")
            .eq("status", "pending")
            .select(`
                id,
                name,
                email,
                role,
                status,
                created_at,
                updated_at
            `)
            .maybeSingle();


        if (error) {

            console.error(
                "UPDATE ADMIN STATUS ERROR:",
                error
            );

            showResult(
                "Unable to update the account status. Check your Supabase RLS policy.",
                "error"
            );

            return;

        }


        if (!data) {

            showResult(
                "The registration was not updated. It may have already been processed.",
                "error"
            );

            await loadRegistrations();

            return;

        }


        /*
         * Update local item immediately.
         */

        const index =
            registrations.findIndex(
                item =>
                    item.id === id
            );


        if (index !== -1) {

            registrations[index] = {
                ...registrations[index],
                ...data
            };

        }


        updateStats();

        renderRegistrations();

        updateNotificationBadge();


        if (newStatus === "approved") {

            showResult(
                `${name}'s administrator account was approved successfully.`,
                "success"
            );

        } else {

            showResult(
                `${name}'s administrator registration was rejected.`,
                "success"
            );

        }


        closeModal();


        /*
         * Tell notification script
         * that the pending count changed.
         */

        window.dispatchEvent(
            new CustomEvent(
                "admin-registration-updated"
            )
        );


    } catch (error) {

        console.error(
            "UPDATE STATUS ERROR:",
            error
        );

        showResult(
            "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        isUpdating = false;

        setActionButtonsDisabled(
            false
        );

    }

}


/* =========================================================
   BUTTON DISABLE
========================================================= */

function setActionButtonsDisabled(
    disabled
) {

    if (approveBtn) {

        approveBtn.disabled =
            disabled;

    }


    if (rejectBtn) {

        rejectBtn.disabled =
            disabled;

    }


    document
        .querySelectorAll(
            ".approve-small-btn, .reject-small-btn"
        )
        .forEach(button => {

            button.disabled =
                disabled;

        });

}


/* =========================================================
   SEARCH
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderRegistrations
    );

}


/* =========================================================
   STATUS SELECT
========================================================= */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        () => {

            currentFilter =
                statusFilter.value ||
                "all";


            updateStatActiveState();

            renderRegistrations();

        }
    );

}


/* =========================================================
   STAT FILTERS
========================================================= */

document
    .querySelectorAll(
        ".registration-stat"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentFilter =
                    button.dataset.filter ||
                    "all";


                if (statusFilter) {

                    statusFilter.value =
                        currentFilter;

                }


                updateStatActiveState();


                renderRegistrations();

            }
        );

    });


/* =========================================================
   ACTIVE STAT
========================================================= */

function updateStatActiveState() {

    document
        .querySelectorAll(
            ".registration-stat"
        )
        .forEach(button => {

            const filter =
                button.dataset.filter ||
                "all";


            button.classList.toggle(
                "active",
                filter === currentFilter
            );

        });

}


/* =========================================================
   REFRESH
========================================================= */

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        loadRegistrations
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

if (closeModalBtn) {

    closeModalBtn.addEventListener(
        "click",
        closeModal
    );

}


/* =========================================================
   MODAL BACKDROP
========================================================= */

if (registrationModal) {

    const backdrop =
        registrationModal.querySelector(
            ".registration-modal-backdrop"
        );


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeModal
        );

    }

}


/* =========================================================
   APPROVE MODAL BUTTON
========================================================= */

if (approveBtn) {

    approveBtn.addEventListener(
        "click",
        () => {

            updateRegistrationStatus(
                "approved"
            );

        }
    );

}


/* =========================================================
   REJECT MODAL BUTTON
========================================================= */

if (rejectBtn) {

    rejectBtn.addEventListener(
        "click",
        () => {

            updateRegistrationStatus(
                "rejected"
            );

        }
    );

}


/* =========================================================
   CARD EVENTS
========================================================= */

if (registrationsList) {

    registrationsList.addEventListener(
        "click",
        event => {

            const viewButton =
                event.target.closest(
                    "[data-view-id]"
                );


            const approveButton =
                event.target.closest(
                    "[data-approve-id]"
                );


            const rejectButton =
                event.target.closest(
                    "[data-reject-id]"
                );


            /* =============================================
               VIEW
            ============================================== */

            if (viewButton) {

                const item =
                    registrations.find(
                        registration =>
                            registration.id ===
                            viewButton.dataset.viewId
                    );


                if (item) {

                    openModal(item);

                }


                return;

            }


            /* =============================================
               APPROVE
            ============================================== */

            if (approveButton) {

                const item =
                    registrations.find(
                        registration =>
                            registration.id ===
                            approveButton.dataset.approveId
                    );


                if (item) {

                    updateRegistrationStatus(
                        "approved",
                        item
                    );

                }


                return;

            }


            /* =============================================
               REJECT
            ============================================== */

            if (rejectButton) {

                const item =
                    registrations.find(
                        registration =>
                            registration.id ===
                            rejectButton.dataset.rejectId
                    );


                if (item) {

                    updateRegistrationStatus(
                        "rejected",
                        item
                    );

                }


                return;

            }

        }
    );

}


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            registrationModal &&
            !registrationModal.hidden
        ) {

            closeModal();

        }

    }
);


/* =========================================================
   HELPERS
========================================================= */

function capitalize(value) {

    if (!value) return "";

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


/* =========================================================
   FORMAT DATE
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
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   LISTEN FOR REGISTRATION UPDATES
========================================================= */

window.addEventListener(
    "admin-registration-updated",
    () => {

        updateNotificationBadge();

    }
);


/* =========================================================
   START
========================================================= */

loadRegistrations();