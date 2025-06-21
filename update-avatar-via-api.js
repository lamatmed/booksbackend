import fetch from 'node-fetch';

async function updateUserAvatar() {
  try {
    const email = 'lmt@gmail.com';
    const response = await fetch(`http://localhost:3000/api/auth/update-avatar/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Avatar mis à jour avec succès!');
      console.log('Résultat:', result);
    } else {
      const error = await response.text();
      console.error('Erreur lors de la mise à jour:', error);
    }
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
  }
}

// Exécuter le script
updateUserAvatar(); 