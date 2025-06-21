import mongoose from 'mongoose';
import User from './src/models/Users.js';

// URL de connexion MongoDB (à adapter selon votre configuration)
const MONGO_URL = 'mongodb://localhost:27017/fullstackbooks';

// Fonction pour encoder le nom d'utilisateur pour l'URL
function encodeUsername(username) {
  return encodeURIComponent(username);
}

// Fonction pour générer l'URL PNG de Dicebear
function generatePngAvatar(username) {
  const encodedUsername = encodeUsername(username);
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}`;
}

async function fixUserAvatar() {
  try {
    // Connexion à la base de données
    await mongoose.connect(MONGO_URL);
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

    // Vérifier si l'avatar est encore en SVG
    if (user.profileImage.includes('/svg?')) {
      console.log('Avatar SVG détecté, mise à jour vers PNG...');
      
      // Générer la nouvelle URL PNG
      const newAvatarUrl = generatePngAvatar(user.username);
      console.log('Nouvelle URL avatar:', newAvatarUrl);

      // Mettre à jour l'avatar
      user.profileImage = newAvatarUrl;
      await user.save();

      console.log('✅ Avatar mis à jour avec succès!');
      console.log('Nouvel avatar:', user.profileImage);
    } else {
      console.log('✅ Avatar déjà au format PNG');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter le script
fixUserAvatar(); 