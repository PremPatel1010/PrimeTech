import React, { useState, useEffect } from "react";
import { usePOStore } from "../../services/poStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PurchaseOrder, GRNMaterial } from "../../services/poStore";
import { toast } from "sonner";

interface CreateGRNModalProps {
  po: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

interface GRNItemForm {
  materialId: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
}

interface FormData {
  grnNumber: string;
  date: string;
  remarks: string;
  grnType: "initial" | "replacement";
  materialId: string;
  receivedQty: number;
}

export const CreateGRNModal: React.FC<CreateGRNModalProps> = ({
  po,
  isOpen,
  onClose,
}) => {
  const {
    addGRN,
    addReplacementGRN,
    isLoading,
    getPurchaseOrder,
    getPendingQuantities,
  } = usePOStore();
  const [items, setItems] = useState<GRNItemForm[]>([]);
  const [formData, setFormData] = useState<FormData>({
    grnNumber: `GRN-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    remarks: "",
    grnType: "initial",
    materialId: "",
    receivedQty: 0,
  });

  // Get pending quantities for replacement GRN
  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    const fetchPendingQuantities = async () => {
      if (isOpen) {
        try {
          const raw = await getPendingQuantities(po.id);
          const quantities = Object.values(raw); // Convert object to array

          const replacementNeededQuantities = quantities
            .filter((item: any) => item.status === "needs_replacement")
            .map((item: any) => ({
              materialId: item.materialId,
              materialName: item.materialName,
              quantity: item.orderedQty,
              defectiveQty: item.defectiveQty,
              acceptedQty: item.acceptedQty,
              qtyToReplace: item.pendingQty,
              status: item.status,
              unit: item.unit,
              unitPrice: item.unitPrice,
            }));

          console.log(
            "replacementNeededQuantities",
            replacementNeededQuantities
          );
          setPendingQuantities(replacementNeededQuantities);
        } catch (error) {
          console.error("Error fetching pending quantities:", error);
        }
      }
    };
    fetchPendingQuantities();
  }, [isOpen, po.id, getPurchaseOrder]);

  const hasPendingReplacements = Object.keys(pendingQuantities).length > 0;

  useEffect(() => {
    if (isOpen && po.items) {
      setItems(
        po.items.map((item) => ({
          materialId: item.materialId,
          materialName: item.materialName,
          orderedQty: item.quantity,
          receivedQty: 0,
          unit: item.unit,
          unitPrice: item.unitPrice,
        }))
      );
    }
  }, [isOpen, po.items]);

  // Effect to update receivedQty when materialId changes in replacement GRN form
  useEffect(() => {
    if (formData.grnType === "replacement" && formData.materialId) {
      const selectedMaterial = pendingQuantities[formData.materialId];
      if (selectedMaterial) {
        setFormData((prev) => ({
          ...prev,
          receivedQty: selectedMaterial.defectiveQty,
        }));
      } else {
        setFormData((prev) => ({ ...prev, receivedQty: 0 }));
      }
    }
  }, [formData.materialId, formData.grnType, pendingQuantities]);

  const handleItemChange = (
    index: number,
    field: keyof GRNItemForm,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = newItems[index];
    const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;

    if (field === "receivedQty") {
      const orderedQty =
        po.items.find((i) => i.materialId === item.materialId)?.quantity || 0;
      item.receivedQty = Math.min(numValue, orderedQty);
    } else if (field === "orderedQty") {
      item.orderedQty = numValue;
    } else if (field === "materialId") {
      item.materialId = value as string;
    }

    setItems(newItems);
  };

  const handleFormChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "receivedQty" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPendingReplacements) {
      // Handle replacement GRN
      if (!formData.materialId || formData.receivedQty <= 0) {
        toast.error("Please select a material and enter received quantity");
        return;
      }

      try {
        const materialToReplace = pendingQuantities[formData.materialId];
        console.log("materialToReplace", materialToReplace);
        if (
          !materialToReplace ||
          materialToReplace.status !== "needs_replacement"
        ) {
          toast.error("Selected material does not need replacement");
          return;
        }

        // Ensure we send only the required fields
        const replacementGRNData = {
          grnNumber: formData.grnNumber,
          date: formData.date,
          materialId: materialToReplace.materialId,
          receivedQty: Number(formData.receivedQty),
          remarks: formData.remarks || "",
          replacementFor: materialToReplace.originalGrnId,
        };

        await addReplacementGRN(po.id, replacementGRNData);

        toast.success("Replacement GRN created successfully");
        onClose();
      } catch (error: any) {
        console.error("Error creating replacement GRN:", error);
        toast.error(
          error.response?.data?.error || "Failed to create replacement GRN"
        );
      }
    } else {
      // Handle regular GRN
      if (
        items.some((item) => !item.materialId || Number(item.receivedQty) <= 0)
      ) {
        toast.error("Please enter received quantity for all materials");
        return;
      }

      try {
        const grnData = {
          poId: po.id,
          grnNumber: formData.grnNumber,
          date: formData.date,
          status: "pending" as const,
          remarks: formData.remarks,
          grnType: formData.grnType,
        };

        const materialsData = items.map((item) => ({
          materialId: item.materialId,
          orderedQty: Number(item.orderedQty),
          receivedQty: Number(item.receivedQty),
        }));

        await addGRN(po.id, grnData, materialsData);
        toast.success("GRN created successfully");
        onClose();
      } catch (error: any) {
        console.error("Error creating GRN:", error);
        toast.error(error.response?.data?.error || "Failed to create GRN");
      }
    }
  };

  console.log("pendingQuantities After", pendingQuantities);
  


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {hasPendingReplacements
              ? "Create Replacement GRN"
              : "Create Goods Receipt Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grnNumber">GRN Number</Label>
              <Input
                id="grnNumber"
                value={formData.grnNumber}
                onChange={(e) => handleFormChange("grnNumber", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleFormChange("remarks", e.target.value)}
              placeholder="Enter any additional notes or remarks"
            />
          </div>

          {hasPendingReplacements ? (
            // Replacement GRN Form
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Select Material for Replacement
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.materialId}
                    onChange={(e) =>
                      handleFormChange("materialId", e.target.value)
                    }
                    required
                  >
                    <option value="">Select Material</option>
                    {Object.entries(pendingQuantities)
                      .filter(
                        ([_, material]: [string, any]) =>
                          material.status === "needs_replacement"
                      )
                      .map(([id, material]: [string, any]) => (
                        <option key={id} value={id}>
                          {material.materialName}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Pending Quantity</Label>
                  <p>
                    {pendingQuantities[parseInt(formData.materialId as string)]?.qtyToReplace ?? 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Received Quantity</Label>
                  <Input
                    type="number"
                    value={formData.receivedQty || ""}
                    onChange={(e) =>
                      handleFormChange("receivedQty", e.target.value)
                    }
                    min="0"
                    max={
                      formData.materialId
                        ? pendingQuantities[formData.materialId]?.qtyToReplace
                        : 0
                    }
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            // Regular GRN Form
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Materials</h3>
              <div className="text-sm text-gray-500">
                Number of materials: {items.length}
              </div>
              {items.map((item, index) => {
                return (
                  <div key={index} className="grid grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Input
                        type="text"
                        value={item.materialName}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ordered Quantity</Label>
                      <Input
                        type="text"
                        value={`${item.orderedQty} ${item.unit}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Received Quantity</Label>
                      <Input
                        type="number"
                        value={item.receivedQty || ""}
                        onChange={(e) =>
                          handleItemChange(index, "receivedQty", e.target.value)
                        }
                        min="0"
                        max={item.orderedQty}
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="text"
                        value={formatCurrency(item.unitPrice)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (hasPendingReplacements
                  ? !formData.materialId || formData.receivedQty <= 0
                  : items.every((item) => item.receivedQty === 0))
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : hasPendingReplacements ? (
                "Create Replacement GRN"
              ) : (
                "Create GRN"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
