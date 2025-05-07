
import { PurchaseOrder } from '../types';

export const purchaseOrdersMock: PurchaseOrder[] = [
  {
    id: "po-1",
    orderNumber: "PO-2025-001",
    date: "2025-04-15",
    supplierName: "MetalWorks Inc.",
    materials: [
      {
        materialId: "rm-1",
        materialName: "Steel Sheets",
        quantity: 100,
        unit: "sheets",
        pricePerUnit: 25
      },
      {
        materialId: "rm-2",
        materialName: "Aluminum Rods",
        quantity: 50,
        unit: "kg",
        pricePerUnit: 15
      }
    ],
    status: "arrived",
    totalValue: 3250,
    invoiceNumber: "INV-22501"
  },
  {
    id: "po-2",
    orderNumber: "PO-2025-002",
    date: "2025-04-22",
    supplierName: "CircuitTech",
    materials: [
      {
        materialId: "rm-4",
        materialName: "Microcontroller Boards",
        quantity: 50,
        unit: "pcs",
        pricePerUnit: 35
      },
      {
        materialId: "rm-5",
        materialName: "Relay Modules",
        quantity: 100,
        unit: "pcs",
        pricePerUnit: 12
      }
    ],
    status: "ordered",
    totalValue: 2950
  },
  {
    id: "po-3",
    orderNumber: "PO-2025-003",
    date: "2025-04-28",
    supplierName: "GlassWorks",
    materials: [
      {
        materialId: "rm-7",
        materialName: "Tempered Glass Panels",
        quantity: 30,
        unit: "pcs",
        pricePerUnit: 45
      }
    ],
    status: "cancelled",
    totalValue: 1350
  },
  {
    id: "po-4",
    orderNumber: "PO-2025-004",
    date: "2025-05-01",
    supplierName: "EcoPackaging",
    materials: [
      {
        materialId: "rm-10",
        materialName: "Cardboard Boxes (Medium)",
        quantity: 200,
        unit: "pcs",
        pricePerUnit: 2.5
      },
      {
        materialId: "rm-11",
        materialName: "Cardboard Boxes (Large)",
        quantity: 100,
        unit: "pcs",
        pricePerUnit: 4
      },
      {
        materialId: "rm-12",
        materialName: "Bubble Wrap",
        quantity: 20,
        unit: "rolls",
        pricePerUnit: 15
      }
    ],
    status: "ordered",
    totalValue: 1100
  }
];
