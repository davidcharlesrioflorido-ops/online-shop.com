/* =====================================================
ADMIN SETTINGS
SHOP SETTINGS MANAGER
FINAL VERSION
WITH SEPARATE HOME PAGE BANNER
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
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true
}
}
);

/* =====================================================
CONSTANTS
===================================================== */

const SETTINGS_TABLE = "shop_settings";

const SHOP_ASSETS_BUCKET = "shop-assets";

const LOGO_FOLDER = "logo";
const BANNER_FOLDER = "banner";
const HOME_BANNER_FOLDER = "home-banner";
const GCASH_FOLDER = "gcash";

const MAX_IMAGE_SIZE =
5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
"image/jpeg",
"image/png",
"image/webp"
];

/* =====================================================
ELEMENTS
===================================================== */

/* MOBILE */

const mobileMenuBtn =
document.getElementById("mobileMenuBtn");

const mobileNav =
document.getElementById("mobileNav");

/* LOGOUT */

const logoutBtn =
document.getElementById("logoutBtn");

const mobileLogoutBtn =
document.getElementById("mobileLogoutBtn");

const settingsLogoutBtn =
document.getElementById("settingsLogoutBtn");

/* RESULT */

const settingsResult =
document.getElementById("settingsResult");

/* SAVE */

const saveSettingsBtn =
document.getElementById("saveSettingsBtn");

/* =====================================================
SHOP INFORMATION
===================================================== */

const shopName =
document.getElementById("shopName");

const shopDescription =
document.getElementById("shopDescription");

const shopEmail =
document.getElementById("shopEmail");

const shopPhone =
document.getElementById("shopPhone");

const shopAddress =
document.getElementById("shopAddress");

/* =====================================================
LOGO
===================================================== */

const shopLogo =
document.getElementById("shopLogo");

const logoPreview =
document.getElementById("logoPreview");

const removeLogoBtn =
document.getElementById("removeLogoBtn");

/* =====================================================
SHOP BANNER
Used for PRODUCTS PAGE
===================================================== */

const shopBanner =
document.getElementById("shopBanner");

const bannerPreview =
document.getElementById("bannerPreview");

const removeBannerBtn =
document.getElementById("removeBannerBtn");

/* =====================================================
HOME PAGE BANNER
Separate from Products Page Banner
===================================================== */

const homeBanner =
document.getElementById("homeBanner");

const homeBannerPreview =
document.getElementById("homeBannerPreview");

const removeHomeBannerBtn =
document.getElementById("removeHomeBannerBtn");

/* =====================================================
PAYMENT
===================================================== */

const gcashName =
document.getElementById("gcashName");

const gcashNumber =
document.getElementById("gcashNumber");

const paymentInstructions =
document.getElementById("paymentInstructions");

/* =====================================================
GCASH QR
===================================================== */

const gcashQr =
document.getElementById("gcashQr");

const gcashQrPreview =
document.getElementById("gcashQrPreview");

const removeGcashQrBtn =
document.getElementById("removeGcashQrBtn");

/* =====================================================
DELIVERY
===================================================== */

const deliveryFee =
document.getElementById("deliveryFee");

const minimumOrder =
document.getElementById("minimumOrder");

const deliveryInformation =
document.getElementById("deliveryInformation");

/* =====================================================
ANNOUNCEMENT
===================================================== */

const shopAnnouncement =
document.getElementById("shopAnnouncement");

const announcementEnabled =
document.getElementById("announcementEnabled");

/* =====================================================
STATE
===================================================== */

let currentSettings = null;

let removeLogo = false;
let removeBanner = false;
let removeHomeBanner = false;
let removeGcashQr = false;

/* =====================================================
SHOW RESULT
===================================================== */

function showResult(
message,
type = "success"
) {

if (!settingsResult) {
    return;
}

settingsResult.textContent =
    message;

settingsResult.className =
    `settings-result show ${type}`;

clearTimeout(
    showResult.timeout
);

showResult.timeout =
    setTimeout(() => {

        settingsResult.className =
            "settings-result";

        settingsResult.textContent = "";

    }, 5000);

}

/* =====================================================
REDIRECT LOGIN
===================================================== */

function redirectToLogin() {

window.location.replace(
    "login.html"
);

}

/* =====================================================
CHECK ADMIN SESSION
===================================================== */

async function checkAdminSession() {

try {

    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "SESSION CHECK ERROR:",
            error
        );

        redirectToLogin();

        return false;
    }


    if (!data?.session) {

        console.warn(
            "NO ADMIN SESSION."
        );

        redirectToLogin();

        return false;
    }


    console.log(
        "ADMIN SESSION ACTIVE:",
        data.session.user.email
    );


    return true;

} catch (error) {

    console.error(
        "ADMIN AUTH ERROR:",
        error
    );

    redirectToLogin();

    return false;
}

}

/* =====================================================
LOAD SHOP SETTINGS
===================================================== */

async function loadShopSettings() {

try {

    console.log(
        "LOADING SHOP SETTINGS..."
    );


    const {
        data,
        error
    } = await supabase
        .from(SETTINGS_TABLE)
        .select("*")
        .order(
            "created_at",
            {
                ascending: true
            }
        )
        .limit(1)
        .maybeSingle();


    if (error) {

        console.error(
            "LOAD SETTINGS ERROR:",
            error
        );

        throw new Error(
            error.message ||
            "Failed to load shop settings."
        );
    }


    if (!data) {

        console.warn(
            "NO SHOP SETTINGS FOUND."
        );

        currentSettings = null;

        resetAllFields();

        return;
    }


    currentSettings = data;


    console.log(
        "SHOP SETTINGS LOADED:",
        data
    );


    /* =================================================
       SHOP INFORMATION
    ================================================= */

    if (shopName) {

        shopName.value =
            data.shop_name || "";
    }


    if (shopDescription) {

        shopDescription.value =
            data.shop_description || "";
    }


    if (shopEmail) {

        shopEmail.value =
            data.shop_email || "";
    }


    if (shopPhone) {

        shopPhone.value =
            data.shop_phone || "";
    }


    if (shopAddress) {

        shopAddress.value =
            data.shop_address || "";
    }


    /* =================================================
       PAYMENT
    ================================================= */

    if (gcashName) {

        gcashName.value =
            data.gcash_name || "";
    }


    if (gcashNumber) {

        gcashNumber.value =
            data.gcash_number || "";
    }


    if (paymentInstructions) {

        paymentInstructions.value =
            data.payment_instructions || "";
    }


    /* =================================================
       GCASH QR
    ================================================= */

    if (data.gcash_qr_url) {

        setGcashQrPreview(
            data.gcash_qr_url
        );

    } else {

        resetGcashQrPreview();
    }


    /* =================================================
       DELIVERY
    ================================================= */

    if (deliveryFee) {

        deliveryFee.value =
            Number(
                data.delivery_fee ?? 0
            );
    }


    if (minimumOrder) {

        minimumOrder.value =
            Number(
                data.minimum_order ?? 0
            );
    }


    if (deliveryInformation) {

        deliveryInformation.value =
            data.delivery_information || "";
    }


    /* =================================================
       ANNOUNCEMENT
    ================================================= */

    if (shopAnnouncement) {

        shopAnnouncement.value =
            data.announcement || "";
    }


    if (announcementEnabled) {

        announcementEnabled.checked =
            Boolean(
                data.announcement_enabled
            );
    }


    /* =================================================
       LOGO
    ================================================= */

    if (data.logo_url) {

        setLogoPreview(
            data.logo_url
        );

    } else {

        resetLogoPreview();
    }


    /* =================================================
       SHOP BANNER
       PRODUCTS PAGE
    ================================================= */

    if (data.banner_url) {

        setBannerPreview(
            data.banner_url
        );

    } else {

        resetBannerPreview();
    }


    /* =================================================
       HOME PAGE BANNER
       INDEX PAGE
    ================================================= */

    if (data.home_banner_url) {

        setHomeBannerPreview(
            data.home_banner_url
        );

    } else {

        resetHomeBannerPreview();
    }


    /* =================================================
       RESET REMOVE STATES
    ================================================= */

    removeLogo = false;
    removeBanner = false;
    removeHomeBanner = false;
    removeGcashQr = false;


} catch (error) {

    console.error(
        "SHOP SETTINGS LOAD ERROR:",
        error
    );

    showResult(
        error.message ||
        "Unable to load shop settings.",
        "error"
    );
}

}

/* =====================================================
RESET ALL FIELDS
===================================================== */

function resetAllFields() {

if (shopName) {

    shopName.value = "";
}


if (shopDescription) {

    shopDescription.value = "";
}


if (shopEmail) {

    shopEmail.value = "";
}


if (shopPhone) {

    shopPhone.value = "";
}


if (shopAddress) {

    shopAddress.value = "";
}


if (gcashName) {

    gcashName.value = "";
}


if (gcashNumber) {

    gcashNumber.value = "";
}


if (paymentInstructions) {

    paymentInstructions.value = "";
}


if (deliveryFee) {

    deliveryFee.value = 0;
}


if (minimumOrder) {

    minimumOrder.value = 0;
}


if (deliveryInformation) {

    deliveryInformation.value = "";
}


if (shopAnnouncement) {

    shopAnnouncement.value = "";
}


if (announcementEnabled) {

    announcementEnabled.checked = false;
}


resetLogoPreview();
resetBannerPreview();
resetHomeBannerPreview();
resetGcashQrPreview();


removeLogo = false;
removeBanner = false;
removeHomeBanner = false;
removeGcashQr = false;

}

/* =====================================================
LOGO PREVIEW
===================================================== */

function setLogoPreview(url) {

if (!logoPreview) {

    return;
}


logoPreview.innerHTML = "";


const image =
    document.createElement("img");


image.src = url;

image.alt = "Shop Logo";


image.onload = () => {

    logoPreview.classList.add(
        "has-image"
    );
};


image.onerror = () => {

    resetLogoPreview();

    showResult(
        "Unable to load the shop logo preview.",
        "error"
    );
};


logoPreview.appendChild(
    image
);

}

function resetLogoPreview() {

if (!logoPreview) {

    return;
}


logoPreview.innerHTML =
    "<span>No Logo</span>";


logoPreview.style.backgroundImage =
    "";


logoPreview.classList.remove(
    "has-image"
);

}

/* =====================================================
SHOP BANNER PREVIEW
===================================================== */

function setBannerPreview(url) {

if (!bannerPreview) {

    return;
}


bannerPreview.innerHTML = "";


const image =
    document.createElement("img");


image.src = url;

image.alt = "Shop Banner";


image.onload = () => {

    bannerPreview.classList.add(
        "has-image"
    );
};


image.onerror = () => {

    resetBannerPreview();

    showResult(
        "Unable to load the shop banner preview.",
        "error"
    );
};


bannerPreview.appendChild(
    image
);

}

function resetBannerPreview() {

if (!bannerPreview) {

    return;
}


bannerPreview.innerHTML =
    "<span>No Banner</span>";


bannerPreview.style.backgroundImage =
    "";


bannerPreview.classList.remove(
    "has-image"
);

}

/* =====================================================
HOME PAGE BANNER PREVIEW
===================================================== */

function setHomeBannerPreview(url) {

if (!homeBannerPreview) {

    return;
}


homeBannerPreview.innerHTML = "";


const image =
    document.createElement("img");


image.src = url;

image.alt =
    "Home Page Banner";


image.onload = () => {

    homeBannerPreview.classList.add(
        "has-image"
    );
};


image.onerror = () => {

    resetHomeBannerPreview();

    showResult(
        "Unable to load the Home Page Banner preview.",
        "error"
    );
};


homeBannerPreview.appendChild(
    image
);

}

function resetHomeBannerPreview() {

if (!homeBannerPreview) {

    return;
}


homeBannerPreview.innerHTML =
    "<span>No Home Banner</span>";


homeBannerPreview.style.backgroundImage =
    "";


homeBannerPreview.classList.remove(
    "has-image"
);

}

/* =====================================================
GCASH QR PREVIEW
===================================================== */

function setGcashQrPreview(url) {

if (!gcashQrPreview) {

    return;
}


gcashQrPreview.innerHTML = "";


const image =
    document.createElement("img");


image.src = url;

image.alt =
    "GCash Payment QR Code";


image.onload = () => {

    gcashQrPreview.classList.add(
        "has-image"
    );
};


image.onerror = () => {

    resetGcashQrPreview();

    showResult(
        "Unable to load the GCash QR preview.",
        "error"
    );
};


gcashQrPreview.appendChild(
    image
);

}

function resetGcashQrPreview() {

if (!gcashQrPreview) {

    return;
}


gcashQrPreview.innerHTML =
    "<span>No GCash QR</span>";


gcashQrPreview.classList.remove(
    "has-image"
);

}

/* =====================================================
IMAGE VALIDATION
===================================================== */

function validateImageFile(file) {

if (!file) {

    return false;
}


if (
    !ALLOWED_IMAGE_TYPES.includes(
        file.type
    )
) {

    showResult(
        "Please upload a JPG, PNG, or WebP image.",
        "error"
    );

    return false;
}


if (
    file.size > MAX_IMAGE_SIZE
) {

    showResult(
        "Image must be smaller than 5MB.",
        "error"
    );

    return false;
}


return true;

}

/* =====================================================
FILE EXTENSION
===================================================== */

function getFileExtension(file) {

if (!file) {

    return "jpg";
}


if (
    file.type === "image/png"
) {

    return "png";
}


if (
    file.type === "image/webp"
) {

    return "webp";
}


return "jpg";

}

/* =====================================================
LOGO FILE PREVIEW
===================================================== */

shopLogo?.addEventListener(
"change",
() => {

    const file =
        shopLogo.files?.[0];


    if (!file) {

        return;
    }


    if (
        !validateImageFile(file)
    ) {

        shopLogo.value = "";

        return;
    }


    removeLogo = false;


    const reader =
        new FileReader();


    reader.onload = event => {

        setLogoPreview(
            event.target.result
        );
    };


    reader.onerror = () => {

        showResult(
            "Unable to preview the selected logo.",
            "error"
        );
    };


    reader.readAsDataURL(file);
}

);

/* =====================================================
SHOP BANNER FILE PREVIEW
===================================================== */

shopBanner?.addEventListener(
"change",
() => {

    const file =
        shopBanner.files?.[0];


    if (!file) {

        return;
    }


    if (
        !validateImageFile(file)
    ) {

        shopBanner.value = "";

        return;
    }


    removeBanner = false;


    const reader =
        new FileReader();


    reader.onload = event => {

        setBannerPreview(
            event.target.result
        );
    };


    reader.onerror = () => {

        showResult(
            "Unable to preview the selected banner.",
            "error"
        );
    };


    reader.readAsDataURL(file);
}

);

/* =====================================================
HOME PAGE BANNER FILE PREVIEW
===================================================== */

homeBanner?.addEventListener(
"change",
() => {

    const file =
        homeBanner.files?.[0];


    if (!file) {

        return;
    }


    if (
        !validateImageFile(file)
    ) {

        homeBanner.value = "";

        return;
    }


    removeHomeBanner = false;


    const reader =
        new FileReader();


    reader.onload = event => {

        setHomeBannerPreview(
            event.target.result
        );
    };


    reader.onerror = () => {

        showResult(
            "Unable to preview the selected Home Page Banner.",
            "error"
        );
    };


    reader.readAsDataURL(file);
}

);

/* =====================================================
GCASH QR FILE PREVIEW
===================================================== */

gcashQr?.addEventListener(
"change",
() => {

    const file =
        gcashQr.files?.[0];


    if (!file) {

        return;
    }


    if (
        !validateImageFile(file)
    ) {

        gcashQr.value = "";

        return;
    }


    removeGcashQr = false;


    const reader =
        new FileReader();


    reader.onload = event => {

        setGcashQrPreview(
            event.target.result
        );
    };


    reader.onerror = () => {

        showResult(
            "Unable to preview the selected GCash QR.",
            "error"
        );
    };


    reader.readAsDataURL(file);
}

);

/* =====================================================
REMOVE LOGO
===================================================== */

removeLogoBtn?.addEventListener(
"click",
() => {

    removeLogo = true;


    if (shopLogo) {

        shopLogo.value = "";
    }


    resetLogoPreview();


    showResult(
        "Logo marked for removal. Click Save Settings to apply.",
        "success"
    );
}

);

/* =====================================================
REMOVE SHOP BANNER
===================================================== */

removeBannerBtn?.addEventListener(
"click",
() => {

    removeBanner = true;


    if (shopBanner) {

        shopBanner.value = "";
    }


    resetBannerPreview();


    showResult(
        "Banner marked for removal. Click Save Settings to apply.",
        "success"
    );
}

);

/* =====================================================
REMOVE HOME PAGE BANNER
===================================================== */

removeHomeBannerBtn?.addEventListener(
"click",
() => {

    removeHomeBanner = true;


    if (homeBanner) {

        homeBanner.value = "";
    }


    resetHomeBannerPreview();


    showResult(
        "Home Page Banner marked for removal. Click Save Settings to apply.",
        "success"
    );
}

);

/* =====================================================
REMOVE GCASH QR
===================================================== */

removeGcashQrBtn?.addEventListener(
"click",
() => {

    removeGcashQr = true;


    if (gcashQr) {

        gcashQr.value = "";
    }


    resetGcashQrPreview();


    showResult(
        "GCash QR marked for removal. Click Save Settings to apply.",
        "success"
    );
}

);

/* =====================================================
UPLOAD SHOP IMAGE
===================================================== */

async function uploadShopImage(
file,
folder,
prefix
) {

if (!file) {

    return null;
}


const extension =
    getFileExtension(file);


const fileName =
    `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;


const filePath =
    `${folder}/${fileName}`;


console.log(
    "UPLOADING SHOP IMAGE:",
    filePath
);


const {
    error
} = await supabase
    .storage
    .from(SHOP_ASSETS_BUCKET)
    .upload(
        filePath,
        file,
        {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        }
    );


if (error) {

    console.error(
        "SHOP IMAGE UPLOAD ERROR:",
        error
    );

    throw new Error(
        error.message ||
        "Failed to upload shop image."
    );
}


const {
    data
} = supabase
    .storage
    .from(SHOP_ASSETS_BUCKET)
    .getPublicUrl(
        filePath
    );


if (!data?.publicUrl) {

    throw new Error(
        "Unable to generate the public image URL."
    );
}


return data.publicUrl;

}

/* =====================================================
GET STORAGE PATH FROM PUBLIC URL
===================================================== */

function getStoragePathFromUrl(
fileUrl
) {

if (!fileUrl) {

    return null;
}


try {

    const url =
        new URL(fileUrl);


    const marker =
        `/storage/v1/object/public/${SHOP_ASSETS_BUCKET}/`;


    const index =
        url.pathname.indexOf(
            marker
        );


    if (index === -1) {

        return null;
    }


    const filePath =
        url.pathname.substring(
            index + marker.length
        );


    return filePath || null;


} catch (error) {

    console.warn(
        "INVALID STORAGE URL:",
        error
    );

    return null;
}

}

/* =====================================================
DELETE SHOP IMAGE
===================================================== */

async function deleteShopImage(
fileUrl
) {

const filePath =
    getStoragePathFromUrl(
        fileUrl
    );


if (!filePath) {

    return;
}


console.log(
    "DELETING SHOP IMAGE:",
    filePath
);


const {
    error
} = await supabase
    .storage
    .from(SHOP_ASSETS_BUCKET)
    .remove([
        filePath
    ]);


if (error) {

    console.warn(
        "OLD IMAGE DELETE ERROR:",
        error
    );

    return;
}


console.log(
    "OLD SHOP IMAGE DELETED."
);

}

/* =====================================================
DELETE NEWLY UPLOADED FILE
Used if database save fails
===================================================== */

async function deleteUploadedImage(
fileUrl
) {

if (!fileUrl) {

    return;
}


try {

    await deleteShopImage(
        fileUrl
    );

} catch (error) {

    console.warn(
        "FAILED TO CLEANUP NEW IMAGE:",
        error
    );
}

}

/* =====================================================
NUMBER VALIDATION
===================================================== */

function getNumberValue(
input,
label
) {

const value =
    Number(
        input?.value ?? 0
    );


if (!Number.isFinite(value)) {

    throw new Error(
        `${label} must be a valid number.`
    );
}


if (value < 0) {

    throw new Error(
        `${label} cannot be negative.`
    );
}


return Number(
    value.toFixed(2)
);

}

/* =====================================================
BUILD SETTINGS DATA
===================================================== */

function buildSettingsData(
logoUrl,
bannerUrl,
homeBannerUrl,
gcashQrUrl
) {

const name =
    shopName?.value.trim() || "";


if (!name) {

    throw new Error(
        "Shop name is required."
    );
}


return {

    shop_name:
        name,


    shop_description:
        shopDescription?.value.trim() || "",


    shop_email:
        shopEmail?.value.trim() || "",


    shop_phone:
        shopPhone?.value.trim() || "",


    shop_address:
        shopAddress?.value.trim() || "",


    logo_url:
        logoUrl || "",


    /* PRODUCTS PAGE BANNER */

    banner_url:
        bannerUrl || "",


    /* HOME PAGE BANNER */

    home_banner_url:
        homeBannerUrl || "",


    /* GCASH */

    gcash_name:
        gcashName?.value.trim() || "",


    gcash_number:
        gcashNumber?.value.trim() || "",


    gcash_qr_url:
        gcashQrUrl || "",


    payment_instructions:
        paymentInstructions?.value.trim() || "",


    /* DELIVERY */

    delivery_fee:
        getNumberValue(
            deliveryFee,
            "Delivery fee"
        ),


    minimum_order:
        getNumberValue(
            minimumOrder,
            "Minimum order"
        ),


    delivery_information:
        deliveryInformation?.value.trim() || "",


    /* ANNOUNCEMENT */

    announcement:
        shopAnnouncement?.value.trim() || "",


    announcement_enabled:
        Boolean(
            announcementEnabled?.checked
        ),


    updated_at:
        new Date().toISOString()
};

}

/* =====================================================
SAVE SHOP SETTINGS
===================================================== */

async function saveShopSettings() {

if (!saveSettingsBtn) {

    return;
}


const originalText =
    saveSettingsBtn.textContent;


let uploadedLogoUrl = null;

let uploadedBannerUrl = null;

let uploadedHomeBannerUrl = null;

let uploadedGcashQrUrl = null;


try {

    saveSettingsBtn.disabled = true;

    saveSettingsBtn.textContent =
        "Saving...";


    /* =================================================
       VERIFY SESSION
    ================================================= */

    const loggedIn =
        await checkAdminSession();


    if (!loggedIn) {

        return;
    }


    /* =================================================
       OLD IMAGE URLS
    ================================================= */

    let logoUrl =
        currentSettings?.logo_url || "";


    let bannerUrl =
        currentSettings?.banner_url || "";


    let homeBannerUrl =
        currentSettings?.home_banner_url || "";


    let gcashQrUrl =
        currentSettings?.gcash_qr_url || "";


    /* =================================================
       LOGO
    ================================================= */

    if (removeLogo) {

        logoUrl = "";

    } else if (
        shopLogo?.files?.[0]
    ) {

        uploadedLogoUrl =
            await uploadShopImage(
                shopLogo.files[0],
                LOGO_FOLDER,
                "shop-logo"
            );


        logoUrl =
            uploadedLogoUrl;
    }


    /* =================================================
       SHOP BANNER
       PRODUCTS PAGE
    ================================================= */

    if (removeBanner) {

        bannerUrl = "";

    } else if (
        shopBanner?.files?.[0]
    ) {

        uploadedBannerUrl =
            await uploadShopImage(
                shopBanner.files[0],
                BANNER_FOLDER,
                "shop-banner"
            );


        bannerUrl =
            uploadedBannerUrl;
    }


    /* =================================================
       HOME PAGE BANNER

===================================================== */

    if (removeHomeBanner) {

        homeBannerUrl = "";

    } else if (
        homeBanner?.files?.[0]
    ) {

        uploadedHomeBannerUrl =
            await uploadShopImage(
                homeBanner.files[0],
                HOME_BANNER_FOLDER,
                "home-banner"
            );


        homeBannerUrl =
            uploadedHomeBannerUrl;
    }


    /* =================================================
       GCASH QR
    ================================================= */

    if (removeGcashQr) {

        gcashQrUrl = "";

    } else if (
        gcashQr?.files?.[0]
    ) {

        uploadedGcashQrUrl =
            await uploadShopImage(
                gcashQr.files[0],
                GCASH_FOLDER,
                "gcash-qr"
            );


        gcashQrUrl =
            uploadedGcashQrUrl;
    }


    /* =================================================
       BUILD DATA
    ================================================= */

    const settingsData =
        buildSettingsData(
            logoUrl,
            bannerUrl,
            homeBannerUrl,
            gcashQrUrl
        );


    console.log(
        "SAVING SHOP SETTINGS:",
        settingsData
    );


    /* =================================================
       SAVE DATABASE
    ================================================= */

    let result;


    if (currentSettings?.id) {

        result =
            await supabase
                .from(SETTINGS_TABLE)
                .update(
                    settingsData
                )
                .eq(
                    "id",
                    currentSettings.id
                )
                .select()
                .single();

    } else {

        result =
            await supabase
                .from(SETTINGS_TABLE)
                .insert(
                    settingsData
                )
                .select()
                .single();
    }


    const {
        data,
        error
    } = result;


    /* =================================================
       DATABASE ERROR
    ================================================= */

    if (error) {

        console.error(
            "SAVE SETTINGS ERROR:",
            error
        );


        /* CLEANUP NEW UPLOADS */

        await deleteUploadedImage(
            uploadedLogoUrl
        );

        await deleteUploadedImage(
            uploadedBannerUrl
        );

        await deleteUploadedImage(
            uploadedHomeBannerUrl
        );

        await deleteUploadedImage(
            uploadedGcashQrUrl
        );


        throw new Error(
            error.message ||
            "Failed to save shop settings."
        );
    }


    /* =================================================
       OLD IMAGE URLS
    ================================================= */

    const oldLogoUrl =
        currentSettings?.logo_url || "";


    const oldBannerUrl =
        currentSettings?.banner_url || "";


    const oldHomeBannerUrl =
        currentSettings?.home_banner_url || "";


    const oldGcashQrUrl =
        currentSettings?.gcash_qr_url || "";


    /* =================================================
       DELETE OLD LOGO
    ================================================= */

    if (
        oldLogoUrl &&
        (
            removeLogo ||
            uploadedLogoUrl
        ) &&
        oldLogoUrl !== logoUrl
    ) {

        await deleteShopImage(
            oldLogoUrl
        );
    }


    /* =================================================
       DELETE OLD SHOP BANNER
    ================================================= */

    if (
        oldBannerUrl &&
        (
            removeBanner ||
            uploadedBannerUrl
        ) &&
        oldBannerUrl !== bannerUrl
    ) {

        await deleteShopImage(
            oldBannerUrl
        );
    }


    /* =================================================
       DELETE OLD HOME PAGE BANNER
    ================================================= */

    if (
        oldHomeBannerUrl &&
        (
            removeHomeBanner ||
            uploadedHomeBannerUrl
        ) &&
        oldHomeBannerUrl !== homeBannerUrl
    ) {

        await deleteShopImage(
            oldHomeBannerUrl
        );
    }


    /* =================================================
       DELETE OLD GCASH QR
    ================================================= */

    if (
        oldGcashQrUrl &&
        (
            removeGcashQr ||
            uploadedGcashQrUrl
        ) &&
        oldGcashQrUrl !== gcashQrUrl
    ) {

        await deleteShopImage(
            oldGcashQrUrl
        );
    }


    /* =================================================
       UPDATE STATE
    ================================================= */

    currentSettings =
        data;


    removeLogo = false;

    removeBanner = false;

    removeHomeBanner = false;

    removeGcashQr = false;


    /* =================================================
       CLEAR FILE INPUTS
    ================================================= */

    if (shopLogo) {

        shopLogo.value = "";
    }


    if (shopBanner) {

        shopBanner.value = "";
    }


    if (homeBanner) {

        homeBanner.value = "";
    }


    if (gcashQr) {

        gcashQr.value = "";
    }


    /* =================================================
       UPDATE LOGO PREVIEW
    ================================================= */

    if (data.logo_url) {

        setLogoPreview(
            data.logo_url
        );

    } else {

        resetLogoPreview();
    }


    /* =================================================
       UPDATE SHOP BANNER PREVIEW
    ================================================= */

    if (data.banner_url) {

        setBannerPreview(
            data.banner_url
        );

    } else {

        resetBannerPreview();
    }


    /* =================================================
       UPDATE HOME PAGE BANNER PREVIEW
    ================================================= */

    if (data.home_banner_url) {

        setHomeBannerPreview(
            data.home_banner_url
        );

    } else {

        resetHomeBannerPreview();
    }


    /* =================================================
       UPDATE GCASH QR PREVIEW
    ================================================= */

    if (data.gcash_qr_url) {

        setGcashQrPreview(
            data.gcash_qr_url
        );

    } else {

        resetGcashQrPreview();
    }


    /* =================================================
       SUCCESS
    ================================================= */

    showResult(
        "Shop settings saved successfully!",
        "success"
    );


    console.log(
        "SHOP SETTINGS SAVED:",
        data
    );


} catch (error) {

    console.error(
        "SAVE SHOP SETTINGS ERROR:",
        error
    );


    showResult(
        error.message ||
        "Failed to save shop settings.",
        "error"
    );


} finally {

    saveSettingsBtn.disabled = false;

    saveSettingsBtn.textContent =
        originalText;
}

}

/* =====================================================
SAVE BUTTON
===================================================== */

saveSettingsBtn?.addEventListener(
"click",
saveShopSettings
);

/* =====================================================
MOBILE MENU
===================================================== */

mobileMenuBtn?.addEventListener(
"click",
() => {

    if (!mobileNav) {

        return;
    }


    mobileNav.classList.toggle(
        "open"
    );
}

);

/* =====================================================
CLOSE MOBILE MENU
===================================================== */

mobileNav?.querySelectorAll("a").forEach(
link => {

    link.addEventListener(
        "click",
        () => {

            mobileNav.classList.remove(
                "open"
            );
        }
    );
}

);

/* =====================================================
LOGOUT
===================================================== */

async function logoutAdmin() {

const confirmed =
    window.confirm(
        "Are you sure you want to logout?"
    );


if (!confirmed) {

    return;
}


try {

    const {
        error
    } = await supabase.auth.signOut();


    if (error) {

        throw error;
    }


    window.location.replace(
        "login.html"
    );


} catch (error) {

    console.error(
        "LOGOUT ERROR:",
        error
    );


    showResult(
        "Logout failed. Please try again.",
        "error"
    );
}

}

/* =====================================================
LOGOUT BUTTONS
===================================================== */

logoutBtn?.addEventListener(
"click",
logoutAdmin
);

mobileLogoutBtn?.addEventListener(
"click",
logoutAdmin
);

settingsLogoutBtn?.addEventListener(
"click",
logoutAdmin
);

/* =====================================================
AUTH STATE
===================================================== */

supabase.auth.onAuthStateChange(
(event) => {

    console.log(
        "AUTH EVENT:",
        event
    );


    if (
        event === "SIGNED_OUT"
    ) {

        redirectToLogin();
    }
}

);

/* =====================================================
INITIALIZE
===================================================== */

async function initializeSettings() {

const isLoggedIn =
    await checkAdminSession();


if (!isLoggedIn) {

    return;
}


await loadShopSettings();

}

initializeSettings();