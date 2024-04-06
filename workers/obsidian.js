function toggleFootnotes() {
    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
        const response = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: function() {
                return !!getComputedStyle(document.documentElement).getPropertyValue('--arc-palette-title');
            }
        });
        if (response[0].result) {
            console.log("Arc Browser detected");

        } else { // Chrome
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                chrome.sidePanel.open({ tabId: tab.id });
            });
        }
    });
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
        const highlightedTexts = message.mapping;
        encodeNotesForObsidian(function(encodedContent) {
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

        var content = `---\naliases: []\ntags: #reference\ntimestamp: ${timestamp}\n---\n`
        content += `## Summary\n\n\n\n`;
        if (Object.keys(references).length > 0) {
            content += `---\n## References\n`;
            Object.entries(references).forEach(([highlightedText, comments]) => {
                content += ` - ${highlightedText}\n`;
                if (comments.length > 0) {
                    content += comments.map(comment => `   - ${comment}`).join('\n') + '\n';
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
