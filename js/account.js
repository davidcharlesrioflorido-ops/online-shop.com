import {
    getCurrentUser,
    logoutUser
} from "./auth.js";

import {
    supabase
} from "./supabase.js";


/* =====================================================
   ELEMENTS
===================================================== */

const logoutBtn =
    document.getElementById("logoutBtn");

const mobileLogoutBtn =
    document.getElementById("mobileLogoutBtn");

const settingsLogoutBtn =
    document.getElementById("settingsLogoutBtn");

const profileForm =
    document.getElementById("profileForm");

const saveProfileBtn =
    document.getElementById("saveProfileBtn");

const profileResult =
    document.getElementById("profileResult");

const resetPasswordBtn =
    document.getElementById("resetPasswordBtn");

const ordersContainer =
    document.getElementById("ordersContainer");


/* =====================================================
   RESULT MESSAGE
===================================================== */

function showProfileResult(message, type = "") {

    if (!profileResult) return;

    profileResult.textContent = message;

    profileResult.className =
        `account-result ${type}`;
}


/* =====================================================
   LOGOUT
===================================================== */

async function handleLogout() {

    console.log("LOGOUT BUTTON CLICKED");

    const buttons = [
        logoutBtn,
        mobileLogoutBtn,
        settingsLogoutBtn
    ];

    buttons.forEach(button => {

        if (button) {

            button.disabled = true;

            button.textContent =
                "Logging out...";

        }

    });


    const success =
        await logoutUser();


    if (!success) {

        console.error(
            "LOGOUT FAILED"
        );

        buttons.forEach(button => {

            if (button) {

                button.disabled = false;

                button.textContent =
                    "Logout";

            }

        });

        alert(
            "Unable to logout. Please try again."
        );

        return;
    }


    console.log(
        "CUSTOMER LOGGED OUT"
    );


    /* ================================================
       IMPORTANT:
       CUSTOMER LOGIN PAGE
    ================================================ */

    window.location.href =
        "login.html";
}


/* =====================================================
   LOGOUT EVENTS
===================================================== */

logoutBtn?.addEventListener(
    "click",
    handleLogout
);

mobileLogoutBtn?.addEventListener(
    "click",
    handleLogout
);

settingsLogoutBtn?.addEventListener(
    "click",
    handleLogout
);


/* =====================================================
   LOAD PROFILE
===================================================== */

async function loadProfile(user) {

    console.log(
        "LOADING CUSTOMER PROFILE"
    );


    const {
        data: profile,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();


    if (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

    }


    const metadata =
        user.user_metadata || {};


    const fullName =
        profile?.full_name ||
        metadata.full_name ||
        "Customer";


    const phone =
        profile?.phone ||
        metadata.phone ||
        "";


    const address =
        profile?.address ||
        "";


    const city =
        profile?.city ||
        "";


    const province =
        profile?.province ||
        "";


    const postalCode =
        profile?.postal_code ||
        "";


    /* =================================================
       PROFILE FORM
    ================================================= */

    const fullNameInput =
        document.getElementById(
            "fullName"
        );

    const phoneInput =
        document.getElementById(
            "phone"
        );

    const addressInput =
        document.getElementById(
            "address"
        );

    const cityInput =
        document.getElementById(
            "city"
        );

    const provinceInput =
        document.getElementById(
            "province"
        );

    const postalCodeInput =
        document.getElementById(
            "postalCode"
        );


    if (fullNameInput)
        fullNameInput.value =
            fullName;

    if (phoneInput)
        phoneInput.value =
            phone;

    if (addressInput)
        addressInput.value =
            address;

    if (cityInput)
        cityInput.value =
            city;

    if (provinceInput)
        provinceInput.value =
            province;

    if (postalCodeInput)
        postalCodeInput.value =
            postalCode;


    /* =================================================
       EMAIL
    ================================================= */

    const email =
        user.email || "";


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );

    const sidebarEmail =
        document.getElementById(
            "sidebarEmail"
        );

    const settingsEmail =
        document.getElementById(
            "settingsEmail"
        );


    if (profileEmail)
        profileEmail.textContent =
            email;

    if (sidebarEmail)
        sidebarEmail.textContent =
            email;

    if (settingsEmail)
        settingsEmail.textContent =
            email;


    /* =================================================
       NAME
    ================================================= */

    const profileName =
        document.getElementById(
            "profileName"
        );

    const sidebarName =
        document.getElementById(
            "sidebarName"
        );


    if (profileName)
        profileName.textContent =
            fullName;

    if (sidebarName)
        sidebarName.textContent =
            fullName;


    /* =================================================
       AVATAR
    ================================================= */

    const firstLetter =
        fullName
            .trim()
            .charAt(0)
            .toUpperCase() || "?";


    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );

    const largeAvatar =
        document.getElementById(
            "largeAvatar"
        );


    if (profileAvatar)
        profileAvatar.textContent =
            firstLetter;

    if (largeAvatar)
        largeAvatar.textContent =
            firstLetter;


    console.log(
        "CUSTOMER PROFILE LOADED"
    );
}


/* =====================================================
   SAVE PROFILE
===================================================== */

profileForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const user =
            await getCurrentUser();


        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        const fullName =
            document
                .getElementById("fullName")
                ?.value
                .trim() || "";


        const phone =
            document
                .getElementById("phone")
                ?.value
                .trim() || "";


        const address =
            document
                .getElementById("address")
                ?.value
                .trim() || "";


        const city =
            document
                .getElementById("city")
                ?.value
                .trim() || "";


        const province =
            document
                .getElementById("province")
                ?.value
                .trim() || "";


        const postalCode =
            document
                .getElementById("postalCode")
                ?.value
                .trim() || "";


        if (!fullName) {

            showProfileResult(
                "Please enter your full name.",
                "error"
            );

            return;
        }


        if (saveProfileBtn) {

            saveProfileBtn.disabled = true;

            saveProfileBtn.textContent =
                "Saving...";
        }


        showProfileResult("");


        const {
            error
        } = await supabase
            .from("profiles")
            .upsert({

                id: user.id,

                full_name: fullName,

                phone: phone,

                address: address,

                city: city,

                province: province,

                postal_code: postalCode,

                updated_at:
                    new Date().toISOString()

            });


        if (error) {

            console.error(
                "PROFILE SAVE ERROR:",
                error
            );


            showProfileResult(
                error.message ||
                "Unable to save profile.",
                "error"
            );


        } else {

            showProfileResult(
                "Profile updated successfully.",
                "success"
            );


            /* UPDATE DISPLAY */

            const profileName =
                document.getElementById(
                    "profileName"
                );

            const sidebarName =
                document.getElementById(
                    "sidebarName"
                );


            if (profileName)
                profileName.textContent =
                    fullName;

            if (sidebarName)
                sidebarName.textContent =
                    fullName;


            const firstLetter =
                fullName
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?";


            const profileAvatar =
                document.getElementById(
                    "profileAvatar"
                );

            const largeAvatar =
                document.getElementById(
                    "largeAvatar"
                );


            if (profileAvatar)
                profileAvatar.textContent =
                    firstLetter;

            if (largeAvatar)
                largeAvatar.textContent =
                    firstLetter;
        }


        if (saveProfileBtn) {

            saveProfileBtn.disabled = false;

            saveProfileBtn.textContent =
                "Save Changes";
        }

    }
);


/* =====================================================
   LOAD ORDERS
===================================================== */

async function loadOrders(user) {

    if (!ordersContainer) return;


    ordersContainer.innerHTML = `
        <div class="loading-box">
            Loading your orders...
        </div>
    `;


    const {
        data: orders,
        error
    } = await supabase
        .from("orders")
        .select(
            "id, created_at, total, status, payment_status"
        )
        .eq(
            "user_id",
            user.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "ORDERS LOAD ERROR:",
            error
        );


        ordersContainer.innerHTML = `
            <div class="loading-box">
                Unable to load your orders.
            </div>
        `;

        return;
    }


    if (
        !orders ||
        orders.length === 0
    ) {

        ordersContainer.innerHTML = `
            <div class="loading-box">
                You don't have any orders yet.
            </div>
        `;

        return;
    }


    ordersContainer.innerHTML =
        orders
            .map(order => {

                const date =
                    new Date(
                        order.created_at
                    ).toLocaleString(
                        "en-PH",
                        {
                            dateStyle:
                                "medium",
                            timeStyle:
                                "short"
                        }
                    );


                const total =
                    Number(
                        order.total
                    ) || 0;


                return `

                    <div class="order-card">

                        <div class="order-card-info">

                            <span>
                                ORDER
                            </span>

                            <strong>
                                #${String(order.id).slice(0, 8)}
                            </strong>

                            <small>
                                ${date}
                            </small>

                        </div>


                        <div class="order-card-status">

                            <span>
                                ${order.status || "Pending"}
                            </span>

                            <strong>
                                ₱${total.toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </strong>

                        </div>


                        <button
                            class="view-order-btn"
                            data-order-id="${order.id}"
                            type="button"
                        >
                            View Order
                        </button>

                    </div>

                `;

            })
            .join("");


    document
        .querySelectorAll(
            ".view-order-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const orderId =
                        button.dataset.orderId;


                    window.location.href =
                        `order-details.html?id=${encodeURIComponent(
                            orderId
                        )}`;

                }
            );

        });

}


/* =====================================================
   RESET PASSWORD
===================================================== */

resetPasswordBtn?.addEventListener(
    "click",
    async () => {

        const user =
            await getCurrentUser();


        if (!user?.email) {

            alert(
                "Please login again."
            );

            return;
        }


        resetPasswordBtn.disabled =
            true;

        resetPasswordBtn.textContent =
            "Sending...";


        const {
            error
        } = await supabase.auth
            .resetPasswordForEmail(
                user.email,
                {
                    redirectTo:
                        `${window.location.origin}/reset-password.html`
                }
            );


        if (error) {

            console.error(
                "PASSWORD RESET ERROR:",
                error
            );

            alert(
                error.message ||
                "Unable to send password reset email."
            );

        } else {

            alert(
                "Password reset email sent. Please check your inbox."
            );

        }


        resetPasswordBtn.disabled =
            false;

        resetPasswordBtn.textContent =
            "Reset Password";

    }
);


/* =====================================================
   ACCOUNT NAVIGATION
===================================================== */

document
    .querySelectorAll(
        ".account-nav-item"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.section;


                document
                    .querySelectorAll(
                        ".account-nav-item"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                document
                    .querySelectorAll(
                        ".account-section"
                    )
                    .forEach(section => {

                        section.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                const target =
                    document.getElementById(
                        targetId
                    );


                if (target) {

                    target.classList.add(
                        "active"
                    );

                }

            }
        );

    });


/* =====================================================
   MOBILE MENU
===================================================== */

const mobileMenuBtn =
    document.getElementById(
        "mobileMenuBtn"
    );

const mobileNav =
    document.getElementById(
        "mobileNav"
    );


mobileMenuBtn?.addEventListener(
    "click",
    () => {

        mobileNav?.classList.toggle(
            "open"
        );

    }
);


/* =====================================================
   INITIALIZE ACCOUNT
===================================================== */

async function initAccount() {

    console.log(
        "ACCOUNT SYSTEM STARTING..."
    );


    const user =
        await getCurrentUser();


    if (!user) {

        console.log(
            "NO CUSTOMER SESSION → LOGIN"
        );


        window.location.href =
            "login.html";

        return;
    }


    console.log(
        "ACCOUNT LOGGED IN:",
        user.email
    );


    await loadProfile(user);

    await loadOrders(user);


    console.log(
        "ACCOUNT SYSTEM READY"
    );
}


initAccount();