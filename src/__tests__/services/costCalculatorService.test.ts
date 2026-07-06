import { describe, it, expect } from 'vitest';
import { CostCalculatorService } from '@/lib/services/costCalculatorService';

describe('CostCalculatorService', () => {
  // Helper function to create mock files
  const createMockFile = (name: string, size: number, type: string = 'text/plain'): File => {
    const content = 'x'.repeat(size);
    return new File([content], name, { type });
  };

  const mockPricing = {
    storagePerGBMonth: 0.023,
    putRequestPer1000: 0.005,
    getRequestPer1000: 0.0004,
    dataTransferPerGB: 0.09
  };

  describe('calculateCostComparison', () => {
    it('should calculate costs for individual vs ZIP upload', () => {
      const files = [
        createMockFile('file1.txt', 1024 * 1024), // 1MB
        createMockFile('file2.txt', 1024 * 1024)  // 1MB
      ];

      const comparison = CostCalculatorService.calculateCostComparison(
        files,
        0.3, // 30% compression
        mockPricing
      );

      expect(comparison.individual).toBeDefined();
      expect(comparison.zip).toBeDefined();
      expect(comparison.individual.totalCost).toBeGreaterThan(0);
      expect(comparison.zip.totalCost).toBeGreaterThan(0);
      expect(comparison.savings).toBeDefined();
      expect(comparison.savingsPercentage).toBeDefined();
    });

    it('should show ZIP savings for multiple small files', () => {
      // Many small files should benefit from ZIP
      const files = Array.from({ length: 20 }, (_, i) => 
        createMockFile(`file${i}.txt`, 10 * 1024) // 10KB each
      );

      const comparison = CostCalculatorService.calculateCostComparison(
        files,
        0.5, // 50% compression for text files
        mockPricing
      );

      expect(comparison.zip.totalCost).toBeLessThan(comparison.individual.totalCost);
      expect(comparison.savings).toBeGreaterThan(0);
      expect(comparison.savingsPercentage).toBeGreaterThan(0);
    });

    it('should account for different compression ratios', () => {
      const files = [createMockFile('largefile.txt', 10 * 1024 * 1024)]; // 10MB

      const highCompression = CostCalculatorService.calculateCostComparison(
        files, 0.7, mockPricing // 70% compression
      );

      const lowCompression = CostCalculatorService.calculateCostComparison(
        files, 0.1, mockPricing // 10% compression
      );

      expect(highCompression.zip.totalCost).toBeLessThan(lowCompression.zip.totalCost);
      expect(highCompression.savings).toBeGreaterThan(lowCompression.savings);
    });
  });

  describe('determineRecommendation', () => {
    it('should recommend ZIP for significant savings', () => {
      const files = Array.from({ length: 15 }, (_, i) => 
        createMockFile(`file${i}.txt`, 50 * 1024) // Many small text files
      );

      const comparison = CostCalculatorService.calculateCostComparison(
        files, 0.6, mockPricing
      );

      expect(comparison.recommendation).toBe('zip');
      expect(comparison.reasoning).toContain('recommended');
    });

    it('should recommend individual for few large files', () => {
      const files = [
        createMockFile('largefile1.bin', 50 * 1024 * 1024), // 50MB binary
        createMockFile('largefile2.bin', 50 * 1024 * 1024)  // 50MB binary
      ];

      const comparison = CostCalculatorService.calculateCostComparison(
        files, 0.05, mockPricing // Very low compression for binary files
      );

      expect(comparison.recommendation).toBe('individual');
      expect(comparison.reasoning).toContain('management');
    });

    it('should recommend ZIP for many small files regardless of compression', () => {
      const files = Array.from({ length: 25 }, (_, i) => 
        createMockFile(`image${i}.jpg`, 500 * 1024) // Many small images
      );

      const comparison = CostCalculatorService.calculateCostComparison(
        files, 0.05, mockPricing // Low compression for images
      );

      expect(comparison.recommendation).toBe('zip');
      expect(comparison.reasoning).toContain('many small files');
    });

    it('should be neutral for marginal differences', () => {
      const files = [
        createMockFile('file1.pdf', 5 * 1024 * 1024),
        createMockFile('file2.pdf', 5 * 1024 * 1024)
      ];

      const comparison = CostCalculatorService.calculateCostComparison(
        files, 0.15, mockPricing
      );

      // With moderate files and compression, difference should be small
      if (Math.abs(comparison.savingsPercentage) < 5) {
        expect(['neutral', 'individual']).toContain(comparison.recommendation);
      }
    });
  });

  describe('formatCurrency', () => {
    it('should format small amounts correctly', () => {
      expect(CostCalculatorService.formatCurrency(0.001)).toBe('$0.001');
      expect(CostCalculatorService.formatCurrency(0.0001)).toBe('$0.0001');
    });

    it('should format larger amounts correctly', () => {
      expect(CostCalculatorService.formatCurrency(1.23)).toBe('$1.23');
      expect(CostCalculatorService.formatCurrency(123.456)).toBe('$123.456');
    });

    it('should handle zero amounts', () => {
      expect(CostCalculatorService.formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('getMonthlyStorageCost', () => {
    it('should calculate storage cost correctly', () => {
      const sizeBytes = 1024 * 1024 * 1024; // 1GB
      const cost = CostCalculatorService.getMonthlyStorageCost(sizeBytes, mockPricing);

      expect(cost).toBe(mockPricing.storagePerGBMonth);
    });

    it('should handle fractional GB amounts', () => {
      const sizeBytes = 512 * 1024 * 1024; // 0.5GB
      const cost = CostCalculatorService.getMonthlyStorageCost(sizeBytes, mockPricing);

      expect(cost).toBe(mockPricing.storagePerGBMonth * 0.5);
    });
  });

  describe('getRequestCost', () => {
    it('should calculate PUT request costs', () => {
      const cost = CostCalculatorService.getRequestCost(2000, 'PUT', mockPricing);
      const expectedCost = (2000 / 1000) * mockPricing.putRequestPer1000;

      expect(cost).toBe(expectedCost);
    });

    it('should calculate GET request costs', () => {
      const cost = CostCalculatorService.getRequestCost(5000, 'GET', mockPricing);
      const expectedCost = (5000 / 1000) * mockPricing.getRequestPer1000;

      expect(cost).toBe(expectedCost);
    });

    it('should handle fractional thousands', () => {
      const cost = CostCalculatorService.getRequestCost(500, 'PUT', mockPricing);
      const expectedCost = (500 / 1000) * mockPricing.putRequestPer1000;

      expect(cost).toBe(expectedCost);
    });
  });

  describe('isPricingDataAvailable', () => {
    it('should return true by default', () => {
      expect(CostCalculatorService.isPricingDataAvailable()).toBe(true);
    });
  });

  describe('getCostDisclaimer', () => {
    it('should return a meaningful disclaimer', () => {
      const disclaimer = CostCalculatorService.getCostDisclaimer();

      expect(disclaimer).toContain('approximate');
      expect(disclaimer).toContain('AWS S3');
      expect(disclaimer).toContain('may vary');
    });
  });
});