import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../utils/calculations';
import { purchaseOrderService, PurchaseOrder as PurchaseOrderBase, PurchaseMaterial } from '../services/purchaseOrderService';
import { Plus, FileText, Upload, Search, Download, Filter, ChevronDown, ChevronUp, CheckCircle, Circle, Loader2, Truck, ShieldCheck, RefreshCw, Undo2, Archive, CheckCheck } from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { rawMaterialService } from '../services/rawMaterial.service';
import { toast } from '@/hooks/use-toast';
import axiosInstance from '@/utils/axios';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import GRNViewModal from '../components/purchase/GRNViewModal';
import GRNForm from '../components/purchase/GRNForm';

const STATUS_FLOW = [
  'ordered',
  'arrived',
  'grn_verified',
  'qc_in_progress',
  'returned_to_vendor',
  'in_store',
  'completed'
];

function allowedNextStages(current: string) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return [];
  if (current === 'qc_in_progress') return ['returned_to_vendor', 'in_store'];
  return [STATUS_FLOW[idx + 1]];
}

const STATUS_LABELS: Record<string, string> = {
  ordered: 'Ordered',
  arrived: 'Arrived',
  grn_verified: 'GRN Verified',
  qc_in_progress: 'QC In Progress',
  returned_to_vendor: 'Returned',
  in_store: 'In Store',
  completed: 'Completed',
};
const STATUS_COLORS: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-800',
  arrived: 'bg-green-100 text-green-800',
  grn_verified: 'bg-yellow-100 text-yellow-800',
  qc_in_progress: 'bg-orange-100 text-orange-800',
  returned_to_vendor: 'bg-red-100 text-red-800',
  in_store: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-200 text-green-900',
};

const STATUS_STEPS = [
  { key: 'ordered', label: 'Ordered', icon: FileText },
  { key: 'arrived', label: 'Arrived', icon: Truck },
  { key: 'grn_verified', label: 'GRN Verified', icon: ShieldCheck },
  { key: 'qc_in_progress', label: 'QC In Progress', icon: RefreshCw },
  { key: 'returned_to_vendor', label: 'Returned', icon: Undo2 },
  { key: 'in_store', label: 'In Store', icon: Archive },
  { key: 'completed', label: 'Completed', icon: CheckCheck },
];

function StatusStepperModern({ current }: { current: string }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === current);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between gap-0 px-1 py-2">
        {STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center min-w-[60px] relative group">
              {/* Connector line */}
              {idx > 0 && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 z-0
                  ${isCompleted ? 'bg-green-400' : isCurrent ? 'bg-blue-200' : 'bg-gray-200'}
                `} style={{ zIndex: 0, width: '100%', left: '-50%', right: 0 }} />
              )}
              {/* Step icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shadow transition-all duration-300
                  ${isCompleted ? 'bg-green-400 border-green-400 text-white' :
                    isCurrent ? 'bg-blue-600 border-blue-600 text-white' :
                      'bg-white border-gray-300 text-gray-300'}
                `}
                title={step.label}
              >
                <Icon className="w-4 h-4" />
              </div>
              {/* Step label */}
              <span className={`mt-1 text-[10px] font-medium text-center whitespace-nowrap
                ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressSummaryModern({ progress }: { progress: any }) {
  const metrics = [
    { label: 'Ordered', value: progress.ordered, color: 'bg-blue-50 text-blue-700' },
    { label: 'Received', value: progress.received, color: 'bg-green-50 text-green-700' },
    { label: 'QC Passed', value: progress.qc_passed, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Defective', value: progress.defective, color: 'bg-red-50 text-red-700' },
    { label: 'Pending', value: progress.pending, color: 'bg-gray-50 text-gray-700' },
  ];
  return (
    <div className="flex flex-wrap gap-2 justify-center my-2">
      {metrics.map(m => (
        <div key={m.label} className={`rounded-full px-3 py-1 font-medium text-xs shadow-sm ${m.color}`}>{m.label}: {m.value}</div>
      ))}
    </div>
  );
}

function StatusTimelineModern({ logs }: { logs: any[] }) {
  return (
    <div className="mt-4">
      <h4 className="font-semibold text-gray-700 mb-2">Status Timeline</h4>
      <ul className="space-y-3">
        {logs.map(log => (
          <li key={log.log_id} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 text-center">
              <span className={`inline-block w-2 h-2 rounded-full mt-2 ${log.status === 'completed' ? 'bg-green-500' : log.status === 'ordered' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm capitalize">{log.status.replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400">{log.changed_by_name || 'System'}</span>
                <span className="text-xs text-gray-400">@ {formatDate(log.created_at)}</span>
              </div>
              {log.notes && <div className="text-xs text-gray-500 mt-1">{log.notes}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type PurchaseOrder = PurchaseOrderBase & { grns?: any[] };

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  type NewPurchaseOrder = Omit<PurchaseOrder, 'purchase_order_id'> & { supplier_name?: string };
  const [newOrder, setNewOrder] = useState<NewPurchaseOrder>({
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    supplier_id: 0,
    status: 'ordered',
    discount: 0,
    gst: 18,
    total_amount: 0,
    materials: [],
    supplier_name: ''
  });
  const [newMaterial, setNewMaterial] = useState<PurchaseMaterial>({
    material_id: 0,
    quantity: 1,
    unit: 'pcs',
    unit_price: 0
  });
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const ORDERS_PER_PAGE = 5;
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showGRNModal, setShowGRNModal] = useState<number|null>(null);
  const [showQCModal, setShowQCModal] = useState<number|null>(null);
  const [grnForm, setGrnForm] = useState<{
    received_quantity: string;
    grn_date: string;
    matched_with_po: boolean;
    defective_quantity?: string;
    remarks?: string;
  }>({ 
    received_quantity: '', 
    grn_date: new Date().toISOString().split('T')[0], 
    matched_with_po: false 
  });
  const [qcForm, setQcForm] = useState({ grn_id: '', material_id: '', inspected_quantity: '', defective_quantity: '', accepted_quantity: '', remarks: '' });
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState<number|null>(null);
  const [viewGRN, setViewGRN] = useState(null);
  const [isGRNFormOpen, setIsGRNFormOpen] = useState(false);
  const [grnFormOrderId, setGrnFormOrderId] = useState<number|null>(null);

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadRawMaterials();
  }, []);

  const loadPurchaseOrders = async () => {
    const data = await purchaseOrderService.getAll();
    setPurchaseOrders(data);
  };

  const loadSuppliers = async () => {
    const data = await supplierService.getAllSuppliers();
    setSuppliers(data);
  };

  const loadRawMaterials = async () => {
    const data = await rawMaterialService.getAllRawMaterials();
    
    setRawMaterials(data);
  };

  const handleSupplierChange = (supplierId: string) => {
    setNewOrder({
      ...newOrder,
      supplier_id: Number(supplierId)
    });
  };

  const handleMaterialSelect = (materialId: string) => {
    const id = parseInt(materialId, 10);
    const material = rawMaterials.find(m => Number(m.material_id) === id);
    if (material) {
      setNewMaterial({
        material_id: id,
        material_name: material.material_name,
        quantity: 1,
        unit: material.unit,
        unit_price: material.unit_price || 0
      });
    }
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearchTerm = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearchTerm && matchesStatus;
  });

  const paginatedOrders = filteredOrders.slice((activePage - 1) * ORDERS_PER_PAGE, activePage * ORDERS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const handleAddMaterial = () => {
    if (newMaterial.material_id && newMaterial.quantity && newMaterial.unit_price) {
      const material: PurchaseMaterial = {
        material_id: newMaterial.material_id,
        material_name: newMaterial.material_name,
        quantity: newMaterial.quantity,
        unit: newMaterial.unit,
        unit_price: newMaterial.unit_price
      };
      const updatedMaterials = [...(newOrder.materials || []), material];
      setNewOrder({
        ...newOrder,
        materials: updatedMaterials
      });
      setNewMaterial({
        material_id: 0,
        material_name: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0
      });
    }
  };

  const handleRemoveMaterial = (index: number) => {
    const updatedMaterials = [...(newOrder.materials || [])];
    updatedMaterials.splice(index, 1);
    setNewOrder({
      ...newOrder,
      materials: updatedMaterials
    });
  };

  const handleCreateOrder = async () => {
    console.log('handleCreateOrder called');
    const subtotal = (newOrder.materials || []).reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
    const discountAmount = subtotal * (Number(newOrder.discount) / 100);
    const gstAmount = (subtotal - discountAmount) * (Number(newOrder.gst) / 100);
    const calculatedFinal = subtotal - discountAmount + gstAmount;
    const finalPrice = newOrder.total_amount && newOrder.total_amount !== calculatedFinal ? newOrder.total_amount : calculatedFinal;
    console.log('Debug values:', {
      order_date: newOrder.order_date,
      supplier_id: newOrder.supplier_id,
      materials: newOrder.materials,
      finalPrice,
      order_number: newOrder.order_number
    });
    if (
      newOrder.order_date &&
      newOrder.supplier_id &&
      newOrder.materials &&
      newOrder.materials.length > 0 &&
      finalPrice > 0 &&
      newOrder.order_number
    ) {
      const postBody = { ...newOrder, total_amount: finalPrice, materials: newOrder.materials };
      console.log('Sending POST body:', postBody);
      await purchaseOrderService.create(postBody);
      setIsDialogOpen(false);
      resetNewOrder();
      loadPurchaseOrders();
    }
  };

  const resetNewOrder = () => {
    setNewOrder({
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      supplier_id: 0,
      status: 'ordered',
      discount: 0,
      gst: 18,
      total_amount: 0,
      materials: [],
      supplier_name: ''
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'arrived': return 'bg-green-100 text-green-800';
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'grn_verified': return 'bg-yellow-100 text-yellow-800';
      case 'qc_in_progress': return 'bg-orange-100 text-orange-800';
      case 'returned_to_vendor': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-200 text-green-900';
      case 'in_store': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-200 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditClick = (order: PurchaseOrder) => {
    setEditOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (editOrder) {
      await purchaseOrderService.update(editOrder.purchase_order_id, editOrder);
      setIsEditDialogOpen(false);
      setEditOrder(null);
      loadPurchaseOrders();
      toast({ title: 'Purchase order updated successfully' });
    }
  };

  const handleDeleteClick = (orderId: number) => {
    setDeleteOrderId(orderId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteOrderId !== null) {
      await purchaseOrderService.delete(deleteOrderId);
      setDeleteOrderId(null);
      loadPurchaseOrders();
      toast({ title: 'Purchase order deleted successfully' });
    }
  };

  const handleStatusChange = async (order: PurchaseOrder, newStatus: string) => {
    if (!order.purchase_order_id) {
      toast({ 
        title: 'Error',
        description: 'Invalid purchase order ID',
        variant: 'destructive'
      });
      return;
    }

    setStatusLoading(order.purchase_order_id);
    try {
      const response = await axiosInstance.put(`/purchase-orders/${order.purchase_order_id}/status`, { 
        status: newStatus,
        notes: `Status changed to ${STATUS_LABELS[newStatus]}`
      });

      if (response.data.success) {
        await loadPurchaseOrders();
        try {
          await fetchStatusLogs(order.purchase_order_id);
          await fetchProgressSummary(order.purchase_order_id);
        } catch (e) {
          console.warn('Could not fetch updated order details:', e);
        }
        
        toast({ 
          title: 'Status Updated',
          description: `Order ${order.order_number} status changed to ${STATUS_LABELS[newStatus]}`,
          variant: 'default'
        });
      }
    } catch (e: any) {
      console.error('Status update error:', e);
      const errorMessage = e?.response?.data?.error || 'Could not update status. Please try again.';
      toast({ 
        title: 'Status Update Failed', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleOpenDialog = async () => {
    try {
      const res = await axiosInstance.get('/purchase-orders/next-number');
      console.log('Next order number:', res.data);
      setNewOrder((prev) => ({ ...prev, order_number: res.data.nextOrderNumber }));
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching next order number:', error);
    }
  };

  const subtotal = (newOrder.materials || []).reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
  const discountAmount = subtotal * (Number(newOrder.discount) / 100);
  const gstAmount = (subtotal - discountAmount) * (Number(newOrder.gst) / 100);
  const calculatedFinal = subtotal - discountAmount + gstAmount;
  const finalPrice = newOrder.total_amount && newOrder.total_amount !== calculatedFinal ? newOrder.total_amount : calculatedFinal;

  // Helper to get supplier name by id
  const getSupplierName = (id: number) => {
    const supplier = suppliers.find(s => s.supplier_id === id);
    return supplier ? supplier.supplier_name : `Supplier: ${id}`;
  };

  // Helper to get total for a purchase order
  const getOrderTotal = (order: PurchaseOrder) => {
    if (!order.materials || !Array.isArray(order.materials)) return 0;
    return order.materials.reduce((sum, m) => sum + (Number(m.quantity) * Number(m.unit_price)), 0);
  };

  const fetchStatusLogs = async (poId: number) => {
    if (!poId) return;
    try {
      const res = await axiosInstance.get(`/purchase-orders/${poId}/status-history`);
      setStatusLogs(res.data);
    } catch (e) {
      console.warn('Could not fetch status logs:', e);
    }
  };
  const fetchProgressSummary = async (poId: number) => {
    if (!poId) return;
    try {
      const res = await axiosInstance.get(`/purchase-orders/${poId}/quantities`);
      setProgressSummary(res.data);
    } catch (e) {
      console.warn('Could not fetch progress summary:', e);
    }
  };

  const handleOpenGRNModal = (orderId: number) => {
    setGrnFormOrderId(orderId);
    setIsGRNFormOpen(true);
  };
  const handleViewGRN = (grn) => {
    setViewGRN(grn);
  };
  const handleCreateGRN = async (orderId: number) => {
    try {
      const response = await axiosInstance.post(`/purchase-orders/${orderId}/grn`, {
        purchase_order_id: orderId,
        received_quantity: Number(grnForm.received_quantity),
        defective_quantity: Number(grnForm.defective_quantity || 0),
        grn_date: grnForm.grn_date,
        matched_with_po: grnForm.matched_with_po,
        remarks: grnForm.remarks || ''
      });
      setShowGRNModal(null);
      loadPurchaseOrders();
      const grn = response.data;
      if (grn.pending > 0) {
        toast({
          title: 'Partial Receipt',
          description: `Only ${grn.totalReceived} of ${grn.totalOrdered} items received. ${grn.pending} pending.`,
          variant: 'default',
          action: (
            <Button size="sm" onClick={() => handleContinueWithPartial(orderId)}>
              Continue Process for Received
            </Button>
          )
        });
      } else {
        toast({ 
          title: 'GRN Created',
          description: 'Goods receipt note has been created successfully.'
        });
      }
    } catch (error) {
      toast({ 
        title: 'Error Creating GRN',
        description: error?.response?.data?.error || 'Could not create GRN. Please try again.',
        variant: 'destructive'
      });
    }
  };
  const handleContinueWithPartial = async (orderId: number) => {
    // Optionally, move to next stage for received goods only
    await axiosInstance.put(`/purchase-orders/${orderId}/status`, { status: 'grn_verified', notes: 'Continue process for received goods' });
    loadPurchaseOrders();
    toast({ title: 'Process continued for received goods' });
  };
  const handleOpenQCModal = (grnId: number) => {
    setShowQCModal(grnId);
    setQcForm({ grn_id: grnId.toString(), material_id: '', inspected_quantity: '', defective_quantity: '', accepted_quantity: '', remarks: '' });
  };
  const handleCreateQC = async () => {
    await axiosInstance.post('/qc-report', {
      grn_id: Number(qcForm.grn_id),
      material_id: Number(qcForm.material_id),
      inspected_quantity: Number(qcForm.inspected_quantity),
      defective_quantity: Number(qcForm.defective_quantity),
      accepted_quantity: Number(qcForm.accepted_quantity),
      remarks: qcForm.remarks
    });
    setShowQCModal(null);
    loadPurchaseOrders();
    toast({ title: 'QC Report submitted' });
  };

  const handleDownloadGRN = async (grn) => {
    try {
      const response = await axiosInstance.get(`/purchase-orders/${grn.purchase_order_id}/grn/${grn.grn_id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GRN-${grn.grn_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ 
        title: 'Download Started',
        description: 'Your GRN PDF is being downloaded'
      });
    } catch (error) {
      toast({ 
        title: 'Download Failed',
        description: 'Could not download GRN PDF. Please try again.',
        variant: 'destructive'
      });
    }
  };
  const handleVerifyGRN = async (grn) => {
    try {
      await axiosInstance.put(`/purchase-orders/${grn.purchase_order_id}/grn/${grn.grn_id}/verify`);
      toast({ title: 'GRN Verified', description: `GRN #${grn.grn_id} marked as verified.` });
      loadPurchaseOrders();
    } catch (e) {
      toast({ title: 'Verification Failed', description: e?.response?.data?.error || 'Could not verify GRN', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Purchase Orders</h1>
        <Button 
          onClick={handleOpenDialog}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by order number..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Purchase Orders List */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map(order => (
                <AccordionItem key={order.purchase_order_id} value={String(order.purchase_order_id)} className="mb-4 bg-white rounded-xl shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow">
                  <AccordionTrigger>
                    <div className="flex flex-col sm:flex-row w-full items-stretch px-4 py-4 group gap-2 sm:gap-0">
                      {/* Left: Order number and supplier */}
                      <div className="flex flex-col flex-1 min-w-0 sm:pr-10 justify-center">
                        <span className="font-bold text-lg text-factory-primary underline cursor-pointer group-hover:text-factory-primary-dark transition-colors truncate">
                          {order.order_number || <span className='text-gray-400 italic'>No Order #</span>}
                        </span>
                        <span className="text-xs text-gray-500 font-mono tracking-wide truncate mt-1">
                          {getSupplierName(order.supplier_id)}
                        </span>
                      </div>
                      {/* Divider for desktop */}
                      <div className="hidden sm:block w-px bg-gray-200 mx-6"></div>
                      {/* Right: Date, Status, Total */}
                      <div className="flex flex-row flex-wrap sm:flex-nowrap gap-x-8 gap-y-2 items-center justify-start w-full sm:w-auto mt-2 sm:mt-0 text-left">
                        <span className="text-sm text-gray-700"><b>Date:</b> {order.order_date ? formatDate(order.order_date) : <span className='text-gray-400'>-</span>}</span>
                        <span className="text-sm"><b>Status:</b> <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>{order.status}</span></span>
                        <span className="text-lg font-bold text-factory-primary ml-0 sm:ml-2">{formatCurrency(getOrderTotal(order))}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="p-4 sm:p-6 bg-white rounded-xl shadow-lg border border-factory-gray-100 mb-4">
                      {/* Modern Status Stepper (only once, compact) */}
                      <StatusStepperModern current={order.status} />
                      {/* Status update dropdown (modern, compact, SaaS-style) */}
                      <div className="flex justify-center mb-4">
                        <Select value={order.status} onValueChange={val => handleStatusChange(order, val)} disabled={!!statusLoading}>
                          <SelectTrigger className="w-[200px] h-10 text-base font-medium border border-gray-200 shadow-sm rounded-full bg-white focus:ring-2 focus:ring-blue-100">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[order.status]}`}></span>
                              <span>{STATUS_LABELS[order.status]}</span>
                              {statusLoading === order.purchase_order_id && (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin text-factory-primary" />
                              )}
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border border-gray-100 bg-white p-2 max-h-[300px]">
                            {STATUS_FLOW.map(stage => (
                              <SelectItem
                                key={stage}
                                value={stage}
                                disabled={
                                  stage === order.status ||
                                  (allowedNextStages(order.status).indexOf(stage) === -1 && stage !== order.status)
                                }
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-150
                                  ${stage === order.status ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50'}
                                  ${stage === order.status ? 'cursor-default' : 'cursor-pointer'}
                                `}
                              >
                                <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[stage]}`}></span>
                                <span className="flex-1">{STATUS_LABELS[stage]}</span>
                                {stage === order.status && (
                                  <CheckCircle className="w-4 h-4 text-blue-500" />
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Progress Summary (only once, compact) */}
                      <ProgressSummaryModern progress={progressSummary || { ordered: 0, received: 0, qc_passed: 0, defective: 0, pending: 0 }} />
                      {/* Status Timeline (only once, above materials) */}
                      <StatusTimelineModern logs={statusLogs} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-factory-gray-500">Supplier ID</p>
                          <p className="font-medium">{order.supplier_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-factory-gray-500">Order Date</p>
                          <p className="font-medium">{formatDate(order.order_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-factory-gray-500">Status</p>
                          <p className="font-medium">{order.status}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Materials</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(order.materials || []).map((material, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {material.material_id}
                                    {material.material_name ? ` - ${material.material_name}` : ''}
                                  </TableCell>
                                  <TableCell>{material.quantity}</TableCell>
                                  <TableCell>{material.unit}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(material.unit_price)}</TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      {['arrived', 'grn_verified', 'qc_in_progress', 'returned_to_vendor', 'in_store', 'completed'].includes(order.status) && (
                        <div className="mt-6 border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-lg">Goods Receipt Notes (GRN)</h4>
                            {order.status === 'arrived' && order.materials.reduce((sum, m) => sum + (m.quantity || 0), 0) > (order.grns ? order.grns.reduce((sum, g) => sum + (g.received_quantity || 0), 0) : 0) && (
                              <Button onClick={() => handleOpenGRNModal(order.purchase_order_id)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create GRN
                              </Button>
                            )}
                          </div>

                          {/* GRN Summary Card */}
                          {order.grns && order.grns.length > 0 && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                              <h5 className="font-medium mb-3 text-gray-700">GRN Summary</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <span className="text-sm text-blue-600">Ordered</span>
                                  <p className="text-xl font-bold text-blue-700">{order.materials.reduce((sum, m) => sum + (m.quantity || 0), 0)}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <span className="text-sm text-green-600">Received</span>
                                  <p className="text-xl font-bold text-green-700">{order.grns.reduce((sum, g) => sum + (g.received_quantity || 0), 0)}</p>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                  <span className="text-sm text-yellow-600">Pending</span>
                                  <p className="text-xl font-bold text-yellow-700">
                                    {Math.max(order.materials.reduce((sum, m) => sum + (m.quantity || 0), 0) - order.grns.reduce((sum, g) => sum + (g.received_quantity || 0), 0), 0)}
                                  </p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg">
                                  <span className="text-sm text-red-600">Defective</span>
                                  <p className="text-xl font-bold text-red-700">
                                    {order.grns.reduce((sum, g) => sum + (g.defective_quantity || 0), 0)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* GRN Table */}
                          {order.grns && order.grns.length > 0 && (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>GRN #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Received Qty</TableHead>
                                    <TableHead>Defective Qty</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.grns.map((grn, idx) => (
                                    <TableRow key={grn.grn_id || idx}>
                                      <TableCell className="font-medium">#{grn.grn_id}</TableCell>
                                      <TableCell>{formatDate(grn.grn_date)}</TableCell>
                                      <TableCell>
                                        <span className="font-medium text-green-600">{grn.received_quantity}</span>
                                      </TableCell>
                                      <TableCell>
                                        <span className="font-medium text-red-600">{grn.defective_quantity || 0}</span>
                                      </TableCell>
                                      <TableCell>
                                        {grn.verified ? (
                                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                                        ) : (
                                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleViewGRN(grn)}
                                            className="flex items-center gap-1"
                                          >
                                            <FileText className="w-4 h-4" />
                                            View
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleDownloadGRN(grn)}
                                            className="flex items-center gap-1"
                                          >
                                            <Download className="w-4 h-4" />
                                            Download
                                          </Button>
                                          {!grn.verified && (
                                            <Button 
                                              size="sm" 
                                              variant="default" 
                                              onClick={() => handleVerifyGRN(grn)}
                                              className="flex items-center gap-1"
                                            >
                                              <CheckCircle className="w-4 h-4" />
                                              Verify
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="pt-2 flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(order)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(order.purchase_order_id)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <FileText className="h-12 w-12 mx-auto mb-4 text-factory-gray-300" />
                <p className="text-factory-gray-500">No purchase orders found.</p>
                <p className="text-sm text-factory-gray-400 mt-1">Create a new purchase order to get started.</p>
              </div>
            )}
          </Accordion>
        </div>
      </div>
      {/* Pagination UI at bottom */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            className={`px-3 py-1 rounded border ${activePage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
            onClick={() => activePage > 1 && setActivePage(activePage - 1)}
            disabled={activePage === 1}
            aria-label="Previous Page"
          >
            &#60;
          </button>
          <span className="px-2 py-1 text-sm text-gray-700">{activePage} <span className="mx-1">of</span> {totalPages}</span>
          <button
            className={`px-3 py-1 rounded border ${activePage === totalPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
            onClick={() => activePage < totalPages && setActivePage(activePage + 1)}
            disabled={activePage === totalPages}
            aria-label="Next Page"
          >
            &#62;
          </button>
        </div>
      )}
      {/* Create Purchase Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="date">Order Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={newOrder.order_date} 
                onChange={(e) => setNewOrder({...newOrder, order_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={handleSupplierChange}
                  value={String(newOrder.supplier_id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      supplier.supplier_id !== undefined && supplier.supplier_id !== null ? (
                        <SelectItem key={supplier.supplier_id} value={String(supplier.supplier_id)}>
                          {supplier.supplier_name}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter new supplier"
                  value={newOrder.supplier_name || ''}
                  onChange={e => setNewOrder({ ...newOrder, supplier_name: e.target.value })}
                />
              </div>
            </div>
            {/* Material section */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-lg font-medium mb-4">Add Materials</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="materialSelect">Select from Inventory</Label>
                  <Select
                    onValueChange={handleMaterialSelect}
                    value={newMaterial.material_id.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(material => (
                        material.material_id !== undefined && material.material_id !== null ? (
                          <SelectItem key={material.material_id} value={String(material.material_id)}>
                            {material.material_name} ({material.unit})
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      min="1" 
                      value={newMaterial.quantity} 
                      onChange={(e) => setNewMaterial({
                        ...newMaterial, 
                        quantity: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input 
                      id="unit" 
                      value={newMaterial.unit} 
                      onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      placeholder="e.g., kg, pcs, m"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerUnit">Price per Unit</Label>
                    <Input 
                      id="pricePerUnit" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={newMaterial.unit_price} 
                      onChange={(e) => setNewMaterial({
                        ...newMaterial, 
                        unit_price: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={handleAddMaterial}
                  disabled={
                    !newMaterial.material_id || 
                    !newMaterial.quantity || 
                    !newMaterial.unit_price
                  }
                >
                  Add Material to Order
                </Button>
                {/* Material list */}
                {(newOrder.materials && newOrder.materials.length > 0) && (
                  <div className="mt-4 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material ID</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newOrder.materials.map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{material.material_id}</TableCell>
                            <TableCell>{material.quantity} {material.unit}</TableCell>
                            <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveMaterial(idx)}
                              >
                                <span className="sr-only">Remove</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M18 6 6 18"></path>
                                  <path d="m6 6 12 12"></path>
                                </svg>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                value={newOrder.discount}
                onChange={e => setNewOrder({ ...newOrder, discount: Number(e.target.value) })}
                className="mb-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST (%)</Label>
              <Input
                id="gst"
                type="number"
                value={newOrder.gst}
                onChange={e => setNewOrder({ ...newOrder, gst: Number(e.target.value) })}
                className="mb-4"
              />
            </div>
            {/* Pricing/Bill Section */}
            <div className="border rounded-md p-4 mt-2 bg-gray-50">
              <div className="flex justify-between mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>GST</span>
                <span>+{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 font-bold">
                <span>Final Price</span>
                <Input
                  type="number"
                  value={finalPrice}
                  onChange={e => setNewOrder({ ...newOrder, total_amount: Number(e.target.value) })}
                  className="w-32 text-right font-bold"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                resetNewOrder();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrder}
              disabled={
                !newOrder.order_date ||
                !newOrder.supplier_id ||
                !newOrder.materials ||
                newOrder.materials.length === 0 ||
                finalPrice <= 0
              }
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Purchase Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-number">Order Number</Label>
                  <Input id="edit-order-number" value={editOrder.order_number} onChange={e => setEditOrder({ ...editOrder, order_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-date">Order Date</Label>
                  <Input id="edit-order-date" type="date" value={editOrder.order_date} onChange={e => setEditOrder({ ...editOrder, order_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editOrder.status} onValueChange={val => setEditOrder({ ...editOrder, status: val })}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4 mt-2">
                <h3 className="text-lg font-medium mb-4">Edit Materials</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(editOrder.materials || []).map((material, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={material.material_name || ''}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], material_name: e.target.value };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={material.quantity}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={material.unit}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], unit: e.target.value };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={material.unit_price}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], unit_price: parseFloat(e.target.value) || 0 };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const updated = [...editOrder.materials];
                            updated.splice(idx, 1);
                            setEditOrder({ ...editOrder, materials: updated });
                          }}>
                            <span className="sr-only">Remove</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditOrder({
                      ...editOrder,
                      materials: [
                        ...editOrder.materials,
                        { material_id: 0, material_name: '', quantity: 1, unit: 'pcs', unit_price: 0 }
                      ]
                    });
                  }}
                >
                  Add Material
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-factory-primary hover:bg-factory-primary/90">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Purchase Order Confirmation Dialog */}
      <Dialog open={deleteOrderId !== null} onOpenChange={open => { if (!open) setDeleteOrderId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this purchase order?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrderId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* GRN Modal */}
      {isGRNFormOpen && grnFormOrderId && (
        <GRNForm
          isOpen={isGRNFormOpen}
          onClose={() => setIsGRNFormOpen(false)}
          purchaseOrder={purchaseOrders.find(o => o.purchase_order_id === grnFormOrderId)}
          onSuccess={() => {
            setIsGRNFormOpen(false);
            loadPurchaseOrders();
          }}
        />
      )}
      {viewGRN && (
        <GRNViewModal
          grn={viewGRN}
          onClose={() => setViewGRN(null)}
        />
      )}
      {/* QC Modal */}
      <Dialog open={!!showQCModal} onOpenChange={open => !open && setShowQCModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create QC Report</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input type="number" placeholder="Material ID" value={qcForm.material_id} onChange={e => setQcForm({ ...qcForm, material_id: e.target.value })} />
            <Input type="number" placeholder="Inspected Qty" value={qcForm.inspected_quantity} onChange={e => setQcForm({ ...qcForm, inspected_quantity: e.target.value })} />
            <Input type="number" placeholder="Defective Qty" value={qcForm.defective_quantity} onChange={e => setQcForm({ ...qcForm, defective_quantity: e.target.value })} />
            <Input type="number" placeholder="Accepted Qty" value={qcForm.accepted_quantity} onChange={e => setQcForm({ ...qcForm, accepted_quantity: e.target.value })} />
            <Input placeholder="Remarks" value={qcForm.remarks} onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateQC}>Submit</Button>
            <Button variant="outline" onClick={() => setShowQCModal(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
