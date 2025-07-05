import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SimulationService } from '../services/simulation';
import { db } from '../config/firebase';
import { AIAnalyticsService } from '../utils/aiAnalytics';
import { getDateRange } from '../utils/helpers';

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// ====== Types ======
export interface TokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: TokenPayload;
}
interface SalesData {
  date: string;
  quantity: number;
  product_id?: string;
  [key: string]: any;
}
interface InventoryUpdate {
  product_id: string;
  stock_level: number;
  timestamp: string;
  location: string;
  temperature: number;
}
interface DeliveryStatus {
  order_id: string;
  vehicle_lat: number;
  vehicle_lng: number;
  status: 'pending' | 'picked_up' | 'on_the_way' | 'delivered';
  timestamp: string;
  driver_id: string;
}

// ====== Middleware ======

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: 'Token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthRequest).user;
  if (user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access only' });
    return;
  }
  next();
};

// ====== Admin Dashboard Route ======
router.post('/simulation/start', authenticateToken, isAdmin, (_req, res) => {
  try {
    SimulationService.startInventorySimulation();
    SimulationService.startDeliverySimulation();
    res.json({ success: true, message: 'Simulations started' });
  } catch (error) {
    console.error('Error starting simulations:', error);
    res.status(500).json({ success: false, error: 'Failed to start simulations' });
  }
});
router.post('/simulation/seed', authenticateToken, isAdmin, async (_req, res) => {
  try {
    for (let i = 0; i < 10; i++) {
      const inventoryData = SimulationService.generateInventoryUpdate();
      await db.collection('inventory_updates').add(inventoryData);
    }

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
router.get('/analytics/sales', authenticateToken, isAdmin, async (req, res) => {
  try {
    const days = Number((req.query.days as string) || 7);
    const { start } = getDateRange(days);

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
router.get('/analytics/ai', authenticateToken, isAdmin, async (_req, res) => {
  try {
    const salesSnapshot = await db.collection('sales_data').get();
    const inventorySnapshot = await db.collection('inventory_updates').get();

    const salesData = salesSnapshot.docs.map(doc => doc.data() as SalesData);
    const inventoryData = inventorySnapshot.docs.map(doc => doc.data());

    const result = await AIAnalyticsService.getComprehensiveAnalytics(
      salesData,
      inventoryData,
      [],
      []
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to run AI analytics' });
  }
});
router.get('/analytics/sales/forecast', authenticateToken, isAdmin, async (_req, res) => {
  try {
    const snapshot = await db.collection('sales_data').orderBy('date', 'desc').limit(30).get();
    const salesData = snapshot.docs.map(doc => ({ ...doc.data() })) as SalesData[];

    const result = await AIAnalyticsService.analyzeSalesQuantity(salesData, 30);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sales forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to forecast sales' });
  }
});
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analytics/image', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No image uploaded' });
      return;
    }

    const result = await AIAnalyticsService.analyzeShelfImage(file.buffer);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze image' });
  }
});


router.get('/admin/dashboard', authenticateToken, isAdmin, (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  res.json({
    success: true,
    message: `Welcome Admin: ${user.email}`,
    data: {
      totalUsers: 100,
      totalOrders: 42,
      totalProducts: 17,
      health: 'good'
    }
  });
});

export default router;
