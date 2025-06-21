import mongoose from 'mogoose'
export const connectDB = async () => {
    try {
        await mongoose.connect()
    } catch (error) {
        
    }
}