const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const session = require('express-session');

// MongoDB 사용자 스키마 정의
const userSchema = new mongoose.Schema({
    kakaoId: {
        type: String,
        required: true,
        unique: true
    },
    nickname: {
        type: String,
        required: true
    },
    email: {
        type: String
    }
});
const User = mongoose.model('User', userSchema);

// 거래 내역 스키마 정의
const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// 자산 스키마 정의
const assetSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true }
});
const Asset = mongoose.model('Asset', assetSchema);

// MongoDB Connection String (여러분이 입력한 값)
const uri = "mongodb+srv://sodoso532:Wognsdl12.@my-money-cluster.cg81boi.mongodb.net/?retryWrites=true&w=majority&appName=my-money-cluster"

// MongoDB 연결
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas!'))
    .catch(err => console.error('Could not connect to MongoDB Atlas...', err));

const app = express();
const port = 3000;

// =========================================================
// 미들웨어 설정
// =========================================================
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: true,
        sameSite: 'none'
    }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================
// 1. 프론트엔드 파일 제공 및 로그인 상태 확인
// =========================================================
app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/user', (req, res) => {
