import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, CheckCircle, RotateCcw, FileText } from "lucide-react";
import { CreateGRNModal } from "./CreateGRNModal";
import { QCModal } from "./QCModal";
import { PendingReplacementsCard } from "./PendingReplacementsCard";
import { usePOStore } from "@/services/poStore";
import { format } from "date-fns";

interface PODetailModalProps {
  po: any;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  ordered: { label: "Ordered", color: "bg-blue-100 text-blue-800" },
  arrived: { label: "Arrived", color: "bg-yellow-100 text-yellow-800" },
  grn_verified: {
    label: "GRN Verified",
    color: "bg-purple-100 text-purple-800",
  },
  qc_in_progress: {
    label: "QC In Progress",
    color: "bg-orange-100 text-orange-800",
  },
  returned_to_vendor: {
    label: "Returned to Vendor",
    color: "bg-red-100 text-red-800",
  },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
};

export const PODetailModal = ({ po, isOpen, onClose }: PODetailModalProps) => {
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const { updatePOStatus, getPendingQuantities, getPurchaseOrder } =
    usePOStore();
  // Local state for the latest PO details
  const [loadedPO, setLoadedPO] = useState(po);
  const [loading, setLoading] = useState(false);

  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, any>
  >({});
  const [fetchingPending, setFetchingPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getPurchaseOrder(po.id)
        .then((data) => setLoadedPO(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Use loadedPO for rendering
  const currentPO = loadedPO;

  // Fetch pending quantities whenever the modal is open or the current PO changes
  useEffect(() => {
    const fetchPending = async () => {
      if (isOpen && currentPO?.id) {
        setFetchingPending(true);
        try {
          const raw = await getPendingQuantities(currentPO.id);
          const quantities = Object.values(raw); // Convert object to array
          console.log("quantities", quantities);

          const replacementNeededQuantities = quantities
            .filter((item: any) => item.status === "needs_replacement")
            .map((item: any) => ({
              materialId: item.materialId,
              materialName: item.materialName,
              quantity: item.orderedQty,
              defectiveQty: item.defectiveQty,
              acceptedQty: item.acceptedQty,
              qtyToReplace: item.pendingQty,
              unit: item.unit,
              unitPrice: item.unitPrice,
            }));

          setPendingQuantities(replacementNeededQuantities);
        } catch (error) {
          console.error("Error fetching pending quantities in modal:", error);
          setPendingQuantities({}); // Reset on error
        } finally {
          setFetchingPending(false);
        }
      }
    };
    fetchPending();
  }, [isOpen, currentPO?.id, getPendingQuantities]); // Depend on isOpen and currentPO.id

  const statusInfo = statusConfig[currentPO.status];
  const hasPendingReplacements = pendingQuantities.length > 0; // Check if the filtered pendingQuantities object is not empty

  const calculateMaterialSummary = (materialId: string) => {
    const orderedItem = currentPO.items.find(
      (item: any) => item.materialId === materialId
    );
    if (!orderedItem) return null;

    const totalReceived = currentPO.grns.reduce((sum: number, grn: any) => {
      const material = grn.materials.find(
        (m: any) => m.materialId === materialId
      );
      return sum + (material?.receivedQty || 0);
    }, 0);

    const totalAccepted = currentPO.grns.reduce((sum: number, grn: any) => {
      const material = grn.materials.find(
        (m: any) => m.materialId === materialId
      );
      return sum + (material?.acceptedQty || 0);
    }, 0);

    const totalDefective = currentPO.grns.reduce((sum: number, grn: any) => {
      const material = grn.materials.find(
        (m: any) => m.materialId === materialId
      );
      return sum + (material?.defectiveQty || 0);
    }, 0);

    return {
      ...orderedItem,
      totalReceived,
      totalAccepted,
      totalDefective,
      pending: orderedItem.quantity - totalAccepted,
    };
  };

  const getGRNTypeIcon = (grn: any) => {
    if (grn.grnType === "replacement") {
      return <RotateCcw className="h-4 w-4 text-orange-500" />;
    }
    return <Package className="h-4 w-4 text-blue-500" />;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Purchase Order Details - {currentPO.poNumber}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(currentPO.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="font-medium">{currentPO.supplier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium">
                      ₹{currentPO.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">GST</p>
                    <p className="font-medium">{currentPO.gstPercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Replacements */}
            {hasPendingReplacements && (
              <PendingReplacementsCard po={currentPO} pendingQuantities={pendingQuantities} />
            )}

            {/* Material Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Materials Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead>Defective</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPO.items && currentPO.items.length > 0 ? (
                      currentPO.items.map((item: any) => {
                        const summary = calculateMaterialSummary(
                          item.materialId
                        );
                        if (!summary) return null;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.materialName}
                            </TableCell>
                            <TableCell>{summary.quantity}</TableCell>
                            <TableCell>{summary.totalReceived}</TableCell>
                            <TableCell className="text-green-600">
                              {summary.totalAccepted}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {summary.totalDefective}
                            </TableCell>
                            <TableCell
                              className={
                                summary.pending > 0
                                  ? "text-orange-600 font-medium"
                                  : ""
                              }
                            >
                              {summary.pending}
                            </TableCell>
                            <TableCell>{summary.unit}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-gray-400"
                        >
                          No materials found for this purchase order.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* GRNs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Goods Receipt Notes (GRN)</span>
                  {(currentPO.status === "arrived" ||
                    currentPO.status === "grn_verified" ||
                    currentPO.status === "qc_in_progress" ||
                    currentPO.status === "returned_to_vendor") && (
                    <Button onClick={() => setIsGRNModalOpen(true)}>
                      {hasPendingReplacements ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Create Replacement GRN
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          Create GRN
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPO.grns.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No GRNs created yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {currentPO.grns.map((grn: any, index: number) => (
                      <Card key={grn.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getGRNTypeIcon(grn)}
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">
                                    {grn.grnNumber}
                                  </h4>
                                  {grn.grnType === "replacement" && (
                                    <Badge
                                      variant="outline"
                                      className="text-orange-600 border-orange-300"
                                    >
                                      Replacement #{index + 1}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  Date:{" "}
                                  {format(new Date(grn.date), "dd/MM/yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedGRN(grn)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                QC
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead>Ordered Qty</TableHead>
                                <TableHead>Received Qty</TableHead>
                                <TableHead>QC Status</TableHead>
                                <TableHead>Accepted</TableHead>
                                <TableHead>Defective</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentPO.items.map((item: any) => {
                                // Find corresponding GRN material data if it exists
                                const grnMaterial = grn.materials.find(
                                  (m: any) => m.materialId === item.materialId
                                );
                                return (
                                  <TableRow key={item.materialId}>
                                    <TableCell>{item.materialName}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                      {grnMaterial?.receivedQty || "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          grnMaterial?.qcStatus === "completed"
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {grnMaterial?.qcStatus === "completed"
                                          ? "Completed"
                                          : "Pending"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-green-600">
                                      {grnMaterial?.acceptedQty || "-"}
                                    </TableCell>
                                    <TableCell className="text-red-600">
                                      {grnMaterial?.defectiveQty || "-"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          {grn.remarks && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Remarks: {grn.remarks}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <div className="flex space-x-2">
                {currentPO.status === "ordered" && (
                  <Button
                    variant="outline"
                    onClick={() => updatePOStatus(currentPO.id, "arrived")}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Mark as Arrived
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <CreateGRNModal
        po={currentPO}
        isOpen={isGRNModalOpen}
        onClose={() => setIsGRNModalOpen(false)}
      />

      {selectedGRN && (
        <QCModal
          po={currentPO}
          grn={selectedGRN}
          isOpen={!!selectedGRN}
          onClose={() => setSelectedGRN(null)}
        />
      )}
    </>
  );
};
