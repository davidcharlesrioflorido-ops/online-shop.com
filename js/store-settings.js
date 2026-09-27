/* =====================================================
   STORE SETTINGS
   Customer-Side Shop Settings Loader
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

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);


/* =====================================================
   LOAD SHOP SETTINGS
===================================================== */

async function loadShopSettings() {

    try {

        console.log(
            "LOADING STORE SETTINGS..."
        );

        const {
            data,
            error
        } = await supabase
            .from("shop_settings")
            .select("*")
            .order("created_at", {
                ascending: true
            })
            .limit(1)
            .maybeSingle();

        if (error) {

            console.error(
                "SHOP SETTINGS ERROR:",
                error
            );

            return null;
        }

        if (!data) {

            console.warn(
                "NO SHOP SETTINGS FOUND."
            );

            return null;
        }

        console.log(
            "STORE SETTINGS LOADED:",
            data
        );

        return data;

    } catch (error) {

        console.error(
            "STORE SETTINGS ERROR:",
            error
        );

        return null;
    }
}


/* =====================================================
   SET TEXT
===================================================== */

function setText(
    selector,
    value
) {

    document
        .querySelectorAll(selector)
        .forEach(element => {

            if (
                value !== null &&
                value !== undefined &&
                value !== ""
            ) {

                element.textContent =
                    value;

            }

        });
}


/* =====================================================
   SET CONTACT INFORMATION
===================================================== */

function setContactLink(
    selector,
    value,
    prefix
) {

    document
        .querySelectorAll(selector)
        .forEach(element => {

            if (!value) {
                return;
            }

            element.textContent =
                value;

            if (
                element.tagName === "A"
            ) {

                element.href =
                    `${prefix}${value}`;

            }

        });
}


/* =====================================================
   SET SHOP LOGO
===================================================== */

function setShopLogo(
    settings
) {

    const logoUrl =
        String(
            settings?.logo_url || ""
        ).trim();

    document
        .querySelectorAll(
            "[data-shop-logo]"
        )
        .forEach(image => {

            const logoBox =
                image.closest(
                    ".logo-icon"
                );

            const fallback =
                logoBox?.querySelector(
                    ".logo-fallback"
                );


            /* =================================================
               ADMIN SETTINGS HAS LOGO
            ================================================= */

            if (logoUrl) {

                image.src =
                    logoUrl;

                image.alt =
                    "Shop Logo";

                image.style.display =
                    "block";


                if (fallback) {

                    fallback.style.display =
                        "none";

                }


                if (logoBox) {

                    logoBox.classList.add(
                        "has-shop-logo"
                    );

                }


                console.log(
                    "SHOP LOGO APPLIED:",
                    logoUrl
                );

            }


            /* =================================================
               NO LOGO
            ================================================= */

            else {

                image.removeAttribute(
                    "src"
                );

                image.style.display =
                    "none";


                if (fallback) {

                    fallback.style.display =
                        "flex";

                }


                if (logoBox) {

                    logoBox.classList.remove(
                        "has-shop-logo"
                    );

                }


                console.log(
                    "NO SHOP LOGO. USING DEFAULT ✦."
                );

            }

        });
}


/* =====================================================
   SET SHOP BANNER
===================================================== */

function setShopBanner(
    settings
) {

    document
        .querySelectorAll(
            "[data-shop-banner]"
        )
        .forEach(element => {

            const bannerUrl =
                String(
                    settings?.banner_url || ""
                ).trim();


            /* =================================================
               NO BANNER
            ================================================= */

            if (!bannerUrl) {

                element.classList.remove(
                    "has-shop-banner"
                );


                element.style.removeProperty(
                    "--shop-banner-image"
                );


                element.style.removeProperty(
                    "background-image"
                );


                const existingImage =
                    element.querySelector(
                        ".products-hero-banner-image"
                    );


                if (existingImage) {

                    existingImage.remove();

                }


                const heroContent =
                    element.querySelector(
                        ".products-hero-content"
                    );


                if (heroContent) {

                    heroContent.style.display =
                        "";

                }


                console.log(
                    "NO SHOP BANNER."
                );

                return;
            }


            /* =================================================
               BANNER EXISTS
            ================================================= */

            element.classList.add(
                "has-shop-banner"
            );


            /*
             * Store image URL as CSS variable.
             * The CSS uses this for the blurred
             * background behind the real image.
             */

            element.style.setProperty(
                "--shop-banner-image",
                `url("${bannerUrl}")`
            );


            /* =================================================
               HIDE DEFAULT HERO CONTENT
            ================================================= */

            const heroContent =
                element.querySelector(
                    ".products-hero-content"
                );


            if (heroContent) {

                heroContent.style.display =
                    "none";

            }


            /* =================================================
               CREATE / FIND REAL BANNER IMAGE
            ================================================= */

            let bannerImage =
                element.querySelector(
                    ".products-hero-banner-image"
                );


            if (!bannerImage) {

                bannerImage =
                    document.createElement(
                        "img"
                    );

                bannerImage.className =
                    "products-hero-banner-image";

                bannerImage.alt =
                    "Shop Banner";

                element.appendChild(
                    bannerImage
                );

            }


            /* =================================================
               IMAGE LOAD
            ================================================= */

            bannerImage.onload =
                () => {

                    console.log(
                        "SHOP BANNER LOADED:",
                        bannerImage.naturalWidth,
                        "x",
                        bannerImage.naturalHeight
                    );


                    const width =
                        bannerImage.naturalWidth;

                    const height =
                        bannerImage.naturalHeight;


                    if (
                        width > 0 &&
                        height > 0
                    ) {

                        const ratio =
                            width / height;


                        element.style.setProperty(
                            "--shop-banner-ratio",
                            ratio
                        );


                        console.log(
                            "SHOP BANNER RATIO:",
                            ratio
                        );

                    }

                };


            /* =================================================
               IMAGE ERROR
            ================================================= */

            bannerImage.onerror =
                () => {

                    console.error(
                        "SHOP BANNER FAILED TO LOAD:",
                        bannerUrl
                    );

                };


            /* =================================================
               LOAD IMAGE
            ================================================= */

            bannerImage.src =
                bannerUrl;

            bannerImage.loading =
                "eager";

            bannerImage.decoding =
                "async";


            console.log(
                "SHOP BANNER APPLIED:",
                bannerUrl
            );

        });
}


/* =====================================================
   SET ANNOUNCEMENT
===================================================== */

function setAnnouncement(
    settings
) {

    document
        .querySelectorAll(
            "[data-shop-announcement]"
        )
        .forEach(element => {

            const enabled =
                settings.announcement_enabled === true;


            const announcement =
                String(
                    settings.announcement || ""
                ).trim();


            if (
                enabled &&
                announcement
            ) {

                element.textContent =
                    announcement;

                element.style.display =
                    "block";

            } else {

                element.textContent =
                    "";

                element.style.display =
                    "none";

            }

        });
}


/* =====================================================
   SET PAYMENT INSTRUCTIONS
===================================================== */

function setPaymentInstructions(
    settings
) {

    document
        .querySelectorAll(
            "[data-payment-instructions]"
        )
        .forEach(container => {

            const instructions =
                String(
                    settings.payment_instructions || ""
                ).trim();


            if (!instructions) {

                container.replaceChildren();

                return;
            }


            const lines =
                instructions
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean);


            container.replaceChildren();


            const list =
                document.createElement(
                    "ol"
                );


            lines.forEach(line => {

                const item =
                    document.createElement(
                        "li"
                    );


                item.textContent =
                    line;


                list.appendChild(
                    item
                );

            });


            container.appendChild(
                list
            );

        });
}


/* =====================================================
   FORMAT PHP CURRENCY
===================================================== */

function formatCurrency(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP"
        }
    );
}


/* =====================================================
   APPLY ALL SHOP SETTINGS
===================================================== */

function applyShopSettings(
    settings
) {

    if (!settings) {
        return;
    }


    /* =================================================
       SHOP INFORMATION
    ================================================= */

    setText(
        "[data-shop-name]",
        settings.shop_name
    );


    setText(
        "[data-shop-description]",
        settings.shop_description
    );


    setText(
        "[data-shop-address]",
        settings.shop_address
    );


    setContactLink(
        "[data-shop-email]",
        settings.shop_email,
        "mailto:"
    );


    setContactLink(
        "[data-shop-phone]",
        settings.shop_phone,
        "tel:"
    );


    /* =================================================
       LOGO
    ================================================= */

    setShopLogo(
        settings
    );


    /* =================================================
       BANNER
    ================================================= */

    setShopBanner(
        settings
    );


    /* =================================================
       ANNOUNCEMENT
    ================================================= */

    setAnnouncement(
        settings
    );


    /* =================================================
       GCASH
    ================================================= */

    setText(
        "[data-gcash-name]",
        settings.gcash_name
    );


    setText(
        "[data-gcash-number]",
        settings.gcash_number
    );


    /* =================================================
       PAYMENT INSTRUCTIONS
    ================================================= */

    setPaymentInstructions(
        settings
    );


    /* =================================================
       DELIVERY
    ================================================= */

    setText(
        "[data-delivery-information]",
        settings.delivery_information
    );


    setText(
        "[data-delivery-fee]",
        formatCurrency(
            settings.delivery_fee
        )
    );


    setText(
        "[data-minimum-order]",
        formatCurrency(
            settings.minimum_order
        )
    );


    /* =================================================
       PAGE TITLE
    ================================================= */

    if (
        settings.shop_name
    ) {

        document.title =
            document.title.replace(
                "Business Store",
                settings.shop_name
            );

    }


    /* =================================================
       GLOBAL SETTINGS
    ================================================= */

    window.shopSettings =
        settings;


    console.log(
        "SHOP SETTINGS APPLIED SUCCESSFULLY."
    );
}


/* =====================================================
   INITIALIZE
===================================================== */

async function initializeStoreSettings() {

    const settings =
        await loadShopSettings();


    if (!settings) {
        return;
    }


    applyShopSettings(
        settings
    );
}


/* =====================================================
   START
===================================================== */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeStoreSettings
    );

} else {

    initializeStoreSettings();

}