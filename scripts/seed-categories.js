const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  const envLines = envConfig.split('\n');
  
  envLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

console.log('MONGODB_URI loaded:', process.env.MONGODB_URI ? 'Yes ✅' : 'No ❌');

// Rest of your seed script...
const categorySchema = new mongoose.Schema({
  name: String,
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const subcategorySchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  name: String,
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);

const categories = [
  {
    name: 'Fashion & Apparel',
    description: 'Clothing, shoes, and accessories',
    subcategories: [
      { name: 'Men\'s Clothing', description: 'Shirts, pants, suits' },
      { name: 'Women\'s Clothing', description: 'Dresses, tops, skirts' },
      { name: 'Shoes', description: 'Footwear for all' },
      { name: 'Accessories', description: 'Bags, jewelry, watches' },
    ]
  },
  {
    name: 'Electronics & Gadgets',
    description: 'Electronic devices and accessories',
    subcategories: [
      { name: 'Phones & Tablets', description: 'Mobile devices' },
      { name: 'Computers & Laptops', description: 'Computing devices' },
      { name: 'Audio & Headphones', description: 'Sound equipment' },
      { name: 'Cameras', description: 'Photography equipment' },
    ]
  },
  {
    name: 'Food & Beverages',
    description: 'Food items and drinks',
    subcategories: [
      { name: 'Fresh Produce', description: 'Fruits and vegetables' },
      { name: 'Grains & Rice', description: 'Staple foods' },
      { name: 'Beverages', description: 'Drinks and juices' },
      { name: 'Snacks', description: 'Packaged snacks' },
    ]
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Beauty products and personal care items',
    subcategories: [
      { name: 'Skincare', description: 'Face and body care' },
      { name: 'Makeup', description: 'Cosmetics' },
      { name: 'Hair Care', description: 'Shampoos and treatments' },
      { name: 'Fragrances', description: 'Perfumes and colognes' },
    ]
  },
  {
    name: 'Home & Furniture',
    description: 'Home decor and furniture',
    subcategories: [
      { name: 'Living Room', description: 'Sofas, tables, chairs' },
      { name: 'Bedroom', description: 'Beds and dressers' },
      { name: 'Kitchen', description: 'Kitchen furniture' },
      { name: 'Decor', description: 'Home decorations' },
    ]
  },
  {
    name: 'Health & Wellness',
    description: 'Health products and supplements',
    subcategories: [
      { name: 'Vitamins & Supplements', description: 'Health supplements' },
      { name: 'Fitness Equipment', description: 'Exercise gear' },
      { name: 'Medical Supplies', description: 'Health supplies' },
    ]
  },
  {
    name: 'Sports & Fitness',
    description: 'Sports equipment and fitness gear',
    subcategories: [
      { name: 'Gym Equipment', description: 'Workout machines' },
      { name: 'Sports Wear', description: 'Athletic clothing' },
      { name: 'Outdoor Sports', description: 'Camping, hiking gear' },
    ]
  },
  {
    name: 'Toys & Kids',
    description: 'Toys and children\'s products',
    subcategories: [
      { name: 'Educational Toys', description: 'Learning toys' },
      { name: 'Action Figures', description: 'Collectible figures' },
      { name: 'Baby Products', description: 'Baby care items' },
    ]
  },
  {
    name: 'Books & Stationery',
    description: 'Books and office supplies',
    subcategories: [
      { name: 'Fiction Books', description: 'Novels and stories' },
      { name: 'Educational Books', description: 'Textbooks' },
      { name: 'Office Supplies', description: 'Pens, paper, etc' },
    ]
  },
  {
    name: 'Automobile & Parts',
    description: 'Car parts and accessories',
    subcategories: [
      { name: 'Car Parts', description: 'Spare parts' },
      { name: 'Car Accessories', description: 'Interior accessories' },
      { name: 'Car Care', description: 'Cleaning products' },
    ]
  },
  {
    name: 'Agriculture & Farm Produce',
    description: 'Agricultural products',
    subcategories: [
      { name: 'Seeds', description: 'Planting seeds' },
      { name: 'Farm Tools', description: 'Farming equipment' },
      { name: 'Livestock', description: 'Animals and feed' },
    ]
  },
  {
    name: 'Arts, Crafts & Culture',
    description: 'Artistic and cultural items',
    subcategories: [
      { name: 'Paintings', description: 'Art pieces' },
      { name: 'Craft Supplies', description: 'DIY materials' },
      { name: 'Cultural Items', description: 'Traditional items' },
    ]
  },
  {
    name: 'Services',
    description: 'Various services',
    subcategories: [
      { name: 'Cleaning Services', description: 'Home cleaning' },
      { name: 'Repair Services', description: 'Repairs' },
      { name: 'Consulting', description: 'Professional advice' },
    ]
  },
  {
    name: 'Others',
    description: 'Miscellaneous items',
    subcategories: [
      { name: 'General', description: 'Uncategorized items' },
    ]
  },
];

async function seedCategories() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing categories and subcategories...');
    await Category.deleteMany({});
    await Subcategory.deleteMany({});

    console.log('📝 Seeding categories and subcategories...');

    for (const categoryData of categories) {
      // Create category
      const category = await Category.create({
        name: categoryData.name,
        description: categoryData.description,
        isActive: true,
      });

      console.log(`✅ Created category: ${category.name}`);

      // Create subcategories
      if (categoryData.subcategories) {
        for (const subData of categoryData.subcategories) {
          const subcategory = await Subcategory.create({
            categoryId: category._id,
            name: subData.name,
            description: subData.description,
            isActive: true,
          });
          console.log(`   ✅ Created subcategory: ${subcategory.name}`);
        }
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`📊 Total categories: ${categories.length}`);
    
    const totalSubcategories = categories.reduce((sum, cat) => 
      sum + (cat.subcategories ? cat.subcategories.length : 0), 0
    );
    console.log(`📊 Total subcategories: ${totalSubcategories}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();