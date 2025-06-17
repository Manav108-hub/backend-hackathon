export interface InventoryUpdate {
  product_id: string;
  stock_level: number;
  timestamp: string;
  location?: string;
  temperature?: number;
}

export interface DeliveryStatus {
  order_id: string;
  vehicle_lat: number;
  vehicle_lng: number;
  status: 'pending' | 'picked_up' | 'on_the_way' | 'delivered';
  timestamp: string;
  driver_id?: string;
  estimated_arrival?: string;
}

export interface SalesData {
  product_id: string;
  category: string;
  quantity: number;
  price: number;
  date: string;
  store_id?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  min_stock_level: number;
  supplier_id?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  products: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
  delivery_address: {
    lat: number;
    lng: number;
    address: string;
  };
}