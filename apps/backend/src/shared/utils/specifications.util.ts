/**
 * Specifications Utility
 *
 * Helpers for working with product and vehicle specifications
 */

export interface Specification {
  name: string;
  value: string | number | boolean;
  unit?: string;
  category?: string;
}

export interface SpecificationCategory {
  name: string;
  icon?: string;
  specifications: Specification[];
}

export class SpecificationsUtil {
  /**
   * Validate specification structure
   */
  static validate(specs: any): boolean {
    if (!specs || typeof specs !== 'object') {
      return false;
    }

    // Check if it's a flat object or categorized
    const values = Object.values(specs);

    if (values.length === 0) {
      return true; // Empty specs are valid
    }

    return true; // Basic validation - can be enhanced
  }

  /**
   * Normalize specifications to a standard format
   */
  static normalize(specs: any): Record<string, any> {
    if (!specs) {
      return {};
    }

    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(specs)) {
      // Remove empty values
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Normalize key (lowercase, no special chars)
      const normalizedKey = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      normalized[normalizedKey] = value;
    }

    return normalized;
  }

  /**
   * Categorize flat specifications
   */
  static categorize(specs: Record<string, any>): SpecificationCategory[] {
    const categories = new Map<string, Specification[]>();

    for (const [key, value] of Object.entries(specs)) {
      const category = this.inferCategory(key);

      if (!categories.has(category)) {
        categories.set(category, []);
      }

      categories.get(category)!.push({
        name: this.humanizeKey(key),
        value,
        category,
      });
    }

    return Array.from(categories.entries()).map(([name, specifications]) => ({
      name: this.humanizeKey(name),
      specifications,
    }));
  }

  /**
   * Infer category from specification key
   */
  private static inferCategory(key: string): string {
    const lowerKey = key.toLowerCase();

    // Engine related
    if (lowerKey.includes('engine') || lowerKey.includes('motor') ||
        lowerKey.includes('cylinder') || lowerKey.includes('horsepower') ||
        lowerKey.includes('torque') || lowerKey.includes('displacement')) {
      return 'engine';
    }

    // Dimensions
    if (lowerKey.includes('length') || lowerKey.includes('width') ||
        lowerKey.includes('height') || lowerKey.includes('weight') ||
        lowerKey.includes('dimension') || lowerKey.includes('size')) {
      return 'dimensions';
    }

    // Performance
    if (lowerKey.includes('speed') || lowerKey.includes('acceleration') ||
        lowerKey.includes('performance') || lowerKey.includes('consumption') ||
        lowerKey.includes('fuel')) {
      return 'performance';
    }

    // Transmission
    if (lowerKey.includes('transmission') || lowerKey.includes('gearbox') ||
        lowerKey.includes('gear')) {
      return 'transmission';
    }

    // Materials
    if (lowerKey.includes('material') || lowerKey.includes('composition') ||
        lowerKey.includes('made_of')) {
      return 'materials';
    }

    return 'general';
  }

  /**
   * Convert snake_case or camelCase to human readable
   */
  private static humanizeKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Flatten categorized specifications
   */
  static flatten(categories: SpecificationCategory[]): Record<string, any> {
    const flat: Record<string, any> = {};

    for (const category of categories) {
      for (const spec of category.specifications) {
        const key = spec.name.toLowerCase().replace(/\s+/g, '_');
        flat[key] = spec.value;
      }
    }

    return flat;
  }

  /**
   * Compare two specification sets
   */
  static compare(
    specs1: Record<string, any>,
    specs2: Record<string, any>
  ): {
    common: Record<string, any>;
    differences: Record<string, { spec1: any; spec2: any }>;
    unique1: Record<string, any>;
    unique2: Record<string, any>;
  } {
    const common: Record<string, any> = {};
    const differences: Record<string, { spec1: any; spec2: any }> = {};
    const unique1: Record<string, any> = {};
    const unique2: Record<string, any> = { ...specs2 };

    for (const [key, value1] of Object.entries(specs1)) {
      if (key in specs2) {
        delete unique2[key];

        if (specs2[key] === value1) {
          common[key] = value1;
        } else {
          differences[key] = {
            spec1: value1,
            spec2: specs2[key],
          };
        }
      } else {
        unique1[key] = value1;
      }
    }

    return { common, differences, unique1, unique2 };
  }

  /**
   * Filter specifications by search term
   */
  static filter(specs: Record<string, any>, searchTerm: string): Record<string, any> {
    const term = searchTerm.toLowerCase();
    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(specs)) {
      const keyMatch = key.toLowerCase().includes(term);
      const valueMatch = String(value).toLowerCase().includes(term);

      if (keyMatch || valueMatch) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Extract numeric specifications for calculations
   */
  static extractNumeric(specs: Record<string, any>): Record<string, number> {
    const numeric: Record<string, number> = {};

    for (const [key, value] of Object.entries(specs)) {
      if (typeof value === 'number') {
        numeric[key] = value;
      } else if (typeof value === 'string') {
        // Try to extract number from string (e.g., "150 HP" -> 150)
        const match = value.match(/[\d.]+/);
        if (match) {
          const num = parseFloat(match[0]);
          if (!isNaN(num)) {
            numeric[key] = num;
          }
        }
      }
    }

    return numeric;
  }

  /**
   * Merge multiple specification sets
   */
  static merge(...specsSets: Record<string, any>[]): Record<string, any> {
    const merged: Record<string, any> = {};

    for (const specs of specsSets) {
      for (const [key, value] of Object.entries(specs)) {
        // Later values override earlier ones
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Get specification by key (case-insensitive, fuzzy)
   */
  static get(specs: Record<string, any>, key: string): any {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Try exact match first
    if (normalizedKey in specs) {
      return specs[normalizedKey];
    }

    // Try fuzzy match
    for (const [specKey, value] of Object.entries(specs)) {
      const normalizedSpecKey = specKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (normalizedSpecKey === normalizedKey) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Convert specifications to display format
   */
  static toDisplayFormat(specs: Record<string, any>): Array<{
    label: string;
    value: string;
    category?: string;
  }> {
    return Object.entries(specs).map(([key, value]) => ({
      label: this.humanizeKey(key),
      value: this.formatValue(value),
      category: this.inferCategory(key),
    }));
  }

  /**
   * Format value for display
   */
  private static formatValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
