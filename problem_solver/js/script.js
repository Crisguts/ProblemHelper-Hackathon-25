// ==============================
// Auth0 Setup
// ==============================

let auth0Client = null;

// Fetch auth0 config from JSON file
// Change this line
const fetchAuthConfig = () => fetch("http://localhost:3000/auth.config.json");

// Initialize the Auth0 client using fetched settings
const configureClient = async () => {
    const response = await fetchAuthConfig();
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId
    });
};

// Update the UI (enable/disable buttons, profile icon) based on login status
const updateUI = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();

    const loginButton = document.getElementById('btn-login');
    const logoutButton = document.getElementById('btn-logout');
    const profileSection = document.getElementById('profile-section');
    const postButton = document.getElementById('postButton');
    const helpButtons = document.querySelectorAll('.help-btn');

    // const profileLink = document.getElementById('profile-link');

    if (isAuthenticated) {
        // Show logout and profile, hide login
        loginButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        profileSection.classList.remove('hidden');

        // Enable posting and help buttons
        postButton.disabled = false;
        helpButtons.forEach(button => button.disabled = false);

    } else {
        // Show login, hide logout and profile
        loginButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
        profileSection.classList.add('hidden');

        // Disable posting and help buttons
        postButton.disabled = true;
        helpButtons.forEach(button => button.disabled = true);
    }
};

// Handle login using Auth0 redirect
const login = async () => {
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: window.location.origin + window.location.pathname
        }
    });
};

// Handle logout and redirect back to homepage
const logout = () => {
    auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin + window.location.pathname
        }
    });
};

// ==============================
// Main Page Load
// ==============================

window.onload = async () => {
    await configureClient();

    // Handle login callback if redirected back from Auth0
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await updateUI();

    // Attach button event listeners
    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('postButton').addEventListener('click', postProblem); // Moved to postProblem function
    document.getElementById('btn-profile').addEventListener('click', async function () {
        const user = await auth0Client.getUser(); // Get the authenticated user
        console.log('Profile button clicked');
        sessionStorage.setItem('user', JSON.stringify(user));

        // Redirect to profile page
        document.location.href = 'profile.html';
    });



    // Attach tab switching logic
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const tabId = event.target.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    // Attach help button event listeners
    document.querySelectorAll('.help-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            // Handle help button click event
            console.log('Help button clicked');
        });
    });
};

// ==============================
// Helper Functions
// ==============================

// Switch to a different problem category tab
function showTab(tabId) {
    // Log for debugging
    console.log('Switching to tab:', tabId);

    // Hide all problem sections
    document.querySelectorAll('.problems').forEach(section => {
        section.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show selected problem section and activate tab
    const selectedSection = document.getElementById(tabId);
    if (selectedSection) {
        selectedSection.style.display = 'flex';
        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }
}

function createNewCategory(categoryName) {
    const tabsContainer = document.querySelector('.tabs');
    const problemsContainer = document.querySelector('.problems-container');

    // Create a new tab button
    const newTabButton = document.createElement('button');
    newTabButton.classList.add('tab-button');
    newTabButton.textContent = categoryName;
    newTabButton.setAttribute('data-tab', categoryName.toLowerCase());
    newTabButton.addEventListener('click', () => {
        showTab(categoryName.toLowerCase());
    });

    tabsContainer.appendChild(newTabButton);

    // Create a new problems div
    const newProblemsDiv = document.createElement('div');
    newProblemsDiv.id = categoryName.toLowerCase();
    newProblemsDiv.classList.add('problems');

    problemsContainer.appendChild(newProblemsDiv);

    // Switch instantly to the new tab
    showTab(categoryName.toLowerCase());
}


// ==============================
// Posting Problems + Gemini API
// ==============================

// Post a problem after classifying it and rewriting it
async function postProblem() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
        alert("Please log in to post a problem.");
        return;
    }

    const input = document.getElementById('problemInput');
    const problemText = input.value.trim();

    if (problemText === '') {
        alert('Please enter a problem!');
        return;
    }

    const result = await classifyProblemWithGemini(problemText);

    if (!result) {
        alert('Problem could not be classified. Please try again later.');
        return;
    }

    if (result.category === "Rejected") {
        alert('Your post was rejected for inappropriate content.');
        input.value = '';
        return;
    }

    const cardHTML = `
  <div class="problem-card">
    <h3>${result.title}</h3> <!-- AI-generated title -->
    <p>${result.rewritten_prompt}</p> <!-- Cleaned post -->
    <p><strong>Category:</strong> ${result.category}</p> <!-- Category small -->
    <a href="#">Profile Link</a>
    <button class="help-btn">Help</button>
  </div>
  `;



    let categoryDiv = document.getElementById(result.category.toLowerCase());

    // If the category doesn't exist yet, create it
    if (!categoryDiv) {
        createNewCategory(result.category);
        categoryDiv = document.getElementById(result.category.toLowerCase());
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHTML.trim();
    const newCard = tempDiv.firstChild;

    categoryDiv.appendChild(newCard);
    input.value = '';
    // categoryDiv.innerHTML += cardHTML;
    // input.value = '';
}

// Call Gemini AI to classify and rewrite the post
async function classifyProblemWithGemini(problemText) {
    const apiKey = 'AIzaSyAEa6EVeeUDSZhlSdU4y_TJ6uTiyFvBfu4';
    const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=' + apiKey;

    const payload = {
        contents: [{
            parts: [{
                text: `
Ignore all previous instructions.
You are an API backend. DO NOT include any explanations, greetings, or sentences outside JSON.
1. Classify the user's post into an appropriate short category (Existing: Relationship, Financial, Social, Education. Create a new one if needed).
2. Rewrite the user's post to be clearer and more understandable.
3. Generate a very short title (5-8 words max) summarizing the user's post.
4. If the post is inappropriate, reject it.

IMPORTANT RULES:
- Only output PURE JSON with exactly THREE fields: "category", "rewritten_prompt", "title".
- No extra text, no formatting, no comments.

Example for a normal case:
{"category": "Education", "rewritten_prompt": "I am struggling with my math assignments.", "title": "Struggling With Math Homework"}

Example for inappropriate post:
{"category": "Rejected", "rewritten_prompt": "This post was inappropriate and has been rejected.", "title": "Rejected"}

User's post: "${problemText}"
`
            }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const geminiReply = data.candidates[0].content.parts[0].text.trim();

        console.log('Gemini reply:', geminiReply);

        const parsed = JSON.parse(geminiReply);
        return parsed;

    } catch (error) {
        console.error('Error communicating with Gemini API:', error);
        alert('Problem classifying with Gemini API.');
        return null;
    }
}