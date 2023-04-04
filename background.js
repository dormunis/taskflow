chrome.commands.onCommand.addListener(function(command) {
  if (command === "add-todoist-task") {
      console.log("add-todoist-task");
  } else if (command === "add-obsidian-reference") {
      console.log("add-obsidian-reference");
  } else {
      console.log("unknown command");
  }
});

