import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';

const router = express.Router();

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ message: 'Token d\'accès requis' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
}
        const newUser = new User({
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            password,
            profileImage: profileImage || null
        });

        await newUser.save();

        // Générer le token JWT
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET || 'your-secret-key',
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
            return res.status(401).json({ 
                message: 'Email ou mot de passe incorrect' 
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Email ou mot de passe incorrect' 
            });
        }

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
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
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, profileImage } = req.body;
        const updateData = {};

        // Vérifier si les champs sont fournis
        if (username) updateData.username = username.toLowerCase();
        if (email) updateData.email = email.toLowerCase();
        if (profileImage !== undefined) updateData.profileImage = profileImage;

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

// Route de déconnexion (optionnelle - côté client)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // En production, vous pourriez ajouter le token à une liste noire
        res.json({ 
            message: 'Déconnexion réussie' 
        });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur' 
        });
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