import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Heading,
  VStack,
  HStack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import GRNForm from './GRNForm';
import QCReportForm from './QCReportForm.jsx';
import { axiosInstance } from '../../services/axiosInstance';

const PurchaseOrder = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [quantities, setQuantities] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axiosInstance.get('/api/purchase-orders');
      setPurchaseOrders(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch purchase orders',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const fetchStatusHistory = async (poId) => {
    try {
      const response = await axiosInstance.get(`/api/purchase-orders/${poId}/status-history`);
      setStatusHistory(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch status history',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const fetchQuantities = async (poId) => {
    try {
      const response = await axiosInstance.get(`/api/purchase-orders/${poId}/quantities`);
      setQuantities(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch quantities',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleCreateNewPO = async () => {
    try {
      const response = await axiosInstance.get('/api/purchase-orders/next-number');
      navigate('/purchase-orders/new', { state: { nextOrderNumber: response.data.nextOrderNumber } });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get next order number',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const handleViewDetails = async (po) => {
    setSelectedPO(po);
    await fetchStatusHistory(po.po_id);
    await fetchQuantities(po.po_id);
    onOpen();
  };

  const handleStatusUpdate = async (newStatus, notes = '') => {
    try {
      await axiosInstance.put(`/api/purchase-orders/${selectedPO.po_id}/status`, {
        status: newStatus,
        notes
      });
      toast({
        title: 'Success',
        description: 'Status updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      fetchPurchaseOrders();
      fetchStatusHistory(selectedPO.po_id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update status',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ordered: 'blue',
      grn_verified: 'yellow',
      qc_in_progress: 'orange',
      qc_completed: 'green',
      completed: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'gray';
  };

  const renderStatusHistory = () => (
    <VStack align="stretch" spacing={4}>
      {statusHistory.map((log) => (
        <Box
          key={log.log_id}
          p={3}
          borderWidth="1px"
          borderRadius="md"
          bg="white"
        >
          <HStack justify="space-between">
            <Badge colorScheme={getStatusColor(log.status)}>
              {log.status}
            </Badge>
            <Text fontSize="sm" color="gray.500">
              {new Date(log.created_at).toLocaleString()}
            </Text>
          </HStack>
          {log.notes && (
            <Text mt={2} fontSize="sm">
              {log.notes}
            </Text>
          )}
          <Text fontSize="xs" color="gray.500" mt={1}>
            Updated by: {log.user_name}
          </Text>
        </Box>
      ))}
    </VStack>
  );

  const renderQuantities = () => (
    <VStack align="stretch" spacing={4}>
      <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
        <Heading size="sm" mb={3}>Quantity Summary</Heading>
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text>Ordered Quantity:</Text>
            <Text fontWeight="bold">{quantities?.ordered_quantity || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Received Quantity:</Text>
            <Text fontWeight="bold">{quantities?.received_quantity || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Accepted Quantity:</Text>
            <Text fontWeight="bold">{quantities?.accepted_quantity || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Defective Quantity:</Text>
            <Text fontWeight="bold">{quantities?.defective_quantity || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Pending Quantity:</Text>
            <Text fontWeight="bold">{quantities?.pending_quantity || 0}</Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );

  return (
    <Box p={4}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">Purchase Orders</Heading>
        <Button colorScheme="blue" onClick={handleCreateNewPO}>
          Create New PO
        </Button>
      </Box>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>PO Number</Th>
            <Th>Date</Th>
            <Th>Supplier</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {purchaseOrders.map((po) => (
            <Tr key={po.po_id}>
              <Td>{po.order_number}</Td>
              <Td>{new Date(po.order_date).toLocaleDateString()}</Td>
              <Td>{po.supplier_name}</Td>
              <Td>
                <Badge colorScheme={getStatusColor(po.status)}>
                  {po.status}
                </Badge>
              </Td>
              <Td>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => handleViewDetails(po)}
                >
                  View Details
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            PO Details - {selectedPO?.order_number}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs onChange={(index) => setActiveTab(index)}>
              <TabList>
                <Tab>Details</Tab>
                <Tab>Status History</Tab>
                <Tab>Quantities</Tab>
                <Tab>GRN</Tab>
                <Tab>QC</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontWeight="bold">Supplier:</Text>
                      <Text>{selectedPO?.supplier_name}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Order Date:</Text>
                      <Text>{new Date(selectedPO?.order_date).toLocaleDateString()}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Status:</Text>
                      <Badge colorScheme={getStatusColor(selectedPO?.status)}>
                        {selectedPO?.status}
                      </Badge>
                    </Box>
                    {selectedPO?.status === 'ordered' && (
                      <Button
                        colorScheme="green"
                        onClick={() => handleStatusUpdate('grn_verified')}
                      >
                        Mark as Received
                      </Button>
                    )}
                  </VStack>
                </TabPanel>

                <TabPanel>
                  {renderStatusHistory()}
                </TabPanel>

                <TabPanel>
                  {renderQuantities()}
                </TabPanel>

                <TabPanel>
                  {selectedPO?.status === 'grn_verified' && (
                    <GRNForm
                      onSuccess={() => {
                        onClose();
                        fetchPurchaseOrders();
                      }}
                      onCancel={onClose}
                    />
                  )}
                </TabPanel>

                <TabPanel>
                  {selectedPO?.status === 'qc_in_progress' && (
                    <QCReportForm
                      onSuccess={() => {
                        onClose();
                        fetchPurchaseOrders();
                      }}
                      onCancel={onClose}
                    />
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PurchaseOrder; 