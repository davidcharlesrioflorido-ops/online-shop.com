/* =====================================================
   REQUEST SYSTEM
   Business Store
===================================================== */

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


/* =====================================================
   ELEMENTS
===================================================== */

const form =
    document.getElementById(
        "requestForm"
    );

const nameInput =
    document.getElementById(
        "requestName"
    );

const emailInput =
    document.getElementById(
        "requestEmail"
    );

const orderIdInput =
    document.getElementById(
        "requestOrderId"
    );

const typeInput =
    document.getElementById(
        "requestType"
    );

const messageInput =
    document.getElementById(
        "requestMessage"
    );

const submitBtn =
    document.getElementById(
        "submitRequestBtn"
    );

const result =
    document.getElementById(
        "requestResult"
    );

const cartCount =
    document.getElementById(
        "cartCount"
    );


/* =====================================================
   CURRENT USER
===================================================== */

let currentUser = null;


/* =====================================================
   CART SYSTEM
   Each customer has their own cart
===================================================== */

const CART_KEY_PREFIX =
    "businessStoreCart";


function getCartKey() {

    if (!currentUser?.id) {
        return null;
    }

    return `${CART_KEY_PREFIX}_${currentUser.id}`;
}


function getCart() {

    const cartKey =
        getCartKey();

    if (!cartKey) {
        return [];
    }

    try {

        const cart =
            JSON.parse(
                localStorage.getItem(
                    cartKey
                ) || "[]"
            );

        return Array.isArray(cart)
            ? cart
            : [];

    } catch (error) {

        console.error(
            "CART READ ERROR:",
            error
        );

        return [];
    }
}


/* =====================================================
   CART COUNT
===================================================== */

function updateCartCount() {

    try {

        const cart =
            getCart();

        const count =
            cart.reduce(
                (
                    total,
                    item
                ) => {

                    return (
                        total +
                        Number(
                            item.quantity || 0
                        )
                    );

                },
                0
            );


        if (cartCount) {

            cartCount.textContent =
                count;

        }


        console.log(
            "REQUEST PAGE CART KEY:",
            getCartKey()
        );

        console.log(
            "REQUEST PAGE CART COUNT:",
            count
        );


    } catch (error) {

        console.error(
            "CART COUNT ERROR:",
            error
        );


        if (cartCount) {

            cartCount.textContent =
                "0";

        }

    }

}


/* =====================================================
   EMAIL VALIDATION
===================================================== */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* =====================================================
   SHOW RESULT
===================================================== */

function showResult(
    message,
    type = "normal"
) {

    if (!result) {
        return;
    }


    result.textContent =
        message;


    result.classList.remove(
        "success",
        "error"
    );


    if (type === "success") {

        result.classList.add(
            "success"
        );

    }


    if (type === "error") {

        result.classList.add(
            "error"
        );

    }

}


/* =====================================================
   SET SUBMITTING STATE
===================================================== */

function setSubmitting(
    isSubmitting
) {

    if (!submitBtn) {
        return;
    }


    if (isSubmitting) {

        submitBtn.disabled =
            true;

        submitBtn.innerHTML = `
            <span>Submitting...</span>
            <span>⌛</span>
        `;

    } else {

        submitBtn.disabled =
            false;

        submitBtn.innerHTML = `
            <span>Send Request</span>
            <span class="submit-arrow">→</span>
        `;

    }

}


/* =====================================================
   FORM VALIDATION
===================================================== */

function validateForm() {

    const name =
        nameInput?.value.trim() || "";

    const email =
        emailInput?.value.trim() || "";

    const requestType =
        typeInput?.value.trim() || "";

    const message =
        messageInput?.value.trim() || "";


    if (!name) {

        showResult(
            "Please enter your full name.",
            "error"
        );

        nameInput?.focus();

        return false;
    }


    if (name.length < 2) {

        showResult(
            "Please enter a valid full name.",
            "error"
        );

        nameInput?.focus();

        return false;
    }


    if (!email) {

        showResult(
            "Please enter your email address.",
            "error"
        );

        emailInput?.focus();

        return false;
    }


    if (!isValidEmail(email)) {

        showResult(
            "Please enter a valid email address.",
            "error"
        );

        emailInput?.focus();

        return false;
    }


    if (!requestType) {

        showResult(
            "Please select a request type.",
            "error"
        );

        typeInput?.focus();

        return false;
    }


    if (!message) {

        showResult(
            "Please enter your message.",
            "error"
        );

        messageInput?.focus();

        return false;
    }


    if (message.length < 5) {

        showResult(
            "Please provide more details about your concern.",
            "error"
        );

        messageInput?.focus();

        return false;
    }


    return true;

}


/* =====================================================
   LOAD CURRENT USER
===================================================== */

async function loadCurrentUser() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getUser();


        if (error) {

            console.warn(
                "USER CHECK ERROR:",
                error.message
            );

            currentUser = null;

        } else {

            currentUser =
                data?.user || null;

        }


        console.log(
            "REQUEST CURRENT USER:",
            currentUser?.id || "NOT LOGGED IN"
        );


    } catch (error) {

        console.error(
            "CURRENT USER ERROR:",
            error
        );

        currentUser = null;

    }


    updateCartCount();

}


/* =====================================================
   SUBMIT FORM
===================================================== */

if (!form) {

    console.error(
        "ERROR: requestForm was not found."
    );

} else {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            console.log(
                "REQUEST FORM SUBMITTED"
            );


            /* =================================================
               ELEMENT CHECK
            ================================================== */

            if (
                !nameInput ||
                !emailInput ||
                !typeInput ||
                !messageInput ||
                !submitBtn ||
                !result
            ) {

                console.error(
                    "ERROR: Required request form element is missing."
                );

                return;

            }


            /* =================================================
               VALIDATE
            ================================================== */

            if (!validateForm()) {
                return;
            }


            /* =================================================
               GET VALUES
            ================================================== */

            const name =
                nameInput.value.trim();

            const email =
                emailInput.value.trim();

            const orderId =
                orderIdInput
                    ? orderIdInput.value.trim()
                    : "";

            const requestType =
                typeInput.value.trim();

            const message =
                messageInput.value.trim();


            /* =================================================
               PREVENT DOUBLE SUBMIT
            ================================================== */

            setSubmitting(
                true
            );


            showResult(
                "Sending your request..."
            );


            /* =================================================
               REQUEST DATA
            ================================================== */

            const requestData = {

                name:
                    name,

                email:
                    email,

                order_id:
                    orderId || null,

                request_type:
                    requestType,

                message:
                    message,

                status:
                    "New"

            };


            console.log(
                "NEW REQUEST DATA:",
                requestData
            );


            /* =================================================
               INSERT
            ================================================= */

            try {

                const {
                    data,
                    error
                } = await supabase
                    .from(
                        "requests"
                    )
                    .insert(
                        [requestData]
                    )
                    .select("*")
                    .single();


                /* =============================================
                   SUPABASE ERROR
                ============================================== */

                if (error) {

                    console.error(
                        "SUPABASE REQUEST ERROR:",
                        error
                    );


                    showResult(
                        error.message ||
                        "Unable to submit your request.",
                        "error"
                    );


                    return;

                }


                /* =============================================
                   VERIFY RESULT
                ============================================== */

                console.log(
                    "REQUEST SAVED:",
                    data
                );


                console.log(
                    "DATABASE STATUS:",
                    data?.status
                );


                /* =============================================
                   SUCCESS
                ============================================== */

                showResult(
                    "Request submitted successfully! Our team will review your concern.",
                    "success"
                );


                /* =============================================
                   CLEAR FORM
                ============================================== */

                form.reset();


                /* =============================================
                   UPDATE CART
                ============================================== */

                updateCartCount();


            } catch (error) {

                console.error(
                    "REQUEST SYSTEM ERROR:",
                    error
                );


                showResult(
                    "Something went wrong. Please try again.",
                    "error"
                );


            } finally {

                /* =============================================
                   RESTORE BUTTON
                ============================================== */

                setSubmitting(
                    false
                );

            }

        }
    );

}


/* =====================================================
   CART UPDATED EVENT
===================================================== */

window.addEventListener(
    "cartUpdated",
    () => {

        updateCartCount();

    }
);


/* =====================================================
   STORAGE EVENT
   Updates cart when another tab/window changes it
===================================================== */

window.addEventListener(
    "storage",
    event => {

        const currentCartKey =
            getCartKey();


        if (
            currentCartKey &&
            event.key === currentCartKey
        ) {

            updateCartCount();

        }

    }
);


/* =====================================================
   PAGE SHOW
   Refresh cart when returning to page
===================================================== */

window.addEventListener(
    "pageshow",
    () => {

        updateCartCount();

    }
);


/* =====================================================
   INITIALIZE
===================================================== */

await loadCurrentUser();


console.log(
    "REQUEST SYSTEM READY"
);