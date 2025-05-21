import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Button,
  Badge,
  HStack,
  VStack,
  useToast
} from '@chakra-ui/react';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios.ts';

const GRNList = ({ grns, onVerify, onRefresh, onView }) => {
  const toast = useToast();

  const handleDownload = async (grnId, purchaseOrderId) => {
    try {
      const response = await axiosInstance.get(
        `/purchase/${purchaseOrderId}/grn/${grnId}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GRN-${grnId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download GRN PDF',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getStatusBadge = (verified) => {
    return verified ? (
      <Badge colorScheme="green">Verified</Badge>
    ) : (
      <Badge colorScheme="yellow">Pending</Badge>
    );
  };

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Goods Receipt Notes
      </Text>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>GRN Number</Th>
            <Th>Date</Th>
            <Th>Materials</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {grns.map((grn) => (
            <Tr key={grn.grn_id}>
              <Td>{grn.grn_number}</Td>
              <Td>{format(new Date(grn.grn_date), 'dd/MM/yyyy')}</Td>
              <Td>
                <VStack align="start" spacing={1}>
                  {grn.materials.map((material) => (
                    <Text key={material.material_id} fontSize="sm">
                      {material.material_name}: {material.received_quantity} received
                      {material.defective_quantity > 0 && (
                        <Badge ml={2} colorScheme="red">
                          {material.defective_quantity} defective
                        </Badge>
                      )}
                    </Text>
                  ))}
                  <Text fontWeight="bold" color="blue.600" mt={2}>
                    Total Received: {grn.materials.reduce((sum, m) => sum + (m.received_quantity || 0), 0)}
                  </Text>
                </VStack>
              </Td>
              <Td>{getStatusBadge(grn.verified)}</Td>
              <Td>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="gray"
                    onClick={() => onView(grn)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleDownload(grn.grn_id, grn.purchase_order_id)}
                  >
                    Download
                  </Button>
                  {!grn.verified && (
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => onVerify(grn.grn_id)}
                    >
                      Verify
                    </Button>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default GRNList; 