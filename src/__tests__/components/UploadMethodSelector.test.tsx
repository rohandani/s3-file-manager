import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import UploadMethodSelector from '@/components/upload/UploadMethodSelector';

// Mock the services
vi.mock('@/lib/services/costCalculatorService', () => ({
  CostCalculatorService: {
    calculateCostComparison: vi.fn().mockReturnValue({
      individual: {
        storageCost: 0.023,
        requestCost: 0.010,
        dataTransferCost: 0.009,
        totalCost: 0.042
      },
      zip: {
        storageCost: 0.016,
        requestCost: 0.000005,
        dataTransferCost: 0.006,
        totalCost: 0.022
      },
      savings: 0.020,
      savingsPercentage: 47.6,
      recommendation: 'zip',
      reasoning: 'ZIP upload saves 47.6% in costs due to reduced storage and transfer costs.'
    }),
    formatCurrency: vi.fn((amount) => `$${amount.toFixed(4)}`),
    getCostDisclaimer: vi.fn().mockReturnValue('Cost estimates are approximate and may vary.')
  }
}));

vi.mock('@/lib/services/zipService', () => ({
  ZipService: {
    estimateCompressionRatio: vi.fn().mockReturnValue(45)
  }
}));

describe('UploadMethodSelector', () => {
  const mockFiles = [
    new File(['content1'], 'file1.txt', { type: 'text/plain' }),
    new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    new File(['content3'], 'file3.jpg', { type: 'image/jpeg' })
  ];

  const defaultProps = {
    files: mockFiles,
    selectedMethod: 'individual' as const,
    onMethodChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload method options', () => {
    render(<UploadMethodSelector {...defaultProps} />);

    expect(screen.getByText('Choose Upload Method')).toBeInTheDocument();
    expect(screen.getByText('Upload Individually')).toBeInTheDocument();
    expect(screen.getByText('Create ZIP Archive')).toBeInTheDocument();
  });

  it('should display file summary information', () => {
    render(<UploadMethodSelector {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Number of files
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Total Size')).toBeInTheDocument();
    expect(screen.getByText('Average Size')).toBeInTheDocument();
  });

  it('should show cost analysis when files are provided', async () => {
    render(<UploadMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Cost Analysis')).toBeInTheDocument();
    });

    expect(screen.getByText('ZIP Upload Recommended')).toBeInTheDocument();
    expect(screen.getByText('Individual Upload')).toBeInTheDocument();
    expect(screen.getByText('ZIP Upload')).toBeInTheDocument();
  });

  it('should call onMethodChange when method is selected', () => {
    render(<UploadMethodSelector {...defaultProps} />);

    const zipOption = screen.getByRole('button', { name: /Create ZIP Archive/i });
    fireEvent.click(zipOption);

    expect(defaultProps.onMethodChange).toHaveBeenCalledWith('zip');
  });

  it('should call onNext when continue button is clicked', () => {
    render(<UploadMethodSelector {...defaultProps} />);

    const continueButton = screen.getByRole('button', { name: /Continue with Individual Upload/i });
    fireEvent.click(continueButton);

    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('should call onBack when back button is clicked', () => {
    render(<UploadMethodSelector {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: /Back to File Selection/i });
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should show selected method correctly', () => {
    render(<UploadMethodSelector {...defaultProps} selectedMethod="zip" />);

    const zipButton = screen.getByRole('button', { name: /Create ZIP Archive/i });
    expect(zipButton).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<UploadMethodSelector {...defaultProps} disabled={true} />);

    const individualButton = screen.getByRole('button', { name: /Upload Individually/i });
    const zipButton = screen.getByRole('button', { name: /Create ZIP Archive/i });
    const continueButton = screen.getByRole('button', { name: /Continue with Individual Upload/i });
    const backButton = screen.getByRole('button', { name: /Back to File Selection/i });

    expect(individualButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(zipButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(continueButton).toBeDisabled();
    expect(backButton).toBeDisabled();
  });

  it('should show loading state during cost calculation', async () => {
    // Mock a delayed calculation by importing the mock module
    vi.doMock('@/lib/services/costCalculatorService', () => ({
      CostCalculatorService: {
        calculateCostComparison: vi.fn().mockImplementation(() => {
          // Simulate async behavior
          return new Promise(resolve => setTimeout(() => resolve({
            individual: { totalCost: 0.042 },
            zip: { totalCost: 0.022 },
            savings: 0.020,
            savingsPercentage: 47.6,
            recommendation: 'zip',
            reasoning: 'Test reasoning'
          }), 100));
        }),
        formatCurrency: vi.fn((amount) => `$${amount.toFixed(4)}`),
        getCostDisclaimer: vi.fn().mockReturnValue('Cost estimates are approximate and may vary.')
      }
    }));

    render(<UploadMethodSelector {...defaultProps} />);

    expect(screen.getByText('Calculating cost comparison...')).toBeInTheDocument();
  });

  it('should handle empty files array', () => {
    render(<UploadMethodSelector {...defaultProps} files={[]} />);

    expect(screen.getByText('0')).toBeInTheDocument(); // Number of files
    expect(screen.queryByText('Cost Analysis')).not.toBeInTheDocument();
  });

  it('should show cost disclaimer', async () => {
    render(<UploadMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Cost estimates are approximate and may vary.')).toBeInTheDocument();
    });
  });

  it('should update continue button text based on selected method', () => {
    const { rerender } = render(<UploadMethodSelector {...defaultProps} selectedMethod="individual" />);
    expect(screen.getByRole('button', { name: /Continue with Individual Upload/i })).toBeInTheDocument();

    rerender(<UploadMethodSelector {...defaultProps} selectedMethod="zip" />);
    expect(screen.getByRole('button', { name: /Continue with ZIP Upload/i })).toBeInTheDocument();
  });

  it('should display savings when ZIP is cheaper', async () => {
    render(<UploadMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('ZIP saves:')).toBeInTheDocument();
      expect(screen.getByText(/\$0\.0200.*47\.6%/)).toBeInTheDocument();
    });
  });
});