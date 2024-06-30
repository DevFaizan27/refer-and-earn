import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Your_password',
    port: 5432,
});

// Generate referral code
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10);
};

// Register user
app.post('/register', async (req, res) => {
    const { username, password, referredBy } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();

    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, referral_code, referred_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, hashedPassword, referralCode, referredBy]
        );
        const user = result.rows[0];

        if (referredBy) {
            const referrerResult = await pool.query('SELECT id FROM users WHERE referral_code = $1', [referredBy]);
            const referrerId = referrerResult.rows[0]?.id;
            if (referrerId) {
                await pool.query('INSERT INTO referrals (referrer_id, referee_id) VALUES ($1, $2)', [referrerId, user.id]);
            }
        }

        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ userId: user.id }, '123456');
            res.json({ token, referralCode: user.referral_code });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get referrals
app.get('/referrals', async (req, res) => {
    try {
       
        //checking by eferrer_id = 1
        const result = await pool.query('SELECT * FROM referrals WHERE referrer_id = 1', );
        console.log(result);
        res.json(result.rows);
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(400).json({ error: error.message });
    }
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
