import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://jnhqfdvddyivuiqcsmux.supabase.co";

/*
   IMPORTANT:
   Ilagay dito ang existing SUPABASE ANON KEY mo.
   Huwag ilagay ang service_role key dito.
*/
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHFmZHZkZHlpdnVpcWNzbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDE2MzMsImV4cCI6MjEwNTM3NzYzM30.ANcKivtcmnrrF23ObMZm7rptOCwTdavm0eqepie4kq8";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================================
   ELEMENTS
========================================= */

const productForm =
    document.getElementById("productForm");

const productFormCard =
    document.getElementById("productFormCard");

const productFormTitle =
    document.getElementById("productFormTitle");

const productId =
    document.getElementById("productId");

const productName =
    document.getElementById("productName");

const productCategory =
    document.getElementById("productCategory");

const productPrice =
    document.getElementById("productPrice");

const productStock =
    document.getElementById("productStock");

const productImage =
    document.getElementById("productImage");

const productImageUrl =
    document.getElementById("productImageUrl");

const productDescription =
    document.getElementById("productDescription");

const addProductBtn =
    document.getElementById("addProductBtn");

const closeProductFormBtn =
    document.getElementById("closeProductFormBtn");

const cancelProductBtn =
    document.getElementById("cancelProductBtn");

const saveProductBtn =
    document.getElementById("saveProductBtn");

const productSearch =
    document.getElementById("productSearch");

const productsTableBody =
    document.getElementById("productsTableBody");

const mobileProductsList =
    document.getElementById("mobileProductsList");

const adminResult =
    document.getElementById("adminResult");


/* =========================================
   DATA
========================================= */

let products = [];

let editingProductId = null;


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value = "") {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatPrice(value) {

    return Number(value || 0).toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP"
        }
    );
}


function showResult(
    message,
    type = "success"
) {

    if (!adminResult) {
        return;
    }

    adminResult.textContent = message;

    adminResult.className =
        `admin-result ${type}`;

    clearTimeout(showResult.timer);

    showResult.timer =
        setTimeout(() => {

            adminResult.textContent = "";

            adminResult.className =
                "admin-result";

        }, 4000);
}


function getStockClass(stock) {

    const value =
        Number(stock || 0);

    if (value <= 0) {
        return "stock-out";
    }

    if (value <= 5) {
        return "stock-low";
    }

    return "stock-good";
}


function getStockText(stock) {

    const value =
        Number(stock || 0);

    if (value <= 0) {
        return "Out of Stock";
    }

    if (value <= 5) {
        return `${value} left`;
    }

    return `${value} in stock`;
}


/* =========================================
   ADMIN SESSION CHECK
========================================= */

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

            window.location.replace(
                "admin-login.html"
            );

            return false;
        }


        if (!data?.session) {

            console.warn(
                "No active admin session."
            );

            window.location.replace(
                "admin-login.html"
            );

            return false;
        }


        console.log(
            "ADMIN LOGGED IN:",
            data.session.user.email
        );

        return true;

    }

    catch (error) {

        console.error(
            "ADMIN SESSION ERROR:",
            error
        );

        window.location.replace(
            "admin-login.html"
        );

        return false;
    }
}


/* =========================================
   FORM
========================================= */

function openAddForm() {

    editingProductId = null;

    productForm.reset();

    productId.value = "";

    productFormTitle.textContent =
        "Add Product";

    saveProductBtn.textContent =
        "Save Product";

    productFormCard.hidden = false;

    productFormCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    setTimeout(() => {

        productName.focus();

    }, 300);
}


function openEditForm(product) {

    editingProductId =
        product.id;

    productId.value =
        product.id;

    productName.value =
        product.name || "";

    productCategory.value =
        product.category || "";

    productPrice.value =
        product.price ?? "";

    productStock.value =
        product.stock ?? "";

    productImageUrl.value =
        product.image_url || "";

    productDescription.value =
        product.description || "";

    productImage.value =
        "";

    productFormTitle.textContent =
        "Edit Product";

    saveProductBtn.textContent =
        "Update Product";

    productFormCard.hidden = false;

    productFormCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function closeForm() {

    editingProductId = null;

    productForm.reset();

    productId.value = "";

    productFormTitle.textContent =
        "Add Product";

    saveProductBtn.textContent =
        "Save Product";

    productFormCard.hidden = true;
}


/* =========================================
   IMAGE UPLOAD
========================================= */

async function uploadProductImage(file) {

    if (!file) {
        return null;
    }


    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        throw new Error(
            "Only JPG, PNG, and WEBP images are allowed."
        );
    }


    const maxSize =
        5 * 1024 * 1024;


    if (file.size > maxSize) {

        throw new Error(
            "Image size must not exceed 5MB."
        );
    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const fileName =
        `product-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}.${extension}`;


    const filePath =
        fileName;


    console.log(
        "Uploading product image:",
        filePath
    );


    const {
        error: uploadError
    } = await supabase
        .storage
        .from("product-images")
        .upload(
            filePath,
            file,
            {
                cacheControl: "3600",
                upsert: false
            }
        );


    if (uploadError) {

        console.error(
            "PRODUCT IMAGE UPLOAD ERROR:",
            uploadError
        );

        throw uploadError;
    }


    const {
        data: publicData
    } = supabase
        .storage
        .from("product-images")
        .getPublicUrl(filePath);


    return publicData.publicUrl;
}


/* =========================================
   LOAD PRODUCTS
========================================= */

async function loadProducts() {

    renderLoading();


    const {
        data,
        error
    } = await supabase
        .from("products")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Products load error:",
            error
        );

        renderError(
            error.message
        );

        showResult(
            "Failed to load products.",
            "error"
        );

        return;
    }


    products =
        data || [];


    renderProducts(
        products
    );
}


/* =========================================
   RENDER LOADING
========================================= */

function renderLoading() {

    if (productsTableBody) {

        productsTableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="table-empty"
                >

                    <div class="admin-loading">
                        Loading products...
                    </div>

                </td>

            </tr>

        `;
    }


    if (mobileProductsList) {

        mobileProductsList.innerHTML = "";
    }
}


/* =========================================
   RENDER ERROR
========================================= */

function renderError(message) {

    if (productsTableBody) {

        productsTableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="table-empty"
                >

                    <div class="admin-empty">

                        <div class="empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            Failed to Load Products
                        </h3>

                        <p>
                            ${escapeHTML(message)}
                        </p>

                    </div>

                </td>

            </tr>

        `;
    }


    if (mobileProductsList) {

        mobileProductsList.innerHTML = `

            <div class="mobile-product-card">

                <div class="admin-empty">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Failed to Load Products
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

            </div>

        `;
    }
}


/* =========================================
   RENDER PRODUCTS
========================================= */

function renderProducts(productList) {

    if (!productList.length) {

        renderEmpty();

        return;
    }


    renderDesktopProducts(
        productList
    );


    renderMobileProducts(
        productList
    );
}


/* =========================================
   DESKTOP TABLE
========================================= */

function renderDesktopProducts(productList) {

    if (!productsTableBody) {
        return;
    }


    productsTableBody.innerHTML =
        productList
            .map(product => {

                const image =
                    product.image_url
                        ? `
                            <img
                                src="${escapeHTML(product.image_url)}"
                                alt="${escapeHTML(product.name)}"
                                class="admin-product-image"
                            >
                        `
                        : `
                            <div class="admin-product-image">
                                📦
                            </div>
                        `;


                const stockClass =
                    getStockClass(
                        product.stock
                    );


                const stockText =
                    getStockText(
                        product.stock
                    );


                return `

                    <tr>

                        <td>

                            <div class="admin-product-cell">

                                ${image}

                                <div class="admin-product-info">

                                    <span
                                        class="admin-product-name"
                                    >
                                        ${escapeHTML(
                                            product.name
                                        )}
                                    </span>

                                    <span
                                        class="admin-product-description"
                                    >
                                        ${escapeHTML(
                                            product.description ||
                                            "No description"
                                        )}
                                    </span>

                                </div>

                            </div>

                        </td>


                        <td>
                            ${escapeHTML(
                                product.category ||
                                "Uncategorized"
                            )}
                        </td>


                        <td>
                            ${formatPrice(
                                product.price
                            )}
                        </td>


                        <td>

                            <span
                                class="stock-badge ${stockClass}"
                            >
                                ${escapeHTML(stockText)}
                            </span>

                        </td>


                        <td>

                            <div class="table-actions">

                                <button
                                    type="button"
                                    class="edit-btn"
                                    data-action="edit"
                                    data-id="${product.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="delete-btn"
                                    data-action="delete"
                                    data-id="${product.id}"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            })
            .join("");
}


/* =========================================
   MOBILE PRODUCTS
========================================= */

function renderMobileProducts(productList) {

    if (!mobileProductsList) {
        return;
    }


    mobileProductsList.innerHTML =
        productList
            .map(product => {

                const image =
                    product.image_url
                        ? `
                            <img
                                src="${escapeHTML(product.image_url)}"
                                alt="${escapeHTML(product.name)}"
                                class="mobile-product-image"
                            >
                        `
                        : `
                            <div class="mobile-product-image">
                                📦
                            </div>
                        `;


                const stockClass =
                    getStockClass(
                        product.stock
                    );


                const stockText =
                    getStockText(
                        product.stock
                    );


                return `

                    <article
                        class="mobile-product-card"
                    >

                        <div class="mobile-product-top">

                            ${image}

                            <div class="mobile-product-info">

                                <span
                                    class="mobile-product-name"
                                >
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </span>

                                <span
                                    class="mobile-product-category"
                                >
                                    ${escapeHTML(
                                        product.category ||
                                        "Uncategorized"
                                    )}
                                </span>

                            </div>

                        </div>


                        <div class="mobile-product-details">

                            <div
                                class="mobile-product-detail"
                            >

                                <span>
                                    Price
                                </span>

                                <strong>
                                    ${formatPrice(
                                        product.price
                                    )}
                                </strong>

                            </div>


                            <div
                                class="mobile-product-detail"
                            >

                                <span>
                                    Stock
                                </span>

                                <strong
                                    class="stock-badge ${stockClass}"
                                >
                                    ${escapeHTML(
                                        stockText
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div
                            class="mobile-product-actions"
                        >

                            <button
                                type="button"
                                class="edit-btn"
                                data-action="edit"
                                data-id="${product.id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-btn"
                                data-action="delete"
                                data-id="${product.id}"
                            >
                                Delete
                            </button>

                        </div>

                    </article>

                `;

            })
            .join("");
}


/* =========================================
   EMPTY
========================================= */

function renderEmpty() {

    if (productsTableBody) {

        productsTableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="table-empty"
                >

                    <div class="admin-empty">

                        <div class="empty-icon">
                            📦
                        </div>

                        <h3>
                            No Products Found
                        </h3>

                        <p>
                            Add your first product to the store.
                        </p>

                    </div>

                </td>

            </tr>

        `;
    }


    if (mobileProductsList) {

        mobileProductsList.innerHTML = `

            <div class="mobile-product-card">

                <div class="admin-empty">

                    <div class="empty-icon">
                        📦
                    </div>

                    <h3>
                        No Products Found
                    </h3>

                    <p>
                        Add your first product to the store.
                    </p>

                </div>

            </div>

        `;
    }
}


/* =========================================
   SEARCH
========================================= */

function filterProducts() {

    const query =
        productSearch.value
            .trim()
            .toLowerCase();


    if (!query) {

        renderProducts(
            products
        );

        return;
    }


    const filtered =
        products.filter(product => {

            const name =
                String(
                    product.name || ""
                ).toLowerCase();

            const category =
                String(
                    product.category || ""
                ).toLowerCase();

            const description =
                String(
                    product.description || ""
                ).toLowerCase();


            return (
                name.includes(query) ||
                category.includes(query) ||
                description.includes(query)
            );

        });


    renderProducts(
        filtered
    );
}


/* =========================================
   SAVE PRODUCT
========================================= */

async function saveProduct(event) {

    event.preventDefault();


    const name =
        productName.value.trim();

    const category =
        productCategory.value.trim();

    const price =
        Number(
            productPrice.value
        );

    const stock =
        Number(
            productStock.value
        );

    const description =
        productDescription.value.trim();

    let imageUrl =
        productImageUrl.value.trim();


    if (!name) {

        showResult(
            "Product name is required.",
            "error"
        );

        productName.focus();

        return;
    }


    if (
        Number.isNaN(price) ||
        price < 0
    ) {

        showResult(
            "Please enter a valid price.",
            "error"
        );

        productPrice.focus();

        return;
    }


    if (
        Number.isNaN(stock) ||
        stock < 0
    ) {

        showResult(
            "Please enter a valid stock quantity.",
            "error"
        );

        productStock.focus();

        return;
    }


    try {

        saveProductBtn.disabled = true;

        saveProductBtn.textContent =
            editingProductId
                ? "Updating..."
                : "Saving...";


        /* =========================
           IMAGE UPLOAD
        ========================== */

        if (
            productImage.files &&
            productImage.files[0]
        ) {

            imageUrl =
                await uploadProductImage(
                    productImage.files[0]
                );
        }


        /* =========================
           PRODUCT DATA
        ========================== */

        const productData = {

            name,

            category:
                category || null,

            price,

            stock,

            description:
                description || null,

            image_url:
                imageUrl || null

        };


        /* =========================
           UPDATE
        ========================== */

        if (editingProductId) {

            const {
                error
            } = await supabase
                .from("products")
                .update(productData)
                .eq(
                    "id",
                    editingProductId
                );


            if (error) {
                throw error;
            }


            showResult(
                "Product updated successfully."
            );

        }


        /* =========================
           INSERT
        ========================== */

        else {

            const {
                error
            } = await supabase
                .from("products")
                .insert(
                    productData
                );


            if (error) {
                throw error;
            }


            showResult(
                "Product added successfully."
            );
        }


        closeForm();

        await loadProducts();

    }


    catch (error) {

        console.error(
            "Save product error:",
            error
        );


        showResult(
            error.message ||
            "Failed to save product.",
            "error"
        );

    }


    finally {

        saveProductBtn.disabled = false;

        saveProductBtn.textContent =
            editingProductId
                ? "Update Product"
                : "Save Product";
    }
}


/* =========================================
   DELETE PRODUCT
========================================= */

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                item.id === id
        );


    if (!product) {
        return;
    }


    const confirmed =
        window.confirm(
            `Delete "${product.name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await supabase
            .from("products")
            .delete()
            .eq(
                "id",
                id
            );


        if (error) {
            throw error;
        }


        showResult(
            "Product deleted successfully."
        );


        await loadProducts();

    }


    catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        showResult(
            error.message ||
            "Failed to delete product.",
            "error"
        );
    }
}


/* =========================================
   TABLE ACTIONS
========================================= */

function handleProductAction(event) {

    const button =
        event.target.closest(
            "button[data-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset.action;

    const id =
        button.dataset.id;


    if (action === "edit") {

        const product =
            products.find(
                item =>
                    item.id === id
            );


        if (product) {

            openEditForm(
                product
            );
        }

        return;
    }


    if (action === "delete") {

        deleteProduct(
            id
        );
    }
}


/* =========================================
   EVENTS
========================================= */

addProductBtn?.addEventListener(
    "click",
    openAddForm
);


closeProductFormBtn?.addEventListener(
    "click",
    closeForm
);


cancelProductBtn?.addEventListener(
    "click",
    closeForm
);


productForm?.addEventListener(
    "submit",
    saveProduct
);


productSearch?.addEventListener(
    "input",
    filterProducts
);


productsTableBody?.addEventListener(
    "click",
    handleProductAction
);


mobileProductsList?.addEventListener(
    "click",
    handleProductAction
);


/* =========================================
   INITIALIZE
========================================= */

async function initializeAdminProducts() {

    const authenticated =
        await checkAdminSession();


    if (!authenticated) {
        return;
    }


    await loadProducts();
}


initializeAdminProducts();