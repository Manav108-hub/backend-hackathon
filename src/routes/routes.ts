//file: src/routes/routes.ts
import { Router, Request, Response, RequestHandler } from 'express';
import { db } from '../config/firebase';
import { SimulationService } from '../services/simulation';
import { generateId, getDateRange } from '../utils/helpers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { AIAnalyticsService } from '../utils/aiAnalytics';

const router = Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';
const ADMIN_KEY = process.env.ADMIN_KEY || 'special_admin_key';
const authMiddleware = authenticateToken as RequestHandler;

// Admin-Only Middleware
const isAdmin: RequestHandler = (req: Request, res: Response, next): void => {
  const user = (req as AuthRequest).user;
  if (user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access only' });
    return;
  }
  next();
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ========== AUTH ROUTES ==========
router.get('/admin/dashboard', authMiddleware, isAdmin, async (_req: Request, res: Response) => {
  try {
    const [userSnap, orderSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('orders').get()
    ]);

    const totalUsers = userSnap.size;
    const totalOrders = orderSnap.size;

    let totalRevenue = 0;
    orderSnap.docs.forEach(doc => {
      const order = doc.data();
      totalRevenue += Number(order.totalAmount || 0); // Fallback to 0 if field is missing
    });

    res.json({
      success: true,
      message: `Welcome, Admin`,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data' });
  }
});

router.get('/admin/dashboard', authMiddleware, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;

    res.json({
      success: true,
      message: `Welcome, Admin ${user.email}`,
      data: {
        totalUsers: 123,
        totalOrders: 456,
        totalRevenue: 7890
      }
    });
  } catch (error) {
    console.error('Error in admin dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});


router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, key } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ success: false, error: 'All fields required' });
      return;
    }

    const role = key === ADMIN_KEY ? 'admin' : 'user';
    const collection = role === 'admin' ? 'admins' : 'users';

    const snapshot = await db.collection(collection).where('email', '==', email).get();
    if (!snapshot.empty) {
      res.status(409).json({ success: false, error: `${role} already exists` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();

    await db.collection(collection).doc(id).set({
      id,
      email,
      name,
      password: hashedPassword,
      role,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, message: `${role} registered`, data: { id, email, name, role } });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }

    let snapshot = await db.collection('admins').where('email', '==', email).get();
    let role = 'admin';
    if (snapshot.empty) {
      snapshot = await db.collection('users').where('email', '==', email).get();
      role = 'user';
    }

    if (snapshot.empty) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = snapshot.docs[0].data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email, role }, SECRET_KEY, { expiresIn: '2h' });
    res.json({ success: true, message: 'Login successful', token });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ========== CORE ROUTES ==========

router.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.post('/product', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    const id = generateId();
    const product = { id, ...req.body };
    await db.collection('products').doc(id).set(product);
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

router.get('/product', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => doc.data());
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

router.get('/product/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: doc.data() });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// ========== ORDER ROUTES ==========

router.post('/orders', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    if (user.role !== 'user') {
      res.status(403).json({ success: false, error: 'Only users can create orders' });
      return;
    }

    const order = {
      id: generateId(),
      customer_id: user.id,
      ...req.body,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await db.collection('orders').doc(order.id).set(order);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

router.get('/orders', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    const snapshot = user.role === 'admin'
      ? await db.collection('orders').get()
      : await db.collection('orders').where('customer_id', '==', user.id).get();

    const orders = snapshot.docs.map(doc => doc.data());
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:orderId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    const { orderId } = req.params;

    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const order = doc.data();
    if (user.role !== 'admin' && order?.customer_id !== user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// ========== INVENTORY, DELIVERY & SIMULATION ROUTES ==========

router.get('/inventory', authMiddleware, isAdmin, async (_req: Request, res: Response): Promise<void> => {
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

router.get('/delivery', authMiddleware, isAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('delivery_status').get();
    const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: deliveries });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery' });
  }
});

router.get('/delivery/:orderId', authMiddleware, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const doc = await db.collection('delivery_status').doc(orderId).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery status' });
  }
});

router.post('/simulation/start', authMiddleware, isAdmin, (_req: Request, res: Response): void => {
  try {
    SimulationService.startInventorySimulation();
    SimulationService.startDeliverySimulation();
    res.json({ success: true, message: 'Simulations started' });
  } catch (error) {
    console.error('Error starting simulations:', error);
    res.status(500).json({ success: false, error: 'Failed to start simulations' });
  }
});

router.post('/simulation/seed', authMiddleware, isAdmin, async (_req: Request, res: Response): Promise<void> => {
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

// ========== SALES ANALYTICS ==========

router.get('/analytics/sales', authMiddleware, isAdmin, async (req: Request, res: Response): Promise<void> => {
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
// Define SalesData type (temporary fix, update as per your schema)
type SalesData = {
  date: string;
  quantity: number;
  product_id?: string;
  [key: string]: any;
};
type InventoryData = {
  timestamp: string;
  quantity: number;
  product_id?: string;
  [key: string]: any;
};

// ========== AI ANALYTICS ROUTES ==========

// AI Forecast from Sales and Inventory Data
router.get('/analytics/ai', authMiddleware, isAdmin, async (req: Request, res: Response) => {
  try {
    const salesSnapshot = await db.collection('sales_data').get();
    const inventorySnapshot = await db.collection('inventory_updates').get();

    const salesData = salesSnapshot.docs.map(doc => ({ ...doc.data() })) as SalesData[];
    const inventoryData = inventorySnapshot.docs.map(doc => doc.data());

    const result = await AIAnalyticsService.getComprehensiveAnalytics(
      salesData,
      inventoryData,
      [], // Optional: historical predictions
      []  // Optional: actual results
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to run AI analytics' });
  }
});

// AI Vision - Analyze Shelf Image
router.post('/analytics/image', authMiddleware, isAdmin, upload.single('image'), async (req: Request, res: Response) => {
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

// AI Forecast of Next 7 Days Sales
router.get('/analytics/sales/forecast', authMiddleware, isAdmin, async (_req: Request, res: Response) => {
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


export default router;

// ========== Helper Function ==========

function convertToCSV(data: any): string {
  const predictions = data.data.predictions.map((p: any) => ({
    type: 'prediction',
    id: p.id,
    prediction_type: p.type,
    product_id: p.product_id || 'all',
    created_at: p.created_at,
    value: JSON.stringify(p.prediction)
  }));

  const imageAnalyses = data.data.imageAnalyses.map((img: any) => ({
    type: 'image_analysis',
    id: img.id,
    products_detected: img.result?.detectedProducts?.length || 0,
    shelf_occupancy: img.result?.shelfOccupancy || 0,
    quality_score: img.result?.visualQualityScore || 0,
    created_at: img.created_at
  }));

  const allRows = [...predictions, ...imageAnalyses];
  if (allRows.length === 0) return 'No data available';

  const headers = Object.keys(allRows[0]);
  const csvContent = [
    headers.join(','),
    ...allRows.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
  ].join('\n');

  return csvContent;
}
