try {
    importScripts('./workers/todoist.js', './workers/obsidian.js', './config.js');
} catch (e) {
    console.error(e);
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "todoist_add-task") {
        const token = await getAccessToken();
        if (token) {
            getActiveTabInfo((tabInfo) => {
                addTask(token, tabInfo.title, tabInfo.url);
            });
        } else {
            chrome.notifications.create(
                null,
                {
                    type: 'basic',
                    iconUrl: 'res/todoist-128.png',
                    title: 'Todoist error',
                    message: 'Please sign in to Todoist first.'
                }
            );
        }
    } else if (command === "todoist_random-article") {
        const token = await getAccessToken();
        if (token) {
            openRandomTodoistArticle(token);
        } else {
            chrome.notifications.create(
                null,
                {
                    type: 'basic',
                    iconUrl: 'res/todoist-128.png',
                    title: 'Todoist error',
                    message: 'Please sign in to Todoist first.'
                }
            );
        }
    } else if (command === "obsidian_add-reference") {
        createNewObsidianNote();
    } else if (command === "obsidian_mark-reference") {
        markReference();
    } else {
        console.error("unknown command");
    }
});
