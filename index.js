// 필요한 모듈 불러오기
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const session = require('express-session');
const dbConnect = require('./lib/dbConnect');
const MongoStore = require('connect-mongo');

app.set('trust proxy', 1);

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

// express 앱 생성 및 설정
const app = express();
const port = 3000;

// =========================================================
// 미들웨어 설정
// =========================================================
app.use(async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).send('Service Unavailable');
  }
});

app.use(session({
  secret: process.env.SECRET_COOKIE_PASSWORD,
  resave: false, // 세션이 변경되지 않으면 다시 저장하지 않음 (권장)
  saveUninitialized: false, // 로그인한 사용자에게만 세션을 생성 (권장)
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI // 세션을 저장할 MongoDB 연결 주소
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일 동안 로그인 유지
    secure: process.env.NODE_ENV === 'production', // 프로덕션 환경에서는 HTTPS에서만 쿠키 전송
  }
}));

app.use(express.json()); // 서버가 JSON 데이터를 이해하도록 설정
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
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});

// =========================================================
// 2. 카카오 로그인 API
// =========================================================
app.get('/auth/kakao', (req, res) => {
    const CLIENT_ID = '1af73730f80155338187b3b3669482d4';
    const REDIRECT_URI = 'https://my-money-gamma.vercel.app/auth/kakao/callback';
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    res.redirect(KAKAO_AUTH_URL);
});

app.get('/auth/kakao/callback', async (req, res) => {
    const code = req.query.code;
    const CLIENT_ID = '1af73730f80155338187b3b3669482d4';
    const REDIRECT_URI = 'https://my-money-gamma.vercel.app/auth/kakao/callback';

    if (!code) {
        return res.redirect('/');
    }
    
    try {
        const tokenResponse = await axios({
            method: 'POST',
            url: 'https://kauth.kakao.com/oauth/token',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            data: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                code: code
            })
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
        });

        const kakaoUser = userResponse.data;

        let user = await User.findOne({ kakaoId: kakaoUser.id });

        if (!user) {
            user = new User({
                kakaoId: kakaoUser.id,
                nickname: kakaoUser.properties.nickname,
            });
            await user.save();
        }

        req.session.user = user;
        
        res.redirect('/');

    } catch (error) {
        console.error('카카오 로그인 오류:', error.response?.data || error.message);
        res.status(500).send('카카오 로그인 중 오류가 발생했습니다.');
    }
});


// =========================================================
// 3. 데이터 저장/불러오기/삭제 API
// =========================================================
app.get('/api/transactions', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const transactions = await Transaction.find({ userId: userId });
    res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const newTransaction = new Transaction({ ...req.body, userId: userId });
    await newTransaction.save();
    res.json(newTransaction);
});

app.delete('/api/transactions/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const transactionId = req.params.id;
    await Transaction.deleteOne({ _id: transactionId, userId: userId });
    res.status(200).json({ message: 'Transaction deleted.' });
});

app.get('/api/assets', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const assets = await Asset.find({ userId: userId });
    res.json(assets);
});

app.post('/api/assets', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const newAsset = new Asset({ ...req.body, userId: userId });
    await newAsset.save();
    res.json(newAsset);
});

app.delete('/api/assets/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    const assetId = req.params.id;
    await Asset.deleteOne({ _id: assetId, userId: userId });
    res.status(200).json({ message: 'Asset deleted.' });
});

app.delete('/api/data', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    await Transaction.deleteMany({ userId: userId });
    await Asset.deleteMany({ userId: userId });
    res.status(200).json({ message: 'All data deleted successfully.' });
});

module.exports = app;




