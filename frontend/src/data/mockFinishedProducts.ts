
import { FinishedProduct } from '../types';

export const finishedProductsMock: FinishedProduct[] = [
  { 
    id: 'fp-1', 
    name: 'Solar Water Pump 1HP', 
    category: 'Pumps', 
    quantity: 15, 
    price: 499.99, 
    lastUpdated: '2025-04-25',
    billOfMaterials: [
      { materialId: 'rm-1', materialName: 'Steel Sheets', quantityRequired: 2, unitOfMeasure: 'sheets' },
      { materialId: 'rm-3', materialName: 'Copper Wire', quantityRequired: 1, unitOfMeasure: 'rolls' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityRequired: 1, unitOfMeasure: 'pcs' }
    ],
    manufacturingSteps: [
      { id: 'step-1', name: 'Frame Assembly', order: 1 },
      { id: 'step-2', name: 'Motor Installation', order: 2 },
      { id: 'step-3', name: 'Controller Integration', order: 3 },
      { id: 'step-4', name: 'Testing', order: 4 }
    ]
  },
  { 
    id: 'fp-2', 
    name: 'Solar Pump Controller Basic', 
    category: 'Controllers', 
    quantity: 25, 
    price: 299.50, 
    lastUpdated: '2025-04-28',
    billOfMaterials: [
      { materialId: 'rm-2', materialName: 'Aluminum Rods', quantityRequired: 1, unitOfMeasure: 'kg' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityRequired: 1, unitOfMeasure: 'pcs' },
      { materialId: 'rm-5', materialName: 'Relay Modules', quantityRequired: 2, unitOfMeasure: 'pcs' }
    ],
    manufacturingSteps: [
      { id: 'step-1', name: 'PCB Assembly', order: 1 },
      { id: 'step-2', name: 'Housing Installation', order: 2 },
      { id: 'step-3', name: 'Programming', order: 3 },
      { id: 'step-4', name: 'Testing', order: 4 }
    ]
  },
  { 
    id: 'fp-3', 
    name: 'Solar Pump Controller Pro', 
    category: 'Controllers', 
    quantity: 10, 
    price: 599.99, 
    lastUpdated: '2025-04-28',
    billOfMaterials: [
      { materialId: 'rm-2', materialName: 'Aluminum Rods', quantityRequired: 2, unitOfMeasure: 'kg' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityRequired: 2, unitOfMeasure: 'pcs' },
      { materialId: 'rm-5', materialName: 'Relay Modules', quantityRequired: 4, unitOfMeasure: 'pcs' }
    ],
    manufacturingSteps: [
      { id: 'step-1', name: 'PCB Assembly', order: 1 },
      { id: 'step-2', name: 'Housing Installation', order: 2 },
      { id: 'step-3', name: 'Advanced Programming', order: 3 },
      { id: 'step-4', name: 'Quality Testing', order: 4 }
    ]
  }
];
