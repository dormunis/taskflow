var collapsibles = document.getElementsByClassName("collapsible");

for (let i = 0; i < collapsibles.length; i++) {
    collapsibles[i].addEventListener("click", function() {
        let content = this.nextElementSibling;
        if (!content.style.maxHeight) {
            content.style.maxHeight = "300em";
        } else {
            content.style.maxHeight = null;
        }
    });
}

function addKeybindings(element, extensionName) {
    const manifest = chrome.runtime.getManifest();
    const commands = manifest.commands;

    const keybindingsDiv = element.querySelector('.keybindings');
    Object.entries(commands).forEach(([commandName, command]) => {
        if (commandName.startsWith(extensionName)) {
            const line = addKeybindingLine(command.suggested_key.default, command.description);
            keybindingsDiv.appendChild(line);
        }
    });
}

function addKeybindingLine(combination, description) {
    const line = document.createElement('div');
    line.classList.add('keybinding-line');
    const keybindingCombination = addKeybindingSegment('key-combination', combination);
    const keybindingDescription = addKeybindingSegment('description', description);
    line.appendChild(keybindingCombination);
    line.appendChild(keybindingDescription);
    return line;
}

function addKeybindingSegment(segment, content) {
    const wrapper = document.createElement('div');
    wrapper.classList.add(`keybinding-${segment}-wrapper`);
    const span = document.createElement('span');
    span.classList.add(`keybinding-${segment}`);
    span.textContent = content;
    wrapper.appendChild(span);
    return wrapper;
}
