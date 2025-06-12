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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  onConfirm: () => Promise<void>;
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

  // Calculate quantity to be manufactured
  const toBeManufactured = Math.max(0, requestedQuantity - availableInStock);

  useEffect(() => {
    // Reset warning when modal opens
    if (isOpen) {
      setShowManufactureWarning(false); 
    }
  }, [isOpen]);

  useEffect(() => {
    // Re-evaluate warning when calculated toBeManufactured quantity changes
    if (toBeManufactured > maxManufacturableQuantity) {
      setShowManufactureWarning(true);
    } else {
      setShowManufactureWarning(false);
    }
  }, [toBeManufactured, maxManufacturableQuantity]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(); // Call onConfirm without action or quantity
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
                <div className="text-sm font-medium text-muted-foreground">Requires Manufacturing</div>
                <div className="text-2xl font-bold">{toBeManufactured} units</div>
              </CardContent>
            </Card>
          </div>

          {/* Manufacturing Capacity */}
          <div className="space-y-2">
            <Label>Maximum Manufacturable Units</Label>
            <div className="text-lg font-bold">{maxManufacturableQuantity} units</div>
            {showManufactureWarning && (
              <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Warning: Raw materials needed. Cannot manufacture {toBeManufactured - maxManufacturableQuantity} more units due to insufficient raw materials. Sales order will continue.
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
            disabled={isSubmitting}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 