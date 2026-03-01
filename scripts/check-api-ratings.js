const axios = require('axios');

async function checkRatings() {
  const res = await axios.get('http://localhost:3000/api/products/featured?limit=12');
  const products = res.data.products;
  const ratings = res.data.ratings;
  
  console.log('--- API RATINGS CHECK ---');
  console.log('Total Products returned:', products.length);
  console.log('Ratings keys count:', Object.keys(ratings).length);
  
  products.forEach(p => {
    const r = p.productRating;
    const hasR = r && r.count > 0;
    console.log(`Product: ${p.name} (${p._id}) - Rating data: ${JSON.stringify(r)} - Show Ratings: ${hasR}`);
  });
}

checkRatings().catch(e => console.error(e.message));
