import mongoose from 'mogoose'
export const connectDB = async () => {
    try {
        await mongoose.connect(pro)
    } catch (error) {
        
    }
}