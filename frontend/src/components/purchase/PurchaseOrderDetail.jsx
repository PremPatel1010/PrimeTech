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
  StepSeparator
} from '@chakra-ui/react';
import axios from 'axios';
import GRNForm from './GRNForm';
import GRNList from './GRNList';
import MaterialSummary from './MaterialSummary';
import GRNViewModal from './GRNViewModal';

const steps = [
  { title: 'Ordered', description: 'Purchase order created' },
  { title: 'Arrived', description: 'Goods received' },
  { title: 'GRN Verified', description: 'GRN verification complete' },
  { title: 'QC In Progress', description: 'Quality check ongoing' },
  { title: 'In Store', description: 'Items moved to inventory' },
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
    index: steps.findIndex(step => step.title.toLowerCase() === purchaseOrder?.status?.toLowerCase()) || 0,
    count: steps.length
  });

  const fetchData = async () => {
    try {
      const [poResponse, grnsResponse, summaryResponse] = await Promise.all([
        axios.get(`/api/purchase/${purchaseOrderId}`),
        axios.get(`/api/purchase/${purchaseOrderId}/grns`),
        axios.get(`/api/purchase/${purchaseOrderId}/material-summary`)
      ]);

      setPurchaseOrder(poResponse.data);
      setGRNs(grnsResponse.data);
      setMaterialSummary(summaryResponse.data);
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

        {/* Material Summary */}
        <MaterialSummary summary={materialSummary} />

        <Divider />

        {/* GRN List */}
        <GRNList
          grns={grns}
          onVerify={handleVerifyGRN}
          onRefresh={fetchData}
          onView={setViewGRN}
        />
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