document.addEventListener("DOMContentLoaded", async () => {
  const token = await getAccessToken();
  if (token) {
    document.getElementById("signIn").style.display = "none";
    document.getElementById("signedIn").style.display = "block";
  } else {
    document.getElementById("signIn").style.display = "block";
    document.getElementById("signedIn").style.display = "none";
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
                    const tokenResponse = await fetch("https://todoist.com/oauth/access_token", {
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
                    });

                    if (tokenResponse.ok) {
                        const tokenData = await tokenResponse.json();
                        resolve(tokenData.access_token);
                    } else {
                        console.error("Failed to obtain access token");
                        resolve(null);
                    }
                }
            }
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
