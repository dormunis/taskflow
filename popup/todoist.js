document.addEventListener("DOMContentLoaded", async () => {
  const token = await getAccessToken();
  if (token) {
    document.getElementById("signInButton").style.display = "none";
    document.getElementById("signOutButton").style.display = "block";
  } else {
    document.getElementById("signInButton").style.display = "block";
    document.getElementById("signOutButton").style.display = "none";
  }
});

document.getElementById("signInButton").addEventListener("click", async () => {
  const token = await authenticate();

  if (token) {
    chrome.storage.sync.set({ todoist_token: token }, () => {
      alert("Signed in successfully!");
      window.close();
    });
  } else {
    alert("Failed to sign in.");
  }
});

document.getElementById("signOutButton").addEventListener("click", () => {
  chrome.storage.sync.remove("todoist_token", () => {
    alert("Signed out successfully!");
    window.location.reload();
  });
});

