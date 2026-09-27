
/* =========================================================
   BUSINESS STORE
   ADMIN PAGE GUARD
   ========================================================= */

import { supabase } from "./supabase.js";


/* =========================================================
   CHECK ADMIN ACCESS
========================================================= */

async function checkAdminAccess() {

    try {

        console.log("[ADMIN GUARD] START");


        /* -------------------------------------------------
           CHECK CURRENT SESSION
        ------------------------------------------------- */

        const {
            data: {
                session
            },
            error: sessionError
        } = await supabase.auth.getSession();


        if (sessionError) {

            console.error(
                "[ADMIN GUARD] Session error:",
                sessionError
            );

            window.location.replace("./index.html");

            return;
        }


        /* -------------------------------------------------
           NO LOGIN
        ------------------------------------------------- */

        if (!session || !session.user) {

            console.log(
                "[ADMIN GUARD] No logged-in user."
            );

            window.location.replace("./index.html");

            return;
        }


        const user = session.user;


        console.log(
            "[ADMIN GUARD] Logged in:",
            user.email
        );


        /* -------------------------------------------------
           GET PROFILE ROLE
        ------------------------------------------------- */

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("id, email, full_name, role")
            .eq("id", user.id)
            .single();


        /* -------------------------------------------------
           PROFILE ERROR
        ------------------------------------------------- */

        if (profileError) {

            console.error(
                "[ADMIN GUARD] Profile error:",
                profileError
            );

            window.location.replace("./index.html");

            return;
        }


        /* -------------------------------------------------
           PROFILE NOT FOUND
        ------------------------------------------------- */

        if (!profile) {

            console.log(
                "[ADMIN GUARD] No profile."
            );

            window.location.replace("./index.html");

            return;
        }


        /* -------------------------------------------------
           GET ROLE
        ------------------------------------------------- */

        const role = String(
            profile.role || ""
        )
            .trim()
            .toLowerCase();


        console.log(
            "[ADMIN GUARD] Profile role:",
            role
        );


        /* -------------------------------------------------
           ONLY ADMIN IS ALLOWED
        ------------------------------------------------- */

        if (role !== "admin") {

            console.warn(
                "[ADMIN GUARD] CUSTOMER ACCESS DENIED."
            );

            /*
             * IMPORTANT:
             * Sign out is NOT required here.
             * We only prevent access to the admin page.
             */

            window.location.replace("./index.html");

            return;
        }


        /* -------------------------------------------------
           ADMIN ACCESS GRANTED
        ------------------------------------------------- */

        console.log(
            "[ADMIN GUARD] ADMIN ACCESS GRANTED."
        );


        window.currentAdmin = {

            id: profile.id,

            email:
                profile.email ||
                user.email,

            full_name:
                profile.full_name || "",

            role: "admin"

        };


    } catch (error) {

        console.error(
            "[ADMIN GUARD] Unexpected error:",
            error
        );

        window.location.replace("./index.html");
    }
}


/* =========================================================
   RUN
========================================================= */

checkAdminAccess();

