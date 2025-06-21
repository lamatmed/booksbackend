import express from 'express';
import Book from '../models/Book.js';
import User from '../models/Users.js';
import jwt from 'jsonwebtoken';

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
        const { title, caption, image, rating } = req.body;
        if (!title || !caption || !image || !rating) {
            return res.status(400).json({ message: 'Tous les champs sont requis' });
        }
        const book = new Book({
            title,
            author,
            caption,
            image,
            rating,
            user: req.user._id
        });
        await book.save();
        res.status(201).json({ message: 'Livre créé avec succès', book });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du livre', error: error.message });
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
        const { title, author, caption, image, rating } = req.body;
        if (title !== undefined) book.title = title;
        if (author !== undefined) book.author = author;
        if (caption !== undefined) book.caption = caption;
        if (image !== undefined) book.image = image;
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