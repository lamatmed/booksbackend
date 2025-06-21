import express from 'express';
import Book from '../models/Book.js';
import User from '../models/Users.js';
import jwt from 'jsonwebtoken';
import cloudinary from '../lib/cloudinary.js';


const router = express.Router();

// Middleware pour vérifier le token JWT (copié depuis authRoutes.js)
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

// Créer un livre (authentifié)
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('Création de livre - Données reçues:', {
            title: req.body.title,
            caption: req.body.caption,
            rating: req.body.rating,
            imageLength: req.body.image ? req.body.image.length : 0,
            userId: req.user._id
        });

        const { title, caption, image, rating } = req.body;
        
        // Validation des champs
        if (!title || !caption || !image || !rating) {
            console.log('Validation échouée - Champs manquants:', {
                hasTitle: !!title,
                hasCaption: !!caption,
                hasImage: !!image,
                hasRating: !!rating
            });
            return res.status(400).json({ 
                message: 'Tous les champs sont requis',
                missing: {
                    title: !title,
                    caption: !caption,
                    image: !image,
                    rating: !rating
                }
            });
        }

        let imageUrl = image;
        
        // Si l'image n'est pas déjà une URL, on suppose que c'est du base64 et on l'upload
        if (!/^https?:\/\//.test(image)) {
            console.log('Upload de l\'image vers Cloudinary...');
            try {
                const uploadRes = await cloudinary.uploader.upload(image, {
                    folder: 'books',
                    resource_type: 'image',
                });
                imageUrl = uploadRes.secure_url;
                console.log('Image uploadée avec succès:', imageUrl);
            } catch (uploadError) {
                console.error('Erreur upload Cloudinary:', uploadError);
                return res.status(500).json({ 
                    message: 'Erreur lors de l\'upload de l\'image',
                    error: uploadError.message 
                });
            }
        }

        const book = new Book({
            title,
            caption,
            image: imageUrl,
            rating,
            user: req.user._id
        });

        console.log('Sauvegarde du livre en base de données...');
        await book.save();
        
        console.log('Livre créé avec succès:', book._id);
        res.status(201).json({ message: 'Livre créé avec succès', book });
        
    } catch (error) {
        console.error('Erreur création livre:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la création du livre', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Obtenir tous les livres
router.get('/', async (req, res) => {
    try {
        const books = await Book.find().populate('user', 'username email profileImage');
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des livres', error: error.message });
    }
});

// Obtenir un livre par ID
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('user', 'username email profileImage');
        if (!book) {
            return res.status(404).json({ message: 'Livre non trouvé' });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du livre', error: error.message });
    }
});

// Mettre à jour un livre (authentifié, propriétaire uniquement)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Livre non trouvé' });
        }
        if (book.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé à modifier ce livre' });
        }
        const { title, caption, image, rating } = req.body;
        if (title !== undefined) book.title = title;
      
        if (caption !== undefined) book.caption = caption;
        if (image !== undefined) {
            let imageUrl = image;
            if (!/^https?:\/\//.test(image)) {
                const uploadRes = await cloudinary.uploader.upload(image, {
                    folder: 'books',
                    resource_type: 'image',
                });
                imageUrl = uploadRes.secure_url;
            }
            book.image = imageUrl;
        }
        if (rating !== undefined) book.rating = rating;
        await book.save();
        res.json({ message: 'Livre mis à jour', book });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du livre', error: error.message });
    }
});

// Supprimer un livre (authentifié, propriétaire uniquement)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Livre non trouvé' });
        }
        if (book.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé à supprimer ce livre' });
        }
        // Suppression de l'image sur Cloudinary si c'est une URL Cloudinary
        if (book.image && book.image.includes('cloudinary.com')) {
            // Extraire le public_id de l'URL Cloudinary
            const matches = book.image.match(/\/v\d+\/([^\.\/]+)\.[a-zA-Z0-9]+$/);
            if (matches && matches[1]) {
                const publicId = `books/${matches[1]}`;
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    // On logue mais on ne bloque pas la suppression du livre
                    console.error('Erreur suppression image Cloudinary:', err.message);
                }
            }
        }
        await book.deleteOne();
        res.json({ message: 'Livre supprimé' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du livre', error: error.message });
    }
});

// Obtenir tous les livres d'un utilisateur
router.get('/user/:userId', async (req, res) => {
    try {
        const books = await Book.find({ user: req.params.userId }).populate('user', 'username email profileImage');
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des livres de l\'utilisateur', error: error.message });
    }
});

export default router;