import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre du livre est requis'],
        trim: true,
        maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
    },
    author: {
        type: String,
        required: [true, 'L\'auteur est requis'],
        trim: true,
        maxlength: [100, 'Le nom de l\'auteur ne peut pas dépasser 100 caractères']
    },
    description: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        require:true,
    },
    publishedYear: {
        type: Number,
        default: null
    },
    genres: [{
        type: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const Book = mongoose.model('Book', bookSchema);

export default Book;
