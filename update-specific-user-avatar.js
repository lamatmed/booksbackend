import mongoose from 'mongoose';
import User from './src/models/Users.js';
import 'dotenv/config';

// Fonction pour encoder le nom d'utilisateur pour l'URL
function encodeUsername(username) {
  return encodeURIComponent(username);
}

// Fonction pour générer l'URL PNG de Dicebear
function generatePngAvatar(username) {
  const encodedUsername = encodeUsername(username);
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}`;
}

async function updateSpecificUserAvatar() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connecté à MongoDB');

    // Rechercher l'utilisateur spécifique
    const user = await User.findOne({ email: 'lmt@gmail.com' });
    
    if (!user) {
      console.log('Utilisateur non trouvé');
      return;
    }

    console.log('Utilisateur trouvé:', {
      username: user.username,
      email: user.email,
      currentAvatar: user.profileImage
    });

    // Générer la nouvelle URL PNG
    const newAvatarUrl = generatePngAvatar(user.username);
    console.log('Nouvelle URL avatar:', newAvatarUrl);

    // Mettre à jour l'avatar
    user.profileImage = newAvatarUrl;
    await user.save();

    console.log('Avatar mis à jour avec succès!');
    console.log('Nouvel avatar:', user.profileImage);

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter le script
updateSpecificUserAvatar(); 