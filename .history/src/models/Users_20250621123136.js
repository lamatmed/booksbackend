import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Le nom d\'utilisateur est requis'],
        unique: true,
        trim: true,
        minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
        maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères']
    },
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez entrer un email valide']
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
    },
    firstName: {
        type: String,
        required: [true, 'Le prénom est requis'],
        trim: true,
        maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
    },
    lastName: {
        type: String,
        required: [true, 'Le nom de famille est requis'],
        trim: true,
        maxlength: [50, 'Le nom de famille ne peut pas dépasser 50 caractères']
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    favoriteBooks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }],
    readingList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }]
}, {
    timestamps: true
});

// Index pour améliorer les performances des requêtes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet
userSchema.methods.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
};

// Middleware pour hasher le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
    // Ne hasher le mot de passe que s'il a été modifié
    if (!this.isModified('password')) return next();
    
    try {
        // Hasher le mot de passe avec un salt de 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Méthode statique pour trouver un utilisateur par email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Méthode statique pour trouver un utilisateur par username
userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: username.toLowerCase() });
};

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Configuration pour inclure les virtuals lors de la sérialisation JSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password; // Ne pas inclure le mot de passe dans la réponse JSON
        return ret;
    }
});

const User = mongoose.model('User', userSchema);

export default User;
