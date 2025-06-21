import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL)
        
        console.log(`MongoDB Connected: ${conn.connection.host}`)
        return conn
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message)
        process.exit(1)
    }
}

// Verify connection status
export const isConnected = () => {
    return mongoose.connection.readyState === 1
}

// Get connection status
export const getConnectionStatus = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    }
    return states[mongoose.connection.readyState] || 'unknown'
}