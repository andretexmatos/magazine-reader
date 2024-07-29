document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const suggestionsContainer = document.getElementById('suggestions');
    const resultsContainer = document.getElementById('results');
    const apiUrlSelect = document.getElementById('api-url-select');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyButton = document.getElementById('save-api-key');
    const apiKeyContainer = document.getElementById('api-key-container');

    // Fonction pour enregistrer l'URL et la clé d'API dans le localStorage
    function saveToLocalStorage(apiUrl, apiKey) {
        localStorage.setItem('apiUrl', apiUrl);
        localStorage.setItem('apiKey', apiKey);
    }

    // Enregistrer la clé API et l'URL lorsque le bouton est cliqué
    saveApiKeyButton.addEventListener('click', () => {
        const apiUrl = apiUrlSelect.value;
        const apiKey = apiKeyInput.value.trim();
        if (apiUrl && apiKey) {
            saveToLocalStorage(apiUrl, apiKey);
            apiKeyInput.value = '';
            alert('URL de l\'API et clé API enregistrées avec succès');
            apiKeyContainer.style.display = 'none';
        } else {
            alert('Veuillez sélectionner une URL de l\'API et entrer une clé API valide');
        }
    });

    // Vérifier si une clé API et une URL sont déjà enregistrées
    const storedApiUrl = localStorage.getItem('apiUrl');
    const storedApiKey = localStorage.getItem('apiKey');
    if (!storedApiUrl || !storedApiKey) {
        apiKeyContainer.style.display = 'flex';
    } else {
        apiKeyContainer.style.display = 'none';

    }

    // Fetch magazines data from the JSON file
    fetch('/magazines.json')
        .then(response => response.json())
        .then(data => {
            const magazines = data;

            // Add event listener to the search input
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                suggestionsContainer.innerHTML = '';

                if (query) {
                    const filteredMagazines = magazines.filter(magazine => magazine.name.toLowerCase().includes(query));
                    
                    filteredMagazines.forEach(magazine => {
                        const suggestionElement = document.createElement('div');
                        suggestionElement.classList.add('suggestion');
                        suggestionElement.textContent = magazine.name;
                        suggestionsContainer.appendChild(suggestionElement);

                        suggestionElement.addEventListener('click', () => {
                            searchInput.value = magazine.name;
                            suggestionsContainer.innerHTML = '';
                            fetchMagazineDetails(magazine.taglink);
                        });
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching magazines:', error));
});

function fetchMagazineDetails(taglink) {
    fetch(`/magazine/${encodeURIComponent(taglink)}`)
        .then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('results');
            resultsContainer.innerHTML = '';

            data.forEach(magazine => {
                const magazineElement = document.createElement('div');
                magazineElement.classList.add('magazine');

                const titleElement = document.createElement('h3');
                titleElement.textContent = magazine.title;

                const linkElement = document.createElement('a');
                linkElement.href = magazine.link;
                linkElement.addEventListener('click', (event) => {
                    event.preventDefault();
                    const newWindow = window.open('', '_blank'); // Ouvre immédiatement une nouvelle fenêtre
                    newWindow.document.write(getLoadingHTML()); // Affiche l'animation de chargement
                    fetchTurboLink(magazine.link, newWindow);
                });

                const imageElement = document.createElement('img');
                imageElement.src = magazine.image;
                imageElement.alt = magazine.title;

                linkElement.appendChild(imageElement);
                magazineElement.appendChild(titleElement);
                magazineElement.appendChild(linkElement);

                resultsContainer.appendChild(magazineElement);
            });
        })
        .catch(error => console.error('Error fetching magazine details:', error));
}

function fetchTurboLink(pageUrl, newWindow) {
    fetch(`/turbo?url=${encodeURIComponent(pageUrl)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.turboLink) {
                const apiUrl = localStorage.getItem('apiUrl');
                const apiKey = localStorage.getItem('apiKey');
                sendLinkToDebrid(apiUrl, apiKey, data.turboLink, newWindow);
            } else {
                console.log('Turbo link not found');
                newWindow.close(); // Ferme la fenêtre si le lien turbo n'est pas trouvé
            }
        })
        .catch(error => {
            console.error('Error fetching turbo link:', error);
            newWindow.close(); // Ferme la fenêtre en cas d'erreur
        });
}

function sendLinkToDebrid(apiUrl, apiKey, turboLink, newWindow) {
    fetch('/debrid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiUrl, apiKey, turboLink })
    })
    .then(response => response.json())
    .then(data => {
        if (data.filePath) {
            newWindow.location.href = data.filePath; // Met à jour l'URL de la nouvelle fenêtre
        } else {
            console.error('Error fetching download URL');
            newWindow.close(); // Ferme la fenêtre si l'URL de téléchargement n'est pas trouvée
        }
    })
    .catch(error => {
        console.error('Error sending link to debrid:', error);
        newWindow.close(); // Ferme la fenêtre en cas d'erreur
    });
}

function getLoadingHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chargement...</title>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
                flex-direction:column;
            }
                h2{
                text-align:center;
                padding:10px;
                }
            .loader {
                border: 16px solid #f3f3f3;
                border-radius: 50%;
                border-top: 16px solid #3498db;
                width: 120px;
                height: 120px;
                animation: spin 2s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
    <h2>Veuillez patienter votre magazine va s'afficher.</h2>
        <div class="loader"></div>
    </body>
    </html>
    `;
}


document.addEventListener('DOMContentLoaded', () => {
    // Récupère les favoris depuis le localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Sélectionne l'élément où les favoris seront affichés
    const favoritesList = document.getElementById('favorites-list');

    // Vérifie si l'élément favoritesList existe
    if (!favoritesList) {
        console.error('Element with id "favorites-list" not found');
        return;
    }

    // Crée une liste des magazines favoris
    const ul = document.createElement('ul');
    favorites.forEach(favorite => {
        const li = document.createElement('li');
        li.textContent = favorite.name;
        ul.appendChild(li);
    });

    // Ajoute la liste des magazines favoris à la div
    favoritesList.appendChild(ul);
});
