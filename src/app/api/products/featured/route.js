import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import Category from '@/lib/mongodb/models/Category';
import PriceOffer from '@/lib/mongodb/models/PriceOffer';
import Customer from '@/lib/mongodb/models/Customer';
import jwt from 'jsonwebtoken';
import { getCache, setCache } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getUserIdFromToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Check Cache
    const cacheKey = `featured_products_${limit}_${skip}_v2`; 
    let products = getCache(cacheKey);
    
    if (!products) {
      await connectDB();
      const start = Date.now();
      
      products = await Product.aggregate([
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Join Category
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        // Join Vendor
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        // Join Power Hour
        {
          $lookup: {
            from: 'powerhours',
            let: { pid: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ['$productId', '$$pid'] },
                      { $eq: ['$status', 'ACTIVE'] },
                      { $gt: ['$endTime', new Date()] }
                    ]
                  }
                }
              }
            ],
            as: 'powerHourInfo'
          }
        },
        // Flatten joined arrays
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
        // Project final fields
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            images: 1,
            activeSlashId: 1,
            hasActivePowerHour: { $gt: [{ $size: '$powerHourInfo' }, 0] },
            discountPercentage: 1,
            discountStartDate: 1,
            discountEndDate: 1,
            isActive: 1,
            quantity: 1,
            categoryId: 1,
            vendorId: 1,
            totalSold: 1,
            views: 1,
            createdAt: 1,
            category: { name: '$categoryInfo.name' },
            vendor: {
              businessName: '$vendorInfo.businessName',
              city: '$vendorInfo.city',
              state: '$vendorInfo.state',
              logoUrl: '$vendorInfo.logoUrl'
            }
          }
        }
      ]);
      
      console.log(`[FeaturedAPI:Aggregation] Cache Miss. Query took ${Date.now() - start}ms.`);
      setCache(cacheKey, products, 300); // Cache for 5 mins
    } else {
      console.log(`[FeaturedAPI] Serving base products from cache.`);
    }
    
    if (!products) products = [];
    await connectDB();
    
    // -- User Specific Enrichment (Don't cache this part) --
    const userId = await getUserIdFromToken(request);
    let finalProducts = products.map(p => ({
      ...p,
      _id: p._id.toString()
    }));

    if (userId) {
      const customer = await Customer.findOne({ userId });
      if (customer) {
        const acceptedOffers = await PriceOffer.find({
          customerId: customer._id,
          status: { $in: ['ACCEPTED', 'CLAIMED'] },
          expiresAt: { $gt: new Date() },
          productId: { $in: finalProducts.map(p => p._id) }
        });

        const acceptedMap = new Map(acceptedOffers.map(o => [o.productId.toString(), o]));
        finalProducts = finalProducts.map(p => {
          const offer = acceptedMap.get(p._id);
          if (offer) {
            return {
              ...p,
              hasAcceptedOffer: true,
              exclusivePrice: offer.finalPrice || offer.maxPrice
            };
          }
          return p;
        });
      }
    }

    // Cache the result for 1 minute (only if NOT user filtered for simplicity, or just don't cache enriched data)
    // For now, let's just return. If we want to cache, we'd cache the base products and then enrich.
    if (!userId) {
      setCache(cacheKey, finalProducts, 60);
    }

    return NextResponse.json({ success: true, products: finalProducts });

  } catch (error) {
    console.error('Featured products error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}