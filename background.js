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
    } else if (command === "open-random-todoist-article") {
        const token = await getAccessToken();
        if (token) {
            openRandomTodoistArticle(token);
        }
    } else if (command === "add-obsidian-reference") {
        createNewObsidianNote();
    } else {
        console.error("unknown command");
    }
});
