
import { ManufacturingBatch } from '../types';

export const manufacturingBatchesMock: ManufacturingBatch[] = [
  {
    id: 'mb-1',
    batchNumber: 'B-2025-001',
    productId: 'fp-1',
    productName: 'Solar Water Pump 1HP',
    quantity: 20,
    currentStage: 'assembly',
    startDate: '2025-04-15',
    estimatedCompletionDate: '2025-04-25',
    stageCompletionDates: {
      cutting: '2025-04-18',
      assembly: null,
      testing: null,
      packaging: null,
      completed: null
    },
    progress: 40,
    rawMaterialsUsed: [
      { materialId: 'rm-1', materialName: 'Steel Sheets', quantityUsed: 40, unit: 'sheets' },
      { materialId: 'rm-3', materialName: 'Copper Wire', quantityUsed: 20, unit: 'rolls' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityUsed: 20, unit: 'pcs' }
    ]
  },
  {
    id: 'mb-2',
    batchNumber: 'B-2025-002',
    productId: 'fp-2',
    productName: 'Solar Pump Controller Basic',
    quantity: 30,
    currentStage: 'testing',
    startDate: '2025-04-10',
    estimatedCompletionDate: '2025-04-20',
    stageCompletionDates: {
      cutting: '2025-04-12',
      assembly: '2025-04-16',
      testing: null,
      packaging: null,
      completed: null
    },
    progress: 70,
    rawMaterialsUsed: [
      { materialId: 'rm-2', materialName: 'Aluminum Rods', quantityUsed: 30, unit: 'kg' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityUsed: 30, unit: 'pcs' },
      { materialId: 'rm-5', materialName: 'Relay Modules', quantityUsed: 60, unit: 'pcs' }
    ]
  },
  {
    id: 'mb-3',
    batchNumber: 'B-2025-003',
    productId: 'fp-3',
    productName: 'Solar Pump Controller Pro',
    quantity: 15,
    currentStage: 'completed',
    startDate: '2025-04-05',
    estimatedCompletionDate: '2025-04-15',
    stageCompletionDates: {
      cutting: '2025-04-07',
      assembly: '2025-04-10',
      testing: '2025-04-12',
      packaging: '2025-04-14',
      completed: '2025-04-15'
    },
    progress: 100,
    rawMaterialsUsed: [
      { materialId: 'rm-2', materialName: 'Aluminum Rods', quantityUsed: 30, unit: 'kg' },
      { materialId: 'rm-4', materialName: 'Microcontroller Boards', quantityUsed: 30, unit: 'pcs' },
      { materialId: 'rm-5', materialName: 'Relay Modules', quantityUsed: 60, unit: 'pcs' }
    ]
  }
];
