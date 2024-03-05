function createNewObsidianNote() {
  isObsidianEnabled(function(enabled) {
    if (enabled) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTabId = tabs[0].id;
        injectScriptToCollectTexts(currentTabId);
      });
    } else {
      showNotificationObsidian("Error", "Obsidian disabled");
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "collectedHighlightedTexts") {
    const highlightedTexts = message.texts;
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
    target: {tabId: tabId},
    function: () => {
      const highlightedSpans = document.querySelectorAll('.taskflow-highlighted-text');
      const highlightedTexts = Array.from(highlightedSpans).map(span => span.textContent);
      chrome.runtime.sendMessage({action: "collectedHighlightedTexts", texts: highlightedTexts});
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

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = 'hsl(50, 100%, 80%)';
    span.style.cursor = 'pointer';
    span.classList.add('taskflow-highlighted-text');

    span.addEventListener('click', function(event) {
        const parent = this.parentNode;
        while (this.firstChild) parent.insertBefore(this.firstChild, this);
        parent.removeChild(this);
        parent.normalize();
    });

    range.surroundContents(span);
    selection.removeAllRanges();
}

function getObsidianNoteContent(callback, references) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var title = tabs[0].title;
        var url = tabs[0].url;

        // Get the timestamp string
        var timestamp = getTimestampString();

        // Construct the note content string
        var content = `---\naliases: []\ntags: #reference\ntimestamp: ${timestamp}\n---\n`
        if (references.length > 0) {
            content += `## References\n`;
            content += references.map(text => `> ${text}`).join('\n\n');
            content += `\n`;
        }
        content += `\n---\n# Source\n- [${title}](${url})`;
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

function constructObsidianUrl(title, content, vaultName) {
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
