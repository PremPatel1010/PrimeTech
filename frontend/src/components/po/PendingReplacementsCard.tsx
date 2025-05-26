
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Package } from 'lucide-react';
import { usePOStore } from '@/services/poStore';

interface PendingReplacementsCardProps {
  po: any;
}

export const PendingReplacementsCard = ({ po }: PendingReplacementsCardProps) => {
  const { getPendingQuantities } = usePOStore();
  const pendingQuantities = getPendingQuantities(po.id);
  
  if (Object.keys(pendingQuantities).length === 0) {
    return null;
  }

  const pendingMaterials = po.items.filter((item: any) => 
    pendingQuantities[item.materialId] > 0
  );

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          <span>Pending Replacements</span>
          <Badge variant="secondary" className="bg-orange-200 text-orange-900">
            {pendingMaterials.length} Material{pendingMaterials.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-orange-300 bg-orange-100 mb-4">
          <Package className="h-4 w-4 text-orange-700" />
          <AlertDescription className="text-orange-900">
            These materials have defective quantities that need replacement. 
            Create a replacement GRN to receive the missing quantities.
          </AlertDescription>
        </Alert>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Name</TableHead>
              <TableHead>Total Ordered</TableHead>
              <TableHead>Total Accepted</TableHead>
              <TableHead className="text-orange-700">Pending Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingMaterials.map((item: any) => {
              const totalAccepted = po.grns.reduce((sum: number, grn: any) => {
                const material = grn.materials.find((m: any) => m.materialId === item.materialId);
                return sum + (material?.acceptedQty || 0);
              }, 0);

              return (
                <TableRow key={item.materialId}>
                  <TableCell className="font-medium">{item.materialName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-green-600">{totalAccepted}</TableCell>
                  <TableCell className="text-orange-600 font-medium">
                    {pendingQuantities[item.materialId]}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};