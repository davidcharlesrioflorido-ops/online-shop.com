/* =========================================================
   CUSTOMER AUTHENTICATION
   ---------------------------------------------------------
   CUSTOMER ONLY

   Admin authentication is handled separately by:
   admin-auth.js
   ========================================================= */

import { supabase } from "./supabase.js";


/* =========================================================
   CUSTOMER LOGIN PAGE
   ========================================================= */

function getCustomerLoginUrl() {

    const currentPath =
        window.location.pathname;

    const folder =
        currentPath.substring(
            0,
            currentPath.lastIndexOf("/") + 1
        );

    return (
        folder +
        "customer%20login.html"
    );
}


/* =========================================================
   GET CURRENT SESSION
   ========================================================= */

export async function getCurrentSession() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "GET SESSION ERROR:",
                error
            );

            return null;
        }


        return data?.session || null;

    } catch (error) {

        console.error(
            "GET SESSION EXCEPTION:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET CURRENT AUTH USER
   ========================================================= */

export async function getCurrentUser() {

    const session =
        await getCurrentSession();


    return session?.user || null;
}


/* =========================================================
   GET CURRENT CUSTOMER PROFILE
   ========================================================= */

export async function getCurrentProfile() {

    const user =
        await getCurrentUser();


    if (!user) {

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    phone,
                    address,
                    city,
                    province,
                    postal_code,
                    role,
                    status,
                    avatar_url,
                    avatar_path
                `)
                .eq("id", user.id)
                .maybeSingle();


        if (error) {

            console.error(
                "GET CUSTOMER PROFILE ERROR:",
                error
            );

            return null;
        }


        return data || null;

    } catch (error) {

        console.error(
            "GET CUSTOMER PROFILE EXCEPTION:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET CURRENT CUSTOMER
   ---------------------------------------------------------
   Returns auth user + profile information.
   ========================================================= */

export async function getCurrentCustomer() {

    const user =
        await getCurrentUser();


    if (!user) {

        return null;
    }


    const profile =
        await getCurrentProfile();


    return {

        user,

        profile,

        id:
            user.id,

        email:
            profile?.email ||
            user.email ||
            "",

        name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Customer",

        full_name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",

        phone:
            profile?.phone ||
            "",

        address:
            profile?.address ||
            "",

        city:
            profile?.city ||
            "",

        province:
            profile?.province ||
            "",

        postal_code:
            profile?.postal_code ||
            "",

        role:
            profile?.role ||
            "customer",

        status:
            profile?.status ||
            "",

        avatar_url:
            profile?.avatar_url ||
            "",

        avatar_path:
            profile?.avatar_path ||
            ""
    };
}


/* =========================================================
   CHECK LOGIN
   ---------------------------------------------------------
   Does NOT redirect.
   ========================================================= */

export async function isLoggedIn() {

    const session =
        await getCurrentSession();


    return !!session?.user;
}


/* =========================================================
   CHECK CUSTOMER SESSION
   ---------------------------------------------------------
   Does NOT redirect.
   Useful for navigation/header.
   ========================================================= */

export async function checkCustomerSession() {

    const session =
        await getCurrentSession();


    if (!session?.user) {

        return null;
    }


    return session.user;
}


/* =========================================================
   SAVE LOGIN REDIRECT
   ========================================================= */

export function saveLoginRedirect() {

    const currentPage =
        window.location.pathname +
        window.location.search +
        window.location.hash;


    sessionStorage.setItem(
        "businessStoreLoginRedirect",
        currentPage
    );
}


/* =========================================================
   GET LOGIN REDIRECT
   ========================================================= */

export function getLoginRedirect() {

    return sessionStorage.getItem(
        "businessStoreLoginRedirect"
    );
}


/* =========================================================
   CLEAR LOGIN REDIRECT
   ========================================================= */

export function clearLoginRedirect() {

    sessionStorage.removeItem(
        "businessStoreLoginRedirect"
    );
}


/* =========================================================
   REQUIRE LOGIN
   ---------------------------------------------------------
   ONLY use for protected ACTIONS:
   - Add to cart
   - Buy now
   - Checkout
   - Submit order
   ========================================================= */

export async function requireLogin() {

    const user =
        await getCurrentUser();


    if (user) {

        console.log(
            "CUSTOMER LOGGED IN:",
            user.email
        );

        return user;
    }


    console.log(
        "CUSTOMER NOT LOGGED IN → LOGIN"
    );


    saveLoginRedirect();


    window.location.href =
        getCustomerLoginUrl();


    return null;
}


/* =========================================================
   LOGOUT CUSTOMER
   ========================================================= */

export async function logoutUser() {

    try {

        const {
            error
        } =
            await supabase.auth.signOut();


        if (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

            return false;
        }


        clearLoginRedirect();


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


        console.log(
            "CUSTOMER LOGGED OUT"
        );


        return true;

    } catch (error) {

        console.error(
            "LOGOUT EXCEPTION:",
            error
        );

        return false;
    }
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

export function listenToAuthChanges(callback) {

    return supabase.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "CUSTOMER AUTH STATE:",
                event
            );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    event,
                    session
                );
            }
        }
    );
}


/* =========================================================
   GET CUSTOMER AVATAR
   ========================================================= */

export async function getCustomerAvatar() {

    const profile =
        await getCurrentProfile();


    return profile?.avatar_url || "";
}