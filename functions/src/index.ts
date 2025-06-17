import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Scheduled function to generate inventory updates
export const inventorySimulation = onSchedule('every 1 minutes', async (event) => {
  const db = admin.firestore();
  const products = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005'];

  for (const productId of products) {
    const inventoryData = {
      product_id: productId,
      stock_level: Math.floor(Math.random() * 100) + 1,
      timestamp: new Date().toISOString(),
      location: 'Warehouse-A',
      temperature: Math.random() * 10 + 20,
    };

    await db.collection('inventory_updates').add(inventoryData);
  }

  console.log('Inventory simulation completed');
  return;
});
