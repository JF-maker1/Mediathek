// Načte proměnné ze souboru .env.local
require('dotenv').config({ path: './.env.local' });

// Vypíše hodnotu proměnné DATABASE_URL
console.log('DATABASE_URL:', process.env.DATABASE_URL);