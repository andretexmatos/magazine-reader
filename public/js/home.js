document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
  
    if (user) {
      const favListElement = document.getElementById('fav-list');
  
      // Vider la liste actuelle
      favListElement.innerHTML = '';
  
      // Ajouter les favoris de l'utilisateur
      user.favrorites.forEach(fav => {
        const favElement = document.createElement('p');
        favElement.classList.add('fav-element');
        favElement.textContent = fav;
        favListElement.appendChild(favElement);
      });
    } else {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      window.location.href = 'index.html';
    }
  });
  