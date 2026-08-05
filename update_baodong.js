import mongoose from 'mongoose';
const uri = "mongodb+srv://ntthanhthuy274_db_user:lAwoHZ9cUKQMOXwJ@cluster0.ctnp4lw.mongodb.net/?appName=Cluster0";

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const result = await db.collection('products').updateMany(
      { baoDongMonths: { $exists: false } },
      { $set: { baoDongMonths: 12 } }
    );
    console.log(`Updated ${result.modifiedCount} products`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
