function createNewObsidianNote() {
    isObsidianEnabled(function(enabled) {
        if (enabled) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentTabId = tabs[0].id;
                injectScriptToCollectTexts(currentTabId);
            });
        } else {
            showNotificationObsidian("Error", "Obsidian disabled");
        }
    });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "collectedHighlightedTextsAndComments") {
        const highlightedTexts = message.mapping;
        getObsidianNoteContent(function(encodedContent) {
            getObsidianVaultName().then(function(vaultName) {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    const title = tabs[0].title;
                    var obsidianUrl = constructObsidianUrl(title, encodedContent, vaultName, highlightedTexts);
                    chrome.tabs.create({ url: obsidianUrl });
                });
            });
        }, highlightedTexts);
    }
});

function injectScriptToCollectTexts(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
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
    });
}


function markReference() {
    isObsidianEnabled(function(enabled) {
        if (enabled) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: logSelectedText
                });
            });
        }
    });
}

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

            commentBox.addEventListener('click', function(event) {
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

function getObsidianNoteContent(callback, references) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var title = tabs[0].title;
        var url = tabs[0].url;
        var timestamp = getTimestampString();

        var content = `---\naliases: []\ntags: #reference\ntimestamp: ${timestamp}\n---\n`
        content += `## Summary\n\n\n\n`;
        if (Object.keys(references).length > 0) {
            content += `---\n## References\n`;
            Object.entries(references).forEach(([highlightedText, comments], idx) => {
                content += `### REF ${idx + 1}: \n\n`;
                content += `> "${highlightedText}"\n\n`;
                content += comments.map(comment => `- ${comment}`).join('\n');
                content += `\n- \n\n`;
            });
        }
        content += `---\n# Source\n- [${title}](${url})`;
        var encodedContent = encodeURIComponent(content);
        callback(encodedContent);
    });
}

function getTimestampString() {
    var now = new Date();
    var year = now.getFullYear();
    var month = ("0" + (now.getMonth() + 1)).slice(-2);
    var day = ("0" + now.getDate()).slice(-2);
    var hours = ("0" + now.getHours()).slice(-2);
    var minutes = ("0" + now.getMinutes()).slice(-2);
    return year + month + day + hours + minutes;
}

function getObsidianVaultName() {
    return new Promise(function(resolve, reject) {
        chrome.storage.sync.get('obsidianVaultName', function(data) {
            var vaultName = data.obsidianVaultName ? encodeURIComponent(data.obsidianVaultName) : null;
            resolve(vaultName);
        });
    });
}

function constructObsidianUrl(title, content, vaultName) {
    title = sanitizeTitleForFilename(title);
    var obsidianUrl = `obsidian://new?name=${title}&content=${content}`;
    if (vaultName) {
        obsidianUrl += `&vault=${vaultName}`;
    }
    return obsidianUrl;
}

function sanitizeTitleForFilename(title) {
    const forbiddenChars = /[\/\\?%*:|"<>]/g;
    return title.replace(forbiddenChars, '_');
}


function isObsidianEnabled(callback) {
    chrome.storage.sync.get('isObsidianEnabled', function(data) {
        var isEnabled = data.isObsidianEnabled !== undefined ? data.isObsidianEnabled : true;
        callback(isEnabled);
    });
}

function showNotificationObsidian(title, message) {
    chrome.notifications.create(null, {
        type: "basic",
        iconUrl: "res/obsidian-128.png",
        title: title,
        message: message,
    });
}
