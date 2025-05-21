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
  Progress,
  Badge,
  VStack,
  HStack
} from '@chakra-ui/react';

const MaterialSummary = ({ summary }) => {
  const getProgressColor = (received, ordered) => {
    const percentage = (received / ordered) * 100;
    if (percentage === 100) return 'green';
    if (percentage >= 75) return 'blue';
    if (percentage >= 50) return 'yellow';
    return 'red';
  };

  const getStatusBadge = (received, ordered, defective) => {
    if (received === 0) return <Badge colorScheme="red">Not Started</Badge>;
    if (received === ordered) return <Badge colorScheme="green">Completed</Badge>;
    if (defective > 0) return <Badge colorScheme="orange">Has Defects</Badge>;
    return <Badge colorScheme="blue">In Progress</Badge>;
  };

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Material Progress Summary
      </Text>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Material</Th>
            <Th>Ordered</Th>
            <Th>Received</Th>
            <Th>Defective</Th>
            <Th>Pending</Th>
            <Th>Progress</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {summary.map((item) => (
            <Tr key={item.material_id}>
              <Td>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">{item.material_name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {item.material_code}
                  </Text>
                </VStack>
              </Td>
              <Td>{item.ordered_quantity}</Td>
              <Td>{item.total_received}</Td>
              <Td>{item.total_defective}</Td>
              <Td>{item.pending_quantity}</Td>
              <Td>
                <VStack align="stretch" spacing={1}>
                  <Progress
                    value={(item.total_received / item.ordered_quantity) * 100}
                    colorScheme={getProgressColor(item.total_received, item.ordered_quantity)}
                    size="sm"
                  />
                  <Text fontSize="xs" color="gray.500">
                    {Math.round((item.total_received / item.ordered_quantity) * 100)}%
                  </Text>
                </VStack>
              </Td>
              <Td>
                {getStatusBadge(
                  item.total_received,
                  item.ordered_quantity,
                  item.total_defective
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default MaterialSummary; 