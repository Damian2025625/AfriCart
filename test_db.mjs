import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://damiansamuel18:O1QfHj5rM7m5h9fW@africart.r030c.mongodb.net/africart?retryWrites=true&w=majority&appName=africart";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const users = await mongoose.connection.collection("users").find({}).limit(5).toArray();
  for (const user of users) {
    console.log(user.email, "has profile picture?", !!user.profilePicture);
    if (user.profilePicture) {
        console.log("length:", user.profilePicture.length);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
