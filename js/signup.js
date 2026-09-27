import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   GET FORM ELEMENTS
========================================================= */

const signupForm =
    document.getElementById("signupForm");

const signupBtn =
    document.getElementById("signupBtn");

const signupResult =
    document.getElementById("signupResult");

const fullNameInput =
    document.getElementById("fullName");

const emailInput =
    document.getElementById("email");

const phoneInput =
    document.getElementById("phone");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");


/* =========================================================
   CHECK REQUIRED ELEMENTS
========================================================= */

if (
    !signupForm ||
    !signupBtn ||
    !signupResult ||
    !fullNameInput ||
    !emailInput ||
    !phoneInput ||
    !passwordInput ||
    !confirmPasswordInput
) {
    console.error(
        "SIGNUP ERROR: Required HTML elements are missing."
    );

    throw new Error(
        "Signup HTML elements do not match signup.js."
    );
}


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(message, type = "") {

    signupResult.textContent = message;

    signupResult.className =
        `result ${type}`;
}


/* =========================================================
   SIGN UP
========================================================= */

signupForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        /* =================================================
           PREVENT DOUBLE SUBMISSION
        ================================================= */

        if (signupBtn.disabled) {
            return;
        }


        /* =================================================
           GET VALUES
        ================================================= */

        const fullName =
            fullNameInput.value.trim();

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const phone =
            phoneInput.value.trim();

        const password =
            passwordInput.value;

        const confirmPassword =
            confirmPasswordInput.value;


        /* =================================================
           VALIDATION
        ================================================= */

        if (
            !fullName ||
            !email ||
            !phone ||
            !password ||
            !confirmPassword
        ) {

            showMessage(
                "Please complete all fields.",
                "error"
            );

            return;
        }


        if (fullName.length < 2) {

            showMessage(
                "Please enter your full name.",
                "error"
            );

            fullNameInput.focus();

            return;
        }


        if (password.length < 6) {

            showMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            passwordInput.focus();

            return;
        }


        if (password !== confirmPassword) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            confirmPasswordInput.focus();

            return;
        }


        /* =================================================
           LOADING
        ================================================= */

        signupBtn.disabled = true;

        signupBtn.textContent =
            "Creating Account...";

        showMessage(
            "Creating your customer account...",
            "info"
        );


        try {

            /* =================================================
               CREATE CUSTOMER AUTH ACCOUNT

               IMPORTANT:
               The profile is now created automatically
               by the Supabase database trigger.

               We DO NOT manually insert into profiles here.
            ================================================= */

            const {
                data,
                error
            } = await supabase.auth.signUp({

                email: email,

                password: password,

                options: {

                    data: {
                        full_name: fullName,
                        phone: phone
                    }

                }

            });


            /* =================================================
               AUTH ERROR
            ================================================= */

            if (error) {
                throw error;
            }


            /* =================================================
               CHECK USER
            ================================================= */

            const user =
                data?.user;


            if (!user) {

                throw new Error(
                    "Account could not be created."
                );
            }


            console.log(
                "CUSTOMER AUTH ACCOUNT CREATED:",
                user.id
            );


            /* =================================================
               PROFILE IS CREATED BY DATABASE TRIGGER

               Expected profile:

               id    = user.id
               name  = fullName
               email = email
               phone = phone
               role  = customer
            ================================================= */

            console.log(
                "CUSTOMER PROFILE WILL BE CREATED AUTOMATICALLY BY SUPABASE TRIGGER."
            );


            /* =================================================
               SUCCESS
            ================================================= */

            signupForm.reset();


            if (data.session) {

                showMessage(
                    "Account created successfully! You can now login.",
                    "success"
                );

            } else {

                showMessage(
                    "Account created successfully! Please check your email to confirm your account.",
                    "success"
                );
            }


            /* =================================================
               RETURN TO LOGIN
            ================================================= */

            setTimeout(() => {

                window.location.replace(
                    "./login.html"
                );

            }, 2500);


        } catch (error) {

            console.error(
                "CUSTOMER SIGNUP ERROR:",
                error
            );


            let message =
                "Unable to create your account. Please try again.";


            const errorText =
                String(
                    error?.message || ""
                ).toLowerCase();


            /* =================================================
               EMAIL ALREADY EXISTS
            ================================================= */

            if (
                errorText.includes(
                    "already registered"
                ) ||
                errorText.includes(
                    "already exists"
                ) ||
                errorText.includes(
                    "user already registered"
                )
            ) {

                message =
                    "This email is already registered. Please login instead.";
            }


            /* =================================================
               INVALID EMAIL
            ================================================= */

            else if (
                errorText.includes(
                    "invalid email"
                )
            ) {

                message =
                    "Please enter a valid email address.";
            }


            /* =================================================
               PASSWORD ERROR
            ================================================= */

            else if (
                errorText.includes(
                    "password"
                )
            ) {

                message =
                    "Password must be at least 6 characters.";
            }


            /* =================================================
               RLS ERROR
            ================================================= */

            else if (
                errorText.includes(
                    "row-level security"
                ) ||
                errorText.includes(
                    "42501"
                ) ||
                errorText.includes(
                    "permission denied"
                )
            ) {

                message =
                    "The customer account was created, but the Supabase profile trigger or database permissions need to be fixed.";
            }


            /* =================================================
               NETWORK ERROR
            ================================================= */

            else if (
                errorText.includes(
                    "failed to fetch"
                ) ||
                errorText.includes(
                    "network"
                )
            ) {

                message =
                    "Network error. Please check your internet connection.";
            }


            /* =================================================
               OTHER ERROR
            ================================================= */

            else if (error?.message) {

                message =
                    error.message;
            }


            showMessage(
                message,
                "error"
            );


        } finally {

            /* =================================================
               ENABLE BUTTON
            ================================================= */

            signupBtn.disabled = false;

            signupBtn.textContent =
                "Create Customer Account";
        }

    }
);