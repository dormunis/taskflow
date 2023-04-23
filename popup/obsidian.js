const obsidian = document.querySelector('.obsidian');
const obsidianConfigDiv = document.getElementById('obsidianConfig');
const obsidianEnableButton = document.getElementById('obsidianEnableButton');
const obsidianInputBox = document.querySelector('.service.obsidian .plugin-config')
const obsidianInput = obsidianInputBox.querySelector('input');
const obsidianSaveButton = obsidianInputBox.querySelector('button');


document.addEventListener("DOMContentLoaded", async () => {
    // let obsidianEnabled = false;
    // let obsidianVaultName = '';
    chrome.storage.sync.get(['obsidianEnabled', 'obsidianVaultName'], (result) => {
        if (result.obsidianEnabled) {
            obsidianEnabled = true;
            obsidianVaultName = result.obsidianVaultName || '';
            // obsidianEnableButton.textContent = 'Disable Obsidian';
            // obsidianInput.value = obsidianVaultName;
        }
    });
    addKeybindings(obsidian, 'obsidian');
});


function toggleObsidian() {
    obsidianEnabled = !obsidianEnabled;
    obsidianEnableButton.textContent = obsidianEnabled ? 'Disable Obsidian' : 'Enable Obsidian';

    if (obsidianEnabled) {
        obsidianVaultName = obsidianInput.value.trim();
    } else {
        obsidianVaultName = '';
    }

    chrome.storage.sync.set({ obsidianEnabled, obsidianVaultName });
}

function saveObsidianVaultName() {
    obsidianVaultName = obsidianInput.value.trim();
    chrome.storage.sync.set({ obsidianEnabled, obsidianVaultName });
}

// obsidianEnableButton.addEventListener('click', toggleObsidian);
// obsidianInput.addEventListener('keyup', (event) => {
//   if (event.key === 'Enter') {
//     saveObsidianVaultName();
//   }
// });
// obsidianSaveButton.addEventListener('click', saveObsidianVaultName);

