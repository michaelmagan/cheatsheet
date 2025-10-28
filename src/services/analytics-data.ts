/**
 * @file analytics-data.ts
 * @description Simple mock analytics data service with basic filtering
 */

// Simple data types
export interface SalesRecord {
  month: string;
  revenue: number;
  units: number;
  region: string;
  category: string;
}

export interface Product {
  name: string;
  sales: number;
  revenue: number;
  category: string;
}

export interface UserData {
  month: string;
  users: number;
  active: number;
  segment: string;
}

export interface KPI {
  name: string;
  value: number;
  unit: string;
  category: string;
}

const salesData: SalesRecord[] = [
  {
    month: "Jan",
    revenue: 45000,
    units: 120,
    region: "North",
    category: "Electronics",
  },
  {
    month: "Feb",
    revenue: 52000,
    units: 140,
    region: "South",
    category: "Electronics",
  },
  {
    month: "Mar",
    revenue: 38000,
    units: 95,
    region: "East",
    category: "Clothing",
  },
  {
    month: "Apr",
    revenue: 61000,
    units: 165,
    region: "West",
    category: "Electronics",
  },
  {
    month: "May",
    revenue: 43000,
    units: 110,
    region: "North",
    category: "Home",
  },
  {
    month: "Jun",
    revenue: 55000,
    units: 145,
    region: "South",
    category: "Electronics",
  },
  {
    month: "Jul",
    revenue: 67000,
    units: 180,
    region: "East",
    category: "Electronics",
  },
  {
    month: "Aug",
    revenue: 58000,
    units: 155,
    region: "West",
    category: "Clothing",
  },
  {
    month: "Sep",
    revenue: 72000,
    units: 195,
    region: "North",
    category: "Electronics",
  },
  {
    month: "Oct",
    revenue: 49000,
    units: 125,
    region: "South",
    category: "Home",
  },
  {
    month: "Nov",
    revenue: 81000,
    units: 220,
    region: "East",
    category: "Electronics",
  },
  {
    month: "Dec",
    revenue: 94000,
    units: 250,
    region: "West",
    category: "Electronics",
  },
];

const productsData: Product[] = [
  {
    name: "Laptop Pro X1",
    sales: 450,
    revenue: 675000,
    category: "Electronics",
  },
  {
    name: "Wireless Earbuds Ultra",
    sales: 1200,
    revenue: 180000,
    category: "Electronics",
  },
  {
    name: "Smart Watch Series 5",
    sales: 680,
    revenue: 340000,
    category: "Electronics",
  },
  {
    name: "Gaming Mouse Elite",
    sales: 890,
    revenue: 62300,
    category: "Electronics",
  },
  {
    name: "4K Webcam Pro",
    sales: 420,
    revenue: 58800,
    category: "Electronics",
  },
  {
    name: "Office Chair Premium",
    sales: 320,
    revenue: 48000,
    category: "Furniture",
  },
  { name: "Standing Desk", sales: 150, revenue: 37500, category: "Furniture" },
  {
    name: "Coffee Maker Pro",
    sales: 540,
    revenue: 27000,
    category: "Appliances",
  },
  { name: "Air Purifier", sales: 380, revenue: 57000, category: "Appliances" },
  {
    name: "Ergonomic Keyboard",
    sales: 290,
    revenue: 43500,
    category: "Electronics",
  },
];

const userData: UserData[] = [
  { month: "Jan", users: 10000, active: 6500, segment: "Free" },
  { month: "Feb", users: 10500, active: 6800, segment: "Free" },
  { month: "Mar", users: 11000, active: 7200, segment: "Premium" },
  { month: "Apr", users: 11500, active: 7500, segment: "Premium" },
  { month: "May", users: 12000, active: 7800, segment: "Free" },
  { month: "Jun", users: 12500, active: 8100, segment: "Premium" },
  { month: "Jul", users: 13200, active: 8500, segment: "Enterprise" },
  { month: "Aug", users: 13800, active: 8900, segment: "Enterprise" },
  { month: "Sep", users: 14500, active: 9400, segment: "Premium" },
  { month: "Oct", users: 15200, active: 9800, segment: "Free" },
  { month: "Nov", users: 16000, active: 10300, segment: "Premium" },
  { month: "Dec", users: 16800, active: 10800, segment: "Enterprise" },
];

const kpiData: KPI[] = [
  { name: "Monthly Revenue", value: 2450000, unit: "$", category: "Financial" },
  { name: "Total Customers", value: 16800, unit: "users", category: "Growth" },
  { name: "Growth Rate", value: 15.3, unit: "%", category: "Growth" },
  {
    name: "Customer Satisfaction",
    value: 4.2,
    unit: "/5",
    category: "Quality",
  },
  {
    name: "Monthly Recurring Revenue",
    value: 185000,
    unit: "$",
    category: "Financial",
  },
  { name: "Churn Rate", value: 2.1, unit: "%", category: "Retention" },
  { name: "Average Order Value", value: 145, unit: "$", category: "Financial" },
  { name: "Conversion Rate", value: 3.8, unit: "%", category: "Marketing" },
  {
    name: "Customer Lifetime Value",
    value: 4500,
    unit: "$",
    category: "Financial",
  },
  {
    name: "Net Promoter Score",
    value: 72,
    unit: "points",
    category: "Quality",
  },
];

export const getSalesData = async (params?: {
  region?: string;
  category?: string;
}): Promise<SalesRecord[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  let data = [...salesData];

  if (params?.region) {
    data = data.filter(
      (item) =>
        item.region.toLocaleLowerCase() === params.region!.toLocaleLowerCase(),
    );
  }

  if (params?.category) {
    data = data.filter(
      (item) =>
        item.category.toLocaleLowerCase() ===
        params.category!.toLocaleLowerCase(),
    );
  }

  return data;
};

export const getProducts = async (params?: {
  category?: string;
}): Promise<Product[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  let data = [...productsData];

  if (params?.category) {
    data = data.filter(
      (item) =>
        item.category.toLocaleLowerCase() ===
        params.category!.toLocaleLowerCase(),
    );
  }

  return data;
};

export const getUserData = async (params?: {
  segment?: string;
}): Promise<UserData[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  let data = [...userData];

  if (params?.segment) {
    data = data.filter(
      (item) =>
        item.segment.toLocaleLowerCase() ===
        params.segment!.toLocaleLowerCase(),
    );
  }

  return data;
};

export const getKPIs = async (params?: {
  category?: string;
}): Promise<KPI[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  let data = [...kpiData];

  if (params?.category) {
    data = data.filter(
      (item) =>
        item.category.toLocaleLowerCase() ===
        params.category!.toLocaleLowerCase(),
    );
  }

  return data;
};
