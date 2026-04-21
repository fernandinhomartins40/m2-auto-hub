import { IsString, IsOptional, IsBoolean, IsArray, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1, { message: 'A mensagem não pode estar vazia' })
  message!: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
