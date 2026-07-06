'use client'

import { useState, useEffect } from 'react';
import { CostCalculatorService, CostComparison } from '@/lib/services/costCalculatorService';
import { ZipService } from '@/lib/services/zipService';

export type UploadMethod = 'individual' | 'zip';

interface UploadMethodSelectorProps {
  files: File[];
  selectedMethod: UploadMethod;
  onMethodChange: (method: UploadMethod) => void;
  onNext: () => void;
  onBack: () => void;
  disabled?: boolean;
}

export default function UploadMethodSelector({
  files,
  selectedMethod,
  onMethodChange,
  onNext,
  onBack,
  disabled = false
}: UploadMethodSelectorProps) {
  const [costComparison, setCostComparison] = useState<CostComparison | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Calculate cost comparison when files change
  useEffect(() => {
    if (files.length === 0) {
      setCostComparison(null);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      // Estimate compression ratio for the files
      const estimatedCompressionRatio = ZipService.estimateCompressionRatio(files) / 100;
      
      // Calculate cost comparison
      const comparison = CostCalculatorService.calculateCostComparison(
        files,
        estimatedCompressionRatio
      );
      
      setCostComparison(comparison);
    } catch (error) {
      setCalculationError('Unable to calculate cost comparison');
      console.error('Cost calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [files]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const averageFileSize = files.length > 0 ? totalSize / files.length : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Upload Method
        </h2>
        <p className="text-gray-600">
          Select how you'd like to upload your files to optimize costs and organization
        </p>
      </div>

      {/* File Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 block">Files</span>
            <span className="font-medium text-lg">{files.length}</span>
          </div>
          <div>
            <span className="text-gray-600 block">Total Size</span>
            <span className="font-medium text-lg">{formatBytes(totalSize)}</span>
          </div>
          <div>
            <span className="text-gray-600 block">Average Size</span>
            <span className="font-medium text-lg">{formatBytes(averageFileSize)}</span>
          </div>
          <div>
            <span className="text-gray-600 block">Largest File</span>
            <span className="font-medium text-lg">
              {formatBytes(Math.max(...files.map(f => f.size)))}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      {isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Calculating cost comparison...</span>
          </div>
        </div>
      )}

      {calculationError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-yellow-700">{calculationError}</span>
          </div>
        </div>
      )}

      {costComparison && !isCalculating && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cost Analysis</h3>
          
          {/* Cost recommendation */}
          <div className={`mb-4 p-3 rounded-lg border ${
            costComparison.recommendation === 'zip' 
              ? 'bg-green-50 border-green-200' 
              : costComparison.recommendation === 'individual'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 mt-0.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {costComparison.recommendation === 'zip' && 'ZIP Upload Recommended'}
                  {costComparison.recommendation === 'individual' && 'Individual Upload Recommended'}
                  {costComparison.recommendation === 'neutral' && 'Both Methods Are Viable'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {costComparison.reasoning}
                </p>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Individual Upload</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage (monthly):</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.individual.storageCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requests:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.individual.requestCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data transfer:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.individual.dataTransferCost)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.individual.totalCost)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">ZIP Upload</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage (monthly):</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.zip.storageCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requests:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.zip.requestCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data transfer:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.zip.dataTransferCost)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span>{CostCalculatorService.formatCurrency(costComparison.zip.totalCost)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings display */}
          {Math.abs(costComparison.savings) > 0.001 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {costComparison.savings > 0 ? 'ZIP saves:' : 'Individual saves:'}
                </span>
                <span className={`font-medium ${
                  costComparison.savings > 0 ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {CostCalculatorService.formatCurrency(Math.abs(costComparison.savings))} 
                  ({Math.abs(costComparison.savingsPercentage).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onMethodChange('individual')}
          disabled={disabled}
          className={`p-6 border-2 rounded-lg text-left transition-colors ${
            selectedMethod === 'individual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center mb-3">
            <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
              selectedMethod === 'individual'
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {selectedMethod === 'individual' && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Individually
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Upload each file separately to S3
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Better for mixed file types</li>
            <li>• Easier to manage individual files</li>
            <li>• Selective downloading</li>
            <li>• {files.length} separate uploads</li>
          </ul>
        </button>

        <button
          onClick={() => onMethodChange('zip')}
          disabled={disabled}
          className={`p-6 border-2 rounded-lg text-left transition-colors ${
            selectedMethod === 'zip'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center mb-3">
            <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
              selectedMethod === 'zip'
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {selectedMethod === 'zip' && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Create ZIP Archive
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Compress files into a single ZIP archive
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Reduces storage costs</li>
            <li>• Faster transfer for many files</li>
            <li>• Lower request costs</li>
            <li>• Single archive file</li>
          </ul>
        </button>
      </div>

      {/* Cost disclaimer */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
        <p>{CostCalculatorService.getCostDisclaimer()}</p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={disabled}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Back to File Selection
        </button>
        <button
          onClick={onNext}
          disabled={disabled}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue with {selectedMethod === 'zip' ? 'ZIP' : 'Individual'} Upload →
        </button>
      </div>
    </div>
  );
}