import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class RateTicketDto {
  @IsInt({ message: 'A avaliação deve ser um número inteiro' })
  @Min(1, { message: 'A avaliação deve ser no mínimo 1' })
  @Max(5, { message: 'A avaliação deve ser no máximo 5' })
  rating!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
