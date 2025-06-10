import React, { useEffect, useState } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, Grid } from '@mui/material';
import { ManufacturingService, WorkflowStep } from '../../services/manufacturing.service';
import { toast } from 'react-toastify';

interface WorkflowStepsProps {
  workflowId: string;
  onStepComplete?: () => void;
}

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({ workflowId, onStepComplete }) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowSteps();
  }, [workflowId]);

  const loadWorkflowSteps = async () => {
    try {
      const workflowSteps = await ManufacturingService.getWorkflowSteps(workflowId);
      setSteps(workflowSteps);
    } catch (error) {
      console.error('Error loading workflow steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepAction = async (stepCode: string, status: WorkflowStep['status']) => {
    try {
      await ManufacturingService.updateWorkflowStep(workflowId, stepCode, status);
      await loadWorkflowSteps();
      if (status === 'completed' && onStepComplete) {
        onStepComplete();
      }
      toast.success(`Step ${status === 'completed' ? 'completed' : 'started'}`);
    } catch (error) {
      console.error('Error updating step:', error);
      toast.error('Failed to update step');
    }
  };

  const getStepStatus = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'completed';
      case 'in_progress':
        return 'in_progress';
      case 'on_hold':
        return 'error';
      default:
        return 'pending';
    }
  };

  if (loading) {
    return <Typography>Loading workflow steps...</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Manufacturing Steps
      </Typography>
      
      <Stepper activeStep={steps.findIndex(s => s.status === 'in_progress')} alternativeLabel>
        {steps.map((step) => (
          <Step key={step.step_code} completed={step.status === 'completed'}>
            <StepLabel error={step.status === 'on_hold'}>
              {step.step_name}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={2} sx={{ mt: 3 }}>
        {steps.map((step) => (
          <Grid item xs={12} key={step.step_code}>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: step.status === 'completed' ? 'success.light' : 
                         step.status === 'in_progress' ? 'info.light' : 
                         step.status === 'on_hold' ? 'error.light' : 'background.paper'
              }}
            >
              <Box>
                <Typography variant="subtitle1">
                  {step.step_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {step.status.replace('_', ' ').toUpperCase()}
                </Typography>
                {step.start_date && (
                  <Typography variant="body2" color="text.secondary">
                    Started: {new Date(step.start_date).toLocaleString()}
                  </Typography>
                )}
                {step.end_date && (
                  <Typography variant="body2" color="text.secondary">
                    Completed: {new Date(step.end_date).toLocaleString()}
                  </Typography>
                )}
              </Box>
              
              <Box>
                {step.status === 'not_started' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleStepAction(step.step_code, 'in_progress')}
                  >
                    Start Step
                  </Button>
                )}
                {step.status === 'in_progress' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleStepAction(step.step_code, 'completed')}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => handleStepAction(step.step_code, 'on_hold')}
                    >
                      Hold
                    </Button>
                  </Box>
                )}
                {step.status === 'on_hold' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleStepAction(step.step_code, 'in_progress')}
                  >
                    Resume
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default WorkflowSteps;