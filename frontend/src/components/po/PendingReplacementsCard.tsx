
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Package } from 'lucide-react';

interface PendingReplacementsCardProps {
  po: any;
  pendingQuantities: any;
}

export const PendingReplacementsCard = ({ po, pendingQuantities }: PendingReplacementsCardProps) => {
  if (Object.keys(pendingQuantities).length === 0) {
    return null;
  }

  

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          <span>Pending Replacements</span>
          <Badge variant="secondary" className="bg-orange-200 text-orange-900">
            {pendingQuantities.length} Material{pendingQuantities.length !== 1 ? 's' : ''}
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
              <TableHead>Total Defective</TableHead>
              <TableHead className="text-orange-700">Pending Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingQuantities.map((item: any) => {
              

              return (
                <TableRow key={item.materialId}>
                  <TableCell className="font-medium">{item.materialName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-green-600">{item.acceptedQty}</TableCell>
                  <TableCell className="text-red-600">{item.defectiveQty}</TableCell>
                  <TableCell className="text-orange-600 font-medium">
                    {item.qtyToReplace}
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