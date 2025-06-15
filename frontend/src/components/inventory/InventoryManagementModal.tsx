import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Package, Factory } from "lucide-react";
import { toast } from "sonner";

interface InventoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableInStock: number;
  maxManufacturableQuantity: number;
  onConfirm: (stockDeduction: number, manufacturingQuantity: number) => Promise<void>;
}

export const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  requestedQuantity,
  availableInStock,
  maxManufacturableQuantity,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManufactureWarning, setShowManufactureWarning] = useState(false);
  const [stockDeduction, setStockDeduction] = useState<number>(Math.min(availableInStock, requestedQuantity));
  const [manufacturingQuantity, setManufacturingQuantity] = useState<number>(Math.max(0, requestedQuantity - availableInStock));

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setStockDeduction(Math.min(availableInStock, requestedQuantity));
      setManufacturingQuantity(Math.max(0, requestedQuantity - availableInStock));
      setShowManufactureWarning(false);
    }
  }, [isOpen, availableInStock, requestedQuantity]);

  useEffect(() => {
    // Validate total quantity
    const totalQuantity = stockDeduction + manufacturingQuantity;
    if (totalQuantity !== requestedQuantity) {
      setShowManufactureWarning(true);
    } else if (manufacturingQuantity > maxManufacturableQuantity) {
      setShowManufactureWarning(true);
    } else {
      setShowManufactureWarning(false);
    }
  }, [stockDeduction, manufacturingQuantity, requestedQuantity, maxManufacturableQuantity]);

  const handleStockDeductionChange = (value: number) => {
    const newStockDeduction = Math.min(Math.max(0, value), availableInStock);
    setStockDeduction(newStockDeduction);
    // Adjust manufacturing quantity to maintain total
    setManufacturingQuantity(requestedQuantity - newStockDeduction);
  };

  const handleManufacturingQuantityChange = (value: number) => {
    const newManufacturingQuantity = Math.min(Math.max(0, value), maxManufacturableQuantity);
    setManufacturingQuantity(newManufacturingQuantity);
    // Adjust stock deduction to maintain total
    setStockDeduction(requestedQuantity - newManufacturingQuantity);
  };

  const handleSubmit = async () => {
    if (stockDeduction + manufacturingQuantity !== requestedQuantity) {
      toast.error("Total quantity must match requested quantity");
      return;
    }
    if (manufacturingQuantity > maxManufacturableQuantity) {
      toast.error("Manufacturing quantity exceeds maximum manufacturable quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(stockDeduction, manufacturingQuantity);
      onClose();
    } catch (error) {
      toast.error("Failed to process inventory action");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Inventory Status Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">Available in Stock</div>
                <div className="text-2xl font-bold">{availableInStock} units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground">Requested Quantity</div>
                <div className="text-2xl font-bold">{requestedQuantity} units</div>
              </CardContent>
            </Card>
          </div>

          {/* Quantity Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockDeduction">Quantity to Deduct from Stock</Label>
              <Input
                id="stockDeduction"
                type="number"
                min={0}
                max={availableInStock}
                value={stockDeduction}
                onChange={(e) => handleStockDeductionChange(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Available in stock: {availableInStock} units
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturingQuantity">Quantity to Manufacture</Label>
              <Input
                id="manufacturingQuantity"
                type="number"
                min={0}
                max={maxManufacturableQuantity}
                value={manufacturingQuantity}
                onChange={(e) => handleManufacturingQuantityChange(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Maximum manufacturable: {maxManufacturableQuantity} units
              </p>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium">
                Total Quantity: {stockDeduction + manufacturingQuantity} / {requestedQuantity} units
              </p>
            </div>

            {showManufactureWarning && (
              <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  {stockDeduction + manufacturingQuantity !== requestedQuantity ? (
                    "Total quantity must match requested quantity"
                  ) : manufacturingQuantity > maxManufacturableQuantity ? (
                    `Warning: Cannot manufacture ${manufacturingQuantity - maxManufacturableQuantity} more units due to insufficient raw materials`
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || showManufactureWarning}
            className="bg-factory-primary hover:bg-factory-primary/90"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 