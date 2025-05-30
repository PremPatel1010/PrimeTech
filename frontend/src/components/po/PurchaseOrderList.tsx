import React, { useState } from 'react';
import { usePOStore } from '../../services/poStore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Package, Pencil, Trash2 } from 'lucide-react';
import { PODetailModal } from './PODetailModal';
import { CreateGRNModal } from './CreateGRNModal';
import { EditPOModal } from './EditPOModal';
import { formatDate, formatCurrency } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export interface PurchaseOrderListProps {
    onSelectPO?: (po: any) => void;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ onSelectPO }) => {
    const { purchaseOrders, isLoading, deletePurchaseOrder } = usePOStore();
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleViewDetails = (po: any) => {
        setSelectedPO(po);
        setIsDetailModalOpen(true);
        onSelectPO?.(po);
    };

    const handleCreateGRN = (po: any) => {
        setSelectedPO(po);
        setIsGRNModalOpen(true);
    };

    const handleEdit = (po: any) => {
        setSelectedPO(po);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (po: any) => {
        try {
            await deletePurchaseOrder(po.id);
            toast.success('Purchase order deleted successfully');
        } catch (error) {
            toast.error('Failed to delete purchase order');
            console.error('Error deleting PO:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            ordered: { variant: 'default', label: 'Ordered' },
            arrived: { variant: 'secondary', label: 'Arrived' },
            grn_verified: { variant: 'secondary', label: 'GRN Verified' },
            qc_in_progress: { variant: 'secondary', label: 'QC In Progress' },
            returned_to_vendor: { variant: 'destructive', label: 'Returned' },
            completed: { variant: 'outline', label: 'Completed' }
        };

        const config = statusConfig[status] || { variant: 'default', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.map((po) => (
                                <TableRow key={po.id}>
                                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                                    <TableCell>{formatDate(po.date)}</TableCell>
                                    <TableCell>{po.supplier}</TableCell>
                                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDetails(po)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {po.status === 'arrived' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCreateGRN(po)}
                                            >
                                                <Package className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(po)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the purchase order
                                                        and all associated data.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(po)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedPO && (
                <>
                    <PODetailModal
                        po={selectedPO}
                        isOpen={isDetailModalOpen}
                        onClose={() => setIsDetailModalOpen(false)}
                    />
                    <CreateGRNModal
                        po={selectedPO}
                        isOpen={isGRNModalOpen}
                        onClose={() => setIsGRNModalOpen(false)}
                    />
                    <EditPOModal
                        po={selectedPO}
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                    />
                </>
            )}
        </>
    );
};

export default PurchaseOrderList;