
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';

export async function GET() {
  await connectDB();
  const vendor = await Vendor.findOne({ businessName: /Pizza Palace/i });
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' });
  return NextResponse.json({
    name: vendor.businessName,
    subaccount: vendor.flutterwaveSubaccount
  });
}
