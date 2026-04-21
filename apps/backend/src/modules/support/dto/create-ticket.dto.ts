import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum TicketCategory {
  ORDER_ISSUE = 'ORDER_ISSUE',
  PRODUCT_QUESTION = 'PRODUCT_QUESTION',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',
  REVISION_QUESTION = 'REVISION_QUESTION',
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTicketDto {
  @IsString()
  @MinLength(5, { message: 'O assunto deve ter no mínimo 5 caracteres' })
  @MaxLength(200, { message: 'O assunto deve ter no máximo 200 caracteres' })
  subject!: string;

  @IsEnum(TicketCategory, { message: 'Categoria inválida' })
  category!: TicketCategory;

  @IsEnum(TicketPriority, { message: 'Prioridade inválida' })
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @MinLength(10, { message: 'A mensagem deve ter no mínimo 10 caracteres' })
  message!: string;

  // Contexto opcional
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  revisionId?: string;
}
