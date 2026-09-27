/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

import { supabase } from "./supabase.js";

console.log("=================================");
console.log("ADMIN-AUTH.JS LOADED");
console.log("=================================");


/* =========================================================
   ELEMENTS
   ========================================================= */

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const loginResult = document.getElementById("loginResult");


/* =========================================================
   IMPORTANT
   ---------------------------------------------------------
   This file is ONLY for the admin login page.
   It must NOT control customer pages.
   ========================================================= */

if (!adminLoginForm) {

    console.log(
        "ADMIN-AUTH: No admin login form found."
    );

} else {


    /* =====================================================
       CHECK REQUIRED ELEMENTS
       ===================================================== */

    if (
        !adminEmail ||
        !adminPassword ||
        !loginBtn ||
        !loginResult
    ) {

        console.error(
            "ADMIN AUTH ERROR: Missing login elements."
        );

        throw new Error(
            "Admin login HTML elements do not match admin-auth.js."
        );
    }


    /* =====================================================
       SHOW LOGIN RESULT
       ===================================================== */

    function showResult(message, type = "") {

        loginResult.textContent = message;
        loginResult.className = `result ${type}`;
    }


    /* =====================================================
       LOADING STATE
       ===================================================== */

    function setLoading(loading) {

        if (loading) {

            loginBtn.disabled = true;

            loginBtn.dataset.originalText =
                loginBtn.textContent;

            loginBtn.textContent =
                "Signing in...";

        } else {

            loginBtn.disabled = false;

            loginBtn.textContent =
                loginBtn.dataset.originalText ||
                "Login";
        }
    }


    /* =====================================================
       CLEAR OLD ADMIN LOCAL DATA
       ===================================================== */

    function clearAdminLocalData() {

        const keys = [
            "userId",
            "userName",
            "userEmail",
            "userPhone",
            "userRole",

            "adminUserId",
            "adminName",
            "adminEmail"
        ];

        keys.forEach(key => {
            localStorage.removeItem(key);
        });
    }


    /* =====================================================
       SAVE ADMIN DATA
       ===================================================== */

    function saveAdminData(user, profile) {

        const name =
            profile?.name ||
            profile?.full_name ||
            "";

        const email =
            profile?.email ||
            user?.email ||
            "";

        const phone =
            profile?.phone ||
            "";


        /* -------------------------------------------------
           GENERAL USER DATA
           ------------------------------------------------- */

        localStorage.setItem(
            "userId",
            user.id
        );

        localStorage.setItem(
            "userName",
            name
        );

        localStorage.setItem(
            "userEmail",
            email
        );

        localStorage.setItem(
            "userPhone",
            phone
        );

        localStorage.setItem(
            "userRole",
            "admin"
        );


        /* -------------------------------------------------
           ADMIN DATA
           ------------------------------------------------- */

        localStorage.setItem(
            "adminUserId",
            user.id
        );

        localStorage.setItem(
            "adminName",
            name
        );

        localStorage.setItem(
            "adminEmail",
            email
        );
    }


    /* =====================================================
       ADMIN LOGIN
       ===================================================== */

    adminLoginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (loginBtn.disabled) {
                return;
            }


            /* =============================================
               GET FORM VALUES
               ============================================= */

            const email =
                adminEmail.value
                    .trim()
                    .toLowerCase();

            const password =
                adminPassword.value || "";


            /* =============================================
               VALIDATION
               ============================================= */

            if (!email) {

                showResult(
                    "Please enter your admin email.",
                    "error"
                );

                adminEmail.focus();

                return;
            }


            if (!password) {

                showResult(
                    "Please enter your password.",
                    "error"
                );

                adminPassword.focus();

                return;
            }


            setLoading(true);

            showResult(
                "Signing you in...",
                "info"
            );


            try {

                /* =========================================
                   REMOVE ONLY OLD LOCAL ADMIN DATA

                   IMPORTANT:
                   We DO NOT call supabase.auth.signOut()
                   here because it can unnecessarily destroy
                   an existing Supabase session.
                   ========================================= */

                clearAdminLocalData();


                /* =========================================
                   LOGIN
                   ========================================= */

                const {
                    data,
                    error
                } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });


                if (error) {
                    throw error;
                }


                const user =
                    data?.user;

                const session =
                    data?.session;


                /* =========================================
                   CHECK USER
                   ========================================= */

                if (!user) {

                    throw new Error(
                        "Unable to get your admin account."
                    );
                }


                if (!session) {

                    throw new Error(
                        "Supabase did not create a login session."
                    );
                }


                console.log(
                    "ADMIN AUTH USER:",
                    user.id
                );


                /* =========================================
                   GET ADMIN PROFILE
                   ========================================= */

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
                        .eq("id", user.id)
                        .maybeSingle();


                if (profileError) {

                    console.error(
                        "PROFILE DATABASE ERROR:",
                        profileError
                    );

                    throw new Error(
                        "Unable to load your admin profile."
                    );
                }


                /* =========================================
                   PROFILE NOT FOUND
                   ========================================= */

                if (!profile) {

                    throw new Error(
                        "Admin profile was not found. Please contact the administrator."
                    );
                }


                /* =========================================
                   CHECK ROLE
                   ========================================= */

                const role =
                    String(profile.role || "")
                        .trim()
                        .toLowerCase();


                if (role !== "admin") {

                    throw new Error(
                        "Access denied. This account is not an administrator."
                    );
                }


                /* =========================================
                   CHECK STATUS
                   ========================================= */

                const status =
                    String(profile.status || "")
                        .trim()
                        .toLowerCase();


                if (status === "pending") {

                    throw new Error(
                        "Your admin account is still pending approval."
                    );
                }


                if (
                    status === "rejected" ||
                    status === "declined"
                ) {

                    throw new Error(
                        "Your admin registration request was not approved."
                    );
                }


                if (status !== "approved") {

                    throw new Error(
                        "Your admin account has an invalid approval status."
                    );
                }


                /* =========================================
                   SAVE ADMIN INFORMATION
                   ========================================= */

                saveAdminData(
                    user,
                    profile
                );


                /* =========================================
                   VERIFY SESSION
                   ========================================= */

                const {
                    data: sessionCheck,
                    error: sessionError
                } =
                    await supabase.auth.getSession();


                if (sessionError) {

                    throw new Error(
                        "Unable to verify your login session."
                    );
                }


                if (!sessionCheck?.session) {

                    throw new Error(
                        "Your login session could not be verified."
                    );
                }


                console.log(
                    "ADMIN SESSION VERIFIED"
                );


                console.log(
                    "ADMIN LOGIN SUCCESS"
                );


                /* =========================================
                   SUCCESS
                   ========================================= */

                showResult(
                    "Admin login successful. Redirecting...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "./admin.html";

                }, 500);


            } catch (error) {

                console.error(
                    "ADMIN LOGIN ERROR:",
                    error
                );


                const errorText =
                    String(error?.message || "")
                        .toLowerCase();


                let message =
                    "Admin login failed. Please try again.";


                /* =========================================
                   ERROR MESSAGES
                   ========================================= */

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
                        "pending approval"
                    )
                ) {

                    message =
                        "Your admin account is still pending approval.";

                } else if (
                    errorText.includes(
                        "not approved"
                    )
                ) {

                    message =
                        "Your admin registration request was not approved.";

                } else if (
                    errorText.includes(
                        "profile was not found"
                    )
                ) {

                    message =
                        "Admin profile was not found.";

                } else if (
                    errorText.includes(
                        "not an administrator"
                    )
                ) {

                    message =
                        "Access denied. This account is not an administrator.";

                } else if (
                    errorText.includes(
                        "invalid approval status"
                    )
                ) {

                    message =
                        "Your admin account has an invalid approval status.";

                } else if (
                    errorText.includes(
                        "failed to fetch"
                    ) ||
                    errorText.includes(
                        "network"
                    )
                ) {

                    message =
                        "Network error. Please check your internet connection.";

                } else if (error?.message) {

                    message =
                        error.message;
                }


                showResult(
                    message,
                    "error"
                );


                /* =========================================
                   IF ADMIN LOGIN FAILED AFTER AUTH SESSION
                   WAS CREATED, CLEAN IT UP
                   ========================================= */

                const shouldSignOut =
                    errorText.includes("not an administrator") ||
                    errorText.includes("pending approval") ||
                    errorText.includes("not approved") ||
                    errorText.includes("invalid approval status") ||
                    errorText.includes("profile was not found") ||
                    errorText.includes("unable to load your admin profile");


                if (shouldSignOut) {

                    try {

                        await supabase.auth.signOut();

                    } catch (signOutError) {

                        console.error(
                            "ADMIN CLEANUP SIGNOUT ERROR:",
                            signOutError
                        );
                    }

                    clearAdminLocalData();
                }

            } finally {

                setLoading(false);
            }
        }
    );
}