import mongoose from 'mogoose'
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.M)
    } catch (error) {
        
    }
}