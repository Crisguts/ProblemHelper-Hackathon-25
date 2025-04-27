// ==============================
// Auth0 Setup
// ==============================

let auth0Client = null;

// Fetch Auth0 config
const fetchAuthConfig = () => fetch("http://localhost:3000/auth.config.json");

// Initialize Auth0 Client
const configureClient = async () => {
    const response = await fetchAuthConfig();
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId
    });
};

// Update the UI based on login status
const updateUI = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();

    const siteContent = document.getElementById('site-content');
    const welcomeScreen = document.getElementById('welcome-screen');

    if (isAuthenticated) {
        // User is logged in
        welcomeScreen.classList.add('hidden');
        siteContent.classList.remove('hidden');
    } else {
        // User is NOT logged in
        welcomeScreen.classList.remove('hidden');
        siteContent.classList.add('hidden');
    }

    const loginButton = document.getElementById('btn-login');
    const logoutButton = document.getElementById('btn-logout');
    const postButton = document.getElementById('post-problem-btn');
    const helpButtons = document.querySelectorAll('.help-btn');
    const profileButton = document.getElementById('btn-profile');

    if (loginButton) loginButton.disabled = isAuthenticated;
    if (logoutButton) logoutButton.disabled = !isAuthenticated;
    if (postButton) postButton.disabled = !isAuthenticated;
    if (profileButton) profileButton.disabled = !isAuthenticated;
    if (helpButtons.length > 0) {
        helpButtons.forEach(button => button.disabled = !isAuthenticated);
    }
};

// Handle login
const login = async () => {
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: window.location.origin + window.location.pathname
        }

    });
    try {
        const userData = sessionStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: user.name,
                    email: user.email
                })
            });
            const data = await response.json();
            if (response.status === 200) {
                console.log(data.message, data);
            }
            else {
                console.error(data.message, data);//'User already exists or other error'
            }
        }
    } catch (error) {
        console.error('Error retrieving user data from sessionStorage:', error);
    }
};

// Handle logout
const logout = () => {
    auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin + window.location.pathname
        }
    });
    sessionStorage.clear();
};

// ==============================
// Main Page Load
// ==============================

window.onload = async () => {
    await configureClient();

    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await updateUI();

    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.querySelector('.post-problem').addEventListener('submit', postProblem);
    document.getElementById('btn-profile').addEventListener('click', async () => {
        const user = await auth0Client.getUser();
        sessionStorage.setItem('user', JSON.stringify(user));
        document.location.href = 'profile.html';
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const tabId = event.target.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    // document.querySelectorAll('.help-btn').forEach(button => {
    //     button.addEventListener('click', () => {
    //         console.log('Help button clicked');
    //     });
    // });
    document.querySelectorAll('.help-btn').forEach(button => {
        button.addEventListener('click', handleHelpButton);
    });

    const dialog = document.getElementById('helpDialog');
    const cancelButton = document.getElementById('cancelSolution');
    const submitButton = document.getElementById('submitSolution');

    if (dialog && cancelButton && submitButton) {
        cancelButton.addEventListener('click', () => {
            dialog.close();
        });

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const solution = document.getElementById('solutionInput').value;
            if (solution.trim()) {
                const problemId = dialog.dataset.problemId;
                const problemCard = document.querySelector(`.problem-card[data-problem-id="${problemId}"]`);

                if (problemCard) {
                    const solutionsDiv = problemCard.querySelector('.solutions') ||
                        problemCard.appendChild(document.createElement('div'));
                    solutionsDiv.className = 'solutions';

                    const user = await auth0Client.getUser();
                    solutionsDiv.innerHTML += `
                        <div class="solution">
                            <p>${solution}</p>
                            <small>By ${user.name} - ${new Date().toLocaleString()}</small>
                        </div>
                    `;
                }
            }
            dialog.close();
            document.getElementById('solutionInput').value = '';
        });
    }
};

// ==============================
// Helper Functions
// ==============================

function handleHelpButton(event) {
    const dialog = document.getElementById('helpDialog');
    const problemCard = event.target.closest('.problem-card');

    if (!dialog || !problemCard) return;

    // Store reference to the problem card
    dialog.dataset.problemId = problemCard.dataset.problemId || Date.now();

    // Show the dialog
    dialog.showModal();
}


// Show a specific category tab
function showTab(tabId) {
    document.querySelectorAll('.problems').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    const selectedSection = document.getElementById(tabId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        selectedSection.style.display = 'flex';
    }

    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Create a new tab and category section
function createNewCategory(categoryName) {
    const tabsContainer = document.querySelector('.tabs');
    const problemsContainer = document.querySelector('.problems-container');

    const newTabButton = document.createElement('button');
    newTabButton.classList.add('tab-button');
    newTabButton.textContent = categoryName;
    newTabButton.setAttribute('data-tab', categoryName.toLowerCase());
    newTabButton.addEventListener('click', () => {
        showTab(categoryName.toLowerCase());
    });

    tabsContainer.appendChild(newTabButton);

    const newProblemsDiv = document.createElement('div');
    newProblemsDiv.id = categoryName.toLowerCase();
    newProblemsDiv.classList.add('problems');
    newProblemsDiv.style.display = 'none';

    problemsContainer.appendChild(newProblemsDiv);
}

// ==============================
// Posting Problems + Gemini API
// ==============================

// Post a problem
async function postProblem(event) {
    event.preventDefault();

    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
        alert("Please log in to post a problem.");
        return;
    }

    const input = document.getElementById('problemInput');
    const problemText = input.value.trim();

    if (problemText === '') {
        alert('Please enter a problem.');
        return;
    }

    const result = await classifyProblemWithGemini(problemText);

    if (!result) {
        alert('Problem could not be classified. Please try again later.');
        return;
    }

    if (result.category.toLowerCase() === "rejected") {
        alert('Your post was rejected for inappropriate content.');
        input.value = '';
        return;
    }

    const cardHTML = `
    <div class="problem-card">
        <h3>${result.title}</h3>
        <p>${result.rewritten_prompt}</p>
            <a href="#">Profile Link</a>
        <button class="help-btn">Help</button>
    </div>`;

    const categoryId = result.category.toLowerCase();
    let categoryDiv = document.getElementById(categoryId);

    // If the category does not exist, create it
    if (!categoryDiv) {
        createNewCategory(result.category);
        categoryDiv = document.getElementById(categoryId);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHTML.trim();
    const newCard = tempDiv.firstChild;
    categoryDiv.appendChild(newCard);

    input.value = '';

    showTab(categoryId);

    try {
        const response = await fetch('/api/problems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: JSON.parse(sessionStorage.getItem('user')).email,
                theme: result.category,
                content: result.rewritten_prompt
            })
        });
        const data = await response.json();
        if (response.status === 200) {
            console.log(data.message);
        } else {
            console.error('Error adding problem:', data.error);
        }
    } catch (error) {
        console.error('Error adding problem:', error);
    }
}

// Call Gemini AI to classify and rewrite the post
async function classifyProblemWithGemini(problemText) {
    const apiKey = 'AIzaSyArSS2BglVh3mw8E9zShwlGxrnJPKo0aGQ';
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

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
        const textContent = data.candidates[0].content.parts[0].text.trim();

        const jsonStart = textContent.indexOf('{');
        const jsonEnd = textContent.lastIndexOf('}') + 1;
        const pureJson = textContent.slice(jsonStart, jsonEnd);

        const parsed = JSON.parse(pureJson);
        return parsed;

    } catch (error) {
        console.error('Error communicating with Gemini API:', error);
        alert('Problem classifying with Gemini API.');
        return null;
    }
}
