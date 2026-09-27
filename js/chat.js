import { supabase } from "./supabase.js";


/* =========================================================
   BUSINESS STORE
   CUSTOMER CHAT SYSTEM
   FINAL VERSION
   =========================================================

   FEATURES
   ---------------------------------------------------------
   - Customer authentication
   - Redirect to login.html
   - Create / load conversation
   - Send text messages
   - Upload image attachments
   - Image preview
   - Private Supabase Storage
   - Signed image URLs
   - Realtime messages
   - CUSTOMER REALTIME PRESENCE
   - Online presence shared with admin
   - Unread message handling
   - Auto scroll
   - Enter to send
   - Shift + Enter = new line
   - Fullscreen image viewer
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CHAT_BUCKET =
    "chat-attachments";

const MAX_FILE_SIZE =
    5 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


/*
   IMPORTANT:
   This MUST be exactly the same channel
   used by admin-chat.js.
*/
const PRESENCE_CHANNEL_NAME =
    "business-store-customer-presence";


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;

let conversation = null;

let realtimeChannel = null;

let presenceChannel = null;

let selectedFile = null;

let selectedFilePreviewURL = null;

let isSending = false;


/* =========================================================
   DOM
   ========================================================= */

const messagesContainer =
    document.getElementById(
        "messagesContainer"
    );

const messageInput =
    document.getElementById(
        "messageInput"
    );

const sendMessageBtn =
    document.getElementById(
        "sendMessageBtn"
    );

const attachmentInput =
    document.getElementById(
        "attachmentInput"
    );

const attachmentPreview =
    document.getElementById(
        "attachmentPreview"
    );

const attachmentPreviewImage =
    document.getElementById(
        "attachmentPreviewImage"
    );

const removeAttachmentBtn =
    document.getElementById(
        "removeAttachmentBtn"
    );

const attachmentButton =
    document.getElementById(
        "attachmentButton"
    );

const chatLoading =
    document.getElementById(
        "chatLoading"
    );

const emptyChat =
    document.getElementById(
        "emptyChat"
    );

const chatError =
    document.getElementById(
        "chatError"
    );


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initChat
);


async function initChat() {

    try {

        console.log(
            "CHAT SYSTEM STARTING..."
        );


        /* -----------------------------------------
           CHECK LOGIN
        ----------------------------------------- */

        const {
            data: {
                user
            },
            error: authError
        } = await supabase.auth.getUser();


        if (authError) {

            console.error(
                "Auth error:",
                authError
            );

            redirectToLogin();

            return;
        }


        if (!user) {

            console.log(
                "No logged-in customer."
            );

            redirectToLogin();

            return;
        }


        currentUser =
            user;


        console.log(
            "Logged in customer:",
            currentUser.id
        );


        /* -----------------------------------------
           SETUP EVENTS
        ----------------------------------------- */

        setupEvents();


        /* -----------------------------------------
           START CUSTOMER PRESENCE
        ----------------------------------------- */

        await setupCustomerPresence();


        /* -----------------------------------------
           GET / CREATE CONVERSATION
        ----------------------------------------- */

        await getOrCreateConversation();


        if (!conversation) {

            throw new Error(
                "Unable to create or load chat conversation."
            );
        }


        /* -----------------------------------------
           LOAD MESSAGES
        ----------------------------------------- */

        await loadMessages();


        /* -----------------------------------------
           MARK ADMIN MESSAGES AS READ
        ----------------------------------------- */

        await markAdminMessagesAsRead();


        /* -----------------------------------------
           MESSAGE REALTIME
        ----------------------------------------- */

        subscribeToRealtime();


        /* -----------------------------------------
           READY
        ----------------------------------------- */

        hideLoading();

        updateSendButton();


        console.log(
            "CHAT SYSTEM READY"
        );

        console.log(
            "CUSTOMER PRESENCE READY:",
            currentUser.id
        );


    } catch (error) {

        console.error(
            "Chat initialization error:",
            error
        );


        hideLoading();


        showError(
            getFriendlyError(error)
        );

    }

}


/* =========================================================
   REDIRECT TO LOGIN
   ========================================================= */

function redirectToLogin() {

    window.location.href =
        "../login.html";

}


/* =========================================================
   CUSTOMER REALTIME PRESENCE
   =========================================================

   IMPORTANT:

   The presence KEY is the customer's Supabase
   Auth UUID.

   Admin reads this UUID to determine whether
   the customer is online.
   ========================================================= */

async function setupCustomerPresence() {

    if (!currentUser?.id) {

        return;

    }


    /* -----------------------------------------
       REMOVE OLD CHANNEL
    ----------------------------------------- */

    if (presenceChannel) {

        try {

            await presenceChannel.untrack();

        } catch (error) {

            console.warn(
                "Presence untrack error:",
                error
            );

        }


        await supabase.removeChannel(
            presenceChannel
        );


        presenceChannel =
            null;

    }


    /* -----------------------------------------
       CREATE PRESENCE CHANNEL
    ----------------------------------------- */

    presenceChannel =
        supabase.channel(
            PRESENCE_CHANNEL_NAME,
            {
                config: {

                    presence: {

                        /*
                           THIS IS VERY IMPORTANT.

                           Admin will receive:

                           key = currentUser.id
                        */
                        key:
                            String(
                                currentUser.id
                            )

                    }

                }

            }
        );


    /* -----------------------------------------
       SUBSCRIBE
    ----------------------------------------- */

    await new Promise(
        (resolve, reject) => {

            let finished =
                false;


            presenceChannel.subscribe(
                async status => {

                    console.log(
                        "CUSTOMER PRESENCE STATUS:",
                        status
                    );


                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        try {

                            /*
                               Track this customer
                               as online.
                            */

                            const {
                                error
                            } =
                                await presenceChannel.track(
                                    {

                                        user_id:
                                            String(
                                                currentUser.id
                                            ),

                                        user_type:
                                            "customer",

                                        online_at:
                                            new Date()
                                                .toISOString()

                                    }
                                );


                            if (error) {

                                console.error(
                                    "Presence track error:",
                                    error
                                );


                                if (!finished) {

                                    finished =
                                        true;

                                    reject(
                                        error
                                    );

                                }


                                return;

                            }


                            console.log(
                                "CUSTOMER ONLINE:",
                                currentUser.id
                            );


                            if (!finished) {

                                finished =
                                    true;

                                resolve();

                            }

                        } catch (error) {

                            console.error(
                                "Presence setup error:",
                                error
                            );


                            if (!finished) {

                                finished =
                                    true;

                                reject(
                                    error
                                );

                            }

                        }

                    }


                    if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {

                        console.error(
                            "Customer presence channel error."
                        );


                        if (!finished) {

                            finished =
                                true;

                            reject(
                                new Error(
                                    "Customer presence channel error."
                                )
                            );

                        }

                    }


                    if (
                        status ===
                        "TIMED_OUT"
                    ) {

                        console.error(
                            "Customer presence timed out."
                        );


                        if (!finished) {

                            finished =
                                true;

                            reject(
                                new Error(
                                    "Customer presence timed out."
                                )
                            );

                        }

                    }

                }
            );

        }
    );

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    if (sendMessageBtn) {

        sendMessageBtn.addEventListener(
            "click",
            sendMessage
        );

    }


    if (messageInput) {

        messageInput.addEventListener(
            "input",
            function () {

                autoResizeInput();

                updateSendButton();

            }
        );


        messageInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();

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


    if (removeAttachmentBtn) {

        removeAttachmentBtn.addEventListener(
            "click",
            removeSelectedFile
        );

    }


    updateSendButton();

}


/* =========================================================
   GET OR CREATE CONVERSATION
   ========================================================= */

async function getOrCreateConversation() {

    if (!currentUser?.id) {

        throw new Error(
            "No logged-in customer found."
        );

    }


    console.log(
        "Checking existing conversation..."
    );


    /* -----------------------------------------
       FIND EXISTING
    ----------------------------------------- */

    const {
        data: existingConversation,
        error: findError
    } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq(
            "customer_id",
            currentUser.id
        )
        .maybeSingle();


    if (findError) {

        console.error(
            "Conversation lookup error:",
            findError
        );

        throw findError;

    }


    if (existingConversation) {

        conversation =
            existingConversation;


        console.log(
            "Existing conversation found:",
            conversation.id
        );


        return conversation;

    }


    /* -----------------------------------------
       CREATE NEW
    ----------------------------------------- */

    console.log(
        "No conversation found. Creating..."
    );


    const {
        data: newConversation,
        error: createError
    } = await supabase
        .from("chat_conversations")
        .insert({

            customer_id:
                currentUser.id,

            status:
                "open",

            last_message:
                null,

            last_message_at:
                new Date().toISOString(),

            last_sender_type:
                null,

            unread_for_customer:
                0,

            unread_for_admin:
                0

        })
        .select("*")
        .single();


    if (createError) {

        console.error(
            "Conversation creation error:",
            createError
        );

        throw createError;

    }


    if (!newConversation) {

        throw new Error(
            "Conversation was created but no data was returned."
        );

    }


    conversation =
        newConversation;


    console.log(
        "New conversation created:",
        conversation.id
    );


    return conversation;

}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {

    if (!conversation) {

        return;

    }


    const {
        data,
        error
    } = await supabase
        .from("chat_messages")
        .select("*")
        .eq(
            "conversation_id",
            conversation.id
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Message loading error:",
            error
        );

        throw error;

    }


    clearMessages();


    if (
        !data ||
        data.length === 0
    ) {

        showEmptyChat();

        return;

    }


    hideEmptyChat();


    for (
        const message of data
    ) {

        await renderMessage(
            message
        );

    }


    scrollToBottom();

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isSending) {

        return;

    }


    if (!conversation) {

        showTemporaryStatus(
            "Chat conversation is not ready yet."
        );

        return;

    }


    const text =
        messageInput
            ? messageInput.value.trim()
            : "";


    if (
        !text &&
        !selectedFile
    ) {

        showTemporaryStatus(
            "Type a message or attach an image."
        );

        return;

    }


    isSending =
        true;


    setSendButtonState(
        true
    );


    try {

        let attachmentData =
            null;


        /* -----------------------------------------
           UPLOAD
        ----------------------------------------- */

        if (selectedFile) {

            attachmentData =
                await uploadAttachment(
                    selectedFile
                );

        }


        /* -----------------------------------------
           INSERT MESSAGE
        ----------------------------------------- */

        const {
            data: insertedMessage,
            error: messageError
        } = await supabase
            .from("chat_messages")
            .insert({

                conversation_id:
                    conversation.id,

                sender_id:
                    currentUser.id,

                sender_type:
                    "customer",

                message:
                    text || null,

                attachment_url:
                    attachmentData
                        ? attachmentData.path
                        : null,

                attachment_path:
                    attachmentData
                        ? attachmentData.path
                        : null,

                attachment_type:
                    attachmentData
                        ? attachmentData.type
                        : null,

                attachment_name:
                    attachmentData
                        ? attachmentData.name
                        : null,

                is_read:
                    false

            })
            .select("*")
            .single();


        if (messageError) {

            if (attachmentData) {

                try {

                    await supabase.storage
                        .from(CHAT_BUCKET)
                        .remove([
                            attachmentData.path
                        ]);

                } catch (cleanupError) {

                    console.warn(
                        "Attachment cleanup error:",
                        cleanupError
                    );

                }

            }


            throw messageError;

        }


        /* -----------------------------------------
           UPDATE CONVERSATION
        ----------------------------------------- */

        const lastMessage =
            text ||
            "📷 Image attachment";


        const newTimestamp =
            new Date().toISOString();


        const currentUnread =
            Number(
                conversation.unread_for_admin ||
                0
            );


        const newUnreadCount =
            currentUnread + 1;


        const {
            data: updatedConversation,
            error: conversationError
        } = await supabase
            .from("chat_conversations")
            .update({

                last_message:
                    lastMessage,

                last_message_at:
                    newTimestamp,

                last_sender_type:
                    "customer",

                unread_for_admin:
                    newUnreadCount,

                status:
                    "open"

            })
            .eq(
                "id",
                conversation.id
            )
            .select("*")
            .single();


        if (conversationError) {

            console.warn(
                "Conversation update error:",
                conversationError
            );

        } else if (updatedConversation) {

            conversation =
                updatedConversation;

        }


        /* -----------------------------------------
           LOCAL UPDATE
        ----------------------------------------- */

        conversation.last_message =
            lastMessage;

        conversation.last_message_at =
            newTimestamp;

        conversation.last_sender_type =
            "customer";

        conversation.unread_for_admin =
            newUnreadCount;

        conversation.status =
            "open";


        /* -----------------------------------------
           CLEAR INPUT
        ----------------------------------------- */

        if (messageInput) {

            messageInput.value =
                "";

            autoResizeInput();

        }


        removeSelectedFile();

        hideEmptyChat();


        /* -----------------------------------------
           RENDER
        ----------------------------------------- */

        if (
            insertedMessage &&
            !document.querySelector(
                `[data-message-id="${insertedMessage.id}"]`
            )
        ) {

            await renderMessage(
                insertedMessage
            );

            scrollToBottom();

        }


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );


        showTemporaryStatus(
            getFriendlyError(error)
        );


    } finally {

        isSending =
            false;

        setSendButtonState(
            false
        );

        updateSendButton();

    }

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
            "Image is too large. Maximum size is 5MB."
        );

    }


    let extension =
        "jpg";


    if (
        file.type ===
        "image/png"
    ) {

        extension =
            "png";

    }


    if (
        file.type ===
        "image/webp"
    ) {

        extension =
            "webp";

    }


    const randomPart =
        Math.random()
            .toString(36)
            .substring(
                2,
                12
            );


    const timestamp =
        Date.now();


    const filePath =
        `${currentUser.id}/${conversation.id}/${timestamp}-${randomPart}.${extension}`;


    console.log(
        "Uploading chat attachment:",
        filePath
    );


    const {
        error
    } = await supabase.storage
        .from(CHAT_BUCKET)
        .upload(
            filePath,
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

        console.error(
            "Attachment upload error:",
            error
        );

        throw new Error(
            getFriendlyStorageError(
                error
            )
        );

    }


    return {

        path:
            filePath,

        type:
            file.type,

        name:
            file.name

    };

}


/* =========================================================
   FILE SELECTION
   ========================================================= */

function handleFileSelection(
    event
) {

    const file =
        event.target.files &&
        event.target.files[0];


    if (!file) {

        return;

    }


    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {

        showTemporaryStatus(
            "Only JPG, PNG, and WEBP images are allowed."
        );

        clearFileInput();

        return;

    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        showTemporaryStatus(
            "Image is too large. Maximum size is 5MB."
        );

        clearFileInput();

        return;

    }


    if (selectedFilePreviewURL) {

        URL.revokeObjectURL(
            selectedFilePreviewURL
        );

        selectedFilePreviewURL =
            null;

    }


    selectedFile =
        file;


    if (
        attachmentPreview &&
        attachmentPreviewImage
    ) {

        selectedFilePreviewURL =
            URL.createObjectURL(
                file
            );


        attachmentPreviewImage.src =
            selectedFilePreviewURL;


        attachmentPreview.classList.add(
            "show"
        );


        const nameElement =
            document.getElementById(
                "attachmentPreviewName"
            );


        const sizeElement =
            document.getElementById(
                "attachmentPreviewSize"
            );


        if (nameElement) {

            nameElement.textContent =
                file.name;

        }


        if (sizeElement) {

            sizeElement.textContent =
                formatFileSize(
                    file.size
                );

        }

    }


    updateSendButton();

}


/* =========================================================
   REMOVE SELECTED FILE
   ========================================================= */

function removeSelectedFile() {

    selectedFile =
        null;


    if (selectedFilePreviewURL) {

        URL.revokeObjectURL(
            selectedFilePreviewURL
        );

        selectedFilePreviewURL =
            null;

    }


    clearFileInput();


    if (attachmentPreview) {

        attachmentPreview.classList.remove(
            "show"
        );

        attachmentPreview.style.display =
            "";

    }


    if (attachmentPreviewImage) {

        attachmentPreviewImage.src =
            "";

    }


    const nameElement =
        document.getElementById(
            "attachmentPreviewName"
        );


    const sizeElement =
        document.getElementById(
            "attachmentPreviewSize"
        );


    if (nameElement) {

        nameElement.textContent =
            "Image";

    }


    if (sizeElement) {

        sizeElement.textContent =
            "Ready to send";

    }


    updateSendButton();

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
   RENDER MESSAGE
   ========================================================= */

async function renderMessage(
    message
) {

    if (!messagesContainer) {

        return;

    }


    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {

        return;

    }


    hideEmptyChat();


    const isCustomer =
        message.sender_type ===
        "customer";


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        `message-row ${
            isCustomer
                ? "customer"
                : "admin"
        }`;


    wrapper.dataset.messageId =
        message.id;


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "bubble";


    if (message.message) {

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "chat-message-text";


        text.textContent =
            message.message;


        bubble.appendChild(
            text
        );

    }


    if (
        message.attachment_path
    ) {

        const image =
            await createAttachmentImage(
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
        "message-time";


    time.textContent =
        formatMessageTime(
            message.created_at
        );


    bubble.appendChild(
        time
    );


    content.appendChild(
        bubble
    );


    wrapper.appendChild(
        content
    );


    messagesContainer.appendChild(
        wrapper
    );


    scrollToBottom();

}


/* =========================================================
   CREATE ATTACHMENT IMAGE
   ========================================================= */

async function createAttachmentImage(
    message
) {

    if (
        !message.attachment_path
    ) {

        return null;

    }


    try {

        const {
            data,
            error
        } = await supabase.storage
            .from(CHAT_BUCKET)
            .createSignedUrl(
                message.attachment_path,
                60 * 60
            );


        if (error) {

            console.error(
                "Signed URL error:",
                error
            );

            return createAttachmentError();

        }


        if (
            !data?.signedUrl
        ) {

            return createAttachmentError();

        }


        const image =
            document.createElement(
                "img"
            );


        image.className =
            "attachment";


        image.src =
            data.signedUrl;


        image.alt =
            message.attachment_name ||
            "Chat attachment";


        image.loading =
            "lazy";


        image.decoding =
            "async";


        image.title =
            "Click to view image";


        image.addEventListener(
            "error",
            function () {

                image.replaceWith(
                    createAttachmentError()
                );

            }
        );


        image.addEventListener(
            "click",
            function () {

                openImageViewer(
                    data.signedUrl
                );

            }
        );


        return image;


    } catch (error) {

        console.error(
            "Attachment rendering error:",
            error
        );

        return createAttachmentError();

    }

}


/* =========================================================
   ATTACHMENT ERROR
   ========================================================= */

function createAttachmentError() {

    const errorElement =
        document.createElement(
            "div"
        );


    errorElement.className =
        "image-loading";


    errorElement.textContent =
        "Unable to load image.";


    return errorElement;

}


/* =========================================================
   FULLSCREEN IMAGE VIEWER
   ========================================================= */

function openImageViewer(
    imageURL
) {

    const overlay =
        document.createElement(
            "div"
        );


    overlay.style.position =
        "fixed";

    overlay.style.inset =
        "0";

    overlay.style.zIndex =
        "99999";

    overlay.style.background =
        "rgba(0,0,0,0.92)";

    overlay.style.display =
        "flex";

    overlay.style.alignItems =
        "center";

    overlay.style.justifyContent =
        "center";

    overlay.style.padding =
        "25px";

    overlay.style.cursor =
        "zoom-out";


    const image =
        document.createElement(
            "img"
        );


    image.src =
        imageURL;


    image.alt =
        "Chat attachment";


    image.style.maxWidth =
        "95vw";


    image.style.maxHeight =
        "90vh";


    image.style.width =
        "auto";


    image.style.height =
        "auto";


    image.style.objectFit =
        "contain";


    image.style.borderRadius =
        "16px";


    image.style.boxShadow =
        "0 30px 80px rgba(0,0,0,0.6)";


    image.style.cursor =
        "default";


    const close =
        document.createElement(
            "button"
        );


    close.type =
        "button";


    close.innerHTML =
        "&times;";


    close.setAttribute(
        "aria-label",
        "Close image"
    );


    close.style.position =
        "absolute";


    close.style.top =
        "18px";


    close.style.right =
        "20px";


    close.style.width =
        "48px";


    close.style.height =
        "48px";


    close.style.border =
        "1px solid rgba(255,255,255,0.15)";


    close.style.borderRadius =
        "50%";


    close.style.background =
        "rgba(255,255,255,0.08)";


    close.style.color =
        "#fff";


    close.style.fontSize =
        "30px";


    close.style.lineHeight =
        "1";


    close.style.cursor =
        "pointer";


    close.style.backdropFilter =
        "blur(10px)";


    function closeViewer() {

        overlay.remove();

        document.body.style.overflow =
            "";

        document.removeEventListener(
            "keydown",
            handleEscape
        );

    }


    function handleEscape(
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


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                overlay
            ) {

                closeViewer();

            }

        }
    );


    document.addEventListener(
        "keydown",
        handleEscape
    );


    overlay.appendChild(
        image
    );


    overlay.appendChild(
        close
    );


    document.body.appendChild(
        overlay
    );


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   REALTIME MESSAGES
   ========================================================= */

function subscribeToRealtime() {

    if (!conversation) {

        return;

    }


    if (realtimeChannel) {

        supabase.removeChannel(
            realtimeChannel
        );

        realtimeChannel =
            null;

    }


    realtimeChannel =
        supabase
            .channel(
                `customer-chat-${conversation.id}`
            )
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
                        `conversation_id=eq.${conversation.id}`

                },
                async payload => {

                    console.log(
                        "Realtime message:",
                        payload.new
                    );


                    await renderMessage(
                        payload.new
                    );


                    if (
                        payload.new
                            .sender_type ===
                        "admin"
                    ) {

                        await markMessageAsRead(
                            payload.new.id
                        );


                        await decreaseCustomerUnread();

                    }

                }
            )
            .subscribe(
                status => {

                    console.log(
                        "Chat realtime status:",
                        status
                    );

                }
            );

}


/* =========================================================
   MARK ADMIN MESSAGES AS READ
   ========================================================= */

async function markAdminMessagesAsRead() {

    if (!conversation) {

        return;

    }


    const {
        error
    } = await supabase
        .from("chat_messages")
        .update({

            is_read:
                true

        })
        .eq(
            "conversation_id",
            conversation.id
        )
        .eq(
            "sender_type",
            "admin"
        )
        .eq(
            "is_read",
            false
        );


    if (error) {

        console.error(
            "Mark messages read error:",
            error
        );

        return;

    }


    const {
        error: unreadError
    } = await supabase
        .from("chat_conversations")
        .update({

            unread_for_customer:
                0

        })
        .eq(
            "id",
            conversation.id
        );


    if (unreadError) {

        console.error(
            "Reset customer unread error:",
            unreadError
        );

    }


    conversation.unread_for_customer =
        0;

}


/* =========================================================
   MARK ONE MESSAGE READ
   ========================================================= */

async function markMessageAsRead(
    messageID
) {

    const {
        error
    } = await supabase
        .from("chat_messages")
        .update({

            is_read:
                true

        })
        .eq(
            "id",
            messageID
        );


    if (error) {

        console.error(
            "Unable to mark message read:",
            error
        );

    }

}


/* =========================================================
   DECREASE CUSTOMER UNREAD
   ========================================================= */

async function decreaseCustomerUnread() {

    if (!conversation) {

        return;

    }


    const {
        error
    } = await supabase
        .from("chat_conversations")
        .update({

            unread_for_customer:
                0

        })
        .eq(
            "id",
            conversation.id
        );


    if (error) {

        console.error(
            "Unable to reset unread:",
            error
        );

        return;

    }


    conversation.unread_for_customer =
        0;

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
            ".message-row"
        )
        .forEach(
            element => {

                element.remove();

            }
        );

}


/* =========================================================
   EMPTY CHAT
   ========================================================= */

function showEmptyChat() {

    if (emptyChat) {

        emptyChat.style.display =
            "block";

    }

}


function hideEmptyChat() {

    if (emptyChat) {

        emptyChat.style.display =
            "none";

    }

}


/* =========================================================
   LOADING
   ========================================================= */

function hideLoading() {

    if (chatLoading) {

        chatLoading.style.display =
            "none";

    }

}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    if (!messagesContainer) {

        return;

    }


    requestAnimationFrame(
        function () {

            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;

        }
    );

}


/* =========================================================
   SEND BUTTON
   ========================================================= */

function setSendButtonState(
    sending
) {

    if (!sendMessageBtn) {

        return;

    }


    sendMessageBtn.disabled =
        sending;


    if (sending) {

        if (
            !sendMessageBtn.dataset
                .originalText
        ) {

            sendMessageBtn.dataset
                .originalText =
                sendMessageBtn.innerHTML;

        }


        sendMessageBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i>';

    } else {

        if (
            sendMessageBtn.dataset
                .originalText
        ) {

            sendMessageBtn.innerHTML =
                sendMessageBtn.dataset
                    .originalText;

        }

    }

}


/* =========================================================
   UPDATE SEND BUTTON
   ========================================================= */

function updateSendButton() {

    if (!sendMessageBtn) {

        return;

    }


    if (isSending) {

        return;

    }


    const text =
        messageInput
            ? messageInput.value.trim()
            : "";


    sendMessageBtn.disabled =
        !text &&
        !selectedFile;

}


/* =========================================================
   AUTO RESIZE
   ========================================================= */

function autoResizeInput() {

    if (!messageInput) {

        return;

    }


    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            140
        ) + "px";

}


/* =========================================================
   TEMPORARY STATUS
   ========================================================= */

function showTemporaryStatus(
    message
) {

    showError(
        message
    );


    setTimeout(
        function () {

            hideError();

        },
        3500
    );

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


    chatError.classList.add(
        "show"
    );

}


function hideError() {

    if (!chatError) {

        return;

    }


    chatError.textContent =
        "";


    chatError.classList.remove(
        "show"
    );

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatMessageTime(
    timestamp
) {

    if (!timestamp) {

        return "";

    }


    const date =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


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


/* =========================================================
   FORMAT FILE SIZE
   ========================================================= */

function formatFileSize(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "0 KB";

    }


    const kb =
        bytes / 1024;


    if (kb < 1024) {

        return (
            kb.toFixed(1) +
            " KB"
        );

    }


    const mb =
        kb / 1024;


    return (
        mb.toFixed(2) +
        " MB"
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


    const code =
        error.code ||
        "";


    const message =
        error.message ||
        "";


    if (
        code === "42501"
    ) {

        return (
            "Permission denied. Please check the chat database policies."
        );

    }


    if (
        code === "23505"
    ) {

        return (
            "This customer already has a chat conversation."
        );

    }


    if (
        code === "23503"
    ) {

        return (
            "The customer account could not be linked to the chat."
        );

    }


    if (
        code === "PGRST204"
    ) {

        return (
            "A chat database column is missing. Please check the chat table structure."
        );

    }


    if (
        code === "PGRST116"
    ) {

        return (
            "The chat conversation could not be found."
        );

    }


    if (message) {

        return message;

    }


    return "Unable to send message.";

}


/* =========================================================
   STORAGE ERROR
   ========================================================= */

function getFriendlyStorageError(
    error
) {

    const message =
        error?.message ||
        "";


    const lowerMessage =
        message.toLowerCase();


    if (
        lowerMessage.includes(
            "row-level"
        ) ||
        lowerMessage.includes(
            "rls"
        ) ||
        lowerMessage.includes(
            "policy"
        ) ||
        lowerMessage.includes(
            "permission"
        )
    ) {

        return (
            "Storage permission denied. Please check the chat storage policies."
        );

    }


    if (
        lowerMessage.includes(
            "signature"
        )
    ) {

        return (
            "Storage authentication failed. Please check the chat bucket policies."
        );

    }


    if (
        lowerMessage.includes(
            "not found"
        )
    ) {

        return (
            "Chat storage bucket was not found."
        );

    }


    if (
        lowerMessage.includes(
            "size"
        )
    ) {

        return (
            "Image is too large. Maximum size is 5MB."
        );

    }


    return (
        "Image upload failed: " +
        message
    );

}


/* =========================================================
   CLEANUP
   ========================================================= */

async function cleanupCustomerPresence() {

    if (!presenceChannel) {

        return;

    }


    try {

        /*
           Tell Supabase this customer is no
           longer tracking presence.
        */

        await presenceChannel.untrack();

    } catch (error) {

        console.warn(
            "Presence cleanup error:",
            error
        );

    }


    try {

        await supabase.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.warn(
            "Presence channel cleanup error:",
            error
        );

    }


    presenceChannel =
        null;

}


/* =========================================================
   PAGE CLEANUP
   ========================================================= */

window.addEventListener(
    "pagehide",
    cleanupCustomerPresence
);


window.addEventListener(
    "beforeunload",
    function () {

        if (realtimeChannel) {

            supabase.removeChannel(
                realtimeChannel
            );

            realtimeChannel =
                null;

        }


        cleanupCustomerPresence();


        if (selectedFilePreviewURL) {

            URL.revokeObjectURL(
                selectedFilePreviewURL
            );

            selectedFilePreviewURL =
                null;

        }

    }
);