import express from 'express';
import Book from '../models/Book.js';
import User from '../models/Users.js';
import jwt from 'jsonwebtoken';
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
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        console.log('Création de livre - Données reçues:', {
            title: req.body.title,
            caption: req.body.caption,
            rating: req.body.rating,
            hasFile: !!req.file,
            imageLength: req.body.image ? req.body.image.length : 0,
            userId: req.user._id
        });

        const { title, caption, rating } = req.body;
        
        // Validation des champs
        if (!title || !caption || !rating) {
            console.log('Validation échouée - Champs manquants:', {
                hasTitle: !!title,
                hasCaption: !!caption,
                hasRating: !!rating
            });
            return res.status(400).json({ 
                message: 'Tous les champs sont requis',
                missing: {
                    title: !title,
                    caption: !caption,
                    rating: !rating
                }
            });
        }

        let imageUrl = '';
        
        // Gestion de l'image
        if (req.file) {
            // Image uploadée via FormData
            try {
                const uploadRes = await cloudinary.uploader.upload_stream(
                    {
                        folder: 'books',
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
                        
                        const book = new Book({
                            title,
                            caption,
                            image: result.secure_url,
                            rating,
                            user: req.user._id
                        });

                        console.log('Sauvegarde du livre en base de données...');
                        await book.save();
                        
                        console.log('Livre créé avec succès:', book._id);
                        res.status(201).json({ message: 'Livre créé avec succès', book });
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
        } else if (req.body.image) {
            // Image envoyée comme base64
            try {
                const uploadRes = await cloudinary.uploader.upload(req.body.image, {
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
        } else {
            return res.status(400).json({ message: 'Une image est requise' });
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
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Livre non trouvé' });
        }
        if (book.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé à modifier ce livre' });
        }
        
        const { title, caption, rating } = req.body;
        
        if (title !== undefined) book.title = title;
        if (caption !== undefined) book.caption = caption;
        if (rating !== undefined) book.rating = rating;
        
        // Gestion de l'image
        if (req.file) {
            // Nouvelle image uploadée via FormData
            try {
                const uploadRes = await cloudinary.uploader.upload_stream(
                    {
                        folder: 'books',
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
                        
                        book.image = result.secure_url;
                        await book.save();
                        res.json({ message: 'Livre mis à jour', book });
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
        } else if (req.body.image) {
            // Image envoyée comme base64 ou URL
            let imageUrl = req.body.image;
            if (!/^https?:\/\//.test(imageUrl)) {
                const uploadRes = await cloudinary.uploader.upload(imageUrl, {
                    folder: 'books',
                    resource_type: 'image',
                });
                imageUrl = uploadRes.secure_url;
            }
            book.image = imageUrl;
        }
        
        await book.save();
        res.json({ message: 'Livre mis à jour', book });
        
    } catch (error) {
        console.error('Erreur mise à jour livre:', error);
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