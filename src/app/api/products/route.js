import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import Category from '@/lib/mongodb/models/Category';
import PowerHour from '@/lib/mongodb/models/PowerHour';
import PriceOffer from '@/lib/mongodb/models/PriceOffer';
import Customer from '@/lib/mongodb/models/Customer';
import jwt from 'jsonwebtoken';

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
    await connectDB();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 100;
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const location = searchParams.get('location');

    let query = { isActive: true };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (location) {
      const vendors = await Vendor.find({
        $or: [
          { city: { $regex: location, $options: 'i' } },
          { state: { $regex: location, $options: 'i' } }
        ]
      }).select('_id');
      const vendorIds = vendors.map(v => v._id);
      query.vendorId = { $in: vendorIds };
    }

    const products = await Product.find(query)
      .populate('vendorId', 'businessName city state')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const activePowerHours = await PowerHour.find({
      productId: { $in: products.map(p => p._id) },
      status: 'ACTIVE',
      endTime: { $gt: new Date() }
    });
    const phProductIds = new Set(activePowerHours.map(ph => ph.productId.toString()));

    const userId = await getUserIdFromToken(request);
    let acceptedMap = new Map();

    if (userId) {
      const customer = await Customer.findOne({ userId });
      if (customer) {
        const acceptedOffers = await PriceOffer.find({
          customerId: customer._id,
          status: { $in: ['ACCEPTED', 'CLAIMED'] },
          expiresAt: { $gt: new Date() },
          productId: { $in: products.map(p => p._id) }
        });
        acceptedMap = new Map(acceptedOffers.map(o => [o.productId.toString(), o]));
      }
    }

    const transformed = products.map((product) => {
      const offer = acceptedMap.get(product._id.toString());
      return {
        _id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity,
        images: product.images || [],
        features: product.features || [],
        activeSlashId: product.activeSlashId,
        hasActivePowerHour: phProductIds.has(product._id.toString()),
        hasAcceptedOffer: !!offer,
        exclusivePrice: offer ? (offer.finalPrice || offer.maxPrice) : null,
        discountPercentage: product.discountPercentage || 0,
        discountStartDate: product.discountStartDate,
        discountEndDate: product.discountEndDate,
        isActive: product.isActive,
        views: product.views || 0,
        totalSold: product.totalSold || 0,
        createdAt: product.createdAt,
        categoryId: product.categoryId?._id?.toString(),
        category: product.categoryId ? { name: product.categoryId.name } : null,
        vendor: product.vendorId
          ? {
              _id: product.vendorId._id.toString(),
              businessName: product.vendorId.businessName,
              city: product.vendorId.city,
              state: product.vendorId.state,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      products: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
