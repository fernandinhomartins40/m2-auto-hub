// src/hooks/useValidation.ts - Hook para validação em tempo real

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import {
  validateData,
  validatePartial,
  ValidationResult,
  ValidationError,
  groupErrorsByField
} from '@/utils/validation';

export interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface UseValidationReturn<T> {
  // Estados
  data: Partial<T>;
  errors: Record<string, string[]>;
  isValid: boolean;
  isValidating: boolean;
  hasErrors: boolean;
  touched: Record<string, boolean>;

  // Métodos
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  setData: (data: Partial<T>) => void;
  validate: () => Promise<ValidationResult<T>>;
  validateField: (field: keyof T) => void;
  reset: (newData?: Partial<T>) => void;
  clearErrors: () => void;
  getFieldError: (field: keyof T) => string | undefined;
  hasFieldError: (field: keyof T) => boolean;
  isFieldTouched: (field: keyof T) => boolean;

  // Helpers para formulários
  getFieldProps: (field: keyof T) => {
    value: T[keyof T] | undefined;
    onChange: (value: T[keyof T]) => void;
    onBlur: () => void;
    error: string | undefined;
    hasError: boolean;
    touched: boolean;
  };
}

export function useValidation<T>(
  schema: z.ZodSchema<T>,
  initialData?: Partial<T>,
  options: UseValidationOptions = {}
): UseValidationReturn<T> {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  // Estados
  const [data, setDataState] = useState<Partial<T>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounce timeout
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Estados computados
  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0 && Object.values(errors).some(arr => arr.length > 0);
  }, [errors]);

  const isValid = useMemo(() => {
    if (hasErrors) return false;

    // Verificar se dados são válidos segundo o schema
    const result = validateData(schema, data);
    return result.success;
  }, [data, hasErrors, schema]);

  // Executar validação
  const validate = useCallback(async (): Promise<ValidationResult<T>> => {
    setIsValidating(true);

    try {
      const result = validateData(schema, data);

      if (result.success) {
        setErrors({});
        return result;
      } else {
        const groupedErrors = groupErrorsByField(result.errors || []);
        setErrors(groupedErrors);
        return result;
      }
    } finally {
      setIsValidating(false);
    }
  }, [schema, data]);

  // Validar campo específico
  const validateField = useCallback((field: keyof T) => {
    const fieldValue = data[field];

    // Criar um schema parcial apenas para este campo
    try {
      const fieldSchema = schema.shape?.[field as string];
      if (fieldSchema) {
        const result = validateData(fieldSchema, fieldValue);

        setErrors(prev => ({
          ...prev,
          [field as string]: result.success ? [] : (result.errors?.map(e => e.message) || [])
        }));
      }
    } catch (error) {
      // Se não conseguir validar o campo individualmente, validar tudo
      validatePartial(schema, { [field]: fieldValue }).then(result => {
        if (!result.success) {
          const fieldErrors = result.errors?.filter(e => e.field === field as string) || [];
          setErrors(prev => ({
            ...prev,
            [field as string]: fieldErrors.map(e => e.message)
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            [field as string]: []
          }));
        }
      });
    }
  }, [data, schema]);

  // Definir valor de campo
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setDataState(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro se havia
    setErrors(prev => ({
      ...prev,
      [field as string]: []
    }));

    // Validar se habilitado
    if (validateOnChange) {
      // Debounce a validação
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      const timeout = setTimeout(() => {
        validateField(field);
      }, debounceMs);

      setDebounceTimeout(timeout);
    }
  }, [validateOnChange, debounceMs, debounceTimeout, validateField]);

  // Marcar campo como tocado
  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [field as string]: isTouched
    }));

    // Validar se habilitado e foi marcado como tocado
    if (validateOnBlur && isTouched) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Definir todos os dados
  const setData = useCallback((newData: Partial<T>) => {
    setDataState(newData);
    setErrors({});

    if (validateOnChange) {
      setTimeout(() => validate(), debounceMs);
    }
  }, [validate, validateOnChange, debounceMs]);

  // Reset
  const reset = useCallback((newData?: Partial<T>) => {
    setDataState(newData || {});
    setErrors({});
    setTouched({});

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      setDebounceTimeout(null);
    }
  }, [debounceTimeout]);

  // Limpar erros
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Helpers
  const getFieldError = useCallback((field: keyof T): string | undefined => {
    const fieldErrors = errors[field as string];
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
  }, [errors]);

  const hasFieldError = useCallback((field: keyof T): boolean => {
    const fieldErrors = errors[field as string];
    return fieldErrors ? fieldErrors.length > 0 : false;
  }, [errors]);

  const isFieldTouched = useCallback((field: keyof T): boolean => {
    return touched[field as string] || false;
  }, [touched]);

  // Props para campos de formulário
  const getFieldProps = useCallback((field: keyof T) => {
    return {
      value: data[field],
      onChange: (value: T[keyof T]) => setFieldValue(field, value),
      onBlur: () => setFieldTouched(field, true),
      error: getFieldError(field),
      hasError: hasFieldError(field),
      touched: isFieldTouched(field),
    };
  }, [data, setFieldValue, setFieldTouched, getFieldError, hasFieldError, isFieldTouched]);

  // Cleanup no unmount
  useMemo(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    // Estados
    data,
    errors,
    isValid,
    isValidating,
    hasErrors,
    touched,

    // Métodos
    setFieldValue,
    setFieldTouched,
    setData,
    validate,
    validateField,
    reset,
    clearErrors,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    getFieldProps,
  };
}

// Hook especializado para formulários
export function useFormValidation<T>(
  schema: z.ZodSchema<T>,
  initialData?: Partial<T>,
  onSubmit?: (data: T) => void | Promise<void>
) {
  const validation = useValidation(schema, initialData, {
    validateOnBlur: true,
    validateOnChange: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setIsSubmitting(true);
    setSubmitErrors([]);

    try {
      const result = await validation.validate();

      if (result.success && result.data && onSubmit) {
        await onSubmit(result.data);
      } else if (!result.success) {
        setSubmitErrors(result.errors?.map(e => e.message) || ['Dados inválidos']);
      }
    } catch (error) {
      setSubmitErrors([
        error instanceof Error ? error.message : 'Erro ao enviar formulário'
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [validation, onSubmit]);

  const canSubmit = useMemo(() => {
    return validation.isValid && !isSubmitting && !validation.isValidating;
  }, [validation.isValid, isSubmitting, validation.isValidating]);

  return {
    ...validation,
    isSubmitting,
    submitErrors,
    canSubmit,
    handleSubmit,
  };
}