
import { supabase } from "./supabase.js";

/* =========================================================
   LOGIN ELEMENTS
========================================================= */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginResult = document.getElementById("loginResult");

/* =========================================================
   ADMIN REGISTRATION ELEMENTS
========================================================= */

const adminRegisterBtn =
    document.getElementById("adminRegisterBtn");

const adminRegisterPanel =
    document.getElementById("adminRegisterPanel");

const adminRegisterForm =
    document.getElementById("adminRegisterForm");

const adminNameInput =
    document.getElementById("adminName");

const adminEmailInput =
    document.getElementById("adminEmail");

const adminPasswordInput =
    document.getElementById("adminPassword");

const adminConfirmPasswordInput =
    document.getElementById("adminConfirmPassword");

const adminSubmitBtn =
    document.getElementById("adminSubmitBtn");

const cancelAdminBtn =
    document.getElementById("cancelAdminBtn");

const adminRegisterResult =
    document.getElementById("adminRegisterResult");

/* =========================================================
   FORGOT PASSWORD ELEMENTS
========================================================= */

const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

const forgotPasswordPanel =
    document.getElementById("forgotPasswordPanel");

const cancelForgotPasswordBtn =
    document.getElementById("cancelForgotPasswordBtn");

const forgotPasswordResult =
    document.getElementById("forgotPasswordResult");

const forgotStepEmail =
    document.getElementById("forgotStepEmail");

const forgotStepPin =
    document.getElementById("forgotStepPin");

const forgotStepPassword =
    document.getElementById("forgotStepPassword");

const forgotEmailForm =
    document.getElementById("forgotEmailForm");

const forgotPinForm =
    document.getElementById("forgotPinForm");

const forgotPasswordForm =
    document.getElementById("forgotPasswordForm");

const forgotEmail =
    document.getElementById("forgotEmail");

const forgotPin =
    document.getElementById("forgotPin");

const forgotNewPassword =
    document.getElementById("forgotNewPassword");

const forgotConfirmPassword =
    document.getElementById("forgotConfirmPassword");

const sendForgotPinBtn =
    document.getElementById("sendForgotPinBtn");

const verifyForgotPinBtn =
    document.getElementById("verifyForgotPinBtn");

const resendForgotPinBtn =
    document.getElementById("resendForgotPinBtn");

const updateForgotPasswordBtn =
    document.getElementById("updateForgotPasswordBtn");

/* =========================================================
   FORGOT PASSWORD STATE
========================================================= */

let forgotPasswordEmail = "";
let forgotPinEntered = false;
let forgotRequestInProgress = false;

/* =========================================================
   SUPER SERVICE
=========================================================

   IMPORTANT:

   Your actual Edge Function is:

   super-service

   DO NOT change this to:

   password-change-pin
========================================================= */

const SUPER_SERVICE_FUNCTION = "super-service";

/* =========================================================
   CHECK LOGIN ELEMENTS
========================================================= */

if (
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !loginBtn ||
    !loginResult
) {
    console.error(
        "LOGIN ERROR: Required login elements are missing."
    );

    throw new Error(
        "Login HTML elements do not match login.js."
    );
}

/* =========================================================
   SHOW LOGIN MESSAGE
========================================================= */

function showMessage(message, type = "") {

    loginResult.textContent = message;
    loginResult.className = `result ${type}`;
}

/* =========================================================
   SHOW ADMIN MESSAGE
========================================================= */

function showAdminMessage(message, type = "") {

    if (!adminRegisterResult) {
        return;
    }

    adminRegisterResult.textContent = message;
    adminRegisterResult.className = `result ${type}`;
}

/* =========================================================
   SHOW FORGOT PASSWORD MESSAGE
========================================================= */

function showForgotMessage(message, type = "") {

    if (!forgotPasswordResult) {
        return;
    }

    forgotPasswordResult.textContent = message;
    forgotPasswordResult.className = `result ${type}`;
}

/* =========================================================
   SHOW FORGOT PASSWORD STEP
========================================================= */

function showForgotStep(step) {

    if (forgotStepEmail) {
        forgotStepEmail.classList.remove("active");
    }

    if (forgotStepPin) {
        forgotStepPin.classList.remove("active");
    }

    if (forgotStepPassword) {
        forgotStepPassword.classList.remove("active");
    }

    if (step === "email") {
        forgotStepEmail?.classList.add("active");
    }

    if (step === "pin") {
        forgotStepPin?.classList.add("active");
    }

    if (step === "password") {
        forgotStepPassword?.classList.add("active");
    }
}

/* =========================================================
   CLEAR LOCAL LOGIN DATA
========================================================= */

function clearLocalLoginData() {

    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userRole");
}

/* =========================================================
   SAVE USER DATA
========================================================= */

function saveUserData(user, profile, role) {

    localStorage.setItem(
        "userId",
        user.id
    );

    localStorage.setItem(
        "userName",
        profile.name || ""
    );

    localStorage.setItem(
        "userEmail",
        profile.email ||
        user.email ||
        ""
    );

    localStorage.setItem(
        "userPhone",
        profile.phone || ""
    );

    localStorage.setItem(
        "userRole",
        role
    );
}

/* =========================================================
   UPDATE LAST LOGIN
========================================================= */

async function updateLastLogin(userId) {

    if (!userId) {

        console.warn(
            "LAST LOGIN: No user ID available."
        );

        return;
    }

    const lastLogin =
        new Date().toISOString();

    const {
        error
    } = await supabase
        .from("profiles")
        .update({
            last_login: lastLogin
        })
        .eq(
            "id",
            userId
        );

    if (error) {

        console.warn(
            "LAST LOGIN UPDATE FAILED:",
            error
        );

        return;
    }

    console.log(
        "LAST LOGIN UPDATED:",
        lastLogin
    );
}

/* =========================================================
   READ EDGE FUNCTION ERROR
========================================================= */

async function getFunctionErrorMessage(error) {

    let message = "";

    try {

        if (
            error?.context &&
            typeof error.context.json === "function"
        ) {

            const body =
                await error.context.json();

            console.error(
                "SUPER SERVICE ERROR RESPONSE:",
                body
            );

            if (typeof body === "string") {

                message = body;

            } else if (body) {

                message =
                    body.message ||
                    body.error ||
                    body.details ||
                    body.reason ||
                    "";
            }
        }

    } catch (responseError) {

        console.warn(
            "Could not read Edge Function error response:",
            responseError
        );
    }

    if (!message) {

        message =
            error?.message ||
            "The Edge Function returned an error.";
    }

    return String(message);
}

/* =========================================================
   CALL SUPER SERVICE
========================================================= */

async function callSuperService(payload) {

    console.log(
        "=========================================="
    );

    console.log(
        "SUPER SERVICE REQUEST"
    );

    console.log(
        "FUNCTION:",
        SUPER_SERVICE_FUNCTION
    );

    console.log(
        "ACTION:",
        payload?.action
    );

    console.log(
        "EMAIL:",
        payload?.email
    );

    /*
     * Do NOT log passwords or PINs.
     */

    console.log(
        "=========================================="
    );

    const {
        data,
        error
    } = await supabase.functions.invoke(
        SUPER_SERVICE_FUNCTION,
        {
            body: payload
        }
    );

    if (error) {

        const actualMessage =
            await getFunctionErrorMessage(error);

        console.error(
            "SUPER SERVICE ACTUAL ERROR:",
            actualMessage
        );

        const enhancedError =
            new Error(actualMessage);

        enhancedError.originalError =
            error;

        throw enhancedError;
    }

    console.log(
        "SUPER SERVICE RESPONSE:",
        data
    );

    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.message ||
            data.error ||
            "The request could not be completed."
        );
    }

    return data;
}

/* =========================================================
   OPEN FORGOT PASSWORD
========================================================= */

forgotPasswordBtn?.addEventListener(
    "click",
    () => {

        if (!forgotPasswordPanel) {
            return;
        }

        forgotPasswordPanel.hidden = false;

        if (adminRegisterPanel) {
            adminRegisterPanel.hidden = true;
        }

        forgotPasswordEmail = "";
        forgotPinEntered = false;

        if (forgotEmail) {
            forgotEmail.value = "";
        }

        if (forgotPin) {
            forgotPin.value = "";
        }

        if (forgotNewPassword) {
            forgotNewPassword.value = "";
        }

        if (forgotConfirmPassword) {
            forgotConfirmPassword.value = "";
        }

        showForgotStep("email");

        showForgotMessage("", "");

        const authSubtitle =
            document.getElementById(
                "authSubtitle"
            );

        if (authSubtitle) {

            authSubtitle.textContent =
                "Reset your account password.";
        }

        forgotPasswordPanel.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(
            () => {
                forgotEmail?.focus();
            },
            400
        );
    }
);

/* =========================================================
   CANCEL FORGOT PASSWORD
========================================================= */

cancelForgotPasswordBtn?.addEventListener(
    "click",
    () => {

        if (forgotPasswordPanel) {
            forgotPasswordPanel.hidden = true;
        }

        forgotPasswordEmail = "";
        forgotPinEntered = false;

        if (forgotEmail) {
            forgotEmail.value = "";
        }

        if (forgotPin) {
            forgotPin.value = "";
        }

        if (forgotNewPassword) {
            forgotNewPassword.value = "";
        }

        if (forgotConfirmPassword) {
            forgotConfirmPassword.value = "";
        }

        showForgotStep("email");

        showForgotMessage("", "");

        const authSubtitle =
            document.getElementById(
                "authSubtitle"
            );

        if (authSubtitle) {

            authSubtitle.textContent =
                "Sign in to continue to your account.";
        }
    }
);

/* =========================================================
   SEND FORGOT PASSWORD PIN
========================================================= */

forgotEmailForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (forgotRequestInProgress) {
            return;
        }

        const email =
            forgotEmail?.value
                .trim()
                .toLowerCase() ||
            "";

        /* =================================================
           VALIDATION
        ================================================= */

        if (!email) {

            showForgotMessage(
                "Please enter your email.",
                "error"
            );

            forgotEmail?.focus();

            return;
        }

        if (!email.includes("@")) {

            showForgotMessage(
                "Please enter a valid email address.",
                "error"
            );

            forgotEmail?.focus();

            return;
        }

        /* =================================================
           LOADING
        ================================================= */

        forgotRequestInProgress = true;

        if (sendForgotPinBtn) {

            sendForgotPinBtn.disabled = true;

            sendForgotPinBtn.textContent =
                "Sending PIN...";
        }

        showForgotMessage(
            "Sending your verification PIN...",
            "info"
        );

        try {

            forgotPasswordEmail = email;

            /* =================================================
               SUPER SERVICE - SEND
            ================================================= */

            const result =
                await callSuperService({
                    action: "send",
                    email: email
                });

            console.log(
                "FORGOT PASSWORD PIN SENT:",
                result
            );

            /* =================================================
               MOVE TO PIN STEP
            ================================================= */

            showForgotStep("pin");

            showForgotMessage(
                "PIN sent successfully! Please check your email, including your Spam or Junk folder, for the 6-digit PIN.",
                "success"
            );

            if (forgotPin) {

                forgotPin.value = "";

                setTimeout(
                    () => {
                        forgotPin.focus();
                    },
                    100
                );
            }

        } catch (error) {

            console.error(
                "FORGOT PASSWORD SEND PIN ERROR:",
                error
            );

            const errorText =
                String(
                    error?.message ||
                    ""
                ).toLowerCase();

            let message =
                "Unable to send the PIN. Please try again.";

            if (
                errorText.includes(
                    "user account not found"
                ) ||
                errorText.includes(
                    "user not found"
                ) ||
                errorText.includes(
                    "not found"
                )
            ) {

                message =
                    "No account was found with that email address.";

            } else if (
                errorText.includes(
                    "too many"
                ) ||
                errorText.includes(
                    "rate"
                ) ||
                errorText.includes(
                    "limit"
                )
            ) {

                message =
                    "Too many PIN requests. Please wait a moment before requesting another PIN.";

            } else if (
                errorText.includes(
                    "zapier"
                )
            ) {

                message =
                    "The PIN could not be sent by email right now. Please try again.";

            } else if (
                error?.message
            ) {

                message =
                    error.message;
            }

            showForgotMessage(
                message,
                "error"
            );

        } finally {

            forgotRequestInProgress = false;

            if (sendForgotPinBtn) {

                sendForgotPinBtn.disabled = false;

                sendForgotPinBtn.textContent =
                    "Send PIN";
            }
        }
    }
);

/* =========================================================
   PIN STEP
=========================================================

   The PIN format is checked here.

   The actual PIN verification happens during the
   final password update through super-service.

========================================================= */

forgotPinForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (forgotRequestInProgress) {
            return;
        }

        const pin =
            forgotPin?.value
                .trim() ||
            "";

        if (!forgotPasswordEmail) {

            showForgotMessage(
                "Your password reset session has expired. Please start again.",
                "error"
            );

            showForgotStep("email");

            return;
        }

        if (!/^\d{6}$/.test(pin)) {

            showForgotMessage(
                "Please enter the 6-digit PIN.",
                "error"
            );

            forgotPin?.focus();

            return;
        }

        /*
         * Only remember that the user entered a valid
         * 6-digit PIN format.
         *
         * The real verification is done by
         * super-service during the password update.
         */

        forgotPinEntered = true;

        showForgotStep("password");

        showForgotMessage(
            "PIN entered. Please create your new password below.",
            "success"
        );

        if (forgotNewPassword) {

            setTimeout(
                () => {
                    forgotNewPassword.focus();
                },
                100
            );
        }
    }
);

/* =========================================================
   RESEND FORGOT PASSWORD PIN
========================================================= */

resendForgotPinBtn?.addEventListener(
    "click",
    async () => {

        if (forgotRequestInProgress) {
            return;
        }

        const email =
            forgotPasswordEmail ||
            forgotEmail?.value
                .trim()
                .toLowerCase() ||
            "";

        if (!email) {

            showForgotMessage(
                "Please enter your email first.",
                "error"
            );

            showForgotStep("email");

            return;
        }

        forgotRequestInProgress = true;

        resendForgotPinBtn.disabled = true;

        resendForgotPinBtn.textContent =
            "Sending new PIN...";

        showForgotMessage(
            "Sending a new PIN...",
            "info"
        );

        try {

            await callSuperService({
                action: "send",
                email: email
            });

            forgotPasswordEmail = email;
            forgotPinEntered = false;

            showForgotStep("pin");

            showForgotMessage(
                "A new PIN has been sent. Please check your email, including your Spam or Junk folder.",
                "success"
            );

            if (forgotPin) {

                forgotPin.value = "";

                setTimeout(
                    () => {
                        forgotPin.focus();
                    },
                    100
                );
            }

        } catch (error) {

            console.error(
                "RESEND PIN ERROR:",
                error
            );

            const errorText =
                String(
                    error?.message ||
                    ""
                ).toLowerCase();

            let message =
                "Unable to resend the PIN. Please try again.";

            if (
                errorText.includes(
                    "not found"
                )
            ) {

                message =
                    "No account was found with that email address.";

            } else if (
                error?.message
            ) {

                message =
                    error.message;
            }

            showForgotMessage(
                message,
                "error"
            );

        } finally {

            forgotRequestInProgress = false;

            resendForgotPinBtn.disabled = false;

            resendForgotPinBtn.textContent =
                "Didn't receive the PIN? Resend";
        }
    }
);

/* =========================================================
   UPDATE FORGOT PASSWORD
=========================================================

   IMPORTANT:

   SUPER-SERVICE EXPECTED PAYLOAD:

   {
       action: "verify",
       email: "...",
       pin: "...",
       newPassword: "..."
   }

   IMPORTANT:
   Use "newPassword", NOT "password".
========================================================= */

forgotPasswordForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (forgotRequestInProgress) {
            return;
        }

        if (!forgotPinEntered) {

            showForgotMessage(
                "Please enter your 6-digit PIN first.",
                "error"
            );

            showForgotStep("pin");

            return;
        }

        const email =
            forgotPasswordEmail ||
            forgotEmail?.value
                .trim()
                .toLowerCase() ||
            "";

        const pin =
            forgotPin?.value
                .trim() ||
            "";

        const newPassword =
            forgotNewPassword?.value ||
            "";

        const confirmPassword =
            forgotConfirmPassword?.value ||
            "";

        /* =================================================
           VALIDATION
        ================================================= */

        if (!email) {

            showForgotMessage(
                "Your email session is missing. Please start again.",
                "error"
            );

            showForgotStep("email");

            return;
        }

        if (!/^\d{6}$/.test(pin)) {

            showForgotMessage(
                "Please enter the 6-digit PIN.",
                "error"
            );

            showForgotStep("pin");

            return;
        }

        if (newPassword.length < 6) {

            showForgotMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            forgotNewPassword?.focus();

            return;
        }

        if (newPassword !== confirmPassword) {

            showForgotMessage(
                "Passwords do not match.",
                "error"
            );

            forgotConfirmPassword?.focus();

            return;
        }

        /* =================================================
           LOADING
        ================================================= */

        forgotRequestInProgress = true;

        if (updateForgotPasswordBtn) {

            updateForgotPasswordBtn.disabled = true;

            updateForgotPasswordBtn.textContent =
                "Updating Password...";
        }

        showForgotMessage(
            "Verifying your PIN and updating your password...",
            "info"
        );

        try {

            /* =================================================
               SUPER SERVICE VERIFY

               IMPORTANT:
               newPassword is required by super-service.
            ================================================= */

            const result =
                await callSuperService({

                    action: "verify",

                    email: email,

                    pin: pin,

                    newPassword: newPassword

                });

            console.log(
                "PASSWORD UPDATE RESULT:",
                result
            );

            /* =================================================
               SUCCESS
            ================================================= */

            forgotPinEntered = false;

            showForgotMessage(
                "Password updated successfully! You can now log in with your new password.",
                "success"
            );

            if (forgotPasswordForm) {
                forgotPasswordForm.reset();
            }

            if (forgotPinForm) {
                forgotPinForm.reset();
            }

            if (forgotEmailForm) {
                forgotEmailForm.reset();
            }

            setTimeout(
                () => {

                    if (forgotPasswordPanel) {

                        forgotPasswordPanel.hidden =
                            true;
                    }

                    showForgotStep("email");

                    forgotPasswordEmail = "";

                    const authSubtitle =
                        document.getElementById(
                            "authSubtitle"
                        );

                    if (authSubtitle) {

                        authSubtitle.textContent =
                            "Sign in to continue to your account.";
                    }

                    if (emailInput) {
                        emailInput.value = email;
                    }

                    if (passwordInput) {
                        passwordInput.value = "";
                    }

                    showForgotMessage(
                        "",
                        ""
                    );

                },
                2200
            );

        } catch (error) {

            console.error(
                "FORGOT PASSWORD UPDATE ERROR:",
                error
            );

            const errorText =
                String(
                    error?.message ||
                    ""
                ).toLowerCase();

            let message =
                "Unable to update your password. Please try again.";

            /* =================================================
               EXPIRED PIN
            ================================================= */

            if (
                errorText.includes(
                    "expired"
                )
            ) {

                message =
                    "This PIN has expired. Please request a new PIN.";

                forgotPinEntered = false;

                showForgotStep("pin");
            }

            /* =================================================
               INVALID PIN
            ================================================= */

            else if (
                errorText.includes(
                    "invalid verification pin"
                ) ||
                errorText.includes(
                    "invalid pin"
                ) ||
                errorText.includes(
                    "incorrect pin"
                )
            ) {

                message =
                    "Incorrect PIN. Please check your email and try again.";

                forgotPinEntered = false;

                showForgotStep("pin");
            }

            /* =================================================
               NO PIN REQUEST
            ================================================= */

            else if (
                errorText.includes(
                    "no pin request"
                )
            ) {

                message =
                    "No active PIN request was found. Please request a new PIN.";

                forgotPinEntered = false;

                showForgotStep("email");
            }

            /* =================================================
               USER NOT FOUND
            ================================================= */

            else if (
                errorText.includes(
                    "user account not found"
                ) ||
                errorText.includes(
                    "user not found"
                )
            ) {

                message =
                    "The account could not be found. Please check your email.";

                forgotPinEntered = false;

                showForgotStep("email");
            }

            /* =================================================
               PASSWORD ERROR
            ================================================= */

            else if (
                errorText.includes(
                    "password must be at least"
                )
            ) {

                message =
                    "Password must be at least 6 characters.";
            }

            /* =================================================
               RATE LIMIT
            ================================================= */

            else if (
                errorText.includes(
                    "too many"
                ) ||
                errorText.includes(
                    "rate"
                ) ||
                errorText.includes(
                    "limit"
                )
            ) {

                message =
                    "Too many requests. Please wait a moment and try again.";
            }

            /* =================================================
               OTHER SERVER ERROR
            ================================================= */

            else if (
                error?.message
            ) {

                message =
                    error.message;
            }

            showForgotMessage(
                message,
                "error"
            );

        } finally {

            forgotRequestInProgress = false;

            if (updateForgotPasswordBtn) {

                updateForgotPasswordBtn.disabled = false;

                updateForgotPasswordBtn.textContent =
                    "Update Password";
            }
        }
    }
);

/* =========================================================
   OPEN ADMIN REGISTRATION PANEL
========================================================= */

if (
    adminRegisterBtn &&
    adminRegisterPanel
) {

    adminRegisterBtn.addEventListener(
        "click",
        () => {

            adminRegisterPanel.hidden = false;

            forgotPasswordPanel?.setAttribute(
                "hidden",
                ""
            );

            adminRegisterPanel.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            setTimeout(
                () => {

                    if (adminNameInput) {
                        adminNameInput.focus();
                    }

                },
                400
            );
        }
    );
}

/* =========================================================
   CLOSE ADMIN REGISTRATION PANEL
========================================================= */

if (
    cancelAdminBtn &&
    adminRegisterPanel
) {

    cancelAdminBtn.addEventListener(
        "click",
        () => {

            adminRegisterPanel.hidden = true;

            if (adminRegisterForm) {
                adminRegisterForm.reset();
            }

            showAdminMessage(
                "",
                ""
            );
        }
    );
}

/* =========================================================
   ADMIN REGISTRATION
========================================================= */

if (adminRegisterForm) {

    adminRegisterForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (
                adminSubmitBtn?.disabled
            ) {
                return;
            }

            const fullName =
                adminNameInput?.value
                    .trim() ||
                "";

            const email =
                adminEmailInput?.value
                    .trim()
                    .toLowerCase() ||
                "";

            const password =
                adminPasswordInput?.value ||
                "";

            const confirmPassword =
                adminConfirmPasswordInput?.value ||
                "";

            /* =================================================
               VALIDATION
            ================================================= */

            if (!fullName) {

                showAdminMessage(
                    "Please enter your full name.",
                    "error"
                );

                adminNameInput?.focus();

                return;
            }

            if (fullName.length < 2) {

                showAdminMessage(
                    "Please enter a valid full name.",
                    "error"
                );

                adminNameInput?.focus();

                return;
            }

            if (!email) {

                showAdminMessage(
                    "Please enter your email.",
                    "error"
                );

                adminEmailInput?.focus();

                return;
            }

            if (!email.includes("@")) {

                showAdminMessage(
                    "Please enter a valid email address.",
                    "error"
                );

                adminEmailInput?.focus();

                return;
            }

            if (!password) {

                showAdminMessage(
                    "Please enter a password.",
                    "error"
                );

                adminPasswordInput?.focus();

                return;
            }

            if (password.length < 6) {

                showAdminMessage(
                    "Password must be at least 6 characters.",
                    "error"
                );

                adminPasswordInput?.focus();

                return;
            }

            if (!confirmPassword) {

                showAdminMessage(
                    "Please confirm your password.",
                    "error"
                );

                adminConfirmPasswordInput?.focus();

                return;
            }

            if (
                password !==
                confirmPassword
            ) {

                showAdminMessage(
                    "Passwords do not match.",
                    "error"
                );

                adminConfirmPasswordInput?.focus();

                return;
            }

            /* =================================================
               LOADING
            ================================================= */

            if (adminSubmitBtn) {

                adminSubmitBtn.disabled = true;

                adminSubmitBtn.textContent =
                    "Submitting Request...";
            }

            showAdminMessage(
                "Submitting your admin request...",
                "info"
            );

            try {

                /* =============================================
                   CLEAR OLD SESSION
                ============================================= */

                await supabase.auth.signOut();

                /* =============================================
                   CREATE ADMIN AUTH ACCOUNT
                ============================================= */

                const {
                    data,
                    error
                } =
                    await supabase.auth.signUp({

                        email,
                        password,

                        options: {

                            data: {

                                full_name:
                                    fullName,

                                role:
                                    "admin"
                            }
                        }
                    });

                if (error) {
                    throw error;
                }

                /* =============================================
                   GET CREATED USER
                ============================================= */

                const user =
                    data?.user;

                if (!user) {

                    throw new Error(
                        "Admin account could not be created."
                    );
                }

                console.log(
                    "ADMIN REGISTRATION SUCCESS:",
                    user
                );

                /* =============================================
                   CREATE / UPDATE ADMIN PROFILE
                ============================================= */

                const {
                    data: profile,
                    error: profileError
                } =
                    await supabase
                        .from("profiles")
                        .upsert(
                            {

                                id:
                                    user.id,

                                name:
                                    fullName,

                                email:
                                    email,

                                role:
                                    "admin",

                                status:
                                    "pending"

                            },
                            {
                                onConflict:
                                    "id"
                            }
                        )
                        .select()
                        .single();

                /* =============================================
                   PROFILE ERROR
                ============================================= */

                if (profileError) {

                    console.error(
                        "ADMIN PROFILE ERROR:",
                        profileError
                    );

                    await supabase.auth.signOut();

                    throw new Error(
                        "Admin account was created, but the pending profile could not be saved. Please check your Supabase profiles policies."
                    );
                }

                console.log(
                    "ADMIN PROFILE CREATED:",
                    profile
                );

                /* =============================================
                   SIGN OUT NEW ADMIN
                ============================================= */

                await supabase.auth.signOut();

                clearLocalLoginData();

                /* =============================================
                   SUCCESS
                ============================================= */

                showAdminMessage(
                    "Admin request submitted successfully. Please wait for an existing administrator to approve your account before logging in.",
                    "success"
                );

                adminRegisterForm.reset();

                setTimeout(
                    () => {

                        if (adminRegisterPanel) {

                            adminRegisterPanel.hidden =
                                true;
                        }

                        showAdminMessage(
                            "",
                            ""
                        );

                    },
                    5000
                );

            } catch (error) {

                console.error(
                    "ADMIN REGISTRATION ERROR:",
                    error
                );

                let message =
                    "Unable to submit admin registration.";

                const errorText =
                    String(
                        error?.message ||
                        ""
                    )
                        .toLowerCase();

                if (
                    errorText.includes(
                        "user already registered"
                    ) ||
                    errorText.includes(
                        "already registered"
                    )
                ) {

                    message =
                        "This email is already registered. Please use another email.";

                } else if (
                    errorText.includes(
                        "invalid email"
                    )
                ) {

                    message =
                        "Please enter a valid email address.";

                } else if (
                    errorText.includes(
                        "password"
                    ) &&
                    errorText.includes(
                        "6"
                    )
                ) {

                    message =
                        "Password must be at least 6 characters.";

                } else if (
                    errorText.includes(
                        "row-level security"
                    ) ||
                    errorText.includes(
                        "42501"
                    )
                ) {

                    message =
                        "Account registration reached Supabase, but the profiles table is blocking the admin profile. We need to update the Supabase RLS policy.";

                } else if (
                    errorText.includes(
                        "network"
                    ) ||
                    errorText.includes(
                        "fetch"
                    ) ||
                    errorText.includes(
                        "failed to fetch"
                    )
                ) {

                    message =
                        "Network error. Please check your internet connection.";

                } else if (
                    error?.message
                ) {

                    message =
                        error.message;
                }

                showAdminMessage(
                    message,
                    "error"
                );

            } finally {

                if (adminSubmitBtn) {

                    adminSubmitBtn.disabled = false;

                    adminSubmitBtn.textContent =
                        "Request Admin Approval";
                }
            }
        }
    );
}

/* =========================================================
   CUSTOMER / ADMIN LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (loginBtn.disabled) {
            return;
        }

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;

        /* =================================================
           VALIDATION
        ================================================= */

        if (!email) {

            showMessage(
                "Please enter your email.",
                "error"
            );

            emailInput.focus();

            return;
        }

        if (!password) {

            showMessage(
                "Please enter your password.",
                "error"
            );

            passwordInput.focus();

            return;
        }

        /* =================================================
           LOADING
        ================================================= */

        loginBtn.disabled = true;

        loginBtn.textContent =
            "Logging in...";

        showMessage(
            "Signing you in...",
            "info"
        );

        try {

            clearLocalLoginData();

            /* =============================================
               SUPABASE AUTHENTICATION
            ============================================= */

            const {
                data,
                error
            } =
                await supabase.auth
                    .signInWithPassword({

                        email,
                        password

                    });

            if (error) {
                throw error;
            }

            const user =
                data?.user;

            if (!user) {

                throw new Error(
                    "Unable to get your account information."
                );
            }

            console.log(
                "LOGIN SUCCESS"
            );

            console.log(
                "AUTH USER:",
                user
            );

            /* =============================================
               GET USER PROFILE
            ============================================= */

            const {
                data: profile,
                error: profileError
            } =
                await supabase
                    .from("profiles")
                    .select(`
                        id,
                        name,
                        email,
                        phone,
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
                    "PROFILE DATABASE ERROR:",
                    profileError
                );

                await supabase.auth.signOut();

                clearLocalLoginData();

                throw new Error(
                    "Unable to load your account profile."
                );
            }

            if (!profile) {

                console.error(
                    "NO PROFILE FOUND FOR USER:",
                    user.id
                );

                await supabase.auth.signOut();

                clearLocalLoginData();

                throw new Error(
                    "Your account profile was not found. Please contact the administrator."
                );
            }

            console.log(
                "USER PROFILE:",
                profile
            );

            /* =============================================
               UPDATE LAST LOGIN
            ============================================= */

            await updateLastLogin(
                user.id
            );

            /* =============================================
               GET ROLE
            ============================================= */

            const role =
                String(
                    profile.role || ""
                )
                    .trim()
                    .toLowerCase();

            /* =============================================
               GET STATUS
            ============================================= */

            const status =
                String(
                    profile.status ||
                    "approved"
                )
                    .trim()
                    .toLowerCase();

            console.log(
                "ACCOUNT ROLE:",
                role
            );

            console.log(
                "ACCOUNT STATUS:",
                status
            );

            /* =============================================
               VALIDATE ROLE
            ============================================= */

            if (
                role !== "customer" &&
                role !== "admin"
            ) {

                await supabase.auth.signOut();

                clearLocalLoginData();

                throw new Error(
                    "Your account has an invalid role. Please contact the administrator."
                );
            }

            /* =============================================
               CUSTOMER LOGIN
            ============================================= */

            if (
                role === "customer"
            ) {

                saveUserData(
                    user,
                    profile,
                    role
                );

                showMessage(
                    "Login successful. Redirecting...",
                    "success"
                );

                setTimeout(
                    () => {

                        window.location.href =
                            "./customer/customer-home.html";

                    },
                    700
                );

                return;
            }

            /* =============================================
               ADMIN LOGIN
            ============================================= */

            if (
                role === "admin"
            ) {

                /* =========================================
                   PENDING
                ========================================= */

                if (
                    status === "pending"
                ) {

                    await supabase.auth.signOut();

                    clearLocalLoginData();

                    throw new Error(
                        "Your admin account is still pending approval. An existing administrator must approve your account before you can log in."
                    );
                }

                /* =========================================
                   REJECTED
                ========================================= */

                if (
                    status === "rejected" ||
                    status === "declined"
                ) {

                    await supabase.auth.signOut();

                    clearLocalLoginData();

                    throw new Error(
                        "Your admin registration request was not approved. Please contact an administrator."
                    );
                }

                /* =========================================
                   APPROVED
                ========================================= */

                if (
                    status === "approved"
                ) {

                    saveUserData(
                        user,
                        profile,
                        role
                    );

                    showMessage(
                        "Admin login successful. Redirecting...",
                        "success"
                    );

                    setTimeout(
                        () => {

                            window.location.href =
                                "./admin.html";

                        },
                        700
                    );

                    return;
                }

                /* =========================================
                   UNKNOWN STATUS
                ========================================= */

                await supabase.auth.signOut();

                clearLocalLoginData();

                throw new Error(
                    "Your admin account has an invalid status. Please contact the administrator."
                );
            }

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            let message =
                "Unable to login. Please try again.";

            const errorText =
                String(
                    error?.message ||
                    ""
                )
                    .toLowerCase();

            if (
                errorText.includes(
                    "invalid login credentials"
                )
            ) {

                message =
                    "Incorrect email or password.";

            } else if (
                errorText.includes(
                    "email not confirmed"
                )
            ) {

                message =
                    "Please confirm your email before logging in.";

            } else if (
                errorText.includes(
                    "still pending approval"
                )
            ) {

                message =
                    "Your admin account is still pending approval. An existing administrator must approve your account before you can log in.";

            } else if (
                errorText.includes(
                    "was not approved"
                )
            ) {

                message =
                    "Your admin registration request was not approved. Please contact the administrator.";

            } else if (
                errorText.includes(
                    "invalid status"
                )
            ) {

                message =
                    "Your account has an invalid status. Please contact the administrator.";

            } else if (
                errorText.includes(
                    "profile was not found"
                )
            ) {

                message =
                    "Your account profile was not found. Please contact the administrator.";

            } else if (
                errorText.includes(
                    "unable to load your account profile"
                )
            ) {

                message =
                    "Unable to load your account profile. Please try again.";

            } else if (
                errorText.includes(
                    "invalid role"
                )
            ) {

                message =
                    "Your account has an invalid role. Please contact the administrator.";

            } else if (
                errorText.includes(
                    "invalid api key"
                )
            ) {

                message =
                    "Supabase API key is invalid. Please check supabase.js.";

            } else if (
                errorText.includes(
                    "network"
                ) ||
                errorText.includes(
                    "fetch"
                ) ||
                errorText.includes(
                    "failed to fetch"
                )
            ) {

                message =
                    "Network error. Please check your internet connection.";

            } else if (
                error?.message
            ) {

                message =
                    error.message;
            }

            showMessage(
                message,
                "error"
            );

        } finally {

            loginBtn.disabled = false;

            loginBtn.textContent =
                "Login";
        }
    }
);

