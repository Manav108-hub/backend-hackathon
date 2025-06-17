import { Router, Request, Response } from 'express';
import { db } from '../config/firebase';
import { SimulationService } from '../services/simulation';
import { generateId, getDateRange } from '../utils/helpers';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get inventory data
router.get('/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('inventory_updates')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Get delivery status
router.get('/delivery/:orderId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    if (orderId) {
      const doc = await db.collection('delivery_status').doc(orderId).get();
      if (!doc.exists) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }
      res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } else {
      const snapshot = await db.collection('delivery_status').get();
      const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, data: deliveries });
    }
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery status' });
  }
});

// Get sales data for analytics
router.get('/analytics/sales', async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const { start } = getDateRange(Number(days));
    
    const snapshot = await db.collection('sales_data')
      .where('date', '>=', start)
      .orderBy('date', 'desc')
      .get();
    
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales data' });
  }
});

// Create order (for simulation)
router.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderData = {
      id: generateId(),
      ...req.body,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };
    
    await db.collection('orders').doc(orderData.id).set(orderData);
    res.json({ success: true, data: orderData });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// Start simulations
router.post('/simulation/start', (req: Request, res: Response): void => {
  try {
    SimulationService.startInventorySimulation();
    SimulationService.startDeliverySimulation();
    res.json({ success: true, message: 'Simulations started' });
  } catch (error) {
    console.error('Error starting simulations:', error);
    res.status(500).json({ success: false, error: 'Failed to start simulations' });
  }
});

// Generate sample data
router.post('/simulation/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate sample inventory
    for (let i = 0; i < 10; i++) {
      const inventoryData = SimulationService.generateInventoryUpdate();
      await db.collection('inventory_updates').add(inventoryData);
    }
    
    // Generate sample sales
    for (let i = 0; i < 20; i++) {
      const salesData = SimulationService.generateSalesData();
      await db.collection('sales_data').add(salesData);
    }
    
    res.json({ success: true, message: 'Sample data generated' });
  } catch (error) {
    console.error('Error generating sample data:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sample data' });
  }
});

export default router;