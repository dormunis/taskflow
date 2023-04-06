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
        showNotificationTodoist("Todoist", "Task added successfully!");
    } else {
        showNotificationTodoist("Todoist", "Failed to add task.");
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

function showNotificationTodoist(title, message) {
    chrome.notifications.create(null, {
        type: "basic",
        iconUrl: "res/todoist-128.png",
        title: title,
        message: message,
    });
}


// TODO: move this to a different file
// ------- RANDOM ARTICLE --------
function openRandomTodoistArticle(token) {
    getTasksWithLinks(function(tasks) {
        var randomTask = chooseRandomTask(tasks);
        var extractedUrl = extractUrlFromTask(randomTask);
        console.log(extractedUrl);
        chrome.tabs.create({ url: extractedUrl });
    }, token);
}

async function getTasksWithLinks(callback, token) {
    try {
        const response = await fetch("https://api.todoist.com/rest/v2/tasks?filter=search:http", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

        });
        if (response.ok) {
            const tasks = await response.json();
            callback(tasks);
        } else {
            console.log('Error retrieving tasks:', response);
            showNotificationTodoist("Error", "Error retrieving tasks");
        }
    } catch (error) {
        console.log(`Error handling response: ${error}`);
        showNotificationTodoist("Error", "Error handling response");
    }
}

function chooseRandomTask(tasks) {
    let weightedTasks = tasks.map(task => {
        let weight = 0;

        // Add weight for tasks tagged with @next
        if (task.content.includes("@next")) {
            weight += 100;
        }

        // Add weight based on task priority
        if (task.priority === 4) {
            weight += 50;
        } else if (task.priority === 3) {
            weight += 30;
        } else if (task.priority === 2) {
            weight += 10;
        }

        return { task, weight };
    });

    weightedTasks.sort((a, b) => b.weight - a.weight);
    let weightSum = weightedTasks.reduce((sum, current) => sum + current.weight, 0);

    let rand = Math.random() * weightSum;
    let chosenTask;
    for (let i = 0; i < weightedTasks.length; i++) {
        rand -= weightedTasks[i].weight;
        if (rand <= 0) {
            chosenTask = weightedTasks[i].task;
            break;
        }
    }

    return chosenTask;
}

function extractUrlFromTask(task) {
    let regex = /(https?:\/\/[^\s)]+)/;
    let match = regex.exec(task.content);
    if (match) {
        return match[0];
    } else {
        return null;
    }
}
