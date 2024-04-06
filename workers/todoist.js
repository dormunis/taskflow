async function authenticate() {
  const clientId = chrome.runtime.getManifest().oauth2.client_id;
  const clientSecret = config.clientSecret;
  const scopes = chrome.runtime.getManifest().oauth2.scopes.join(",");
  const redirectUri = chrome.identity.getRedirectURL("provider_cb");
  const authUrl = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&state=123&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return new Promise(async (resolve) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          resolve(null);
        } else {
          const authCode = new URL(redirectUrl).searchParams.get("code");
          const tokenResponse = await fetch(
            "https://todoist.com/oauth/access_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: authCode,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
              }),
            },
          );

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            resolve(tokenData.access_token);
          } else {
            console.error("Failed to obtain access token");
            resolve(null);
          }
        }
      },
    );
  });
}

async function getAccessToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("todoist_token", (data) => {
      resolve(data.todoist_token);
    });
  });
}

async function addTask(token, title, url) {
  const response = await fetch("https://api.todoist.com/rest/v2/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: `[${title}](${url})`,
    }),
  });

  if (response.ok) {
    await showTodoistAddedTaskNotification(response);
  } else {
    showNotificationTodoist("Todoist", "Failed to add task.");
  }
}

async function showTodoistAddedTaskNotification(response) {
  let responseBody = await response.json();
  const taskId = responseBody["id"];
  const todoistUrl = `todoist://task?id=${taskId}`;
  showNotificationTodoist(
    "Todoist",
    `Task ${responseBody["id"]} added successfully!`,
    taskId,
  );
  chrome.notifications.onClicked.addListener(function (notifId) {
    if (notifId == taskId) {
      chrome.tabs.create({ url: todoistUrl });
    }
  });
}

function getActiveTabInfo(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const title = tab.title;
    const url = tab.url;
    callback({ title: title, url: url });
  });
}

function showNotificationTodoist(title, message, notificationId = null) {
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "res/todoist-128.png",
    title: title,
    message: message,
  });
}

// TODO: move this to a different file
// ------- RANDOM ARTICLE --------
function openRandomTodoistArticle(token) {
  getTasksWithLinks(function (tasks) {
    var randomTask = chooseRandomTask(tasks);
    var extractedUrl = extractUrlFromTask(randomTask);
    chrome.tabs.create({ url: extractedUrl });
  }, token);
}

async function getTasksWithLinks(callback, token) {
  try {
    const response = await fetch(
      "https://api.todoist.com/rest/v2/tasks?filter=search:http",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (response.ok) {
      const tasks = await response.json();
      callback(tasks);
    } else {
      console.error("Error retrieving tasks:", response);
      showNotificationTodoist("Error", "Error retrieving tasks");
    }
  } catch (error) {
    console.error(`Error handling response: ${error}`);
    showNotificationTodoist("Error", "Error handling response");
  }
}

function chooseRandomTask(tasks) {
  let weightedTasks = tasks.map((task) => {
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
  let weightSum = weightedTasks.reduce(
    (sum, current) => sum + current.weight,
    0,
  );

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

if (typeof module !== "undefined" && module.exports) {
  module.exports = authenticate;
}
