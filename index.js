const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nocache = require('nocache');
const cors = require('cors');

// --- 스키마 정의 ---
const userSchema = new mongoose.Schema({
    kakaoId: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true }
});
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

const assetSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true }
});
const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);


// --- MongoDB 연결 ---
const uri = process.env.MONGODB_URI; // Vercel 환경 변수 사용
mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB Atlas!'))
    .catch(err => console.error('Could not connect to MongoDB Atlas...', err));

// --- Express 앱 설정 ---
const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: 'http://127.0.0.1:5500', // 로컬 개발 환경 주소 허용
  credentials: true // 쿠키(자격 증명) 허용
}));

// --- 미들웨어 설정 ---
app.use(nocache()); // 캐시 방지 미들웨어
app.use(session({
    secret: process.env.SECRET_COOKIE_PASSWORD, // Vercel 환경 변수 사용
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: uri }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
    },
    proxy: true
}));
app.use(express.json());

// --- API 라우트 ---
app.get('/api/user', (req, res) => {
    // ✨ 디버깅 로그 추가 ✨
    console.log('Session on /api/user request:', req.session);
    if (req.session && req.session.user) {
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

app.get('/auth/kakao', (req, res) => {
    const CLIENT_ID = process.env.KAKAO_CLIENT_ID;
    const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    res.redirect(KAKAO_AUTH_URL);
});

app.get('/auth/kakao/callback', async (req, res) => {
    const { code } = req.query;
    const CLIENT_ID = process.env.KAKAO_CLIENT_ID;
    const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

    if (!code) return res.redirect('/');
    
    try {
        const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code: code,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' } });

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const kakaoUser = userResponse.data;
        let user = await User.findOne({ kakaoId: kakaoUser.id });

        if (!user) {
            user = new User({
                kakaoId: kakaoUser.id.toString(),
                nickname: kakaoUser.properties.nickname,
            });
            await user.save();
        }
        req.session.user = user;
        console.log('User logged in, attempting to save session:', req.session);
        req.session.save(err => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.status(500).send('세션 저장 중 오류 발생');
                    }
                    console.log('Session saved successfully, redirecting to /');
                    res.redirect('/');
                });
    } catch (error) {
        console.error('카카오 로그인 오류:', error.response?.data || error.message);
        res.status(500).send('카카오 로그인 중 오류가 발생했습니다.');
    }
});

app.get('/api/transactions', async (req, res) => {
    if (!req.session.user || req.query.userId !== req.session.user.kakaoId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const transactions = await Transaction.find({ userId: req.session.user.kakaoId });
    res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const newTransaction = new Transaction({ ...req.body, userId: req.session.user.kakaoId });
    await newTransaction.save();
    res.status(201).json(newTransaction);
});

app.put('/api/transactions/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const updated = await Transaction.findOneAndUpdate(
        { _id: req.params.id, userId: req.session.user.kakaoId },
        { $set: req.body },
        { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
});

app.delete('/api/transactions/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await Transaction.deleteOne({ _id: req.params.id, userId: req.session.user.kakaoId });
    res.status(200).json({ message: 'Deleted' });
});

app.get('/api/assets', async (req, res) => {
    if (!req.session.user || req.query.userId !== req.session.user.kakaoId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const assets = await Asset.find({ userId: req.session.user.kakaoId });
    res.json(assets);
});

app.post('/api/assets', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const newAsset = new Asset({ ...req.body, userId: req.session.user.kakaoId });
    await newAsset.save();
    res.status(201).json(newAsset);
});

app.put('/api/assets/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    const updated = await Asset.findOneAndUpdate(
        { _id: req.params.id, userId: req.session.user.kakaoId },
        { amount },
        { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
});

app.delete('/api/assets/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await Asset.deleteOne({ _id: req.params.id, userId: req.session.user.kakaoId });
    res.status(200).json({ message: 'Deleted' });
});

app.delete('/api/data', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.kakaoId;
    await Transaction.deleteMany({ userId });
    await Asset.deleteMany({ userId });
    res.status(200).json({ message: 'All data deleted' });
});

// --- 페이지 라우팅 및 정적 파일 제공 ---

// 'public' 폴더의 정적 파일(css, js, images 등)을 먼저 제공하도록 설정합니다.
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트들은 이 코드 블록 이전에 정의되어 있으므로 먼저 처리됩니다.
// 그 후, 위에서 처리되지 않은 모든 GET 요청은 여기서 최종적으로 처리합니다.
// (SPA에서 새로고침 시 404 오류 방지 및 기본 페이지 로딩 역할)
// app.get('*', (req, res) => {
//     // 사용자가 로그인한 상태이면 메인 앱(index.html)을, 아니면 로그인 페이지를 보여줍니다.
//     if (req.session && req.session.user) {
//         res.sendFile(path.join(__dirname, 'public', 'index.html'));
//     } else {
//         res.sendFile(path.join(__dirname, 'public', 'login.html'));
//     }
//     res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
// });


module.exports = app;



