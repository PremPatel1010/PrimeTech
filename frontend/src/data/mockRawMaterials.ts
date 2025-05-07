
import { RawMaterial } from '../types';

export const rawMaterialsMock: RawMaterial[] = [
  { 
    id: 'rm-1', 
    name: 'Steel Sheets', 
    unit: 'sheets', 
    quantity: 100, 
    pricePerUnit: 25.00, 
    lastUpdated: '2025-04-15',
   
  },
  { 
    id: 'rm-2', 
    name: 'Aluminum Rods', 
    unit: 'kg', 
    quantity: 50, 
    pricePerUnit: 15.00, 
    lastUpdated: '2025-04-15',
    
  },
  { 
    id: 'rm-3', 
    name: 'Copper Wire', 
    unit: 'rolls', 
    quantity: 75, 
    pricePerUnit: 18.50, 
    lastUpdated: '2025-04-18',

  },
  { 
    id: 'rm-4', 
    name: 'Microcontroller Boards', 
    unit: 'pcs', 
    quantity: 45, 
    pricePerUnit: 35.00, 
    lastUpdated: '2025-04-20',

  },
  { 
    id: 'rm-5', 
    name: 'Relay Modules', 
    unit: 'pcs', 
    quantity: 120, 
    pricePerUnit: 12.00, 
    lastUpdated: '2025-04-20',
    
  }
];
