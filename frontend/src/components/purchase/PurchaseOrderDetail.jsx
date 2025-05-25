import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Divider,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  useSteps,
  StepSeparator,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td
} from '@chakra-ui/react';
import axios from 'axios';
import GRNForm from './GRNForm';
import GRNList from './GRNList';
import MaterialSummary from './MaterialSummary';
import GRNViewModal from './GRNViewModal';
import QCReportForm from './QCReportForm.jsx';

const steps = [
  { title: 'Ordered', description: 'Purchase order created' },
  { title: 'Arrived', description: 'Goods received' },
  { title: 'GRN Verified', description: 'GRN verification complete' },
  { title: 'QC In Progress', description: 'Quality check ongoing' },
  { title: 'Returned to Vendor', description: 'Defective items returned' },
  { title: 'Completed', description: 'Process complete' }
];

const PurchaseOrderDetail = ({ purchaseOrderId }) => {
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [grns, setGRNs] = useState([]);
  const [materialSummary, setMaterialSummary] = useState([]);
  const [isGRNFormOpen, setIsGRNFormOpen] = useState(false);
  const [viewGRN, setViewGRN] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const { activeStep } = useSteps({
    index: steps.findIndex(step => {
      const lowerCaseStatus = purchaseOrder?.status?.toLowerCase();
      if (!lowerCaseStatus) return -1; // No status yet

      // Map backend statuses to frontend stepper titles - only direct matches now
      return steps.findIndex(step => step.title.toLowerCase() === lowerCaseStatus) || 0;
    }) || 0,
    count: steps.length
  });

  const fetchData = async () => {
    try {
      // Fetch all PO details, including overall summary and returned items
      const poResponse = await axios.get(`/api/purchase/${purchaseOrderId}`);

      setPurchaseOrder(poResponse.data);
      // Assuming GRNs and material summary are now part of the main PO data
      setGRNs(poResponse.data.grns || []);
      // The existing MaterialSummary component seems to expect a different structure, 
      // we will keep it for now but rely on the new overall_summary for the new section.
      // setMaterialSummary(summaryResponse.data);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch purchase order details',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [purchaseOrderId]);

  const handleGRNSuccess = () => {
    fetchData();
    setIsGRNFormOpen(false);
  };

  const handleVerifyGRN = async (grnId) => {
    try {
      await axios.put(`/api/purchase/${purchaseOrderId}/grn/${grnId}/verify`);
      toast({
        title: 'Success',
        description: 'GRN verified successfully',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify GRN',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        {/* Purchase Order Header */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Text fontSize="2xl" fontWeight="bold">
              Purchase Order #{purchaseOrder.order_number}
            </Text>
            <Button
              colorScheme="blue"
              onClick={() => setIsGRNFormOpen(true)}
              isDisabled={purchaseOrder.status === 'completed'}
            >
              Create GRN
            </Button>
          </HStack>

          {/* Status Stepper */}
          <Stepper index={activeStep} colorScheme="blue" size="lg">
            {steps.map((step, index) => (
              <Step key={index}>
                <StepIndicator>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber />}
                    active={<StepNumber />}
                  />
                </StepIndicator>

                <Box flexShrink="0">
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>

                <StepSeparator />
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider />

        {/* Overall Quantity Summary */}
        {purchaseOrder.overall_summary && (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              Overall Quantity Summary
            </Text>
            <HStack spacing={8} justify="space-around" p={4} bg="gray.100" borderRadius="md">
              <VStack>
                <Text fontSize="xl" fontWeight="bold" color="blue.600">{purchaseOrder.overall_summary.total_ordered}</Text>
                <Text fontSize="sm">Ordered</Text>
              </VStack>
              <VStack>
                <Text fontSize="xl" fontWeight="bold" color="green.600">{purchaseOrder.overall_summary.total_received}</Text>
                <Text fontSize="sm">Received</Text>
              </VStack>
              <VStack>
                <Text fontSize="xl" fontWeight="bold" color="purple.600">{purchaseOrder.overall_summary.total_in_store || 0}</Text>
                <Text fontSize="sm">In Store</Text>
              </VStack>
              <VStack>
                <Text fontSize="xl" fontWeight="bold" color="red.600">{purchaseOrder.overall_summary.total_defective}</Text>
                <Text fontSize="sm">Defective</Text>
              </VStack>
              <VStack>
                <Text fontSize="xl" fontWeight="bold" color="orange.600">{purchaseOrder.overall_summary.total_pending}</Text>
                <Text fontSize="sm">Pending</Text>
              </VStack>
            </HStack>
          </Box>
        )}

        <Divider />

        {/* Status Change History */}
        {purchaseOrder.status_logs && purchaseOrder.status_logs.length > 0 && (
            <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Status Change History
                </Text>
                <VStack align="start" spacing={3}>
                    {purchaseOrder.status_logs.map((log, index) => (
                        <Box key={index} p={3} shadow="md" borderWidth="1px" borderRadius="md" width="100%">
                            <Text fontWeight="semibold">Status changed to: {log.status}</Text>
                            <Text fontSize="sm" color="gray.600">on {new Date(log.created_at).toLocaleString()}</Text>
                            {log.notes && (
                                <Text fontSize="sm" color="gray.600">Notes: {log.notes}</Text>
                            )}
                             {log.changed_by_name && (
                                <Text fontSize="sm" color="gray.600">Changed by: {log.changed_by_name}</Text>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>
        )}

        <Divider />

        {/* Material Summary */}
        <MaterialSummary summary={materialSummary} />

        <Divider />

        {/* Materials List */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Materials</Text>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Material</Th>
                <Th>Quantity</Th>
                <Th>Unit</Th>
                <Th>Unit Price</Th>
                <Th>Total Price</Th>
                <Th>Current Inventory Stock</Th>
              </Tr>
            </Thead>
            <Tbody>
              {purchaseOrder.materials.map((item) => (
                <Tr key={item.item_id}>
                  <Td>{item.material_name}</Td>
                  <Td>{item.quantity}</Td>
                  <Td>{item.unit}</Td>
                  <Td>{item.unit_price}</Td>
                  <Td>{item.total_price}</Td>
                  <Td>{item.current_stock !== undefined ? item.current_stock : 'N/A'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Divider />

        {/* GRN List */}
        <GRNList
          grns={grns}
          onVerify={handleVerifyGRN}
          onRefresh={fetchData}
          onView={setViewGRN}
          purchaseOrderStatus={purchaseOrder?.status}
        />

        {/* Per-GRN Summaries (Store, Return, Pending) */}
        {grns && grns.length > 0 && (
            <Box>
                 <Text fontSize="lg" fontWeight="bold" mb={4}>GRN Summaries</Text>
                 {grns.map(grn => {
                     // Calculate summaries for each GRN's materials
                     const storeSummary = grn.materials ? grn.materials.reduce((sum, item) => sum + (item.store_status === 'sent' ? (item.store_quantity || item.qc_passed_quantity || 0) : 0), 0) : 0;
                     const returnedSummary = grn.materials ? grn.materials.reduce((sum, item) => sum + (item.qc_status === 'returned' ? (item.defective_quantity || 0) : 0), 0) : 0;
                     const pendingSummary = grn.materials ? grn.materials.reduce((sum, item) => sum + (item.qc_status === 'pending' || item.qc_status === 'in_progress' || (item.qc_status === 'passed' && item.store_status === 'pending') ? (item.received_quantity - (item.defective_quantity || 0) - (item.store_quantity || 0)) : 0), 0) : 0; // More accurate pending calculation

                     return (
                         <Box key={grn.grn_id} p={4} shadow="md" borderWidth="1px" borderRadius="md" mb={4}>
                             <Text fontSize="md" fontWeight="bold">GRN #{grn.grn_id}</Text>
                             <HStack spacing={8} justify="space-around" mt={2}>
                                 <VStack>
                                     <Text fontSize="xl" fontWeight="bold" color="purple.600">{storeSummary}</Text>
                                     <Text fontSize="sm">Sent to Store</Text>
                                 </VStack>
                                 <VStack>
                                     <Text fontSize="xl" fontWeight="bold" color="red.600">{returnedSummary}</Text>
                                     <Text fontSize="sm">Returned</Text>
                                 </VStack>
                                 <VStack>
                                      <Text fontSize="xl" fontWeight="bold" color="orange.600">{pendingSummary}</Text>
                                      <Text fontSize="sm">Pending Action</Text>
                                 </VStack>
                             </HStack>
                         </Box>
                     );
                 })}
             </Box>
        )}

        <Divider />

        {/* Items Returned to Vendor */}
        {purchaseOrder.returned_items && purchaseOrder.returned_items.length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              Items Returned to Vendor
            </Text>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Material</Th>
                  <Th>Quantity Returned</Th>
                  <Th>Remarks</Th>
                  <Th>Return Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {purchaseOrder.returned_items.map((item) => (
                  <Tr key={item.return_id}>
                    <Td>{item.material_name}</Td>
                    <Td>{item.quantity_returned}</Td>
                    <Td>{item.remarks}</Td>
                    <Td>{new Date(item.created_at).toLocaleDateString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* QC Report Form - show if status is qc_in_progress and there is a GRN in that stage */}
        {purchaseOrder.status === 'qc_in_progress' && grns.length > 0 && (
          <QCReportForm
            grn={grns.find(g => g.status === 'qc_in_progress') || grns[0]}
            onSuccess={fetchData}
            onCancel={fetchData}
          />
        )}
      </VStack>

      {/* GRN Form Modal */}
      <GRNForm
        isOpen={isGRNFormOpen}
        onClose={() => setIsGRNFormOpen(false)}
        purchaseOrder={purchaseOrder}
        onSuccess={handleGRNSuccess}
      />

      {/* GRN View Modal (only for viewing, not for creation) */}
      {viewGRN && (
        <GRNViewModal
          grn={viewGRN}
          onClose={() => setViewGRN(null)}
        />
      )}
    </Box>
  );
};

export default PurchaseOrderDetail; 