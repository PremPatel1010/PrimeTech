import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Textarea,
  useToast,
  Text,
  Heading,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../../services/axiosInstance';
const QCReportForm = ({ onSuccess, onCancel }) => {
  const { poId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [grnDetails, setGRNDetails] = useState(null);
  const [formData, setFormData] = useState({
    inspected_quantity: '',
    defective_quantity: '',
    accepted_quantity: '',
    notes: ''
  });

  useEffect(() => {
    const fetchGRNDetails = async () => {
      try {
        const response = await axiosInstance.get(`/api/purchase-orders/${poId}/quantities`);
        setGRNDetails(response.data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch GRN details',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    };

    fetchGRNDetails();
  }, [poId, toast]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateQuantities = () => {
    const { inspected_quantity, defective_quantity, accepted_quantity } = formData;
    const total = Number(defective_quantity) + Number(accepted_quantity);
    return total === Number(inspected_quantity);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateQuantities()) {
      toast({
        title: 'Error',
        description: 'Defective + Accepted quantity must equal Inspected quantity',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post(`/api/purchase-orders/${poId}/qc`, formData);
      toast({
        title: 'Success',
        description: 'QC report submitted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to submit QC report',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  if (!grnDetails) {
    return <Text>Loading GRN details...</Text>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>Submit Quality Control Report</Heading>
      <Text mb={4}>Received Quantity: {grnDetails.received_quantity}</Text>
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Inspected Quantity</FormLabel>
            <NumberInput
              min={0}
              max={grnDetails.received_quantity}
              value={formData.inspected_quantity}
              onChange={(value) => handleChange('inspected_quantity', value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Defective Quantity</FormLabel>
            <NumberInput
              min={0}
              max={formData.inspected_quantity}
              value={formData.defective_quantity}
              onChange={(value) => handleChange('defective_quantity', value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Accepted Quantity</FormLabel>
            <NumberInput
              min={0}
              max={formData.inspected_quantity}
              value={formData.accepted_quantity}
              onChange={(value) => handleChange('accepted_quantity', value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter QC findings and notes..."
            />
          </FormControl>

          <Box display="flex" justifyContent="flex-end" gap={4}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={loading}
            >
              Submit QC Report
            </Button>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default QCReportForm; 