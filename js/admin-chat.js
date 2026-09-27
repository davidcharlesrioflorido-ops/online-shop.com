import { supabase } from "./supabase.js";


/* =========================================================
   BUSINESS STORE
   ADMIN CHAT SYSTEM
   COMPLETE FIXED VERSION
   =========================================================

   FEATURES
   ---------------------------------------------------------
   - Admin/customer realtime chat
   - Supabase Realtime Presence
   - Customer online/offline
   - Online/offline ring around avatar
   - Realtime conversations
   - Realtime messages
   - Image attachments
   - Delete admin messages
   - Delete entire conversations
   - Deleted conversations stay deleted
   - New conversation only created when sending
   - Unread counts
   - RLS compatible
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CHAT_BUCKET = "chat-attachments";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


/*
   IMPORTANT:
   Customer chat.js MUST use this exact same channel.
*/
const PRESENCE_CHANNEL_NAME =
    "business-store-customer-presence";


/* =========================================================
   STATE
   ========================================================= */

let currentAdmin = null;

let customers = [];

let conversations = [];

let selectedCustomer = null;

let selectedConversation = null;

let selectedFile = null;

let previewObjectURL = null;

let conversationChannel = null;

let messageChannel = null;

let presenceChannel = null;

let isSending = false;


/*
   Customer UUIDs currently online.
*/
let customerPresence = new Set();


/*
   Prevent deleted conversations from
   being added again by realtime events.
*/
const deletedConversationIds = new Set();


/* =========================================================
   DOM
   ========================================================= */

let customerListView;
let chatView;
let conversationList;
let conversationSearch;
let conversationLoading;
let messagesContainer;
let chatWelcome;
let chatLoading;
let chatCustomerName;
let chatCustomerEmail;
let chatHeaderAvatar;
let chatCustomerStatus;
let messageInput;
let sendButton;
let attachmentInput;
let attachmentPreview;
let previewImage;
let removeAttachmentButton;
let chatError;
let connectionStatus;
let refreshButton;
let backToCustomersButton;
let backToDashboardButton;


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initAdminChat
);


async function initAdminChat() {

    try {

        cacheDOM();

        setupEvents();

        setConnectionStatus(
            "Connecting..."
        );

        await checkAdminSession();

        await loadCustomersAndConversations();

        setupCustomerPresence();

        setupConversationRealtime();

        showCustomerList();

        setConnectionStatus(
            "Online"
        );

        console.log(
            "ADMIN CHAT READY"
        );

    } catch (error) {

        console.error(
            "ADMIN CHAT ERROR:",
            error
        );

        setConnectionStatus(
            "Offline"
        );

        showError(
            getFriendlyError(error)
        );

    }

}


/* =========================================================
   CACHE DOM
   ========================================================= */

function cacheDOM() {

    customerListView =
        document.getElementById(
            "customerListView"
        );

    chatView =
        document.getElementById(
            "chatView"
        );

    conversationList =
        document.getElementById(
            "conversationList"
        );

    conversationSearch =
        document.getElementById(
            "conversationSearch"
        );

    conversationLoading =
        document.getElementById(
            "conversationLoading"
        );

    messagesContainer =
        document.getElementById(
            "adminMessagesContainer"
        );

    chatWelcome =
        document.getElementById(
            "adminChatWelcome"
        );

    chatLoading =
        document.getElementById(
            "adminChatLoading"
        );

    chatCustomerName =
        document.getElementById(
            "chatCustomerName"
        );

    chatCustomerEmail =
        document.getElementById(
            "chatCustomerEmail"
        );

    chatHeaderAvatar =
        document.getElementById(
            "chatHeaderAvatar"
        );

    chatCustomerStatus =
        document.getElementById(
            "chatCustomerStatus"
        );

    messageInput =
        document.getElementById(
            "adminMessageInput"
        );

    sendButton =
        document.getElementById(
            "adminSendButton"
        );

    attachmentInput =
        document.getElementById(
            "adminAttachmentInput"
        );

    attachmentPreview =
        document.getElementById(
            "adminAttachmentPreview"
        );

    previewImage =
        document.getElementById(
            "adminPreviewImage"
        );

    removeAttachmentButton =
        document.getElementById(
            "adminRemoveAttachment"
        );

    chatError =
        document.getElementById(
            "adminChatError"
        );

    connectionStatus =
        document.getElementById(
            "connectionStatus"
        );

    refreshButton =
        document.getElementById(
            "refreshChatButton"
        );

    backToCustomersButton =
        document.getElementById(
            "backToCustomersButton"
        );

    backToDashboardButton =
        document.getElementById(
            "backToDashboardButton"
        );

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    if (conversationSearch) {

        conversationSearch.addEventListener(
            "input",
            () => {

                renderCustomerList(
                    conversationSearch.value
                );

            }
        );

    }


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendAdminMessage
        );

    }


    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendAdminMessage();

                }

            }
        );

    }


    if (attachmentInput) {

        attachmentInput.addEventListener(
            "change",
            handleFileSelection
        );

    }


    if (removeAttachmentButton) {

        removeAttachmentButton.addEventListener(
            "click",
            removeSelectedFile
        );

    }


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            refreshChat
        );

    }


    if (backToCustomersButton) {

        backToCustomersButton.addEventListener(
            "click",
            () => {

                showCustomerList();

            }
        );

    }


    if (backToDashboardButton) {

        backToDashboardButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "admin.html";

            }
        );

    }


    window.addEventListener(
        "pagehide",
        cleanupRealtime
    );

}


/* =========================================================
   ADMIN SESSION
   ========================================================= */

async function checkAdminSession() {

    const {
        data,
        error
    } = await supabase.auth.getUser();


    if (error) {

        throw error;

    }


    const user =
        data?.user;


    if (!user) {

        window.location.href =
            "index.html";

        return;

    }


    currentAdmin =
        user;


    console.log(
        "Logged in admin:",
        currentAdmin.id
    );

}


/* =========================================================
   LOAD CUSTOMERS + CONVERSATIONS
   ========================================================= */

async function loadCustomersAndConversations() {

    showConversationLoading();

    try {

        const {
            data: profileData,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (profileError) {

            throw profileError;

        }


        customers =
            (profileData || [])
                .filter(
                    profile =>
                        profile.id !==
                        currentAdmin?.id
                )
                .filter(
                    profile =>
                        String(
                            profile.role ||
                            "customer"
                        ).toLowerCase() !==
                        "admin"
                );


        const {
            data: conversationData,
            error: conversationError
        } = await supabase
            .from("chat_conversations")
            .select("*")
            .order(
                "last_message_at",
                {
                    ascending: false,
                    nullsFirst: false
                }
            );


        if (conversationError) {

            throw conversationError;

        }


        conversations =
            (conversationData || [])
                .filter(
                    conversation =>
                        !deletedConversationIds.has(
                            String(conversation.id)
                        )
                );


        customers =
            customers.map(
                customer => ({

                    ...customer,

                    is_online:
                        isCustomerOnline(
                            customer.id
                        )

                })
            );


        renderCustomerList();

    } finally {

        hideConversationLoading();

    }

}


/* =========================================================
   BACKWARD COMPATIBILITY
   ========================================================= */

async function loadAllConversations() {

    await loadCustomersAndConversations();

}


/* =========================================================
   CUSTOMER PRESENCE
   ========================================================= */

function setupCustomerPresence() {

    if (presenceChannel) {

        supabase.removeChannel(
            presenceChannel
        );

        presenceChannel =
            null;

    }


    customerPresence =
        new Set();


    presenceChannel =
        supabase
            .channel(
                PRESENCE_CHANNEL_NAME
            )

            .on(
                "presence",
                {
                    event: "sync"
                },
                () => {

                    rebuildPresenceState();

                }
            )

            .on(
                "presence",
                {
                    event: "join"
                },
                ({
                    key,
                    newPresences
                }) => {

                    console.log(
                        "CUSTOMER PRESENCE JOIN:",
                        key,
                        newPresences
                    );

                    rebuildPresenceState();

                }
            )

            .on(
                "presence",
                {
                    event: "leave"
                },
                ({
                    key,
                    leftPresences
                }) => {

                    console.log(
                        "CUSTOMER PRESENCE LEAVE:",
                        key,
                        leftPresences
                    );

                    rebuildPresenceState();

                }
            )

            .subscribe(
                status => {

                    console.log(
                        "CUSTOMER PRESENCE:",
                        status
                    );


                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        rebuildPresenceState();

                    }


                    if (
                        status ===
                        "CHANNEL_ERROR" ||
                        status ===
                        "TIMED_OUT"
                    ) {

                        customerPresence =
                            new Set();


                        customers =
                            customers.map(
                                customer => ({

                                    ...customer,

                                    is_online:
                                        false

                                })
                            );


                        renderCustomerList();

                        updateSelectedCustomerPresence();

                    }

                }
            );

}


/* =========================================================
   REBUILD PRESENCE STATE
   ========================================================= */

function rebuildPresenceState() {

    if (!presenceChannel) {

        return;

    }


    const state =
        presenceChannel.presenceState();


    const onlineIDs =
        new Set();


    Object.entries(
        state || {}
    ).forEach(
        ([key, metas]) => {

            /*
               IMPORTANT:

               Supabase Presence may expose
               the UUID as the key OR inside
               metadata.

               We support both.
            */

            if (
                Array.isArray(metas) &&
                metas.length > 0
            ) {

                const keyID =
                    String(key);


                onlineIDs.add(
                    keyID
                );


                metas.forEach(
                    meta => {

                        const userID =
                            meta?.user_id ||
                            meta?.userId ||
                            meta?.id ||
                            meta?.user?.id;


                        if (userID) {

                            onlineIDs.add(
                                String(userID)
                            );

                        }

                    }
                );

            }

        }
    );


    customerPresence =
        onlineIDs;


    customers =
        customers.map(
            customer => ({

                ...customer,

                is_online:
                    onlineIDs.has(
                        String(
                            customer.id
                        )
                    )

            })
        );


    renderCustomerList(
        conversationSearch?.value || ""
    );


    updateSelectedCustomerPresence();

}


/* =========================================================
   CHECK CUSTOMER ONLINE
   ========================================================= */

function isCustomerOnline(
    customerID
) {

    if (!customerID) {

        return false;

    }


    return customerPresence.has(
        String(customerID)
    );

}


/* =========================================================
   UPDATE SELECTED CUSTOMER PRESENCE
   ========================================================= */

function updateSelectedCustomerPresence() {

    if (!selectedCustomer) {

        return;

    }


    const online =
        isCustomerOnline(
            selectedCustomer.id
        );


    selectedCustomer.is_online =
        online;


    if (chatCustomerStatus) {

        chatCustomerStatus.textContent =
            online
                ? "Online"
                : "Offline";


        chatCustomerStatus.classList.toggle(
            "online",
            online
        );


        chatCustomerStatus.classList.toggle(
            "offline",
            !online
        );

    }


    if (chatHeaderAvatar) {

        setAvatarPresenceClass(
            chatHeaderAvatar,
            online
        );

    }

}


/* =========================================================
   AVATAR PRESENCE RING
   ========================================================= */

function setAvatarPresenceClass(
    avatar,
    online
) {

    if (!avatar) {

        return;

    }


    avatar.classList.remove(
        "status-online",
        "status-offline"
    );


    avatar.classList.add(
        online
            ? "status-online"
            : "status-offline"
    );


    avatar.setAttribute(
        "data-online",
        online
            ? "true"
            : "false"
    );


    avatar.title =
        online
            ? "Online"
            : "Offline";

}


/* =========================================================
   RENDER CUSTOMER LIST
   ========================================================= */

function renderCustomerList(
    searchValue = ""
) {

    if (!conversationList) {

        return;

    }


    conversationList.innerHTML =
        "";


    const search =
        String(searchValue)
            .trim()
            .toLowerCase();


    let list =
        [...customers];


    if (search) {

        list =
            list.filter(
                customer => {

                    const name =
                        getCustomerName(
                            customer
                        ).toLowerCase();


                    const email =
                        getCustomerEmail(
                            customer
                        ).toLowerCase();


                    return (
                        name.includes(search) ||
                        email.includes(search)
                    );

                }
            );

    }


    if (list.length === 0) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "empty-conversations";


        empty.innerHTML = `
            <div class="empty-icon">👥</div>
            <div>No customers found.</div>
        `;


        conversationList.appendChild(
            empty
        );


        return;

    }


    list.sort(
        (a, b) => {

            const conversationA =
                getConversationForCustomer(
                    a.id
                );


            const conversationB =
                getConversationForCustomer(
                    b.id
                );


            const unreadA =
                Number(
                    conversationA?.unread_for_admin ||
                    0
                );


            const unreadB =
                Number(
                    conversationB?.unread_for_admin ||
                    0
                );


            if (
                unreadA !== unreadB
            ) {

                return unreadB - unreadA;

            }


            const dateA =
                new Date(
                    conversationA?.last_message_at ||
                    conversationA?.created_at ||
                    0
                ).getTime();


            const dateB =
                new Date(
                    conversationB?.last_message_at ||
                    conversationB?.created_at ||
                    0
                ).getTime();


            return dateB - dateA;

        }
    );


    list.forEach(
        customer => {

            conversationList.appendChild(
                createCustomerItem(
                    customer
                )
            );

        }
    );

}


/* =========================================================
   CREATE CUSTOMER ITEM
   ========================================================= */

function createCustomerItem(
    customer
) {

    const conversation =
        getConversationForCustomer(
            customer.id
        );


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "conversation-item";


    if (
        selectedCustomer &&
        selectedCustomer.id ===
        customer.id
    ) {

        item.classList.add(
            "active"
        );

    }


    /* =====================================================
       AVATAR
       ===================================================== */

    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "customer-avatar";


    const online =
        isCustomerOnline(
            customer.id
        );


    setAvatarPresenceClass(
        avatar,
        online
    );


    const avatarURL =
        getCustomerAvatar(
            customer
        );


    if (avatarURL) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            avatarURL;


        image.alt =
            getCustomerName(
                customer
            );


        image.loading =
            "lazy";


        image.onerror =
            () => {

                image.remove();

                avatar.appendChild(
                    document.createTextNode(
                        getInitial(
                            getCustomerName(
                                customer
                            )
                        )
                    )
                );

            };


        avatar.appendChild(
            image
        );

    } else {

        avatar.textContent =
            getInitial(
                getCustomerName(
                    customer
                )
            );

    }


    /* =====================================================
       INFO
       ===================================================== */

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "conversation-info";


    const top =
        document.createElement(
            "div"
        );


    top.className =
        "conversation-top";


    const name =
        document.createElement(
            "div"
        );


    name.className =
        "customer-name";


    name.textContent =
        getCustomerName(
            customer
        );


    const time =
        document.createElement(
            "div"
        );


    time.className =
        "conversation-time";


    time.textContent =
        formatTime(
            conversation?.last_message_at ||
            conversation?.created_at
        );


    top.appendChild(
        name
    );


    top.appendChild(
        time
    );


    const email =
        document.createElement(
            "div"
        );


    email.className =
        "customer-email";


    email.textContent =
        getCustomerEmail(
            customer
        );


    const status =
        document.createElement(
            "div"
        );


    status.className =
        online
            ? "customer-online-status online"
            : "customer-online-status offline";


    status.textContent =
        online
            ? "Online"
            : "Offline";


    const preview =
        document.createElement(
            "div"
        );


    preview.className =
        "conversation-preview";


    if (
        conversation?.last_message
    ) {

        preview.textContent =
            conversation.last_message;

    } else {

        preview.textContent =
            "No conversation";


        preview.classList.add(
            "no-message"
        );

    }


    info.appendChild(
        top
    );


    info.appendChild(
        email
    );


    info.appendChild(
        status
    );


    info.appendChild(
        preview
    );


    const unread =
        Number(
            conversation?.unread_for_admin ||
            0
        );


    if (unread > 0) {

        const badge =
            document.createElement(
                "div"
            );


        badge.className =
            "unread-badge";


        badge.textContent =
            unread > 99
                ? "99+"
                : unread;


        info.appendChild(
            badge
        );

    }


    item.appendChild(
        avatar
    );


    item.appendChild(
        info
    );


    item.addEventListener(
        "click",
        async () => {

            try {

                await openCustomerChat(
                    customer
                );

            } catch (error) {

                console.error(
                    "OPEN CUSTOMER CHAT ERROR:",
                    error
                );


                showError(
                    getFriendlyError(
                        error
                    )
                );

            }

        }
    );


    return item;

}


/* =========================================================
   GET CUSTOMER CONVERSATION
   ========================================================= */

function getConversationForCustomer(
    customerID
) {

    if (!customerID) {

        return null;

    }


    return (
        conversations.find(
            conversation =>
                conversation.customer_id ===
                customerID &&
                !deletedConversationIds.has(
                    String(conversation.id)
                )
        ) ||
        null
    );

}


/* =========================================================
   OPEN CUSTOMER CHAT
   ========================================================= */

async function openCustomerChat(
    customer
) {

    if (!customer) {

        return;

    }


    selectedCustomer =
        customer;


    const conversation =
        getConversationForCustomer(
            customer.id
        );


    /*
       No existing conversation.
       DO NOT CREATE.
    */

    if (!conversation) {

        selectedConversation =
            null;


        showChatView();


        updateChatHeader(
            null,
            customer
        );


        enableComposer();


        hideError();


        clearMessages();


        showWelcome();


        return;

    }


    /*
       Existing conversation.
    */

    selectedConversation =
        conversation;


    showChatView();


    updateChatHeader(
        conversation,
        customer
    );


    enableComposer();


    hideError();


    await loadMessages(
        conversation.id
    );


    await markConversationRead(
        conversation.id
    );


    selectedConversation.unread_for_admin =
        0;


    setupMessageRealtime(
        conversation.id
    );

}


/* =========================================================
   CREATE CONVERSATION
   ========================================================= */

async function createConversation(
    customerID
) {

    if (!customerID) {

        throw new Error(
            "Customer ID is missing."
        );

    }


    /*
       If this ID was recently deleted,
       allow creation only because admin
       is intentionally sending a message.
    */

    const {
        data: existing,
        error: existingError
    } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq(
            "customer_id",
            customerID
        )
        .maybeSingle();


    if (existingError) {

        throw existingError;

    }


    if (existing) {

        deletedConversationIds.delete(
            String(existing.id)
        );


        addConversationLocally(
            existing
        );


        return existing;

    }


    const now =
        new Date().toISOString();


    const {
        data,
        error
    } = await supabase
        .from("chat_conversations")
        .insert({

            customer_id:
                customerID,

            status:
                "open",

            last_message:
                null,

            last_message_at:
                now,

            unread_for_admin:
                0,

            unread_for_customer:
                0

        })
        .select()
        .single();


    if (error) {

        /*
           Another request may have created it.
        */

        if (
            error.code === "23505"
        ) {

            const {
                data: existingAfter,
                error: existingAfterError
            } = await supabase
                .from("chat_conversations")
                .select("*")
                .eq(
                    "customer_id",
                    customerID
                )
                .maybeSingle();


            if (
                !existingAfterError &&
                existingAfter
            ) {

                deletedConversationIds.delete(
                    String(existingAfter.id)
                );


                addConversationLocally(
                    existingAfter
                );


                return existingAfter;

            }

        }


        throw error;

    }


    if (!data) {

        throw new Error(
            "Conversation was not created."
        );

    }


    deletedConversationIds.delete(
        String(data.id)
    );


    addConversationLocally(
        data
    );


    return data;

}


/* =========================================================
   ADD CONVERSATION LOCALLY
   ========================================================= */

function addConversationLocally(
    conversation
) {

    if (!conversation?.id) {

        return;

    }


    const conversationID =
        String(
            conversation.id
        );


    /*
       Deleted conversations are ignored
       unless explicitly recreated by send.
    */

    if (
        deletedConversationIds.has(
            conversationID
        )
    ) {

        return;

    }


    const existingIndex =
        conversations.findIndex(
            item =>
                item.id ===
                conversation.id
        );


    if (existingIndex === -1) {

        conversations.push(
            conversation
        );

    } else {

        conversations[
            existingIndex
        ] = {

            ...conversations[
                existingIndex
            ],

            ...conversation

        };

    }


    renderCustomerList(
        conversationSearch?.value || ""
    );

}


/* =========================================================
   REMOVE CONVERSATION LOCALLY
   ========================================================= */

function removeConversationLocally(
    conversationID
) {

    if (!conversationID) {

        return;

    }


    const id =
        String(
            conversationID
        );


    deletedConversationIds.add(
        id
    );


    conversations =
        conversations.filter(
            conversation =>
                String(
                    conversation.id
                ) !== id
        );


    if (
        selectedConversation &&
        String(
            selectedConversation.id
        ) === id
    ) {

        selectedConversation =
            null;


        removeMessageRealtime();


        clearMessages();


        showWelcome();


        if (selectedCustomer) {

            updateChatHeader(
                null,
                selectedCustomer
            );

        }

    }


    renderCustomerList(
        conversationSearch?.value || ""
    );

}


/* =========================================================
   DELETE ENTIRE CONVERSATION
   ========================================================= */

async function deleteConversation(
    conversationID
) {

    if (!conversationID) {

        showError(
            "No conversation selected."
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Delete this entire conversation? All messages in this conversation will also be deleted."
        );


    if (!confirmed) {

        return;

    }


    try {

        hideError();


        /*
           IMPORTANT:

           Try deleting the conversation itself first.

           If chat_messages uses ON DELETE CASCADE,
           all messages are automatically removed.

           This avoids getting blocked by a separate
           chat_messages DELETE RLS policy.
        */

        const {
            error: conversationDeleteError
        } = await supabase
            .from("chat_conversations")
            .delete()
            .eq(
                "id",
                conversationID
            );


        if (conversationDeleteError) {

            console.error(
                "CONVERSATION DELETE ERROR:",
                conversationDeleteError
            );


            /*
               If the database says the delete is
               blocked by a foreign key, try deleting
               the messages first.

               This fallback helps installations
               without ON DELETE CASCADE.
            */

            const foreignKeyError =
                String(
                    conversationDeleteError.message ||
                    ""
                ).toLowerCase();


            if (
                foreignKeyError.includes(
                    "foreign key"
                ) ||
                foreignKeyError.includes(
                    "violates"
                ) ||
                foreignKeyError.includes(
                    "chat_messages"
                )
            ) {

                const {
                    error: messageDeleteError
                } = await supabase
                    .from("chat_messages")
                    .delete()
                    .eq(
                        "conversation_id",
                        conversationID
                    );


                if (messageDeleteError) {

                    throw messageDeleteError;

                }


                const {
                    error: retryDeleteError
                } = await supabase
                    .from("chat_conversations")
                    .delete()
                    .eq(
                        "id",
                        conversationID
                    );


                if (retryDeleteError) {

                    throw retryDeleteError;

                }

            } else {

                throw conversationDeleteError;

            }

        }


        /*
           Mark deleted locally BEFORE realtime
           events arrive.

           This prevents INSERT/UPDATE realtime
           from bringing it back.
        */

        deletedConversationIds.add(
            String(conversationID)
        );


        removeConversationLocally(
            conversationID
        );


        console.log(
            "CONVERSATION DELETED:",
            conversationID
        );


    } catch (error) {

        console.error(
            "DELETE CONVERSATION ERROR:",
            error
        );


        showError(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   EXPOSE DELETE TO HTML
   ========================================================= */

window.deleteAdminConversation =
    function () {

        deleteConversation(
            selectedConversation?.id
        );

    };


/* =========================================================
   SHOW CUSTOMER LIST
   ========================================================= */

function showCustomerList() {

    if (customerListView) {

        customerListView.style.display =
            "flex";

    }


    if (chatView) {

        chatView.style.display =
            "none";

    }


    selectedCustomer =
        null;


    selectedConversation =
        null;


    removeMessageRealtime();


    removeSelectedFile();


    if (messageInput) {

        messageInput.value =
            "";

    }


    hideError();

}


/* =========================================================
   SHOW CHAT VIEW
   ========================================================= */

function showChatView() {

    if (customerListView) {

        customerListView.style.display =
            "none";

    }


    if (chatView) {

        chatView.style.display =
            "flex";

    }

}


/* =========================================================
   HEADER
   ========================================================= */

function updateChatHeader(
    conversation,
    customer
) {

    if (!customer) {

        customer =
            selectedCustomer;

    }


    if (!customer) {

        return;

    }


    const name =
        getCustomerName(
            customer
        );


    const email =
        getCustomerEmail(
            customer
        );


    const online =
        isCustomerOnline(
            customer.id
        );


    if (chatCustomerName) {

        chatCustomerName.textContent =
            name;

    }


    if (chatCustomerEmail) {

        chatCustomerEmail.textContent =
            email;

    }


    if (chatCustomerStatus) {

        chatCustomerStatus.textContent =
            online
                ? "Online"
                : "Offline";


        chatCustomerStatus.classList.toggle(
            "online",
            online
        );


        chatCustomerStatus.classList.toggle(
            "offline",
            !online
        );

    }


    if (chatHeaderAvatar) {

        chatHeaderAvatar.innerHTML =
            "";


        setAvatarPresenceClass(
            chatHeaderAvatar,
            online
        );


        const avatarURL =
            getCustomerAvatar(
                customer
            );


        if (avatarURL) {

            const image =
                document.createElement(
                    "img"
                );


            image.src =
                avatarURL;


            image.alt =
                name;


            image.onerror =
                () => {

                    image.remove();


                    chatHeaderAvatar.appendChild(
                        document.createTextNode(
                            getInitial(
                                name
                            )
                        )
                    );

                };


            chatHeaderAvatar.appendChild(
                image
            );

        } else {

            chatHeaderAvatar.textContent =
                getInitial(
                    name
                );

        }

    }

}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages(
    conversationID
) {

    if (!messagesContainer) {

        return;

    }


    showChatLoading();


    clearMessages();


    try {

        const {
            data,
            error
        } = await supabase
            .from("chat_messages")
            .select("*")
            .eq(
                "conversation_id",
                conversationID
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        if (
            !data ||
            data.length === 0
        ) {

            showWelcome();

            return;

        }


        hideWelcome();


        for (
            const message of data
        ) {

            await renderMessage(
                message
            );

        }


        scrollToBottom();

    } finally {

        hideChatLoading();

    }

}


/* =========================================================
   RENDER MESSAGE
   ========================================================= */

async function renderMessage(
    message
) {

    if (!messagesContainer) {

        return;

    }


    if (!message?.id) {

        return;

    }


    const existing =
        messagesContainer.querySelector(
            `[data-message-id="${message.id}"]`
        );


    if (existing) {

        return;

    }


    hideWelcome();


    const isAdmin =
        message.sender_type ===
            "admin" ||
        message.sender_id ===
            currentAdmin?.id;


    const row =
        document.createElement(
            "div"
        );


    row.className =
        `admin-message-row ${
            isAdmin
                ? "admin"
                : "customer"
        }`;


    row.dataset.messageId =
        message.id;


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "admin-message-content";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "admin-bubble";


    if (
        message.message &&
        String(
            message.message
        ).trim()
    ) {

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "message-text";


        text.textContent =
            message.message;


        text.style.whiteSpace =
            "pre-wrap";


        bubble.appendChild(
            text
        );

    }


    if (
        message.attachment_path ||
        message.attachment_url
    ) {

        const image =
            await createAttachment(
                message
            );


        if (image) {

            bubble.appendChild(
                image
            );

        }

    }


    const time =
        document.createElement(
            "div"
        );


    time.className =
        "admin-message-time";


    time.textContent =
        formatTime(
            message.created_at
        );


    if (isAdmin) {

        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.type =
            "button";


        deleteButton.className =
            "message-delete-button";


        deleteButton.textContent =
            "Delete";


        deleteButton.title =
            "Delete message";


        deleteButton.addEventListener(
            "click",
            async event => {

                event.stopPropagation();


                await deleteMessage(
                    message,
                    row
                );

            }
        );


        content.appendChild(
            deleteButton
        );

    }


    content.appendChild(
        bubble
    );


    content.appendChild(
        time
    );


    row.appendChild(
        content
    );


    messagesContainer.appendChild(
        row
    );

}


/* =========================================================
   CREATE ATTACHMENT
   ========================================================= */

async function createAttachment(
    message
) {

    let imageURL =
        null;


    if (message.attachment_path) {

        const {
            data,
            error
        } = await supabase.storage
            .from(CHAT_BUCKET)
            .createSignedUrl(
                message.attachment_path,
                3600
            );


        if (
            !error &&
            data?.signedUrl
        ) {

            imageURL =
                data.signedUrl;

        }

    }


    if (
        !imageURL &&
        message.attachment_url &&
        String(
            message.attachment_url
        ).startsWith("http")
    ) {

        imageURL =
            message.attachment_url;

    }


    if (!imageURL) {

        const unavailable =
            document.createElement(
                "div"
            );


        unavailable.textContent =
            "Image unavailable";


        unavailable.style.opacity =
            "0.6";


        unavailable.style.fontSize =
            "12px";


        return unavailable;

    }


    const image =
        document.createElement(
            "img"
        );


    image.className =
        "chat-attachment";


    image.src =
        imageURL;


    image.alt =
        message.attachment_name ||
        "Chat image";


    image.loading =
        "lazy";


    image.decoding =
        "async";


    image.addEventListener(
        "click",
        () => {

            openImageViewer(
                imageURL
            );

        }
    );


    return image;

}


/* =========================================================
   SEND ADMIN MESSAGE
   ========================================================= */

async function sendAdminMessage() {

    if (isSending) {

        return;

    }


    if (!currentAdmin) {

        showError(
            "Admin session is not available. Please log in again."
        );

        return;

    }


    if (!selectedCustomer) {

        showError(
            "Select a customer first."
        );

        return;

    }


    const text =
        messageInput?.value.trim() ||
        "";


    if (
        !text &&
        !selectedFile
    ) {

        return;

    }


    isSending =
        true;


    setSendingState(
        true
    );


    hideError();


    let uploadedPath =
        null;


    try {

        /*
           Create conversation ONLY when sending.
        */

        if (!selectedConversation) {

            selectedConversation =
                await createConversation(
                    selectedCustomer.id
                );


            setupMessageRealtime(
                selectedConversation.id
            );

        }


        if (selectedFile) {

            uploadedPath =
                await uploadAttachment(
                    selectedFile
                );

        }


        const messagePayload = {

            conversation_id:
                selectedConversation.id,

            sender_id:
                currentAdmin.id,

            sender_type:
                "admin",

            message:
                text || null,

            attachment_url:
                uploadedPath,

            attachment_path:
                uploadedPath,

            attachment_type:
                selectedFile?.type ||
                null,

            attachment_name:
                selectedFile?.name ||
                null,

            is_read:
                true

        };


        const {
            data: newMessage,
            error: messageError
        } = await supabase
            .from("chat_messages")
            .insert(
                messagePayload
            )
            .select()
            .single();


        if (messageError) {

            if (uploadedPath) {

                await removeStorageFile(
                    uploadedPath
                );

            }


            throw messageError;

        }


        await updateConversationAfterMessage(
            text,
            selectedConversation
        );


        await renderMessage(
            newMessage
        );


        scrollToBottom();


        if (messageInput) {

            messageInput.value =
                "";

        }


        removeSelectedFile();


        const newLastMessage =
            text ||
            "Image attachment";


        selectedConversation.last_message =
            newLastMessage;


        selectedConversation.last_message_at =
            new Date().toISOString();


        selectedConversation.last_sender_type =
            "admin";


        const index =
            conversations.findIndex(
                item =>
                    item.id ===
                    selectedConversation.id
            );


        if (index !== -1) {

            conversations[index] = {

                ...conversations[index],

                ...selectedConversation

            };

        }


        renderCustomerList(
            conversationSearch?.value || ""
        );


    } catch (error) {

        console.error(
            "ADMIN SEND ERROR:",
            error
        );


        showError(
            getFriendlyError(
                error
            )
        );

    } finally {

        isSending =
            false;


        setSendingState(
            false
        );

    }

}


/* =========================================================
   UPDATE CONVERSATION AFTER MESSAGE
   ========================================================= */

async function updateConversationAfterMessage(
    text,
    conversation
) {

    if (!conversation?.id) {

        return false;

    }


    const currentUnread =
        Number(
            conversation.unread_for_customer ||
            0
        );


    const updateData = {

        status:
            "open",

        last_message:
            text ||
            "Image attachment",

        last_message_at:
            new Date().toISOString(),

        last_sender_type:
            "admin",

        unread_for_customer:
            currentUnread + 1

    };


    const {
        error
    } = await supabase
        .from("chat_conversations")
        .update(
            updateData
        )
        .eq(
            "id",
            conversation.id
        );


    if (error) {

        console.warn(
            "CONVERSATION UPDATE BLOCKED:",
            error
        );


        return false;

    }


    Object.assign(
        conversation,
        updateData
    );


    return true;

}


/* =========================================================
   UPLOAD ATTACHMENT
   ========================================================= */

async function uploadAttachment(
    file
) {

    if (!file) {

        return null;

    }


    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {

        throw new Error(
            "Only JPG, PNG, and WEBP images are allowed."
        );

    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        throw new Error(
            "Image must be 5MB or smaller."
        );

    }


    if (!selectedConversation?.id) {

        throw new Error(
            "Please select a customer first."
        );

    }


    const extension =
        getExtension(
            file.name
        );


    const random =
        Math.random()
            .toString(36)
            .substring(
                2,
                10
            );


    const path =
        `${selectedConversation.customer_id}/${selectedConversation.id}/admin-${Date.now()}-${random}.${extension}`;


    const {
        error
    } = await supabase.storage
        .from(CHAT_BUCKET)
        .upload(
            path,
            file,
            {
                cacheControl:
                    "3600",

                upsert:
                    false,

                contentType:
                    file.type
            }
        );


    if (error) {

        throw error;

    }


    return path;

}


/* =========================================================
   REMOVE STORAGE FILE
   ========================================================= */

async function removeStorageFile(
    path
) {

    if (!path) {

        return;

    }


    try {

        const {
            error
        } = await supabase.storage
            .from(CHAT_BUCKET)
            .remove([
                path
            ]);


        if (error) {

            console.warn(
                "STORAGE CLEANUP ERROR:",
                error
            );

        }

    } catch (error) {

        console.warn(
            "STORAGE CLEANUP ERROR:",
            error
        );

    }

}


/* =========================================================
   DELETE MESSAGE
   ========================================================= */

async function deleteMessage(
    message,
    row
) {

    if (!message?.id) {

        return;

    }


    if (
        message.sender_id !==
        currentAdmin?.id
    ) {

        showError(
            "You can only delete messages sent by the admin."
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Delete this message?"
        );


    if (!confirmed) {

        return;

    }


    try {

        hideError();


        const {
            error
        } = await supabase
            .from("chat_messages")
            .delete()
            .eq(
                "id",
                message.id
            )
            .eq(
                "sender_id",
                currentAdmin.id
            );


        if (error) {

            throw error;

        }


        if (
            message.attachment_path
        ) {

            await removeStorageFile(
                message.attachment_path
            );

        }


        if (row) {

            row.remove();

        }


        await refreshConversationPreview(
            selectedConversation?.id
        );


    } catch (error) {

        console.error(
            "DELETE MESSAGE ERROR:",
            error
        );


        showError(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   REFRESH CONVERSATION PREVIEW
   ========================================================= */

async function refreshConversationPreview(
    conversationID
) {

    if (!conversationID) {

        return;

    }


    try {

        const {
            data,
            error
        } = await supabase
            .from("chat_messages")
            .select(
                "message, attachment_path, created_at, sender_type"
            )
            .eq(
                "conversation_id",
                conversationID
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


        if (error) {

            console.warn(
                "PREVIEW REFRESH ERROR:",
                error
            );

            return;

        }


        const conversation =
            conversations.find(
                item =>
                    item.id ===
                    conversationID
            );


        /*
           IMPORTANT:
           chat_conversations.last_message_at
           is NOT NULL.

           If there are no messages,
           use conversation.created_at
           instead of null.
        */

        const fallbackTime =
            conversation?.created_at ||
            new Date().toISOString();


        const newPreview =
            data
                ? (
                    data.message ||
                    (
                        data.attachment_path
                            ? "Image attachment"
                            : "No messages yet"
                    )
                )
                : "No messages yet";


        const newTime =
            data?.created_at ||
            fallbackTime;


        const newSenderType =
            data?.sender_type ||
            conversation?.last_sender_type ||
            null;


        if (conversation) {

            conversation.last_message =
                newPreview;


            conversation.last_message_at =
                newTime;


            conversation.last_sender_type =
                newSenderType;

        }


        if (
            selectedConversation &&
            selectedConversation.id ===
            conversationID
        ) {

            selectedConversation.last_message =
                newPreview;


            selectedConversation.last_message_at =
                newTime;


            selectedConversation.last_sender_type =
                newSenderType;

        }


        renderCustomerList(
            conversationSearch?.value || ""
        );


    } catch (error) {

        console.warn(
            "REFRESH PREVIEW ERROR:",
            error
        );

    }

}


/* =========================================================
   FILE SELECTION
   ========================================================= */

function handleFileSelection(
    event
) {

    const file =
        event.target.files?.[0];


    if (!file) {

        return;

    }


    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {

        showError(
            "Only JPG, PNG, and WEBP images are allowed."
        );


        clearFileInput();

        return;

    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        showError(
            "Image must be 5MB or smaller."
        );


        clearFileInput();

        return;

    }


    hideError();


    if (previewObjectURL) {

        URL.revokeObjectURL(
            previewObjectURL
        );

    }


    selectedFile =
        file;


    previewObjectURL =
        URL.createObjectURL(
            file
        );


    if (previewImage) {

        previewImage.src =
            previewObjectURL;

    }


    if (attachmentPreview) {

        attachmentPreview.style.display =
            "block";

    }

}


/* =========================================================
   REMOVE SELECTED FILE
   ========================================================= */

function removeSelectedFile() {

    selectedFile =
        null;


    if (previewObjectURL) {

        URL.revokeObjectURL(
            previewObjectURL
        );


        previewObjectURL =
            null;

    }


    clearFileInput();


    if (previewImage) {

        previewImage.src =
            "";

    }


    if (attachmentPreview) {

        attachmentPreview.style.display =
            "none";

    }

}


/* =========================================================
   CLEAR FILE INPUT
   ========================================================= */

function clearFileInput() {

    if (attachmentInput) {

        attachmentInput.value =
            "";

    }

}


/* =========================================================
   MARK CONVERSATION READ
   ========================================================= */

async function markConversationRead(
    conversationID
) {

    if (!conversationID) {

        return false;

    }


    const {
        error
    } = await supabase
        .from("chat_conversations")
        .update({

            unread_for_admin:
                0

        })
        .eq(
            "id",
            conversationID
        );


    if (error) {

        console.warn(
            "MARK READ BLOCKED:",
            error
        );


        return false;

    }


    const conversation =
        conversations.find(
            item =>
                item.id ===
                conversationID
        );


    if (conversation) {

        conversation.unread_for_admin =
            0;

    }


    if (
        selectedConversation &&
        selectedConversation.id ===
        conversationID
    ) {

        selectedConversation.unread_for_admin =
            0;

    }


    renderCustomerList(
        conversationSearch?.value || ""
    );


    return true;

}


/* =========================================================
   REALTIME - CONVERSATIONS
   ========================================================= */

function setupConversationRealtime() {

    if (conversationChannel) {

        supabase.removeChannel(
            conversationChannel
        );


        conversationChannel =
            null;

    }


    conversationChannel =
        supabase
            .channel(
                "admin-all-customer-conversations"
            )

            /* =============================================
               INSERT
               ============================================= */

            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "chat_conversations"
                },
                payload => {

                    try {

                        const inserted =
                            payload.new;


                        if (
                            !inserted?.id
                        ) {

                            return;

                        }


                        const id =
                            String(
                                inserted.id
                            );


                        /*
                           Do NOT resurrect deleted
                           conversations.
                        */

                        if (
                            deletedConversationIds.has(
                                id
                            )
                        ) {

                            console.log(
                                "IGNORED DELETED CONVERSATION INSERT:",
                                id
                            );

                            return;

                        }


                        addConversationLocally(
                            inserted
                        );

                    } catch (error) {

                        console.warn(
                            "Conversation INSERT realtime error:",
                            error
                        );

                    }

                }
            )

            /* =============================================
               UPDATE
               ============================================= */

            .on(
                "postgres_changes",
                {
                    event:
                        "UPDATE",

                    schema:
                        "public",

                    table:
                        "chat_conversations"
                },
                payload => {

                    const updated =
                        payload.new;


                    if (!updated?.id) {

                        return;

                    }


                    const id =
                        String(
                            updated.id
                        );


                    /*
                       Do NOT resurrect deleted
                       conversations.
                    */

                    if (
                        deletedConversationIds.has(
                            id
                        )
                    ) {

                        console.log(
                            "IGNORED DELETED CONVERSATION UPDATE:",
                            id
                        );

                        return;

                    }


                    const index =
                        conversations.findIndex(
                            item =>
                                item.id ===
                                updated.id
                        );


                    if (index === -1) {

                        conversations.push(
                            updated
                        );

                    } else {

                        conversations[index] = {

                            ...conversations[index],

                            ...updated

                        };

                    }


                    renderCustomerList(
                        conversationSearch?.value || ""
                    );


                    if (
                        selectedConversation &&
                        selectedConversation.id ===
                        updated.id
                    ) {

                        selectedConversation = {

                            ...selectedConversation,

                            ...updated

                        };


                        updateChatHeader(
                            selectedConversation,
                            selectedCustomer
                        );

                    }

                }
            )

            /* =============================================
               DELETE
               ============================================= */

            .on(
                "postgres_changes",
                {
                    event:
                        "DELETE",

                    schema:
                        "public",

                    table:
                        "chat_conversations"
                },
                payload => {

                    /*
                       Normally payload.old contains
                       the primary key.

                       Fallback also checks payload.old_record
                       for compatibility.
                    */

                    const deleted =
                        payload.old ||
                        payload.old_record ||
                        null;


                    const deletedID =
                        deleted?.id;


                    if (!deletedID) {

                        console.warn(
                            "Conversation DELETE realtime received without ID.",
                            payload
                        );

                        return;

                    }


                    console.log(
                        "CONVERSATION DELETED REALTIME:",
                        deletedID
                    );


                    removeConversationLocally(
                        deletedID
                    );

                }
            )

            .subscribe(
                status => {

                    console.log(
                        "Conversation realtime:",
                        status
                    );


                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        setConnectionStatus(
                            "Online"
                        );

                    }


                    if (
                        status ===
                        "CHANNEL_ERROR" ||
                        status ===
                        "TIMED_OUT"
                    ) {

                        setConnectionStatus(
                            "Realtime Offline"
                        );

                    }

                }
            );

}


/* =========================================================
   REALTIME - MESSAGES
   ========================================================= */

function setupMessageRealtime(
    conversationID
) {

    removeMessageRealtime();


    if (!conversationID) {

        return;

    }


    messageChannel =
        supabase
            .channel(
                `admin-customer-chat-${conversationID}`
            )

            /* =============================================
               INSERT
               ============================================= */

            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "chat_messages",

                    filter:
                        `conversation_id=eq.${conversationID}`
                },
                async payload => {

                    const message =
                        payload.new;


                    if (!message) {

                        return;

                    }


                    const existing =
                        messagesContainer?.querySelector(
                            `[data-message-id="${message.id}"]`
                        );


                    if (!existing) {

                        await renderMessage(
                            message
                        );


                        scrollToBottom();

                    }


                    /*
                       Only customer messages should
                       clear admin unread count.
                    */

                    if (
                        message.sender_type ===
                        "customer"
                    ) {

                        await markConversationRead(
                            conversationID
                        );

                    }


                    const conversation =
                        conversations.find(
                            item =>
                                item.id ===
                                conversationID
                        );


                    if (conversation) {

                        conversation.last_message =
                            message.message ||
                            (
                                message.attachment_path
                                    ? "Image attachment"
                                    : "New message"
                            );


                        conversation.last_message_at =
                            message.created_at;


                        conversation.last_sender_type =
                            message.sender_type ||
                            null;

                    }


                    if (
                        selectedConversation &&
                        selectedConversation.id ===
                        conversationID
                    ) {

                        selectedConversation.last_message =
                            message.message ||
                            (
                                message.attachment_path
                                    ? "Image attachment"
                                    : "New message"
                            );


                        selectedConversation.last_message_at =
                            message.created_at;


                        selectedConversation.last_sender_type =
                            message.sender_type ||
                            null;

                    }


                    renderCustomerList(
                        conversationSearch?.value || ""
                    );

                }
            )

            /* =============================================
               DELETE
               ============================================= */

            .on(
                "postgres_changes",
                {
                    event:
                        "DELETE",

                    schema:
                        "public",

                    table:
                        "chat_messages",

                    filter:
                        `conversation_id=eq.${conversationID}`
                },
                payload => {

                    const deleted =
                        payload.old ||
                        payload.old_record ||
                        null;


                    if (!deleted?.id) {

                        return;

                    }


                    const element =
                        messagesContainer?.querySelector(
                            `[data-message-id="${deleted.id}"]`
                        );


                    if (element) {

                        element.remove();

                    }


                    /*
                       Recalculate preview after
                       realtime message deletion.
                    */

                    refreshConversationPreview(
                        conversationID
                    );

                }
            )

            .subscribe(
                status => {

                    console.log(
                        "Message realtime:",
                        status
                    );

                }
            );

}


/* =========================================================
   REMOVE MESSAGE REALTIME
   ========================================================= */

function removeMessageRealtime() {

    if (messageChannel) {

        supabase.removeChannel(
            messageChannel
        );


        messageChannel =
            null;

    }

}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshChat() {

    try {

        hideError();


        await loadCustomersAndConversations();


        /*
           Presence state is kept by the
           Realtime channel.
        */

        rebuildPresenceState();


        if (
            selectedCustomer &&
            selectedConversation
        ) {

            const refreshedCustomer =
                customers.find(
                    customer =>
                        customer.id ===
                        selectedCustomer.id
                );


            const refreshedConversation =
                conversations.find(
                    conversation =>
                        conversation.id ===
                        selectedConversation.id
                );


            if (refreshedCustomer) {

                selectedCustomer =
                    refreshedCustomer;

            }


            /*
               Conversation may have been deleted
               by another admin/device.
            */

            if (!refreshedConversation) {

                selectedConversation =
                    null;


                clearMessages();


                showWelcome();


                updateChatHeader(
                    null,
                    selectedCustomer
                );


                return;

            }


            selectedConversation =
                refreshedConversation;


            updateChatHeader(
                selectedConversation,
                selectedCustomer
            );


            await loadMessages(
                selectedConversation.id
            );


            await markConversationRead(
                selectedConversation.id
            );

        }

    } catch (error) {

        console.error(
            "REFRESH CHAT ERROR:",
            error
        );


        showError(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   CLEANUP REALTIME
   ========================================================= */

function cleanupRealtime() {

    if (conversationChannel) {

        supabase.removeChannel(
            conversationChannel
        );


        conversationChannel =
            null;

    }


    if (presenceChannel) {

        supabase.removeChannel(
            presenceChannel
        );


        presenceChannel =
            null;

    }


    removeMessageRealtime();


    if (previewObjectURL) {

        URL.revokeObjectURL(
            previewObjectURL
        );


        previewObjectURL =
            null;

    }

}


/* =========================================================
   CLEAR MESSAGES
   ========================================================= */

function clearMessages() {

    if (!messagesContainer) {

        return;

    }


    messagesContainer
        .querySelectorAll(
            ".admin-message-row"
        )
        .forEach(
            element => {

                element.remove();

            }
        );

}


/* =========================================================
   WELCOME
   ========================================================= */

function showWelcome() {

    if (chatWelcome) {

        chatWelcome.style.display =
            "flex";

    }

}


function hideWelcome() {

    if (chatWelcome) {

        chatWelcome.style.display =
            "none";

    }

}


/* =========================================================
   LOADING
   ========================================================= */

function showConversationLoading() {

    if (conversationLoading) {

        conversationLoading.style.display =
            "flex";

    }

}


function hideConversationLoading() {

    if (conversationLoading) {

        conversationLoading.style.display =
            "none";

    }

}


function showChatLoading() {

    if (chatLoading) {

        chatLoading.style.display =
            "flex";

    }

}


function hideChatLoading() {

    if (chatLoading) {

        chatLoading.style.display =
            "none";

    }

}


/* =========================================================
   COMPOSER
   ========================================================= */

function enableComposer() {

    if (messageInput) {

        messageInput.disabled =
            false;


        messageInput.placeholder =
            "Type your reply...";

    }


    if (sendButton) {

        sendButton.disabled =
            false;

    }

}


function disableComposer() {

    if (messageInput) {

        messageInput.disabled =
            true;


        messageInput.placeholder =
            "Select a customer first...";

    }


    if (sendButton) {

        sendButton.disabled =
            true;

    }

}


/* =========================================================
   SENDING STATE
   ========================================================= */

function setSendingState(
    sending
) {

    if (!sendButton) {

        return;

    }


    sendButton.disabled =
        sending;


    if (sending) {

        sendButton.textContent =
            "Sending...";

    } else {

        sendButton.textContent =
            "Send";

    }

}


/* =========================================================
   CONNECTION STATUS
   ========================================================= */

function setConnectionStatus(
    status
) {

    if (connectionStatus) {

        connectionStatus.textContent =
            status;

    }

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(
    message
) {

    if (!chatError) {

        console.error(
            message
        );


        return;

    }


    chatError.textContent =
        message;


    chatError.style.display =
        "block";

}


function hideError() {

    if (!chatError) {

        return;

    }


    chatError.textContent =
        "";


    chatError.style.display =
        "none";

}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    if (!messagesContainer) {

        return;

    }


    requestAnimationFrame(
        () => {

            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;

        }
    );

}


/* =========================================================
   IMAGE VIEWER
   ========================================================= */

function openImageViewer(
    imageURL
) {

    const oldViewer =
        document.querySelector(
            ".admin-image-viewer"
        );


    if (oldViewer) {

        oldViewer.remove();

    }


    const viewer =
        document.createElement(
            "div"
        );


    viewer.className =
        "admin-image-viewer";


    const image =
        document.createElement(
            "img"
        );


    image.src =
        imageURL;


    image.alt =
        "Chat image";


    const close =
        document.createElement(
            "button"
        );


    close.type =
        "button";


    close.className =
        "admin-image-close";


    close.textContent =
        "×";


    viewer.appendChild(
        image
    );


    viewer.appendChild(
        close
    );


    document.body.appendChild(
        viewer
    );


    function closeViewer() {

        viewer.remove();


        document.removeEventListener(
            "keydown",
            escapeHandler
        );

    }


    function escapeHandler(
        event
    ) {

        if (
            event.key ===
            "Escape"
        ) {

            closeViewer();

        }

    }


    close.addEventListener(
        "click",
        closeViewer
    );


    viewer.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                viewer
            ) {

                closeViewer();

            }

        }
    );


    document.addEventListener(
        "keydown",
        escapeHandler
    );

}


/* =========================================================
   CUSTOMER DATA HELPERS
   ========================================================= */

function getCustomerName(
    customer
) {

    if (!customer) {

        return "Customer";

    }


    const possibleNames = [

        customer.full_name,

        customer.fullname,

        customer.name,

        customer.display_name,

        customer.username,

        customer.first_name &&
        customer.last_name
            ? `${customer.first_name} ${customer.last_name}`
            : null,

        customer.first_name,

        customer.email
            ? customer.email.split("@")[0]
            : null

    ];


    const name =
        possibleNames.find(
            value =>
                value &&
                String(value).trim()
        );


    return name
        ? String(name).trim()
        : "Customer";

}


function getCustomerEmail(
    customer
) {

    if (!customer) {

        return "";

    }


    return (
        customer.email ||
        customer.email_address ||
        ""
    );

}


function getCustomerAvatar(
    customer
) {

    if (!customer) {

        return null;

    }


    return (
        customer.avatar_url ||
        customer.profile_picture ||
        customer.profile_image ||
        customer.image_url ||
        customer.photo_url ||
        customer.avatar ||
        null
    );

}


function getCustomerOnlineStatus(
    customer
) {

    if (!customer) {

        return "Offline";

    }


    return isCustomerOnline(
        customer.id
    )
        ? "Online"
        : "Offline";

}


/* =========================================================
   HELPERS
   ========================================================= */

function getInitial(
    value
) {

    if (!value) {

        return "C";

    }


    const clean =
        String(value)
            .trim();


    if (!clean) {

        return "C";

    }


    return clean
        .charAt(0)
        .toUpperCase();

}


function getExtension(
    fileName
) {

    const parts =
        String(fileName)
            .split(".");


    if (
        parts.length < 2
    ) {

        return "jpg";

    }


    return (
        parts
            .pop()
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            ) ||
        "jpg"
    );

}


function formatTime(
    dateString
) {

    if (!dateString) {

        return "";

    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const now =
        new Date();


    if (
        date.toDateString() ===
        now.toDateString()
    ) {

        return date.toLocaleTimeString(
            [],
            {
                hour:
                    "numeric",

                minute:
                    "2-digit"
            }
        );

    }


    return date.toLocaleDateString(
        [],
        {
            month:
                "short",

            day:
                "numeric"
        }
    );

}


/* =========================================================
   FRIENDLY ERROR
   ========================================================= */

function getFriendlyError(
    error
) {

    if (!error) {

        return "Something went wrong.";

    }


    console.error(
        "SUPABASE ERROR DETAILS:",
        error
    );


    const message =
        error.message ||
        error.error_description ||
        String(error);


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "row-level security"
        ) ||
        lower.includes(
            "42501"
        )
    ) {

        return (
            "Admin chat was blocked by Supabase Row Level Security. Check the Admin RLS policies and make sure the logged-in account has role = admin."
        );

    }


    if (
        lower.includes(
            "permission denied"
        )
    ) {

        return (
            "Supabase denied this action. Check the chat table permissions and RLS policies."
        );

    }


    if (
        lower.includes(
            "signature verification failed"
        )
    ) {

        return (
            "Storage rejected the image. Check the chat-attachments Storage policies."
        );

    }


    if (
        lower.includes(
            "jwt"
        ) ||
        lower.includes(
            "not authenticated"
        ) ||
        lower.includes(
            "auth session missing"
        )
    ) {

        return (
            "Admin session expired. Please log in again."
        );

    }


    if (
        lower.includes(
            "duplicate"
        )
    ) {

        return (
            "This conversation or message already exists."
        );

    }


    if (
        lower.includes(
            "column"
        ) &&
        lower.includes(
            "does not exist"
        )
    ) {

        return (
            "A database column used by the chat system does not exist. Check your chat table columns."
        );

    }


    if (
        lower.includes(
            "null value"
        ) &&
        lower.includes(
            "last_message_at"
        )
    ) {

        return (
            "The conversation timestamp cannot be empty."
        );

    }


    if (
        lower.includes(
            "foreign key"
        ) ||
        lower.includes(
            "violates foreign key constraint"
        )
    ) {

        return (
            "The conversation cannot be deleted because its messages are still linked to it. Check the chat_messages conversation foreign key."
        );

    }


    return message;

}