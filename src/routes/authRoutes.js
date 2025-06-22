import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import cloudinary from '../lib/cloudinary.js';
import multer from 'multer';

const router = express.Router();

// Configuration de multer pour les uploads de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ message: 'Token d\'accès requis' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token invalide' });
    }
};

// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // Validation des données
        if (!email || !username || !password) {
            return res.status(400).json({ 
                message: 'Tous les champs sont requis (email, username, password)' 
            });
        }

        // Vérification de la longueur de l'email
        if (email.length < 5) {
            return res.status(400).json({
                message: "L'email doit contenir au moins 5 caractères"
            });
        }
        if (username.length < 3) {
            return res.status(400).json({
                message: "Le nom doit contenir au moins 3 caractères"
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà' 
            });
        }

        // Créer le nouvel utilisateur
        const encodedUsername = encodeURIComponent(username);
        const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
        const newUser = new User({
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            password,
            profileImage
        });

        await newUser.save();

        // Générer le token JWT
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Retourner la réponse sans le mot de passe
        const userResponse = newUser.toJSON();

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Erreur de validation', 
                errors 
            });
        }

        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des données
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email et mot de passe requis' 
            });
        }

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                message: "Aucun utilisateur trouvé avec cet email"
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Mot de passe incorrect"
            });
        }

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Retourner la réponse sans le mot de passe
        const userResponse = user.toJSON();

        res.json({
            message: 'Connexion réussie',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route pour obtenir le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ user });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route pour mettre à jour le profil
router.put('/profile', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = {};

        // Vérifier si les champs sont fournis
        if (username) updateData.username = username.toLowerCase();
        if (email) updateData.email = email.toLowerCase();

        // Vérifier si le nouveau username ou email existe déjà
        if (username || email) {
            const existingUser = await User.findOne({
                $or: [
                    ...(email ? [{ email: email.toLowerCase() }] : []),
                    ...(username ? [{ username: username.toLowerCase() }] : [])
                ],
                _id: { $ne: req.user._id }
            });

            if (existingUser) {
                return res.status(400).json({ 
                    message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà' 
                });
            }
        }

        // Gestion de l'image de profil
        if (req.file) {
            // Nouvelle image uploadée via FormData
            try {
                const uploadRes = await cloudinary.uploader.upload_stream(
                    {
                        folder: 'avatars',
                        resource_type: 'image',
                    },
                    async (error, result) => {
                        if (error) {
                            console.error('Erreur upload Cloudinary:', error);
                            return res.status(500).json({ 
                                message: 'Erreur lors de l\'upload de l\'image',
                                error: error.message 
                            });
                        }
                        
                        updateData.profileImage = result.secure_url;
                        
                        const updatedUser = await User.findByIdAndUpdate(
                            req.user._id,
                            updateData,
                            { new: true, runValidators: true }
                        ).select('-password');

                        res.json({
                            message: 'Profil mis à jour avec succès',
                            user: updatedUser
                        });
                    }
                );
                
                // Envoyer le buffer vers Cloudinary
                uploadRes.end(req.file.buffer);
                return; // On sort ici car la réponse sera envoyée dans le callback
                
            } catch (uploadError) {
                console.error('Erreur upload Cloudinary:', uploadError);
                return res.status(500).json({ 
                    message: 'Erreur lors de l\'upload de l\'image',
                    error: uploadError.message 
                });
            }
        } else if (req.body.profileImage) {
            // Image envoyée comme base64 ou URL
            let imageUrl = req.body.profileImage;
            if (!/^https?:\/\//.test(imageUrl)) {
                const uploadRes = await cloudinary.uploader.upload(imageUrl, {
                    folder: 'avatars',
                    resource_type: 'image',
                });
                imageUrl = uploadRes.secure_url;
            }
            updateData.profileImage = imageUrl;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Profil mis à jour avec succès',
            user: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Erreur de validation', 
                errors 
            });
        }

        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route pour changer le mot de passe
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                message: 'Ancien et nouveau mot de passe requis' 
            });
        }

        const user = await User.findById(req.user._id);

        // Vérifier l'ancien mot de passe
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ 
                message: 'Ancien mot de passe incorrect' 
            });
        }

        // Mettre à jour le nouveau mot de passe
        user.password = newPassword;
        await user.save();

        res.json({ 
            message: 'Mot de passe modifié avec succès' 
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route pour mettre à jour les avatars existants vers PNG
router.put('/update-avatars', async (req, res) => {
    try {
        // Trouver tous les utilisateurs avec des avatars SVG
        const users = await User.find({
            profileImage: { $regex: /\.svg\?/ }
        });

        let updatedCount = 0;
        for (const user of users) {
            const encodedUsername = encodeURIComponent(user.username);
            const newProfileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
            
            await User.findByIdAndUpdate(user._id, {
                profileImage: newProfileImage
            });
            updatedCount++;
        }

        res.json({
            message: `${updatedCount} avatars mis à jour avec succès`,
            updatedCount
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour des avatars:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
    }
});

// Route pour mettre à jour l'avatar d'un utilisateur spécifique (admin)
router.post('/update-avatar/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Rechercher l'utilisateur par email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        console.log('Utilisateur trouvé:', {
            username: user.username,
            email: user.email,
            currentAvatar: user.profileImage
        });

        // Fonction pour encoder le nom d'utilisateur pour l'URL
        function encodeUsername(username) {
            return encodeURIComponent(username);
        }

        // Fonction pour générer l'URL PNG de Dicebear
        function generatePngAvatar(username) {
            const encodedUsername = encodeUsername(username);
            return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodedUsername}`;
        }

        // Générer la nouvelle URL PNG
        const newAvatarUrl = generatePngAvatar(user.username);
        console.log('Nouvelle URL avatar:', newAvatarUrl);

        // Mettre à jour l'avatar
        user.profileImage = newAvatarUrl;
        await user.save();

        console.log('Avatar mis à jour avec succès!');
        
        res.json({ 
            message: 'Avatar mis à jour avec succès',
            user: {
                username: user.username,
                email: user.email,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'avatar:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'avatar' });
    }
});

// Route de déconnexion (optionnelle - côté client)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Optionnel : vous pouvez ajouter ici une logique pour invalider le token
        // Par exemple, ajouter le token à une liste noire
        
        console.log(`Utilisateur ${req.user.username} s'est déconnecté`);
        
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({ message: 'Erreur lors de la déconnexion' });
    }
});

// Route pour vérifier si le token est valide
router.get('/verify-token', authenticateToken, async (req, res) => {
    res.json({ 
        message: 'Token valide',
        user: req.user
    });
});

export default router;