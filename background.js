importScripts("./workers/todoist.js");
importScripts("./workers/obsidian.js");

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "add-todoist-task") {
        const token = await getAccessToken();
        if (token) {
            getActiveTabInfo((tabInfo) => {
                addTask(token, tabInfo.title, tabInfo.url);
            });
        }
    } else if (command === "add-obsidian-reference") {
        console.log("add-obsidian-reference");
    } else {
        console.log("unknown command");
    }
});
