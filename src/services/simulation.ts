import { db } from '../config/firebase';
import { InventoryUpdate, DeliveryStatus, SalesData } from '../schema/models';

export class SimulationService {
  // Generate mock inventory data
  static generateInventoryUpdate(): InventoryUpdate {
    const products = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005'];
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    
    return {
      product_id: randomProduct,
      stock_level: Math.floor(Math.random() * 100) + 1,
      timestamp: new Date().toISOString(),
      location: 'Warehouse-A',
      temperature: Math.random() * 10 + 20, // 20-30°C
    };
  }

  // Generate mock delivery tracking
  static generateDeliveryUpdate(orderId: string): DeliveryStatus {
    const statuses: DeliveryStatus['status'][] = ['pending', 'picked_up', 'on_the_way', 'delivered'];
    
    return {
      order_id: orderId,
      vehicle_lat: 28.6139 + (Math.random() - 0.5) * 0.1,
      vehicle_lng: 77.2090 + (Math.random() - 0.5) * 0.1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date().toISOString(),
      driver_id: `DRIVER_${Math.floor(Math.random() * 10) + 1}`,
    };
  }

  // Generate sales data
  static generateSalesData(): SalesData {
    const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Home'];
    const products = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005'];
    
    return {
      product_id: products[Math.floor(Math.random() * products.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      quantity: Math.floor(Math.random() * 10) + 1,
      price: Math.random() * 100 + 10,
      date: new Date().toISOString(),
      store_id: `STORE_${Math.floor(Math.random() * 5) + 1}`,
    };
  }

  // Start inventory simulation
  static async startInventorySimulation() {
    setInterval(async () => {
      const inventoryData = this.generateInventoryUpdate();
      await db.collection('inventory_updates').add(inventoryData);
      console.log('📦 Inventory updated:', inventoryData.product_id);
    }, 10000); // Every 10 seconds
  }

  // Start delivery simulation
  static async startDeliverySimulation() {
    const activeOrders = ['ORDER001', 'ORDER002', 'ORDER003'];
    
    setInterval(async () => {
      for (const orderId of activeOrders) {
        const deliveryData = this.generateDeliveryUpdate(orderId);
        await db.collection('delivery_status').doc(orderId).set(deliveryData);
      }
      console.log('🚚 Delivery status updated for all orders');
    }, 5000); // Every 5 seconds
  }
}