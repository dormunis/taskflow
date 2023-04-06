function createNewObsidianNote() {
    isObsidianEnabled(function(enabled) {
        if (enabled) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                getObsidianNoteContent(function(encodedContent) {
                    getObsidianVaultName().then(function(vaultName) {
                        var obsidianUrl = constructObsidianUrl(tabs, encodedContent, vaultName);
                        chrome.tabs.create({ url: obsidianUrl });
                    });
                });
            });

        } else {
            showNotificationObsidian("Error", "Obsidian disabled");
        }
    });
}

function getObsidianNoteContent(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var title = tabs[0].title;
        var url = tabs[0].url;

        // Get the timestamp string
        var timestamp = getTimestampString();

        // Construct the note content string
        var content = `---\naliases: []\ntags: #reference\ntimestamp: ${timestamp}\n---\n\n# References\n[${title}](${url})`;
        var encodedContent = encodeURIComponent(content);
        callback(encodedContent);
    });
}

// Helper function to get the timestamp string
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

function constructObsidianUrl(tabs, content, vaultName) {
    var title = encodeURIComponent(tabs[0].title);
    var obsidianUrl = `obsidian://new?name=${title}&content=${content}`;
    if (vaultName) {
        obsidianUrl += `&vault=${vaultName}`;
    }
    return obsidianUrl;
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
