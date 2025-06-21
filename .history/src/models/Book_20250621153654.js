import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre du livre est requis'],
        trim: true,
        maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
    },
  
    caption: {
        type: String,
        require: true,
    },
    image: {
        type: String,
        require:true,
    },
    rating: {
        type: Number,
        require: true,
        min: 1,
        max:5,
    },
  
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const Book = mongoose.model('Book', bookSchema);

export default Book;

