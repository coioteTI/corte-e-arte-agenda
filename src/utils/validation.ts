// Utilitários de validação centralizados
export const validation = {
  // Validação de email
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validação de telefone brasileiro
  phone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  },

  // Validação de campos obrigatórios
  required: (value: string | number | undefined | null): boolean => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value) && value > 0;
    return value !== null && value !== undefined;
  },

  // Validação de preço
  price: (price: string | number): boolean => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(numPrice) && numPrice > 0;
  },

  // Validação de duração
  duration: (duration: string | number): boolean => {
    const numDuration = typeof duration === 'string' ? parseInt(duration) : duration;
    return !isNaN(numDuration) && numDuration > 0 && numDuration <= 480; // Max 8 horas
  },

  // Validação de data futura
  futureDate: (date: Date | string): boolean => {
    const inputDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  }
};

// Tipos para formulários
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validação de agendamento
export const validateAppointment = (data: {
  clientName: string;
  clientPhone: string;
  serviceId?: string;
  professionalId?: string;
  date?: Date;
  time?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!validation.required(data.clientName)) {
    errors.push("Nome do cliente é obrigatório");
  }

  if (!validation.required(data.clientPhone) || !validation.phone(data.clientPhone)) {
    errors.push("Telefone válido é obrigatório");
  }

  if (!validation.required(data.serviceId)) {
    errors.push("Selecione um serviço");
  }

  if (!validation.required(data.professionalId)) {
    errors.push("Selecione um profissional");
  }

  if (!data.date || !validation.futureDate(data.date)) {
    errors.push("Selecione uma data válida");
  }

  if (!validation.required(data.time)) {
    errors.push("Selecione um horário");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validação de serviço
export const validateService = (data: {
  name: string;
  price: string;
  duration: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!validation.required(data.name)) {
    errors.push("Nome do serviço é obrigatório");
  }

  if (!validation.required(data.price) || !validation.price(data.price)) {
    errors.push("Preço válido é obrigatório");
  }

  if (!validation.required(data.duration) || !validation.duration(data.duration)) {
    errors.push("Duração válida é obrigatória (1-480 minutos)");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validação de profissional
export const validateProfessional = (data: {
  name: string;
  email?: string;
  phone?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!validation.required(data.name)) {
    errors.push("Nome do profissional é obrigatório");
  }

  if (data.email && !validation.email(data.email)) {
    errors.push("Email inválido");
  }

  if (data.phone && !validation.phone(data.phone)) {
    errors.push("Telefone inválido");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};