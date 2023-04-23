importScripts("./workers/todoist.js");
importScripts("./workers/obsidian.js");

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "todoist_add-task") {
        const token = await getAccessToken();
        if (token) {
            getActiveTabInfo((tabInfo) => {
                addTask(token, tabInfo.title, tabInfo.url);
            });
        }
    } else if (command === "todoist_random-article") {
        const token = await getAccessToken();
        if (token) {
            openRandomTodoistArticle(token);
        }
    } else if (command === "obsidian_add-reference") {
        createNewObsidianNote();
    } else {
        console.error("unknown command");
    }
});
