
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';

export async function GET() {
  await connectDB();
  const vendor = await Vendor.findOne({ businessName: /Pizza Palace/i });
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' });
  
  const product = await Product.findOne({ vendorId: vendor._id });
  
  return NextResponse.json({
    vendor: vendor.businessName,
    productId: product?._id,
    vendorId: vendor._id
  });
}
