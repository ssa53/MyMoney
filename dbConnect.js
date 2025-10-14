// /lib/dbConnect.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI; // Vercel 환경 변수를 사용하도록 변경

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local or Vercel settings'
  );
}

/**
 * 전역(global) 네임스페이스를 사용하여 개발 중 핫 리로드 시
 * 연결이 계속 늘어나는 것을 방지합니다.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('New MongoDB connection established!');
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  
  return cached.conn;
}

export default dbConnect;
