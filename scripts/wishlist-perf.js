const axios = require('axios');
const jwt = require('jsonwebtoken');
const { performance } = require('perf_hooks');

// Use the token from the user if I can, or generate one if I have the secret
const JWT_SECRET = '4a66fa9eccba463a0476be8dc32a19c9f10db78d82d0c983c5233d5eecb12d9fec9f3b61f2ac130133e3318829e9f65f2bc18ecaa63769f65086d1264ac3cb5d';

async function testWishlistPerf() {
  const token = jwt.sign({ userId: '67bf1705886697b003a27618', role: 'CUSTOMER' }, JWT_SECRET);
  
  const start = performance.now();
  try {
    const response = await axios.get('http://localhost:3000/api/customer/wishlist', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Wishlist API: ${performance.now() - start}ms (Items: ${response.data.wishlist.length})`);
  } catch (error) {
    console.log(`Wishlist API ERROR: ${error.message}`);
  }
}

testWishlistPerf().catch(console.error);
