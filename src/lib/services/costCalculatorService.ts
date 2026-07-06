// Cost calculation service for AWS S3 operations
// Note: This uses approximate pricing and should not be used for exact billing

export interface CostBreakdown {
  storageCost: number;
  requestCost: number;
  dataTransferCost: number;
  totalCost: number;
}

export interface CostComparison {
  individual: CostBreakdown;
  zip: CostBreakdown;
  savings: number;
  savingsPercentage: number;
  recommendation: 'individual' | 'zip' | 'neutral';
  reasoning: string;
}

export interface S3PricingConfig {
  // Storage costs per GB per month (Standard tier)
  storagePerGBMonth: number;
  // Request costs
  putRequestPer1000: number;
  getRequestPer1000: number;
  // Data transfer costs per GB
  dataTransferPerGB: number;
}

export class CostCalculatorService {
  // Default AWS S3 pricing (US East 1, as of 2024 - approximate)
  private static readonly DEFAULT_PRICING: S3PricingConfig = {
    storagePerGBMonth: 0.023, // $0.023 per GB per month
    putRequestPer1000: 0.005, // $0.005 per 1,000 PUT requests
    getRequestPer1000: 0.0004, // $0.0004 per 1,000 GET requests
    dataTransferPerGB: 0.09 // $0.09 per GB for data transfer out
  };

  /**
   * Calculates cost comparison between individual and ZIP upload methods
   */
  static calculateCostComparison(
    files: File[],
    zipCompressionRatio: number = 0.3, // 30% compression by default
    pricing: S3PricingConfig = this.DEFAULT_PRICING
  ): CostComparison {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    const zipSizeGB = totalSizeGB * (1 - zipCompressionRatio);

    // Calculate costs for individual file uploads
    const individualCosts = this.calculateIndividualUploadCosts(
      files,
      pricing
    );

    // Calculate costs for ZIP upload
    const zipCosts = this.calculateZipUploadCosts(
      totalSizeGB,
      zipSizeGB,
      pricing
    );

    // Calculate savings
    const savings = individualCosts.totalCost - zipCosts.totalCost;
    const savingsPercentage = individualCosts.totalCost > 0 
      ? (savings / individualCosts.totalCost) * 100 
      : 0;

    // Determine recommendation
    const { recommendation, reasoning } = this.determineRecommendation(
      files,
      savings,
      savingsPercentage,
      zipCompressionRatio
    );

    return {
      individual: individualCosts,
      zip: zipCosts,
      savings,
      savingsPercentage,
      recommendation,
      reasoning
    };
  }

  /**
   * Calculates costs for uploading files individually
   */
  private static calculateIndividualUploadCosts(
    files: File[],
    pricing: S3PricingConfig
  ): CostBreakdown {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);

    // Storage cost (monthly)
    const storageCost = totalSizeGB * pricing.storagePerGBMonth;

    // Request cost (PUT requests for each file)
    const putRequests = files.length;
    const requestCost = (putRequests / 1000) * pricing.putRequestPer1000;

    // Data transfer cost (assuming files are downloaded occasionally)
    const dataTransferCost = totalSizeGB * pricing.dataTransferPerGB * 0.1; // Assume 10% download rate

    const totalCost = storageCost + requestCost + dataTransferCost;

    return {
      storageCost,
      requestCost,
      dataTransferCost,
      totalCost
    };
  }

  /**
   * Calculates costs for uploading as ZIP archive
   */
  private static calculateZipUploadCosts(
    originalSizeGB: number,
    compressedSizeGB: number,
    pricing: S3PricingConfig
  ): CostBreakdown {
    // Storage cost (monthly, based on compressed size)
    const storageCost = compressedSizeGB * pricing.storagePerGBMonth;

    // Request cost (single PUT request for ZIP file)
    const requestCost = pricing.putRequestPer1000 / 1000;

    // Data transfer cost (based on compressed size)
    const dataTransferCost = compressedSizeGB * pricing.dataTransferPerGB * 0.1; // Assume 10% download rate

    const totalCost = storageCost + requestCost + dataTransferCost;

    return {
      storageCost,
      requestCost,
      dataTransferCost,
      totalCost
    };
  }

  /**
   * Determines the best recommendation based on various factors
   */
  private static determineRecommendation(
    files: File[],
    savings: number,
    savingsPercentage: number,
    compressionRatio: number
  ): { recommendation: 'individual' | 'zip' | 'neutral'; reasoning: string } {
    
    // If savings are significant (>10% and >$0.01), recommend ZIP
    if (savingsPercentage > 10 && savings > 0.01) {
      return {
        recommendation: 'zip',
        reasoning: `ZIP upload saves ${savingsPercentage.toFixed(1)}% in costs (${this.formatCurrency(savings)}) due to reduced storage and transfer costs.`
      };
    }

    // If there are many small files (>10 files, average <1MB), recommend ZIP
    const averageFileSize = files.reduce((sum, file) => sum + file.size, 0) / files.length;
    if (files.length > 10 && averageFileSize < 1024 * 1024) {
      return {
        recommendation: 'zip',
        reasoning: 'ZIP is recommended for many small files to reduce request costs and improve transfer efficiency.'
      };
    }

    // If compression ratio is low (<10%), recommend individual
    if (compressionRatio < 0.1) {
      return {
        recommendation: 'individual',
        reasoning: 'Files appear to be already compressed or binary. Individual upload provides better management flexibility.'
      };
    }

    // If there are very few files (<3), individual might be better
    if (files.length < 3) {
      return {
        recommendation: 'individual',
        reasoning: 'For few files, individual upload provides easier management and selective downloading.'
      };
    }

    // If savings are minimal, remain neutral but lean toward individual for flexibility
    if (Math.abs(savingsPercentage) < 5) {
      return {
        recommendation: 'neutral',
        reasoning: 'Both methods have similar costs. Consider individual upload for easier file management or ZIP for simpler organization.'
      };
    }

    // Default to individual for better file management
    return {
      recommendation: 'individual',
      reasoning: 'Individual upload recommended for better file management and selective access.'
    };
  }

  /**
   * Formats cost as currency string
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  }

  /**
   * Gets estimated monthly storage cost for a given size
   */
  static getMonthlyStorageCost(
    sizeBytes: number,
    pricing: S3PricingConfig = this.DEFAULT_PRICING
  ): number {
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    return sizeGB * pricing.storagePerGBMonth;
  }

  /**
   * Gets request cost for a number of operations
   */
  static getRequestCost(
    numberOfRequests: number,
    requestType: 'PUT' | 'GET' = 'PUT',
    pricing: S3PricingConfig = this.DEFAULT_PRICING
  ): number {
    const costPer1000 = requestType === 'PUT' 
      ? pricing.putRequestPer1000 
      : pricing.getRequestPer1000;
    
    return (numberOfRequests / 1000) * costPer1000;
  }

  /**
   * Validates if cost calculation is available
   */
  static isPricingDataAvailable(): boolean {
    // In a real implementation, this would check if we have current pricing data
    // For now, we'll assume it's always available
    return true;
  }

  /**
   * Gets a disclaimer about cost estimates
   */
  static getCostDisclaimer(): string {
    return "Cost estimates are approximate and based on AWS S3 Standard storage pricing. Actual costs may vary based on your specific AWS pricing plan, region, and usage patterns. These estimates do not include data retrieval fees, lifecycle transitions, or other optional features.";
  }
}