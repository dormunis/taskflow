const obsidianConfigDiv = document.getElementById('obsidianConfig');
const obsidianEnableButton = document.getElementById('obsidianEnableButton');
const obsidianInputBox = document.getElementById('obsidianInputBox');
const obsidianInput = obsidianInputBox.querySelector('input');
const obsidianSaveButton = obsidianInputBox.querySelector('button');

let obsidianEnabled = false;
let obsidianVaultName = '';

chrome.storage.sync.get(['obsidianEnabled', 'obsidianVaultName'], (result) => {
  if (result.obsidianEnabled) {
    obsidianEnabled = true;
    obsidianVaultName = result.obsidianVaultName || '';
    obsidianEnableButton.textContent = 'Disable Obsidian';
    obsidianInput.value = obsidianVaultName;
    obsidianInputBox.style.display = 'block';
  }
});

function toggleObsidian() {
  obsidianEnabled = !obsidianEnabled;
  obsidianEnableButton.textContent = obsidianEnabled ? 'Disable Obsidian' : 'Enable Obsidian';
  obsidianInputBox.style.display = obsidianEnabled ? 'block' : 'none';
  
  if (obsidianEnabled) {
    obsidianVaultName = obsidianInput.value.trim();
    console.log(`Obsidian enabled with vault name "${obsidianVaultName}"`);
  } else {
    obsidianVaultName = '';
    console.log('Obsidian disabled');
  }

  chrome.storage.sync.set({ obsidianEnabled, obsidianVaultName });
}

function saveObsidianVaultName() {
  obsidianVaultName = obsidianInput.value.trim();
  console.log(`Obsidian vault name saved: "${obsidianVaultName}"`);
  chrome.storage.sync.set({ obsidianEnabled, obsidianVaultName });
}

obsidianEnableButton.addEventListener('click', toggleObsidian);
obsidianInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    saveObsidianVaultName();
  }
});
obsidianSaveButton.addEventListener('click', saveObsidianVaultName);

