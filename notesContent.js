const TASKFLOW__ASSOCIATION_PREFIX_HIGHLIGHT = "highlight";
const TASKFLOW__ASSOCIATION_PREFIX_SIDENOTE = "sidenote";

window.addEventListener("beforeunload", function(event) {
    const highlights = taskflow__collectHighlights();
    const sidenotes = taskflow__collectSidenotes();
    if (highlights.length > 0 || sidenotes.length > 0) {
        event.returnValue = "There are unsaved highlights or sidenotes. Are you sure you want to leave?";
    }
});


chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === "logSelectedText") {
        const selection = window.getSelection();
        if (selection.rangeCount) {
            taskflow__logSelectedText(selection);
        } else {
            taskflow__addSidenote();
        }
    } else if (message.action === "collectNotes") {
        taskflow__collectNotes();
    } else if (message.action === "toggleSidenotes") {
        taskflow__toggleSidenotes();
    }
});

function taskflow__createUniqueId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function taskflow__handleSidenoteKeyPresses(event) {
    const sidenotePanel = document.getElementById("taskflow-sidenote-panel");
    if (
        (
            (event.key === "Escape") ||
            (event.ctrlKey && event.key == "q")
        ) && sidenotePanel
    ) {
        event.preventDefault();
        taskflow__removeSidenotePane();
    } else if (
        document.querySelector("[taskflow-sidenote-box-active='true']") &&
        (
            (event.ctrlKey && event.key === "i") ||
            (event.key === "Enter")
        )
    ) {
        event.preventDefault();
        const activeSidenoteBox = document.querySelector("[taskflow-sidenote-box-active='true']");
        const textbox = activeSidenoteBox.querySelector("textarea");
        textbox.focus();
    }

    // skip if we're in insert mode
    if (document.querySelector(".taskflow-insert-mode")) {
        return;
    }

    if (
        (event.ctrlKey && event.key === "j") ||
        (event.key === "Tab" && !event.shiftKey)
    ) {
        event.preventDefault();
        taskflow__cycleSidenotes(1);
    } else if (
        (event.ctrlKey && event.key === "k") ||
        (event.key === "Tab" && event.shiftKey)
    ) {
        event.preventDefault();
        taskflow__cycleSidenotes(-1);
    } else if (event.ctrlKey && event.key === "x") {
        event.preventDefault();
        taskflow__deleteActiveSidenote();
    }
}

function taskflow__toggleSidenotes() {
    const sidenotePanel = document.getElementById("taskflow-sidenote-panel");
    if (sidenotePanel) {
        taskflow__removeSidenotePane();
        return;
    }

    const sidenotePanelContainer = document.createElement("div");
    sidenotePanelContainer.id = "taskflow-sidenote-panel";
    sidenotePanelContainer.style.backgroundColor = "rgba(32, 32, 32, 0.75)";
    sidenotePanelContainer.style.position = "fixed";
    sidenotePanelContainer.style.right = "0";
    sidenotePanelContainer.style.top = "0";
    sidenotePanelContainer.style.margin = "1em";
    sidenotePanelContainer.style.padding = "0.5em";
    sidenotePanelContainer.style.paddingLeft = "1em";
    sidenotePanelContainer.style.paddingRight = "1em";
    sidenotePanelContainer.style.borderRadius = "1em";
    sidenotePanelContainer.style.zIndex = 100000;
    sidenotePanelContainer.style.userSelect = "none";

    const sidenotes = document.querySelectorAll(".taskflow-sidenote-container");
    if (sidenotes.length === 0) {
        return;
    }

    for (let i = 0; i < sidenotes.length; i++) {
        const sidenote = sidenotes[i];
        const sidenoteText = sidenote.querySelector(".taskflow-comment-box").value;
        const sidenoteId = sidenote.getAttribute("taskflow-data-associated-id");
        const sidenoteInstance = taskflow__createSidenoteInstance(i, sidenoteId, sidenoteText);
        sidenotePanelContainer.appendChild(sidenoteInstance);
    }

    document.addEventListener("keydown", taskflow__handleSidenoteKeyPresses);
    document.body.appendChild(sidenotePanelContainer);
}

function taskflow__removeSidenotePane() {
    const sidenotePanel = document.getElementById("taskflow-sidenote-panel");
    sidenotePanel.remove();
    document.removeEventListener("keydown", taskflow__handleSidenoteKeyPresses);
    const activeSidenoteBox = document.querySelector("[taskflow-sidenote-box-active='true']");
    if (activeSidenoteBox) {
        activeSidenoteBox.style.display = "none";
        activeSidenoteBox.setAttribute("taskflow-sidenote-box-active", "false");
    }
}

function taskflow__refreshSidenotePane() {
    const sidenotePanel = document.getElementById("taskflow-sidenote-panel");
    if (!sidenotePanel) {
        return false;
    }

    const activeContainer = document.querySelector(".taskflow-sidenote-active")

    if (!activeContainer) {
        return;
    }

    const idx = parseInt(activeContainer.getAttribute("taskflow-data-sidenote-id"));
    taskflow__removeSidenotePane();
    taskflow__toggleSidenotes();

    const modifiedContainer = document.querySelector(`[taskflow-data-sidenote-id="${idx}"]`);
    taskflow__setActiveSidenoteContainer(modifiedContainer);
    return true;
}

function taskflow__cycleSidenotes(direction) {
    if (direction !== 1 && direction !== -1) {
        return;
    }

    const activeSidenote = document.querySelector(".taskflow-sidenote-active");
    let nextSidenoteId = 0;
    if (activeSidenote) {
        nextSidenoteId = parseInt(activeSidenote.getAttribute("taskflow-data-sidenote-id")) + direction;
    }

    const nextSidenote = document.querySelector(`[taskflow-data-sidenote-id="${nextSidenoteId}"]`);
    if (!nextSidenote) {
        return;
    }

    if (activeSidenote) {
        taskflow__defocusSidenoteContainer(activeSidenote);
    }

    return taskflow__setActiveSidenoteContainer(nextSidenote);
}

function taskflow__setActiveSidenoteContainer(sidenote) {
    sidenote.classList.add("taskflow-sidenote-active");
    sidenote.style.opacity = "0.9";

    const sidenoteAssociatedId = sidenote.getAttribute("taskflow-sidenote-container-id");
    const sidenoteTextbox = document.querySelector(`[taskflow-data-associated-id="${sidenoteAssociatedId}"]`);
    sidenoteTextbox.setAttribute("taskflow-sidenote-box-active", "true");
    sidenoteTextbox.style.display = "flex";
    sidenoteTextbox.style.opacity = 0.7;
    return sidenote;

}

function taskflow__defocusSidenoteContainer(sidenote) {
    sidenote.classList.remove("taskflow-sidenote-active");
    sidenote.style.opacity = "0.6";
    const activeSidenoteId = sidenote.getAttribute("taskflow-sidenote-container-id");
    const activeSidenoteTextbox = document.querySelector(`[taskflow-data-associated-id="${activeSidenoteId}"]`);
    activeSidenoteTextbox.blur();
    activeSidenoteTextbox.style.display = "none";
    activeSidenoteTextbox.setAttribute("taskflow-sidenote-box-active", "false");
}

function taskflow__createSidenoteInstance(idx, containerId, text) {
    const sidenoteInstance = document.createElement("div");
    sidenoteInstance.setAttribute("taskflow-data-sidenote-id", idx);
    sidenoteInstance.setAttribute("taskflow-sidenote-container-id", containerId);
    sidenoteInstance.classList.add("taskflow-sidenote");
    sidenoteInstance.style.width = "20em";
    sidenoteInstance.style.opacity = "0.6";
    sidenoteInstance.style.backgroundColor = "#333";
    sidenoteInstance.style.border = "2px solid #eee";
    sidenoteInstance.style.borderRadius = "1em";
    sidenoteInstance.style.overflow = "auto";
    sidenoteInstance.style.padding = "0.5em";
    sidenoteInstance.style.margin = "0.5em";
    sidenoteInstance.style.whiteSpace = "nowrap";
    sidenoteInstance.style.textOverflow = "ellipsis";
    sidenoteInstance.style.overflow = "hidden";

    const sidenoteText = document.createElement("span");
    sidenoteText.style.color = "#fff";
    sidenoteText.style.fontSize = "1em";
    sidenoteText.textContent = text;
    sidenoteInstance.appendChild(sidenoteText);

    sidenoteInstance.addEventListener("click", function(event) {
        event.preventDefault();
        // TODO: fix bug where the textbox is opaque when clicked but not when <C-i>
        taskflow__refreshSidenotePane();
        const activeSidenoteBox = document.querySelector("[taskflow-sidenote-box-active='true']");
        const textbox = activeSidenoteBox.querySelector("textarea");
        textbox.focus();
    });

    sidenoteInstance.addEventListener("mouseover", function() {
        const currentlyActiveSidenote = document.querySelector(".taskflow-sidenote-active");
        if (currentlyActiveSidenote) {
            taskflow__defocusSidenoteContainer(currentlyActiveSidenote);
        }
        taskflow__setActiveSidenoteContainer(this);
    });

    sidenoteInstance.addEventListener("mouseleave", function() {
        if (this.classList.contains("taskflow-sidenote-active")) {
            return;
        }
        taskflow__defocusSidenoteContainer(this);
    });

    return sidenoteInstance;
}

function taskflow__deleteActiveSidenote() {
    const activeSidenoteInstance = document.querySelector(".taskflow-sidenote-active");
    if (!activeSidenoteInstance) {
        return;
    }

    const sidenoteId = activeSidenoteInstance.getAttribute("taskflow-sidenote-container-id");
    const sidenoteTextbox = document.querySelector(`[taskflow-data-associated-id="${sidenoteId}"]`);

    const sidenoteContainerIdx = parseInt(activeSidenoteInstance.getAttribute("taskflow-data-sidenote-id"));

    const sidenotePanel = activeSidenoteInstance.parentNode;
    if (sidenotePanel.children.length > 1) {
        if (sidenoteContainerIdx === 0) {
            taskflow__cycleSidenotes(1);
        } else {
            taskflow__cycleSidenotes(-1);
        }

        document.querySelector(`[taskflow-data-sidenote-id="${sidenoteContainerIdx}"]`).remove();
        let i = sidenoteContainerIdx + 1;
        let nextSidenote = document.querySelector(`[taskflow-data-sidenote-id="${i}"]`);
        while (nextSidenote) {
            nextSidenote.setAttribute("taskflow-data-sidenote-id", i - 1);
            i++;
            nextSidenote = document.querySelector(`[taskflow-data-sidenote-id="${i}"]`);
        }
    } else {
        taskflow__removeSidenotePane();
    }
    sidenoteTextbox.remove();
}

function taskflow__addSidenote() {
    const associatedId = taskflow__createUniqueId(
        TASKFLOW__ASSOCIATION_PREFIX_SIDENOTE,
    );
    const commentContainer = document.createElement("div");
    commentContainer.classList.add("taskflow-sidenote-container");
    commentContainer.style.position = "fixed";
    commentContainer.style.left = "0";
    commentContainer.style.right = "0";
    commentContainer.style.margin = "auto";
    commentContainer.style.display = "flex";
    commentContainer.style.justifyContent = "center";
    commentContainer.style.bottom = "3em";
    commentContainer.style.zIndex = 100000;
    commentContainer.setAttribute("taskflow-data-associated-id", associatedId);

    const commentBox = document.createElement("textarea");
    commentBox.style.width = "50%";
    commentBox.style.height = "3em";
    commentBox.style.color = "black";
    commentBox.style.borderRadius = "5px";
    commentBox.style.fontSize = "1em";
    commentBox.style.backgroundColor = "#fff";
    commentBox.style.border = "1px solid black";
    commentBox.style.padding = "5px";
    commentBox.classList.add("taskflow-comment-box");
    commentContainer.appendChild(commentBox);
    document.body.appendChild(commentContainer);

    commentBox.addEventListener("blur", function() {
        if (this.value.trim() === "") {
            const parent = this.parentNode;
            document.body.removeChild(parent);
        }
        this.parentNode.style.display = "none";
        this.parentNode.setAttribute("taskflow-sidenote-box-active", "false");
        this.parentNode.classList.remove("taskflow-insert-mode");
    });

    commentBox.addEventListener("keydown", function(event) {
        if (
            (event.key === "Enter" &&
                (!event.shiftKey || event.metaKey || event.ctrlKey)) ||
            event.key === "Escape"
        ) {
            event.preventDefault();
            // TODO: fix bug when sidenote panel is toggled and a sidenote is added, the sidenote panel does not update
            const sidenotePanel = document.getElementById("taskflow-sidenote-panel");
            if (sidenotePanel) {
                taskflow__refreshSidenotePane()
            }
            this.blur();
        }
    });

    commentBox.addEventListener("mouseover", function() {
        this.parentNode.style.opacity = "1";
    });

    commentBox.addEventListener("focusin", function() {
        this.parentNode.style.opacity = "1";
        this.parentNode.classList.add("taskflow-insert-mode");
        const sidenoteContainer = document.querySelector(`[taskflow-sidenote-container-id="${associatedId}"]`);
        if (sidenoteContainer) {
            sidenoteContainer.style.border = "0.15em solid yellow";
        }
    });

    commentBox.addEventListener("focusout", function() {
        if (this.parentNode.style.display !== "none" &&
            this.parentNode.getAttribute("taskflow-sidenote-box-active") === "true") {
            this.parentNode.style.opacity = "0.7";
            this.parentNode.classList.remove("taskflow-insert-mode");
            const sidenoteContainer = document.querySelector(`[taskflow-sidenote-container-id="${associatedId}"]`);
            sidenoteContainer.style.border = "0";
        }
    });

    commentBox.addEventListener("mouseleave", function() {
        if (this.parentNode.style.display !== "none" &&
            this.parentNode.getAttribute("taskflow-sidenote-box-active") === "true") {
            this.parentNode.style.opacity = "0.7";
        }
    });

    commentBox.focus();
}

function taskflow__logSelectedText(selection) {
    const div = document.createElement("div");
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");

    const associationId = taskflow__createUniqueId(
        TASKFLOW__ASSOCIATION_PREFIX_HIGHLIGHT,
    );
    span.id = associationId;
    span.style.backgroundColor = "hsl(50, 100%, 40%)";
    span.style.cursor = "pointer";
    span.classList.add("taskflow-highlighted-text");

    div.classList.add("taskflow-highlighted-text-container");
    div.appendChild(span);

    document.addEventListener("keydown", function(event) {
        if (event.metaKey) {
            const highlightedSpans = document.querySelectorAll(
                ".taskflow-highlighted-text",
            );
            highlightedSpans.forEach((s) => {
                s.style.backgroundColor = "hsl(10, 100%, 50%)";
            });
        }
    });

    document.addEventListener("keyup", function() {
        const highlightedSpans = document.querySelectorAll(
            ".taskflow-highlighted-text",
        );
        highlightedSpans.forEach((s) => {
            s.style.backgroundColor = "hsl(50, 100%, 40%)";
        });
    });

    span.addEventListener("click", function(event) {
        if (event.metaKey) {
            // clear
            const parent = this.parentNode;
            while (this.firstChild) parent.insertBefore(this.firstChild, this);
            parent.removeChild(this);
            parent.normalize();
            document
                .querySelectorAll(`[taskflow-data-associated-id="${associationId}"]`)
                .forEach((container) => {
                    document.body.removeChild(container);
                });
        } else {
            taskflow__addComment(associationId, event.pageX, event.pageY);
        }
    });

    range.surroundContents(span);
    selection.removeAllRanges();
}

function taskflow__addComment(associatedId, posX, posY) {
    const commentContainer = document.createElement("div");
    commentContainer.style.position = "absolute";
    commentContainer.style.left = `${posX}px`;
    commentContainer.style.top = `${posY}px`;
    commentContainer.style.zIndex = 100000;
    commentContainer.setAttribute("taskflow-data-associated-id", associatedId);

    const commentIcon = document.createElement("div");
    commentIcon.innerHTML = "&#128172;";
    commentIcon.style.position = "absolute";
    commentIcon.style.width = "30px";
    commentIcon.style.height = "30px";
    commentIcon.style.borderRadius = "50%";
    commentIcon.style.backgroundColor = "#fff";
    commentIcon.style.color = "black";
    commentIcon.style.textAlign = "center";
    commentIcon.style.lineHeight = "30px";
    commentIcon.style.opacity = "0.8";
    commentIcon.style.display = "none";
    commentContainer.appendChild(commentIcon);

    const commentBox = document.createElement("textarea");
    commentBox.style.color = "black";
    commentBox.style.borderRadius = "5px";
    commentBox.style.fontSize = "1em";
    commentBox.style.backgroundColor = "#fff";
    commentBox.style.border = "1px solid black";
    commentBox.style.padding = "5px";
    commentBox.classList.add("taskflow-comment-box");
    commentContainer.appendChild(commentBox);
    document.body.appendChild(commentContainer);

    commentBox.addEventListener("blur", function() {
        if (this.value.trim() === "") {
            const parent = this.parentNode;
            document.body.removeChild(parent);
        }
        this.style.display = "none";
        commentIcon.style.display = "block";
        commentContainer.style.width = "30px";
        commentContainer.style.height = "30px";
    });

    commentIcon.addEventListener("mouseenter", function() {
        this.style.display = "none";
        commentBox.style.display = "block";
        commentBox.readOnly = true;
        commentContainer.style.width = "";
        commentContainer.style.height = "";
    });

    commentBox.addEventListener("mouseleave", function() {
        if (commentBox.readOnly && commentBox.style.display !== "none") {
            commentBox.style.display = "none";
            commentIcon.style.display = "block";
        }
    });

    commentBox.addEventListener("keydown", function(event) {
        if (
            event.key === "Enter" &&
            (!event.shiftKey || event.metaKey || event.ctrlKey)
        ) {
            event.preventDefault();
            this.blur();
        }
    });

    commentBox.addEventListener("click", function() {
        this.style.opacity = "1";
        this.readOnly = false;
        this.focus();
    });
}

function taskflow__collectHighlights() {
    const highlightedSpans = document.querySelectorAll(
        ".taskflow-highlighted-text",
    );
    const mapping = [];

    highlightedSpans.forEach((span) => {
        const text = span.textContent;
        const spanId = span.id;
        const comments = [];

        if (text.trim() === "") {
            return;
        }

        document
            .querySelectorAll(`[taskflow-data-associated-id="${spanId}"]`)
            .forEach((container) => {
                const commentBox = container.querySelector("textarea");
                if (commentBox && commentBox.value.trim() !== "") {
                    comments.push(commentBox.value.trim());
                }
            });


        mapping.push({
            text,
            comments,
            type: "highlight",
        });
    });

    return mapping;
}

function taskflow__collectSidenotes() {
    const sidenotes = document.querySelectorAll(".taskflow-sidenote-container");
    const mapping = [];
    sidenotes.forEach((sidenote) => {
        const text = sidenote.querySelector("textarea").value;
        if (text.trim() === "") {
            return;
        }
        mapping.push({
            text,
            type: "sidenote",
            comments: [],
        });
    });
    return mapping;
}

function taskflow__collectNotes() {
    const highlights = taskflow__collectHighlights();
    const sidenotes = taskflow__collectSidenotes();

    const mapping = [];
    mapping.push(...highlights, ...sidenotes);

    chrome.runtime.sendMessage({
        action: "collectedHighlightedTextsAndComments",
        mapping,
    });
}
