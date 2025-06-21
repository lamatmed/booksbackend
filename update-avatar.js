import mongoose from 'mongoose';
import User from './src/models/Users.js';
import 'dotenv/config';

const updateAvatar = async () => {
    try {
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecté à MongoDB');

        // Trouver l'utilisateur spécifique
        const user = await User.findOne({ email: 'lmt@gmail.com' });
        
        if (!user) {
            console.log('Utilisateur non trouvé');
            return;
        }

        console.log('Utilisateur trouvé:', user.username);

        // Générer la nouvelle URL PNG
        const encodedUsername = encodeURIComponent(user.username);
        const newProfileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

        // Mettre à jour l'avatar
        await User.findByIdAndUpdate(user._id, {
            profileImage: newProfileImage
        });

        console.log('Avatar mis à jour avec succès');
        console.log('Nouvelle URL:', newProfileImage);

        // Vérifier la mise à jour
        const updatedUser = await User.findById(user._id);
        console.log('Avatar mis à jour:', updatedUser.profileImage);

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Déconnecté de MongoDB');
    }
};

updateAvatar(); 