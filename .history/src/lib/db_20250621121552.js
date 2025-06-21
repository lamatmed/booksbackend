import mongoose from 'mogoose'
export const connectDB = async () => {
    try {
        await mongoose.conn
    } catch (error) {
        
    }
}