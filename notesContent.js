chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "logSelectedText") {
        logSelectedText();
    } else if (message.action === "collectNotes") {
        collectNotes();
    }
});

function logSelectedText() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const div = document.createElement('div');
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');

    const uniqueId = `highlight-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    span.id = uniqueId;
    span.style.backgroundColor = 'hsl(50, 100%, 40%)';
    span.style.cursor = 'pointer';
    span.classList.add('taskflow-highlighted-text');

    div.classList.add('taskflow-highlighted-text-container');
    div.appendChild(span);

    document.addEventListener('keydown', function(event) {
        if (event.metaKey) {
            const highlightedSpans = document.querySelectorAll('.taskflow-highlighted-text');
            highlightedSpans.forEach(s => {
                s.style.backgroundColor = 'hsl(10, 100%, 50%)';
            });
        }
    });

    document.addEventListener('keyup', function() {
        const highlightedSpans = document.querySelectorAll('.taskflow-highlighted-text');
        highlightedSpans.forEach(s => {
            s.style.backgroundColor = 'hsl(50, 100%, 40%)';
        });
    });

    span.addEventListener('click', function(event) {
        if (event.metaKey) {
            // clear
            const parent = this.parentNode;
            while (this.firstChild) parent.insertBefore(this.firstChild, this);
            parent.removeChild(this);
            parent.normalize();
            document.querySelectorAll(`[taskflow-data-associated-span-id="${uniqueId}"]`).forEach(container => {
                document.body.removeChild(container);
            });
        } else {
            // add comment
            const commentContainer = document.createElement('div');
            commentContainer.style.position = 'absolute';
            commentContainer.style.left = `${event.pageX}px`;
            commentContainer.style.top = `${event.pageY}px`;
            commentContainer.style.zIndex = 100000;
            commentContainer.setAttribute('taskflow-data-associated-span-id', uniqueId);

            const commentIcon = document.createElement('div');
            commentIcon.innerHTML = '&#128172;';
            commentIcon.style.position = 'absolute';
            commentIcon.style.width = '30px';
            commentIcon.style.height = '30px';
            commentIcon.style.borderRadius = '50%';
            commentIcon.style.backgroundColor = '#fff';
            commentIcon.style.color = 'black';
            commentIcon.style.textAlign = 'center';
            commentIcon.style.lineHeight = '30px';
            commentIcon.style.opacity = '0.8';
            commentIcon.style.display = 'none';
            commentContainer.appendChild(commentIcon);

            const commentBox = document.createElement('textarea');
            commentBox.style.color = 'black';
            commentBox.style.borderRadius = '5px';
            commentBox.style.fontSize = '1em';
            commentBox.style.backgroundColor = '#fff';
            commentBox.style.border = '1px solid black';
            commentBox.style.padding = '5px';
            commentBox.classList.add('taskflow-comment-box');
            commentContainer.appendChild(commentBox);
            document.body.appendChild(commentContainer);

            commentBox.addEventListener('blur', function() {
                if (this.value.trim() === '') {
                    const parent = this.parentNode;
                    document.body.removeChild(parent);
                }
                this.style.display = 'none';
                commentIcon.style.display = 'block';
                commentContainer.style.width = '30px';
                commentContainer.style.height = '30px';
            });

            commentIcon.addEventListener('mouseenter', function() {
                this.style.display = 'none';
                commentBox.style.display = 'block';
                commentBox.readOnly = true;
                commentContainer.style.width = '';
                commentContainer.style.height = '';
            });

            commentBox.addEventListener('mouseleave', function() {
                if (commentBox.readOnly && commentBox.style.display !== 'none') {
                    commentBox.style.display = 'none';
                    commentIcon.style.display = 'block';
                }
            });

            commentBox.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && (!event.shiftKey || event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    this.blur();
                }
            });

            commentBox.addEventListener('click', function() {
                this.style.opacity = '1';
                this.readOnly = false;
                this.focus();
            });

            commentBox.focus();
        }
    });

    range.surroundContents(span);
    selection.removeAllRanges();
}

function collectNotes() {
    const highlightedSpans = document.querySelectorAll('.taskflow-highlighted-text');
    const mapping = {};

    highlightedSpans.forEach(span => {
        const text = span.textContent;
        const spanId = span.id;
        const comments = [];

        document.querySelectorAll(`[taskflow-data-associated-span-id="${spanId}"]`).forEach(container => {
            const commentBox = container.querySelector('textarea');
            if (commentBox && commentBox.value.trim() !== '') {
                comments.push(commentBox.value.trim());
            }
        });

        mapping[text] = [];
        if (comments.length > 0) {
            mapping[text].push(...comments);
        }
    });

    chrome.runtime.sendMessage({ action: "collectedHighlightedTextsAndComments", mapping });
}
