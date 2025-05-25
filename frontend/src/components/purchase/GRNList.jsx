import React, { useState } from 'react';
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

const GRNList = ({ grns, onVerify, onRefresh, onView, purchaseOrderStatus }) => {
  const toast = useToast();
  const [pdfModal, setPdfModal] = useState({ open: false, grnId: null });

  const handleViewPDF = (grnId) => {
    setPdfModal({ open: true, grnId });
  };

  const handleDownload = (grnId) => {
    window.open(`${axiosInstance.defaults.baseURL}/purchase/purchase-orders/grn/${grnId}/pdf?download=1`, '_blank');
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
              <Td>{grn.grn_number || grn.grn_id}</Td>
              <Td>{format(new Date(grn.grn_date), 'dd/MM/yyyy')}</Td>
              <Td>
                <VStack align="start" spacing={1}>
                  {grn.materials && grn.materials.map((material) => (
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
                    Total Received: {grn.materials ? grn.materials.reduce((sum, m) => sum + (m.received_quantity || 0), 0) : 0}
                  </Text>
                </VStack>
              </Td>
              <Td>{getStatusBadge(grn.verified)}</Td>
              <Td>
                <HStack spacing={2}>
                  <Button size="sm" colorScheme="gray" onClick={() => onView(grn)}>
                    Details
                  </Button>
                  <Button size="sm" colorScheme="blue" onClick={() => handleViewPDF(grn.grn_id)}>
                    View PDF
                  </Button>
                  <Button size="sm" colorScheme="green" onClick={() => handleDownload(grn.grn_id)}>
                    Download
                  </Button>
                  {purchaseOrderStatus === 'arrived' && !grn.verified && (
                    <Button size="sm" colorScheme="green" onClick={() => onVerify(grn.grn_id)}>
                      Verify
                    </Button>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      {/* PDF Modal */}
      {pdfModal.open && (
        <Box position="fixed" top={0} left={0} w="100vw" h="100vh" bg="rgba(0,0,0,0.5)" zIndex={9999} display="flex" alignItems="center" justifyContent="center">
          <Box bg="white" p={4} borderRadius="md" maxW="90vw" maxH="90vh" w="900px" h="90vh" position="relative">
            <Button position="absolute" top={2} right={2} onClick={() => setPdfModal({ open: false, grnId: null })}>Close</Button>
            <iframe
              src={`${axiosInstance.defaults.baseURL}/purchase/purchase-orders/grn/${pdfModal.grnId}/pdf`}
              title="GRN PDF"
              width="100%"
              height="100%"
              style={{ border: 'none', minHeight: '80vh' }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GRNList; 