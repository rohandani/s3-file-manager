import JSZip from 'jszip';

export interface ZipCreationProgress {
  current: number;
  total: number;
  currentFile: string;
  percentage: number;
}

export interface ZipCreationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
}

export interface ZipCreationOptions {
  compressionLevel?: number;
  onProgress?: (progress: ZipCreationProgress) => void;
  maxFileSize?: number;
  excludeExtensions?: string[];
}

export class ZipService {
  private static readonly DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private static readonly DEFAULT_EXCLUDED_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar.gz'];

  /**
   * Creates a ZIP archive from an array of files
   */
  static async createZip(
    files: File[], 
    options: ZipCreationOptions = {}
  ): Promise<ZipCreationResult> {
    const {
      compressionLevel = 6,
      onProgress,
      maxFileSize = this.DEFAULT_MAX_FILE_SIZE,
      excludeExtensions = this.DEFAULT_EXCLUDED_EXTENSIONS
    } = options;

    try {
      // Validate inputs
      if (!files || files.length === 0) {
        return {
          success: false,
          error: 'No files provided for ZIP creation',
          originalSize: 0
        };
      }

      // Calculate total original size
      const originalSize = files.reduce((total, file) => total + file.size, 0);

      // Check if total size exceeds limit
      if (originalSize > maxFileSize) {
        return {
          success: false,
          error: `Total file size (${this.formatBytes(originalSize)}) exceeds maximum allowed (${this.formatBytes(maxFileSize)})`,
          originalSize
        };
      }

      // Filter out excluded file types
      const validFiles = files.filter(file => {
        const extension = this.getFileExtension(file.name).toLowerCase();
        return !excludeExtensions.includes(extension);
      });

      if (validFiles.length === 0) {
        return {
          success: false,
          error: 'No valid files found after filtering excluded types',
          originalSize
        };
      }

      // Create ZIP instance
      const zip = new JSZip();
      
      // Add files to ZIP with progress tracking
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: validFiles.length,
            currentFile: file.name,
            percentage: Math.round(((i + 1) / validFiles.length) * 100)
          });
        }

        // Handle potential filename conflicts
        const safeName = this.getSafeFileName(file.name, zip);
        
        // Add file to ZIP
        zip.file(safeName, file, {
          compression: 'DEFLATE',
          compressionOptions: {
            level: compressionLevel
          }
        });
      }

      // Generate ZIP blob
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: compressionLevel
        }
      });

      const compressedSize = blob.size;
      const compressionRatio = originalSize > 0 ? (1 - (compressedSize / originalSize)) * 100 : 0;

      return {
        success: true,
        blob,
        originalSize,
        compressedSize,
        compressionRatio
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during ZIP creation',
        originalSize: files.reduce((total, file) => total + file.size, 0)
      };
    }
  }

  /**
   * Validates if files can be zipped together
   */
  static validateFilesForZip(files: File[], maxSize: number = this.DEFAULT_MAX_FILE_SIZE): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!files || files.length === 0) {
      errors.push('No files selected for ZIP creation');
      return { isValid: false, errors, warnings };
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxSize) {
      errors.push(`Total file size (${this.formatBytes(totalSize)}) exceeds maximum (${this.formatBytes(maxSize)})`);
    }

    // Check for duplicate names
    const fileNames = new Set<string>();
    const duplicates: string[] = [];
    
    files.forEach(file => {
      if (fileNames.has(file.name)) {
        duplicates.push(file.name);
      } else {
        fileNames.add(file.name);
      }
    });

    if (duplicates.length > 0) {
      warnings.push(`Duplicate filenames found: ${duplicates.join(', ')}. Files will be renamed automatically.`);
    }

    // Check for already compressed files
    const compressedFiles = files.filter(file => {
      const ext = this.getFileExtension(file.name).toLowerCase();
      return this.DEFAULT_EXCLUDED_EXTENSIONS.includes(ext);
    });

    if (compressedFiles.length > 0) {
      warnings.push(`Some files are already compressed and may not benefit from ZIP compression: ${compressedFiles.map(f => f.name).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Estimates compression ratio for files
   */
  static estimateCompressionRatio(files: File[]): number {
    // Simplified estimation based on file types
    let totalSize = 0;
    let estimatedCompressedSize = 0;

    files.forEach(file => {
      const extension = this.getFileExtension(file.name).toLowerCase();
      let compressionRatio = 0.3; // Default 30% compression

      // Different file types compress differently
      if (['.txt', '.csv', '.json', '.xml', '.html', '.css', '.js'].includes(extension)) {
        compressionRatio = 0.7; // Text files compress well
      } else if (['.jpg', '.jpeg', '.png', '.mp3', '.mp4', '.zip', '.rar'].includes(extension)) {
        compressionRatio = 0.05; // Already compressed files
      } else if (['.pdf', '.doc', '.docx'].includes(extension)) {
        compressionRatio = 0.2; // Moderate compression
      }

      totalSize += file.size;
      estimatedCompressedSize += file.size * (1 - compressionRatio);
    });

    return totalSize > 0 ? ((totalSize - estimatedCompressedSize) / totalSize) * 100 : 0;
  }

  /**
   * Generates a unique filename if conflicts exist
   */
  private static getSafeFileName(originalName: string, zip: JSZip): string {
    let safeName = originalName;
    let counter = 1;

    while (zip.file(safeName)) {
      const extension = this.getFileExtension(originalName);
      const basename = originalName.replace(extension, '');
      safeName = `${basename}_${counter}${extension}`;
      counter++;
    }

    return safeName;
  }

  /**
   * Gets file extension including the dot
   */
  private static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex);
  }

  /**
   * Formats bytes into human readable format
   */
  private static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}