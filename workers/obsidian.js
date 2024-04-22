function toggleSidenotesPane() {
    chrome.tabs.query(
        { active: true, currentWindow: true },
        async function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSidenotes" });
        }
    );
}

function createNewObsidianNote() {
    isObsidianEnabled(function(enabled) {
        if (enabled) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentTabId = tabs[0].id;
                chrome.tabs.sendMessage(currentTabId, { action: "collectNotes" });
            });
        } else {
            showNotificationObsidian("Error", "Obsidian disabled");
        }
    });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "collectedHighlightedTextsAndComments") {
        const notes = message.mapping;
        encodeNotesForObsidian(function(encodedContent) {
            getObsidianVaultName().then(function(vaultName) {
                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    function(tabs) {
                        const title = tabs[0].title;
                        var obsidianUrl = constructObsidianUrl(
                            title,
                            encodedContent,
                            vaultName,
                            notes,
                        );
                        chrome.tabs.create({ url: obsidianUrl });
                    },
                );
            });
        }, notes);
    }
});

function markReference() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "logSelectedText" });
    });
}

function encodeNotesForObsidian(callback, references) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var title = tabs[0].title;
        var url = tabs[0].url;
        var timestamp = getTimestampString();

        var content = `---\naliases: []\ntags: #reference\ntimestamp: ${timestamp}\n---\n`;
        content += `## Summary\n\n\n\n`;
        if (Object.keys(references).length > 0) {
            content += `---\n## References\n`;
            references.forEach(({ text, type, comments }) => {
                const listItem = type === "highlight" ? text : `**NOTE:** ${text}`;
                content += ` - ${listItem}\n`;
                if (comments.length > 0) {
                    content +=
                        comments.map((comment) => `   - ${comment}`).join("\n") + "\n";
                }
            });
        }
        content += `\n---\n# Source\n- [${title}](${url})`;
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
    return new Promise(function(resolve) {
        chrome.storage.sync.get("obsidianVaultName", function(data) {
            var vaultName = data.obsidianVaultName
                ? encodeURIComponent(data.obsidianVaultName)
                : null;
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
    return title.replace(forbiddenChars, "_");
}

function isObsidianEnabled(callback) {
    chrome.storage.sync.get("isObsidianEnabled", function(data) {
        var isEnabled =
            data.isObsidianEnabled !== undefined ? data.isObsidianEnabled : true;
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
