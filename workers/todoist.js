async function getAccessToken() {
    const token = await new Promise((resolve) => {
        chrome.storage.sync.get("todoist_token", (data) => {
            resolve(data.todoist_token);
        });
    });
    return token;
}

async function addTask(token, title, url) {
    const response = await fetch("https://api.todoist.com/rest/v2/tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            content: `[${title}](${url})`
        }),
    });

    if (response.ok) {
        showNotification("Todoist", "Task added successfully!");
    } else {
        showNotification("Todoist", "Failed to add task.");
    }
}

function getActiveTabInfo(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const title = tab.title;
        const url = tab.url;
        callback({ title: title, url: url });
    });
}

async function authenticate() {
    const authUrl = `https://todoist.com/oauth/authorize?client_id=${chrome.runtime.getManifest().oauth2.client_id}&scope=${chrome.runtime.getManifest().oauth2.scopes.join(
        ","
    )}&state=123&response_type=token`;

    return new Promise((resolve) => {
        chrome.identity.launchWebAuthFlow(
            {
                url: authUrl,
                interactive: true,
            },
            (redirectUrl) => {
                const token = new URL(redirectUrl).hash
                    .substring(1)
                    .split("&")
                    .map((param) => param.split("="))
                    .find(([key]) => key === "access_token")[1];
                resolve(token);
            }
        );
    });
}

function showNotification(title, message) {
    chrome.notifications.create(null, {
        type: "basic",
        iconUrl: "res/todoist-128.png",
        title: title,
        message: message,
    });
}
